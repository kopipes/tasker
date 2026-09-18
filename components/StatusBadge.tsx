import type { TaskStatus } from '@/lib/types';

const LABELS: Record<TaskStatus, string> = {
  belum_mulai: 'Belum Mulai',
  dikerjakan: 'Dikerjakan',
  review: 'Review',
  revisi: 'Revisi',
  selesai: 'Selesai',
};

const COLORS: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  belum_mulai: { bg: '#f1f5f9', text: '#64748b', dot: '#64748b' },
  dikerjakan:  { bg: '#e0f2fe', text: '#0284c7', dot: '#0ea5e9' },
  review:      { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
  revisi:      { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' },
  selesai:     { bg: '#dcfce7', text: '#16a34a', dot: '#22c55e' },
};

interface StatusBadgeProps {
  status: TaskStatus;
  animate?: boolean;
}

export function StatusBadge({ status, animate }: StatusBadgeProps) {
  const c = COLORS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${animate ? 'status-pop' : ''}`}
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {LABELS[status]}
    </span>
  );
}

export { LABELS as STATUS_LABELS, COLORS as STATUS_COLORS };
