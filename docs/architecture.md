# Frontend Architecture

## Ringkasan keputusan

Arsitektur project adalah **feature-based modular frontend**. Pembagian layer
terinspirasi Feature-Sliced Design, tetapi tidak mengikuti nomenklatur FSD secara
strict. Di dalam feature, akses data memakai Repository Pattern dan adapter HTTP.

Struktur ini dipertahankan dari versi React karena justru dialah yang membuat
penulisan ulang ini murah: **74 berkas kontrak API, repository, dan model
berpindah tanpa satu baris pun berubah**, karena tidak satu pun menyentuh
framework.

Tujuannya:

- perubahan pada satu domain tetap terlokalisasi;
- halaman fokus pada komposisi, bukan detail transport atau parsing;
- kontrak backend divalidasi pada boundary;
- logic murni dapat diuji tanpa merender apa pun;
- UI lintas domain dapat dipakai ulang tanpa circular dependency.

## Dependency direction

Dependency mengalir dari layer yang lebih spesifik menuju layer yang lebih umum:

```text
routes  (+page.svelte, +layout.svelte, +page.ts, +layout.ts)
 ├─ core       (composition root: query client, guard, error reporting)
 ├─ features
 │   ├─ feature components
 │   ├─ query/mutation factories
 │   ├─ repository interface + implementation
 │   ├─ state sesi/klien milik domain (`*.svelte.ts`)
 │   └─ model/schema
 ├─ components
 ├─ api/http
 └─ shared  (termasuk infrastruktur UI bersama seperti notifikasi)
```

Tidak ada lapisan `store` tersendiri. Nama itu kosakata Zustand/Redux; di sini
state klien tinggal bersama pemiliknya — di dalam feature bila milik satu domain,
di `shared` bila dipakai lintas fitur.

Aturan praktis:

1. `shared` tidak boleh mengimpor `features`, `routes`, atau `core`.
2. `api/http` tidak mengetahui model UI suatu feature.
3. Feature tidak boleh mengimpor rute.
4. Rute boleh menggabungkan beberapa feature untuk memenuhi kebutuhan layar.
5. Komponen yang hanya dipakai satu rute disimpan di folder rute itu. Tidak ada
   folder `layouts/` terpisah: di SvelteKit layout **adalah** rute, jadi komponen
   navigasi sidebar tinggal di `routes/dashboard/` bersama `+layout.svelte` yang
   memakainya.
6. Komponen dipindahkan ke `components/` hanya setelah benar-benar reusable
   lintas fitur.
7. Alias `$lib` dan folder `src/lib` **tidak dipakai**. `$lib/features/...`
   kurang terbaca dibanding `$features/...`, jadi alias project di
   `vite.config.ts` yang berlaku: `$api`, `$components`, `$core`, `$features`,
   `$shared`.

## Tanggung jawab folder

### `src/routes`

Rute SvelteKit. Menggantikan `src/pages` + `react-router` di versi React.

Perbedaan yang penting: **guard dijalankan di `load`, bukan saat render.** Di
React, `ProtectedRoute` dan kawan-kawan adalah komponen — artinya halaman
terlindungi sempat dirender sebelum guard memutuskan mengalihkan. Sekarang
pengalihan terjadi sebelum ada yang dirender.

Rantainya:

```text
routes/+layout.ts        ssr=false, menuntaskan pemulihan sesi
routes/dashboard/+layout.ts        requireAuthenticated()
routes/dashboard/plta/[pltaId]/+layout.ts   validasi id + memuat PLTA aktif
routes/dashboard/plta/[pltaId]/<halaman>/+page.ts   guard peran bila perlu
```

