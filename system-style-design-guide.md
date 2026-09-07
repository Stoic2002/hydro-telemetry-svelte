# System Style & Design Guide

Panduan visual untuk dashboard telemetering PLTA. Dokumen ini menjelaskan token,
tipografi, spacing, dan aturan komponen yang berlaku di `src/`.

Bahasa visualnya diturunkan dari [`docs/design-system.md`](docs/design-system.md)
— dokumen rujukan yang berasal dari `app.uniswap.org`. Yang di bawah ini adalah
**penerapannya di project ini**, termasuk tempat-tempat yang sengaja menyimpang.

Sumber kebenarannya tetap kode: token didefinisikan di
[`src/routes/layout.css`](src/routes/layout.css), komponen reusable ada di
`src/components/`. Kalau dokumen ini berbeda dengan kode, kodenya yang benar dan
dokumen ini yang harus diperbarui.

---

## 1. Prinsip

1. **Hierarki lewat tingkat terang permukaan, bukan bayangan.** Kartu naik
   selangkah dari latar dengan `surface-raised` + garis rambut. Bayangan hanya
   untuk yang benar-benar melayang: dropdown, toast, dialog.
2. **Garis rambut yang nyaris tak terlihat.** Border 1px berkontras rendah. Ia
   memisahkan, bukan menggambar kotak.
3. **Radius besar.** 12px untuk apa pun yang diklik atau diketik, 20px untuk apa
   pun yang menampung. Ini ciri paling kentara dari bahasa visualnya.
4. **Satu aksen saja.** Cyan memegang seluruh perhatian: tombol primer, ring
   fokus, tautan. Kalau ada dua hal aksen di satu layar, salah satunya salah.
5. **Antarmuka operasional, bukan halaman marketing.** Kepadatan informasi
   diutamakan. Tidak ada hiasan yang tidak membawa informasi.
6. **Bahasa non-teknis.** Layar operasional tidak menampilkan istilah
   implementasi. Tulis "realtime", bukan "WebSocket".

---

## 2. Penyimpangan yang disengaja dari `docs/design-system.md`

Catat, supaya tidak "dikembalikan" oleh orang berikutnya yang membandingkan
dengan dokumen rujukan:

| Rujukan                                   | Di sini        | Alasan                                                                                                                                                                                                       |
| ----------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aksen magenta `#e0009b`                   | Cyan `#0891b2` | `zone-hulu` juga cyan dan peta bendungan sudah memakai pasangan hulu/dam/hilir; magenta akan berebut perhatian dengan penanda zona dan `status-danger` di layar yang sama                                    |
| Tema terang **dan** gelap                 | Terang saja    | Layar dipakai di ruang kontrol dengan pencahayaan tetap. Menambah tema gelap berarti mengukur ulang seluruh warna zona, seri grafik, dan ubin radar peta                                                     |
| "Memuat = teks `Memuat…`, tanpa skeleton" | **Campuran**   | Dokumen rujukan ditulis untuk aplikasi dengan daftar pendek. Layar ini memuat tabel telemetri, grafik 24 jam, dan peta yang butuh waktu — teks di tengah layar kosong membuat layout melompat saat data tiba |
| Abu sekunder `#7d7d7d`                    | `#6e6e6e`      | 4,12 : 1 di atas putih — terlalu tipis untuk teks kecil yang dipakai di puluhan tempat                                                                                                                       |

**Aturan memuat yang berlaku:** skeleton untuk **peta, grafik, dan tabel**; teks
`Memuat…` (kelas `.loading-text`) untuk **form, dialog, dan panel kecil**. Tombol
yang sedang bekerja **mengganti labelnya** (`Menyimpan…`, `Mengunggah…`) dan
dinonaktifkan — tidak ada spinner.

---

## 3. Token warna

Semua token didefinisikan dalam blok `@theme` dan otomatis tersedia sebagai
utility Tailwind (`bg-surface-base`, `text-text-muted`, `border-border-subtle`).

