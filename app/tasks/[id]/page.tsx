'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Task, TaskEvent, User, Attachment } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Toast } from '@/components/Toast';
import { SubmitResultModal } from '@/components/SubmitResultModal';
import { RequestRevisionModal } from '@/components/RequestRevisionModal';
import { EditTaskModal } from '@/components/EditTaskModal';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDeadline(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function deadlineUrgency(d: string | null): 'overdue' | 'urgent' | 'normal' | null {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 2) return 'urgent';
  return 'normal';
}

const EVENT_LABELS: Record<string, string> = {
  assigned: 'Tugas diberikan',
  edited: 'Detail tugas diedit',
  start: 'Mulai dikerjakan',
  submit: 'Hasil diserahkan',
  revision_request: 'Revisi diminta',
  approved: 'Disetujui & selesai',
};

const EVENT_COLORS: Record<string, { dot: string; bg: string }> = {
  assigned: { dot: '#4f3ff0', bg: '#ede9fd' },
  edited: { dot: '#64748b', bg: '#f1f5f9' },
  start: { dot: '#0ea5e9', bg: '#e0f2fe' },
  submit: { dot: '#22c55e', bg: '#dcfce7' },
  revision_request: { dot: '#ef4444', bg: '#fee2e2' },
  approved: { dot: '#22c55e', bg: '#dcfce7' },
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const [task, setTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modal, setModal] = useState<'submit' | 'revision' | 'edit' | null>(null);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  const load = useCallback(async () => {
    try {
      const [meRes, taskRes] = await Promise.all([
        fetch('/api/me'),
        fetch(`/api/tasks/${taskId}`),
      ]);
      if (meRes.status === 401) { router.replace('/'); return; }
      if (taskRes.status === 404) { router.replace('/dashboard'); return; }
      const meData = await meRes.json();
      const taskData = await taskRes.json();
      setCurrentUser(meData.user);
      setTask(taskData.task);
      setEvents(taskData.events);
    } catch {
      setToast({ message: 'Gagal memuat tugas', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [taskId, router]);

  useEffect(() => { load(); }, [load]);

  async function handleStart() {
    if (!task) return;
    // Optimistic update
    setTask(prev => prev ? { ...prev, status: 'dikerjakan' } : prev);
    setActionLoading('start');
    try {
      const res = await fetch(`/api/tasks/${task.id}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setTask(prev => prev ? { ...prev, status: 'belum_mulai' } : prev);
        setToast({ message: data.error || 'Gagal memulai tugas', type: 'error' });
        return;
      }
      setTask(data.task);
      setToast({ message: 'Tugas mulai dikerjakan', type: 'success' });
      load();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove() {
    if (!task) return;
    setTask(prev => prev ? { ...prev, status: 'selesai' } : prev);
    setActionLoading('approve');
    try {
      const res = await fetch(`/api/tasks/${task.id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setTask(prev => prev ? { ...prev, status: 'review' } : prev);
        setToast({ message: data.error || 'Gagal menyetujui', type: 'error' });
        return;
      }
      setTask(data.task);
      setToast({ message: 'Tugas disetujui & selesai', type: 'success' });
      load();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchive() {
    if (!task) return;
    setActionLoading('archive');
    try {
      const res = await fetch(`/api/tasks/${task.id}/archive`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal mengarsipkan', type: 'error' });
        return;
      }
      setTask(data.task);
      setToast({ message: 'Tugas berhasil diarsipkan', type: 'success' });
      load();
    } finally {
      setActionLoading(null);
    }
  }

  const isAssignee = task?.assigned_to_id === currentUser?.id;
  const isAssigner = task?.assigned_by_id === currentUser?.id;

  const latestSubVersion = events.filter(e => e.type === 'submit').length;
  const urgency = deadlineUrgency(task?.deadline ?? null);

  if (loading) return <DetailSkeleton />;
  if (!task || !currentUser) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-paper)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e8e8e8]" style={{ borderTop: '3px solid var(--color-brand)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
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
          <span className="text-xs text-[#0f0f0f] font-medium truncate max-w-[200px]">{task.title}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-4">

            {/* Ticket card */}
            <div
              className="bg-white shadow-sm"
              style={{ borderRadius: '2px', border: '1px solid #e8e8e8', borderTop: '4px solid var(--color-brand)' }}
            >
              {/* Ticket top */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono tracking-widest text-[#a0a0a0]">
                    #{task.id.slice(0, 8).toUpperCase()} · v{task.edit_version}
                  </span>
                  <StatusBadge status={task.status} animate />
                </div>
                <h1 className="text-lg font-semibold text-[#0f0f0f] leading-snug">{task.title}</h1>
                {task.project && (
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: '#ccfbf1', color: '#0f766e' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                      <path d="M1.5 3.5A1 1 0 012.5 2.5h2.8l1.2 1.4h5A1 1 0 0112.5 5v6a1 1 0 01-1 1h-9a1 1 0 01-1-1V3.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    {task.project.name}
                  </span>
                )}
              </div>

              <div className="ticket-perf mx-5" />

              {/* Meta grid */}
              <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <MetaRow label="Dari" value={task.assigned_by?.name ?? '—'} sub={task.assigned_by?.divisi} />
                <MetaRow label="Untuk" value={task.assigned_to?.name ?? '—'} sub={task.assigned_to?.divisi} />
                <div className="col-span-2">
                  <span className="text-[#a0a0a0] block mb-0.5">Deadline</span>
                  <span
                    className={`font-semibold text-sm ${
                      urgency === 'overdue' ? 'text-[#ef4444]' :
                      urgency === 'urgent' ? 'text-[#f97316]' :
                      'text-[#0f0f0f]'
                    }`}
                  >
                    {formatDeadline(task.deadline) ?? 'Tanpa deadline'}
                    {urgency === 'overdue' && ' · Sudah lewat'}
                    {urgency === 'urgent' && ' · Segera!'}
                  </span>
                </div>
              </div>

              {/* Brief */}
              {task.brief && (
                <>
                  <div className="ticket-perf mx-5" />
                  <div className="px-5 py-4">
                    <p className="text-xs text-[#a0a0a0] mb-1.5">Brief</p>
                    <p className="text-sm text-[#2a2a2a] leading-relaxed whitespace-pre-wrap">{task.brief}</p>
                  </div>
                </>
              )}
            </div>

            {/* Action buttons */}
            {task.status !== 'selesai' && (
              <div className="flex flex-wrap gap-2">
                {isAssignee && task.status === 'belum_mulai' && (
                  <ActionBtn
                    label="Mulai Kerjakan"
                    color="#0ea5e9"
                    loading={actionLoading === 'start'}
                    onClick={handleStart}
                    icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 3l7 4-7 4V3z" fill="white"/></svg>}
                  />
                )}
                {isAssignee && (task.status === 'dikerjakan' || task.status === 'revisi') && (
                  <ActionBtn
                    label="Serahkan Hasil"
                    color="var(--color-brand)"
                    loading={false}
                    onClick={() => setModal('submit')}
                    icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v8M4 7l3 3 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  />
                )}
                {isAssigner && task.status === 'review' && (
                  <>
                    <ActionBtn
                      label="Setujui & Selesai"
                      color="#22c55e"
                      loading={actionLoading === 'approve'}
                      onClick={handleApprove}
                      icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    />
                    <ActionBtn
                      label="Minta Revisi"
                      color="#ef4444"
                      loading={false}
                      onClick={() => setModal('revision')}
                      icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M9 4l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    />
                  </>
                )}
                {isAssigner && (
                  <button
                    onClick={() => setModal('edit')}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[6px] transition-colors"
                    style={{ border: '1px solid #e8e8e8', color: '#5c5c5c', background: 'white' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                    </svg>
                    Edit Tugas
                  </button>
                )}
              </div>
            )}
            {/* Archive button — only for assigner when task is selesai and not yet archived */}
            {isAssigner && task.status === 'selesai' && !task.archived_at && (
              <div className="flex flex-wrap gap-2">
                <ActionBtn
                  label="Arsipkan Tugas"
                  color="#64748b"
                  loading={actionLoading === 'archive'}
                  onClick={handleArchive}
                  icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="white" strokeWidth="1.3"/><path d="M1 6h12" stroke="white" strokeWidth="1.3"/><path d="M5.5 8.5h3" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                />
              </div>
            )}
            {task.archived_at && (
              <div className="flex items-center gap-1.5 text-xs text-[#64748b] px-3 py-2 rounded-[6px]" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2.5" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1"/><path d="M4.5 7.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                Diarsipkan pada {new Date(task.archived_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}

            {/* Timeline */}
            <CollapsibleTimeline events={events} onPreview={setPreviewFile} />
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-[6px] border border-[#e8e8e8] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e8e8e8]">
                <p className="text-xs font-semibold text-[#0f0f0f]">Info Tugas</p>
              </div>
              <div className="px-4 py-3 space-y-3 text-xs">
                <InfoRow label="Status" value={<StatusBadge status={task.status} />} />
                <InfoRow label="Versi Detail" value={`v${task.edit_version}`} />
                <InfoRow label="Submission" value={latestSubVersion > 0 ? `v${latestSubVersion}` : '—'} />
                <InfoRow label="Dibuat" value={formatDate(task.created_at)} />
                <InfoRow label="Diperbarui" value={formatDate(task.updated_at)} />
              </div>
            </div>

            {/* Latest submission */}
            {(() => {
              const submits = events.filter(e => e.type === 'submit');
              const last = submits[submits.length - 1];
              if (!last) return null;
              return (
                <div className="bg-white rounded-[6px] border border-[#e8e8e8] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#e8e8e8]">
                    <p className="text-xs font-semibold text-[#0f0f0f]">Hasil Terkini · v{last.submission_version}</p>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-xs">
                    {last.link && (
                      <a href={last.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#4f3ff0] hover:underline truncate">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="truncate">{last.link}</span>
                      </a>
                    )}
                    {last.attachments && last.attachments.length > 0 && last.attachments.map(att => (
                      <a key={att.id} href={att.storage_path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#5c5c5c] hover:text-[#4f3ff0] truncate">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1"/><path d="M3 5h6M3 7.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                        <span className="truncate">{att.filename}</span>
                      </a>
                    ))}
                    {last.note && <p className="text-[#5c5c5c] italic">{last.note}</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {modal === 'submit' && (
        <SubmitResultModal
          taskId={task.id}
          onClose={() => setModal(null)}
          onSubmitted={() => { setModal(null); setToast({ message: 'Hasil diserahkan', type: 'success' }); load(); }}
        />
      )}
      {modal === 'revision' && (
        <RequestRevisionModal
          taskId={task.id}
          submissionVersion={latestSubVersion}
          onClose={() => setModal(null)}
          onRequested={() => { setModal(null); setToast({ message: 'Revisi dikirim', type: 'info' }); load(); }}
        />
      )}
      {modal === 'edit' && (
        <EditTaskModal
          task={task}
          onClose={() => setModal(null)}
          onEdited={() => { setModal(null); setToast({ message: 'Detail tugas diperbarui', type: 'success' }); load(); }}
        />
      )}
      {previewFile && (
        <FilePreviewModal att={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}

function MetaRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <span className="text-[#a0a0a0] block mb-0.5">{label}</span>
      <span className="font-medium text-[#0f0f0f]">{value}</span>
      {sub && <span className="text-[#a0a0a0] ml-1">· {sub}</span>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[#a0a0a0]">{label}</span>
      <span className="font-medium text-[#0f0f0f] text-right">{value}</span>
    </div>
  );
}

function ActionBtn({ label, color, loading, onClick, icon }: { label: string; color: string; loading: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-[6px] transition-all active:scale-95"
      style={{ background: loading ? '#a0a0a0' : color, cursor: loading ? 'not-allowed' : 'pointer' }}
    >
      {loading ? (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" strokeDasharray="8 6" />
        </svg>
      ) : icon}
      {label}
    </button>
  );
}

function CollapsibleTimeline({ events, onPreview }: { events: TaskEvent[]; onPreview: (att: Attachment) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 group w-full text-left"
      >
        <span className="text-xs font-semibold text-[#0f0f0f]">Riwayat Tugas</span>
        <span className="text-[10px] text-[#a0a0a0]">({events.length})</span>
        <svg
          className="ml-auto transition-transform duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          width="14" height="14" viewBox="0 0 14 14" fill="none"
        >
          <path d="M3 5l4 4 4-4" stroke="#a0a0a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="space-y-0 fade-in">
          {events.map((ev, i) => (
            <TimelineEvent key={ev.id} event={ev} isLast={i === events.length - 1} onPreview={onPreview} />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineEvent({ event, isLast, onPreview }: { event: TaskEvent; isLast: boolean; onPreview: (att: Attachment) => void }) {
  const c = EVENT_COLORS[event.type] ?? { dot: '#a0a0a0', bg: '#f5f5f4' };
  const changes = event.changes_json ? JSON.parse(event.changes_json) : null;

  // link field may be a JSON array of strings or a plain URL string
  let linkList: string[] = [];
  if (event.link) {
    try {
      const parsed = JSON.parse(event.link);
      linkList = Array.isArray(parsed) ? parsed : [event.link];
    } catch {
      linkList = [event.link];
    }
  }

  return (
    <div className={`relative flex gap-3 pb-5 ${!isLast ? 'timeline-line' : ''}`}>
      {/* Dot */}
      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10" style={{ background: c.bg }}>
        <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#0f0f0f]">{EVENT_LABELS[event.type] ?? event.type}</span>
          {event.submission_version && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: c.bg, color: c.dot }}>v{event.submission_version}</span>
          )}
        </div>
        <p className="text-[10px] text-[#a0a0a0] mt-0.5">
          {event.by_user?.name} · {formatDate(event.at)}
        </p>
        {event.note && (
          <div className="mt-1.5 px-3 py-2 rounded-[6px] text-xs text-[#2a2a2a]" style={{ background: '#f5f5f4', borderLeft: `2px solid ${c.dot}` }}>
            {event.note}
          </div>
        )}
        {linkList.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {linkList.map((l, i) => (
              <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#4f3ff0] hover:underline truncate">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="truncate">{l}</span>
              </a>
            ))}
          </div>
        )}
        {event.attachments && event.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {event.attachments.map(att => (
              <button
                key={att.id}
                type="button"
                onClick={e => { e.stopPropagation(); onPreview(att); }}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded text-[#5c5c5c] hover:text-[#4f3ff0] hover:border-[#4f3ff0] transition-colors"
                style={{ background: '#f5f5f4', border: '1px solid #e8e8e8' }}>
                {att.kind === 'image' ? '🖼' : '📎'} {att.filename}
              </button>
            ))}
          </div>
        )}
        {changes && (
          <div className="mt-1.5 space-y-1">
            {Object.entries(changes).map(([field, val]: [string, unknown]) => {
              const v = val as { from: unknown; to: unknown };
              return (
                <div key={field} className="text-[10px] text-[#5c5c5c]">
                  <span className="font-medium">{field}</span>: <span className="line-through text-[#a0a0a0]">{String(v.from ?? '—')}</span> → <span>{String(v.to ?? '—')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-paper)' }}>
      <div className="h-14 bg-white border-b border-[#e8e8e8]" />
      <div className="max-w-3xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#e8e8e8] rounded-[2px] p-5 space-y-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full rounded-[6px]" />)}
          </div>
        </div>
        <div className="skeleton h-40 rounded-[6px]" />
      </div>
    </div>
  );
}

function FilePreviewModal({ att, onClose }: { att: Attachment; onClose: () => void }) {
  const isImage = att.kind === 'image' || (att.mime_type ?? '').startsWith('image/');
  const isPdf = (att.mime_type ?? '').includes('pdf') || att.filename.toLowerCase().endsWith('.pdf');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[6px] shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: '90vw', maxHeight: '90vh', minWidth: '320px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{isImage ? '🖼' : '📎'}</span>
            <span className="text-xs font-medium text-[#0f0f0f] truncate max-w-[280px]">{att.filename}</span>
            {att.size_bytes && (
              <span className="text-[10px] text-[#a0a0a0] shrink-0">
                {att.size_bytes < 1024 * 1024
                  ? `${(att.size_bytes / 1024).toFixed(1)} KB`
                  : `${(att.size_bytes / 1024 / 1024).toFixed(1)} MB`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <a
              href={att.storage_path}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-[6px] text-[#4f3ff0] hover:bg-[#ede9fd] transition-colors"
              style={{ border: '1px solid #e8e8e8' }}
            >
              Buka
            </a>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#5c5c5c] hover:bg-[#f5f5f4] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4" style={{ minHeight: '200px' }}>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={att.storage_path}
              alt={att.filename}
              className="max-w-full max-h-[70vh] object-contain rounded-[4px]"
            />
          ) : isPdf ? (
            <iframe
              src={att.storage_path}
              title={att.filename}
              className="w-full rounded-[4px]"
              style={{ height: '70vh', minWidth: '60vw' }}
            />
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📎</div>
              <p className="text-sm text-[#5c5c5c] mb-1">{att.filename}</p>
              <p className="text-xs text-[#a0a0a0] mb-4">{att.mime_type ?? 'File'}</p>
              <a
                href={att.storage_path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-[6px] text-white transition-all"
                style={{ background: 'var(--color-brand)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v7M3 5l3 3 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 10h10" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
