'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';

const menuItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3"/>
      </svg>
    ),
  },
  {
    key: 'users',
    label: 'Pengguna',
    path: '/admin/users',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" fill="currentColor" opacity=".9"/>
        <path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".7"/>
      </svg>
    ),
  },
  {
    key: 'divisions',
    label: 'Divisi',
    path: '/admin/divisions',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="2" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9"/>
        <rect x="9.5" y="2" width="5" height="5" rx="1.2" fill="currentColor" opacity=".5"/>
        <rect x="1.5" y="9" width="13" height="5" rx="1.2" fill="currentColor" opacity=".5"/>
      </svg>
    ),
  },
  {
    key: 'calendar',
    label: 'Kalender',
    path: '/calendar',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" opacity=".9"/>
        <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4.5 1.5v3M11.5 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'archive',
    label: 'Arsip',
    path: '/archive',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="3" rx="1" fill="currentColor" opacity=".9"/>
        <path d="M2.5 6.5h11V13a1 1 0 01-1 1h-9a1 1 0 01-1-1V6.5z" fill="currentColor" opacity=".4"/>
        <path d="M6 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/me').then(async (res) => {
      if (res.status === 401) { router.replace('/'); return; }
      const data = await res.json();
      if (data.user.role !== 'admin') { router.replace('/dashboard'); return; }
      setUser(data.user);
    });
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth', { method: 'DELETE' });
    router.replace('/');
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-paper)' }}>
      {/* Top header */}
      <header
        className="sticky top-0 z-40 bg-white border-b border-[#e8e8e8]"
        style={{ borderTop: '3px solid var(--color-brand)' }}
      >
        <div className="h-14 px-4 flex items-center justify-between gap-4">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-[6px] text-[#5c5c5c] hover:bg-[#f5f4f2] transition-colors"
              aria-label="Toggle menu"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="4" width="12" height="1.5" rx=".75" fill="currentColor"/>
                <rect x="2" y="7.25" width="9" height="1.5" rx=".75" fill="currentColor" opacity=".7"/>
                <rect x="2" y="10.5" width="11" height="1.5" rx=".75" fill="currentColor" opacity=".5"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-[4px] flex items-center justify-center"
                style={{ background: 'var(--color-brand)' }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="4" width="12" height="1.5" rx=".75" fill="white"/>
                  <rect x="2" y="7.25" width="8" height="1.5" rx=".75" fill="white" opacity=".7"/>
                  <rect x="2" y="10.5" width="10" height="1.5" rx=".75" fill="white" opacity=".5"/>
                </svg>
              </div>
              <span className="font-semibold text-sm text-[#0f0f0f]">Tasker</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#fef3c7] text-[#92400e]">Admin</span>
            </div>
          </div>

          {/* Right: user info + actions */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-[#0f0f0f]">{user.name}</span>
              </div>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="text-xs px-3 py-1.5 rounded-[6px] transition-colors hover:bg-[#f5f4f2]"
              style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
            >
              User View
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-xs px-3 py-1.5 rounded-[6px] transition-colors hover:bg-[#f5f4f2] disabled:opacity-50"
              style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-[59px] left-0 z-30 h-[calc(100vh-59px)] w-56 bg-white border-r border-[#e8e8e8]
            transition-transform duration-200
            lg:sticky lg:top-0 lg:h-[calc(100vh-59px)] lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <nav className="p-3 space-y-0.5">
            <p className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wider px-2 pt-2 pb-1.5">
              Menu
            </p>
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/admin/dashboard' && pathname.startsWith(item.path));
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    router.push(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-left
                    text-xs font-medium transition-colors
                    ${isActive
                      ? 'text-[var(--color-brand)] bg-[var(--color-brand-light)]'
                      : 'text-[#3c3c3c] hover:bg-[#f5f4f2]'
                    }
                  `}
                >
                  <span className={isActive ? 'text-[var(--color-brand)]' : 'text-[#a0a0a0]'}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-[#f0f0ee]">
              <p className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wider px-2 pb-1.5">
                Lainnya
              </p>
              <button
                onClick={() => { router.push('/dashboard'); setSidebarOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-left text-xs font-medium text-[#3c3c3c] hover:bg-[#f5f4f2] transition-colors"
              >
                <span className="text-[#a0a0a0]">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2H3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V3a1 1 0 00-1-1zM13 2h-3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V3a1 1 0 00-1-1zM6 9H3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 00-1-1zM13 9h-3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 00-1-1z" fill="currentColor" opacity=".6"/>
                  </svg>
                </span>
                Dashboard User
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
