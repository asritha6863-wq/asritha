import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import notificationService from '../services/notificationService';

const MenuIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
  </svg>
);

const ChevronDown = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BellIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [imgError, setImgError]       = useState(false);
  const menuRef = useRef(null);

  // Poll unread count every 30 seconds
  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationService.getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleBellClick = () => {
    navigate('/notifications');
  };

  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '';
  const avatarSrc = user?.profileImage
    ? (user.profileImage.startsWith('http') ? user.profileImage : `${BASE_URL}/${user.profileImage}`)
    : null;

  // Reset error flag when profile image changes (e.g. after upload)
  useEffect(() => { setImgError(false); }, [user?.profileImage]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-pink-100 bg-white px-4 sm:px-6">
      {/* Mobile menu button */}
      <button
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          onClick={handleBellClick}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-pink-50"
          >
            {/* Avatar — shows photo if set, else initials */}
            {avatarSrc && !imgError ? (
              <img
                src={avatarSrc}
                alt={user?.firstName}
                className="h-9 w-9 rounded-full object-cover border-2 border-pink-200 shrink-0"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-pink-600 text-sm font-semibold text-white flex items-center justify-center shrink-0">
                {initials || '—'}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 leading-tight">{user?.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                My Profile
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate('/notifications'); }}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Notifications
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
