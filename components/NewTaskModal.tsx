'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import type { User } from '@/lib/types';

interface NewTaskModalProps {
  currentUser: User;
  onClose: () => void;
  onCreated: () => void;
}

interface UploadedFile {
  id: string;
  name: string;
  kind: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
}

export function NewTaskModal({ currentUser, onClose, onCreated }: NewTaskModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [projectName, setProjectName] = useState('');
  const [brief, setBrief] = useState('');
  const [note, setNote] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignedById, setAssignedById] = useState(currentUser.id);
  const [assignerSearch, setAssignerSearch] = useState('');
  const [showAssignerList, setShowAssignerList] = useState(false);
  const [assignedToId, setAssignedToId] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [serverError, setServerError] = useState('');
  const [showAssigneeList, setShowAssigneeList] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/me/users').then(r => r.json()).then(d => setUsers(d.users ?? []));
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {});
  }, []);

  const otherUsers = users.filter(u => u.id !== assignedById);
  const filtered = otherUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.divisi.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const selectedUser = users.find(u => u.id === assignedToId);

  const allAssigners = [currentUser, ...users.filter(u => u.id !== currentUser.id)];
  const selectedAssigner = allAssigners.find(u => u.id === assignedById) ?? currentUser;
  const assignerQuery = assignerSearch.trim().toLowerCase();
  const filteredAssigners = allAssigners.filter(u =>
    !assignerQuery ||
    u.name.toLowerCase().includes(assignerQuery) ||
    (u.divisi ?? '').toLowerCase().includes(assignerQuery) ||
    u.email.toLowerCase().includes(assignerQuery)
  );

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

  function addLink() { setLinks(prev => [...prev, '']); }
  function updateLink(i: number, val: string) { setLinks(prev => prev.map((l, idx) => idx === i ? val : l)); }
  function removeLink(i: number) { setLinks(prev => prev.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      const validLinks = links.filter(l => l.trim().length > 0);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          brief,
          note,
          deadline,
          assigned_by_id: assignedById,
          assigned_to_id: assignedToId,
          project_name: projectName.trim() || undefined,
          links: validLinks,
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
        if (typeof data.error === 'object') setErrors(data.error);
        else setServerError(data.error || 'Gagal membuat tugas');
        return;
      }
      onCreated();
    } catch {
      setServerError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal title="Tugas Baru" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* Assigner — admin only, searchable */}
        {currentUser.role === 'admin' && (
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="nt-assigner-search">
              Pemberi Tugas
            </label>

            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] mb-2 cursor-pointer"
              style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}
              onClick={() => { setShowAssignerList(v => !v); setAssignerSearch(''); }}
            >
              <div className="w-6 h-6 rounded-full bg-[#4f46e5] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {selectedAssigner.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#4338ca] truncate">
                  {selectedAssigner.name}{selectedAssigner.id === currentUser.id ? ' (saya)' : ''}
                </p>
                <p className="text-[10px] text-[#7c7fd4] truncate">{selectedAssigner.divisi || selectedAssigner.email}</p>
              </div>
              <span className="text-[10px] font-medium text-[#6366f1] shrink-0">
                {showAssignerList ? 'Tutup' : 'Ganti'}
              </span>
            </div>

            {showAssignerList && (
              <>
                <div className="relative mb-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" width="12" height="12" viewBox="0 0 13 13" fill="none">
                    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M9.5 9.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <input
                    id="nt-assigner-search"
                    type="text"
                    value={assignerSearch}
                    onChange={e => setAssignerSearch(e.target.value)}
                    placeholder="Cari nama / divisi / email..."
                    className="w-full pl-8 pr-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
                    style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <div className="rounded-[6px] overflow-y-auto mb-1" style={{ border: '1px solid #e8e8e8', maxHeight: 200, background: '#faf9f7' }}>
                  {filteredAssigners.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-center text-[#a0a0a0]">Tidak ada user ditemukan</div>
                  ) : (
                    filteredAssigners.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setAssignedById(u.id);
                          setAssignedToId('');
                          setShowAssigneeList(false);
                          setShowAssignerList(false);
                          setAssignerSearch('');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#eef2ff] transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#e8e8e8] flex items-center justify-center text-[10px] font-semibold text-[#5c5c5c] shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0f0f0f] truncate">
                            {u.name}{u.id === currentUser.id ? ' (saya)' : ''}
                          </p>
                          <p className="text-[10px] text-[#a0a0a0] truncate">{u.divisi || u.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            <p className="mt-1 text-[10px] text-[#a0a0a0]">Tugas ini akan tercatat sebagai diberikan oleh orang yang dipilih.</p>
          </div>
        )}

        {/* Assign to — with search */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="nt-search">
            Assign ke <span className="text-[#ef4444]">*</span>
          </label>

          {/* Selected preview */}
          {selectedUser ? (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] mb-2 cursor-pointer"
              style={{ background: '#ede9fd', border: '1px solid #c4b5fd' }}
              onClick={() => { setShowAssigneeList(true); setSearch(''); }}
            >
              <div className="w-6 h-6 rounded-full bg-[#4f3ff0] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#4f3ff0] truncate">{selectedUser.name}</p>
                <p className="text-[10px] text-[#7c6fd4] truncate">{selectedUser.divisi || selectedUser.email}</p>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); setAssignedToId(''); setShowAssigneeList(false); }} className="text-[#a0a0a0] hover:text-[#ef4444] text-xs">×</button>
            </div>
          ) : (
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" width="12" height="12" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M9.5 9.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                id="nt-search"
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowAssigneeList(true); }}
                onFocus={() => setShowAssigneeList(true)}
                placeholder="Cari nama atau divisi..."
                className="w-full pl-8 pr-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
                style={{ border: `1px solid ${errors.assigned_to_id ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
                autoComplete="off"
              />
            </div>
          )}

          {/* Dropdown list */}
          {showAssigneeList && !selectedUser && (
            <div className="rounded-[6px] overflow-y-auto mb-1" style={{ border: '1px solid #e8e8e8', maxHeight: 200, background: '#faf9f7' }}>
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center text-[#a0a0a0]">Tidak ada user ditemukan</div>
              ) : (
                filtered.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setAssignedToId(u.id); setShowAssigneeList(false); setErrors(p => ({ ...p, assigned_to_id: undefined })); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#ede9fd] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#e8e8e8] flex items-center justify-center text-[10px] font-semibold text-[#5c5c5c] shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0f0f0f] truncate">{u.name}</p>
                      <p className="text-[10px] text-[#a0a0a0] truncate">{u.divisi || u.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
          {errors.assigned_to_id && <p className="text-xs text-[#ef4444]">{errors.assigned_to_id[0]}</p>}
          {otherUsers.length === 0 && <p className="text-xs text-[#a0a0a0]">Belum ada user lain terdaftar.</p>}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="nt-title">
            Judul Tugas <span className="text-[#ef4444]">*</span>
          </label>
          <input
            id="nt-title"
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: undefined })); }}
            placeholder="Apa yang perlu dikerjakan?"
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
            style={{ border: `1px solid ${errors.title ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
          />
          {errors.title && <p className="mt-1 text-xs text-[#ef4444]">{errors.title[0]}</p>}
        </div>

        {/* Project */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="nt-project">
            Project <span className="text-[#a0a0a0] font-normal">(opsional)</span>
          </label>
          <input
            id="nt-project"
            type="text"
            list="nt-project-list"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="Pilih project yang ada atau ketik nama baru..."
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
            style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
            autoComplete="off"
          />
          <datalist id="nt-project-list">
            {projects.map(p => <option key={p.id} value={p.name} />)}
          </datalist>
          <p className="mt-1 text-[10px] text-[#a0a0a0]">Project mengelompokkan beberapa tugas. Ketik nama baru untuk membuat project.</p>
        </div>

        {/* Brief */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="nt-brief">Brief</label>
          <textarea
            id="nt-brief"
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="Deskripsi, konteks, atau instruksi detail... (opsional)"
            rows={3}
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors resize-none"
            style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
          />
        </div>

        {/* Links */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]">
            Link Referensi <span className="text-[#a0a0a0] font-normal">(opsional)</span>
          </label>
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="url"
                  value={link}
                  onChange={e => updateLink(i, e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
                  style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
                />
                {links.length > 1 && (
                  <button type="button" onClick={() => removeLink(i)} className="text-[#a0a0a0] hover:text-[#ef4444] transition-colors px-1 text-lg leading-none">×</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLink} className="mt-1.5 text-xs text-[#4f3ff0] hover:underline">+ Tambah link</button>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]">
            Lampiran <span className="text-[#a0a0a0] font-normal">(opsional, maks. 4MB)</span>
          </label>
          <div
            className="rounded-[6px] border border-dashed border-[#e8e8e8] px-4 py-3 text-center cursor-pointer hover:border-[#4f3ff0] transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <span className="text-xs text-[#a0a0a0]">Mengupload...</span>
            ) : (
              <span className="text-xs text-[#5c5c5c]">Klik untuk pilih file atau gambar</span>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx" />
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

        {/* Deadline */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="nt-deadline">
            Deadline <span className="text-[#ef4444]">*</span>
          </label>
          <input
            id="nt-deadline"
            type="date"
            value={deadline}
            min={today}
            onChange={e => { setDeadline(e.target.value); if (errors.deadline) setErrors(p => ({ ...p, deadline: undefined })); }}
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
            style={{ border: `1px solid ${errors.deadline ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
          />
          {errors.deadline && <p className="mt-1 text-xs text-[#ef4444]">{errors.deadline[0]}</p>}
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="nt-note">
            Catatan <span className="text-[#a0a0a0] font-normal">(opsional)</span>
          </label>
          <textarea
            id="nt-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Catatan tambahan untuk penerima tugas..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors resize-none"
            style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
          />
        </div>

        {serverError && (
          <div className="px-3 py-2.5 rounded-[6px] text-xs text-[#ef4444]" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            {serverError}
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
            {loading ? 'Membuat...' : 'Buat Tugas'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
