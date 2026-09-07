# tele-frontend-v2 (Svelte)

Dashboard monitoring & telemetering PLTA untuk PLN Indonesia Power UBP Mrica,
wilayah Jawa Tengah. Ini penulisan ulang dari versi React ke SvelteKit; perilaku
aplikasi, kontrak API, dan keputusan produk dipertahankan.

---

## 1. Tech stack

| Lapisan      | Pilihan                                        | Catatan                                          |
| ------------ | ---------------------------------------------- | ------------------------------------------------ |
| Framework    | **SvelteKit 2** + Svelte 5 (runes)             | Mode **SPA** — `ssr = false`, `adapter-static`   |
| Build        | **Vite 8** + **Bun**                           | Bun adalah runtime dan package manager           |
| Styling      | **Tailwind CSS 4** (`@theme`)                  | Token di `src/routes/layout.css`                 |
| Server state | **@tanstack/svelte-query 6**                   | Berbasis runes                                   |
| Client state | **Runes** (`$state` di `.svelte.ts`)           | Menggantikan Zustand                             |
| Validasi     | **Zod 4**                                      | Schema kontrak API, disalin dari versi React     |
| Komponen     | **bits-ui** (headless)                         | Dialog, sheet, select, popover                   |
| Grafik       | **layerchart** + `d3-scale`                    | Menggantikan Recharts                            |
| Ikon         | **Iconify** via `unplugin-icons`               | Di-compile saat build, **tanpa request runtime** |
| Font         | Manrope (variable) + JetBrains Mono            |                                                  |
| Test         | **Vitest** + `@testing-library/svelte` + jsdom |                                                  |

### Kenapa SPA, bukan SSR

Token sesi disimpan di `sessionStorage`, monitoring realtime memakai WebSocket
dari sisi klien, dan `VITE_API_BASE_URL` ikut ter-bundle saat build supaya
production dan staging menghasilkan dua direktori yang berbeda isinya. Tidak
satu pun dari itu punya padanan di sisi server. Keluarannya tetap direktori
statis, jadi berkas nginx dan systemd nyaris sama seperti versi React.

---

## 2. Menjalankan

```bash
bun install          # menjalankan `svelte-kit sync` lewat script `prepare`
bun run dev          # http://localhost:5173
bun run dev:staging  # http://localhost:5174
```

Port dipatok dengan `strictPort`. Perilaku bawaan Vite adalah diam-diam pindah
ke port berikutnya bila port terpakai — persis kejadian yang dulu membuat
production dan staging tertukar di browser. Lebih baik gagal keras.

### Perintah

```bash
bun run check         # typecheck + lint + test + build — jalankan sebelum menyatakan selesai
bun run typecheck     # svelte-kit sync && svelte-check
bun run lint          # prettier --check && eslint
bun run format        # prettier --write
bun run test          # vitest run
bun run test:coverage
bun run build         # -> dist/
bun run build:staging # -> dist-staging/
```

---

## 3. Environment

| Variabel                  | Wajib | Keterangan                                                                                                                                              |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`       | ya    | **Host saja**, tanpa `/api` atau `/api/v1` — setiap endpoint repository sudah memuat prefix itu. Isi `/` bila backend diproksikan pada origin yang sama |
| `VITE_ERROR_REPORT_URL`   | tidak | Kolektor error di jaringan lokal. Kosong berarti laporan hanya disimpan di memori browser                                                               |
| `VITE_RAINVIEWER_API_URL` | tidak | Sumber radar presipitasi peta Overview. Kosongkan pada jaringan tertutup untuk mematikan overlay sekaligus menghentikan request yang pasti gagal        |
| `VITE_DEV_ALLOWED_HOSTS`  | tidak | Dev server saja. Host tambahan yang boleh mengakses `bun run dev`, dipisah koma. Diperlukan saat dev server dibuka lewat tunnel                         |

Nama variabel sengaja **tidak** dipindahkan ke konvensi `PUBLIC_` milik
SvelteKit: `import.meta.env.VITE_*` tetap bekerja lewat Vite, dan mengubahnya
hanya akan memutus berkas `.env` yang sudah ada di server.

Berkas `.env.staging` dan `.env.production` **tidak di-commit** — dibuat manual
di server.

---

## 4. Struktur

```text
src/
├── api/http/         infrastruktur transport: URL, header, refresh token, ApiError
├── core/             composition root: query client, guard rute, pelaporan error
├── components/
│   ├── atoms/        Button, Input, Select, Badge, StatusToggle, Skeleton, …
│   ├── ui/           Sheet, ConfirmDialog, Tabs, Toast, Banner, PageHeader, …
│   └── skeletons/    kerangka muat per bentuk konten
├── features/         satu folder per domain (11 fitur)
│   └── <fitur>/
│       ├── api/      schemas.ts (Zod) · repository interface · adapter HTTP · queries.ts
│       ├── components/
│       ├── model.ts
│       └── *.svelte.ts   state milik domain, mis. features/auth/auth-store.svelte.ts
├── routes/           rute SvelteKit (menggantikan `pages/` + react-router)
│                     termasuk komponen milik satu rute, mis. NavGroup.svelte
├── shared/lib|utils/ env, tanggal, unduhan, form, notifikasi, formatter angka
└── types/
```

Alias: `$api`, `$components`, `$core`, `$features`, `$shared`.
`$app` dan `$lib` tidak dipakai — keduanya milik SvelteKit; `src/lib` sudah
dihapus dan composition root memakai `src/core`.

Detail lapisan dan arah dependensi ada di [`docs/architecture.md`](docs/architecture.md).
Aturan visual ada di [`system-style-design-guide.md`](system-style-design-guide.md).

---

## 5. Deployment

Output build adalah direktori statis, disajikan dua cara:

1. **nginx** (`deploy/nginx.conf`) — production di port 80, staging di 8080.
2. **systemd + `deploy/static-server.ts`** — production di 4173, staging di 4174.

```bash
./deploy/deploy.sh staging
./deploy/deploy.sh production
```

Server statisnya sendiri ditulis sengaja, tidak memakai `vite preview` seperti
versi React: SvelteKit mengabaikan `--outDir` dan menyajikan hasil build
terakhir apa pun itu, sehingga service staging bisa menyajikan bundle production
tanpa satu pun pesan error.

---

## 6. Backend

- Base URL lewat `VITE_API_BASE_URL`. Alamatnya **sering berganti** (tunnel
  trycloudflare atau IP LAN). Untuk dev server, tambahkan host baru ke
  `VITE_DEV_ALLOWED_HOSTS`, bukan ke `vite.config.ts`.
- Swagger ada di `<base>/docs`.
- Auth: `POST /api/v1/auth/login` dengan **`x-www-form-urlencoded`**,
  lalu `/auth/refresh` dan `/auth/me`. **Tidak ada API logout** — keluar murni
  sisi klien (hapus token + bersihkan cache query). Ini keputusan tim.
- Realtime: `wss://<host>/api/v1/ws/monitoring?token=…&plta_id=…`.
- Upload Excel: kirim berkas mentah ke server. **Jangan parsing Excel di
  frontend.**
