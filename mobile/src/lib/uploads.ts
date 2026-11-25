import { API_URL, ApiError } from './api';
import type { UploadResult } from '@contracts/api-types';

// POST /uploads: raw image bytes, Content-Type image/jpeg|png|webp, max 3 MB.
// Used for the delivery handover photo and the "photo of the seal" on a refusal.
export async function uploadPhoto(localUri: string): Promise<UploadResult> {
  const file = await fetch(localUri);
  const blob = await file.blob();
  const res = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': blob.type || 'image/jpeg', 'ngrok-skip-browser-warning': 'true' },
    body: blob,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json.error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? 'Upload failed', err.details);
  }
  return json.data as UploadResult;
}