### Permukaan

| Token             | Nilai     | Dipakai untuk                                       |
| ----------------- | --------- | --------------------------------------------------- |
| `surface-base`    | `#f9f9f9` | Latar halaman                                       |
| `surface-raised`  | `#ffffff` | Kartu, tabel, panel, dialog                         |
| `surface-overlay` | `#f1f1f1` | Header tabel, isian netral, chip, segmented control |

### Garis

| Token           | Nilai     | Dipakai untuk                     |
| --------------- | --------- | --------------------------------- |
| `border-subtle` | `#e8e8e8` | Batas kartu, tabel, pemisah baris |
| `border-strong` | `#c7c7c7` | Batas hover, area drop file       |

### Teks

| Token              | Nilai     | Kontras di atas putih | Dipakai untuk                           |
| ------------------ | --------- | --------------------- | --------------------------------------- |
| `text-primary`     | `#131313` | 18,10 : 1             | Judul, nilai metrik                     |
| `text-strong`      | `#2c2c2c` | 13,60 : 1             | Teks isi tegas                          |
| `text-secondary`   | `#454545` | 9,17 : 1              | Teks isi, label form                    |
| `text-subtle`      | `#5d5d5d` | 6,58 : 1              | Teks sekunder                           |
| `text-muted`       | `#6e6e6e` | 5,10 : 1              | Keterangan, satuan, header tabel        |
| `text-placeholder` | `#9b9b9b` | 2,90 : 1              | **Hanya placeholder input**             |
| `disabled`         | `#c7c7c7` | —                     | Teks, latar, dan jalur kontrol nonaktif |

`text-placeholder` tidak lolos WCAG AA untuk teks biasa. Jangan memakainya untuk
teks yang harus dibaca — `text-muted` adalah warna teks paling redup yang boleh.

### Permukaan gelap

Tooltip grafik dan peredam di belakang overlay memakai pasangan token sendiri.
Ini bukan sekadar kerapian: `text-muted` yang lolos kontras di atas putih justru
**gagal** di atas permukaan gelap.

| Token                   | Nilai                 | Dipakai untuk                        |
| ----------------------- | --------------------- | ------------------------------------ |
| `surface-inverse`       | `#131313`             | Latar tooltip                        |
| `border-inverse`        | `#2e2e2e`             | Batas tooltip                        |
| `text-on-inverse`       | `#cfcfcf`             | Teks di atas permukaan gelap         |
| `text-on-inverse-muted` | `#9b9b9b`             | Keterangan di atas permukaan gelap   |
| `scrim`                 | `rgb(19 19 19 / 32%)` | Peredam di belakang dialog dan sheet |

### Aksen

| Token                   | Nilai     | Dipakai untuk                            |
| ----------------------- | --------- | ---------------------------------------- |
| `brand-primary`         | `#22d3ee` | Aksen terang, indikator, pita grafik     |
| `brand-primary-strong`  | `#0891b2` | Tombol primer, tautan, ring fokus        |
| `brand-primary-pressed` | `#0e7490` | Keadaan ditekan, teks aksen di atas tint |
| `brand-tint`            | `#ecfeff` | Latar blok bertona aksen                 |
| `brand-tint-border`     | `#a5f3fc` | Batas blok bertona aksen                 |

### Status

Setiap status punya `-soft` untuk **latar** dan `-strong` untuk **teks dan ikon**
di atasnya. Jangan dibalik.

| Token                              | Nilai                 | Arti                         |
| ---------------------------------- | --------------------- | ---------------------------- |
| `status-success-soft` / `-strong`  | `#e6f7ef` / `#087a45` | Normal, tervalidasi, selesai |
| `status-warning-soft` / `-strong`  | `#fdf1e3` / `#b4530a` | Perlu perhatian              |
| `status-danger-soft` / `-strong`   | `#fdecea` / `#c9251a` | Kritis, gagal, aksi merusak  |
| `status-info-soft` / `status-info` | `#f1edfc` / `#6941c6` | Netral-informatif            |

