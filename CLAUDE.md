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
- **`load` induk dan anak berjalan paralel.** `load` root yang menunggu
  `/auth/me` tidak membuat guard di bawahnya ikut menunggu. Guard yang membaca
  `authStore` harus `await authStore.initialize()` sendiri, dan `load` yang
  memanggil API harus `await parent()`. Pernah membuat setiap refresh browser
  terlempar ke Overview.
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
  Upload dan Katalog Data, dan **tidak bisa mengubah data** di Hidrologi Harian
  maupun Bulanan: tombol "Input data"/"Edit data" beserta form isiannya tidak
  dirender (`canEditHydrologyData`). Halamannya sendiri tetap terbuka untuk
  dibaca.
- Menu: Overview (peta Jawa Tengah), Telemetering, Forecasting, Tren & Grafik,
  Laporan, Upload, Katalog Data, dan User Management. **Panduan dan Profil Saya
  tidak ada di daftar menu** — keduanya dibuka lewat menu akun (klik nama di
  dasar sidebar), bersama Keluar.

## Backend & integrasi

- Base URL lewat `VITE_API_BASE_URL`. Alamat backend **sering berganti**
  (tunnel trycloudflare / IP LAN seperti `192.168.105.99:8000`). Kalau host baru
  perlu diakses dev server, tambahkan ke **`VITE_DEV_ALLOWED_HOSTS`** di
  `.env.local` — bukan ke `vite.config.ts` seperti dulu.
- **Staging dan production memakai proxy, bukan URL absolut**: `.env.staging`
  dan `.env.production` berisi `VITE_API_BASE_URL=/`, dan service-nya
  menjalankan `static-server.ts --api http://127.0.0.1:18000` (staging) atau
  `:8000` (production). Server punya dua alamat: LAN `192.168.105.99` dan
  Tailscale `100.94.60.11`. Dulu bundle menunjuk IP Tailscale, sehingga pengguna
  VPN bisa login tetapi pengguna WiFi kantor (`10.8.51.x`) tidak.
- **ufw di server menolak semua koneksi masuk secara bawaan.** Port frontend
  harus dibuka untuk subnet pengguna, dan WiFi kantor ada di `10.8.51.0/24`,
  bukan `192.168.105.0/24`. Lewat VPN port yang tertutup pun tetap bisa dibuka
  (Tailscale memasang aturan iptables sendiri), jadi "bisa lewat VPN" tidak
  membuktikan port-nya terbuka. `curl` dari server itu sendiri juga tidak
  membuktikan apa-apa karena lewat loopback. Blokir terlihat di
  `sudo journalctl -k | grep "DPT=<port>"` beserta IP asalnya.
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
  Gambarnya di-host sendiri di `static/dam/<nama>.avif` dan posisi penanda
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
  pantai waduk. **Seluruh 13 PLTA sudah punya citra dan `outline`.** Air yang
  jelas ditelusuri otomatis (flood fill warna dari titik benih); tanggul,
  gedung PLTA, dan perairan yang berkabut, berbuih, atau tertutup hutan
  digambar manual di atas grid persen. Penanda hilir Soedirman berada sedikit
  di luar batasnya sendiri — sudah begitu sejak awal. Sidorejo, Klambu, dan Pejengkolan bendung, bukan bendungan waduk.
  Garung, Jelok, Timo, Ketenger, dan Tulis memakai saluran/terowongan panjang,
  jadi bingkainya 2,4–6,6 km dan "hilir" = gedung PLTA (kecuali Tulis, yang
  gedungnya belum ditemukan). Rantai Timo: Rawa Pening → Bendung Tuntang →
  PLTA Jelok → Kolam Tando → terowongan ±4 km → PLTA Timo. Bendung Sidorejo
  tidak ada di OpenStreetMap — posisinya dikenali dari citra di Kali Serang
  dekat Desa Ngleses, Juwangi, dan belum dikonfirmasi tim. Citra diambil dari
  endpoint `export` Esri World Imagery (utara di atas, 1600x1000), dengan posisi
  dari OpenStreetMap — koordinat PLTA di backend kebanyakan masih `null`.
  Berkasnya **AVIF** (total ±2,2 MB, separuh JPG dengan kualitas setara),
  di-encode dari unduhan Esri asli, bukan dari JPG yang sudah dikompresi.
  AVIF butuh Chrome 85+, Firefox 93+, Safari 16.4+, atau Edge 121+; browser
  yang lebih tua memicu `onImageError` dan jatuh ke skema generik. `<picture>`
  tidak bisa dipakai karena gambarnya `<image>` di dalam SVG.
  Tidak ada overlay keterangan di atas citra: kotak nama bendungan + kredit
  sumber sudah dihapus atas permintaan tim
  karena dinilai mengganggu, jadi **isinya masih citra Esri tapi kreditnya tidak
  ditampilkan** — mengganti berkasnya dengan foto milik PLN menyelesaikan itu.
  Kalau `getDamImagery()` null atau gambarnya gagal dimuat, halaman jatuh ke
  skema generik, jadi PLTA tanpa gambar tetap aman.
