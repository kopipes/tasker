# PRD: Tasker
**Aplikasi tracking assignment tugas internal**

Versi dokumen: 1.0
Status: Draft untuk review

---

## 1. Latar Belakang

Saat ini pemberian tugas antar tim/individu tersebar di chat, spreadsheet, atau verbal — tidak ada satu tempat yang mencatat siapa mengerjakan apa, kapan deadline-nya, dan bagaimana histori revisinya. Akibatnya sulit melacak progress, mudah lupa siapa yang berutang hasil ke siapa, dan tidak ada jejak yang jelas ketika ada revisi berulang.

**Tasker** dibuat sebagai alat internal super-simpel untuk mencatat assignment kerja: siapa memberi tugas, siapa mengerjakan, apa briefnya, kapan deadline-nya, dan histori lengkap prosesnya (mulai, submit, revisi, selesai) — tanpa proses input yang berbelit.

## 2. Tujuan Produk

- Satu tempat untuk melihat semua tugas yang sedang berjalan, baik yang diterima maupun yang diberikan ke orang lain.
- Proses assign dan update status tugas cukup dengan beberapa klik, minim ketik.
- Histori tiap tugas tercatat otomatis dan lengkap: kapan mulai, kapan submit, apa revisinya, kapan revisi diminta, kapan selesai — semua dengan timestamp.
- Setiap perubahan pada detail tugas (judul/brief/deadline) maupun hasil kerja tersimpan sebagai versi (v1, v2, dst.) supaya jelas apa yang berubah dari waktu ke waktu.

### 2.1 Non-Goals (di luar cakupan versi ini)

- Tidak ada hierarki approval berjenjang atau role admin kompleks. Semua user setara — siapa pun bisa jadi pemberi maupun penerima tugas.
- Tidak ada notifikasi email/push di MVP. Cukup dashboard sebagai sumber informasi.
- Tidak ada penyimpanan file besar (>4MB) langsung di sistem — untuk file besar, pengguna diarahkan memakai link (Drive, dsb).
- Tidak ada aplikasi mobile native. Cukup web responsif.
- Tidak ada sistem autentikasi penuh (password, SSO) di MVP — login cukup dengan nama, email, dan divisi sebagai identitas.

## 3. Target Pengguna

Karyawan internal lintas divisi yang saling memberi dan menerima tugas kerja sehari-hari (misalnya: tim kreatif, marketing, operasional). Tidak ada perbedaan hak akses antar peran — setiap user bisa menjadi pemberi tugas maupun penerima tugas, tergantung konteks.

## 4. Ringkasan Alur Pengguna

1. User login dengan nama, email, divisi (email jadi identitas unik; login ulang dengan email yang sama akan dikenali sebagai user yang sama).
2. Landing page adalah **dashboard**, berisi tiga kelompok: tugas yang sedang dikerjakan user, tugas yang perlu direview user, dan tugas yang di-assign user ke orang lain.
3. User bisa membuat tugas baru dalam satu form singkat: assign ke siapa, judul, brief, deadline.
4. Penerima tugas menjalankan tugas lewat dua tombol utama: **Mulai Kerjakan** dan **Serahkan Hasil** (dengan link, file/gambar, dan catatan opsional).
5. Pemberi tugas mereview hasil: **Setujui & Selesai** atau **Minta Revisi** (wajib mengisi catatan revisi).
6. Setiap aksi tercatat otomatis di histori tugas dengan timestamp, termasuk penomoran versi untuk edit detail tugas dan untuk tiap putaran submission/revisi.

## 5. Functional Requirements

### 5.1 Autentikasi & Profil Pengguna

| ID | Requirement |
|----|-------------|
| FR-1.1 | User login dengan mengisi nama, email, dan divisi. |
| FR-1.2 | Jika email sudah pernah dipakai, sistem mengenali sebagai user yang sama dan memperbarui nama/divisi jika berubah. |
| FR-1.3 | Sesi login persisten di browser sampai user logout. |
| FR-1.4 | User bisa logout kapan saja dari header. |