Token `status-success`, `status-warning`, dan `status-danger` (tanpa akhiran)
adalah warna isian terang yang masih dipakai peta dan penanda titik.

### Zona hidrologi

Warna tetap per zona, dipakai peta bendungan dan penanda sumber data.

| Token        | Nilai     | Zona      |
| ------------ | --------- | --------- |
| `zone-hulu`  | `#22d3ee` | Hulu      |
| `zone-dam`   | `#f59e0b` | Bendungan |
| `zone-hilir` | `#34d399` | Hilir     |

### Grafik

| Token                   | Nilai                                                            | Dipakai untuk                      |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `chart-series-1` … `-6` | `#0891b2`, `#2563eb`, `#7c3aed`, `#0e7490`, `#d97706`, `#059669` | Warna seri sesuai urutan parameter |
| `chart-grid`            | `#e8e8e8`                                                        | Garis bantu                        |
| `chart-axis`            | `#6e6e6e`                                                        | Label sumbu, garis aktual          |
| `chart-reference`       | `#9b9b9b`                                                        | Garis rata-rata                    |

LayerChart menerima nilai CSS, jadi warnanya dirujuk sebagai
`var(--color-chart-series-1)` atau lewat kelas Tailwind `stroke-chart-series-1`.

---

## 4. Tipografi

Satu family untuk seluruh antarmuka: **Manrope**, wajib varian _variable_
(`wght@400..800`). Skala bobotnya digeser naik — "normal" adalah **485**, bukan 400. Bobot ganjil itu yang membuat teks terasa sedikit lebih hadir tanpa terlihat
tebal; dengan bobot statis, 485 dibulatkan ke 500 dan efeknya hilang.

`font-mono` (JetBrains Mono) dipertahankan khusus angka dan identifier.

Kelas siap pakai di `@layer components`:

| Kelas               | Ukuran                                | Dipakai untuk                              |
| ------------------- | ------------------------------------- | ------------------------------------------ |
| `.page-title`       | 20px semibold, tracking -0.02em       | Judul halaman                              |
| `.page-description` | 14px                                  | Keterangan di bawah judul                  |
| `.section-title`    | 18px semibold                         | Judul bagian                               |
| `.card-title`       | 16px semibold                         | Judul kartu                                |
| `.field-label`      | 12px medium                           | Label field                                |
| `.table-head-cell`  | 12px medium, uppercase, tracking wide | Header kolom tabel                         |
| `.metric-value`     | mono, tabular-nums                    | Angka telemetri                            |
| `.metric-unit`      | 0.8em, lebih redup                    | Satuan di belakang angka                   |
| `.loading-text`     | 14px, `text-muted`                    | Pengganti skeleton di form dan panel kecil |

Aturan:

- **Ukuran judul halaman harus sama di semua fitur.** Acuannya Overview.
- **Judul halaman tanpa ikon dekoratif.**
- Angka selalu `tabular-nums` agar kolom tabel tidak bergeser saat nilai berubah.
  Dipasang global untuk `table` dan `kbd`.
- Satuan selalu lebih redup daripada angkanya.
- 83% teks di aplikasi ini `text-xs` atau `text-sm`.

---

## 5. Radius, spacing, elevasi

| Token          | Nilai    | Dipakai untuk                                       |
| -------------- | -------- | --------------------------------------------------- |
| `rounded-sm`   | 8px      | Elemen mikro                                        |
| `rounded-md`   | 10px     | Tombol di dalam segmented control dan tab           |
| `rounded-lg`   | **12px** | **Semua kontrol**: tombol, input, select, baris nav |
| `rounded-xl`   | **20px** | **Semua penampung**: kartu, panel, sheet, dialog    |
| `rounded-2xl`  | 24px     | Panel terluar                                       |
| `rounded-full` | —        | **Hanya** chip dan badge                            |

