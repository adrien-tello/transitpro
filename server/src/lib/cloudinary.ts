import { createHash } from 'crypto';
import { env } from '../config/env';

// Cloudinary (cloudinary.com) stores the photos. Only the server uploads, with a signed request,
// so the API secret never reaches the apps. No SDK: one HTTPS call.

export const cloudinaryEnabled = () =>
  env.CLOUDINARY_CLOUD_NAME.length > 0 && env.CLOUDINARY_API_KEY.length > 0 && env.CLOUDINARY_API_SECRET.length > 0;

// Signature: SHA-1 of the sorted parameters + the secret (Cloudinary's rule for signed uploads)
function sign(params: Record<string, string>) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(toSign + env.CLOUDINARY_API_SECRET).digest('hex');
}

export async function uploadImage(bytes: Buffer, mime: string, folder: string): Promise<string> {
  const params = { folder, timestamp: String(Math.floor(Date.now() / 1000)) };
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), 'photo');
  form.append('api_key', env.CLOUDINARY_API_KEY);
  form.append('timestamp', params.timestamp);
  form.append('folder', params.folder);
  form.append('signature', sign(params));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) {
    // Cloudinary's short message only: never the key or secret
    console.error(`[uploads] Cloudinary refused an upload (HTTP ${res.status}): ${json.error?.message ?? 'no message'}`);
    throw new Error('Photo storage refused the upload');
  }
  return json.secure_url; // https://res.cloudinary.com/<cloud>/image/upload/v.../transitpro/parcels/xxx.jpg
}

// A photo URL we accept: one of our Cloudinary images
export const isCloudinaryUrl = (v: string) =>
  env.CLOUDINARY_CLOUD_NAME.length > 0 &&
  v.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`) &&
  v.length < 300;
