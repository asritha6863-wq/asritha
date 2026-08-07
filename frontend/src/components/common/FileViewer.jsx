import { useState, useEffect } from 'react';
import { fileUrl } from '../../utils/fileUrl';

/**
 * FileViewer — shows a modal with the file embedded directly in the page.
 * PDFs use <iframe>, images use <img>. No download, no new tab needed.
 */
const FileViewer = ({ path, name, onClose }) => {
  const [url, setUrl] = useState('');
  const [type, setType] = useState('pdf');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!path) return;
    // Determine type from name (more reliable than path for Cloudinary URLs with no ext)
    const src = name || path;
    const ext = src.split('.').pop().toLowerCase();
    const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const isImg = imgExts.includes(ext);
    setType(isImg ? 'image' : 'pdf');

    const token = localStorage.getItem('erp_token') || '';
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    // Pass mime hint so backend sets correct Content-Type for files with no extension
    const mimeHint = isImg ? 'image' : 'pdf';
    const serveEndpoint = `${API}/files/serve?p=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}&mime=${mimeHint}`;
    setUrl(serveEndpoint);
    setLoading(true);
    setError('');
  }, [path, name]);

  if (!path) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex flex-col bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">{type === 'image' ? '🖼️' : '📄'}</span>
            <span className="text-sm font-semibold text-slate-800 truncate max-w-md">
              {name || 'Document'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-slate-100">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
                <p className="text-sm text-slate-500">Loading file...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-4xl mb-3">⚠️</p>
                <p className="text-sm font-medium text-slate-700">{error}</p>
                <a href={url} download className="mt-3 inline-block text-xs text-pink-600 hover:underline">
                  Download instead
                </a>
              </div>
            </div>
          )}

          {type === 'image' ? (
            <img
              src={url}
              alt={name}
              className="w-full h-full object-contain"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError('Could not load image.'); }}
            />
          ) : (
            <iframe
              src={url}
              title={name}
              className="w-full h-full border-0"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError('Could not load document. Try downloading it.'); }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-400">Viewing: {name}</p>
          <a
            href={url}
            download={name}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇️ Download
          </a>
        </div>
      </div>
    </div>
  );
};

export default FileViewer;