Spacing:

- Jarak antar blok besar dalam satu halaman: `gap-6`.
- Padding kartu: `p-4` di layar kecil, `sm:p-6` di layar lebar.
- Padding sel tabel: `px-4 py-3` (`px-3.5 py-2.5` untuk tabel katalog yang padat).
- Gap ikon–label: `gap-2` / `gap-2.5`.

Elevasi:

| Token            | Dipakai untuk           |
| ---------------- | ----------------------- |
| `shadow-overlay` | Dropdown                |
| `shadow-panel`   | Toast, panel mengambang |
| `shadow-dialog`  | Dialog konfirmasi       |

**Kartu tidak pernah punya bayangan.** Pemisahan visual memakai garis dan beda
tone permukaan.

Gerak: transisi kontrol `0.12s`, sidebar `300ms`. Semuanya dimatikan oleh
`prefers-reduced-motion: reduce`.

---

## 6. Kelas kontrol

Ditulis sekali di `src/routes/layout.css`, bukan diulang sebagai rangkaian
utility di tiap komponen. Ini pelajaran yang sudah dibayar: sebelum ada kelas
ini, setiap layar mengulang string seratus karakter dan mereka mulai berbeda satu
sama lain.

| Kelas                                                  | Dipakai untuk                             |
| ------------------------------------------------------ | ----------------------------------------- |
| `.field`                                               | Semua input, textarea, dan trigger select |
| `.field-invalid`                                       | Field yang gagal validasi                 |
| `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-danger` | Tombol                                    |
| `.btn-sm` / `.btn-lg`                                  | Ukuran tombol                             |

**Hanya tiga varian tombol.** Satu tombol primer per layar; sisanya ghost.
Varian `secondary` dan `success` dari versi React sudah dihapus.

---

## 7. Aturan komponen

Aturan berikut berasal dari revisi berulang. Melanggarnya berarti mengulang
kesalahan yang sudah pernah diperbaiki.

### Larangan

- **Jangan ada wadah di dalam wadah.** Tabel dan kartu tidak dibungkus kartu
  lagi. Ini keluhan yang paling sering muncul. `EmptyState` sudah **berupa**
  wadah bergaris putus-putus — jangan dibungkus kartu.
- **Jangan ada garis warna aksen di atas kartu.**
- **Jangan ada kartu tanggal/jam.** Tanggal sudah ada di sistem operasi pengguna.
- **Jangan menampilkan nama endpoint atau payload** di layar operasional.
- **Jangan pakai ikon berwarna.** Ikon berwarna tidak mewarisi `currentColor`,
  jadi pada tombol nonaktif atau saat hover ia tetap penuh saturasi dan terlihat
  rusak. Warna di aplikasi ini juga sudah punya arti; warna tanpa arti menambah
  beban baca operator.

### Keharusan

- Form buat/ubah/query memakai **dialog sheet**, bukan halaman terpisah.
- Aksi destruktif (hapus, keluar) lewat `ConfirmDialog`.
- Status aktif/nonaktif memakai `StatusToggle`, **bukan checkbox**.
- Panel dropdown muncul **di bawah** field dan tidak menutupinya — `side="bottom"`
  dipatok eksplisit di `Select`, bukan dibiarkan otomatis membalik ke atas.
- Skeleton mengikuti bentuk konten aslinya, dan hanya untuk peta, grafik, dan
  tabel.
- Filter yang perlu bisa dibagikan lewat tautan disimpan di **query string**.

### Ikon

Iconify lewat `unplugin-icons`, di-compile saat build:

```svelte
import IconUpload from '~icons/ph/upload-simple';
```

Set utama **Phosphor** (`ph`); `lucide` tersedia sebagai jembatan untuk ikon yang
namanya sama dengan versi React. Keduanya monokrom dan mewarisi `currentColor`.

