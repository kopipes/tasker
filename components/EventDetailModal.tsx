'use client';

import { useState } from 'react';
import type { CalendarEvent, User, EventVisibility } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { formatDateLong, formatTime } from '@/lib/date';

const VISIBILITY_LABEL: Record<EventVisibility, string> = {
  private: 'Pribadi',
  division: 'Divisi',
  public: 'Semua',
  custom: 'Orang tertentu',
};

const VISIBILITY_BADGE: Record<EventVisibility, React.CSSProperties> = {
  private: { background: '#f0f9ff', color: '#0369a1' },
  division: { background: '#ede9fe', color: '#5b21b6' },
  public: { background: '#dcfce7', color: '#166534' },
  custom: { background: '#fff7ed', color: '#c2410c' },
};

interface EventDetailModalProps {
  event: CalendarEvent;
  currentUser: User;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function EventDetailModal({ event, currentUser, onClose, onEdit, onDelete }: EventDetailModalProps) {
  const [confirming, setConfirming] = useState(false);

  const canManage =
    currentUser.role === 'admin' ||
    event.user_id === currentUser.id ||
    event.created_by_id === currentUser.id ||
    (currentUser.role === 'manager' &&
      event.visibility === 'division' &&
      !!currentUser.divisi &&
      event.user?.divisi === currentUser.divisi);

  const start = new Date(event.start_at);
  const end = event.end_at ? new Date(event.end_at) : null;
  const isOwner = event.user_id === currentUser.id;

  return (
    <Modal title="Detail Jadwal" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[#0f0f0f]">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs text-[#5c5c5c]">{formatDateLong(start)}</span>
            <span className="text-xs text-[#5c5c5c]">
              {event.all_day ? '· Sepanjang hari' : `· ${formatTime(event.start_at)}${end ? `–${formatTime(event.end_at!)}` : ''}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={VISIBILITY_BADGE[event.visibility]}
            >
              {VISIBILITY_LABEL[event.visibility]}
            </span>
            {!isOwner && event.user && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#faf9f7] text-[#5c5c5c] border border-[#e8e8e8]">
                Untuk: {event.user.name}
              </span>
            )}
          </div>
        </div>

        {event.location && (
          <div>
            <p className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide mb-1">Lokasi</p>
            <p className="text-sm text-[#3c3c3c]">{event.location}</p>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide mb-1">Catatan</p>
          {event.note ? (
            <p className="text-sm text-[#3c3c3c] whitespace-pre-wrap leading-relaxed">{event.note}</p>
          ) : (
            <p className="text-sm text-[#a0a0a0] italic">Tidak ada catatan.</p>
          )}
        </div>

        {event.visibility === 'custom' && (
          <div>
            <p className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-wide mb-1">
              Dibagikan ke ({event.shared_users?.length ?? 0})
            </p>
            {event.shared_users && event.shared_users.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {event.shared_users.map(u => (
                  <span key={u.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] font-medium">
                    {u.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#a0a0a0] italic">Belum ada orang yang dipilih.</p>
            )}
          </div>
        )}

        {canManage && (
          <div className="flex justify-end gap-2 pt-1 border-t border-[#e8e8e8]">
            {confirming ? (
              <>
                <span className="text-xs text-[#ef4444] self-center mr-auto">Hapus jadwal ini?</span>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-xs px-3 py-1.5 rounded-[6px] hover:bg-[#f0f0ee] transition-colors"
                  style={{ color: 'var(--color-ink-500)', border: '1px solid #e8e8e8' }}
                >
                  Batal
                </button>
                <button
                  onClick={onDelete}
                  className="text-xs px-3 py-1.5 rounded-[6px] font-semibold text-white transition-all active:scale-95"
                  style={{ background: '#ef4444' }}
                >
                  Hapus
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirming(true)}
                  className="text-xs px-3 py-2 rounded-[6px] transition-colors hover:bg-red-50 mr-auto"
                  style={{ color: '#ef4444', border: '1px solid #fecaca' }}
                >
                  Hapus
                </button>
                <button
                  onClick={onEdit}
                  className="text-xs px-4 py-2 rounded-[6px] font-semibold transition-all active:scale-95"
                  style={{ background: 'var(--color-brand)', color: 'white' }}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