**`load` induk dan anak berjalan paralel**, kecuali anak memanggil
`await parent()`. `load` root yang menunggu sesi karena itu TIDAK menjamin sesi
sudah pulih saat guard di bawahnya dijalankan. Dulu guard ditulis sinkron dengan
anggapan sebaliknya, dan akibatnya setiap refresh browser berakhir di Overview:
guard membaca `isAuthenticated = false` sebelum `/auth/me` selesai, mengalihkan
ke `/login`, lalu `/login` — yang saat itu sesinya sudah pulih — mengalihkan ke
`/dashboard`. Sekarang setiap guard memanggil `await authStore.initialize()`
sendiri (idempoten, berbagi satu promise), dan `load` yang memanggil API
memanggil `await parent()` lebih dulu.

PLTA aktif hasil `load` dibagikan ke seluruh halaman di bawahnya lewat context,
dan yang disimpan adalah **accessor**, bukan nilai jadi. Berpindah PLTA hanya
mengganti param `[pltaId]`; route id-nya tetap sama, jadi SvelteKit memperbarui
`data` tanpa me-remount halaman dan blok `<script>` tidak dijalankan ulang.
Konsumen karena itu wajib membaca lewat `$derived(getActivePLTA())` —
men-destructure sekali saat init akan membekukan halaman pada PLTA yang pertama
kali dibuka.

Berkas yang tidak diawali `+` di dalam folder rute **bukan rute**; itulah tempat
komponen khusus halaman (mis. `routes/dashboard/catalog/CatalogTable.svelte`) dan
komponen khusus layout (`routes/dashboard/NavGroup.svelte`, `NavItem.svelte`,
`NavSubItem.svelte`, `nav-active.ts`).

Halaman yang mulai besar dipecah menjadi berkas pendamping di folder yang sama,
dengan `presentation.ts` berisi transformasi data murni yang bisa diuji tanpa
DOM — pola yang sama seperti versi React.

### `src/core`

Composition root: `query-client.ts`, `guards.ts`, `error-reporting.ts`. Tidak
berisi business logic.

Namanya `core`, bukan `app`, karena `$app` milik SvelteKit (`$app/navigation`,
`$app/state`) sehingga folder `src/app` tidak akan pernah bisa punya alias —
isinya terpaksa diimpor lewat path relatif sepanjang
`../../../../../app/guards`. Nama itu juga bertabrakan secara konsep dengan
`src/app.html`. Aliasnya sekarang `$core`: `$core/guards`, `$core/query-client`,
`$core/error-reporting`.

### `src/features`

Satu folder per kapabilitas domain. Struktur feature dapat berisi:

```text
features/<domain>/
├── api/
│   ├── <domain>-repository.ts       # port/interface
│   ├── http-<domain>-repository.ts  # HTTP adapter
│   ├── repository.ts                # adapter aktif
│   ├── queries.ts                   # boundary svelte-query
│   └── schemas.ts                   # kontrak response API
├── components/
├── model.ts
└── error.ts
```

Tidak semua feature wajib punya semua folder. Hindari folder kosong hanya untuk
mengikuti template.

**Konvensi query.** Factory diberi awalan `create*`, bukan `use*`, mengikuti
penamaan svelte-query. Parameternya **accessor**, bukan nilai:

```ts
// React
const query = usePLTADetailQuery(pltaId);

// Svelte
const query = createPLTADetailQuery(() => pltaId);
```

Ini bukan pilihan gaya. svelte-query v6 membaca opsi lewat fungsi; parameter
yang dikirim sebagai nilai biasa akan membekukan query pada nilai saat komponen
pertama dirender dan tidak pernah mengambil ulang saat filter berubah.

**State sesi/klien milik domain tinggal di feature-nya.** Contohnya
`features/auth/auth-store.svelte.ts`: kelas dengan field `$state`, dulu store
Zustand. Pembacaan `authStore.isAuthenticated` sudah reaktif dengan sendirinya —
tidak ada lagi selector. Yang membacanya (guard, halaman login, layar profil)
mengaksesnya lewat barrel `features/auth`, bukan lewat path berkasnya.

