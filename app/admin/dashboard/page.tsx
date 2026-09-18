'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AdminStats {
  totalActive: number;
  totalArchived: number;
  totalSelesai: number;
  totalOverdue: number;
  totalReview: number;
  totalRevisi: number;
  totalBelumMulai: number;
  totalDikerjakan: number;
  totalUsers: number;
  completedLast30: number;
  perUser: { id: string; name: string; divisi: string; active_tasks: number }[];
}

function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[6px] p-4">
      <p className="text-[10px] font-medium text-[#a0a0a0] mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[#a0a0a0] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const statsRes = await fetch('/api/admin/stats');
      if (!statsRes.ok) return;
      const statsData = await statsRes.json();
      setStats(statsData.stats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[#0f0f0f]">Dashboard Admin</h1>
          <p className="text-sm text-[#5c5c5c]">Ringkasan aktivitas tugas seluruh tim</p>
        </div>

        {loading || !stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20 rounded-[6px]" />)}
          </div>
        ) : (
          <>
            {/* Primary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <StatCard label="Aktif" value={stats.totalActive} color="#4f3ff0" sub="Belum selesai" />
              <StatCard label="Overdue" value={stats.totalOverdue} color="#ef4444" sub="Melewati deadline" />
              <StatCard label="Menunggu Review" value={stats.totalReview} color="#f59e0b" />
              <StatCard label="Selesai (tdk arsip)" value={stats.totalSelesai} color="#22c55e" />
              <StatCard label="Diarsipkan" value={stats.totalArchived} color="#64748b" />
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Belum Dimulai" value={stats.totalBelumMulai} color="#0ea5e9" />
              <StatCard label="Sedang Dikerjakan" value={stats.totalDikerjakan} color="#8b5cf6" />
              <StatCard label="Perlu Revisi" value={stats.totalRevisi} color="#f97316" />
              <StatCard label="Selesai 30 Hari" value={stats.completedLast30} color="#22c55e" sub="Terakhir 30 hari" />
            </div>

            {/* Users section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Per-user workload */}
              <div className="bg-white border border-[#e8e8e8] rounded-[6px] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e8e8e8] flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#0f0f0f]">Beban Kerja per Anggota</p>
                  <span className="text-[10px] text-[#a0a0a0]">{stats.totalUsers} pengguna</span>
                </div>
                <div className="divide-y divide-[#f0f0ee]">
                  {stats.perUser.map(u => (
                    <div key={u.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#0f0f0f] truncate">{u.name}</p>
                        <p className="text-[10px] text-[#a0a0a0]">{u.divisi || '—'}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.max(4, Math.min(80, u.active_tasks * 10))}px`,
                            background: u.active_tasks > 5 ? '#ef4444' : u.active_tasks > 2 ? '#f59e0b' : '#22c55e'
                          }}
                        />
                        <span className="text-xs font-semibold text-[#0f0f0f] w-5 text-right">{u.active_tasks}</span>
                      </div>
                    </div>
                  ))}
                  {stats.perUser.length === 0 && (
                    <p className="px-4 py-4 text-xs text-[#a0a0a0] text-center">Belum ada data</p>
                  )}
                </div>
              </div>

              {/* Quick links */}
              <div className="space-y-3">
                <div className="bg-white border border-[#e8e8e8] rounded-[6px] p-4">
                  <p className="text-xs font-semibold text-[#0f0f0f] mb-3">Navigasi Cepat</p>
                  <div className="space-y-2">
                    <QuickLink
                      label="Lihat Semua Arsip"
                      desc={`${stats.totalArchived} tugas diarsipkan`}
                      onClick={() => router.push('/archive')}
                      color="#64748b"
                    />
                    <QuickLink
                      label="Tugas Selesai (belum arsip)"
                      desc={`${stats.totalSelesai} tugas menunggu diarsipkan`}
                      onClick={() => router.push('/dashboard#selesai')}
                      color="#22c55e"
                    />
                    <QuickLink
                      label="Kelola Pengguna"
                      desc={`${stats.totalUsers} pengguna terdaftar`}
                      onClick={() => router.push('/admin/users')}
                      color="#4f3ff0"
                    />
                    <QuickLink
                      label="Kalender"
                      desc="Jadwal & agenda pribadi"
                      onClick={() => router.push('/calendar')}
                      color="#8b5cf6"
                    />
                    <QuickLink
                      label="Dashboard User"
                      desc="Lihat tampilan pengguna biasa"
                      onClick={() => router.push('/dashboard')}
                      color="#0ea5e9"
                    />
                  </div>
                </div>

                {/* Status breakdown */}
                <div className="bg-white border border-[#e8e8e8] rounded-[6px] p-4">
                  <p className="text-xs font-semibold text-[#0f0f0f] mb-3">Distribusi Status (Aktif)</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Belum Mulai', value: stats.totalBelumMulai, color: '#0ea5e9' },
                      { label: 'Dikerjakan', value: stats.totalDikerjakan, color: '#8b5cf6' },
                      { label: 'Review', value: stats.totalReview, color: '#f59e0b' },
                      { label: 'Revisi', value: stats.totalRevisi, color: '#f97316' },
                    ].map(s => {
                      const pct = stats.totalActive > 0 ? Math.round(s.value / stats.totalActive * 100) : 0;
                      return (
                        <div key={s.label}>
                          <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <span className="text-[#5c5c5c]">{s.label}</span>
                            <span className="font-medium text-[#0f0f0f]">{s.value} <span className="text-[#a0a0a0]">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#f0f0ee] overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
    </div>
  );
}

function QuickLink({ label, desc, onClick, color }: { label: string; desc: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] hover:bg-[#faf9f7] transition-colors text-left"
      style={{ border: '1px solid #f0f0ee' }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#0f0f0f]">{label}</p>
        <p className="text-[10px] text-[#a0a0a0]">{desc}</p>
      </div>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#a0a0a0] shrink-0">
        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
