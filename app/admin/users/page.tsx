'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User, UserRole, Division } from '@/lib/types';
import { Toast } from '@/components/Toast';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  user: 'User',
};

const ROLE_COLOR: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: '#fef3c7', text: '#92400e' },
  manager: { bg: '#ede9fe', text: '#5b21b6' },
  user: { bg: '#f0f9ff', text: '#0369a1' },
};

interface EditState {
  userId: string;
  name: string;
  email: string;
  divisi: string;
  additionalDivisi: string[];
  role: UserRole;
  newPassword: string;
  confirmPassword: string;
}

interface CreateState {
  name: string;
  email: string;
  divisi: string;
  additionalDivisi: string[];
  role: UserRole;
  password: string;
}

const emptyCreate = (): CreateState => ({ name: '', email: '', divisi: '', additionalDivisi: [], role: 'user', password: '' });

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateState>(emptyCreate());
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    try {
      const [res, divRes] = await Promise.all([
        fetch('/api/me/users'),
        fetch('/api/divisions'),
      ]);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
      if (divRes.ok) {
        const divData = await divRes.json();
        setDivisions(divData.divisions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  function openEdit(u: User) {
    const primary = u.divisions?.find(d => d.is_primary)?.name ?? u.divisi ?? '';
    const additional = (u.divisions ?? []).filter(d => !d.is_primary).map(d => d.name);
    setEditing({ userId: u.id, name: u.name, email: u.email, divisi: primary, additionalDivisi: additional, role: u.role, newPassword: '', confirmPassword: '' });
  }

  async function handleSave() {
    if (!editing) return;
    if (editing.newPassword || editing.confirmPassword) {
      if (editing.newPassword.length < 6) {
        setToast({ message: 'Password baru minimal 6 karakter', type: 'error' });
        return;
      }
      if (editing.newPassword !== editing.confirmPassword) {
        setToast({ message: 'Konfirmasi password tidak cocok', type: 'error' });
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editing.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editing.name,
          email: editing.email,
          divisi: editing.divisi,
          additional_divisi: editing.additionalDivisi,
          role: editing.role,
          ...(editing.newPassword ? { password: editing.newPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: typeof data.error === 'string' ? data.error : 'Gagal menyimpan perubahan', type: 'error' });
        return;
      }
      setEditing(null);
      setToast({ message: 'Pengguna berhasil diperbarui', type: 'success' });
      load();
    } catch {
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : 'Gagal membuat pengguna';
        setToast({ message: errMsg, type: 'error' });
        return;
      }
      setShowCreate(false);
      setCreateForm(emptyCreate());
      setToast({ message: `Pengguna ${data.user.name} berhasil dibuat`, type: 'success' });
      load();
    } catch {
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirm.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error ?? 'Gagal menghapus pengguna', type: 'error' });
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      setToast({ message: `Pengguna ${deleteConfirm.name} berhasil dihapus`, type: 'success' });
    } catch {
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.divisi ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#0f0f0f]">Kelola Pengguna</h1>
          <p className="text-sm text-[#5c5c5c]">Daftar dan manajemen pengguna terdaftar</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateForm(emptyCreate()); }}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[6px] transition-all active:scale-95"
          style={{ background: 'var(--color-brand)', color: 'white' }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Tambah Pengguna
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Cari nama, email, atau divisi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] bg-white outline-none focus:border-[var(--color-brand)] transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e8e8e8] rounded-[6px] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#f0f0ee]">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-32 rounded" />
                  <div className="skeleton h-2.5 w-48 rounded" />
                </div>
                <div className="skeleton h-5 w-14 rounded" />
                <div className="skeleton h-7 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-[#a0a0a0]">{search ? 'Tidak ada pengguna yang cocok.' : 'Belum ada pengguna.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0ee]">
            {/* Header */}
            <div className="px-4 py-2 grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_120px_80px_120px] gap-3 items-center">
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide">Pengguna</span>
              <span className="hidden sm:block text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide">Divisi</span>
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide">Role</span>
              <span className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide text-right">Aksi</span>
            </div>
            {paginated.map(u => {
              const rc = ROLE_COLOR[u.role];
              return (
                <div key={u.id} className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_120px_80px_120px] gap-3 items-center hover:bg-[#faf9f7] transition-colors">
                  {/* Name + email */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#0f0f0f] truncate">{u.name}</p>
                      <p className="text-[10px] text-[#a0a0a0] truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Divisi */}
                  <span className="hidden sm:block text-xs text-[#5c5c5c] truncate">{u.divisi || '—'}</span>

                  {/* Role badge */}
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                    style={{ background: rc.bg, color: rc.text }}
                  >
                    {ROLE_LABEL[u.role]}
                  </span>

                  {/* Actions */}
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-xs px-3 py-1.5 rounded-[6px] transition-colors hover:bg-[#f0f0ee]"
                      style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(u)}
                      className="text-xs px-3 py-1.5 rounded-[6px] transition-colors hover:bg-red-50"
                      style={{ color: '#ef4444', border: '1px solid #fecaca' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[#a0a0a0]">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} pengguna
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-[6px] border border-[#e8e8e8] disabled:opacity-40 hover:bg-[#f0f0ee] transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-xs text-[#a0a0a0]">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className="w-8 h-7 text-xs rounded-[6px] border transition-colors"
                    style={page === p
                      ? { background: 'var(--color-brand)', color: 'white', borderColor: 'var(--color-brand)' }
                      : { borderColor: '#e8e8e8', color: 'var(--color-ink-500)' }
                    }
                  >
                    {p}
                  </button>
                )
              )
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded-[6px] border border-[#e8e8e8] disabled:opacity-40 hover:bg-[#f0f0ee] transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-[8px] w-full max-w-sm shadow-xl border border-[#e8e8e8]">
            <div className="px-5 py-4 border-b border-[#e8e8e8] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0f0f0f]">Tambah Pengguna Baru</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#f0f0ee] text-[#a0a0a0] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <Field label="Nama">
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@contoh.com"
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors"
                />
              </Field>
              <Field label="Divisi Utama">
                <select
                  value={createForm.divisi}
                  onChange={e => setCreateForm(p => ({ ...p, divisi: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors bg-white"
                >
                  <option value="">— Tanpa divisi —</option>
                  {divisions.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Divisi Tambahan">
                <AdditionalDivisiPicker
                  divisions={divisions}
                  value={createForm.additionalDivisi}
                  exclude={createForm.divisi}
                  onChange={list => setCreateForm(p => ({ ...p, additionalDivisi: list }))}
                />
              </Field>
              <Field label="Role">
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors bg-white"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 karakter"
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors"
                />
              </Field>
            </div>
            <div className="px-5 py-3 border-t border-[#e8e8e8] flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="text-xs px-4 py-2 rounded-[6px] transition-colors hover:bg-[#f0f0ee]"
                style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name || !createForm.email || !createForm.password}
                className="text-xs px-4 py-2 rounded-[6px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--color-brand)', color: 'white' }}
              >
                {creating ? 'Membuat...' : 'Buat Pengguna'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-[8px] w-full max-w-sm shadow-xl border border-[#e8e8e8]">
            <div className="px-5 py-4 border-b border-[#e8e8e8] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0f0f0f]">Edit Pengguna</h2>
              <button
                onClick={() => setEditing(null)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#f0f0ee] text-[#a0a0a0] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <Field label="Nama">
                <input
                  type="text"
                  value={editing.name}
                  onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={editing.email}
                  onChange={e => setEditing(prev => prev ? { ...prev, email: e.target.value } : prev)}
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors"
                />
              </Field>
              <Field label="Divisi Utama">
                <select
                  value={editing.divisi}
                  onChange={e => setEditing(prev => prev ? { ...prev, divisi: e.target.value } : prev)}
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors bg-white"
                >
                  <option value="">— Tanpa divisi —</option>
                  {divisions.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Divisi Tambahan">
                <AdditionalDivisiPicker
                  divisions={divisions}
                  value={editing.additionalDivisi}
                  exclude={editing.divisi}
                  onChange={list => setEditing(prev => prev ? { ...prev, additionalDivisi: list } : prev)}
                />
              </Field>
              <Field label="Role">
                <select
                  value={editing.role}
                  onChange={e => setEditing(prev => prev ? { ...prev, role: e.target.value as UserRole } : prev)}
                  className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors bg-white"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <div className="pt-2 border-t border-[#f0f0ee]">
                <p className="text-[10px] font-semibold text-[#5c5c5c] uppercase tracking-wide mb-2">Reset Password (opsional)</p>
                <div className="space-y-3">
                  <Field label="Password Baru">
                    <input
                      type="password"
                      value={editing.newPassword}
                      onChange={e => setEditing(prev => prev ? { ...prev, newPassword: e.target.value } : prev)}
                      placeholder="Kosongkan bila tidak diubah"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors"
                    />
                  </Field>
                  <Field label="Konfirmasi Password">
                    <input
                      type="password"
                      value={editing.confirmPassword}
                      onChange={e => setEditing(prev => prev ? { ...prev, confirmPassword: e.target.value } : prev)}
                      placeholder="Ulangi password baru"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] outline-none focus:border-[var(--color-brand)] transition-colors"
                    />
                  </Field>
                </div>
                <p className="mt-2 text-[10px] text-[#a0a0a0]">Gunakan ini bila pengguna lupa password. Password lama tidak diperlukan.</p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[#e8e8e8] flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="text-xs px-4 py-2 rounded-[6px] transition-colors hover:bg-[#f0f0ee]"
                style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs px-4 py-2 rounded-[6px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--color-brand)', color: 'white' }}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-[8px] w-full max-w-sm shadow-xl border border-[#e8e8e8]">
            <div className="px-5 py-4 border-b border-[#e8e8e8]">
              <h2 className="text-sm font-semibold text-[#0f0f0f]">Hapus Pengguna</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#5c5c5c]">
                Yakin ingin menghapus <span className="font-semibold text-[#0f0f0f]">{deleteConfirm.name}</span>?
              </p>
              <p className="text-xs text-[#ef4444] mt-2">
                Semua tugas yang diberikan atau dikerjakan oleh pengguna ini juga akan dihapus permanen.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-[#e8e8e8] flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-xs px-4 py-2 rounded-[6px] transition-colors hover:bg-[#f0f0ee]"
                style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-4 py-2 rounded-[6px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#ef4444', color: 'white' }}
              >
                {deleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-[#5c5c5c] uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}

function AdditionalDivisiPicker({ divisions, value, exclude, onChange }: {
  divisions: Division[];
  value: string[];
  exclude?: string;
  onChange: (list: string[]) => void;
}) {
  const options = divisions.filter(d => d.name !== exclude);
  if (options.length === 0) {
    return <p className="text-xs text-[#a0a0a0]">Belum ada divisi lain di master.</p>;
  }
  return (
    <div className="max-h-32 overflow-y-auto border border-[#e8e8e8] rounded-[6px] divide-y divide-[#f0f0ee] bg-white">
      {options.map(d => {
        const checked = value.includes(d.name);
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(checked ? value.filter(n => n !== d.name) : [...value, d.name])}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#faf9f7] transition-colors"
          >
            <span
              className="w-3.5 h-3.5 rounded-[3px] flex items-center justify-center shrink-0"
              style={{ border: `1px solid ${checked ? 'var(--color-brand)' : '#cfcfcf'}`, background: checked ? 'var(--color-brand)' : 'white' }}
            >
              {checked && (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className="text-xs text-[#3c3c3c] truncate">{d.name}</span>
          </button>
        );
      })}
    </div>
  );
}
