import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';
import type { User, Task, TaskEvent, Attachment, TaskStatus, DashboardData, UserRole, CalendarEvent, EventVisibility, Division, UserDivision, Project, ProjectWithTasks } from './types';

// ── Divisions ──────────────────────────────────────────────────────────────

export function getAllDivisions(): (Division & { user_count: number })[] {
  return getDb().prepare(`
    SELECT d.id, d.name, d.created_at,
      (SELECT COUNT(*) FROM user_divisions ud WHERE ud.division_id = d.id) AS user_count
    FROM divisions d
    ORDER BY d.name ASC
  `).all() as (Division & { user_count: number })[];
}

export function getDivisionById(id: string): Division | undefined {
  return getDb().prepare('SELECT id, name, created_at FROM divisions WHERE id = ?').get(id) as Division | undefined;
}

export function getDivisionByName(name: string): Division | undefined {
  return getDb().prepare('SELECT id, name, created_at FROM divisions WHERE name = ?').get(name) as Division | undefined;
}

export function createDivision(name: string): Division {
  const db = getDb();
  const clean = name.trim();
  if (!clean) throw new Error('Nama divisi wajib diisi');
  if (getDivisionByName(clean)) throw new Error('Divisi sudah ada');
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO divisions (id, name, created_at) VALUES (?, ?, ?)').run(id, clean, now);
  return { id, name: clean, created_at: now };
}

export function renameDivision(id: string, name: string): Division {
  const db = getDb();
  const clean = name.trim();
  if (!clean) throw new Error('Nama divisi wajib diisi');
  const current = getDivisionById(id);
  if (!current) throw new Error('Divisi tidak ditemukan');
  const clash = getDivisionByName(clean);
  if (clash && clash.id !== id) throw new Error('Nama divisi sudah dipakai');

  db.transaction(() => {
    db.prepare('UPDATE divisions SET name = ? WHERE id = ?').run(clean, id);
    // Keep denormalized users.divisi in sync for the primary division
    db.prepare(`
      UPDATE users SET divisi = ? WHERE id IN (
        SELECT user_id FROM user_divisions WHERE division_id = ? AND is_primary = 1
      )
    `).run(clean, id);
  })();
  return getDivisionById(id)!;
}

export function deleteDivision(id: string): void {
  const db = getDb();
  const used = (db.prepare('SELECT COUNT(*) AS c FROM user_divisions WHERE division_id = ?').get(id) as { c: number }).c;
  if (used > 0) throw new Error('Divisi masih dipakai pengguna, tidak bisa dihapus');
  db.prepare('DELETE FROM divisions WHERE id = ?').run(id);
}

export function getUserDivisions(userId: string): UserDivision[] {
  return getDb().prepare(`
    SELECT d.id, d.name, ud.is_primary
    FROM user_divisions ud
    JOIN divisions d ON d.id = ud.division_id
    WHERE ud.user_id = ?
    ORDER BY ud.is_primary DESC, d.name ASC
  `).all(userId).map((r) => {
    const row = r as { id: string; name: string; is_primary: number };
    return { id: row.id, name: row.name, is_primary: row.is_primary === 1 };
  });
}

export function getUserDivisionNames(userId: string): string[] {
  const names = getDb().prepare(`
    SELECT d.name FROM user_divisions ud
    JOIN divisions d ON d.id = ud.division_id
    WHERE ud.user_id = ?
    ORDER BY ud.is_primary DESC, d.name ASC
  `).all(userId).map(r => (r as { name: string }).name);
  if (names.length > 0) return names;
  const user = getUserById(userId);
  return user && user.divisi ? [user.divisi] : [];
}

function resolveOrCreateDivision(name: string): Division | undefined {
  const clean = name.trim();
  if (!clean) return undefined;
  return getDivisionByName(clean) ?? createDivision(clean);
}

export function setUserDivisions(userId: string, primaryName: string | null | undefined, additionalNames: string[]): void {
  const db = getDb();
  const primary = primaryName ? resolveOrCreateDivision(primaryName) : undefined;
  const additional = additionalNames
    .map(n => n.trim())
    .filter(n => n && (!primary || n !== primary.name))
    .map(n => resolveOrCreateDivision(n))
    .filter((d): d is Division => !!d);

  db.transaction(() => {
    db.prepare('DELETE FROM user_divisions WHERE user_id = ?').run(userId);
    const link = db.prepare('INSERT OR IGNORE INTO user_divisions (user_id, division_id, is_primary) VALUES (?, ?, ?)');
    if (primary) link.run(userId, primary.id, 1);
    for (const d of additional) link.run(userId, d.id, 0);
    db.prepare('UPDATE users SET divisi = ? WHERE id = ?').run(primary ? primary.name : '', userId);
  })();
}

// ── Projects ───────────────────────────────────────────────────────────────

export function getAllProjects(): Project[] {
  return getDb().prepare('SELECT id, name, description, created_by_id, created_at, updated_at FROM projects ORDER BY name ASC').all() as Project[];
}

