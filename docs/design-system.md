# Design System — Tazk (jira-lite)

Dokumen ini merekam bahasa visual yang dipakai Tazk supaya bisa dipindahkan
ke project lain. Isinya token, aturan, dan pola komponen — bukan kode aplikasi,
jadi tidak terikat ke SvelteKit. Yang wajib ikut hanya satu file CSS token.

**Referensi asal:** `app.uniswap.org`. Angka-angkanya diambil dari nilai
computed situs itu, lalu dua nilai sengaja disimpangkan karena gagal kontras
WCAG AA (lihat [Penyimpangan yang disengaja](#penyimpangan-yang-disengaja)).

**Stack asal:** Tailwind CSS v4 (`@theme`), Svelte 5, lucide sebagai ikon,
Manrope + JetBrains Mono dari Google Fonts. Tailwind bukan syarat — token-nya
CSS custom properties biasa.

---

## 1. Prinsip

Lima kalimat yang menjelaskan kenapa tampilannya seperti ini. Kalau ragu saat
mendesain layar baru, kembali ke sini.

1. **Latar nyaris hitam / putih bersih, panel naik selangkah.** Hierarki
   dibangun lewat _tingkat terang permukaan_, bukan lewat bayangan. Bayangan
   hanya dipakai pada elemen yang benar-benar melayang (dialog, toast).
2. **Garis rambut yang nyaris tak terlihat.** Border 1px dengan kontras sangat
   rendah (`--c-line`). Ia memisahkan, bukan menggambar kotak.
3. **Radius besar.** 12px untuk kontrol, 20px untuk kartu/panel. Ini ciri
   paling kentara dari bahasa visualnya — radius kecil langsung terasa "bukan
   ini".
4. **Satu aksen saja.** Magenta memegang seluruh perhatian: tombol primer,
   tab aktif, fokus, badge belum-dibaca. Kalau ada dua hal aksen di satu layar,
   salah satunya salah.
5. **Teks kecil, padat, tenang.** 83% teks di aplikasi ini `text-xs` atau
   `text-sm`. Judul besar hanya di kepala halaman, dengan tracking rapat.

---

## 2. Token warna

Sumber tunggal. Tema terang adalah dasarnya; gelap **hanya menimpa nilai**.

> **Aturan keras:** tidak satu pun warna boleh didefinisikan _hanya_ di dalam
> blok `@media` atau `[data-theme]`. Kalau ada, warna itu hilang di salah satu
> tema.

### 2.1 Peran token

| Token                            | Peran                                                 |
| -------------------------------- | ----------------------------------------------------- |
| `--c-bg`                         | Latar halaman (paling bawah)                          |
| `--c-surface`                    | Panel/kartu yang naik selangkah dari latar            |
| `--c-fill`                       | Isian netral: hover, chip, segmented control, `<kbd>` |
| `--c-ink`                        | Teks utama                                            |
| `--c-ink-2`                      | Teks sekunder                                         |
| `--c-ink-3`                      | Teks tersier / meta / placeholder                     |
| `--c-line`                       | Garis rambut (border default)                         |
| `--c-line-strong`                | Border pada hover kartu, batang priority mati         |
| `--c-scrim`                      | Latar gelap di belakang modal                         |
| `--c-accent`                     | Aksen: tombol primer, tab aktif, fokus                |
| `--c-accent-hover`               | Aksen saat hover                                      |
| `--c-accent-ink`                 | Aksen **sebagai teks** di atas latar biasa (tautan)   |
| `--c-accent-soft`                | Isian aksen sangat tipis (badge status "dikerjakan")  |
| `--c-on-accent`                  | Label **di atas** isian aksen                         |
| `--c-ok` / `--c-ok-soft`         | Selesai, berhasil                                     |
| `--c-warn` / `--c-warn-soft`     | Mendekati tenggat, mandek, blocked                    |
| `--c-danger` / `--c-danger-soft` | Telat, gagal, aksi merusak                            |
| `--c-info` / `--c-info-soft`     | Netral-informatif (status "review")                   |

Pasangan `-soft` selalu dipakai sebagai **latar** dengan warna penuhnya sebagai
**teks** di atasnya. Jangan dibalik.

### 2.2 Nilai — salin apa adanya

```css
/* Tema terang = dasar */
:root {
	color-scheme: light;

	--c-bg: #f9f9f9;
	--c-surface: #ffffff;
	--c-fill: #f1f1f1;

	--c-ink: #131313;
	--c-ink-2: #5d5d5d;
	--c-ink-3: #6e6e6e;

	--c-line: #e8e8e8;
	--c-line-strong: #c7c7c7;
	--c-scrim: rgba(19, 19, 19, 0.32);

	--c-accent: #e0009b;
	--c-accent-hover: #c70089;
	--c-accent-ink: #c4008f;
	--c-accent-soft: #fff0fa;
	--c-on-accent: #ffffff;

	--c-ok: #087a45;
	--c-ok-soft: #e6f7ef;
	--c-warn: #b4530a;
	--c-warn-soft: #fdf1e3;
	--c-danger: #c9251a;
	--c-danger-soft: #fdecea;
	--c-info: #6941c6;
	--c-info-soft: #f1edfc;
}

/* Nilai gelap — dipakai dua kali, jangan sampai berbeda */
@media (prefers-color-scheme: dark) {
	:root:not([data-theme='light']) {
		/* isi blok gelap di bawah */
	}
}
:root[data-theme='dark'] {
	color-scheme: dark;

	--c-bg: #131313;
	--c-surface: #1f1f1f;
	--c-fill: #262626;

	--c-ink: #ffffff;
	--c-ink-2: #cfcfcf;
	--c-ink-3: #9b9b9b;

	--c-line: #2e2e2e;
	--c-line-strong: #4a4a4a;
	--c-scrim: rgba(0, 0, 0, 0.6);

	--c-accent: #ff37c7;
	--c-accent-hover: #ff5fd2;
	--c-accent-ink: #ff8add;
	--c-accent-soft: #351028;
	--c-on-accent: #131313; /* label GELAP di atas magenta neon */

	--c-ok: #2ed27e;
	--c-ok-soft: #12301f;
	--c-warn: #f2a73b;
	--c-warn-soft: #33240f;
	--c-danger: #ff6b6b;
	--c-danger-soft: #3a1a18;
	--c-info: #a78bfa;
	--c-info-soft: #241c3d;
}
```

### 2.3 Penyimpangan yang disengaja

Dua nilai referensi gagal WCAG AA dan diubah. Catat, supaya tidak "dikembalikan"
oleh orang berikutnya yang membandingkan dengan situs aslinya:

| Asal                                | Jadi                                                                                            | Alasan                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Abu sekunder `#7d7d7d`              | `#6e6e6e`                                                                                       | 4.12:1 di atas putih — terlalu tipis untuk teks kecil yang dipakai di puluhan tempat |
| Magenta neon `#ff37c7` + teks putih | Terang: `#e0009b` + putih (4.52:1). Gelap: neon tetap, labelnya dibalik jadi `#131313` (5.86:1) | Neon + putih hanya 3.17:1                                                            |

Prinsipnya: **neon dipertahankan di tema gelap dengan membalik label**, bukan
dengan meredupkan aksennya.

---

## 3. Tipografi

```css
--font-sans: 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;

/* Skala bobot digeser naik: "normal" = 485, bukan 400 */
--font-weight-normal: 485;
--font-weight-medium: 550;
--font-weight-semibold: 650;
--font-weight-bold: 750;
```

Bobot ganjil 485 meniru font Basel di situs aslinya. Ini yang membuat teks
terasa sedikit lebih hadir tanpa terlihat tebal. **Wajib pakai variable font**
(`Manrope:wght@400..800`) — bobot statis akan dibulatkan ke 500 dan efeknya
hilang.

| Peran               | Ukuran             | Bobot           | Catatan                     |
| ------------------- | ------------------ | --------------- | --------------------------- |
| Judul halaman       | `text-xl` (20px)   | semibold        | `letter-spacing: -0.02em`   |
| Judul seksi / board | `text-lg` (18px)   | semibold        | tracking rapat              |
| Judul dialog        | `text-base` (16px) | semibold        | tracking rapat              |
| Isi / baris daftar  | `text-sm` (14px)   | normal          | tulang punggung UI          |
| Meta, label, badge  | `text-xs` (12px)   | normal / medium |                             |
| Angka sempit        | `text-[11px]`      | —               | hanya kalau 12px tidak muat |

Aturan tambahan:

- Kunci/kode (`JL-142`, kunci project) selalu `font-mono text-xs`.
- Angka yang berjajar wajib `font-variant-numeric: tabular-nums` — dipasang
  global untuk `table`, `kbd`, dan kelas `.tabular`.
- Label kelompok pakai `text-xs font-medium tracking-wide uppercase` warna
  `--c-ink-3`.

---

## 4. Radius, spasi, elevasi

```css
--radius-sm: 8px; /* elemen mikro */
--radius-md: 10px; /* tombol di dalam segmented control */
--radius-lg: 12px; /* SEMUA kontrol: input, tombol, baris nav */
--radius-xl: 20px; /* kartu, panel, dialog, toast */
--radius-2xl: 24px; /* panel terluar */
```

Praktiknya cuma dua yang sering dipakai: **12px untuk apa pun yang diklik atau
diketik, 20px untuk apa pun yang menampung**. Chip dan badge pakai `rounded-full`.

**Spasi** — kelipatan 4px, dengan pola halaman yang tetap:

- Padding halaman: `px-8 py-8` (halaman berdiri sendiri) atau `px-8 py-6`
  (halaman di bawah bar tab).
- Lebar konten: `mx-auto max-w-4xl` untuk daftar/pengaturan, `max-w-2xl`–`3xl`
  untuk form dan bacaan. Board full-width dengan scroll horizontal.
- Jarak setelah kepala halaman: `mt-5` / `mt-6`.
- Padding kartu: `p-4` (kartu di grid) sampai `p-5`/`p-7` (panel form).
- Gap ikon–label: `gap-2.5`. Gap antar elemen sebaris: `gap-2`/`gap-3`.

**Elevasi** — hampir tidak ada. Kartu naik lewat `--c-surface` + border, bukan
bayangan. Bayangan hanya pada: toast (`shadow-lg`) dan command palette
(`shadow-xl`). Modal pakai scrim, bukan bayangan.

---

## 5. Kelas komponen

Ditulis sekali di file CSS global, bukan diulang sebagai rangkaian utility di
tiap halaman. Ini pelajaran yang sudah dibayar di project ini: sebelum ada
kelas-kelas ini, setiap halaman mengulang string seratus karakter dan mereka
mulai berbeda satu sama lain.

```css
@layer components {
	.field {
		width: 100%;
		border-radius: var(--radius-lg);
		border: 1px solid var(--c-line);
		background: var(--c-surface);
		color: var(--c-ink);
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		line-height: 1.45;
		outline: none;
		transition:
			border-color 0.12s,
			box-shadow 0.12s;
	}
	.field::placeholder {
		color: var(--c-ink-3);
	}
	.field:focus {
		border-color: var(--c-accent);
		box-shadow: 0 0 0 1px var(--c-accent); /* SATU garis, bukan dua */
	}
	.field:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Panah <select> bawaan menempel ke border dan tidak bisa diatur */
	.select {
		appearance: none;
		padding-right: 2.25rem;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239b9b9b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		white-space: nowrap;
		border-radius: var(--radius-lg);
		border: 1px solid transparent;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition:
			background-color 0.12s,
			border-color 0.12s,
			opacity 0.12s;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-sm {
		padding: 0.375rem 0.75rem;
	}

	.btn-primary {
		background: var(--c-accent);
		color: var(--c-on-accent);
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--c-accent-hover);
	}

	.btn-ghost {
		border-color: var(--c-line);
		background: var(--c-surface);
		color: var(--c-ink);
	}
	.btn-ghost:hover:not(:disabled) {
		background: var(--c-fill);
	}

	.btn-danger {
		background: var(--c-danger);
		color: #fff;
	}
	.btn-danger:hover:not(:disabled) {
		opacity: 0.9;
	}
}
```

Hanya tiga varian tombol. Satu primer per layar; sisanya ghost.

---

## 6. Fokus dan aksesibilitas

```css
:focus-visible {
	outline: 2px solid var(--c-accent);
	outline-offset: 2px;
}

/* Kontrol form sudah punya penandanya sendiri — tanpa ini ada DUA cincin */
.field:focus-visible,
.field:focus {
	outline: none;
}

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		transition-duration: 0.01ms !important;
	}
}

::selection {
	background: var(--c-accent);
	color: var(--c-on-accent);
}
```

Aturan yang harus ikut pindah:

- **Jangan pernah `outline: none` tanpa pengganti.** Input punya penanda
  sendiri (border ganti warna + box-shadow 1px yang menempel di tepinya,
  sehingga terbaca sebagai satu border yang menebal).
- Semua warna teks lolos **WCAG AA** di kedua tema. Kalau menambah warna baru,
  ukur dulu — dua penyimpangan di §2.3 lahir dari pengukuran, bukan selera.
- Warna tidak pernah jadi satu-satunya penanda: priority pakai **tinggi batang**
  - `title` + `sr-only`; status pakai teks di dalam badge.
- Ikon dekoratif `aria-hidden`, ikon yang berdiri sendiri wajib `aria-label`.
- Badge angka yang menyusut jadi titik tetap menyediakan `sr-only` dengan
  jumlah sebenarnya.

---

## 7. Gerak

Sangat sedikit, dan hanya untuk perubahan keadaan.

| Tempat                       | Nilai            |
| ---------------------------- | ---------------- |
| Warna kontrol (hover, fokus) | `0.12s`          |
| Lebar sidebar                | `150ms`          |
| Toast masuk/keluar           | `fly y:8, 150ms` |

Tidak ada animasi masuk halaman, tidak ada skeleton beranimasi (loading cukup
teks `Memuat…` warna `--c-ink-3`). Semuanya dimatikan oleh
`prefers-reduced-motion`.

---

## 8. Tema: tiga keadaan, bukan dua

Bawaannya **ikut sistem**. Pengalih punya tiga pilihan: Auto / Terang / Gelap.

Tiga hal yang harus ikut kalau dipindahkan:

1. **Selektor.** Sistem ditangani `@media (prefers-color-scheme: dark)` yang
   dibatasi `:root:not([data-theme='light'])`; pilihan eksplisit menang di
   kedua arah lewat `:root[data-theme='dark']` dan `[data-theme='light']`.
2. **"Auto" harus MENGHAPUS atributnya**, bukan mengosongkannya — selektornya
   mencocokkan nilai, bukan keberadaan atribut.
3. **Skrip anti-kedip di `<head>`**, sebelum halaman digambar:

```html
<script>
	try {
		const saved = localStorage.getItem('app-theme');
		if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
	} catch {
		/* private mode: preferensi sistem yang menentukan */
	}
</script>
```

Tanpa ini, pengguna tema gelap melihat kedipan putih di setiap muat halaman.
Semua akses `localStorage` dibungkus `try/catch` — di private mode ia melempar,
dan pilihan tema tidak boleh merusak halaman.

---

## 9. Pola layout

### Shell aplikasi

```
┌────────────┬──────────────────────────────┐
│  sidebar   │  main (satu-satunya yang     │
│  w-60      │  menggulung)                 │
│  (w-14     │                              │
│  saat      │                              │
│  sempit)   │                              │
└────────────┴──────────────────────────────┘
```

- Pembungkus `flex h-dvh overflow-hidden`. Tinggi dikunci ke layar dan luapan
  dimatikan di pembungkus, supaya **sidebar tidak ikut menggulung**.
- Sidebar `bg-surface` dengan `border-r border-ink-200`; bisa disempitkan jadi
  kolom ikon, dan pilihannya bertahan di `localStorage`.
- Baris nav: `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm
hover:bg-ink-100`. Aktif = `bg-ink-100 font-medium` (bukan warna aksen).
- Daftar panjang di dalam sidebar menggulung sendiri
  (`min-h-0 flex-1 overflow-y-auto`) supaya kaki sidebar tidak terdorong keluar.
- Ikon 16px seragam (lucide), `shrink-0`.

### Kepala halaman

```html
<div class="mx-auto max-w-4xl px-8 py-8">
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-xl font-semibold tracking-tight">Judul</h1>
			<p class="text-ink-400 mt-1 text-sm">Satu kalimat yang menjelaskan.</p>
		</div>
		<button class="btn btn-primary btn-sm">Aksi utama</button>
	</div>
	…
</div>
```

Subjudul selalu satu kalimat yang menerangkan konsekuensi, bukan mengulang
judul.

### Bar tab

Tab bawah-border di atas `bg-surface`, `border-b border-ink-200 px-8 pt-5`.
Aktif: `border-b-2 border-brand-500 font-medium text-brand-700`.
Nonaktif: `border-transparent text-ink-400 hover:text-ink-900`.

### Kartu dan daftar

- **Kartu grid:** `rounded-xl border border-ink-200 bg-surface p-4
hover:border-ink-300`. Hover mengubah _border_, bukan bayangan.
- **Baris daftar padat:** `flex items-center gap-3 border-b border-ink-200
px-4 py-3 last:border-b-0 hover:bg-ink-50`. Kolom lebar tetap
  (`w-16` kunci, `w-24` nama) supaya mata bisa menyusuri kolom.
- **Kolom board:** `w-64 shrink-0 rounded-xl border border-ink-200 bg-ink-50`
  — kolomnya _lebih gelap_ dari kartunya, jadi kartu terlihat mengambang di
  dalam kolom.

### Keadaan kosong

```html
<div class="border-ink-200 rounded-xl border border-dashed px-6 py-12 text-center">
	<p class="text-ink-600 text-sm font-medium">Belum ada X.</p>
	<p class="text-ink-400 mt-1 text-sm">Petunjuk langkah berikutnya.</p>
</div>
```

Border putus-putus khusus untuk kosong. Selalu dua baris: apa yang tidak ada,
lalu apa yang bisa dilakukan.

---

## 10. Pola umpan balik

| Kejadian                 | Tampilan                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Aksi berhasil/gagal      | **Toast** kanan bawah, `w-80`, `rounded-xl`, `shadow-lg`, `aria-live="polite"`           |
| Gagal memuat **halaman** | Inline, bukan toast — di sana tidak ada isi lain, dan toast hilang sebelum sempat dibaca |
| Kesalahan form           | `rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger` di dalam form                  |
| Aksi merusak             | **Dialog konfirmasi** dengan `<dialog>` bawaan browser                                   |
| Peringatan konfigurasi   | Banner `bg-warn-soft border-b border-warn/30` di atas konten, tanpa tombol tutup         |
| Memuat                   | Teks `Memuat…` warna `--c-ink-3`. Tanpa spinner, tanpa skeleton                          |

Pakai elemen `<dialog>` bawaan: perangkap fokus, tombol Esc, dan inert-nya
halaman di belakang didapat gratis. Backdrop-nya `backdrop:bg-scrim`.

Tombol saat sibuk mengganti **labelnya** (`Menyimpan…`) dan `disabled`, bukan
menampilkan spinner.

---

## 11. Semantik warna aplikasi

Peta yang bisa dipindahkan ke domain lain — polanya: netral untuk keadaan
belum-mulai, aksen untuk sedang-berjalan, info untuk menunggu-orang-lain,
danger untuk terhalang, ok untuk selesai.

| Keadaan         | Latar            | Teks             |
| --------------- | ---------------- | ---------------- |
| Belum mulai     | `bg-ink-100`     | `text-ink-600`   |
| Sedang berjalan | `bg-brand-50`    | `text-brand-700` |
| Menunggu review | `bg-info-soft`   | `text-info`      |
| Terhalang       | `bg-danger-soft` | `text-danger`    |
| Selesai         | `bg-ok-soft`     | `text-ok`        |

Semua badge: `rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap`.

**Urgensi waktu** — tiga tingkat, bukan lima: telat/hari ini → `text-danger
font-medium`; ≤7 hari → `text-warn`; selebihnya → `text-ink-400`. Teksnya
bahasa manusia (`telat 2 hari`, `besok`), bukan tanggal mentah.

---

## 12. Cara memindahkan ke project lain

1. Salin blok token di §2.2 ke file CSS global. Ini satu-satunya yang wajib.
2. Salin blok `@theme` (kalau pakai Tailwind v4) yang memetakan nama utility
   ke token — sehingga `bg-surface`, `text-ink-400`, `border-ink-200`,
   `bg-brand-500` langsung ikut tema. Tanpa Tailwind, pakai `var(--c-…)`
   langsung.
3. Salin `@layer components` di §5 (`.field`, `.select`, `.btn`).
4. Salin aturan fokus dan reduced-motion di §6.
5. Pasang skrip anti-kedip di §8 di `<head>`, dan pengalih tiga keadaan.
6. Muat Manrope **variable** + JetBrains Mono.
7. Kalau menambah warna baru: ukur kontrasnya di **kedua** tema sebelum
   dipakai, dan definisikan nilainya di `:root` dulu — bukan hanya di blok
   gelap.

**Ceklis sebelum menyebut sebuah layar selesai**

- [ ] Terbaca di tema terang **dan** gelap (bukan hanya salah satu).
- [ ] Radius: 12px untuk kontrol, 20px untuk penampung.
- [ ] Hanya satu tombol primer.
- [ ] Setiap input pakai `.field` — bukan rangkaian utility sendiri.
- [ ] Keadaan kosong punya judul **dan** petunjuk.
- [ ] Aksi merusak lewat dialog konfirmasi.
- [ ] Fokus keyboard terlihat di setiap elemen yang bisa dijangkau Tab.
- [ ] Tidak ada informasi yang hanya disampaikan lewat warna.
