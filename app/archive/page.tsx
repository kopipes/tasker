'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, User } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDeadline(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 20;

export default function ArchivePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/me');
      if (meRes.status === 401) { router.replace('/'); return; }
      const meData = await meRes.json();
      setUser(meData.user);

      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/archives?${params.toString()}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [router, debouncedSearch, from, to, page]);

  useEffect(() => { load(); }, [load]);

  function clearFilters() {
    setSearch('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const hasFilter = search || from || to;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-paper)' }}>
      {/* Header */}
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
          <span className="text-xs font-medium text-[#0f0f0f]">Arsip</span>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <span className="text-xs text-[#a0a0a0]">{user.name}</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-[#0f0f0f]">Arsip Tugas</h1>
            <p className="text-sm text-[#5c5c5c]">Tugas yang telah selesai dan diarsipkan</p>
          </div>
          {!loading && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
              {total} tugas
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#e8e8e8] rounded-[6px] p-4 mb-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-medium text-[#a0a0a0] mb-1">Cari judul / nama</label>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a0a0a0]" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-7 pr-3 py-2 text-xs rounded-[6px] outline-none border border-[#e8e8e8] bg-[#faf9f7] focus:border-[#4f3ff0] focus:bg-white transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#a0a0a0] mb-1">Dari tanggal</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 text-xs rounded-[6px] outline-none border border-[#e8e8e8] bg-[#faf9f7] focus:border-[#4f3ff0] focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#a0a0a0] mb-1">Sampai tanggal</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="px-3 py-2 text-xs rounded-[6px] outline-none border border-[#e8e8e8] bg-[#faf9f7] focus:border-[#4f3ff0] focus:bg-white transition-all"
            />
          </div>
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs rounded-[6px] text-[#ef4444] hover:bg-[#fef2f2] transition-colors border border-[#fecaca]"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton h-14 rounded-[6px]" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-[6px] px-5 py-12 text-center" style={{ background: '#f5f5f4', border: '1px dashed #e8e8e8' }}>
            <svg className="mx-auto mb-3 opacity-30" width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="5" y="7" width="26" height="22" rx="2.5" stroke="#0f0f0f" strokeWidth="1.5"/>
              <path d="M11 14h14M11 19h10M11 24h7" stroke="#0f0f0f" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-sm text-[#5c5c5c]">
              {hasFilter ? 'Tidak ada hasil untuk filter ini.' : 'Belum ada tugas yang diarsipkan.'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-[#e8e8e8] rounded-[6px] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#faf9f7', borderBottom: '1px solid #e8e8e8' }}>
                    <th className="text-left px-4 py-3 font-medium text-[#a0a0a0]">Judul</th>
                    <th className="text-left px-4 py-3 font-medium text-[#a0a0a0] hidden sm:table-cell">Dikerjakan oleh</th>
                    <th className="text-left px-4 py-3 font-medium text-[#a0a0a0] hidden md:table-cell">Deadline</th>
                    <th className="text-left px-4 py-3 font-medium text-[#a0a0a0] hidden md:table-cell">Diarsipkan</th>
                    <th className="text-left px-4 py-3 font-medium text-[#a0a0a0]">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, i) => (
                    <tr
                      key={task.id}
                      className="hover:bg-[#faf9f7] transition-colors cursor-pointer"
                      style={{ borderTop: i > 0 ? '1px solid #f0f0ee' : undefined }}
                      onClick={() => router.push(`/tasks/${task.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0f0f0f] truncate max-w-[200px]">{task.title}</p>
                        <p className="text-[10px] text-[#a0a0a0]">#{task.id.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="font-medium text-[#0f0f0f]">{task.assigned_to?.name ?? '—'}</p>
                        <p className="text-[10px] text-[#a0a0a0]">{task.assigned_to?.divisi}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-[#5c5c5c]">{formatDeadline(task.deadline)}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-[#5c5c5c]">{task.archived_at ? formatDate(task.archived_at) : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#a0a0a0]">
                          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-[#a0a0a0]">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} tugas
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
          </>
        )}
      </main>
    </div>
  );
}