export function getProjectById(id: string): Project | undefined {
  return getDb().prepare('SELECT id, name, description, created_by_id, created_at, updated_at FROM projects WHERE id = ?').get(id) as Project | undefined;
}

export function getProjectByName(name: string): Project | undefined {
  return getDb().prepare('SELECT id, name, description, created_by_id, created_at, updated_at FROM projects WHERE name = ? COLLATE NOCASE').get(name.trim()) as Project | undefined;
}

export function createProject(name: string, createdById: string, description?: string | null): Project {
  const db = getDb();
  const clean = name.trim();
  if (!clean) throw new Error('Nama project wajib diisi');
  const existing = getProjectByName(clean);
  if (existing) return existing;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO projects (id, name, description, created_by_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, clean, description ?? null, createdById, now, now);
  return getProjectById(id)!;
}

export function findOrCreateProject(name: string, createdById: string): Project {
  return getProjectByName(name) ?? createProject(name, createdById);
}

export function getAllProjectsWithCounts(): (Project & { task_count: number })[] {
  return getDb().prepare(`
    SELECT p.id, p.name, p.description, p.created_by_id, p.created_at, p.updated_at,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count
    FROM projects p
    ORDER BY p.name ASC
  `).all() as (Project & { task_count: number })[];
}

export function countProjectTasks(projectId: string): number {
  return (getDb().prepare('SELECT COUNT(*) AS c FROM tasks WHERE project_id = ?').get(projectId) as { c: number }).c;
}

export function deleteProject(projectId: string): void {
  const count = countProjectTasks(projectId);
  if (count > 0) {
    throw new Error(`Project masih berisi ${count} tugas. Pindahkan atau hapus tugas tersebut terlebih dahulu.`);
  }
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(projectId);
}

function attachProjects(tasks: Task[]): Task[] {
  const db = getDb();
  const cache = new Map<string, Project | null>();
  return tasks.map(t => {
    const pid = t.project_id;
    if (!pid) return { ...t, project: null };
    if (!cache.has(pid)) {
      cache.set(pid, (db.prepare('SELECT id, name, description, created_by_id, created_at, updated_at FROM projects WHERE id = ?').get(pid) as Project | undefined) ?? null);
    }
    return { ...t, project: cache.get(pid) ?? null };
  });
}

// ── Users ──────────────────────────────────────────────────────────────────

export function getUserById(id: string): User | undefined {
  return getDb().prepare('SELECT id, name, email, divisi, role, created_at FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByEmail(email: string): (User & { password_hash: string }) | undefined {
  return getDb().prepare('SELECT id, name, email, divisi, role, password_hash, created_at FROM users WHERE email = ?').get(email) as (User & { password_hash: string }) | undefined;
}

export function getAllUsers(): User[] {
  const users = getDb().prepare('SELECT id, name, email, divisi, role, created_at FROM users ORDER BY name ASC').all() as User[];
  return users.map(u => ({ ...u, divisions: getUserDivisions(u.id) }));
}

export function updateUserProfile(id: string, data: { name?: string; divisi?: string; password_hash?: string; email?: string }): User {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.divisi !== undefined) { sets.push('divisi = ?'); vals.push(data.divisi); }
  if (data.password_hash !== undefined) { sets.push('password_hash = ?'); vals.push(data.password_hash); }
  if (data.email !== undefined) { sets.push('email = ?'); vals.push(data.email); }
  if (sets.length === 0) throw new Error('No changes');
  vals.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return getUserById(id)!;
}

export function createUser(name: string, email: string, divisi: string, role: UserRole, password_hash: string, additionalDivisions: string[] = []): User {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new Error('Email sudah digunakan');
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users (id, name, email, divisi, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, name, email, divisi, role, password_hash, now);
  setUserDivisions(id, divisi, additionalDivisions);
  return getUserById(id)!;
}

