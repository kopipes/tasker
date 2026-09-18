export type TaskStatus = 'belum_mulai' | 'dikerjakan' | 'review' | 'revisi' | 'selesai';
export type EventType = 'assigned' | 'edited' | 'start' | 'submit' | 'revision_request' | 'approved' | 'archived';
export type AttachmentKind = 'image' | 'file';
export type UserRole = 'admin' | 'manager' | 'user';
export type EventVisibility = 'private' | 'division' | 'public' | 'custom';

export interface User {
  id: string;
  name: string;
  email: string;
  divisi: string;
  role: UserRole;
  created_at: string;
  // main + additional divisions (populated by getAllUsers)
  divisions?: UserDivision[];
}

export interface Division {
  id: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithTasks {
  project: Project | null;
  tasks: Task[];
}

export interface UserDivision {
  id: string;
  name: string;
  is_primary: boolean;
}

export interface Task {
  id: string;
  title: string;
  brief: string | null;
  deadline: string | null;
  assigned_to_id: string;
  assigned_by_id: string;
  status: TaskStatus;
  edit_version: number;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  project_id?: string | null;
  // joined
  assigned_to?: User;
  assigned_by?: User;
  project?: Project | null;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  type: EventType;
  at: string;
  by_user_id: string;
  note: string | null;
  link: string | null;
  submission_version: number | null;
  from_edit_version: number | null;
  to_edit_version: number | null;
  changes_json: string | null;
  // joined
  by_user?: User;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  task_event_id: string;
  kind: AttachmentKind;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
}

export interface DashboardData {
  sedang_dikerjakan: Task[];
  menunggu_review: Task[];
  tugas_di_assign: Task[];
  tugas_selesai: Task[];
  // manager/admin only
  semua_tugas_divisi?: Task[];
  // tasks grouped by project
  projects?: ProjectWithTasks[];
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  all_day: number;
  color: string | null;
  visibility: EventVisibility;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  // joined
  user?: User;
  // only for visibility = 'custom'
  shared_users?: User[];
}

export interface CalendarData {
  events: CalendarEvent[];
  tasks: Task[];
}

export type CalendarItem =
  | { kind: 'event'; dateKey: string; sortAt: string; event: CalendarEvent }
  | { kind: 'task'; dateKey: string; sortAt: string; task: Task };
