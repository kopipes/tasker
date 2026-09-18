import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getCalendarEventById, updateCalendarEvent, deleteCalendarEvent, getUserById } from '@/lib/queries';
import type { User, CalendarEvent } from '@/lib/types';

function canManage(viewer: User, event: CalendarEvent): boolean {
  if (viewer.role === 'admin') return true;
  if (event.user_id === viewer.id) return true;
  if (event.created_by_id === viewer.id) return true;
  if (
    viewer.role === 'manager' &&
    event.visibility === 'division' &&
    viewer.divisi &&
    event.user?.divisi === viewer.divisi
  ) return true;
  return false;
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  note: z.string().max(2000).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  start_at: z.string().optional(),
  end_at: z.string().nullable().optional(),
  all_day: z.boolean().optional(),
  color: z.string().max(20).nullable().optional(),
  visibility: z.enum(['private', 'division', 'public', 'custom']).optional(),
  shared_user_ids: z.array(z.string()).max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const viewer = getUserById(userId);
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const event = getCalendarEventById(id);
  if (!event) return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });
  if (!canManage(viewer, event)) {
    return NextResponse.json({ error: 'Forbidden — tidak bisa mengubah jadwal ini' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

    const d = parsed.data;
    const fields: Parameters<typeof updateCalendarEvent>[1] = {};

    if (d.title !== undefined) fields.title = d.title;
    if (d.note !== undefined) fields.note = d.note;
    if (d.location !== undefined) fields.location = d.location;
    if (d.all_day !== undefined) fields.all_day = d.all_day;
    if (d.color !== undefined) fields.color = d.color;

    const effectiveVisibility = d.visibility ?? event.visibility;
    if (d.visibility === 'division' && !event.user?.divisi) {
      return NextResponse.json({ error: 'Divisi pemilik kosong — pilih "Semua" atau "Orang tertentu"' }, { status: 400 });
    }
    if (d.visibility !== undefined) fields.visibility = d.visibility;

    if (effectiveVisibility === 'custom') {
      const source = d.shared_user_ids ?? (event.shared_users ?? []).map(u => u.id);
      const shares = Array.from(new Set(source.filter(id => id !== event.user_id && !!getUserById(id))));
      if (shares.length === 0) {
        return NextResponse.json({ error: 'Pilih minimal satu orang untuk dibagikan' }, { status: 400 });
      }
      fields.shared_user_ids = shares;
    } else if (d.shared_user_ids !== undefined || d.visibility !== undefined) {
      fields.shared_user_ids = [];
    }

    const nextStart = d.start_at !== undefined ? new Date(d.start_at) : new Date(event.start_at);
    if (isNaN(nextStart.getTime())) return NextResponse.json({ error: 'Tanggal mulai tidak valid' }, { status: 400 });

    const nextEndRaw = d.end_at !== undefined ? d.end_at : event.end_at;
    const nextEnd = nextEndRaw ? new Date(nextEndRaw) : null;
    if (nextEnd && isNaN(nextEnd.getTime())) return NextResponse.json({ error: 'Tanggal selesai tidak valid' }, { status: 400 });
    if (nextEnd && nextEnd.getTime() < nextStart.getTime()) {
      return NextResponse.json({ error: 'Waktu selesai harus setelah mulai' }, { status: 400 });
    }

    if (d.start_at !== undefined) fields.start_at = nextStart.toISOString();
    if (d.end_at !== undefined) fields.end_at = nextEnd ? nextEnd.toISOString() : null;

    const updated = updateCalendarEvent(id, fields);
    return NextResponse.json({ event: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal mengubah jadwal';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('tasker_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const viewer = getUserById(userId);
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const event = getCalendarEventById(id);
  if (!event) return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });
  if (!canManage(viewer, event)) {
    return NextResponse.json({ error: 'Forbidden — tidak bisa menghapus jadwal ini' }, { status: 403 });
  }

  try {
    deleteCalendarEvent(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal menghapus jadwal';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
