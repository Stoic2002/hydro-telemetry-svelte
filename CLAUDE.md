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
  password), `/auth/refresh`, `/auth/me`. **Logout sekarang dicabut di server**
  (9 Okt 2026; dulu murni sisi klien karena endpoint-nya belum ada):
  `authStore.logout()` membersihkan sesi lokal **lebih dulu** lalu mengirim
  `POST /auth/logout` dengan access token di header **dan** `refresh_token` di
  badan (tanpa refresh token sesi bisa hidup lagi 7 hari). Galat dan waktu
  tunggu > 3 dtk diabaikan — server selalu membalas 204, dan keluar tidak boleh
  bisa gagal. **Keluar dari semua perangkat** (Profil Saya,
  `POST /auth/logout-all`) justru harus berhasil dulu: bila gagal, sesi lokal
  dipertahankan dan galatnya tampil. Admin bisa **Cabut sesi** user lain di
  User Management (`POST /users/{id}/revoke-sessions`; akunnya tetap aktif).
- **Sesi habis (13 Okt 2026)**: guard membawa halaman asal ke
  `/login?kembali=<path>` dan login kembali ke sana (`safeReturnPath` hanya
  menerima `/dashboard…`). Guard `load` hanya berjalan saat berpindah halaman,
  jadi `dashboard/+layout.svelte` punya `$effect` yang mengantar ke login begitu
  sesi turun di tengah pemakaian — kecuali `authStore.endedByUser` (tombol
  Keluar). `?sesi=habis` menampilkan "Sesi Anda sudah berakhir". Token yang
  ditolak saat pemulihan **tidak** menyetel `authStore.error`; dulu layar login
  langsung menampilkan "Username atau password salah".
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
- **Tren & Grafik — daftar tren per PLTA (13 Okt 2026)**: admin mengatur item,
  urutan, grup, dan nama khusus lewat **Atur daftar tren**
  (`TrendListSheet`, `PUT /trends/plta/{id}/series`, `canConfigureDisplay` =
  admin). Seluruh grafik datang dari satu `GET …/data`; item segrup = satu
  grafik, satuan kedua di sumbu kanan (dipetakan ke ruang sumbu kiri,
  `axisMapping`), `sumber: plan` digambar bertangga (`stepPoints` — `d3-shape`
  bukan dependensi langsung), curah hujan tunggal sebagai batang. Unduhan
  `data.xlsx`/`data.csv` di atas grafik (CSV diambil sebagai blob supaya BOM
  UTF-8 tetap ada). **Sejak 17 Okt 2026 hanya SATU grafik yang tampil**,
  dipilih lewat `?grafik=` (dulu seluruh grafik bertumpuk, dinilai boros).
  Pilihannya per grafik admin — grup tidak dipecah — dan nilainya kunci
  metrik (`tma_waduk`), dicocokkan dengan item mana pun di grafik itu; tak
  dikenal = grafik pertama (`selectTrendChart`). Data diminta hanya untuk item
  grafik itu (`?item=` berulang; `url.ts` kini mengirim array sebagai
  parameter berulang, bukan `a,b`), sedangkan unduhan tetap seluruh daftar. Tanpa `?grafik=`, bawaannya grafik pertama yang memuat item
  `measured` (17 Okt 2026) — item `plan` seperti Target TMA sering kosong, dan
  dulu halaman dibuka dengan kotak "Belum ada data". Grafik TMA Waduk dan TMA
  Tailrace diberi **garis batas** (Limpas/MOL, maks. hilir) dari panel harian
  hari ini (`withTrendReferences`); batas yang lebih jauh dari selebar rentang
  data hanya ditulis di keterangan beserta jaraknya, supaya garis TMA tidak
  rata. **PLTA yang `diatur: false` jatuh ke tampilan lama** di
  bawah ini (`ParameterTrendView`), supaya halamannya tidak kosong.
