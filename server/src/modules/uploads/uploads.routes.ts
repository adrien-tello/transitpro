import express, { Router } from 'express';
import { randomBytes } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { requireAuth } from '../../middleware/auth';
import rateLimit from 'express-rate-limit';
import { HttpError, badRequest, notFound } from '../../lib/http-error';
import { agencyFolder, cloudinaryEnabled, isCloudinaryUrl, uploadImage, userFolder } from '../../lib/cloudinary';
import { prisma } from '../../lib/prisma';

// Owner: Lead (Fanyi Charllson). Photos (parcel contents, proof of delivery, agency documents later).
//
// The app sends the image itself as the body (Content-Type image/jpeg | image/png | image/webp, max 3 MB).
// The server checks it really is an image, then:
//   - Cloudinary configured: stores it there → { url: "https://res.cloudinary.com/<cloud>/image/upload/..." }
//   - not configured (development): saves it in server/uploads/ → { url: "/api/uploads/<random>.jpg" },
//     which only logged-in users can open.
// Either URL goes in photoUrls / photoUrl.

export const uploadsRouter = Router();

const DIR = path.resolve(__dirname, '../../../uploads');
const NAME = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
const TYPES: Record<string, 'jpg' | 'png' | 'webp'> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;

// The bytes must really be an image of that type (a renamed .exe or HTML page is refused)
function looksLike(ext: 'jpg' | 'png' | 'webp', b: Buffer): boolean {
  if (ext === 'jpg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === 'png') return b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
}

// Photo URLs the server accepts: our local uploads or our Cloudinary images (nobody else's links)
export const isUploadUrl = (v: string) => /^\/api\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(v) || isCloudinaryUrl(v);

// 60 photos per 15 minutes per IP: enough for a busy counter, too few to fill the disk
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Too many photos, wait a few minutes' } });
  },
});

uploadsRouter.use(requireAuth);

uploadsRouter.post(
  '/',
  uploadLimiter,
  express.raw({ type: Object.keys(TYPES), limit: '3mb' }),
  async (req, res) => {
    const ext = TYPES[String(req.headers['content-type'] ?? '').split(';')[0].trim()];
    if (!ext) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send a JPEG, PNG or WebP image');
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) throw badRequest('The image is empty');
    if (!looksLike(ext, body)) throw badRequest('This file is not a valid image');

    // Cloudinary when configured: transitpro/agencies/<slug>/parcels (or /deliveries with ?purpose=delivery).
    // Local disk while developing without it.
    if (cloudinaryEnabled()) {
      const delivery = req.query.purpose === 'delivery';
      const agency = req.user!.agencyId ? await prisma.agency.findUnique({ where: { id: req.user!.agencyId }, select: { slug: true } }) : null;
      const folder = agency ? agencyFolder(agency.slug, delivery ? 'deliveries' : 'parcels') : userFolder(req.user!.id);
      try {
        const url = await uploadImage(body, MIME[ext], folder, delivery ? 'delivery' : 'parcel');
        res.status(201).json({ data: { url } });
      } catch {
        throw new HttpError(502, 'UPLOAD_FAILED', 'The photo could not be saved, try again');
      }
      return;
    }
    await mkdir(DIR, { recursive: true });
    const name = `${randomBytes(16).toString('hex')}.${ext}`;
    await writeFile(path.join(DIR, name), body, { flag: 'wx' });
    res.status(201).json({ data: { url: `/api/uploads/${name}` } });
  },
);

uploadsRouter.get('/:name', async (req, res) => {
  const name = String(req.params.name);
  if (!NAME.test(name)) throw notFound('Photo');
  const file = await readFile(path.join(DIR, name)).catch(() => null);
  if (!file) throw notFound('Photo');
  res.setHeader('Content-Type', MIME[name.split('.').pop() as keyof typeof MIME]);
  res.setHeader('Cache-Control', 'private, max-age=86400'); // photos never change: cache in the browser only
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(file);
});
