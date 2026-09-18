import type { Task } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

function deadlineInfo(deadline: string | null): { label: string; urgent: boolean; overdue: boolean } {
  if (!deadline) return { label: 'Tanpa deadline', urgent: false, overdue: false };
  const now = new Date();
  const d = new Date(deadline);
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Lewat ${Math.abs(diffDays)} hari`, urgent: false, overdue: true };
  if (diffDays === 0) return { label: 'Hari ini', urgent: true, overdue: false };
  if (diffDays === 1) return { label: 'Besok', urgent: true, overdue: false };
  if (diffDays <= 2) return { label: `${diffDays} hari lagi`, urgent: true, overdue: false };
  return { label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), urgent: false, overdue: false };
}

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  onClick: () => void;
}

export function TaskCard({ task, currentUserId, onClick }: TaskCardProps) {
  const { label, urgent, overdue } = deadlineInfo(task.deadline);
  const isAssignee = task.assigned_to_id === currentUserId;
  const counterpart = isAssignee ? task.assigned_by : task.assigned_to;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
      aria-label={`Buka tugas: ${task.title}`}
    >
      <div
        className="bg-white rounded-[2px] border border-[#e8e8e8] group-hover:border-[#4f3ff0] group-hover:shadow-md transition-all duration-150"
        style={{ borderLeft: '3px solid #4f3ff0' }}
      >
        {/* Ticket top */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-[11px] font-mono text-[#a0a0a0] tracking-wider">
              #{task.id.slice(0, 8).toUpperCase()}
            </span>
            <StatusBadge status={task.status} />
          </div>
          <h3 className="text-sm font-semibold text-[#0f0f0f] leading-snug line-clamp-2">
            {task.title}
          </h3>
          {task.brief && (
            <p className="mt-1 text-xs text-[#5c5c5c] line-clamp-1">{task.brief}</p>
          )}
          {task.project && (
            <span
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-full"
              style={{ background: '#ccfbf1', color: '#0f766e' }}
            >
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <path d="M1.5 3.5A1 1 0 012.5 2.5h2.8l1.2 1.4h5A1 1 0 0112.5 5v6a1 1 0 01-1 1h-9a1 1 0 01-1-1V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
              <span className="truncate">{task.project.name}</span>
            </span>
          )}
        </div>

        {/* Perforation */}
        <div className="ticket-perf mx-4" />

        {/* Ticket bottom */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-[#ede9fd] flex items-center justify-center text-[10px] font-semibold text-[#4f3ff0] shrink-0">
              {counterpart?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-[#5c5c5c] truncate">{counterpart?.name}</span>
          </div>
          <span
            className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded ${
              overdue
                ? 'bg-[#fef2f2] text-[#ef4444]'
                : urgent
                  ? 'bg-[#fff7ed] text-[#f97316]'
                  : 'bg-[#f5f5f4] text-[#5c5c5c]'
            }`}
          >
            {label}
          </span>
        </div>
      </div>
    </button>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-[2px] border border-[#e8e8e8]" style={{ borderLeft: '3px solid #e8e8e8' }}>
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
      </div>
      <div className="ticket-perf mx-4" />
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>
  );
}
