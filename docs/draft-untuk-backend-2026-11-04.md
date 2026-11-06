# Draft untuk Tim Backend — 4 Nov 2026

Disusun dari hasil QA frontend (tele-frontend-v2 Svelte) tanggal 4 Nov 2026.
Setiap poin sudah dicek di **staging** (`100.94.60.11:18000`) dan, bila
relevan, dicocokkan ke **production** (`192.168.105.99:8000`, hanya baca).
Laporan QA lengkap: `docs/qa-report-2026-11-04.md`.

Tanda 🔁 = **pertanyaan ulang** — sudah pernah kami sampaikan sebelumnya dan
masih terjadi.

| Bagian | Isi                                          | Jumlah |
| ------ | -------------------------------------------- | ------ |
| A      | Prioritas tinggi (data di layar keliru)      | 2      |
| B      | Performa — usulan konversi gambar ke WebP    | 1      |
| C      | Pertanyaan aturan dan fitur                  | 7      |
| D      | Bersih-bersih data staging                   | 2      |
| E      | Daftar 27 Okt yang perlu dikonfirmasi status | —      |

---

## A. Prioritas tinggi

### A1. 🔁 TMA Waduk Soedirman tidak berubah sejak 30 Okt

- **Yang terjadi**: `water_level` PLTA-001 (Soedirman) bernilai persis
  **230,5347442626953** sejak **30 Okt 2026 15.00 WIB** — 116 jam berturut-turut
  saat dicek 4 Nov 10.00 WIB. Terjadi di staging **dan production**.
- **Detail**:
  - Tiap jam tetap ada baris baru dengan nilai yang sama dan `quality: good`.
  - `GET /trends?...&parameter=water_level&resolution=raw` hanya mengembalikan
    satu titik per jam, padahal sebelumnya TMA tercatat tiap 1 menit.
  - `GET /monitoring/plta/{id}/latest` menyebut waktu terbaru (10.00 WIB), jadi
    dashboard menampilkannya sebagai data segar.
- **Dampak**: volume waduk, inflow, Volume Efektif, dan prediksi Forecasting
  ikut dihitung dari angka yang beku. Operator tidak punya tanda apa pun bahwa
  datanya macet.
- **Pertanyaan**:
  1. Apakah sensor / tag OPC-nya yang macet, atau pengumpul data mengulang
     nilai terakhir saat sumbernya tidak mengirim?
  2. Bila sumber tidak mengirim, bisakah titiknya **tidak ditulis** atau
     ditandai `quality` selain `good` (mis. `stale`), supaya frontend bisa
     menampilkan peringatan?

### A2. 🔁 Metrik "Unit 4" untuk PLTA bertiga unit

- **Yang terjadi**: Soedirman tercatat 3 unit (`n_units` = 3), tetapi
  `GET /dashboard/plta/{id}/daily` tetap mengirim
  `rencana_debit_turbin_unit_4`, `debit_turbin_unit_4`,
  `bukaan_guide_vane_unit_4`, dan `swc_unit_4` — selalu kosong. Terjadi di
  staging dan production.
- **Dampak**: baris kosong ikut tampil di panel, dan mode **Perlu perhatian**
  penuh baris N/A.
- **Permintaan**: metrik unit di atas `n_units` tidak dikirim (atau ditandai
  `hidden: true` secara bawaan).

---

## B. Performa — gambar hujan

### B1. `GET /hydrology/monthly/image` lambat — usul simpan dan sajikan WebP

- **Yang terjadi**:

  | Lingkungan | Ukuran gambar | Waktu      | Pembanding (endpoint JSON) |
  | ---------- | ------------- | ---------- | -------------------------- |
  | Production | ±330–430 KB   | 1,2–10,6 s | 0,15–1,1 s                 |
  | Staging    | ±300 KB       | 12,8 s     | —                          |
  | Staging    | (Sep, curah)  | > 30 s     | —                          |

  Halaman Hidrologi Bulanan memuat **empat** gambar sekaligus, jadi pengguna
  melihat "Memuat…" lama.

- **Usulan**:
  1. Saat `POST /hydrology/monthly/image`, berkas JPG/PNG yang diunggah
     **dikonversi ke WebP** sebelum disimpan ke database.
  2. `GET` menyajikan WebP (`Content-Type: image/webp`). Peta BMKG umumnya
     menyusut beberapa kali lipat tanpa beda yang terlihat.
  3. Bila memungkinkan, tambahkan `Cache-Control` / `ETag` — gambar satu bulan
     jarang berubah, jadi browser tidak perlu mengunduh ulang.