export function deleteUser(id: string): void {
  const db = getDb();
  db.transaction(() => {
    // Reassign or nullify? We soft-delete by removing the user row.
    // Tasks referencing this user will remain but user joins will fail — so we delete their tasks too.
    const taskIds = (db.prepare('SELECT id FROM tasks WHERE assigned_to_id = ? OR assigned_by_id = ?').all(id, id) as { id: string }[]).map(r => r.id);
    for (const tid of taskIds) {
      db.prepare('DELETE FROM attachments WHERE task_event_id IN (SELECT id FROM task_events WHERE task_id = ?)').run(tid);
      db.prepare('DELETE FROM task_events WHERE task_id = ?').run(tid);
    }
    db.prepare('DELETE FROM tasks WHERE assigned_to_id = ? OR assigned_by_id = ?').run(id, id);
    db.prepare('DELETE FROM user_divisions WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM calendar_event_shares WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM calendar_events WHERE user_id = ? OR created_by_id = ?').run(id, id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  })();
}

export function upsertUserWithPassword(name: string, email: string, divisi: string, role: UserRole, password_hash: string): User {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  const now = new Date().toISOString();
  if (existing) {
    db.prepare('UPDATE users SET name = ?, divisi = ?, role = ?, password_hash = ? WHERE id = ?').run(name, divisi, role, password_hash, existing.id);
    return getUserById(existing.id)!;
  }
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, name, email, divisi, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, name, email, divisi, role, password_hash, now);
  return getUserById(id)!;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export function getDashboard(userId: string): DashboardData {
  const db = getDb();

  const withUsers = `
    t.*,
    at.id as at_id, at.name as at_name, at.email as at_email, at.divisi as at_divisi, at.role as at_role, at.created_at as at_created_at,
    ab.id as ab_id, ab.name as ab_name, ab.email as ab_email, ab.divisi as ab_divisi, ab.role as ab_role, ab.created_at as ab_created_at
    FROM tasks t
    JOIN users at ON t.assigned_to_id = at.id
    JOIN users ab ON t.assigned_by_id = ab.id
  `;

  const mapRow = (row: Record<string, unknown>): Task => ({
    id: row.id as string,
    title: row.title as string,
    brief: row.brief as string | null,
    deadline: row.deadline as string | null,
    assigned_to_id: row.assigned_to_id as string,
    assigned_by_id: row.assigned_by_id as string,
    status: row.status as TaskStatus,
    edit_version: row.edit_version as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    project_id: (row.project_id ?? null) as string | null,
    assigned_to: { id: row.at_id as string, name: row.at_name as string, email: row.at_email as string, divisi: row.at_divisi as string, role: (row.at_role ?? 'user') as User['role'], created_at: row.at_created_at as string },
    assigned_by: { id: row.ab_id as string, name: row.ab_name as string, email: row.ab_email as string, divisi: row.ab_divisi as string, role: (row.ab_role ?? 'user') as User['role'], created_at: row.ab_created_at as string },
  });

  const user = getUserById(userId);

  const sedang_dikerjakan = (db.prepare(`SELECT ${withUsers} WHERE t.assigned_to_id = ? AND t.status NOT IN ('selesai') AND t.archived_at IS NULL`).all(userId) as Record<string, unknown>[]).map(mapRow);
  const menunggu_review = (db.prepare(`SELECT ${withUsers} WHERE t.assigned_by_id = ? AND t.status = 'review' AND t.archived_at IS NULL`).all(userId) as Record<string, unknown>[]).map(mapRow);
  const tugas_di_assign = (db.prepare(`SELECT ${withUsers} WHERE t.assigned_by_id = ? AND t.status NOT IN ('selesai', 'review') AND t.archived_at IS NULL`).all(userId) as Record<string, unknown>[]).map(mapRow);
  const tugas_selesai = (db.prepare(`SELECT ${withUsers} WHERE (t.assigned_to_id = ? OR t.assigned_by_id = ?) AND t.status = 'selesai' AND t.archived_at IS NULL ORDER BY t.updated_at DESC`).all(userId, userId) as Record<string, unknown>[]).map(mapRow);

  // Manager/admin: also show all tasks in their division(s) (excluding own tasks already shown)
  let semua_tugas_divisi: Task[] | undefined;
  const divisionNames = getUserDivisionNames(userId);
  if (user && (user.role === 'manager' || user.role === 'admin') && divisionNames.length > 0) {
    const ph = divisionNames.map(() => '?').join(', ');
    semua_tugas_divisi = (db.prepare(`
      SELECT ${withUsers}
      WHERE (at.divisi IN (${ph}) OR ab.divisi IN (${ph})) AND t.archived_at IS NULL
      AND t.assigned_to_id != ? AND t.assigned_by_id != ?
      ORDER BY t.updated_at DESC
    `).all(...divisionNames, ...divisionNames, userId, userId) as Record<string, unknown>[]).map(mapRow);
  }

  const result = {
    sedang_dikerjakan: attachProjects(sedang_dikerjakan),
    menunggu_review: attachProjects(menunggu_review),
    tugas_di_assign: attachProjects(tugas_di_assign),
    tugas_selesai: attachProjects(tugas_selesai),
    semua_tugas_divisi: semua_tugas_divisi ? attachProjects(semua_tugas_divisi) : undefined,
  };

  // Group the user's own tasks by project for the dashboard "Projects" section
  const seen = new Map<string, Task>();
  for (const list of [result.sedang_dikerjakan, result.menunggu_review, result.tugas_di_assign, result.tugas_selesai]) {
    for (const t of list) seen.set(t.id, t);
  }
  const groups = new Map<string, { project: Project | null; tasks: Task[] }>();
  for (const t of seen.values()) {
    const key = t.project?.id ?? '__none__';
    if (!groups.has(key)) groups.set(key, { project: t.project ?? null, tasks: [] });
    groups.get(key)!.tasks.push(t);
  }
  const projects: ProjectWithTasks[] = Array.from(groups.values()).sort((a, b) => {
    if (!a.project) return 1;
    if (!b.project) return -1;
    return a.project.name.localeCompare(b.project.name);
  });

  return { ...result, projects };
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export function getTaskById(id: string): Task | undefined {
  const db = getDb();
  const row = db.prepare(`
    SELECT t.*,
      at.id as at_id, at.name as at_name, at.email as at_email, at.divisi as at_divisi, at.role as at_role, at.created_at as at_created_at,
      ab.id as ab_id, ab.name as ab_name, ab.email as ab_email, ab.divisi as ab_divisi, ab.role as ab_role, ab.created_at as ab_created_at
    FROM tasks t
    JOIN users at ON t.assigned_to_id = at.id
    JOIN users ab ON t.assigned_by_id = ab.id
    WHERE t.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return attachProjects([{
    id: row.id as string,
    title: row.title as string,
    brief: row.brief as string | null,
    deadline: row.deadline as string | null,
    assigned_to_id: row.assigned_to_id as string,
    assigned_by_id: row.assigned_by_id as string,
    status: row.status as TaskStatus,
    edit_version: row.edit_version as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    project_id: (row.project_id ?? null) as string | null,
    assigned_to: { id: row.at_id as string, name: row.at_name as string, email: row.at_email as string, divisi: row.at_divisi as string, role: (row.at_role ?? 'user') as User['role'], created_at: row.at_created_at as string },
    assigned_by: { id: row.ab_id as string, name: row.ab_name as string, email: row.ab_email as string, divisi: row.ab_divisi as string, role: (row.ab_role ?? 'user') as User['role'], created_at: row.ab_created_at as string },
  }])[0];
}

export function getTaskEvents(taskId: string): TaskEvent[] {
  const db = getDb();
  const events = db.prepare(`
    SELECT e.*, u.id as u_id, u.name as u_name, u.email as u_email, u.divisi as u_divisi, u.role as u_role, u.created_at as u_created_at
    FROM task_events e
    JOIN users u ON e.by_user_id = u.id
    WHERE e.task_id = ?
    ORDER BY e.at ASC
  `).all(taskId) as Record<string, unknown>[];

  return events.map(row => {
    const attachments = db.prepare('SELECT * FROM attachments WHERE task_event_id = ?').all(row.id as string) as Attachment[];
    return {
      id: row.id as string,
      task_id: row.task_id as string,
      type: row.type as TaskEvent['type'],
      at: row.at as string,
      by_user_id: row.by_user_id as string,
      note: row.note as string | null,
      link: row.link as string | null,
      submission_version: row.submission_version as number | null,
      from_edit_version: row.from_edit_version as number | null,
      to_edit_version: row.to_edit_version as number | null,
      changes_json: row.changes_json as string | null,
      by_user: { id: row.u_id as string, name: row.u_name as string, email: row.u_email as string, divisi: row.u_divisi as string, role: (row.u_role ?? 'user') as User['role'], created_at: row.u_created_at as string },
      attachments,
    };
  });
}

export interface AttachmentInput {
  id: string;
  filename: string;
  kind: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
}

function insertAttachments(db: ReturnType<typeof getDb>, eventId: string, attachments: AttachmentInput[]) {
  for (const att of attachments) {
    db.prepare(`
      INSERT INTO attachments (id, task_event_id, kind, filename, mime_type, size_bytes, storage_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(att.id, eventId, att.kind, att.filename, att.mime_type, att.size_bytes, att.storage_path);
  }
}

export function createTask(data: {
  title: string;
  brief: string;
  note?: string;
  deadline: string;
  assigned_to_id: string;
  assigned_by_id: string;
  project_id?: string | null;
  links?: string[];
  attachments?: AttachmentInput[];
}): Task {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO tasks (id, title, brief, deadline, assigned_to_id, assigned_by_id, status, edit_version, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'belum_mulai', 1, ?, ?, ?)
    `).run(id, data.title, data.brief, data.deadline, data.assigned_to_id, data.assigned_by_id, data.project_id ?? null, now, now);

    const eventId = uuidv4();
    const linkJson = data.links && data.links.length > 0 ? JSON.stringify(data.links) : null;
    db.prepare(`
      INSERT INTO task_events (id, task_id, type, at, by_user_id, note, link)
      VALUES (?, ?, 'assigned', ?, ?, ?, ?)
    `).run(eventId, id, now, data.assigned_by_id, data.note ?? null, linkJson);

    if (data.attachments?.length) {
      insertAttachments(db, eventId, data.attachments);
    }
  });
  tx();

  return getTaskById(id)!;
}

export function editTask(taskId: string, userId: string, fields: { title?: string; brief?: string; deadline?: string; project_id?: string | null }): Task {
  const db = getDb();
  const task = getTaskById(taskId);
  if (!task) throw new Error('Task not found');

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (fields.title !== undefined && fields.title !== task.title) changes.title = { from: task.title, to: fields.title };
  if (fields.brief !== undefined && fields.brief !== task.brief) changes.brief = { from: task.brief, to: fields.brief };
  if (fields.deadline !== undefined && fields.deadline !== task.deadline) changes.deadline = { from: task.deadline, to: fields.deadline };
  if (fields.project_id !== undefined && (fields.project_id ?? null) !== (task.project_id ?? null)) {
    changes.project = {
      from: task.project?.name ?? null,
      to: fields.project_id ? (getProjectById(fields.project_id)?.name ?? null) : null,
    };
  }

  if (Object.keys(changes).length === 0) throw new Error('No changes');

  const newVersion = task.edit_version + 1;
  const now = new Date().toISOString();

  const update = db.transaction(() => {
    const setClauses: string[] = ['edit_version = ?', 'updated_at = ?'];
    const vals: unknown[] = [newVersion, now];
    if (fields.title !== undefined) { setClauses.push('title = ?'); vals.push(fields.title); }
    if (fields.brief !== undefined) { setClauses.push('brief = ?'); vals.push(fields.brief); }
    if (fields.deadline !== undefined) { setClauses.push('deadline = ?'); vals.push(fields.deadline); }
    if (fields.project_id !== undefined) { setClauses.push('project_id = ?'); vals.push(fields.project_id); }
    vals.push(taskId);
    db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...vals);

    const eventId = uuidv4();
    db.prepare(`
      INSERT INTO task_events (id, task_id, type, at, by_user_id, from_edit_version, to_edit_version, changes_json)
      VALUES (?, ?, 'edited', ?, ?, ?, ?, ?)
    `).run(eventId, taskId, now, userId, task.edit_version, newVersion, JSON.stringify(changes));
  });
  update();

  return getTaskById(taskId)!;
}

export function startTask(taskId: string, userId: string): Task {
  const db = getDb();
  const task = getTaskById(taskId);
  if (!task) throw new Error('Task not found');
  if (task.status !== 'belum_mulai') throw new Error('Invalid status transition');

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(`UPDATE tasks SET status = 'dikerjakan', updated_at = ? WHERE id = ?`).run(now, taskId);
    db.prepare(`INSERT INTO task_events (id, task_id, type, at, by_user_id) VALUES (?, ?, 'start', ?, ?)`).run(uuidv4(), taskId, now, userId);
  });
  tx();
  return getTaskById(taskId)!;
}

export function submitTask(taskId: string, userId: string, data: { link?: string; note?: string; attachments?: AttachmentInput[] }): Task {
  const db = getDb();
  const task = getTaskById(taskId);
  if (!task) throw new Error('Task not found');
  if (!['dikerjakan', 'revisi'].includes(task.status)) throw new Error('Invalid status transition');

  const subVersion = (db.prepare(`SELECT COUNT(*) as cnt FROM task_events WHERE task_id = ? AND type = 'submit'`).get(taskId) as { cnt: number }).cnt + 1;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`UPDATE tasks SET status = 'review', updated_at = ? WHERE id = ?`).run(now, taskId);
    const eventId = uuidv4();
    db.prepare(`
      INSERT INTO task_events (id, task_id, type, at, by_user_id, note, link, submission_version)
      VALUES (?, ?, 'submit', ?, ?, ?, ?, ?)
    `).run(eventId, taskId, now, userId, data.note ?? null, data.link ?? null, subVersion);

    if (data.attachments?.length) {
      insertAttachments(db, eventId, data.attachments);
    }
  });
  tx();
  return getTaskById(taskId)!;
}

export function approveTask(taskId: string, userId: string): Task {
  const db = getDb();
  const task = getTaskById(taskId);
  if (!task) throw new Error('Task not found');
  if (task.status !== 'review') throw new Error('Invalid status transition');

  const subVersion = (db.prepare(`SELECT COUNT(*) as cnt FROM task_events WHERE task_id = ? AND type = 'submit'`).get(taskId) as { cnt: number }).cnt;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`UPDATE tasks SET status = 'selesai', updated_at = ? WHERE id = ?`).run(now, taskId);
    db.prepare(`
      INSERT INTO task_events (id, task_id, type, at, by_user_id, submission_version)
      VALUES (?, ?, 'approved', ?, ?, ?)
    `).run(uuidv4(), taskId, now, userId, subVersion);
  });
  tx();
  return getTaskById(taskId)!;
}

export function deleteTask(taskId: string): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM attachments WHERE task_event_id IN (SELECT id FROM task_events WHERE task_id = ?)').run(taskId);
    db.prepare('DELETE FROM task_events WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  })();
}

export function archiveTask(taskId: string, userId: string): Task {
  const db = getDb();
  const task = getTaskById(taskId);
  if (!task) throw new Error('Task not found');
  if (task.status !== 'selesai') throw new Error('Hanya tugas selesai yang bisa diarsipkan');

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(`UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?`).run(now, now, taskId);
    db.prepare(`INSERT INTO task_events (id, task_id, type, at, by_user_id) VALUES (?, ?, 'archived', ?, ?)`).run(uuidv4(), taskId, now, userId);
  });
  tx();
  return getTaskById(taskId)!;
}

export function getArchivedTasks(filters?: { search?: string; from?: string; to?: string; page?: number; pageSize?: number }): { tasks: Task[]; total: number } {
  const db = getDb();
  const withUsers = `
    t.*,
    at.id as at_id, at.name as at_name, at.email as at_email, at.divisi as at_divisi, at.role as at_role, at.created_at as at_created_at,
    ab.id as ab_id, ab.name as ab_name, ab.email as ab_email, ab.divisi as ab_divisi, ab.role as ab_role, ab.created_at as ab_created_at
    FROM tasks t
    JOIN users at ON t.assigned_to_id = at.id
    JOIN users ab ON t.assigned_by_id = ab.id
  `;

  const conditions: string[] = ['t.archived_at IS NOT NULL'];
  const vals: unknown[] = [];

  if (filters?.search) {
    conditions.push(`(t.title LIKE ? OR at.name LIKE ? OR ab.name LIKE ?)`);
    const s = `%${filters.search}%`;
    vals.push(s, s, s);
  }
  if (filters?.from) { conditions.push(`t.archived_at >= ?`); vals.push(filters.from); }
  if (filters?.to) { conditions.push(`t.archived_at <= ?`); vals.push(filters.to + 'T23:59:59.999Z'); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as c FROM tasks t JOIN users at ON t.assigned_to_id = at.id JOIN users ab ON t.assigned_by_id = ab.id ${where}`).get(...vals) as { c: number }).c;

  const pageSize = filters?.pageSize ?? 20;
  const page = filters?.page ?? 1;
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(`SELECT ${withUsers} ${where} ORDER BY t.archived_at DESC LIMIT ? OFFSET ?`).all(...vals, pageSize, offset) as Record<string, unknown>[];

  const tasks = attachProjects(rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    brief: row.brief as string | null,
    deadline: row.deadline as string | null,
    assigned_to_id: row.assigned_to_id as string,
    assigned_by_id: row.assigned_by_id as string,
    status: row.status as TaskStatus,
    edit_version: row.edit_version as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    archived_at: row.archived_at as string,
    project_id: (row.project_id ?? null) as string | null,
    assigned_to: { id: row.at_id as string, name: row.at_name as string, email: row.at_email as string, divisi: row.at_divisi as string, role: (row.at_role ?? 'user') as User['role'], created_at: row.at_created_at as string },
    assigned_by: { id: row.ab_id as string, name: row.ab_name as string, email: row.ab_email as string, divisi: row.ab_divisi as string, role: (row.ab_role ?? 'user') as User['role'], created_at: row.ab_created_at as string },
  })));

  return { tasks, total };
}

