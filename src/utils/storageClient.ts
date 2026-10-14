/**
 * Helper to upload a file directly to Cloudflare R2 / S3 via a backend-issued presigned PUT URL.
 */
export async function uploadFileDirectToStorage(
  file: File,
  folder: 'challans' | 'invoices' | 'drawings' | 'specifications' = 'challans',
  token?: string | null
): Promise<{ key: string; downloadUrl?: string }> {
  // Step 1: Request presigned PUT URL from backend
  const presignRes = await fetch('/api/storage/presign-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      folder,
    }),
  });

  const presignData = await presignRes.json();
  if (!presignRes.ok || !presignData.success) {
    throw new Error(presignData.error || 'Failed to request direct upload ticket');
  }

  const { uploadUrl, key } = presignData.data;

  // Step 2: Stream binary bytes directly to Cloudflare R2 / S3 via PUT request
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Direct storage upload failed with HTTP status ${uploadRes.status}`);
  }

  return { key };
}

/**
 * Helper to request a secure presigned viewing/download URL for a file stored in R2.
 */
export async function getStorageDownloadUrl(
  key: string,
  download = false,
  filename?: string,
  token?: string | null
): Promise<string> {
  const res = await fetch('/api/storage/presign-download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ key, download, filename }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate download URL');
  }

  return data.data.url;
}
