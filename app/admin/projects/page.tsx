'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project } from '@/lib/types';
import { Toast } from '@/components/Toast';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }
type ProjectRow = Project & { task_count: number };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/projects');
      if (!res.ok) return;
      const data = await res.json();
      setProjects(data.projects ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: typeof data.error === 'string' ? data.error : 'Gagal menghapus project', type: 'error' });
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      setToast({ message: `Project "${deleteTarget.name}" dihapus`, type: 'success' });
      load();
    } catch {
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  const blocked = (deleteTarget?.task_count ?? 0) > 0;

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#0f0f0f]">Project</h1>
        <p className="text-sm text-[#5c5c5c]">Daftar project beserta jumlah tugasnya. Project hanya bisa dihapus bila tidak ada tugas di dalamnya.</p>
      </div>

      <div className="bg-white border border-[#e8e8e8] rounded-[6px] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#f0f0ee]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="skeleton h-3 w-40 rounded" />
                <div className="ml-auto skeleton h-7 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#a0a0a0]">Belum ada project. Project dibuat otomatis saat kamu menambahkan nama project di tugas.</p>
        ) : (
          <div className="divide-y divide-[#f0f0ee]">
            <div className="px-4 py-2 flex items-center gap-3" style={{ background: '#faf9f7' }}>
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide flex-1">Nama Project</span>
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide">Tugas</span>
              <span className="hidden sm:block text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide">Dibuat</span>
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide w-[70px] text-right">Aksi</span>
            </div>
            {projects.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[#faf9f7] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0f0f0f] truncate">{p.name}</p>
                  {p.description && <p className="text-[10px] text-[#a0a0a0] truncate">{p.description}</p>}
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={p.task_count > 0
                    ? { background: '#fff7ed', color: '#c2410c' }
                    : { background: '#f1f5f9', color: '#64748b' }}
                >
                  {p.task_count}
                </span>
                <span className="hidden sm:block text-[11px] text-[#a0a0a0] w-24">{formatDate(p.created_at)}</span>
                <div className="w-[70px] flex justify-end">
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="text-xs px-3 py-1.5 rounded-[6px] transition-colors hover:bg-red-50"
                    style={{ color: '#ef4444', border: '1px solid #fecaca' }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-[8px] w-full max-w-sm shadow-xl border border-[#e8e8e8]">
            <div className="px-5 py-4 border-b border-[#e8e8e8] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0f0f0f]">Hapus Project</h2>
              {blocked && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c]">Tidak bisa dihapus</span>}
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-sm text-[#5c5c5c]">
                Hapus project <span className="font-semibold text-[#0f0f0f]">{deleteTarget.name}</span>?
              </p>
              {blocked ? (
                <div className="text-xs text-[#b45309] bg-[#fffbeb] border border-[#fde68a] rounded-[6px] px-3 py-2">
                  Project ini masih berisi <strong>{deleteTarget.task_count} tugas</strong>. Pindahkan tugas-tugas tersebut ke project lain (atau hapus tugasnya) terlebih dahulu, baru project bisa dihapus.
                </div>
              ) : (
                <p className="text-xs text-[#a0a0a0]">Tidak ada tugas di project ini. Project akan dihapus permanen.</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[#e8e8e8] flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-xs px-4 py-2 rounded-[6px] transition-colors hover:bg-[#f0f0ee]"
                style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
              >
                {blocked ? 'Tutup' : 'Batal'}
              </button>
              {!blocked && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-4 py-2 rounded-[6px] font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: '#ef4444' }}
                >
                  {deleting ? 'Menghapus...' : 'Hapus Permanen'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
