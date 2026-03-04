import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Video,
  Puzzle,
  ClipboardList,
  CreditCard,
  Award,
  Bell,
  Tags,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navSections = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Users', path: '/users', icon: Users, badge: null },
      { name: 'Courses', path: '/courses', icon: BookOpen },
      { name: 'Video Library', path: '/videos', icon: Video },
    ],
  },
  {
    label: 'Learning Tools',
    items: [
      { name: 'Activity Builder', path: '/activities', icon: Puzzle },
      { name: 'Homework', path: '/homework', icon: ClipboardList, badge: null },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Payments', path: '/payments', icon: CreditCard },
      { name: 'Certificates', path: '/certificates', icon: Award },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Notifications', path: '/notifications', icon: Bell },
      { name: 'Categories', path: '/categories', icon: Tags },
      { name: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-lg">☪</span>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Islamic Learning</h1>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-1.5">
                {section.label}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5
                    ${isActive
                      ? 'bg-primary text-white font-medium'
                      : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge !== undefined && item.badge !== null && (
                    <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300
              hover:bg-sidebar-hover hover:text-white transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
