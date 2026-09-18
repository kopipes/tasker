# Rencana Fitur: Kalender & Jadwal Pribadi

## 1. Tujuan

Memberi setiap user sebuah kalender pribadi untuk menaruh jadwal/agenda, lengkap
dengan catatan (note) per jadwal. Fitur ini berdiri sendiri di samping modul tugas
yang sudah ada, tetapi nantinya bisa menampilkan deadline tugas sebagai overlay.

## 2. Ruang Lingkup

### Termasuk (Fase 1)
- Kalender bulanan (month view) berisi jadwal milik user yang login.
- CRUD jadwal: judul, tanggal, jam mulai/selesai, all-day, catatan (note), lokasi opsional.
- Navigasi bulan (prev/next/Hari ini) dan pemilihan tanggal.
- Agenda harian (daftar jadwal pada tanggal terpilih).
- Halaman baru `/calendar` + link navigasi dari dashboard.

### Di luar lingkup versi pertama
- Undangan/peserta (multi-user event), RSVP.
- Sinkronisasi Google Calendar / iCal.
- Reminder email/push (PRD menyatakan notifikasi email bukan goal).
- Drag-and-drop memindahkan jadwal.

## 3. Model Data

Tabel baru `calendar_events` (SQLite, ditambahkan di `initSchema` dengan
`CREATE TABLE IF NOT EXISTS`, sehingga aman untuk DB yang sudah ada):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | TEXT PK | uuid v4 |
| `user_id` | TEXT NOT NULL REFERENCES users(id) | pemilik jadwal |
| `title` | TEXT NOT NULL | judul jadwal |
| `note` | TEXT | catatan bebas |
| `location` | TEXT | opsional |
| `start_at` | TEXT NOT NULL | ISO 8601 (UTC) |
| `end_at` | TEXT | ISO 8601, opsional |
| `all_day` | INTEGER NOT NULL DEFAULT 0 | 0/1 |
| `color` | TEXT | opsional, untuk penanda kategori |
| `visibility` | TEXT NOT NULL DEFAULT 'private' | `private` \| `division` |
| `created_at` | TEXT NOT NULL | ISO |
| `updated_at` | TEXT NOT NULL | ISO |

Index: `idx_calendar_user ON calendar_events(user_id, start_at)`.

Query baru di `lib/queries.ts` (mengikuti gaya fungsi yang sudah ada):
`getCalendarEvents`, `getCalendarEventById`, `createCalendarEvent`,
`updateCalendarEvent`, `deleteCalendarEvent`. Semua mutasi memakai
`db.transaction` bila menyentuh lebih dari satu statement.

## 4. API Routes

Mengikuti pola route yang ada (cek cookie `tasker_user_id`, validasi `zod`,
`NextResponse.json`):

| Method | Route | Fungsi |
|---|---|---|
| GET | `/api/calendar?from=&to=` | Daftar jadwal dalam rentang tanggal (default: milik sendiri) |
| POST | `/api/calendar` | Buat jadwal |
| PATCH | `/api/calendar/[id]` | Edit jadwal (hanya pemilik, admin boleh semua) |
| DELETE | `/api/calendar/[id]` | Hapus jadwal (hanya pemilik, admin boleh semua) |

Aturan akses:
- User biasa: hanya jadwal miliknya.
- Manager: jadwal sendiri + jadwal `visibility = 'division'` milik anggota divisinya.
- Admin: semua jadwal.

Validasi: `title` wajib, `start_at` wajib format tanggal valid, `end_at >= start_at`
bila diisi, `note` bebas (maks. panjang wajar, mis. 2000 karakter).

## 5. UI / Komponen

Halaman `/calendar` (App Router, client component seperti halaman lain):

- **Header** konsisten dengan dashboard (tombol kembali ke Dashboard, nama user,
  tombol Tugas Baru tidak perlu).
- **Toolbar kalender**: `‹ Bulan Tahun ›`, tombol "Hari ini", toggle
  "Bulan / Agenda".
- **Grid bulan** (Senin–Minggu): tiap sel menampilkan tanggal + hingga 2–3 judul
  jadwal; klik sel = pilih tanggal; klik jadwal = buka detail.
- **Panel agenda** di samping/bawah: daftar jadwal tanggal terpilih, menampilkan
  jam, judul, cuplikan note.
- **Modal buat/edit jadwal**: judul, all-day toggle, tanggal, jam mulai/selesai,
  lokasi, catatan (textarea), warna/kategori opsional.
- **Confirm hapus** memakai pola modal konfirmasi yang sudah dipakai di
  halaman Kelola Pengguna.

Komponen baru (reuse `Modal.tsx` dan `Toast.tsx` yang ada):
- `components/CalendarMonthGrid.tsx`
- `components/EventModal.tsx` (create + edit)
- `components/EventDetailModal.tsx` (lihat note lengkap + tombol edit/hapus)

Helper tanggal kecil di `lib/date.ts` (format Indonesia, awal/akhir bulan,
range minggu). Tidak menambah dependency baru — pakai `Date` bawaan, karena
proyek belum memakai library tanggal.

Navigasi: tambah tombol "Kalender" di header dashboard, dan quick link
"Kalender" di Dashboard Admin.

## 6. Integrasi dengan Tugas (Fase 2, opsional)

- Tampilkan `deadline` tugas milik user sebagai event read-only di kalender
  (warna berbeda, ikon khusus, klik mengarah ke `/tasks/[id]`).
- Ini membutuhkan endpoint gabungan atau merge di sisi client dari `/api/me`
  + `/api/calendar`, dan penanda agar tidak bisa di-edit dari kalender.

## 7. Fase Pengerjaan

1. **DB + queries** — tabel `calendar_events`, index, fungsi query.
2. **API** — 4 route + validasi zod + aturan akses.
3. **UI inti** — halaman `/calendar`, grid bulan, CRUD modal, agenda.
4. **Navigasi** — link dari dashboard & admin dashboard.
5. **Polish** — skeleton loading, empty state, responsif mobile, toast.
6. **Fase 2** — overlay deadline tugas, tampilan minggu, warna kategori.

## 8. Risiko & Catatan Teknis

- **Timezone**: simpan ISO UTC, render dengan locale `id-ID` (WIB). Perlu
  konsisten agar jadwal 00:00 tidak bergeser hari.
- **All-day vs jam**: event all-day tidak boleh menampilkan jam.
- **Pagination**: agenda/range query sudah dibatasi `from`–`to`, jadi tidak
  perlu pagination terpisah pada Fase 1.
- **Akses file/route**: karena belum ada middleware, pengecekan tetap di
  dalam handler API (konsisten dengan modul yang ada).

## 9. Keputusan yang Dibutuhkan

1. Visibilitas default jadwal: **private** saja, atau boleh dibagikan ke divisi?
2. Apakah jadwal boleh dibuat untuk orang lain oleh admin/manager?
3. Apakah deadline tugas perlu langsung tampil di kalender (Fase 2 dimasukkan
   sekarang)?
4. Tampilan default: **bulan** atau **agenda**?
5. Perlu reminder in-app (badge) atau cukup kalender pasif?