Varian runtime (`iconify-icon`) **tidak boleh dipakai**: aplikasi berjalan di
LAN dan lewat tunnel, sehingga ikon akan kosong begitu jaringan luar tidak
tersedia.

### Komponen yang tersedia

Cek daftar ini sebelum membuat komponen baru.

| Kebutuhan        | Komponen                                                  |
| ---------------- | --------------------------------------------------------- |
| Aksi             | `atoms/Button`                                            |
| Field            | `atoms/Input`, `atoms/Select`, `atoms/SegmentedControl`   |
| Status           | `atoms/Badge`, `atoms/StatusToggle`, `atoms/SourceMarker` |
| Judul halaman    | `ui/PageHeader`                                           |
| Form panel       | `ui/Sheet`                                                |
| Konfirmasi       | `ui/ConfirmDialog`                                        |
| Tab              | `ui/Tabs`                                                 |
| Pesan tempel     | `ui/Banner`                                               |
| Keadaan kosong   | `ui/EmptyState`                                           |
| Keadaan gagal    | `ui/ErrorState`                                           |
| Kegagalan render | `ui/AppErrorBoundary`                                     |
| Notifikasi       | `ui/Toast`                                                |
| Paginasi         | `ui/TablePagination`                                      |
| Muat ulang latar | `ui/RefetchBar`                                           |
| Placeholder muat | `atoms/Skeleton`, `skeletons/*`                           |

---

## 8. Keadaan layar

Setiap layar yang memuat data harus menangani empat keadaan. Melewatkan salah
satunya berarti operator menatap layar kosong tanpa penjelasan.

| Keadaan          | Tampilan                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Memuat           | Skeleton berbentuk konten aslinya (peta/grafik/tabel) atau `.loading-text`, dengan `role="status"` |
| Kosong           | `EmptyState` — dua baris: apa yang tidak ada, lalu apa yang bisa dilakukan                         |
| Gagal            | `ErrorState` — kalimat non-teknis + tombol coba lagi, **inline bukan toast**                       |
| Gagal sebagian   | `Banner` bertona warning, layar tetap berguna                                                      |
| Muat ulang latar | `RefetchBar`, isi tabel tetap tampil                                                               |

Pesan error ke operator memakai kalimat biasa. Pesan mentah dari server tidak
ditampilkan langsung.

---

## 9. Aksesibilitas

- Ring fokus global: `outline: 2px solid var(--color-brand-primary-strong)` dengan
  `outline-offset: 2px`. Kontrol form punya penandanya sendiri di `.field`
  (border ganti warna + `box-shadow` 1px yang menempel di tepinya, terbaca
  sebagai satu border yang menebal) — karena itu `.field:focus` mematikan
  outline, supaya tidak muncul dua cincin.
- **Jangan pernah `outline: none` tanpa pengganti.**
- Semua warna teks lolos **WCAG AA**. Kalau menambah warna baru, ukur dulu.
- Warna tidak pernah jadi satu-satunya penanda: `SourceMarker` memakai bentuk
  **dan** warna; status memakai teks di dalam badge.
- Setiap kontrol ikon punya `aria-label`; ikon dekoratif `aria-hidden`.
- Elemen yang terlihat bisa diklik harus benar-benar bisa diklik dan dijangkau
  keyboard.

---

## 10. Responsivitas

Breakpoint: `sm` (640px), `lg` (1024px), `xl` (1280px).

- Sidebar berubah jadi panel geser di bawah `lg`, dan bisa diciutkan jadi rail
  72px di atasnya. Saat ciut, sub menu terjangkau lewat panel mengambang.
- Grid dua kolom memakai `lg:grid-cols-2` atau `xl:grid-cols-2`, menumpuk di
  bawahnya.
- Tabel lebar dibungkus `overflow-x-auto` dengan `min-w-[…]` pada tabelnya,
  sehingga halaman tidak pernah menggeser secara horizontal.
- Toolbar filter menumpuk vertikal di bawah `sm`.