export function getAdminStats() {
  const db = getDb();
  const now = new Date().toISOString();

  const totalActive = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE archived_at IS NULL AND status != 'selesai'`).get() as { c: number }).c;
  const totalArchived = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE archived_at IS NOT NULL`).get() as { c: number }).c;
  const totalSelesai = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status = 'selesai' AND archived_at IS NULL`).get() as { c: number }).c;
  const totalOverdue = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE archived_at IS NULL AND status NOT IN ('selesai') AND deadline < ?`).get(now) as { c: number }).c;
  const totalReview = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE archived_at IS NULL AND status = 'review'`).get() as { c: number }).c;
  const totalRevisi = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE archived_at IS NULL AND status = 'revisi'`).get() as { c: number }).c;
  const totalBelumMulai = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE archived_at IS NULL AND status = 'belum_mulai'`).get() as { c: number }).c;
  const totalDikerjakan = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE archived_at IS NULL AND status = 'dikerjakan'`).get() as { c: number }).c;
  const totalUsers = (db.prepare(`SELECT COUNT(*) as c FROM users`).get() as { c: number }).c;

  // Tasks completed in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const completedLast30 = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status = 'selesai' AND updated_at >= ?`).get(thirtyDaysAgo) as { c: number }).c;

  // Per-user workload (active tasks)
  const perUser = db.prepare(`
    SELECT u.id, u.name, u.divisi,
      COUNT(t.id) as active_tasks
    FROM users u
    LEFT JOIN tasks t ON t.assigned_to_id = u.id AND t.archived_at IS NULL AND t.status NOT IN ('selesai')
    GROUP BY u.id
    ORDER BY active_tasks DESC
    LIMIT 10
  `).all() as { id: string; name: string; divisi: string; active_tasks: number }[];

  return {
    totalActive,
    totalArchived,
    totalSelesai,
    totalOverdue,
    totalReview,
    totalRevisi,
    totalBelumMulai,
    totalDikerjakan,
    totalUsers,
    completedLast30,
    perUser,
  };
}