Token sesi sendiri tetap di `api/http/auth-session`; `authStore` hanya memegang
profil dan status yang dibaca UI, supaya lapisan transport tidak perlu mengenal
model UI.

Data server yang punya lifecycle fetching, stale state, dan invalidation tetap di
TanStack Query, bukan di sini.

### `src/api/http`

Infrastruktur transport lintas fitur: penyusunan URL dan query string,
header/auth session, refresh token, parsing response, dan normalisasi
`ApiError`. Mapping payload backend menuju model domain tetap tanggung jawab
HTTP repository pada feature terkait.

### `src/components`

Komponen presentasional lintas fitur. `controls` berisi kontrol dasar — tombol,
field, toggle, badge, penanda; `ui` berisi komponen berperilaku lebih lengkap
seperti dialog dan sheet. (Dulu `controls` bernama `atoms`, istilah Atomic
Design; diganti karena tidak menjelaskan isinya.)

Perilaku overlay — kunci fokus, kunci scroll, Escape, pengembalian fokus ke
pemicu — datang dari **bits-ui**, bukan ditulis tangan. `shared/lib/useFocusTrap`
di versi React tidak ikut diport karena tidak ada lagi yang memakainya.

Satu komponen per berkas. `SourceMarker`/`SourceMarkerLegend` dan
`UserFormSheet` (create/edit) yang di React satu berkas, di sini dipecah.

### `src/shared`

- `shared/lib`: konfigurasi atau integrasi fundamental — environment, timezone,
  unduhan, pelaporan error, `form.svelte.ts`, `object-url.svelte.ts`, dan
  `notification.svelte.ts`.
- `shared/utils`: fungsi kecil, pure, bebas state — formatter angka dan grafik.

Boleh berisi state selama state itu benar-benar lintas fitur.
`shared/lib/notification.svelte.ts` (toast global) contohnya: dipakai hidrologi,
unggahan telemetri, dan manajemen pengguna, jadi ia infrastruktur UI bersama —
bukan milik satu domain. State yang hanya dipakai satu domain tetap di feature
itu.

Utility khusus domain jangan ditempatkan di sini; simpan dekat feature atau rute
yang memilikinya.

### `static`

Berkas yang harus mempertahankan nama/path dan diakses lewat URL root: logo,
favicon, GeoJSON peta, template Excel, dan foto bendungan.

**Gambar bendungan** (`static/dam/<nama>.avif`, dirujuk
`features/plta/dam-imagery.ts`) punya syarat tambahan:

- rasionya **milik masing-masing bendungan**, ditulis di field `frame` pada
  `getDamImagery()`. `<figure>` mengambil `aspect-ratio`-nya dari situ, jadi
  bingkai dan viewBox tidak bisa lepas sinkron. Berkas yang rasionya tidak sama
  dengan `frame`-nya akan terpotong dan penandanya meleset;
- lebar sekitar **1600px**. Memutar citra untuk meluruskan arah aliran memangkas
  sudut-sudut kosong dan bisa membuang lebih dari separuh bingkai, jadi
  pertimbangkan itu sebelum memutar;
- JPG atau WebP terkompresi, **di bawah ~300 KB**. Foto drone mentah beberapa MB
  mengembalikan persis masalah lambat yang justru sedang dihilangkan dengan
  meninggalkan citra satelit on demand;
- orientasi sudah benar saat disimpan. Tidak ada lagi rotasi di kode — kalau
  berkasnya diputar, anchor **dan** sudut `field` tiap zona harus dihitung ulang
  terhadap bingkai yang baru;
- **tidak ada overlay keterangan di atas citra.** Kotak nama bendungan dan kredit
  sumber pernah ada lalu dihapus atas permintaan tim. Isi berkas yang sekarang
  masih citra Esri World Imagery yang diambil sekali, jadi selama belum diganti
  foto milik sendiri, pemakaiannya berjalan tanpa kredit yang biasanya
  disyaratkan.

## Data flow API

