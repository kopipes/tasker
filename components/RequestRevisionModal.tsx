'use client';

import { useState } from 'react';
import { Modal } from './Modal';

interface RequestRevisionModalProps {
  taskId: string;
  submissionVersion: number;
  onClose: () => void;
  onRequested: () => void;
}

export function RequestRevisionModal({ taskId, submissionVersion, onClose, onRequested }: RequestRevisionModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) { setError('Catatan revisi wajib diisi. Jelaskan apa yang perlu diperbaiki.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(typeof data.error === 'string' ? data.error : 'Gagal meminta revisi'); return; }
      onRequested();
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Minta Revisi" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="px-3 py-2.5 rounded-[6px] text-xs" style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#d97706' }}>
          Revisi akan diminta untuk hasil submission v{submissionVersion}.
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="rr-note">
            Catatan Revisi <span className="text-[#ef4444]">*</span>
          </label>
          <textarea
            id="rr-note"
            value={note}
            onChange={e => { setNote(e.target.value); if (error) setError(''); }}
            placeholder="Jelaskan apa yang perlu diperbaiki atau ditambahkan..."
            rows={4}
            autoFocus
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors resize-none"
            style={{ border: `1px solid ${error ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
          />
          {error && <p className="mt-1 text-xs text-[#ef4444]">{error}</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-[6px]" style={{ border: '1px solid #e8e8e8', color: '#5c5c5c' }}>Batal</button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-[6px] transition-all active:scale-95"
            style={{ background: loading ? '#a0a0a0' : '#ef4444', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Mengirim...' : 'Kirim Revisi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