export function requestRevision(taskId: string, userId: string, note: string): Task {
  const db = getDb();
  const task = getTaskById(taskId);
  if (!task) throw new Error('Task not found');
  if (task.status !== 'review') throw new Error('Invalid status transition');

  const subVersion = (db.prepare(`SELECT COUNT(*) as cnt FROM task_events WHERE task_id = ? AND type = 'submit'`).get(taskId) as { cnt: number }).cnt;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`UPDATE tasks SET status = 'revisi', updated_at = ? WHERE id = ?`).run(now, taskId);
    db.prepare(`
      INSERT INTO task_events (id, task_id, type, at, by_user_id, note, submission_version)
      VALUES (?, ?, 'revision_request', ?, ?, ?, ?)
    `).run(uuidv4(), taskId, now, userId, note, subVersion);
  });
  tx();
  return getTaskById(taskId)!;
}

// ── Calendar ────────────────────────────────────────────────────────────────

function mapCalendarEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    note: row.note as string | null,
    location: row.location as string | null,
    start_at: row.start_at as string,
    end_at: row.end_at as string | null,
    all_day: row.all_day as number,
    color: row.color as string | null,
    visibility: (row.visibility ?? 'private') as EventVisibility,
    created_by_id: row.created_by_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user: {
      id: row.u_id as string,
      name: row.u_name as string,
      email: row.u_email as string,
      divisi: row.u_divisi as string,
      role: (row.u_role ?? 'user') as UserRole,
      created_at: row.u_created_at as string,
    },
    shared_users: [],
  };
}

