// frontend/src/utils/fileDownload.js

export async function downloadFileWithAuth(url, filename, token) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(text || 'Download failed');
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

export async function viewFileWithAuth(url, token) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(text || 'Failed to load file');
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}