- **Umur pembacaan sensor** (Hidrologi Harian): "Realtime aktif" hanya berarti
  WebSocket terbuka, bukan sensornya masih mengirim. Karena itu baris sensor
  diberi badge umur dari field `time` (angkanya diredupkan ke `text-muted` saat
  merah). **Ambangnya per kelompok interval sensor**, diukur dari data staging
  25 Sep 2026: bawaan kuning 30 / merah 60 menit (TMA tiap 1 menit, debit 6,
  suhu 10–23, pH/turbidity 1), sedangkan seluruh `curah_hujan*` dan
  `elevasi_sedimen` yang mengirim sekali per jam kuning 90 / merah 180. Satu ambang untuk semua
  membuat sensor per jam kuning 45 menit dari setiap jam. Hanya `source: measured` dan nilai realtime;
  formula, rencana, konstanta, dan realisasi yang punya tombol isian (diisi
  manual) sengaja dikecualikan. Banner ringkasan hanya memuat yang merah —
  yang kuning biasanya sekadar pengiriman tertunda. Jam halaman berdetak per
  menit, karena justru saat sensor diam tidak ada data baru yang memicu render.
- **Tren & Grafik**: hanya **satu** grafik dengan pemilih parameter (bukan 4
  grafik). Rentang default 24 jam. Daftar parameter diambil dari API tags. Garis
  grafik menampilkan nilai saat di-hover. Parameter terakumulasi (`*rainfall*`,
  `total_outflow`) diagregasi `sum`, sisanya `avg`; curah hujan digambar sebagai
  batang. **Pembanding periode** (`?compare=previous|last-year`): garis
  abu-abu putus-putus di sumbu waktu yang sama — tetap satu grafik. Periode
  pembanding memakai parameter, resolusi, dan agregasi yang persis sama, hanya
  rentangnya digeser; "tahun lalu" digeser satu tahun kalender, bukan 365 hari.
  Untuk curah hujan pembandingnya juga garis, bukan batang berdampingan — 168
  batang per jam (7 hari) tidak terbaca bila digandakan.
- **Laporan**: alur = pilih laporan → masuk daftar tabel → status `completed` →
  download. Hanya periode bulanan dan hanya parameter time series. Daftar laporan
  pakai paginasi + search, tanpa tombol "Perbarui"; polling berhenti sendiri
  begitu tidak ada baris `pending`/`processing`.
- **Forecasting**: khusus PLTA Soedirman, tanpa pemilih PLTA. PLTA-nya
  **dicari dari katalog lewat nama** (`findForecastingPlant`: `soedirman` /
  `mrica`), bukan UUID tertulis — id Soedirman berbeda per environment (staging
  `4b4747da…`, backend lain `727c0a7e…`), dan dulu Forecasting di staging
  meminta prediksi untuk PLTA yang tidak ada. `/dashboard/forecasting` selalu
  mengalihkan ke Soedirman. `points[].value` boleh `null` walau Swagger
  menyebutnya wajib: run 1 Okt 2026 00.30 WIB mengirim 24 titik kosong semua,
  dan halaman menampilkan "Prediksi terbaru belum berisi nilai", bukan galat
  kontrak.
- **User Management**: limit paginasi 10 item.
- **Overview**: peta Jawa Tengah dengan batas kabupaten/kota, garis aliran
  sungai, dan overlay **awan hujan Himawari-9** (NASA GIBS, kanal 13
  inframerah, tertinggal ~30–40 menit). Dulu RainViewer, tetapi RainViewer
  **tidak punya cakupan radar di atas Indonesia** — ubinnya selalu transparan
  dan peta cakupannya hitam di seluruh Jawa, jadi overlay-nya tidak pernah
  tampil sekalipun musim hujan. NASA IMERG ditolak karena tertinggal 3–4 jam.
  Ubin GIBS berupa gambar opak, jadi `components/map/cloud-mask.ts` membaca
  ulang warnanya menjadi suhu puncak awan lewat colormap GIBS dan hanya
  menggambar awan ≤ -32 °C. Ini perkiraan, bukan hujan terukur.
  **Hujan terukur** (penakar ARR milik PLTA, `features/monitoring/rainfall.ts`)
  melengkapinya: cincin biru di penanda PLTA + daftar di panel (PLTA tanpa
  koordinat tetap masuk daftar). Per 25 Sep 2026 hanya Soedirman (4 stasiun
  OPC), Sidorejo, dan Wadaslintang yang punya penakar. Jendelanya **bergulir 60
  menit** dan diringkas dengan **maksimum, bukan jumlah** — nilai ARR Soedirman
  berupa keadaan (03.56 = 0,2 · 04.00 = 0,2 · 04.06 = 0), jadi menjumlahkan
  menghitung hujan yang sama dua kali. Penakar mengirim 0 tiap jam saat kering,
  sehingga "tidak ada pembacaan > 3 jam" tampil **Tidak diperbarui**, bukan
  "tidak hujan". "Masih mengirim" dinilai juga dari `/trends`, karena waktu di
  snapshot `/monitoring/.../latest` untuk ARR Soedirman tertinggal berhari-hari.
  **Kategori intensitas BMKG belum ditampilkan** sampai backend mengonfirmasi
  periode nilai ARR Soedirman.