```text
halaman Forecasting
  → createForecastQuery
  → ForecastingRepository
  → httpForecastingRepository
  → apiRequest
  → backend
```

Response backend melewati schema Zod, lalu dipetakan dari format transport
(`snake_case`) ke model UI. Komponen tidak menerima payload mentah backend bila
repository sudah menyediakan model domain.

## Batas antara `load` dan TanStack Query

Ada dua lapisan pengambilan data dan keduanya mudah tertukar. Pemisahnya bukan
jenis endpoint, melainkan **apa yang masuk akal ditampilkan selama datanya belum
ada**.

**`load` hanya untuk data yang menentukan apakah rute boleh dirender sama
sekali.** Yang masuk kategori ini di project ini cuma empat hal:

| Tempat                                      | Yang diselesaikan                                                   |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `routes/+layout.ts`                         | Pemulihan sesi (`authStore.initialize()`)                           |
| `routes/dashboard/**/+page.ts`              | Guard peran dari `$core/guards`                                     |
| `routes/dashboard/plta/[pltaId]/+layout.ts` | PLTA aktif (`ensurePlantDetail`)                                    |
| `redirectToDefaultPLTA`                     | Tujuan alih untuk tautan lama tanpa `pltaId` (`ensurePlantCatalog`) |

Ciri bersamanya: selama data itu belum selesai, **tidak ada layar yang masuk akal
untuk digambar**. Menunda navigasi lebih benar daripada merender halaman
setengah jadi yang sedetik kemudian dialihkan. Imbalannya, turunan boleh
menganggap datanya pasti ada — itulah sebabnya `getActivePLTA()` tidak punya
cabang "PLTA belum termuat" dan guard di bawah root bisa sinkron.

**Seluruh data isi layar lewat `create*Query` di `features/*/api/queries.ts`.**
Tabel telemetri, grafik 24 jam, daftar laporan, tag PLTA, snapshot monitoring —
semuanya punya lifecycle fetching, stale, dan invalidation; boleh muncul bertahap
di balik skeleton, boleh gagal sendiri tanpa merobohkan rute, dan boleh
di-refetch tanpa navigasi.

Uji cepat saat ragu:

- Kegagalannya berarti "rute ini tidak boleh dibuka" → `load`, dengan `error()`
  atau `redirect()`.
- Kegagalannya berarti "satu kartu menampilkan pesan dan tombol coba lagi" →
  query.

Memuat isi layar di `load` merugikan dua kali: setiap navigasi jadi menunggu
seluruh permintaan selesai, dan caching, deduplication, invalidation setelah
mutation, serta refetch tanpa navigasi ikut hilang.

Satu aturan turunan: `load` yang memang butuh data mengambilnya **lewat cache
query**, bukan `fetch` langsung — `ensurePlantDetail(queryClient, ...)` dan
`ensurePlantCatalog(queryClient)`. Dengan begitu PLTA aktif yang dipakai `load`
dan yang dibaca komponen lewat query adalah entri cache yang sama, dan
invalidation setelah mutation tetap berlaku untuk keduanya.

## Batasan keras: singleton modul aman hanya selama SSR mati

`queryClient` (`core/query-client.ts`) dan `authStore`
(`features/auth/auth-store.svelte.ts`) sama-sama dibuat sekali di level modul dan
dibagi ke seluruh aplikasi. Di browser itu benar: satu tab adalah satu pengguna.

Yang membuatnya aman **hanya** satu baris di `src/routes/+layout.ts`:

```ts
export const ssr = false;
```

> **Peringatan.** Kalau suatu saat SSR dinyalakan di rute mana pun, kedua
> singleton ini **harus dibongkar lebih dulu**. Di server, modul dibagi antar
> request — bukan antar pengguna. Satu `authStore` berarti sesi pengguna A
> terbaca oleh request pengguna B; satu `queryClient` berarti data PLTA, laporan,
> dan profil pengguna A tersaji dari cache ke pengguna B.

