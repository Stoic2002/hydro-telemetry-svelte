# Pertanyaan untuk Backend

Disusun 27 Okt 2026 dari tim frontend (tele-frontend-v2 Svelte). Semua poin
sudah dicocokkan dengan Swagger prod (`192.168.105.99:8000/docs`) hari ini;
Swagger staging identik.

Urutan menurut dampak: **A** bisa membuat data di layar keliru atau fitur tidak
bisa dipakai, **B** soal hak akses, **C** kerapian kontrak.

---

## A. Prioritas tinggi

### A1. Cara mengisi Target TMA

- **Yang tertulis di Swagger**
  - `GET /dashboard/plta/{plta_id}/daily`: _"Target TMA ber-`input` `null`
    karena bukan tag telemetri — ubah lewat RTOW."_
  - `GET /telemetry/upload-template.xlsx`: `resolusi=hari` disebut _"untuk
    nilai harian seperti Target TMA"_.
- **Masalahnya**: upload RTOW sudah diputuskan tidak dipakai di aplikasi,
  jadi Target TMA saat ini **tidak bisa diubah dari aplikasi sama sekali**.
  Kedua bagian Swagger di atas juga saling bertentangan.
- **Pertanyaan**: Target TMA diisi lewat apa? Bisakah barisnya diberi `input`
  di data harian (supaya muncul tombol **Input data**), atau lewat template
  Excel per parameter?

### A2. Sumber kebenaran nilai konstanta (`const_*`)

- **Yang tertulis di Swagger**: di data harian, `source: constant` berarti
  _"konfigurasi PLTA"_ (`plta.constants`). Di sisi lain, `const_tma_limpas`,
  `const_swc`, dan konstanta lain diterima `POST /telemetry/upload` (dan
  ditolak di template/unggah Excel karena _"tak berdimensi waktu"_).
- **Yang dilakukan frontend**: form isian konstanta hanya meminta **Nilai**
  dan mengirimnya sebagai satu titik pada waktu sekarang (WIB), dengan anggapan
  **nilai unggahan terbaru** yang dipakai.
- **Pertanyaan**: kalau operator mengisi `const_tma_limpas` lewat
  `POST /telemetry/upload`, apakah nilai itu yang dipakai panel harian dan
  seluruh perhitungan? Atau yang dipakai tetap `plta.constants`? Bagaimana
  keduanya berhubungan?

### A3. Periode nilai ARR (curah hujan) Soedirman

- **Konteks**: Overview menampilkan hujan terukur dari penakar ARR. Contoh nilai
  ARR Soedirman: 03.56 = 0,2 · 04.00 = 0,2 · 04.06 = 0 — terlihat seperti
  keadaan, bukan akumulasi. Swagger tidak menyebut periodenya.
- **Pertanyaan**:
  1. Nilai ARR itu curah hujan per periode berapa (per 6 menit, per jam, atau
     kumulatif)?
  2. Waktu pembacaan ARR Soedirman di `GET /monitoring/plta/{id}/latest`
     tertinggal berhari-hari dibanding `/trends`. Apakah itu bug?
- **Dampak**: kategori intensitas hujan BMKG di Overview ditahan sampai ini
  jelas.

---

## B. Hak akses (Swagger tidak menyebut peran)

Sementara ini frontend memutuskan sendiri. Bila backend ternyata lebih ketat,
tombolnya tampil tetapi server membalas `403`.

| Endpoint                                                                        | Keputusan FE sekarang | Pertanyaan            |
| ------------------------------------------------------------------------------- | --------------------- | --------------------- |
| `PUT /dashboard/plta/{id}/daily/visibility` (sembunyikan/urutkan metrik harian) | Operator dan Admin    | Peran apa yang boleh? |
| `PATCH /tags/{id}/bounds` (batas valid tag)                                     | Operator dan Admin    | Peran apa yang boleh? |
| `POST`/`PATCH /plta`, `POST`/`PATCH /wilayah-sungai`                            | Admin saja            | Peran apa yang boleh? |

Catatan: `POST /tags` sudah jelas khusus admin di Swagger.

---

## C. Kerapian kontrak

| #   | Topik                                       | Keadaan sekarang                                                                                       | Permintaan                                                                |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| C1  | `ForecastPoint.value`                       | Swagger: wajib, `number`. Kenyataannya bisa `null` (run 1 Okt 2026 00.30 WIB mengirim 24 titik kosong) | Tandai `value` boleh `null`                                               |
| C2  | `GET /forecasts/accuracy`                   | Respons ditulis sebagai objek bebas (`additionalProperties: true`)                                     | Tuliskan schema-nya (metrik, `n`, `per_versi`)                            |
| C3  | `POST /plta` dengan kode yang sudah dipakai | Respons yang terdokumentasi: 201, 400, 401, 403, 422, 500 — tidak jelas kode duplikat jatuh ke mana    | Sebutkan status dan bentuk pesannya                                       |
| C4  | `scale` dan `offset` pada tag               | Tidak ada deskripsi                                                                                    | Rumusnya `nilai × scale + offset`, atau urutan lain?                      |
| C5  | Nama parameter (`ParameterType`)            | Hanya kunci (`plan_outflow_hjv`, …) tanpa nama tampilan; frontend merumuskan nama sendiri              | Daftar nama resmi, atau `label` per parameter di API                      |
| C6  | `GET /dashboard/plta/{id}/timeseries.xlsx`  | `deprecated`; frontend masih memakainya sebagai cadangan untuk PLTA yang daftar trennya belum diatur   | Kapan endpoint ini dihapus?                                               |
| C7  | Koordinat PLTA                              | Per catatan frontend, kebanyakan masih `null`, sehingga PLTA itu tidak tampil di peta Overview         | Diisi backend, atau admin mengisinya lewat **Katalog Data › PLTA › Ubah** |