### 5.2 Dashboard

| ID | Requirement |
|----|-------------|
| FR-2.1 | Dashboard menampilkan 3 kelompok tugas: "Sedang Kamu Kerjakan" (assigned_to = user, status ≠ selesai), "Menunggu Review Kamu" (assigned_by = user, status = review), "Tugas yang Kamu Assign" (assigned_by = user, status aktif lainnya). |
| FR-2.2 | Tiap tugas ditampilkan sebagai kartu ringkas: judul, lawan bicara (assignee/assigner), deadline, status, indikator progress. |
| FR-2.3 | Tugas dengan deadline ≤ 2 hari atau sudah lewat diberi penanda visual berbeda (warna urgensi). |
| FR-2.4 | Klik kartu tugas membuka halaman detail tugas. |

### 5.3 Membuat Tugas

| ID | Requirement |
|----|-------------|
| FR-3.1 | Form tugas baru hanya berisi 4 field: assign ke (dropdown user terdaftar), judul, brief (teks bebas), deadline (date picker). |
| FR-3.2 | Assigned_by otomatis diisi dari user yang sedang login, tidak perlu input manual. |
| FR-3.3 | Setelah dibuat, status awal tugas adalah `belum_mulai` dan tercatat event "Ditugaskan" di histori. |
| FR-3.4 | Tugas baru dimulai dengan edit_version = 1. |

### 5.4 Siklus Status Tugas

Status: `belum_mulai → dikerjakan → review → (selesai | revisi)`, dengan `revisi → dikerjakan` (siklus berulang sampai disetujui).

| ID | Requirement |
|----|-------------|
| FR-4.1 | Assignee menekan **Mulai Kerjakan** untuk memindahkan status `belum_mulai → dikerjakan`, tercatat timestamp mulai. |
| FR-4.2 | Assignee menekan **Serahkan Hasil** untuk memindahkan status ke `review`. Field yang bisa diisi: link (opsional), lampiran file/gambar (opsional, maks 4MB), catatan (opsional). Minimal salah satu dari link/lampiran harus diisi. |
| FR-4.3 | Assigner menekan **Setujui & Selesai** untuk memindahkan status ke `selesai`. |
| FR-4.4 | Assigner menekan **Minta Revisi** untuk memindahkan status ke `revisi`. Catatan revisi wajib diisi (tidak boleh kosong). |
| FR-4.5 | Setelah revisi diminta, assignee kembali menekan **Serahkan Hasil** untuk submission berikutnya, memindahkan status kembali ke `review`. |

### 5.5 Versi Detail Tugas (Edit)

| ID | Requirement |
|----|-------------|
| FR-5.1 | Assigner bisa mengedit judul, brief, dan deadline tugas selama status belum `selesai`. |
| FR-5.2 | Setiap penyimpanan edit menaikkan `edit_version` sebanyak 1 (v1 → v2 → v3, dst). |
| FR-5.3 | Histori mencatat event "Detail tugas diedit" dengan versi asal dan versi baru, serta field mana saja yang berubah (nilai lama vs nilai baru). |
| FR-5.4 | Jika tidak ada field yang berubah, penyimpanan edit ditolak (tombol nonaktif). |

### 5.6 Versi Submission & Revisi

| ID | Requirement |
|----|-------------|
| FR-6.1 | Setiap kali assignee submit hasil, submission diberi nomor versi berurutan (v1, v2, v3, dst.) dihitung dari jumlah submission sebelumnya pada tugas tersebut. |
| FR-6.2 | Event "Revisi diminta" mencatat merujuk ke versi submission mana yang direvisi (misalnya "Revisi diminta untuk v1"). |
| FR-6.3 | Event "Disetujui & selesai" mencatat versi submission mana yang disetujui. |
| FR-6.4 | Semua histori submission (link/file/catatan) tersimpan permanen per versi — versi lama tidak ditimpa oleh versi baru. |

### 5.7 Histori / Audit Trail

