'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { Task } from '@/lib/types';

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onEdited: () => void;
}

export function EditTaskModal({ task, onClose, onEdited }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [brief, setBrief] = useState(task.brief ?? '');
  const [deadline, setDeadline] = useState(task.deadline ?? '');
  const [projectName, setProjectName] = useState(task.project?.name ?? '');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {});
  }, []);

  const hasChanges =
    title !== task.title ||
    brief !== (task.brief ?? '') ||
    deadline !== (task.deadline ?? '') ||
    projectName !== (task.project?.name ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChanges) return;
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, brief, deadline, project_name: projectName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.error === 'object') setErrors(data.error);
        else setServerError(data.error || 'Gagal menyimpan perubahan');
        return;
      }
      onEdited();
    } catch {
      setServerError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={`Edit Tugas · v${task.edit_version}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="et-title">Judul Tugas</label>
          <input
            id="et-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
            style={{ border: `1px solid ${errors.title ? '#ef4444' : '#e8e8e8'}`, background: '#faf9f7' }}
          />
          {errors.title && <p className="mt-1 text-xs text-[#ef4444]">{errors.title[0]}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="et-project">Project</label>
          <input
            id="et-project"
            type="text"
            list="et-project-list"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="Kosongkan untuk tanpa project"
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
            style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
            autoComplete="off"
          />
          <datalist id="et-project-list">
            {projects.map(p => <option key={p.id} value={p.name} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="et-brief">Brief</label>
          <textarea
            id="et-brief"
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors resize-none"
            style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[#2a2a2a]" htmlFor="et-deadline">Deadline</label>
          <input
            id="et-deadline"
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-[6px] outline-none transition-colors"
            style={{ border: '1px solid #e8e8e8', background: '#faf9f7' }}
          />
        </div>
        {serverError && (
          <div className="px-3 py-2.5 rounded-[6px] text-xs text-[#ef4444]" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            {serverError}
          </div>
        )}
        {!hasChanges && (
          <p className="text-xs text-[#a0a0a0]">Belum ada perubahan.</p>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-[6px]" style={{ border: '1px solid #e8e8e8', color: '#5c5c5c' }}>Batal</button>
          <button
            type="submit"
            disabled={loading || !hasChanges}
            className="flex-1 py-2.5 text-sm font-semibold rounded-[6px] transition-all active:scale-95"
            style={{
              background: !hasChanges || loading ? '#e8e8e8' : 'var(--color-brand)',
              color: !hasChanges || loading ? '#a0a0a0' : 'white',
              cursor: !hasChanges || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
