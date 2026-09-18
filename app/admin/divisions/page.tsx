'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Division } from '@/lib/types';
import { Toast } from '@/components/Toast';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }
type DivisionRow = Division & { user_count: number };

export default function AdminDivisionsPage() {
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DivisionRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/divisions');
      if (!res.ok) return;
      const data = await res.json();
      setDivisions(data.divisions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: typeof data.error === 'string' ? data.error : 'Gagal menambah divisi', type: 'error' });
        return;
      }
      setNewName('');
      setToast({ message: `Divisi "${data.division.name}" ditambahkan`, type: 'success' });
      load();
    } catch {
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/divisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: typeof data.error === 'string' ? data.error : 'Gagal mengubah divisi', type: 'error' });
        return;
      }
      setEditingId(null);
      setToast({ message: 'Divisi berhasil diubah', type: 'success' });
      load();
    } catch {
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/divisions/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: typeof data.error === 'string' ? data.error : 'Gagal menghapus divisi', type: 'error' });
        return;
      }
      setDeleteTarget(null);
      setToast({ message: `Divisi "${deleteTarget.name}" dihapus`, type: 'success' });
      load();
    } catch {
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#0f0f0f]">Master Divisi</h1>
        <p className="text-sm text-[#5c5c5c]">Kelola daftar divisi untuk pengguna dan registrasi</p>
      </div>

      {/* Add */}
      <div className="bg-white border border-[#e8e8e8] rounded-[6px] p-4 mb-5 flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold text-[#5c5c5c] uppercase tracking-wide mb-1">Divisi Baru</label>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Contoh: Retail, Premium, Creative..."
            className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] bg-white outline-none focus:border-[var(--color-brand)] transition-colors"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="px-4 py-2 text-xs font-semibold rounded-[6px] transition-all active:scale-95 disabled:opacity-50"
          style={{ background: 'var(--color-brand)', color: 'white' }}
        >
          {creating ? 'Menambah...' : 'Tambah'}
        </button>
      </div>

      {/* List */}
      <div className="bg-white border border-[#e8e8e8] rounded-[6px] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#f0f0ee]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="skeleton h-3 w-40 rounded" />
                <div className="ml-auto skeleton h-7 w-24 rounded" />
              </div>
            ))}
          </div>
        ) : divisions.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#a0a0a0]">Belum ada divisi.</p>
        ) : (
          <div className="divide-y divide-[#f0f0ee]">
            <div className="px-4 py-2 flex items-center gap-3" style={{ background: '#faf9f7' }}>
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide flex-1">Nama Divisi</span>
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide">Pengguna</span>
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide w-[120px] text-right">Aksi</span>
            </div>
            {divisions.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[#faf9f7] transition-colors">
                {editingId === d.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(d.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 px-3 py-1.5 text-sm border border-[var(--color-brand)] rounded-[6px] outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-[#0f0f0f] truncate">{d.name}</span>
                )}

                <span className="text-xs text-[#5c5c5c] w-16 text-center">{d.user_count}</span>

                <div className="w-[120px] flex justify-end gap-1.5">
                  {editingId === d.id ? (
                    <>
                      <button
                        onClick={() => handleRename(d.id)}
                        disabled={saving}
                        className="text-xs px-2.5 py-1.5 rounded-[6px] font-semibold disabled:opacity-50"
                        style={{ background: 'var(--color-brand)', color: 'white' }}
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-2.5 py-1.5 rounded-[6px] hover:bg-[#f0f0ee]"
                        style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
                      >
                        Batal
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingId(d.id); setEditName(d.name); }}
                        className="text-xs px-2.5 py-1.5 rounded-[6px] hover:bg-[#f0f0ee] transition-colors"
                        style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => setDeleteTarget(d)}
                        disabled={d.user_count > 0}
                        title={d.user_count > 0 ? 'Masih dipakai pengguna' : 'Hapus'}
                        className="text-xs px-2.5 py-1.5 rounded-[6px] transition-colors hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ color: '#ef4444', border: '1px solid #fecaca' }}
                      >
                        Hapus
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-[8px] w-full max-w-sm shadow-xl border border-[#e8e8e8]">
            <div className="px-5 py-4 border-b border-[#e8e8e8]">
              <h2 className="text-sm font-semibold text-[#0f0f0f]">Hapus Divisi</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#5c5c5c]">
                Yakin ingin menghapus divisi <span className="font-semibold text-[#0f0f0f]">{deleteTarget.name}</span>?
              </p>
            </div>
            <div className="px-5 py-3 border-t border-[#e8e8e8] flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-xs px-4 py-2 rounded-[6px] transition-colors hover:bg-[#f0f0ee]"
                style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-4 py-2 rounded-[6px] font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#ef4444' }}
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
