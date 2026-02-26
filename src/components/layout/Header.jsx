import { Menu, Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ onMenuClick }) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-surface-border px-4 lg:px-6 py-3">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-text-secondary hover:bg-surface-alt"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-surface-alt rounded-lg border-0
                focus:outline-none focus:ring-2 focus:ring-primary/30
                placeholder:text-text-muted text-text-primary"
            />
          </div>
        </div>

        <div className="flex-1 sm:hidden" />

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-text-secondary hover:bg-surface-alt">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-3 pl-3 border-l border-surface-border">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-text-primary leading-tight">{user?.name}</p>
              <p className="text-xs text-text-muted capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">{initials}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
