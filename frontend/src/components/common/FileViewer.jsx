import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * FileViewer — fetches the file as a blob via the backend proxy
 * and creates an object URL so the browser displays it inline.
 * No iframe X-Frame-Options issues, no CORS issues.
 */
const FileViewer = ({ path, name, onClose }) => {
  const [blobUrl, setBlobUrl]   = useState('');
  const [type, setType]         = useState('pdf');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const prevBlobUrl             = useRef('');

  useEffect(() => {
    if (!path) return;

    // Detect type from name (more reliable than path for Cloudinary URLs)
    const src    = name || path;
    const ext    = src.split('.').pop().toLowerCase();
    const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const isImg  = imgExts.includes(ext);
    setType(isImg ? 'image' : 'pdf');
    setLoading(true);
    setError('');
    setBlobUrl('');

    // Revoke previous blob URL to free memory
    if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);

    const token    = localStorage.getItem('erp_token') || '';
    const mimeHint = isImg ? 'image' : 'pdf';
    const fetchUrl = `${API}/files/serve?p=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}&mime=${mimeHint}`;

    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const mimeType  = isImg ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'application/pdf';
        const typedBlob = new Blob([blob], { type: mimeType });
        const url       = URL.createObjectURL(typedBlob);
        prevBlobUrl.current = url;
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(err => {
        setError('Could not load file: ' + err.message);
        setLoading(false);
      });

    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
    };
  }, [path, name]);

  if (!path) return null;

  const displayName = name || path.split('/').pop();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex flex-col bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{type === 'image' ? '🖼️' : '📄'}</span>
            <span className="text-sm font-semibold text-slate-800 truncate">{displayName}</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 text-lg font-bold ml-4"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-slate-100">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-600 border-t-transparent mb-3" />
              <p className="text-sm text-slate-500">Loading file...</p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-sm font-medium text-slate-700 mb-4">{error}</p>
              <a
                href={`${API}/files/serve?p=${encodeURIComponent(path)}&token=${encodeURIComponent(localStorage.getItem('erp_token') || '')}&mime=${type}`}
                download={displayName}
                className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
              >
                ⬇️ Download instead
              </a>
            </div>
          )}

          {!loading && !error && blobUrl && (
            type === 'image' ? (
              <img
                src={blobUrl}
                alt={displayName}
                className="w-full h-full object-contain"
              />
            ) : (
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <embed
                  src={blobUrl}
                  type="application/pdf"
                  className="w-full h-full"
                />
              </object>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50 shrink-0">
          <p className="text-xs text-slate-400 truncate">{displayName}</p>
          {blobUrl && (
            <a
              href={blobUrl}
              download={displayName}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
            >
              ⬇️ Download
            </a>
          )}
        </div>

      </div>
    </div>
  );
};

export default FileViewer;