- **Dampak ke frontend**: tidak ada perubahan yang dibutuhkan. Frontend
  mengambil gambar lewat `fetch` → blob → object URL, jadi format apa pun
  yang dikirim server langsung tampil. Semua browser yang didukung aplikasi
  sudah bisa menampilkan WebP.
- **Pertanyaan**: perlukah berkas asli tetap disimpan (untuk diunduh utuh),
  atau cukup versi WebP?

---

## C. Pertanyaan aturan dan fitur

| #   | Topik                                  | Keadaan sekarang                                                                                                                                                                                                         | Pertanyaan                                                                                                                                      |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Arti "pencapaian" di overview bulanan  | Blok `akumulasi` membandingkan `total_prediksi` dengan `total_target` (689.950 dari 748.670 MWh = 92,16%). Rata-rata **realisasi** (58.298) justru di atas target (57.590), tetapi status 0 tercapai, 13 tidak tercapai. | Memang prognosa ÷ target, bukan realisasi ÷ target? Bila ya, kami ubah labelnya menjadi "Prognosa pencapaian".                                  |
| C2  | Format kode Wilayah Sungai             | Frontend saat ini menerima kode apa pun (mis. `ws serayu!`). Kode tidak bisa diubah lewat `PATCH` dan tidak ada hapus, jadi salah ketik menjadi permanen.                                                                | Apakah server memvalidasi format (mis. `^WS-[A-Z0-9-]+$`)? Bila ada aturannya, kami samakan di form.                                            |
| C3  | `PATCH /users/{id}` tertahan           | Sekali terjadi: tertahan ±15 detik lalu gagal tanpa pesan, data tidak berubah. Percobaan ulang sukses dalam 0,9 detik. Belum bisa diulang.                                                                               | Ada catatan galat atau timeout di log server sekitar 4 Nov 2026 ±09.58 WIB untuk user `viewer`?                                                 |
| C4  | Reset password oleh admin              | Admin tidak punya cara mengganti password pengguna yang lupa.                                                                                                                                                            | Adakah endpoint-nya? Bila belum, apakah direncanakan?                                                                                           |
| C5  | Bahasa pesan galat unggah Excel        | Muncul "Berkas tidak terbaca sebagai Excel: File is not a zip file" — bagian akhirnya pesan mentah library.                                                                                                              | Bisakah seluruh pesan berbahasa Indonesia, mis. "Berkas bukan Excel (.xlsx) yang valid"?                                                        |
| C6  | Kriteria `layak_disajikan` Forecasting | Production sudah benar (skill −62,6 → `false`). Di staging, model `seasonal_naive` dengan skill **0,00** dan akurasi 32% diberi `layak_disajikan: true`.                                                                 | Apa ambangnya? Apakah skill 0 (tidak lebih baik dari prediksi "sama seperti kemarin") memang dianggap layak?                                    |
| C7  | Isian kondisi hidrologi                | `prediksi_hidrologi` / `realisasi_hidrologi` berupa teks bebas; di staging ada isian "serak".                                                                                                                            | Apakah nilainya sebaiknya dibatasi ke pilihan tetap (mis. kering / normal / basah)? Bila ya, mohon daftar resminya supaya form menjadi pilihan. |

---

## D. Bersih-bersih data staging

Hanya terjadi di staging; tidak terlihat di production.

| #   | Data                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Isian bulanan yang tidak masuk akal: target energi Sep 2026 Soedirman **200 MWh** vs prognosa 423.432 (211.716%), pH hulu = 0, kondisi "serak". |
| D2  | Data uji lama: laporan dan unggahan periode **2030**, kurva EVA draft Soedirman **2030/2031** (elevasi 100–112 mdpl, waduknya 224–231 mdpl).    |

---

## E. Daftar 27 Okt — mohon konfirmasi status

Dari `docs/pertanyaan-backend.md` (27 Okt 2026), sebagian sudah terjawab lewat
Swagger 2 Nov 2026 (cara mengisi Target TMA, sumber nilai konstanta, peran
endpoint). Yang belum kami cek ulang jawabannya:

| #     | Topik                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A3.2  | Waktu ARR Soedirman di `/monitoring/.../latest` tertinggal berhari-hari dibanding `/trends`                                                             |
| C1–C7 | Kerapian kontrak (forecast `value` null, schema accuracy, kode PLTA duplikat, scale/offset, nama parameter, timeseries.xlsx deprecated, koordinat PLTA) |

Catatan: **C5 (nama resmi parameter)** kini juga dibutuhkan untuk form
**Buat Laporan**, yang masih menampilkan kunci mentah seperti
"Plan Outflow Ddc Hours".