- **Tren & Grafik (cadangan, daftar belum diatur)**: hanya **satu** grafik dengan pemilih parameter (bukan 4
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
  download. Di atas daftar ada **Unduh langsung: Excel per jam**: sejak 13 Okt
  2026 `GET /trends/plta/{id}/data.xlsx` (resolusi 1h, kolom = daftar tren PLTA,
  maks. 366 hari) bila daftar trennya sudah diatur; selain itu cadangan
  `GET /dashboard/plta/{id}/timeseries.xlsx?start=&end=` (**deprecated**, 13
  kolom mockup PBS, maks. 62 hari inklusif). Rentang yang pasti ditolak tidak
  dikirim — `features/reports/timeseries-range.ts`. Hanya periode bulanan dan hanya parameter time series. Daftar laporan
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
  kontrak. **Akurasi prediksi yang tersaji** (`GET /forecasts/accuracy`, 9 Okt 2026) di dasar halaman: prediksi jatuh tempo 30 hari terakhir vs realisasi —
  MAE, RMSE, galat relatif, akurasi %, dan pecahan `per_versi` (kunci
  `fallback` = tanpa model). Responsnya objek bebas di Swagger, jadi schema
  Zod-nya toleran (metrik boleh hilang; `{n: 0, per_versi: {}}` = belum ada
  yang jatuh tempo). Rentangnya dihitung **sekali** per halaman dan dibulatkan
  ke jam (`forecastAccuracyWindow`) — rentang yang dihitung ulang tiap render
  mengubah kunci query dan memicu permintaan tanpa henti.
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
  Penanda PLTA yang jaraknya < 26 px **di layar** disebar melingkar dengan
  garis ke koordinat aslinya (`components/map/marker-spread.ts`, 13 Okt 2026);
  dihitung ulang saat ukuran peta berubah.
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
  (`/hydrology/daily/template.xlsx` + `/hydrology/daily/excel`), **Gambar
  Hujan** (empat gambar BMKG: prakiraan dan realisasi × curah dan sifat hujan),
  dan **Input EVA** (dulu menu "Input GHW"). Tiga tab pertama berlaku
  untuk seluruh PLTA, jadi rutenya sengaja tidak memuat `pltaId`. Input EVA
  milik satu PLTA; PLTA-nya dipilih di dalam panel tab itu dan dibawa lewat
  `?plta=`. URL lama (`/dashboard/telemetering/upload`,
  `/dashboard/plta/<id>/input-ghw`) dialihkan ke sini.
  **Pengelolaan kurva EVA (8 Okt 2026)** di tab Input EVA:
  tabel status seluruh PLTA (`GET /elevations/status`: `siap` / `draft` /
  `belum_ada`, dinilai dengan aturan kurva **berlaku** = published terbaru
  ber-tahun ≤ tahun berjalan, jadi kurva 2024 bisa berlaku di 2026) dan daftar
  kurva PLTA terpilih (`GET /elevations/curves`) dengan **Publish**,
  **Jadikan draft** (`PATCH /elevations/{id}/status`), dan hapus draft
  (`DELETE /elevations/{id}`; published ditolak 409). Kurva draft **tidak
  dipakai perhitungan apa pun** — dulu publish hanya bisa lewat Swagger, jadi
  unggahan dari aplikasi tidak berpengaruh. Publish langsung jalan; menurunkan
  kurva yang sedang berlaku dan menghapus draft lewat `ConfirmDialog`. Server
  menolak publish kurva yang titiknya identik dengan PLTA lain (`kembar`), dan
  peringatannya tampil di baris kurva. Setiap perubahan kurva menyegarkan cache
  hidrologi juga (`invalidateElevationCurves`), karena volume waduk dan
  turunannya ikut berubah.
- **Hidrologi Bulanan** menyajikan parameter berpasangan dalam satu tabel:
  kolom **Target / Prediksi / Realisasi**, satu baris per parameter
  (`buildMonthlyComparison` di `telemetering/presentation.ts`). Sel tanpa
  padanan memakai "—", bukan "N/A" — "N/A" berarti seharusnya ada tetapi belum
  terisi. **Periode (`?tahun=`, `?bulan=`) ada di URL**, bukan state komponen:
  pemilih PLTA membawa query string, jadi berpindah PLTA tidak mengembalikan
  periode ke bulan berjalan. Tiap baris energi memuat persentase dan status
  **dari server** (bukan dihitung ulang: persentase dibulatkan, 99,996% terbaca
  100). Keempat gambar hujan tampil sekaligus (baris Prediksi lalu Realisasi),
  bukan lewat tab — sejak 7 Okt 2026. Menu **Telemetering** di sidebar membuka Hidrologi
  Bulanan lebih dulu, bukan Harian.
- **Kontrak hidrologi bulanan berubah 5 Okt 2026** (Swagger prod dan staging
  identik). Nama lama (`aktual_hidrologi`, `prediksi_produksi_mwh`,
  `pencapaian_sd_prev_mwh`, `prosentase_pencapaian`, `image_sifat_hujan`, …)
  ditolak `422` pada `PUT`, dan responsnya memakai nama baru: energi bulan
  berjalan (`prediksi_ketersediaan_energi_primer`, `target_produksi_energi_listrik`,
  `realisasi_produksi_energi_listrik`) dan akumulasinya (`*_akumulasi_*`), dua
  persentase + dua status `tercapai`/`tidak_tercapai`, dan **empat** gambar
  (`prediksi`/`realisasi` × `sifat`/`curah` hujan). Overview kini dua blok
  `bulanan` dan `akumulasi`; ringkasan seluruh PLTA di Overview memakai blok
  **akumulasi**. Field wajib di schema Zod bulanan **sengaja tanpa `default`**
  agar perubahan kontrak berikutnya muncul sebagai galat, bukan N/A diam-diam.
  Metrik harian `hidden: true` (disembunyikan operator lewat
  `PUT /dashboard/plta/{id}/daily/visibility`) tetap dikirim server tetapi
  **tidak dirender** — disaring di `dashboardMetricRows`, jadi ikut hilang dari
  ringkasan sensor basi. Layar pengubahnya: ikon pengatur di sebelah judul
  tiap kartu panel Hidrologi Harian (`DailyVisibilitySheet` dengan prop
  `panel`; satu sheet per panel sejak 7 Okt 2026), satu sakelar per metrik dan
  hanya perubahan yang dikirim. Dirender untuk `canEditHydrologyData` (bukan Viewer);
  Swagger tidak menyebut batas peran, jadi itu keputusan frontend dan belum
  dikonfirmasi ke backend. Berlaku per PLTA untuk semua penggunanya.
  **Urutan metrik harian (6 Okt 2026)**: tiap metrik membawa `urutan` (posisi
  di panelnya, 0 = teratas) dan panel **dirender menurutnya** — urutan kunci
  JSON hanya mengikuti skema server. Daftar kunci di halaman Harian
  (`preferredKeys` pada `dashboardMetricRows`) tinggal cadangan bila `urutan`
  tidak dikirim, dan hanya dipakai bila **seluruh** metrik panel itu tanpa
  `urutan` (dua sumber urutan tidak dicampur). Urutan diubah di sheet yang
  sama dengan **seret-lepas** (`components/ui/SortableList.svelte`) — pointer
  events, bukan drag-and-drop HTML5, karena yang terakhir mati di layar sentuh;
  pegangannya juga bisa digerakkan dengan panah atas/bawah. Mouse menyeret dari
  mana saja di baris, sentuhan hanya dari pegangan (supaya daftar tetap bisa
  digulir). Gerak didengar di `window`, bukan di pegangan: baris yang dipindah
  di DOM kehilangan pointer capture, dan dulu itu membuat seretan tersangkut. Draf sheet hanya
  memuat yang disentuh operator (sakelar maupun urutan), bukan salinan seluruh
  status: query-nya di bawah `dashboardRoot`, dan salinan penuh akan
  membatalkan perubahan operator lain saat disimpan. Urutan dikirim per panel
  berisi **seluruh** kuncinya (server menaruh kunci yang tak disebut kembali
  ke posisi bawaan); **Urutan bawaan** mengirim `[]` dan hanya muncul untuk
  panel yang `urutan_diatur`-nya pernah `true`.
  **Istilah label mengikuti lembar client (mockup "FORECAST BULAN")**, bukan
  nama field BE dan bukan istilah lisan operator — penyebutan lisan mereka
  sering berganti (TMA / WL / water level / elevasi). Di lembar itu prediksi
  energi disebut **"Prognosa Ketersediaan Energi Primer"** (potensi energi
  primer, bukan produksi listrik), sedangkan target dan realisasinya
  **"Produksi Energi Listrik"**; "Kesimpulan" = status `tercapai` /
  `tidak_tercapai`. Kolom tabel tetap bernama Prediksi/Target/Realisasi, dengan
  keterangan di bawahnya. **Arti akumulasi sudah terkonfirmasi** (Swagger 7 Okt
  2026): setiap `*_akumulasi_*` = Januari s.d. bulan barisnya, termasuk bulan
  itu sendiri. Nama kunci `rerata` di overview juga terkonfirmasi dari respons
  staging 6 Okt 2026: keenamnya persis nama field bulanan
  (`OVERVIEW_AVERAGE_KEYS`).
  **Ganti nama (13 Okt 2026, khusus admin = `canConfigureDisplay`)**: metrik
  harian per PLTA lewat isian di `DailyVisibilitySheet` (`PUT …/daily/labels`,
  dikirim sesudah tata letak — dua endpoint, dua hak akses); bidang bulanan
  untuk seluruh PLTA lewat tombol **Nama bidang** di Hidrologi Bulanan
  (`MonthlyFieldLabelSheet`, `PUT /hydrology/monthly/labels`). Draf hanya
  memuat isian yang disentuh (`labelChanges`); kosong = `null` = nama bawaan.
  Panel harian sudah merender `label` server, jadi nama baru langsung tampil;
  tabel bulanan **belum** (masih di-hold, lihat di bawah) — nama bulanan baru
  terlihat di template, Excel, dan pesan impor.
  **Swagger 7 Okt 2026 menambah `label`** (nama tampilan, mis. "… s.d. Bulan
  September 2026") di data bulanan, blok overview (`label`, `label_prediksi`,
  `label_target`), `rerata`, dan grafik (`label`, plus `sd_bulan` per titik).
  Backend meminta nama baris dirender dari `label`; **FE sengaja belum
  memakainya** — penyesuaian nama di Hidrologi Bulanan di-hold sampai
  diputuskan tim, jadi istilah lembar client di atas masih berlaku. Yang sudah
  dipakai: `sd_bulan` di tooltip grafik akumulasi, dan `periode_awal` /
  `periode_akhir` blok overview. Untuk rentang, blok `bulanan` = total seluruh
  rentang, sedangkan blok `akumulasi` = **satu bulan**, yang terakhir berdata
  (menjumlahkan akumulasi lintas bulan menghitung bulan yang sama berkali-kali).
  Kartu Overview memakai blok akumulasi, jadi ia menulis "Akumulasi s.d.
  <bulan itu>", bukan rentang yang dipilih. Template Excel bulanan kini dua
  baris judul: baris 1 nama tampilan, baris 2 kunci yang dibaca importir.
- **Tambahan Swagger 5 Okt 2026** (di luar kontrak bulanan): **Excel harian**
  punya opsi `per_jam` (template 24 baris per PLTA per tanggal) dan `isi_kosong`
  (`lewati` bawaan | `bawa_terakhir`; hasilnya `titik_diwarisi`) — dikirim hanya
  bila dipilih. **Tag** punya `label`, `min_valid`, `max_valid`; batas valid
  diubah lewat `PATCH /tags/{id}/bounds` (**kedua sisi selalu dikirim**, karena
  sisi yang hilang ditimpa `null`; server menolak `min` ≥ `max`) dan berlaku
  ke depan saja. Dirender untuk `canEditTagBounds` (non-Viewer, keputusan
  frontend). **Tren** menyebut sumber seri yang sungguh dibaca server
  (`station` + `aggregated_stations`), bukan lagi selalu "agregasi lintas
  stasiun". **Laporan** menampilkan `requested_by_username`.
- **Rentang periode hidrologi bulanan** (`tahun`, `bulan`, `tahun_akhir`,
  `bulan_akhir`; maks 60 bulan, 400 bila terbalik): aturan isian kosong
  mengikuti server — `bulan` kosong = Januari, tahun akhir kosong = tahun awal,
  bulan akhir kosong = `bulan` (satu bulan) atau Desember bila `bulan` juga
  kosong. Semuanya di `routes/dashboard/hydrology-report.ts`
  (`resolveReportRange`, `reportRangeError`) dan dipakai label, validasi, dan
  nama berkas supaya sepakat dengan server; rentang yang pasti ditolak **tidak
  dikirim** (query `enabled` mati). Rentang ada di **overview** (kaki kartu ringkasan di dasar peta,
  `?tahun_akhir=&bulan_akhir=`) dan **laporan bulanan** (tab Laporan Hidrologi);
  **laporan harian tidak mendukung rentang**. Mengubah beberapa parameter URL
  harus dalam satu `goto` (`setPeriods`/`setFilters`) — dua `goto` berturut-turut
  sama-sama membaca URL lama dan yang kedua membatalkan yang pertama.
- **Grafik akumulasi** (`GET /hydrology/monthly/chart`) ada di Hidrologi
  Bulanan, per PLTA aktif untuk tahun terpilih (Jan–Des). Bulan yang belum
  diisi bernilai `null` dan **tidak diberi batang**, bukan batang nol (sejak 13 Okt 2026
  grafiknya batang berdampingan target/realisasi, bukan dua garis; sumbu Y
  selalu dari nol). Tanpa `plta_id`
  nilainya JUMLAH seluruh PLTA dan `n_target`/`n_realisasi` harus diperiksa
  sebelum kedua garis dibandingkan — komponennya sudah memperingatkan bila
  tidak sama, tetapi grafik gabungan seluruh PLTA belum ada layarnya. Kunci
  query-nya di bawah `dashboardRoot(pltaId)` supaya ikut segar setelah isian
  bulanan diubah. Test komponen grafik butuh stub `window.matchMedia` di
  `src/test/setup.ts` (layerchart → `svelte/motion`).
- **Tombol "Input data" di Hidrologi Harian** mengikuti **hanya** field `input`
  (`{parameter, station}`) dari server — di tingkat metrik, atau per entri
  `stations` untuk metrik multi-stasiun (pintu spillway G1–G4 jadi pilihan
  Station di satu form). Sejak 13 Okt 2026 tidak lagi memakai daftar tag maupun
  tabel cadangan `METRIC_UPLOAD_BINDINGS` (dihapus): backend menegaskan tujuan
  **tidak boleh diturunkan dari `source`** — Pintu Air ber-`source` `plan`
  padahal tagnya tak ada, dan `input` yang tidak `null` dijamin diterima.
  **Target TMA sengaja `input: null`** ("ubah lewat RTOW"), jadi tanpa tombol;
  padahal upload RTOW sudah diputuskan tidak dipakai — cara mengisinya **belum
  dikonfirmasi backend**.
- **Form isian harian punya tab Hapus Data dan template (17 Okt 2026)**:
  `DELETE /telemetry/points` (rentang tanggal+jam, **inklusif di kedua ujung**,
  bawaan satu hari penuh 00.00–23.59, maks. 366 hari, selalu lewat
  `ConfirmDialog`). Server hanya menghapus baris `quality='manual'` pada tag
  `upload`, jadi data sensor aman; 0 titik terhapus bukan galat — panel tetap
  terbuka. Tab Upload Excel kini punya **Unduh Template**
  (`GET /telemetry/upload-template.xlsx`, satu parameter + station; harian per
  jam, bulanan per jam, atau bulanan per hari) yang **dipra-isi nilai
  tersimpan**. Rentang yang pasti ditolak tidak dikirim
  (`buildDeleteRange`, `telemetryTemplateQuery`). Unggah maupun hapus kini
  ikut menyegarkan cache monitoring `latest` dan tren PLTA itu.
  Swagger template menyebut `resolusi=hari` untuk "Target TMA", padahal
  daily tetap menulis Target TMA `input: null` ("ubah lewat RTOW") — **perlu
  ditanyakan ke backend**.
- **Mode tampilan Hidrologi Harian** (13 Okt 2026): dua sumbu di URL yang bisa
  dipadukan — `?zona=` (hulu/bendungan/hilir; satu zona = kartu selebar
  halaman, baris dua kolom) dan `?baris=` (perhatian/manual/ringkas;
  `filterMetricRows`). Baris tersaring tampil semua tanpa batas ringkas lima
  baris. "Isian manual" tidak ditawarkan ke Viewer. Isi mode Ringkas
  (`SUMMARY_METRIC_KEYS`) masih usulan dan menunggu kesepakatan tim. Mengganti
  penyebut DMN mempertahankan panel lama (placeholder) dan hanya men-shimmer
  SHFL dan DMN Beban Penuh.
- **Penanda sumber panel harian hanya empat** (13 Okt 2026): Realtime
  (`measured`), Formulasi (`derived`), Input (`plan`), Konstanta (input)
  (`constant`). "Konstanta" polos dan "Belum tersedia" dihapus atas permintaan
  tim; baris tanpa nilai tampil N/A dengan penanda sumbernya.
  `unavailable` hanya tersisa untuk sel kosong tabel Hidrologi Bulanan.
- **Rekap Hidrologi sudah dipecah** (29 Sep 2026) dan submenunya dihapus dari
  Telemetering. **Ringkasan hidrologi seluruh PLTA** (`/hydrology/monthly/overview`)
  kini **kartu yang menempel di dasar peta Overview** (7 Okt 2026), bergaya
  sama dengan kartu Awan Hujan/Legenda dan berhenti di kiri kolom kanannya
  (slot `bottomOverlay` di `JavaMap`, hanya dari `lg`; di layar sempit kartu
  turun ke bawah peta). Isinya pencapaian seluruh PLTA, rata-rata antar-PLTA,
  status per PLTA, dan cakupan. **Pemilih bulan/tahun tetap di kepala halaman**
  (`FleetSummaryControls`, satu baris). Rata-rata per PLTA, rentang
  ("Sampai"), dan unduh Excel ada di **kaki kartu yang sama**, dua baris padat,
  selalu terlihat (13 Okt 2026). Dulu kartu **Detail ringkasan** terlipat di
  kolom kanan peta (`FleetSummaryDetail`, slot `rightPanel` — keduanya dihapus);
  tim menilai buka-tutupnya membuat isinya tidak ketahuan. Keduanya membaca
  periode yang sama dari URL lewat `overview/fleet-summary.svelte.ts`.
  `Select` memakai `w-full` di akarnya: lebar tetap dipasang di pembungkusnya,
  bukan lewat prop `class` (yang kalah dan membuat pemilihnya bertumpuk). Bawaannya bulan berjalan; bila kosong,
  kartu menawarkan bulan sebelumnya. Riwayat penempatan: kolom 300px di samping
  peta (mengecilkan peta 15–20%), lalu strip di kanan judul (kurang terlihat),
  lalu panel di bawah peta (bukan yang dimaksud tim).
  **Unduhan Excel** (`/hydrology/monthly/report.xlsx`,
  `/hydrology/daily/report.xlsx`) kini tab **Laporan Hidrologi** di menu Laporan
  (`?tab=hidrologi`), dengan cakupan PLTA sendiri — bukan PlantSwitcher, karena
  bawaannya seluruh PLTA. Periode (`?tahun=`, `?bulan=` atau `bulan=semua`) dan
  `?plta=` tetap di URL; alamat lama `/dashboard/telemetering/rekap` dialihkan
  ke tab itu beserta query-nya. Aturan bersama keduanya di
  `routes/dashboard/hydrology-report.ts`.
- **Hapus gambar hujan** ada di Upload › Gambar Hujan (dulu "Prakiraan Hujan"; kunci
  tab `?tab=prakiraan` tidak berubah), lewat
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
