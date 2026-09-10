# tele-frontend-v2 (Svelte)

Dashboard monitoring & telemetering PLTA (klien: IP Mrica, wilayah Jawa Tengah).
SvelteKit 2 + Svelte 5 runes + Vite + Tailwind 4, mode **SPA**. TanStack Query
untuk server state, runes untuk session state, Zod untuk validasi kontrak API.

Penulisan ulang dari versi React di `../tele-frontend-v2`. Kalau ragu bagaimana
sesuatu seharusnya berperilaku, berkas React-nya masih ada di sana dan boleh
dibaca sebagai rujukan.

Dokumen yang sudah ada — baca dulu sebelum mengubah apa pun:

- `README.md` — tech stack, env var, cara jalan, deployment
- `docs/architecture.md` — layer, dependency direction, struktur feature
  (WAJIB dibaca sebelum menambah folder/file baru)
- `system-style-design-guide.md` — token warna, tipografi, spacing, aturan
  komponen (WAJIB dibaca sebelum menyentuh UI)
- `docs/design-system.md` — bahasa visual rujukan (dari `app.uniswap.org`).
  Penerapannya di project ini, termasuk penyimpangan yang disengaja, ada di
  `system-style-design-guide.md`

File ini hanya berisi hal yang tidak tertulis di keempat dokumen itu.

## Cara kerja & komunikasi

- Bahasa Indonesia.
- Runtime & package manager: **Bun**, bukan npm/yarn. `bun install`, `bun run dev`,
  `bun run check`.
- **Jangan menjalankan dev server sendiri.** User menjalankannya di
  `localhost:5173` dan akan bilang "gunakan localhost:5173" ketika sudah siap.
  Verifikasi lewat URL itu.
- Untuk pekerjaan besar: buat rencana ber-phase, kerjakan **2 phase per request**,
  bukan sekaligus. User ingin melihat hasil bertahap.
- Kalau membandingkan/menganalisis banyak item, **sajikan dalam tabel**, bukan
  paragraf. User kesulitan membaca teks panjang.
- Sebelum menghapus/mengubah sesuatu yang berdampak, beri opsi + alasan, lalu
  tunggu keputusan user.

## Perintah

```bash
bun run check      # typecheck + lint + test + build — jalankan sebelum menyatakan selesai
bun run typecheck  # svelte-kit sync && svelte-check
bun run lint       # prettier --check && eslint
bun run format     # prettier --write
bun run test
```

## Jebakan khas Svelte di project ini

Hal-hal yang sudah pernah menggigit dan tidak akan terlihat dari membaca kode:

- **Parameter query harus accessor.** `createTrendQuery(() => input)`, bukan
  `createTrendQuery(input)`. svelte-query v6 membaca opsi lewat fungsi; nilai
  biasa akan membekukan query pada nilai render pertama.
- **Peringatan `state_referenced_locally` sering menunjuk bug nyata.** Sudah dua
  kali: `EditUserSheet` dan `TelemetryUploadSheet` hanya menangkap nilai awal
  prop, sehingga membuka panel untuk target berbeda menampilkan isian lama.
  Perbaikannya `$effect` yang menyetel ulang, bukan mematikan peringatannya.
- **`jsdom` di-pin ke `26.1.0`.** Versi 30 mensyaratkan Node ≥ 22; mesin dev
  memakai Node 20 dan seluruh test DOM gagal dengan
  `webidl.util.markAsUncloneable is not a function`.
- **Uji komponen butuh `resolve.conditions: ['browser']`.** Tanpa itu Svelte
  ter-resolve ke build server dan `mount()` tidak tersedia. Sudah disetel di
  project uji `client` pada `vite.config.ts`.
- **Aturan lint `svelte/prefer-svelte-reactivity`** menolak `new Map()`,
  `new URL()`, `new Date()`, dan `new URLSearchParams()` yang dimutasi. Di
  beberapa tempat itu false positive — objek sekali pakai yang tidak pernah
  dibaca ulang dari template. Yang sudah dinonaktifkan per baris punya alasan
  tertulis di kodenya; jangan menonaktifkan yang baru tanpa alasan yang sama
  jelasnya.
- **`svelte/no-navigation-without-resolve` dimatikan** di `eslint.config.js`.
  Aplikasi disajikan nginx di root domain dan `paths.base` kosong. Kalau nanti
  pindah ke sub-path, aturan ini harus dinyalakan lagi lebih dulu.
- **`$app` bukan alias yang boleh dipakai** — nama itu milik SvelteKit. Karena
  itu composition root tinggal di `src/core` dengan alias `$core`, bukan
  `src/app`. Alias project: `$api`, `$components`, `$core`, `$features`,
  `$shared`. `$lib` juga tidak dipakai; `src/lib` sudah dihapus.

## Domain

- **Wilayah Sungai (WS) 1 : N PLTA. Satu PLTA hanya punya satu `ws_id`.**
  Ini pernah salah dimodelkan sebagai many-to-many.
- Role: `admin`, `operator`, `viewer`. Role `viewer` tidak boleh melihat menu
  Input GHW dan Katalog Monitoring.
- Menu: Overview (peta Jawa Tengah), Telemetering, Tren & Grafik, Laporan,
  Input GHW, Forecasting, User Management.

## Backend & integrasi

