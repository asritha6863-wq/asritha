/**
 * DashboardHeader — NiSHKA branded welcome card
 * Used across all role dashboards for consistent look.
 *
 * Props:
 *   name       — user first name
 *   role       — role label
 *   employeeId — EMP-xxx
 *   department — department name
 *   designation— designation name
 *   profileImage — path or URL
 *   stats      — array of { label, value, color? }
 *   gradient   — CSS gradient string for the header bg
 *   accentColor— hex for subtle accents
 *   emoji      — role emoji
 */
import { fileUrl } from '../../utils/fileUrl';

const DashboardHeader = ({
  name, role, employeeId, department, designation, profileImage,
  stats = [], gradient, accentColor = '#c13575', emoji = '👋',
}) => {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('erp_token') || '';
  const avatarSrc = profileImage
    ? `${API}/files/serve?p=${encodeURIComponent(profileImage)}&token=${encodeURIComponent(token)}`
    : null;
  const initials = name ? name.slice(0, 2).toUpperCase() : '?';
  const now = new Date();

  return (
    <div className="card overflow-hidden">
      {/* Gradient banner */}
      <div
        className="relative px-6 py-6 sm:px-8"
        style={{ background: gradient || `linear-gradient(135deg, #8a234f 0%, #c13575 100%)` }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full opacity-10"
          style={{ background: 'white' }} />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full opacity-10"
          style={{ background: 'white' }} />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Left — avatar + info */}
          <div className="flex items-center gap-4">
            {avatarSrc ? (
              <img src={avatarSrc} alt={name}
                className="h-14 w-14 rounded-2xl object-cover shrink-0"
                style={{ border: '2.5px solid rgba(255,255,255,0.5)' }}
                onError={e => e.target.style.display = 'none'}
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 text-lg font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.3)' }}>
                {initials}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white/70">
                {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold text-white tracking-tight">
                {emoji} Welcome, {name}!
              </h1>
              <p className="mt-0.5 text-sm font-semibold text-white/80">{role}</p>
            </div>
          </div>

          {/* Right — mini stats */}
          {stats.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stats.map((s, i) => (
                <div key={i} className="rounded-xl px-4 py-2.5 text-center min-w-[72px]"
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
                  <p className={`text-xl font-extrabold text-white`}>{s.value}</p>
                  <p className="text-xs font-medium text-white/70 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t px-6 py-3 text-xs"
        style={{ borderColor: 'rgba(193,53,117,0.10)', background: '#fdf0f5' }}>
        {employeeId  && <span><span className="font-semibold text-slate-400">ID </span><span className="font-medium text-slate-700">{employeeId}</span></span>}
        {department  && <span><span className="font-semibold text-slate-400">Department </span><span className="font-semibold" style={{ color: accentColor }}>{department}</span></span>}
        {designation && <span><span className="font-semibold text-slate-400">Designation </span><span className="font-semibold" style={{ color: accentColor }}>{designation}</span></span>}
      </div>
    </div>
  );
};

export default DashboardHeader;
