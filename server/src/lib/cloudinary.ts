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
// access "private" = Cloudinary "authenticated" delivery: the file is refused to EVERYONE, even with its exact address,
// except signed requests made with our secret (only this server). Used for agency documents (ID cards, RCCM...).
export async function uploadFile(
  bytes: Buffer,
  mime: string,
  folder: string,
  resource: 'image' | 'raw',
  name: string,
  access: 'public' | 'private' = 'public',
): Promise<string> {
  const publicId = `${folderName(name)}-${randomBytes(6).toString('hex')}${resource === 'raw' && mime === 'application/pdf' ? '.pdf' : ''}`;
  const params: Record<string, string> = { folder, public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
  if (access === 'private') params.type = 'authenticated';
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), resource === 'raw' ? 'document.pdf' : 'photo');
  form.append('api_key', env.CLOUDINARY_API_KEY);
  for (const [k, v] of Object.entries(params)) form.append(k, v);
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
  // Private files: Cloudinary answers with a SIGNED address ("/s--abc--/"), which would open the file forever.
  // We keep the address without the signature: useless on its own, the server downloads with a fresh signed request.
  if (access === 'private') return json.secure_url.replace(/\/s--[^/]+--\//, '/');
  return json.secure_url; // https://res.cloudinary.com/<cloud>/image/upload/v.../transitpro/agencies/<slug>/parcels/photo-xxxx.jpg
}

// Splits one of our Cloudinary URLs: resource (image | raw), delivery type (upload | authenticated), public id, format
function parse(url: string) {
  const m = new RegExp(
    `^https://res\\.cloudinary\\.com/${env.CLOUDINARY_CLOUD_NAME}/(image|raw)/(upload|authenticated)/(?:s--[^/]+--/)?(?:v\\d+/)?(.+)$`,
  ).exec(url);
  if (!m) return null;
  const resource = m[1] as 'image' | 'raw';
  const ext = /\.([a-z0-9]+)$/i.exec(m[3])?.[1] ?? '';
  // Images: the public id has no extension (it is the format); raw files: the extension is part of the id
  const publicId = resource === 'image' ? m[3].replace(/\.[a-z0-9]+$/i, '') : m[3];
  return { resource, type: m[2] as 'upload' | 'authenticated', publicId, format: ext };
}

// Reads a file we stored, for the server only. Private documents and PDFs (Cloudinary does not deliver PDFs
// publicly on this plan) go through the signed download API, which needs our secret.
export async function downloadFile(url: string): Promise<Buffer | null> {
  const f = parse(url);
  let target = url;
  if (f && cloudinaryEnabled() && (f.type === 'authenticated' || f.resource === 'raw')) {
    const params: Record<string, string> = { public_id: f.publicId, timestamp: String(Math.floor(Date.now() / 1000)), type: f.type };
    if (f.resource === 'image' && f.format) params.format = f.format;
    const q = new URLSearchParams({ ...params, api_key: env.CLOUDINARY_API_KEY, signature: sign(params) });
    target = `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/${f.resource}/download?${q}`;
  }
  const res = await fetch(target, { signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!res || !res.ok) {
    console.error(`[uploads] stored file not readable (HTTP ${res?.status ?? 'no answer'}): ${res?.headers.get('x-cld-error') ?? ''}`);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

// Deletes a file we stored (a replaced document). Best effort: a failure is logged, never shown to the user.
export async function deleteFile(url: string): Promise<void> {
  const f = parse(url);
  if (!f || !cloudinaryEnabled()) return;
  const params = { public_id: f.publicId, timestamp: String(Math.floor(Date.now() / 1000)), type: f.type };
  const form = new FormData();
  form.append('api_key', env.CLOUDINARY_API_KEY);
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append('signature', sign(params));
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/${f.resource}/destroy`, {
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
