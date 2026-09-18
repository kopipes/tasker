'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, User, DashboardData, ProjectWithTasks } from '@/lib/types';
import { TaskCard, TaskCardSkeleton } from '@/components/TaskCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import { NewTaskModal } from '@/components/NewTaskModal';
import { EditProfileModal } from '@/components/EditProfileModal';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me');
      if (res.status === 401) { router.replace('/'); return; }
      const data = await res.json();
      setUser(data.user);
      setDashboard(data.dashboard);
    } catch {
      setToast({ message: 'Gagal memuat dashboard', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth', { method: 'DELETE' });
    router.replace('/');
  }

  function handleTaskCreated() {
    setShowNewTask(false);
    setToast({ message: 'Tugas berhasil dibuat', type: 'success' });
    load();
  }

  const totalActive = dashboard
    ? dashboard.sedang_dikerjakan.length + dashboard.menunggu_review.length + dashboard.tugas_di_assign.length
    : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-paper)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e8e8e8]" style={{ borderTop: '3px solid var(--color-brand)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-[4px] flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="4" width="12" height="1.5" rx=".75" fill="white"/>
                <rect x="2" y="7.25" width="8" height="1.5" rx=".75" fill="white" opacity=".7"/>
                <rect x="2" y="10.5" width="10" height="1.5" rx=".75" fill="white" opacity=".5"/>
              </svg>
            </div>
            <span className="font-semibold text-sm text-[#0f0f0f]">Tasker</span>
            {!loading && totalActive > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                {totalActive} aktif
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-[#0f0f0f] leading-none">{user.name}</p>
                  <p className="text-[10px] text-[#a0a0a0] leading-none mt-0.5">{user.divisi || user.role}</p>
                </div>
              </button>
            )}
            <button
              onClick={() => router.push('/calendar')}
              className="text-xs px-3 py-1.5 rounded-[6px] transition-colors flex items-center gap-1.5"
              style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2.5" width="10" height="8.5" rx="1" stroke="currentColor" strokeWidth="1"/>
                <path d="M1 5h10M3.5 1v2.5M8.5 1v2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <span className="hidden sm:inline">Kalender</span>
            </button>
            <button
              onClick={() => router.push('/archive')}
              className="text-xs px-3 py-1.5 rounded-[6px] transition-colors flex items-center gap-1.5"
              style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1"/>
                <path d="M1 5h10" stroke="currentColor" strokeWidth="1"/>
                <path d="M4.5 7.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <span className="hidden sm:inline">Arsip</span>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-xs px-3 py-1.5 rounded-[6px] transition-colors"
                style={{ color: '#92400e', border: '1px solid #fde68a', background: '#fef3c7' }}
              >
                Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-xs px-3 py-1.5 rounded-[6px] transition-colors"
              style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Page title + CTA */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-[#0f0f0f]">Dashboard</h1>
            {user && <p className="text-sm text-[#5c5c5c]">Hei, {user.name.split(' ')[0]} 👋</p>}
          </div>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-[6px] transition-all active:scale-95"
            style={{ background: 'var(--color-brand)', color: 'white' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Tugas Baru
          </button>
        </div>

        <div className="space-y-8">
          <Section
            title="Sedang Kamu Kerjakan"
            dot="#0ea5e9"
            tasks={dashboard?.sedang_dikerjakan}
            loading={loading}
            currentUserId={user?.id ?? ''}
            emptyMessage="Tidak ada tugas yang sedang dikerjakan."
            emptyAction={{ label: 'Lihat yang perlu direview', href: '#review' }}
            router={router}
          />
          <Section
            title="Menunggu Review Kamu"
            dot="#f59e0b"
            id="review"
            tasks={dashboard?.menunggu_review}
            loading={loading}
            currentUserId={user?.id ?? ''}
            emptyMessage="Tidak ada hasil yang menunggu review."
            router={router}
          />
          <Section
            title="Tugas yang Kamu Assign"
            dot="#4f3ff0"
            tasks={dashboard?.tugas_di_assign}
            loading={loading}
            currentUserId={user?.id ?? ''}
            emptyMessage="Belum ada tugas yang kamu assign ke orang lain."
            emptyAction={{ label: 'Buat tugas baru', onClick: () => setShowNewTask(true) }}
            router={router}
          />
          <Section
            title="Tugas Selesai (belum diarsip)"
            dot="#22c55e"
            id="selesai"
            tasks={dashboard?.tugas_selesai}
            loading={loading}
            currentUserId={user?.id ?? ''}
            emptyMessage="Belum ada tugas yang selesai."
            router={router}
          />
          {(user?.role === 'manager' || user?.role === 'admin') && dashboard?.semua_tugas_divisi && dashboard.semua_tugas_divisi.length > 0 && (
            <Section
              title={`Semua Tugas Divisi ${user.divisi || ''}`}
              dot="#8b5cf6"
              id="divisi"
              tasks={dashboard.semua_tugas_divisi}
              loading={loading}
              currentUserId={user?.id ?? ''}
              emptyMessage="Tidak ada tugas lain di divisi ini."
              router={router}
            />
          )}
          <ProjectsSection
            groups={dashboard?.projects}
            loading={loading}
            router={router}
          />
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      {showNewTask && user && (
        <NewTaskModal
          currentUser={user}
          onClose={() => setShowNewTask(false)}
          onCreated={handleTaskCreated}
        />
      )}
      {showProfile && user && (
        <EditProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSaved={(updated) => { setUser(updated); setShowProfile(false); setToast({ message: 'Profil berhasil diperbarui', type: 'success' }); }}
        />
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  dot: string;
  id?: string;
  tasks: Task[] | undefined;
  loading: boolean;
  currentUserId: string;
  emptyMessage: string;
  emptyAction?: { label: string; href?: string; onClick?: () => void };
  router: ReturnType<typeof useRouter>;
}

function Section({ title, dot, id, tasks, loading, currentUserId, emptyMessage, emptyAction, router }: SectionProps) {
  return (
    <section id={id}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
        <h2 className="text-sm font-semibold text-[#0f0f0f]">{title}</h2>
        {!loading && tasks && (
          <span className="text-xs text-[#a0a0a0]">({tasks.length})</span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <TaskCardSkeleton key={i} />)}
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState message={emptyMessage} action={emptyAction} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onClick={() => router.push(`/tasks/${task.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectsSection({ groups, loading, router }: {
  groups: ProjectWithTasks[] | undefined;
  loading: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const visible = (groups ?? []).filter(g => g.tasks.length > 0);

  return (
    <section id="projects">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ background: '#0d9488' }} />
        <h2 className="text-sm font-semibold text-[#0f0f0f]">Project & Tugasnya</h2>
        {!loading && <span className="text-xs text-[#a0a0a0]">({visible.length})</span>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-28 rounded-[6px]" />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState message="Belum ada project. Tambahkan project saat membuat tugas." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map(group => {
            const key = group.project?.id ?? '__none__';
            return (
              <div key={key} className="bg-white border border-[#e8e8e8] rounded-[6px] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-[#f0f0ee] flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-[#0d9488] shrink-0">
                    <path d="M1.5 3.5A1 1 0 012.5 2.5h2.8l1.2 1.4h5A1 1 0 0112.5 5v6a1 1 0 01-1 1h-9a1 1 0 01-1-1V3.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-xs font-semibold text-[#0f0f0f] truncate flex-1">
                    {group.project ? group.project.name : 'Tanpa Project'}
                  </p>
                  <span className="text-[10px] text-[#a0a0a0] shrink-0">{group.tasks.length} tugas</span>
                </div>
                <div className="divide-y divide-[#f7f7f5]">
                  {group.tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => router.push(`/tasks/${task.id}`)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#faf9f7] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#0f0f0f] truncate">{task.title}</p>
                        <p className="text-[10px] text-[#a0a0a0] truncate">
                          {task.assigned_to?.name ?? '—'}{task.deadline ? ` · ${new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyState({ message, action }: { message: string; action?: { label: string; href?: string; onClick?: () => void } }) {
  return (
    <div
      className="rounded-[6px] px-5 py-6 text-center"
      style={{ background: '#f5f5f4', border: '1px dashed #e8e8e8' }}
    >
      <svg className="mx-auto mb-2 opacity-30" width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="6" width="20" height="16" rx="2" stroke="#0f0f0f" strokeWidth="1.5"/>
        <path d="M9 11h10M9 15h6" stroke="#0f0f0f" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <p className="text-sm text-[#5c5c5c]">{message}</p>
      {action && (
        action.onClick ? (
          <button onClick={action.onClick} className="mt-2 text-xs font-medium text-[#4f3ff0] hover:underline">
            {action.label}
          </button>
        ) : (
          <a href={action.href} className="mt-2 text-xs font-medium text-[#4f3ff0] hover:underline">
            {action.label}
          </a>
        )
      )}
    </div>
  );
}