| ID | Requirement |
|----|-------------|
| FR-7.1 | Setiap tugas punya log kronologis semua event: ditugaskan, diedit, mulai, submit, revisi diminta, disetujui. |
| FR-7.2 | Tiap event mencatat: tipe event, waktu (timestamp lengkap), dan siapa pelakunya. |
| FR-7.3 | Event tidak bisa dihapus atau diedit oleh user (append-only log). |
| FR-7.4 | Histori ditampilkan sebagai timeline vertikal kronologis di halaman detail tugas. |

## 6. Non-Functional Requirements

| Aspek | Requirement |
|-------|-------------|
| Simplicity | Setiap form maksimal 4-5 field. Setiap aksi utama (mulai, submit, approve, revisi) adalah 1 klik + minimal input. |
| Performa | Dashboard dan detail tugas harus load < 1 detik untuk skala penggunaan internal (ratusan user, ribuan tugas). |
| Penyimpanan file | Lampiran dibatasi 4MB per file untuk menjaga performa database tetap ringan. |
| Reliability | Setiap perubahan status tersimpan sebagai transaksi tunggal (tidak ada state tugas yang tersimpan sebagian). |
| Portabilitas | Database SQLite dalam satu file, mudah di-backup dan dipindahkan tanpa setup server database terpisah. |
| Aksesibilitas | Responsif dari desktop sampai mobile web; kontras warna dan ukuran tap-target memadai. |

## 7. Data Model (SQLite)

SQLite dipilih karena ringan (satu file `.db`, tanpa server database terpisah), cukup untuk skala penggunaan internal, dan gampang di-backup. Catatan penting: **lampiran file/gambar disimpan sebagai file di disk (atau object storage seperti S3 kalau nanti perlu multi-server), bukan sebagai BLOB di dalam SQLite** — supaya file `.db` tetap ringan dan performa query tidak terganggu oleh data biner besar. Tabel `attachments` hanya menyimpan path/URL menuju file tersebut.

### 7.1 Tabel `users`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | TEXT (PK, UUID) | |
| name | TEXT NOT NULL | |
| email | TEXT NOT NULL UNIQUE | Identitas login |
| divisi | TEXT NOT NULL | |
| created_at | TEXT (ISO datetime) | |

### 7.2 Tabel `tasks`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | TEXT (PK, UUID) | |
| title | TEXT NOT NULL | |
| brief | TEXT | |
| deadline | TEXT (ISO date) | |
| assigned_to_id | TEXT NOT NULL, FK -> users.id | |
| assigned_by_id | TEXT NOT NULL, FK -> users.id | |
| status | TEXT NOT NULL | enum: `belum_mulai`, `dikerjakan`, `review`, `revisi`, `selesai` |
| edit_version | INTEGER NOT NULL DEFAULT 1 | Naik tiap kali title/brief/deadline diedit |
| created_at | TEXT (ISO datetime) | |
| updated_at | TEXT (ISO datetime) | |

Index yang disarankan: `idx_tasks_assigned_to (assigned_to_id, status)`, `idx_tasks_assigned_by (assigned_by_id, status)`.

### 7.3 Tabel `task_events`

Tabel append-only untuk seluruh histori/audit trail — satu baris per event.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | TEXT (PK, UUID) | |
| task_id | TEXT NOT NULL, FK -> tasks.id | |
| type | TEXT NOT NULL | enum: `assigned`, `edited`, `start`, `submit`, `revision_request`, `approved` |
| at | TEXT (ISO datetime) NOT NULL | |
| by_user_id | TEXT NOT NULL, FK -> users.id | |
| note | TEXT | Diisi untuk `submit` (catatan opsional) dan `revision_request` (wajib) |
| link | TEXT | Diisi untuk `submit`, opsional |
| submission_version | INTEGER | Diisi untuk `submit`, `revision_request`, `approved` — menandai submission ke berapa |
| from_edit_version | INTEGER | Diisi untuk `edited` |
| to_edit_version | INTEGER | Diisi untuk `edited` |
| changes_json | TEXT | Diisi untuk `edited` — JSON berisi field yang berubah beserta nilai lama/baru |

