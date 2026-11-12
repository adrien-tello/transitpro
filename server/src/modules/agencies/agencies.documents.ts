import { randomBytes } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { DocumentType } from '@prisma/client';
import type { AgencyDocumentView } from '@contracts/api-types';
import { prisma } from '../../lib/prisma';
import { HttpError, badRequest, forbidden, notFound } from '../../lib/http-error';
import { agencyFolder, cloudinaryEnabled, deleteFile, uploadFile } from '../../lib/cloudinary';

// Owner: Lead (Fanyi Charllson). The papers that prove an agency is a real, licensed company.
//
// They hold personal data (the owner's ID card), so the file is PRIVATE:
//   - stored on Cloudinary under a random name (or server/uploads/docs/ while developing without Cloudinary)
//   - its storage URL is never sent to any app
//   - GET /agencies/documents/:id/file streams it, only to the agency's owner or the TransitPro team

export const DOCUMENT_TYPES: DocumentType[] = ['RCCM', 'NIU', 'OWNER_CNI_FRONT', 'OWNER_CNI_BACK', 'TRANSPORT_LICENCE'];

export const DOCUMENT_MIME: Record<string, 'jpg' | 'png' | 'webp' | 'pdf'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const MIME_OF = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' } as const;
const LOCAL_DIR = path.resolve(__dirname, '../../../uploads/docs');
const LOCAL_URL = /^local:([a-f0-9]{32}\.(jpg|png|webp|pdf))$/;
// Readable file names in Cloudinary: transitpro/agencies/<slug>/documents/rccm-<random>.pdf
const FILE_NAME: Record<DocumentType, string> = {
  RCCM: 'rccm',
  NIU: 'niu',
  OWNER_CNI_FRONT: 'cni-front',
  OWNER_CNI_BACK: 'cni-back',
  TRANSPORT_LICENCE: 'transport-licence',
};

// The bytes must really be what the Content-Type says (a renamed .exe or HTML page is refused)
function looksLike(ext: 'jpg' | 'png' | 'webp' | 'pdf', b: Buffer): boolean {
  if (ext === 'pdf') return b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-';
  if (ext === 'jpg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === 'png') return b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
}

export const toView = (d: { id: string; type: DocumentType; mime: string; uploadedAt: Date }): AgencyDocumentView => ({
  id: d.id,
  type: d.type,
  mime: d.mime,
  uploadedAt: d.uploadedAt.toISOString(),
});

export async function list(agencyId: string): Promise<AgencyDocumentView[]> {
  const docs = await prisma.agencyDocument.findMany({ where: { agencyId }, orderBy: { uploadedAt: 'asc' } });
  return docs.map(toView);
}

// PUT /agencies/me/documents/:type: uploading a type again replaces the old file
export async function upload(agencyId: string, agencyStatus: string, type: DocumentType, contentType: string, body: unknown): Promise<AgencyDocumentView> {
  if (agencyStatus === 'SUSPENDED') throw forbidden('Your agency is suspended, contact TransitPro');
  const ext = DOCUMENT_MIME[contentType.split(';')[0].trim()];
  if (!ext) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send a photo (JPEG, PNG, WebP) or a PDF');
  if (!Buffer.isBuffer(body) || body.length === 0) throw badRequest('The file is empty');
  if (!looksLike(ext, body)) throw badRequest(ext === 'pdf' ? 'This file is not a valid PDF' : 'This file is not a valid image');

  let fileUrl: string;
  if (cloudinaryEnabled()) {
    const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId }, select: { slug: true } });
    try {
      fileUrl = await uploadFile(body, MIME_OF[ext], agencyFolder(agency.slug, 'documents'), ext === 'pdf' ? 'raw' : 'image', FILE_NAME[type]);
    } catch {
      throw new HttpError(502, 'UPLOAD_FAILED', 'The document could not be saved, try again');
    }
  } else {
    await mkdir(LOCAL_DIR, { recursive: true });
    const name = `${randomBytes(16).toString('hex')}.${ext}`;
    await writeFile(path.join(LOCAL_DIR, name), body, { flag: 'wx' });
    fileUrl = `local:${name}`;
  }

  const previous = await prisma.agencyDocument.findUnique({ where: { agencyId_type: { agencyId, type } }, select: { fileUrl: true } });
  const doc = await prisma.agencyDocument.upsert({
    where: { agencyId_type: { agencyId, type } },
    create: { agencyId, type, fileUrl, mime: MIME_OF[ext] },
    update: { fileUrl, mime: MIME_OF[ext], verified: false, uploadedAt: new Date() },
  });
  // The replaced file is removed from storage (nothing piles up in Cloudinary); best effort, in the background
  if (previous && previous.fileUrl !== fileUrl) void deleteFile(previous.fileUrl);
  return toView(doc);
}

// GET /agencies/documents/:id/file: the agency's owner, or the TransitPro team. Anyone else: 404 (no hint it exists).
export async function readFileFor(id: string, user: { role: string; agencyId: string | null }): Promise<{ mime: string; bytes: Buffer }> {
  const doc = await prisma.agencyDocument.findUnique({ where: { id } });
  const allowed = doc && (user.role === 'PLATFORM_ADMIN' || (user.role === 'AGENCY_OWNER' && user.agencyId === doc.agencyId));
  if (!allowed) throw notFound('Document');

  const local = LOCAL_URL.exec(doc.fileUrl);
  if (local) return { mime: doc.mime, bytes: await readFile(path.join(LOCAL_DIR, local[1])).catch(() => Promise.reject(notFound('Document'))) };

  const res = await fetch(doc.fileUrl, { signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!res || !res.ok) throw new HttpError(502, 'STORAGE_UNAVAILABLE', 'The document could not be loaded, try again');
  return { mime: doc.mime, bytes: Buffer.from(await res.arrayBuffer()) };
}
