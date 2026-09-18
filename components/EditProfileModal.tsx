'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { DIVISI_LIST } from '@/lib/constants';
import type { User } from '@/lib/types';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}

export function EditProfileModal({ user, onClose, onSaved }: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [divisi, setDivisi] = useState(user.divisi);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [serverError, setServerError] = useState('');

  const hasProfileChanges = name !== user.name || divisi !== user.divisi;
  const hasPasswordChange = newPassword.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');

    // Client-side validation
    const errs: Record<string, string[]> = {};
    if (!name.trim()) errs.name = ['Nama wajib diisi'];
    if (hasPasswordChange) {
      if (!currentPassword) errs.current_password = ['Password lama wajib diisi'];
      if (newPassword.length < 6) errs.new_password = ['Password minimal 6 karakter'];
      if (newPassword !== confirmPassword) errs.confirm_password = ['Konfirmasi password tidak cocok'];
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (!hasProfileChanges && !hasPasswordChange) { onClose(); return; }

    setLoading(true);
    try {
      const body: Record<string, string> = {};
      if (hasProfileChanges) { body.name = name; body.divisi = divisi; }
      if (hasPasswordChange) { body.current_password = currentPassword; body.new_password = newPassword; }

      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.error === 'object') setErrors(data.error);
        else setServerError(data.error || 'Gagal menyimpan profil');
        return;
      }
      onSaved(data.user);
    } catch {
      setServerError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  const ROLE_LABELS: Record<string, string> = { admin: 'Admin', manager: 'Manager', user: 'User' };
  const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
    admin: { bg: '#fef3c7', text: '#d97706' },
    manager: { bg: '#ede9fd', text: '#4f3ff0' },
    user: { bg: '#f1f5f9', text: '#64748b' },
  };
  const rc = ROLE_COLORS[user.role] ?? ROLE_COLORS.user;

  return (
    <Modal title="Edit Profil" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Identity header */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-[6px]" style={{ background: '#f5f5f4' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--color-brand)', color: 'white' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0f0f0f] truncate">{user.name}</p>
            <p className="text-xs text-[#a0a0a0] truncate">{user.email}</p>
          </div>
          <span className="ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: rc.bg, color: rc.text }}>
            {ROLE_LABELS[user.role]}
          </span>
        </div>

        {/* Profile fields */}
        <div className="space-y-4">
          <p className="text-[10px] font-semibold tracking-wider text-[#a0a0a0]">INFORMASI PROFIL</p>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="ep-name">Nama</label>
            <input
              id="ep-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
              className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
              style={{ border: `1px solid ${errors.name ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
            />
            {errors.name && <p className="mt-1 text-xs text-[#ef4444]">{errors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="ep-email">
              Email <span className="font-normal text-[#a0a0a0]">(tidak bisa diubah)</span>
            </label>
            <input
              id="ep-email"
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2.5 text-sm rounded-[6px]"
              style={{ border: '1px solid #e8e8e8', background: '#f5f5f4', color: '#a0a0a0', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="ep-divisi">Divisi</label>
            <select
              id="ep-divisi"
              value={divisi}
              onChange={e => setDivisi(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors appearance-none"
              style={{ border: '1px solid #e8e8e8', background: '#faf9f7', color: divisi ? '#0f0f0f' : '#a0a0a0' }}
            >
              <option value="">Tanpa divisi</option>
              {DIVISI_LIST.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Password change */}
        <div className="space-y-4">
          <p className="text-[10px] font-semibold tracking-wider text-[#a0a0a0]">GANTI PASSWORD <span className="font-normal normal-case tracking-normal">(opsional)</span></p>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="ep-cur-pass">Password Lama</label>
            <div className="relative">
              <input
                id="ep-cur-pass"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); if (errors.current_password) setErrors(p => ({ ...p, current_password: undefined })); }}
                placeholder="Password saat ini"
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-[6px] outline-none transition-colors"
                style={{ border: `1px solid ${errors.current_password ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
              />
              <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" tabIndex={-1}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3"/>{!showCurrent && <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>}</svg>
              </button>
            </div>
            {errors.current_password && <p className="mt-1 text-xs text-[#ef4444]">{errors.current_password[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="ep-new-pass">Password Baru</label>
            <div className="relative">
              <input
                id="ep-new-pass"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); if (errors.new_password) setErrors(p => ({ ...p, new_password: undefined })); }}
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-[6px] outline-none transition-colors"
                style={{ border: `1px solid ${errors.new_password ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
              />
              <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" tabIndex={-1}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3"/>{!showNew && <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>}</svg>
              </button>
            </div>
            {errors.new_password && <p className="mt-1 text-xs text-[#ef4444]">{errors.new_password[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="ep-confirm-pass">Konfirmasi Password Baru</label>
            <input
              id="ep-confirm-pass"
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); if (errors.confirm_password) setErrors(p => ({ ...p, confirm_password: undefined })); }}
              placeholder="Ulangi password baru"
              className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
              style={{ border: `1px solid ${errors.confirm_password ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
            />
            {errors.confirm_password && <p className="mt-1 text-xs text-[#ef4444]">{errors.confirm_password[0]}</p>}
          </div>
        </div>

        {serverError && (
          <div className="px-3 py-2.5 rounded-[6px] text-xs text-[#ef4444]" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            {serverError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-[6px]" style={{ border: '1px solid #e8e8e8', color: '#5c5c5c' }}>Batal</button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-[6px] transition-all active:scale-95"
            style={{ background: loading ? '#a0a0a0' : 'var(--color-brand)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