- **Upload** (`/dashboard/upload`) adalah menu sendiri, bukan lagi sub-menu
  Telemetering, dengan empat tab lewat `?tab=`: **Excel Bulanan**, **Excel Harian**
  (`/hydrology/daily/template.xlsx` + `/hydrology/daily/excel`), **Prakiraan
  Hujan**, dan **Input EVA** (dulu menu "Input GHW"). Tiga tab pertama berlaku
  untuk seluruh PLTA, jadi rutenya sengaja tidak memuat `pltaId`. Input EVA
  milik satu PLTA; PLTA-nya dipilih di dalam panel tab itu dan dibawa lewat
  `?plta=`. URL lama (`/dashboard/telemetering/upload`,
  `/dashboard/plta/<id>/input-ghw`) dialihkan ke sini.
- **Tombol "Input data" di Hidrologi Harian** mengikuti field `input`
  (`{parameter, station}`) yang dikirim server pada tiap metrik panel harian —
  server hanya mengisinya bila PLTA itu benar-benar punya tag `upload`-nya.
  `METRIC_UPLOAD_BINDINGS` di `telemetering/presentation.ts` tinggal **cadangan**
  untuk dua baris yang `input`-nya masih `null` per 21 Sep 2026: rencana turbin
  di PLTA yang tagnya tanpa station, dan realisasi spillway. Cadangan tidak
  berlaku bila tag parameter itu dipecah per station — baris Unit 4 di PLTA yang
  hanya punya T1–T3 harus tetap hanya-baca. Hapus tabelnya begitu backend
  mengisi `input` untuk kedua kasus itu.
- **Rekap Hidrologi sudah dipecah** (29 Sep 2026) dan submenunya dihapus dari
  Telemetering. **Ringkasan armada** (`/hydrology/monthly/overview`) kini satu
  baris di kepala halaman **Overview** (kanan judul): pencapaian armada, rata-rata
  antar-PLTA, jumlah tercapai/tidak, dan cakupan; pemilih periode dan tabel
  rata-rata ada di popover **Detail**. Sempat dicoba sebagai kolom 300px di
  samping peta, tetapi itu mengecilkan gambar peta 15–20% — kepala halaman
  punya ruang mendatar kosong, jadi tidak menambah tinggi maupun memotong peta.
  **Unduhan Excel** (`/hydrology/monthly/report.xlsx`,
  `/hydrology/daily/report.xlsx`) kini tab **Laporan Hidrologi** di menu Laporan
  (`?tab=hidrologi`), dengan cakupan PLTA sendiri — bukan PlantSwitcher, karena
  bawaannya seluruh PLTA. Periode (`?tahun=`, `?bulan=` atau `bulan=semua`) dan
  `?plta=` tetap di URL; alamat lama `/dashboard/telemetering/rekap` dialihkan
  ke tab itu beserta query-nya. Aturan bersama keduanya di
  `routes/dashboard/hydrology-report.ts`.
- **Hapus gambar prakiraan hujan** ada di Upload › Prakiraan Hujan, lewat
  pratinjau gambar lalu `ConfirmDialog`. Berlaku untuk seluruh PLTA dan tidak
  bisa dibatalkan; backend mencatatnya di jejak audit.
- **Panduan** (`/dashboard/panduan`): isi ditulis sebagai data di
  `routes/dashboard/panduan/guide.ts`, bukan markup, dan disaring per role
  dengan aturan yang sama seperti menu (`canAccessDataTools`, `canManageUsers`)
  — Viewer tidak melihat bab Upload, Katalog Data, User Management, maupun
  langkah input data. Tanpa screenshot supaya tidak basi; sebagai gantinya bagian
  tertentu punya **contoh tampilan** (`GuideExample.svelte`) yang merender
  komponen asli dengan data contoh di dalam wadah `inert`, jadi ikut berubah
  bila komponennya berubah.
  **Nama tombol dan label di sana ditulis persis seperti di layar; kalau label
  sebuah halaman diubah, kalimat panduannya ikut diubah.** Penekanan
  `**tebal**` dirender tanpa `{@html}`.
- **Upload Excel bulanan**: satu berkas mengisi seluruh PLTA. Tidak ada pratinjau — server tidak menyediakan mode uji
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
