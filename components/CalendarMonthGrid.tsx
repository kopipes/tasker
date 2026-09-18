'use client';

import type { CalendarItem } from '@/lib/types';
import { monthGrid, toDateKey, isSameDay } from '@/lib/date';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

interface CalendarMonthGridProps {
  year: number;
  month: number;
  itemsByDay: Map<string, CalendarItem[]>;
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
  onSelectItem: (item: CalendarItem) => void;
}

function statusColor(status: string): string {
  switch (status) {
    case 'belum_mulai': return '#0ea5e9';
    case 'dikerjakan': return '#8b5cf6';
    case 'review': return '#f59e0b';
    case 'revisi': return '#f97316';
    case 'selesai': return '#22c55e';
    default: return '#4f3ff0';
  }
}

export function CalendarMonthGrid({ year, month, itemsByDay, selectedKey, onSelectDay, onSelectItem }: CalendarMonthGridProps) {
  const weeks = monthGrid(year, month);
  const today = new Date();

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[6px] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#e8e8e8]" style={{ background: '#faf9f7' }}>
        {WEEKDAYS.map(d => (
          <div key={d} className="px-2 py-2 text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day, idx) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const isSelected = key === selectedKey;
          const items = itemsByDay.get(key) ?? [];
          const shown = items.slice(0, 3);
          const extra = items.length - shown.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              className="text-left align-top min-h-[92px] p-1.5 border-[#f0f0ee] transition-colors hover:bg-[#faf9f7]"
              style={{
                borderRight: idx % 7 !== 6 ? '1px solid #f0f0ee' : undefined,
                borderBottom: idx < 35 ? '1px solid #f0f0ee' : undefined,
                background: isSelected ? 'var(--color-brand-light)' : undefined,
              }}
            >
              <span
                className="inline-flex items-center justify-center w-6 h-6 text-[11px] font-semibold rounded-full mb-1"
                style={{
                  color: !inMonth ? '#c4c4c4' : isToday ? 'white' : '#3c3c3c',
                  background: isToday ? 'var(--color-brand)' : undefined,
                }}
              >
                {day.getDate()}
              </span>
              <div className="space-y-0.5">
                {shown.map(item => {
                  const isTask = item.kind === 'task';
                  const label = isTask ? item.task.title : item.event.title;
                  const dot = isTask ? statusColor(item.task.status) : (item.event.color || 'var(--color-brand)');
                  return (
                    <span
                      key={`${item.kind}-${isTask ? item.task.id : item.event.id}`}
                      onClick={e => { e.stopPropagation(); onSelectItem(item); }}
                      className="flex items-center gap-1 px-1 py-0.5 rounded-[3px] text-[10px] leading-tight truncate cursor-pointer hover:bg-white"
                      style={{ background: isTask ? '#fff7ed' : 'white', border: '1px solid #f0f0ee' }}
                      title={label}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
                      <span className={`truncate ${inMonth ? 'text-[#3c3c3c]' : 'text-[#b0b0b0]'}`}>{label}</span>
                    </span>
                  );
                })}
                {extra > 0 && (
                  <span className="block px-1 text-[9px] text-[#a0a0a0]">+{extra} lagi</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