Ini bom waktu yang diam: aman sekarang, dan tidak ada satu pun uji atau
typecheck yang akan gagal ketika seseorang menyalakan SSR di satu rute tanpa tahu
konsekuensinya. Kalau langkah itu benar-benar diambil, `queryClient` harus dibuat
per request dan dialirkan lewat data `load`, sementara `authStore` harus jadi
context per request — bukan lagi objek modul.

## State management

Gunakan **TanStack Query** untuk hasil endpoint REST, caching, deduplication,
loading/error state, dan invalidation setelah mutation.

Gunakan **runes dalam berkas `.svelte.ts`** untuk auth/session, notifikasi, dan
client state yang perlu diakses lintas rute. Tempatnya mengikuti kepemilikan:
`features/auth/auth-store.svelte.ts` untuk sesi, `shared/lib/notification.svelte.ts`
untuk toast.

Gunakan **state lokal** untuk yang hanya dimiliki satu komponen atau halaman:
dialog terbuka, filter sementara, seleksi.

Filter yang perlu bisa dibagikan lewat tautan — tab katalog, parameter dan
periode grafik — disimpan di **query string**, bukan state komponen.

## Realtime

`features/monitoring/realtime/monitoring-stream.svelte.ts` menulis pesan
WebSocket **langsung ke cache TanStack Query**, bukan ke state komponen.
Akibatnya layar mana pun yang membaca query yang sama ikut diperbarui tanpa
menyalurkan data lewat props.

Yang ditangani di dalamnya: backoff eksponensial dengan jitter, batas percobaan,
watchdog untuk socket yang terbuka tapi berhenti mengirim data, dan refresh token
saat server menutup dengan kode autentikasi. Keempatnya dikunci
`monitoring-stream.svelte.test.ts` dengan WebSocket palsu dan timer palsu — tidak
ada jalur lain untuk mengujinya.

## Testing strategy

Test runner: Vitest, dibagi dua project.

| Project  | Environment | Berkas             |
| -------- | ----------- | ------------------ |
| `server` | node        | `*.test.ts`        |
| `client` | jsdom       | `*.svelte.test.ts` |

Project `client` memakai `resolve.conditions: ['browser']`. Tanpa itu Svelte
ter-resolve ke build server-nya dan `mount()` tidak tersedia.

Berkas uji yang butuh DOM tetapi bukan komponen ditandai per berkas dengan
`// @vitest-environment jsdom` — bukan dengan melonggarkan seluruh project.
Itulah yang membuat ketergantungan DOM yang tidak disengaja pada lapisan domain
langsung ketahuan sebagai kegagalan.

Svelte tidak punya padanan `renderHook`. Yang butuh context komponen — context
route, `QueryClientProvider`, atau `$effect` — diuji lewat komponen kecil
`*.test-harness.svelte` di sebelah berkas ujinya, bukan dengan merender halaman
utuh.

Piramida yang diharapkan:

1. Banyak unit test untuk mapper, parser, schema, formatter, dan selector.
2. Sejumlah component test untuk interaksi kritis.
3. E2E untuk happy path utama, saat environment backend test sudah stabil.

Setiap perubahan harus lulus:

```bash
bun run check
```

## Checklist modul baru

- Apakah code ditempatkan di domain yang memilikinya?
- Apakah response eksternal divalidasi sebelum digunakan?
- Apakah halaman hanya melakukan komposisi dan orkestrasi?
- Apakah helper murni punya unit test?
- Apakah parameter query dikirim sebagai accessor, bukan nilai?
- Apakah data yang diambil di `load` benar-benar menentukan boleh-tidaknya rute
  dirender? Kalau tidak, ia milik `create*Query`.
- Apakah tidak ada singleton level modul baru yang menyimpan data milik satu
  pengguna?
- Apakah komponen interaktif tetap dapat dijangkau keyboard?
- Apakah tidak ada dependency dari layer umum menuju layer yang lebih spesifik?