- Base URL lewat `VITE_API_BASE_URL`. Alamat backend **sering berganti**
  (tunnel trycloudflare / IP LAN seperti `192.168.105.99:8000`). Kalau host baru
  perlu diakses dev server, tambahkan ke **`VITE_DEV_ALLOWED_HOSTS`** di
  `.env.local` — bukan ke `vite.config.ts` seperti dulu.
- Swagger backend ada di `<base>/docs`. Kalau user bilang "ada update dari
  backend", cek Swagger dan bandingkan query param / request body / response
  dengan schema Zod.
- Auth: `POST /api/v1/auth/login` dengan **`x-www-form-urlencoded`** (username,
  password), `/auth/refresh`, `/auth/me`. **Tidak ada API logout** — logout murni
  sisi klien (hapus token + bersihkan cache query). Ini keputusan tim, bukan
  kekurangan.
- Realtime: `wss://<host>/api/v1/ws/monitoring?token=${accessToken}&plta_id=${pltaId}`.
- Upload Excel: kirim file mentah ke server. **Jangan parsing Excel di frontend** —
  ini perubahan dari implementasi awal yang parsing di klien.
- Endpoint yang sudah diputuskan **tidak dipakai**: legacy, auth LDAP, opc-tools,
  alerts, report-ROH, dan upload RTOW. Fitur "monitoring" lama sudah diganti
  "telemetering".

## Perilaku fitur yang sudah diputuskan

- **Telemetering**: kondisi hidrologi harian selalu ambil hari ini (tanpa pemilih
  tanggal); tombol "Input data" berubah jadi "Edit data" bila datanya sudah ada;
  ada **gambar statis bendungan** dengan overlay SVG penanda hulu / dam / hilir.
  Gambarnya di-host sendiri di `static/dam/<nama>.jpg` dan posisi penanda
  ditulis sebagai persen (`xPercent`/`yPercent`) di
  `features/plta/dam-imagery.ts`. Dulu citra Esri World Imagery di-_export_ on
  demand: setiap kali halaman dibuka browser menembak server pihak ketiga di
  luar jaringan dan menunggu JPG 1600x1000 di-render di sana — lambat lewat LAN
  dan tunnel, dan gagal total kalau internet putus. Sekarang citra yang sama
  diambil **sekali** lalu disimpan. Orientasi ditentukan saat menyimpan berkas,
  bukan di kode — kalau sebuah berkas diputar, anchor dan bentuk `field` tiap
  zona harus dihitung ulang terhadap bingkainya. Rasio bingkai juga **per
  bendungan** (field `frame`), bukan konstanta. Arsiran zona punya dua bentuk:
  `ellipse` (pendekatan kasar) dan `outline` (batas sesungguhnya). Soedirman
  memakai `outline` hasil telusur dari citranya sendiri — air diklasifikasi per
  warna lalu konturnya disederhanakan — sehingga arsiran berhenti tepat di garis
  pantai waduk. Wonogiri masih `ellipse`. Tidak ada overlay keterangan di atas
  citra: kotak nama bendungan + kredit sumber sudah dihapus atas permintaan tim
  karena dinilai mengganggu, jadi **isinya masih citra Esri tapi kreditnya tidak
  ditampilkan** — mengganti berkasnya dengan foto milik PLN menyelesaikan itu.
  Kalau `getDamImagery()` null atau gambarnya gagal dimuat, halaman jatuh ke
  skema generik, jadi PLTA tanpa gambar tetap aman.
- **Tren & Grafik**: hanya **satu** grafik dengan pemilih parameter (bukan 4
  grafik). Rentang default 24 jam. Daftar parameter diambil dari API tags. Garis
  grafik menampilkan nilai saat di-hover. Parameter terakumulasi (`*rainfall*`,
  `total_outflow`) diagregasi `sum`, sisanya `avg`; curah hujan digambar sebagai
  batang.
- **Laporan**: alur = pilih laporan → masuk daftar tabel → status `completed` →
  download. Hanya periode bulanan dan hanya parameter time series. Daftar laporan
  pakai paginasi + search, tanpa tombol "Perbarui"; polling berhenti sendiri
  begitu tidak ada baris `pending`/`processing`.
- **Forecasting**: khusus PLTA Soedirman, tanpa pemilih PLTA.
- **User Management**: limit paginasi 10 item.
- **Overview**: peta Jawa Tengah dengan batas kabupaten/kota, garis aliran
  sungai, dan overlay presipitasi realtime (memakai layanan tier gratis).
- **Upload bulanan**: satu berkas mengisi seluruh PLTA, jadi rutenya sengaja
  tidak memuat `pltaId`. Tidak ada pratinjau — server tidak menyediakan mode uji
  coba, dan satu baris bermasalah menolak seluruh berkas.

## Status penulisan ulang

**Selesai.** Seluruh halaman, komponen, dan fitur sudah berpindah dari versi
React; tidak ada lagi placeholder.

Catatan tentang peta: `react-simple-maps` tidak punya padanan Svelte, jadi
`components/map/JavaMap.svelte` memakai `d3-geo` langsung — `geoMercator()`
untuk proyeksi dan `geoPath()` untuk menghasilkan atribut `d`, lalu `<path>` SVG
ditulis sendiri. Cabang `customMarkers` dari versi React **tidak** ikut diport:
hanya Overview yang memakai `JavaMap`, dan ia tidak pernah mengirim prop itu.

## Catatan

Riwayat pengerjaan versi React (45 sesi) berasal dari Codex dan disarikan ke
`CLAUDE.md` di project itu; korpus mentahnya tidak disimpan di repo.
