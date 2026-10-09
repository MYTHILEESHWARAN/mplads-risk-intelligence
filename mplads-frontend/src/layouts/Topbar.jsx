import { useState } from 'react';
import { Menu, Search, Bell, ChevronDown, LogOut, User, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout, isUsingDemoData } from '../services/api';
import { NOTIFICATIONS } from '../data/mockData';

export default function Topbar({ onMenuClick, user }) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [search, setSearch] = useState('');
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/projects?search=${encodeURIComponent(search.trim())}`);
  };

  const notifIcons = { critical: 'bg-red-100 text-red-600', duplicate: 'bg-orange-100 text-orange-600', delay: 'bg-yellow-100 text-yellow-600', mismatch: 'bg-orange-100 text-orange-600', compliance: 'bg-blue-100 text-blue-600' };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4 sticky top-0 z-20 shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search projects, IDs, districts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search"
          />
        </form>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Demo badge */}
        {isUsingDemoData() && (
          <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 font-medium">
            <Database className="w-3 h-3" aria-hidden="true" />
            Demo
          </span>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label={`Notifications — ${unread} unread`}
            aria-expanded={notifOpen}
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unread > 0 && <span className="text-xs text-blue-600 font-medium">{unread} new</span>}
              </div>
              <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <li key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}>
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-gray-300' : 'bg-blue-500'}`} aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* User */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="User menu"
            aria-expanded={userOpen}
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name || 'User'}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{user?.role || 'Officer'}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" aria-hidden="true" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.id}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
