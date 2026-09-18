'use client';

import { useState, useMemo } from 'react';
import type { CalendarEvent, User, EventVisibility } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { toDateKey, toDateTimeLocal } from '@/lib/date';

const inputClass = 'w-full px-3 py-2 text-sm border border-[#e8e8e8] rounded-[6px] bg-white outline-none focus:border-[var(--color-brand)] transition-colors';
const labelClass = 'block text-[10px] font-semibold text-[#5c5c5c] uppercase tracking-wide mb-1';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

interface EventModalProps {
  mode: 'create' | 'edit';
  initial?: CalendarEvent | null;
  defaultDate?: Date;
  currentUser: User;
  users: User[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function EventModal({ mode, initial, defaultDate, currentUser, users, onClose, onSaved }: EventModalProps) {
  const baseDate = initial ? new Date(initial.start_at) : (defaultDate ?? new Date());
  const initialAllDay = initial ? initial.all_day === 1 : false;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [allDay, setAllDay] = useState(initialAllDay);
  const [dateKey, setDateKey] = useState(toDateKey(baseDate));
  const [startTime, setStartTime] = useState(initial && !initialAllDay ? toDateTimeLocal(initial.start_at).slice(11, 16) : '09:00');
  const [endTime, setEndTime] = useState(initial?.end_at && !initialAllDay ? toDateTimeLocal(initial.end_at).slice(11, 16) : '10:00');
  const [visibility, setVisibility] = useState<EventVisibility>(initial?.visibility ?? 'private');
  const [ownerId, setOwnerId] = useState(initial?.user_id ?? currentUser.id);
  const [sharedIds, setSharedIds] = useState<string[]>(initial?.shared_users?.map(u => u.id) ?? []);
  const [shareSearch, setShareSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAssignOthers = currentUser.role === 'admin' || currentUser.role === 'manager';
  const assignableUsers = currentUser.role === 'manager'
    ? users.filter(u => u.divisi === currentUser.divisi)
    : users;

  const ownerUser = users.find(u => u.id === ownerId) ?? initial?.user ?? currentUser;
  const ownerDivisiEmpty = !ownerUser.divisi;

  const shareCandidates = useMemo(() => {
    const q = shareSearch.trim().toLowerCase();
    return users
      .filter(u => u.id !== ownerId)
      .filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.divisi ?? '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [users, ownerId, shareSearch]);

  function toggleShare(id: string) {
    setSharedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError('Judul wajib diisi'); return; }
    if (visibility === 'division' && ownerDivisiEmpty) {
      setError('Divisi pemilik kosong — pilih "Semua" atau "Orang tertentu".');
      return;
    }
    if (visibility === 'custom' && sharedIds.length === 0) {
      setError('Pilih minimal satu orang untuk dibagikan.');
      return;
    }

    const start = allDay
      ? new Date(`${dateKey}T00:00`)
      : new Date(`${dateKey}T${startTime || '00:00'}`);
    const end = allDay || !endTime ? null : new Date(`${dateKey}T${endTime}`);

    if (isNaN(start.getTime())) { setError('Tanggal tidak valid'); return; }
    if (end && end.getTime() < start.getTime()) { setError('Waktu selesai harus setelah mulai'); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        note: note.trim() ? note.trim() : null,
        location: location.trim() ? location.trim() : null,
        start_at: start.toISOString(),
        end_at: end ? end.toISOString() : null,
        all_day: allDay,
        visibility,
        shared_user_ids: visibility === 'custom' ? sharedIds : [],
        ...(mode === 'create' ? { owner_id: ownerId } : {}),
      };

      const res = await fetch(mode === 'create' ? '/api/calendar' : `/api/calendar/${initial!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Gagal menyimpan jadwal');
        return;
      }
      onSaved(mode === 'create' ? 'Jadwal berhasil dibuat' : 'Jadwal berhasil diperbarui');
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={mode === 'create' ? 'Jadwal Baru' : 'Edit Jadwal'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Judul">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Contoh: Meeting divisi"
            className={inputClass}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal">
            <input
              type="date"
              value={dateKey}
              onChange={e => setDateKey(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Sepanjang hari">
            <button
              type="button"
              onClick={() => setAllDay(v => !v)}
              className="w-full h-[38px] flex items-center gap-2 px-3 text-sm rounded-[6px] border transition-colors"
              style={{
                borderColor: allDay ? 'var(--color-brand)' : '#e8e8e8',
                background: allDay ? 'var(--color-brand-light)' : 'white',
                color: allDay ? 'var(--color-brand)' : '#5c5c5c',
              }}
            >
              <span
                className="w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0"
                style={{ border: `1px solid ${allDay ? 'var(--color-brand)' : '#cfcfcf'}`, background: allDay ? 'var(--color-brand)' : 'white' }}
              >
                {allDay && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              {allDay ? 'Ya' : 'Tidak'}
            </button>
          </Field>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jam mulai">
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Jam selesai">
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <Field label="Lokasi (opsional)">
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Contoh: Ruang rapat / Zoom"
            className={inputClass}
          />
        </Field>

        <Field label="Catatan">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={4}
            placeholder="Detail agenda, poin yang perlu dibahas, dsb."
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Visibilitas">
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as EventVisibility)}
              className={inputClass}
            >
              <option value="private">Pribadi — hanya saya</option>
              <option value="division">Divisi — rekan sedivisi</option>
              <option value="public">Semua — semua pengguna</option>
              <option value="custom">Orang tertentu</option>
            </select>
          </Field>
          {canAssignOthers && mode === 'create' && (
            <Field label="Untuk">
              <select
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                className={inputClass}
              >
                <option value={currentUser.id}>Diri sendiri</option>
                {assignableUsers.filter(u => u.id !== currentUser.id).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {visibility === 'division' && ownerDivisiEmpty && (
          <p className="text-xs text-[#b45309] bg-[#fffbeb] border border-[#fde68a] rounded-[6px] px-3 py-2">
            {ownerUser.id === currentUser.id ? 'Divisimu' : `Divisi ${ownerUser.name}`} kosong, jadi tidak ada rekan yang bisa melihat. Pilih <strong>Semua</strong> atau <strong>Orang tertentu</strong>.
          </p>
        )}

        {visibility === 'custom' && (
          <div>
            <label className={labelClass}>Bagikan ke ({sharedIds.length} dipilih)</label>
            <input
              type="text"
              value={shareSearch}
              onChange={e => setShareSearch(e.target.value)}
              placeholder="Cari nama / email / divisi..."
              className={`${inputClass} mb-2`}
            />
            <div className="max-h-44 overflow-y-auto border border-[#e8e8e8] rounded-[6px] divide-y divide-[#f0f0ee] bg-white">
              {shareCandidates.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[#a0a0a0] text-center">Tidak ada pengguna yang cocok.</p>
              ) : (
                shareCandidates.map(u => {
                  const checked = sharedIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleShare(u.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#faf9f7] transition-colors"
                    >
                      <span
                        className="w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0"
                        style={{ border: `1px solid ${checked ? 'var(--color-brand)' : '#cfcfcf'}`, background: checked ? 'var(--color-brand)' : 'white' }}
                      >
                        {checked && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[#0f0f0f] truncate">{u.name}</p>
                        <p className="text-[10px] text-[#a0a0a0] truncate">{u.divisi || u.email}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {sharedIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sharedIds.map(id => {
                  const u = users.find(x => x.id === id);
                  if (!u) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] font-medium">
                      {u.name}
                      <button type="button" onClick={() => toggleShare(id)} className="hover:opacity-70" aria-label={`Hapus ${u.name}`}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-[#ef4444] bg-[#fef2f2] border border-[#fecaca] rounded-[6px] px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-[6px] transition-colors hover:bg-[#f0f0ee]"
            style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="text-xs px-4 py-2 rounded-[6px] font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--color-brand)', color: 'white' }}
          >
            {saving ? 'Menyimpan...' : mode === 'create' ? 'Buat Jadwal' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
