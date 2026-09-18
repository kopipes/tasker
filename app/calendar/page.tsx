'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User, CalendarEvent, Task, CalendarItem } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import { EventModal } from '@/components/EventModal';
import { EventDetailModal } from '@/components/EventDetailModal';
import { CalendarMonthGrid } from '@/components/CalendarMonthGrid';
import {
  toDateKey, startOfMonth, endOfMonth, addMonths, addDays, startOfWeekMonday,
  monthLabel, formatDateLong, formatTime, parseDateKey, isSameDay,
} from '@/lib/date';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

type ModalState =
  | { type: 'create'; date?: Date }
  | { type: 'edit'; event: CalendarEvent }
  | { type: 'detail'; event: CalendarEvent }
  | null;

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'agenda' | 'month'>('agenda');
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(() => toDateKey(new Date()));
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/me');
    if (res.status === 401) { router.replace('/'); return; }
    const data = await res.json();
    setUser(data.user);
    const usersRes = await fetch('/api/me/users');
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      setUsers(usersData.users ?? []);
    }
  }, [router]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const gridStart = startOfWeekMonday(startOfMonth(cursor));
      const from = gridStart.toISOString();
      const to = addDays(gridStart, 42).toISOString();
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/calendar?${params.toString()}`);
      if (res.status === 401) { router.replace('/'); return; }
      const data = await res.json();
      setEvents(data.events ?? []);
      setTasks(data.tasks ?? []);
    } catch {
      setToast({ message: 'Gagal memuat kalender', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [cursor, router]);

  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const items = useMemo<CalendarItem[]>(() => {
    const ev: CalendarItem[] = events.map(e => ({
      kind: 'event', dateKey: toDateKey(new Date(e.start_at)), sortAt: e.start_at, event: e,
    }));
    const tk: CalendarItem[] = tasks
      .filter(t => t.deadline)
      .map(t => ({ kind: 'task', dateKey: toDateKey(new Date(t.deadline!)), sortAt: t.deadline!, task: t }));
    return [...ev, ...tk].sort((a, b) => a.sortAt.localeCompare(b.sortAt));
  }, [events, tasks]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const arr = map.get(item.dateKey) ?? [];
      arr.push(item);
      map.set(item.dateKey, arr);
    }
    return map;
  }, [items]);

  const monthFirstKey = toDateKey(startOfMonth(cursor));
  const monthLastKey = toDateKey(endOfMonth(cursor));
  const monthItems = items.filter(i => i.dateKey >= monthFirstKey && i.dateKey <= monthLastKey);

  const agendaGroups = useMemo(() => {
    const byDay = new Map<string, CalendarItem[]>();
    for (const item of monthItems) {
      const arr = byDay.get(item.dateKey) ?? [];
      arr.push(item);
      byDay.set(item.dateKey, arr);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, dayItems]) => ({ key, date: parseDateKey(key), items: dayItems }));
  }, [monthItems]);

  const selectedDayItems = selectedKey ? (itemsByDay.get(selectedKey) ?? []) : [];

  async function handleDelete(event: CalendarEvent) {
    try {
      const res = await fetch(`/api/calendar/${event.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error ?? 'Gagal menghapus jadwal', type: 'error' });
        return;
      }
      setEvents(prev => prev.filter(e => e.id !== event.id));
      setModal(null);
      setToast({ message: 'Jadwal berhasil dihapus', type: 'success' });
    } catch {
      setToast({ message: 'Terjadi kesalahan jaringan', type: 'error' });
    }
  }

  function openItem(item: CalendarItem) {
    if (item.kind === 'task') {
      router.push(`/tasks/${item.task.id}`);
    } else {
      setModal({ type: 'detail', event: item.event });
    }
  }

  function goToMonth(delta: number) {
    setCursor(prev => addMonths(prev, delta));
  }

  function goToday() {
    const now = new Date();
    setCursor(startOfMonth(now));
    setSelectedKey(toDateKey(now));
  }

  const today = new Date();

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-paper)' }}>
      <header className="sticky top-0 z-30 bg-white border-b border-[#e8e8e8]" style={{ borderTop: '3px solid var(--color-brand)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-[#5c5c5c] hover:text-[#0f0f0f] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </button>
          <span className="text-[#e8e8e8]">/</span>
          <span className="text-xs font-medium text-[#0f0f0f]">Kalender</span>
          {user && <span className="ml-auto text-xs text-[#a0a0a0]">{user.name}</span>}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-lg font-semibold text-[#0f0f0f]">Kalender</h1>
            <p className="text-sm text-[#5c5c5c]">Jadwal & agenda pribadimu, lengkap dengan catatan</p>
          </div>
          <button
            onClick={() => setModal({ type: 'create', date: selectedKey ? parseDateKey(selectedKey) : new Date() })}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-[6px] transition-all active:scale-95"
            style={{ background: 'var(--color-brand)', color: 'white' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Jadwal Baru
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToMonth(-1)}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-[#e8e8e8] hover:bg-[#f0f0ee] transition-colors text-[#5c5c5c]"
              aria-label="Bulan sebelumnya"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              onClick={() => goToMonth(1)}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-[#e8e8e8] hover:bg-[#f0f0ee] transition-colors text-[#5c5c5c]"
              aria-label="Bulan berikutnya"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <h2 className="text-sm font-semibold text-[#0f0f0f] min-w-[140px]">{monthLabel(cursor.getFullYear(), cursor.getMonth())}</h2>
          <button
            onClick={goToday}
            className="text-xs px-3 py-1.5 rounded-[6px] border border-[#e8e8e8] hover:bg-[#f0f0ee] transition-colors"
            style={{ color: 'var(--color-ink-500)' }}
          >
            Hari ini
          </button>

          <div className="ml-auto flex rounded-[6px] border border-[#e8e8e8] overflow-hidden">
            <button
              onClick={() => setView('agenda')}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={view === 'agenda' ? { background: 'var(--color-brand)', color: 'white' } : { color: 'var(--color-ink-500)' }}
            >
              Agenda
            </button>
            <button
              onClick={() => setView('month')}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={view === 'month' ? { background: 'var(--color-brand)', color: 'white' } : { color: 'var(--color-ink-500)' }}
            >
              Bulan
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-[6px]" />)}
          </div>
        ) : view === 'month' ? (
          <div className="space-y-5">
            <CalendarMonthGrid
              year={cursor.getFullYear()}
              month={cursor.getMonth()}
              itemsByDay={itemsByDay}
              selectedKey={selectedKey}
              onSelectDay={key => setSelectedKey(key)}
              onSelectItem={openItem}
            />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#0f0f0f]">
                  {selectedKey ? formatDateLong(parseDateKey(selectedKey)) : 'Pilih tanggal'}
                </h3>
                {selectedKey && (
                  <button
                    onClick={() => setModal({ type: 'create', date: parseDateKey(selectedKey) })}
                    className="text-xs font-medium text-[#4f3ff0] hover:underline"
                  >
                    + Tambah di tanggal ini
                  </button>
                )}
              </div>
              <ItemList items={selectedDayItems} user={user} onSelect={openItem} emptyMessage="Tidak ada jadwal pada tanggal ini." />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {agendaGroups.length === 0 ? (
              <div className="rounded-[6px] px-5 py-12 text-center" style={{ background: '#f5f5f4', border: '1px dashed #e8e8e8' }}>
                <svg className="mx-auto mb-3 opacity-30" width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect x="5" y="8" width="26" height="22" rx="2.5" stroke="#0f0f0f" strokeWidth="1.5"/>
                  <path d="M5 14h26M11 5v5M25 5v5" stroke="#0f0f0f" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p className="text-sm text-[#5c5c5c]">Belum ada jadwal bulan ini.</p>
                <button
                  onClick={() => setModal({ type: 'create', date: cursor })}
                  className="mt-2 text-xs font-medium text-[#4f3ff0] hover:underline"
                >
                  Buat jadwal baru
                </button>
              </div>
            ) : (
              agendaGroups.map(group => {
                const isToday = isSameDay(group.date, today);
                return (
                  <div key={group.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: isToday ? 'var(--color-brand)' : '#c4c4c4' }}
                      />
                      <h3 className={`text-sm font-semibold ${isToday ? 'text-[var(--color-brand)]' : 'text-[#0f0f0f]'}`}>
                        {formatDateLong(group.date)}
                      </h3>
                      {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] font-medium">Hari ini</span>}
                    </div>
                    <ItemList items={group.items} user={user} onSelect={openItem} />
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {modal?.type === 'create' && user && (
        <EventModal
          mode="create"
          defaultDate={modal.date}
          currentUser={user}
          users={users}
          onClose={() => setModal(null)}
          onSaved={msg => { setModal(null); setToast({ message: msg, type: 'success' }); loadCalendar(); }}
        />
      )}
      {modal?.type === 'edit' && user && (
        <EventModal
          mode="edit"
          initial={modal.event}
          currentUser={user}
          users={users}
          onClose={() => setModal(null)}
          onSaved={msg => { setModal(null); setToast({ message: msg, type: 'success' }); loadCalendar(); }}
        />
      )}
      {modal?.type === 'detail' && user && (
        <EventDetailModal
          event={modal.event}
          currentUser={user}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'edit', event: modal.event })}
          onDelete={() => handleDelete(modal.event)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function ItemList({ items, user, onSelect, emptyMessage }: {
  items: CalendarItem[];
  user: User | null;
  onSelect: (item: CalendarItem) => void;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return emptyMessage ? (
      <div className="rounded-[6px] px-4 py-6 text-center" style={{ background: '#f5f5f4', border: '1px dashed #e8e8e8' }}>
        <p className="text-sm text-[#a0a0a0]">{emptyMessage}</p>
      </div>
    ) : null;
  }

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[6px] divide-y divide-[#f0f0ee] overflow-hidden">
      {items.map(item => {
        if (item.kind === 'task') {
          const t = item.task;
          return (
            <button
              key={`task-${t.id}`}
              onClick={() => onSelect(item)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#faf9f7] transition-colors"
            >
              <span className="mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] shrink-0">
                Deadline
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0f0f0f] truncate">{t.title}</p>
                <p className="text-[11px] text-[#a0a0a0] truncate">
                  Tugas untuk {t.assigned_to?.name ?? '—'}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </button>
          );
        }

        const e = item.event;
        const isOwner = user ? e.user_id === user.id : true;
        return (
          <button
            key={`event-${e.id}`}
            onClick={() => onSelect(item)}
            className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#faf9f7] transition-colors"
          >
            <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: e.color || 'var(--color-brand)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#0f0f0f] truncate">{e.title}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span className="text-[11px] text-[#5c5c5c]">
                  {e.all_day ? 'Sepanjang hari' : `${formatTime(e.start_at)}${e.end_at ? `–${formatTime(e.end_at)}` : ''}`}
                </span>
                {e.location && <span className="text-[11px] text-[#a0a0a0]">· {e.location}</span>}
                {e.visibility === 'division' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ede9fe] text-[#5b21b6] font-medium">Divisi</span>
                )}
                {e.visibility === 'public' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] font-medium">Semua</span>
                )}
                {e.visibility === 'custom' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] font-medium">
                    Dibagikan{e.shared_users?.length ? ` · ${e.shared_users.length}` : ''}
                  </span>
                )}
                {!isOwner && e.user && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f0f9ff] text-[#0369a1] font-medium">{e.user.name}</span>
                )}
              </div>
              {e.note && <p className="text-[11px] text-[#a0a0a0] truncate mt-0.5">{e.note}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