function getEventShares(eventId: string): User[] {
  return getDb().prepare(`
    SELECT u.id, u.name, u.email, u.divisi, u.role, u.created_at
    FROM calendar_event_shares s
    JOIN users u ON s.user_id = u.id
    WHERE s.event_id = ?
    ORDER BY u.name ASC
  `).all(eventId) as User[];
}

function withShares(event: CalendarEvent): CalendarEvent {
  return { ...event, shared_users: getEventShares(event.id) };
}

const CALENDAR_SELECT = `
  e.*,
  u.id as u_id, u.name as u_name, u.email as u_email, u.divisi as u_divisi, u.role as u_role, u.created_at as u_created_at
  FROM calendar_events e
  JOIN users u ON e.user_id = u.id
`;

export function getCalendarEvents(viewerId: string, from: string, to: string): CalendarEvent[] {
  const db = getDb();
  const viewer = getUserById(viewerId);
  if (!viewer) return [];

  if (viewer.role === 'admin') {
    const rows = db.prepare(`SELECT ${CALENDAR_SELECT} WHERE e.start_at >= ? AND e.start_at <= ? ORDER BY e.start_at ASC`).all(from, to) as Record<string, unknown>[];
    return rows.map(mapCalendarEvent).map(withShares);
  }

  const divisionNames = getUserDivisionNames(viewerId);
  const ph = divisionNames.length > 0 ? divisionNames.map(() => '?').join(', ') : "''";
  const rows = db.prepare(`
    SELECT ${CALENDAR_SELECT}
    WHERE e.start_at >= ? AND e.start_at <= ?
      AND (
        e.user_id = ?
        OR e.visibility = 'public'
        OR (e.visibility = 'division' AND u.divisi != '' AND u.divisi IN (${ph}))
        OR (e.visibility = 'custom' AND e.id IN (SELECT event_id FROM calendar_event_shares WHERE user_id = ?))
      )
    ORDER BY e.start_at ASC
  `).all(from, to, viewerId, ...divisionNames, viewerId) as Record<string, unknown>[];
  return rows.map(mapCalendarEvent).map(withShares);
}