Index yang disarankan: `idx_events_task (task_id, at)`.

### 7.4 Tabel `attachments`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | TEXT (PK, UUID) | |
| task_event_id | TEXT NOT NULL, FK -> task_events.id | |
| kind | TEXT NOT NULL | enum: `image`, `file` |
| filename | TEXT NOT NULL | |
| mime_type | TEXT | |
| size_bytes | INTEGER | |
| storage_path | TEXT NOT NULL | Path/URL ke file di disk atau object storage |

### 7.5 Diagram Relasi (ringkas)

```
users (1) ----< tasks (assigned_to_id, assigned_by_id)
tasks (1) ----< task_events
task_events (1) ----< attachments
```

## 8. Rancangan API (REST, ringkas)

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | /auth/login | Login/registrasi dengan nama, email, divisi |
| GET | /me/dashboard | Ambil 3 kelompok tugas untuk user yang login |
| POST | /tasks | Buat tugas baru |
| GET | /tasks/:id | Detail tugas + histori lengkap |
| PATCH | /tasks/:id | Edit judul/brief/deadline (menaikkan edit_version) |
| POST | /tasks/:id/start | Assignee mulai kerjakan |
| POST | /tasks/:id/submit | Assignee submit hasil (link/file/catatan) |
| POST | /tasks/:id/approve | Assigner setujui & selesai |
| POST | /tasks/:id/request-revision | Assigner minta revisi (note wajib) |
| POST | /attachments/upload | Upload file, kembalikan storage_path (validasi ukuran maks 4MB di sini) |

Semua endpoint penulisan (`POST`/`PATCH`) menulis dulu ke `task_events` sebagai log, lalu meng-update kolom ringkas di `tasks` (status, edit_version) dalam satu transaksi database.

## 9. Aturan Bisnis Penting

- Status hanya bisa berpindah sesuai urutan siklus (lihat 5.4) — tidak ada lompat status di luar alur.
- Hanya assignee yang boleh menekan Mulai Kerjakan / Serahkan Hasil pada tugasnya sendiri.
- Hanya assigner yang boleh menekan Setujui / Minta Revisi / Edit Tugas pada tugas yang ia buat.
- Catatan revisi tidak boleh kosong.
- Submission harus punya minimal satu dari: link atau lampiran.
- Semua event historis bersifat permanen (tidak ada update/delete pada `task_events`).

## 10. Metrik Keberhasilan

- Jumlah user aktif mingguan (login & berinteraksi dengan minimal 1 tugas).
- Rata-rata waktu penyelesaian tugas (dari `assigned` sampai `approved`).
- Rata-rata jumlah revisi per tugas (indikator kualitas brief/hasil kerja).
- Persentase tugas selesai sebelum/tepat deadline.

## 11. Fase Berikutnya (di luar MVP)

- Notifikasi (email/in-app) saat di-assign, mendekati deadline, atau diminta revisi.
- Role/permission tambahan (misalnya lead divisi bisa melihat semua tugas divisinya).
- Migrasi lampiran besar (>4MB) ke object storage (S3-compatible) dengan upload langsung dari klien.
- Filter & pencarian tugas di dashboard (per divisi, per status, per rentang deadline).
- Migrasi database ke PostgreSQL bila jumlah pengguna/concurrent write sudah melampaui kapasitas nyaman SQLite (SQLite cukup untuk single-writer skala tim/departemen, namun mulai terbatas pada penulisan konkuren tinggi lintas banyak proses).

## 12. Asumsi & Pertanyaan Terbuka

- Diasumsikan skala pengguna adalah internal perusahaan (puluhan-ratusan orang), bukan publik — sehingga login sederhana tanpa password dianggap cukup untuk MVP.
- Perlu konfirmasi: apakah assignee juga perlu bisa mengedit brief/deadline, atau tetap dikunci hanya untuk assigner (asumsi saat ini: hanya assigner)?
- Perlu konfirmasi: apakah tugas yang sudah "Selesai" perlu bisa dibuka kembali (reopen) oleh assigner, atau status selesai bersifat final?
