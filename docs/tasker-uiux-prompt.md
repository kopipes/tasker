# Prompt: UI/UX Tasker

Gunakan prompt di bawah ini untuk diberikan ke tool AI coding/design (Claude Code, v0, Cursor, Figma AI, dsb) agar hasil desainnya konsisten dengan arah yang sudah kita tentukan.

---

## PROMPT (copy-paste dari sini)

Kamu adalah design engineer yang membangun UI/UX untuk **Tasker**, aplikasi internal untuk melacak assignment tugas antar karyawan (siapa mengerjakan apa, brief, deadline, dan histori revisi lengkap dengan versi).

### Prinsip Desain Utama

Bangun dengan 4 prinsip yang sama pentingnya, jangan korbankan satu demi yang lain:

1. **Modern & eye-candy, tapi fungsional** — visual harus terasa dirancang dengan sengaja (bukan template SaaS generik: hindari kartu rounded seragam dengan shadow abu-abu identik di mana-mana, hindari aksen warna terracotta/cream default, hindari label ALL-CAPS bertaburan). Setiap elemen visual harus punya alasan fungsional, bukan sekadar dekorasi.
2. **Fast loading** — perceived performance sama pentingnya dengan performance sungguhan. Setiap state harus terasa instan bagi user.
3. **Robust** — tahan terhadap kondisi data kosong, gagal simpan, koneksi lambat, atau input tak terduga. Tidak ada layar putih kosong atau UI yang "patah" saat data belum ada.
4. **UX yang sangat menarik** — interaksi terasa hidup dan memuaskan untuk dipakai berulang kali (karena ini dipakai setiap hari), tanpa jadi berlebihan atau mengganggu kecepatan kerja.

### Konteks Produk

Referensi konsep visual: metafora **tiket kerja / job docket** — bukan kartu SaaS generik. Setiap tugas terasa seperti "tiket" fisik: ada nomor tiket, ada perforasi/garis putus-putus, ada blok tanggal deadline yang menonjol (mirip tiket boarding pass), dan riwayat tugas terasa seperti jejak kertas (paper trail) yang bertambah dari waktu ke waktu.

Layar yang perlu dirancang:
- Login (nama, email, divisi — 3 field saja)
- Dashboard (3 kelompok: sedang dikerjakan, menunggu direview, yang di-assign ke orang lain)
- Detail tugas (meta info, brief, tombol aksi kontekstual sesuai status & peran, timeline riwayat)
- Modal: Tugas Baru, Serahkan Hasil (link/file/gambar/catatan), Minta Revisi, Edit Tugas

Alur status: `belum_mulai → dikerjakan → review → (selesai | revisi)`, dengan versi berjalan di dua level: versi detail tugas (v1, v2... saat diedit) dan versi submission (v1, v2... tiap kali revisi & submit ulang).

### Fast Loading — Checklist Wajib

- Skeleton loader untuk dashboard dan detail tugas saat data pertama kali dimuat — jangan pakai spinner polos di tengah layar kosong.
- Optimistic UI: saat user menekan tombol aksi (Mulai Kerjakan, Setujui, dsb), state berubah *seketika* di UI sambil request berjalan di belakang; rollback dengan pesan jelas kalau gagal.
- Lazy-load gambar lampiran (thumbnail dulu, baru full-size saat diklik).
- Code-splitting per halaman/modal — modal tidak perlu ikut ke bundle awal.
- Hindari re-render seluruh dashboard saat hanya satu tugas berubah status.
- Font-loading tidak boleh menyebabkan layout shift (pakai `font-display: swap` + reserve ukuran).

### Robust — Checklist Wajib

- Empty state untuk tiap kelompok dashboard yang kosong, dengan pesan yang mengarahkan aksi (bukan sekadar "tidak ada data").
- Validasi form inline, real-time, dengan pesan error yang menyebutkan apa yang salah dan bagaimana memperbaikinya (bukan "Error" generik).
- Batas ukuran file (maks 4MB) divalidasi sebelum upload dimulai, dengan alternatif yang jelas (pakai link) saat ditolak.
- Semua aksi destruktif atau tidak bisa dibatalkan (submit, approve, minta revisi) butuh state loading yang jelas agar tidak double-submit.
- Desain harus tetap utuh di kondisi: tidak ada tugas sama sekali, ada 1 tugas, ada 50+ tugas, brief sangat panjang, nama user sangat panjang, deadline sudah lewat jauh.

### UX yang Menarik — Checklist Wajib

- Satu momen animasi yang jadi "signature" — misalnya transisi status tugas (dari `dikerjakan` ke `review`) punya micro-interaction yang terasa memuaskan (progress dot berpindah, warna bertransisi halus). Jangan taburkan animasi di semua tempat; pilih satu momen yang paling sering dialami user dan buat itu terasa istimewa.
- Feedback visual instan untuk tiap aksi: toast/inline confirmation yang jelas ("Hasil diserahkan", "Revisi dikirim") memakai bahasa yang sama dengan nama tombolnya (aksi "Serahkan Hasil" → konfirmasi "Hasil diserahkan", bukan "Berhasil disimpan").
- Warna urgensi deadline (mendekati/lewat) harus terlihat jelas tanpa terasa alarmis berlebihan.
- Riwayat/timeline tugas harus enak dibaca sebagai "cerita" — urutan kronologis dengan garis penghubung, bukan sekadar list rata.
- Motion menghormati `prefers-reduced-motion`.

### Batasan Teknis

- Reponsif penuh dari mobile ke desktop; mayoritas pemakaian di layar sempit (banyak user akan buka lewat HP).
- Kontras warna dan ukuran tap-target harus accessible (WCAG AA minimum).
- Gunakan satu sistem warna & tipografi yang konsisten di semua layar dan modal — jangan ciptakan gaya baru tiap komponen.
- Sebelum membangun, buat dulu token desain singkat (warna, tipografi, layout) dan uji apakah itu terasa spesifik untuk produk tracking tugas ini — bukan default yang bisa dipakai untuk produk apa saja.

### Output yang Diharapkan

1. Ringkasan token desain (warna, tipografi, prinsip layout) sebelum mulai coding.
2. Implementasi tiap layar/modal di atas, lengkap dengan state: loading, empty, error, dan normal.
3. Catatan singkat di akhir: bagian mana yang paling "berani" secara visual, dan bagian mana yang sengaja dibuat tenang/quiet supaya yang berani tadi menonjol.

---

## Cara Pakai

- Kalau tool tujuan Anda (misalnya v0 atau Cursor) merespons lebih baik dalam bahasa Inggris, bilang saja — saya bisa terjemahkan prompt ini.
- Prompt ini dirancang untuk dipakai bersama file PRD (`tasker-prd.md`) dan prototype (`tasker.jsx`) yang sudah dibuat sebelumnya, supaya tool yang menerima prompt ini punya konteks data model dan alur yang sama.