export function getCalendarEventById(id: string): CalendarEvent | undefined {
  const db = getDb();
  const row = db.prepare(`SELECT ${CALENDAR_SELECT} WHERE e.id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? withShares(mapCalendarEvent(row)) : undefined;
}

export function createCalendarEvent(data: {
  user_id: string;
  title: string;
  note?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
  color?: string | null;
  visibility?: EventVisibility;
  shared_user_ids?: string[];
  created_by_id: string;
}): CalendarEvent {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO calendar_events
        (id, user_id, title, note, location, start_at, end_at, all_day, color, visibility, created_by_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.user_id,
      data.title,
      data.note ?? null,
      data.location ?? null,
      data.start_at,
      data.end_at ?? null,
      data.all_day ? 1 : 0,
      data.color ?? null,
      data.visibility ?? 'private',
      data.created_by_id,
      now,
      now,
    );
    if (data.visibility === 'custom' && data.shared_user_ids?.length) {
      const stmt = db.prepare('INSERT OR IGNORE INTO calendar_event_shares (event_id, user_id) VALUES (?, ?)');
      for (const uid of data.shared_user_ids) stmt.run(id, uid);
    }
  })();
  return getCalendarEventById(id)!;
}

export function updateCalendarEvent(id: string, fields: {
  title?: string;
  note?: string | null;
  location?: string | null;
  start_at?: string;
  end_at?: string | null;
  all_day?: boolean;
  color?: string | null;
  visibility?: EventVisibility;
  shared_user_ids?: string[];
}): CalendarEvent {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (fields.title !== undefined) { sets.push('title = ?'); vals.push(fields.title); }
  if (fields.note !== undefined) { sets.push('note = ?'); vals.push(fields.note); }
  if (fields.location !== undefined) { sets.push('location = ?'); vals.push(fields.location); }
  if (fields.start_at !== undefined) { sets.push('start_at = ?'); vals.push(fields.start_at); }
  if (fields.end_at !== undefined) { sets.push('end_at = ?'); vals.push(fields.end_at); }
  if (fields.all_day !== undefined) { sets.push('all_day = ?'); vals.push(fields.all_day ? 1 : 0); }
  if (fields.color !== undefined) { sets.push('color = ?'); vals.push(fields.color); }
  if (fields.visibility !== undefined) { sets.push('visibility = ?'); vals.push(fields.visibility); }

  if (sets.length === 0 && fields.shared_user_ids === undefined) throw new Error('No changes');
  sets.push('updated_at = ?');
  vals.push(new Date().toISOString());

  const current = getCalendarEventById(id);
  const effectiveVisibility = fields.visibility ?? current?.visibility ?? 'private';

  db.transaction(() => {
    vals.push(id);
    db.prepare(`UPDATE calendar_events SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    if (fields.shared_user_ids !== undefined || fields.visibility !== undefined) {
      db.prepare('DELETE FROM calendar_event_shares WHERE event_id = ?').run(id);
      if (effectiveVisibility === 'custom' && (fields.shared_user_ids ?? []).length) {
        const stmt = db.prepare('INSERT OR IGNORE INTO calendar_event_shares (event_id, user_id) VALUES (?, ?)');
        for (const uid of fields.shared_user_ids ?? []) stmt.run(id, uid);
      }
    }
  })();

  return getCalendarEventById(id)!;
}

