'use client';

import { useState, useRef } from 'react';
import { Modal } from './Modal';

interface AttachmentMeta {
  id: string;
  name: string;
  kind: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
}

interface SubmitResultModalProps {
  taskId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SubmitResultModal({ taskId, onClose, onSubmitted }: SubmitResultModalProps) {
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Ukuran file melebihi 4MB. Gunakan link sebagai alternatif.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/attachments', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || 'Upload gagal'); return; }
      setFiles(prev => [...prev, {
        id: data.id,
        name: data.filename,
        kind: data.kind,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        storage_path: data.storage_path,
      }]);
    } catch {
      setUploadError('Upload gagal. Coba lagi.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const hasLink = link.trim().length > 0;
    const hasFiles = files.length > 0;
    if (!hasLink && !hasFiles) {
      setError('Minimal satu dari link atau lampiran harus diisi.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: link.trim() || undefined,
          note: note.trim() || undefined,
          attachments: files.map(f => ({
            id: f.id,
            filename: f.name,
            kind: f.kind,
            mime_type: f.mime_type,
            size_bytes: f.size_bytes,
            storage_path: f.storage_path,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error;
        if (typeof err === 'object' && err.formErrors?.length) setError(err.formErrors[0]);
        else if (typeof err === 'string') setError(err);
        else setError('Gagal menyerahkan hasil');
        return;
      }
      onSubmitted();
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Serahkan Hasil" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="sr-link">
            Link Hasil <span className="text-[#a0a0a0] font-normal">(opsional jika ada lampiran)</span>
          </label>
          <input
            id="sr-link"
            type="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
            style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
          />
        </div>

        {/* File upload */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]">
            Lampiran <span className="text-[#a0a0a0] font-normal">(maks. 4MB per file)</span>
          </label>
          <div
            className="rounded-[6px] border border-dashed border-[#e8e8e8] px-4 py-4 text-center cursor-pointer hover:border-[#4f3ff0] transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-xs text-[#a0a0a0]">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 6"/>
                </svg>
                Mengupload...
              </div>
            ) : (
              <span className="text-xs text-[#5c5c5c]">Klik untuk pilih file atau gambar</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx"
          />
          {uploadError && <p className="mt-1 text-xs text-[#ef4444]">{uploadError}</p>}
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map(f => (
                <li key={f.id} className="flex items-center gap-2 text-xs text-[#5c5c5c] bg-[#f5f5f4] px-3 py-1.5 rounded-[6px]">
                  <span>{f.kind === 'image' ? '🖼' : '📎'}</span>
                  <span className="truncate flex-1">{f.name}</span>
                  <button type="button" onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))} className="text-[#a0a0a0] hover:text-[#ef4444]">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="sr-note">
            Catatan <span className="text-[#a0a0a0] font-normal">(opsional)</span>
          </label>
          <textarea
            id="sr-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Catatan tambahan untuk reviewer..."
            rows={3}
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors resize-none"
            style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
          />
        </div>

        {error && (
          <div className="px-3 py-2.5 rounded-[6px] text-xs text-[#ef4444]" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-[6px]" style={{ border: '1px solid #e8e8e8', color: '#5c5c5c' }}>Batal</button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-[6px] transition-all active:scale-95"
            style={{ background: loading ? '#a0a0a0' : 'var(--color-brand)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Menyerahkan...' : 'Serahkan Hasil'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
