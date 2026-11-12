import { createHash, randomBytes } from 'crypto';
import { env } from '../config/env';

// Cloudinary (cloudinary.com) stores the photos and documents. Only the server uploads, with a signed request,
// so the API secret never reaches the apps. No SDK: plain HTTPS calls.
//
// Folders (Cloudinary Media Library), one per agency, named after the agency so the team finds things fast:
//   transitpro/agencies/<agency-slug>/documents/   rccm-<random>, niu-..., cni-front-..., cni-back-..., transport-licence-...
//   transitpro/agencies/<agency-slug>/parcels/     photos of the contents taken at registration
//   transitpro/agencies/<agency-slug>/deliveries/  proof-of-delivery photos taken by couriers
//   transitpro/users/<user-id>/                    anything uploaded by an account without an agency
// Every file name ends with a random part, so a link cannot be guessed.

export const cloudinaryEnabled = () =>
  env.CLOUDINARY_CLOUD_NAME.length > 0 && env.CLOUDINARY_API_KEY.length > 0 && env.CLOUDINARY_API_SECRET.length > 0;

// Signature: SHA-1 of the sorted parameters + the secret (Cloudinary's rule for signed requests)
function sign(params: Record<string, string>) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(toSign + env.CLOUDINARY_API_SECRET).digest('hex');
}

// "Étoile Voyages" → "etoile-voyages": safe in a Cloudinary path
export const folderName = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unnamed';

export const agencyFolder = (agencySlug: string, sub: 'documents' | 'parcels' | 'deliveries') => `transitpro/agencies/${folderName(agencySlug)}/${sub}`;
export const userFolder = (userId: string) => `transitpro/users/${folderName(userId)}`;

export async function uploadImage(bytes: Buffer, mime: string, folder: string, name = 'photo'): Promise<string> {
  return uploadFile(bytes, mime, folder, 'image', name);
}

// PDFs go as "raw" files: Cloudinary's free plan blocks PDF delivery from the image endpoint.
// `name` is the readable start of the file name ("rccm"); a random part is always added.
export async function uploadFile(bytes: Buffer, mime: string, folder: string, resource: 'image' | 'raw', name: string): Promise<string> {
  const publicId = `${folderName(name)}-${randomBytes(6).toString('hex')}${resource === 'raw' && mime === 'application/pdf' ? '.pdf' : ''}`;
  const params = { folder, public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), resource === 'raw' ? 'document.pdf' : 'photo');
  form.append('api_key', env.CLOUDINARY_API_KEY);
  form.append('timestamp', params.timestamp);
  form.append('folder', params.folder);
  form.append('public_id', params.public_id);
  form.append('signature', sign(params));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/${resource}/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) {
    // Cloudinary's short message only: never the key or secret
    console.error(`[uploads] Cloudinary refused an upload (HTTP ${res.status}): ${json.error?.message ?? 'no message'}`);
    throw new Error('Storage refused the upload');
  }
  return json.secure_url; // https://res.cloudinary.com/<cloud>/image/upload/v.../transitpro/agencies/<slug>/parcels/photo-xxxx.jpg
}

// Deletes a file we stored (a replaced document). Best effort: a failure is logged, never shown to the user.
export async function deleteFile(url: string): Promise<void> {
  const m = new RegExp(`^https://res\\.cloudinary\\.com/${env.CLOUDINARY_CLOUD_NAME}/(image|raw)/upload/(?:v\\d+/)?(.+)$`).exec(url);
  if (!m || !cloudinaryEnabled()) return;
  const resource = m[1] as 'image' | 'raw';
  // Images: the public id has no extension; raw files: the extension is part of it
  const publicId = resource === 'image' ? m[2].replace(/\.[a-z0-9]+$/i, '') : m[2];
  const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const form = new FormData();
  form.append('api_key', env.CLOUDINARY_API_KEY);
  form.append('public_id', params.public_id);
  form.append('timestamp', params.timestamp);
  form.append('signature', sign(params));
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/${resource}/destroy`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { result?: string; error?: { message?: string } };
    if (!res.ok || (json.result !== 'ok' && json.result !== 'not found')) console.error(`[uploads] old file not deleted (HTTP ${res.status}): ${json.error?.message ?? json.result ?? ''}`);
  } catch {
    console.error('[uploads] old file not deleted: Cloudinary not reachable');
  }
}

// A photo URL we accept: one of our Cloudinary images
export const isCloudinaryUrl = (v: string) =>
  env.CLOUDINARY_CLOUD_NAME.length > 0 &&
  v.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`) &&
  v.length < 300;