export function deleteCalendarEvent(id: string): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM calendar_event_shares WHERE event_id = ?').run(id);
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
  })();
}

export function getTasksForCalendar(viewerId: string, from: string, to: string): Task[] {
  const db = getDb();
  const viewer = getUserById(viewerId);
  if (!viewer) return [];

  const base = `
    SELECT t.*,
      at.id as at_id, at.name as at_name, at.email as at_email, at.divisi as at_divisi, at.role as at_role, at.created_at as at_created_at,
      ab.id as ab_id, ab.name as ab_name, ab.email as ab_email, ab.divisi as ab_divisi, ab.role as ab_role, ab.created_at as ab_created_at
    FROM tasks t
    JOIN users at ON t.assigned_to_id = at.id
    JOIN users ab ON t.assigned_by_id = ab.id
    WHERE t.archived_at IS NULL
      AND t.deadline IS NOT NULL
      AND t.deadline >= ? AND t.deadline <= ?
  `;

  const mapTask = (row: Record<string, unknown>): Task => ({
    id: row.id as string,
    title: row.title as string,
    brief: row.brief as string | null,
    deadline: row.deadline as string | null,
    assigned_to_id: row.assigned_to_id as string,
    assigned_by_id: row.assigned_by_id as string,
    status: row.status as TaskStatus,
    edit_version: row.edit_version as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    project_id: (row.project_id ?? null) as string | null,
    assigned_to: { id: row.at_id as string, name: row.at_name as string, email: row.at_email as string, divisi: row.at_divisi as string, role: (row.at_role ?? 'user') as UserRole, created_at: row.at_created_at as string },
    assigned_by: { id: row.ab_id as string, name: row.ab_name as string, email: row.ab_email as string, divisi: row.ab_divisi as string, role: (row.ab_role ?? 'user') as UserRole, created_at: row.ab_created_at as string },
  });

  let rows: Record<string, unknown>[];
  if (viewer.role === 'admin') {
    rows = db.prepare(`${base} ORDER BY t.deadline ASC`).all(from, to) as Record<string, unknown>[];
  } else if (viewer.role === 'manager') {
    const divisionNames = getUserDivisionNames(viewerId);
    if (divisionNames.length > 0) {
      const ph = divisionNames.map(() => '?').join(', ');
      rows = db.prepare(`${base} AND (at.divisi IN (${ph}) OR ab.divisi IN (${ph})) ORDER BY t.deadline ASC`).all(from, to, ...divisionNames, ...divisionNames) as Record<string, unknown>[];
    } else {
      rows = db.prepare(`${base} AND (t.assigned_to_id = ? OR t.assigned_by_id = ?) ORDER BY t.deadline ASC`).all(from, to, viewerId, viewerId) as Record<string, unknown>[];
    }
  } else {
    rows = db.prepare(`${base} AND (t.assigned_to_id = ? OR t.assigned_by_id = ?) ORDER BY t.deadline ASC`).all(from, to, viewerId, viewerId) as Record<string, unknown>[];
  }

  return rows.map(mapTask);
}
