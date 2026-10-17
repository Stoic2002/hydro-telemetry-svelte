import { canAccessDataTools, canManageUsers, type User } from '$features/auth';

/**
 * Isi Panduan Penggunaan.
 *
 * Ditulis sebagai data, bukan markup, supaya penyaringan per role dan pencarian
 * bisa diuji tanpa merender halaman. Nama tombol, menu, dan label ditulis
 * **persis seperti di layar** — kalau label di sebuah halaman berubah, kalimat
 * yang menyebutnya di sini ikut diubah.
 *
 * Penekanan ditulis `**seperti ini**` dan dirender sebagai huruf tebal. Tidak ada
 * markup lain yang dikenali; isi tidak pernah dirender sebagai HTML.
 */

/**
 * Siapa yang boleh membaca sebuah bab atau bagian. Mengikuti aturan yang sama
 * dengan menu dan guard rute, jadi Viewer tidak dijelaskan cara memakai layar
 * yang tidak bisa ia buka.
 */
export type GuideAccess = 'all' | 'dataTools' | 'userManagement';

/**
 * Contoh tampilan yang dirender dari komponen asli di samping sebuah bagian.
 * Pemetaan id ke komponennya ada di `GuideExample.svelte`.
 */
export type GuideExampleId =
	| 'plant-switcher'
	| 'roles'
	| 'monthly-input-button'
	| 'source-markers'
	| 'dmn-picker'
	| 'metric-row'
	| 'forecast-controls'
	| 'forecast-accuracy'
	| 'trend-period'
	| 'report-create'
	| 'report-status'
	| 'upload-tabs'
	| 'excel-rejected'
	| 'user-status';

export interface GuideBlock {
	title: string;
	example?: GuideExampleId;
	/** Langkah berurutan, dirender sebagai daftar bernomor. */
	steps?: string[];
	/** Catatan tanpa urutan. */
	notes?: string[];
	access?: GuideAccess;
}

export type GuideChapterId =
	| 'memulai'
	| 'overview'
	| 'telemetering'
	| 'forecasting'
	| 'tren'
	| 'laporan'
	| 'upload'
	| 'katalog'
	| 'user-management'
	| 'profil'
	| 'faq';

export interface GuideChapter {
	id: GuideChapterId;
	title: string;
	summary: string;
	access?: GuideAccess;
	blocks: GuideBlock[];
}

export const GUIDE_CHAPTERS: GuideChapter[] = [
	{
		id: 'memulai',
		title: 'Memulai',
		summary: 'Masuk, berpindah menu, memilih PLTA, dan keluar dari aplikasi.',
		blocks: [
			{
				title: 'Masuk ke aplikasi',
				steps: [
					'Buka alamat aplikasi di browser.',
					'Isi **Username** dan **Password** yang diberikan administrator.',
					'Tekan **Masuk**. Halaman pertama yang terbuka adalah **Overview**.'
				],
				notes: [
					'Sesi tetap tersimpan saat halaman di-refresh. Anda baru diminta masuk kembali bila sesi sudah berakhir.'
				]
			},
			{
				title: 'Berpindah menu',
				notes: [
					'Seluruh menu ada di sidebar kiri. Menu yang tampil menyesuaikan peran akun Anda.',
					'Tombol panel di kiri logo, di pojok kiri atas sidebar, menciutkan sidebar menjadi deretan ikon. Tekan lagi untuk memperluasnya. Saat ciut, arahkan kursor ke ikon untuk melihat nama menunya.',
					'Di layar kecil, sidebar tersembunyi. Buka dengan tombol menu di kiri atas.'
				]
			},
			{
				title: 'Memilih PLTA',
				example: 'plant-switcher',
				steps: [
					'Buka halaman yang datanya per PLTA, misalnya **Telemetering** atau **Tren & Grafik**.',
					'Pilih PLTA dari kotak **Pilih PLTA** di kanan atas halaman.'
				],
				notes: [
					'Filter yang sedang dipakai, seperti periode grafik, tetap dipertahankan saat berpindah PLTA.',
					'**Overview** dan **Forecasting** tidak punya pemilih PLTA: Overview menampilkan seluruh Jawa Tengah, sedangkan Forecasting khusus PLTA Soedirman.'
				]
			},
			{
				title: 'Peran pengguna',
				example: 'roles',
				notes: [
					'**Viewer** — melihat Overview, Telemetering, Forecasting, Tren & Grafik, dan Laporan.',
					'**Operator PLTA** — seperti Viewer, ditambah Upload, input data harian dan bulanan, serta Katalog Data.',
					'**Super Admin** — seluruh menu, termasuk User Management.'
				]
			},
			{
				title: 'Keluar',
				steps: [
					'Klik nama Anda di pojok kiri bawah sidebar untuk membuka menu akun.',
					'Pilih **Keluar**.',
					'Tekan **Ya, Keluar** pada kotak konfirmasi.'
				],
				notes: [
					'Keluar dari satu tab juga mengakhiri sesi di tab lain pada browser yang sama.',
					'Keluar mencabut sesi di server, jadi sesi itu tidak bisa dipakai lagi walau tokennya sempat tersalin. Perangkat lain tidak ikut keluar — untuk itu pakai **Keluar dari semua perangkat** di **Profil Saya**.'
				]
			}
		]
	},
	{
		id: 'overview',
		title: 'Overview',
		summary:
			'Peta sebaran PLTA di Jawa Tengah, citra awan hujan terkini, dan ringkasan hidrologi seluruh PLTA.',
		blocks: [
			{
				title: 'Membaca peta',
				notes: [
					'Titik berwarna cyan adalah PLTA aktif; titik abu-abu adalah PLTA yang tidak aktif.',
					'Garis biru adalah aliran sungai — semakin tebal, semakin besar sungainya.',
					'Arahkan kursor ke sebuah titik untuk melihat ringkasan PLTA tersebut.'
				]
			},
			{
				title: 'Membuka data PLTA dari peta',
				steps: ['Klik titik PLTA pada peta.', 'Halaman **Telemetering** PLTA tersebut terbuka.']
			},
			{
				title: 'Awan hujan',
				steps: [
					'Gunakan sakelar **Awan Hujan** di kanan atas peta untuk menampilkan atau menyembunyikan sebaran awan hujan.',
					'Waktu citra terakhir tertulis di baris **Citra terakhir**.'
				],
				notes: [
					'Warna menunjukkan perkiraan intensitas dari suhu puncak awan: biru ringan–sedang, jingga lebat, ungu sangat lebat. Ini perkiraan dari citra satelit Himawari-9, bukan hujan terukur — untuk curah hujan sebenarnya, lihat sensor di halaman Telemetering.',
					'Citra diperbarui otomatis setiap 10 menit dan biasanya tertinggal sekitar 30–40 menit dari waktu sekarang. Bila tertulis **Tidak tersedia**, layanan citra sedang tidak dapat dijangkau; peta lainnya tetap bisa dipakai.'
				]
			},
			{
				title: 'Hujan terukur',
				notes: [
					'Berbeda dari citra awan yang hanya perkiraan, **Hujan terukur** berasal dari penakar hujan milik PLTA sendiri.',
					'PLTA yang penakarnya mencatat hujan dalam 60 menit terakhir diberi cincin biru dan tanda tetes pada penandanya. Arahkan kursor ke penanda untuk melihat nilainya.',
					'Daftar **Hujan terukur** di panel kanan atas memuat setiap PLTA yang punya penakar hujan, termasuk yang belum tampil di peta karena koordinatnya belum diisi.',
					'Bila tertulis **Tidak diperbarui sejak …**, penakarnya tidak mengirim data lebih dari 3 jam. Itu **bukan** berarti tidak hujan.',
					'Nilai yang ditampilkan adalah pembacaan tertinggi dalam 60 menit terakhir, dalam milimeter.'
				]
			},
			{
				title: 'Ringkasan hidrologi seluruh PLTA',
				steps: [
					'Kartu **Ringkasan hidrologi seluruh PLTA** menempel di dasar peta Overview — di layar kecil, di bawah peta. Bawaannya bulan berjalan.',
					'Pilih bulan — atau **Sepanjang tahun** — dan tahun di kanan atas halaman. Bila bulan itu belum ada datanya, tekan **Lihat** bulan sebelumnya di kartu.',
					'Di kaki kartu yang sama tampil **Rata-rata per PLTA** dalam MWh — prognosa, target, dan realisasi untuk bulan itu dan akumulasinya.',
					'Isi **Sampai** di kaki kartu untuk merangkum beberapa bulan sekaligus, misalnya Januari sampai September. Kosongkan (—) untuk satu periode saja; tekan **Hapus rentang** untuk kembali.',
					'Untuk laporan Excel periode yang sama, tekan **Unduh laporan Excel** di kanan bawah kartu.'
				],
				notes: [
					'**Pencapaian seluruh PLTA** adalah total prediksi dibagi total target seluruh PLTA — angka yang dipakai untuk melaporkan kinerja gabungan. **Rata-rata antar-PLTA** memberi bobot sama pada setiap PLTA, besar maupun kecil.',
					'Data yang prediksi atau targetnya belum diisi tidak dihitung sebagai "tidak tercapai" dan tidak ikut angka gabungan.',
					'Rentang maksimal 60 bulan, dan akhirnya tidak boleh sebelum awal. Bila tidak memenuhi, kartu ringkasan menampilkan "Rentang periode tidak valid" dan tidak meminta data ke server.',
					'Angka **Cakupan** yang berwarna jingga berarti ringkasan belum mencakup seluruh PLTA.'
				]
			}
		]
	},
	{
		id: 'telemetering',
		title: 'Telemetering',
		summary: 'Kondisi hidrologi bulanan dan harian per PLTA.',
		blocks: [
			{
				title: 'Hidrologi Bulanan',
				steps: [
					'Buka **Telemetering › Hidrologi Bulanan**.',
					'Pilih **Bulan** dan **Tahun** pada bagian **Periode**.',
					'Baca tabel di bagian **Ringkasan**: tiap parameter punya kolom **Target**, **Prediksi**, dan **Realisasi**. Tanda hubung (—) berarti parameter itu tidak punya nilai untuk kolom tersebut; **N/A** berarti seharusnya ada tetapi belum diisi.',
					'Pada baris energi, kolom **Prediksi** adalah **prognosa ketersediaan energi primer**, sedangkan target dan realisasi adalah produksi energi listrik. **Prognosa pencapaian** adalah prognosa dibagi target, dan badge **Tercapai** / **Belum tercapai** adalah kesimpulannya.',
					'Lihat juga peta **Curah Hujan** dan **Sifat Hujan** di bagian **Gambar Hujan**: baris **Prediksi** di atas, **Realisasi** di bawahnya. Klik gambar untuk memperbesar.'
				],
				notes: [
					'Bulan dan tahun yang dipilih tetap terbawa saat Anda berpindah PLTA lewat pemilih PLTA.',
					'Bagian **Akumulasi produksi** di bawah tabel menggambar **target** (batang abu-abu) dan **realisasi** (batang biru) akumulasi per bulan sepanjang tahun yang dipilih, untuk PLTA yang sedang dibuka. Bulan yang belum diisi tidak diberi batang — bukan bernilai nol.'
				]
			},
			{
				title: 'Mengisi ringkasan bulanan',
				example: 'monthly-input-button',
				access: 'dataTools',
				steps: [
					'Pada bagian **Ringkasan**, tekan **Input data** — atau **Edit data** bila periode itu sudah terisi.',
					'Isi kondisi hidrologi (prediksi dan realisasi) serta energi bulan ini dan energi akumulasi (dalam MWh): target, prognosa ketersediaan energi primer, dan realisasi.',
					'Tekan **Simpan Data**.'
				],
				notes: [
					'Field yang dikosongkan tidak menimpa data yang sudah tersimpan.',
					'Prognosa pencapaian beserta kesimpulan **Tercapai** / **Belum tercapai** dihitung otomatis oleh server.',
					'Untuk mengisi seluruh PLTA sekaligus, gunakan menu **Upload** tab **Excel Bulanan**.'
				]
			},
			{
				title: 'Hidrologi Harian',
				example: 'source-markers',
				notes: [
					'Menampilkan kondisi **hari ini** untuk tiga zona: hulu, bendungan, dan hilir.',
					'Penanda **Realtime aktif** berarti koneksi ke server terbuka dan nilai baru langsung masuk begitu dikirim sensor. Bila tertulis **Realtime belum aktif**, tekan **Hubungkan ulang** bila tombol itu muncul.',
					'Penanda di depan setiap nilai menunjukkan asalnya: **Realtime** (sensor), **Formulasi** (dihitung), **Input** (diisi manual), atau **Konstanta (input)** (konstanta yang diisi operator). Baris yang belum berisi nilai menampilkan N/A dengan penanda sumbernya.'
				]
			},
			{
				title: 'Menyembunyikan dan mengurutkan parameter',
				access: 'dataTools',
				steps: [
					'Di Hidrologi Harian, tekan ikon pengatur di sebelah judul panel yang ingin diatur — **Hulu**, **Bendungan**, atau **Hilir**. Setiap panel diatur sendiri-sendiri.',
					'Matikan sakelar parameter yang tidak ingin ditampilkan — misalnya pH di PLTA yang tidak punya sensornya.',
					'Untuk mengubah urutan, seret baris parameter ke atas atau ke bawah. Di tablet atau HP, seret lewat pegangan titik-titik di kiri baris. Dengan keyboard: fokuskan pegangannya, lalu tekan panah atas atau bawah.',
					'Tekan **Simpan**.'
				],
				notes: [
					'Pengaturan berlaku untuk **PLTA yang sedang dibuka** dan terlihat oleh semua pengguna PLTA itu. PLTA lain tidak terpengaruh.',
					'Parameter yang disembunyikan tidak dihapus: datanya tetap tersimpan dan bisa ditampilkan kembali kapan saja.',
					'Parameter hanya bisa diurutkan di dalam panelnya sendiri (Hulu, Bendungan dan pelepasan, Hilir), tidak bisa dipindah ke panel lain.',
					'**Urutan bawaan** muncul pada panel yang pernah diurutkan; tekan lalu **Simpan** untuk mengembalikan urutan aslinya.'
				]
			},
			{
				title: 'Mengganti nama parameter',
				access: 'userManagement',
				steps: [
					'Harian: di sheet yang sama, isi kotak nama di bawah sakelar parameter, lalu tekan **Simpan**. Nama berlaku untuk PLTA yang sedang dibuka.',
					'Bulanan: di Hidrologi Bulanan, tekan **Nama bidang** di kanan atas. Nama berlaku untuk **seluruh PLTA**.',
					'Kosongkan kotak nama untuk kembali ke nama bawaan.'
				],
				notes: [
					'Nama bidang bulanan dipakai di template unggah, laporan Excel, dan pesan galat impor. Template lama tetap bisa diunggah.',
					'Bila satu nama ditolak — kosong, terlalu panjang, atau sama dengan nama lain — tidak ada nama yang tersimpan.'
				]
			},
			{
				title: 'Umur pembacaan sensor',
				notes: [
					'**Realtime aktif** tidak menjamin setiap sensor masih mengirim. Nilai sensor yang lama tidak diperbarui diberi badge umur di sebelah angkanya, misalnya **32 mnt lalu**.',
					'Badge kuning: pembacaan terlambat. Badge merah: sensor kemungkinan berhenti mengirim, dan angkanya diredupkan — itu pembacaan terakhir, bukan kondisi saat ini.',
					'Kebanyakan sensor mengirim tiap beberapa menit: kuning setelah 30 menit, merah setelah 1 jam. Curah hujan dan elevasi sedimen mengirim sekali per jam: kuning setelah 1,5 jam, merah setelah 3 jam.',
					'Bila ada badge merah, di atas halaman muncul ringkasan **sensor tidak diperbarui**. Klik nama parameternya untuk melompat ke barisnya.',
					'Ringkasan itu bisa ditutup dengan tanda silang di kanannya; badge merah di barisnya tetap tampil. Ringkasan muncul lagi bila daftar sensor yang berhenti berubah — misalnya ada sensor lain yang ikut berhenti — atau saat halaman dibuka di tab baru.',
					'Arahkan kursor ke badge untuk melihat waktu ukur persisnya.',
					'Nilai formula, rencana, konstanta, dan data yang diisi manual tidak diberi badge umur — nilainya memang hanya berubah sekali sehari.'
				]
			},
			{
				title: 'Mengatur unit beban penuh',
				example: 'dmn-picker',
				steps: [
					'Di zona hulu, cari bagian **Unit beban penuh** — tepat di bawah baris **Service Hour Full Load**. Bila baris itu disembunyikan atau terlipat, bagian ini ada di bawah judul **Hulu**.',
					'Klik unit untuk menyalakan atau mematikannya. Nilai DMN di kanan menyesuaikan.',
					'Untuk nilai tertentu, buka **DMN manual**, isi nilai dalam MW, lalu tekan **Terapkan**.'
				],
				notes: [
					'Pengaturan ini memengaruhi DMN Beban Penuh, Service Hour Full Load, dan nilai "thd target".'
				]
			},
			{
				title: 'Mengisi data harian',
				example: 'metric-row',
				access: 'dataTools',
				steps: [
					'Pada baris parameter yang bisa diisi manual, tekan **Input data** atau **Edit data**.',
					'Pilih tab **Input Manual** untuk mengetik nilai, atau **Upload Excel** untuk mengunggah satu berkas.',
					'Input Manual: isi **Tanggal**, **Jam**, dan **Nilai**. Tekan **Tambah titik data** untuk beberapa jam sekaligus.',
					'Tekan **Simpan Data** atau **Upload Excel**.'
				],
				notes: [
					'Jam yang diisi dianggap WIB. Mengisi ulang tanggal dan jam yang sama akan memperbarui nilai lama.',
					'Berkas Excel hanya untuk satu parameter, dengan kolom **datetime + value** atau **tanggal + jam + value**.',
					'Di tab **Upload Excel**, pilih **Isi template** dan **Tanggal**, lalu tekan **Unduh Template** untuk mendapat berkas parameter itu. Nilai yang sudah tersimpan ikut terisi, jadi tinggal dikoreksi.'
				]
			},
			{
				title: 'Menghapus data yang salah unggah',
				access: 'dataTools',
				steps: [
					'Tekan **Input data** atau **Edit data** pada baris parameter itu, lalu pilih tab **Hapus Data**.',
					'Isi **Dari** dan **Sampai** (tanggal dan jam). Bawaannya satu hari penuh.',
					'Tekan **Hapus Data**, lalu **Ya, Hapus** pada konfirmasi.'
				],
				notes: [
					'Nilai yang salah cukup diisi ulang pada jam yang sama. Hapus data dipakai bila jam, parameter, atau station-nya yang keliru.',
					'Hanya data isian manual dan unggahan yang terhapus; data sensor tidak tersentuh. Waktu awal dan akhir ikut terhapus, maksimal 366 hari.',
					'Penghapusan tidak bisa dibatalkan dan tercatat di riwayat unggah.'
				]
			}
		]
	},
	{
		id: 'forecasting',
		title: 'Forecasting',
		summary: 'Prediksi inflow dan TMA waduk PLTA Soedirman.',
		blocks: [
			{
				title: 'Melihat prediksi',
				example: 'forecast-controls',
				steps: [
					'Buka menu **Forecasting**.',
					'Pilih parameter: **Inflow** atau **TMA Waduk**.',
					'Pilih horizon: **24 Jam** atau **7 Hari**.'
				]
			},
			{
				title: 'Membaca grafik',
				notes: [
					'Garis **Aktual** adalah pembacaan lapangan; garis **Prediksi P50** adalah nilai prediksi yang paling mungkin.',
					'Pita di sekitar garis prediksi adalah rentang **P10–P90**: nilai sebenarnya kemungkinan besar berada di dalam pita ini.',
					'Arahkan kursor ke grafik untuk melihat nilai pada jam tertentu.'
				]
			},
			{
				title: 'Kelayakan prediksi',
				example: 'forecast-accuracy',
				notes: [
					'Bagian **Kelayakan Prediksi** menunjukkan seberapa dapat diandalkan model saat ini.',
					'Bila muncul peringatan **Akurasi model belum layak jadi acuan tunggal**, gunakan prediksi bersama data aktual dan pertimbangan operator.'
				]
			},
			{
				title: 'Akurasi prediksi yang tersaji',
				notes: [
					'Bagian **Akurasi prediksi yang tersaji** di dasar halaman membandingkan prediksi yang sudah jatuh tempo dalam 30 hari terakhir dengan realisasinya — angka yang benar-benar dilihat operator, bukan angka saat model dilatih.',
					'**Galat rata-rata (MAE)** dan **RMSE** dalam satuan parameternya; **Akurasi** = 100 dikurangi galat relatif. Saat inflow mendekati nol, bacalah MAE, karena persentasenya bisa menyesatkan.',
					'Tabel per versi model menunjukkan apakah mutu turun setelah model baru dipakai. Baris **Tanpa model (fallback)** adalah prediksi yang dibuat tanpa model ML.'
				]
			}
		]
	},
	{
		id: 'tren',
		title: 'Tren & Grafik',
		summary: 'Grafik riwayat metrik PLTA dalam 24 jam, 7 hari, atau 30 hari terakhir.',
		blocks: [
			{
				title: 'Menampilkan grafik',
				example: 'trend-period',
				steps: [
					'Buka menu **Tren & Grafik** dan pilih PLTA di kanan atas.',
					'Pilih periode: **24 Jam Terakhir**, **7 Hari Terakhir**, atau **30 Hari Terakhir**.',
					'Bila daftar tren PLTA ini sudah diatur admin, pilih grafiknya dari kotak pilihan di atas grafik. Pilihannya mengikuti urutan dan grup daftar tren: metrik yang satu grup digambar dalam satu grafik, dan satuan kedua memakai sumbu kanan.',
					'Bila belum diatur, halaman menampilkan satu grafik — pilih parameternya dari kotak pilihan di atas grafik.',
					'Arahkan kursor ke grafik untuk melihat nilai seluruh garisnya pada waktu tertentu.'
				],
				notes: [
					'Tabel di bawah setiap grafik berisi nilai **Terkini**, **Rata-rata**, **Min**, dan **Maks** tiap garis.',
					'Garis rencana harian (mis. target) digambar bertangga: satu nilai berlaku sepanjang tanggalnya.',
					'Tekan **Unduh Excel** atau **Unduh CSV** untuk mengambil data **seluruh daftar tren** pada periode itu, bukan hanya grafik yang sedang tampil.'
				]
			},
			{
				title: 'Mengatur daftar tren',
				access: 'userManagement',
				steps: [
					'Tekan **Atur daftar tren** di kanan atas halaman Tren & Grafik.',
					'Pilih metrik di **Tambah metrik**. Seret barisnya untuk mengubah urutan, atau tekan × untuk membuangnya.',
					'Isi **Grup** yang sama pada beberapa metrik untuk menggambarnya dalam satu grafik. Satu grup paling banyak berisi dua satuan berbeda.',
					'Isi **Nama khusus** bila nama di grafik perlu berbeda dari nama panel harian, lalu tekan **Simpan daftar**.'
				],
				notes: [
					'Daftar berlaku per PLTA untuk semua pengguna. Bila ada satu isian yang ditolak, tidak ada yang tersimpan.'
				]
			},
			{
				title: 'Membaca grafik',
				notes: [
					'Baris di atas grafik berisi **Rata-rata**, **Minimum**, **Maksimum**, dan **Perubahan periode**.',
					'Garis putus-putus yang lurus mendatar adalah nilai rata-rata periode.',
					'Curah hujan digambar sebagai batang dan dijumlahkan; parameter lain dirata-rata.',
					'Nilai yang jauh di luar batas wajar tidak ikut digambar, dan jumlahnya disebutkan di atas grafik.',
					'Di bawah grafik tertulis sumber seri yang sungguh dibaca server: **tingkat pembangkit**, satu **stasiun**, atau **agregasi** beberapa stasiun beserta daftar stasiunnya.'
				]
			},
			{
				title: 'Membandingkan dengan periode lain',
				steps: [
					'Pada kotak **Bandingkan dengan**, pilih **Periode sebelumnya** atau **Tahun lalu**.',
					'Periode pembanding muncul sebagai garis abu-abu putus-putus yang mengikuti bentuk datanya, di sumbu waktu yang sama.',
					'Arahkan kursor ke grafik: tooltip menampilkan nilai kedua periode beserta selisihnya.'
				],
				notes: [
					'**Periode sebelumnya** adalah rentang dengan panjang yang sama tepat sebelum periode ini — misalnya 24 jam sebelumnya.',
					'**Tahun lalu** adalah tanggal yang sama setahun sebelumnya.',
					'Di bawah **Rata-rata** tertulis rata-rata periode pembanding dan selisihnya.',
					'Bila pembanding tertulis **tidak ada data**, data untuk periode itu memang belum tersimpan.',
					'Pilih **Tanpa pembanding** untuk kembali ke satu garis.'
				]
			},
			{
				title: 'Membagikan grafik',
				notes: [
					'Parameter, periode, dan pembanding tersimpan di alamat halaman. Salin alamat dari browser untuk membagikan grafik yang sama persis.'
				]
			}
		]
	},
	{
		id: 'laporan',
		title: 'Laporan',
		summary: 'Laporan time series per PLTA dan laporan hidrologi seluruh PLTA, dalam format Excel.',
		blocks: [
			{
				title: 'Membuat laporan',
				example: 'report-create',
				steps: [
					'Buka menu **Laporan**, tab **Laporan Time Series**, dan pilih PLTA di kanan atas.',
					'Tekan **Buat Laporan**.',
					'Pilih **Bulan** dan **Tahun**, lalu centang parameter yang dibutuhkan.',
					'Tekan **Buat Laporan** pada panel.'
				],
				notes: ['Laporan diproses di server dan langsung muncul di daftar.']
			},
			{
				title: 'Unduh langsung Excel per jam',
				steps: [
					'Di tab **Laporan Time Series**, bagian **Unduh langsung: Excel per jam**, isi **Dari** dan **Sampai**.',
					'Tekan **Unduh Excel**.'
				],
				notes: [
					'Berkasnya langsung terunduh, tanpa antrean. Bila daftar tren PLTA itu sudah diatur, kolomnya mengikuti daftar tren — isinya sama dengan Tren & Grafik — dan rentang maksimal 366 hari.',
					'Bila daftar tren belum diatur, berkasnya memakai format lama: 13 kolom rata-rata per jam, rentang maksimal 62 hari.'
				]
			},
			{
				title: 'Mengunduh laporan',
				example: 'report-status',
				steps: [
					'Tunggu sampai status laporan menjadi **Selesai**. Daftar diperbarui sendiri selama ada laporan yang **Menunggu** atau **Diproses**.',
					'Tekan **Unduh Excel** pada baris laporan tersebut.'
				],
				notes: [
					'Bila statusnya **Gagal**, buat ulang laporannya. Bila tetap gagal, hubungi administrator.',
					'Gunakan kotak pencarian untuk menemukan laporan lama.',
					'Kolom **Dibuat** juga menyebut akun yang membuat laporan.'
				]
			},
			{
				title: 'Laporan hidrologi seluruh PLTA',
				steps: [
					'Buka menu **Laporan**, tab **Laporan Hidrologi**.',
					'Pilih **Bulan** — atau **Sepanjang tahun** — dan **Tahun**.',
					'Untuk **Laporan Hidrologi Bulanan**, isi **Sampai (opsional)** bila ingin beberapa bulan dalam satu berkas.',
					'Unduh **Laporan Hidrologi Bulanan** atau **Laporan Hidrologi Harian** dengan **Unduh Excel**.'
				],
				notes: [
					'Laporan ini langsung diunduh, tanpa antrean.',
					'Rentang hanya berlaku untuk laporan **bulanan** (maksimal 60 bulan). Laporan harian memakai bulan awal yang dipilih.',
					'Pilih **Cakupan PLTA** untuk mempersempit laporan ke satu PLTA, dan pilih panel Hulu, Bendungan, atau Hilir untuk laporan harian.'
				]
			}
		]
	},
	{
		id: 'upload',
		title: 'Upload',
		summary: 'Excel ringkasan bulanan, gambar hujan, dan kurva EVA per PLTA.',
		access: 'dataTools',
		blocks: [
			{
				title: 'Empat jenis unggahan',
				example: 'upload-tabs',
				notes: [
					'**Excel Bulanan**, **Excel Harian**, dan **Gambar Hujan** berlaku untuk **seluruh PLTA** sekaligus.',
					'**Input EVA** berlaku untuk **satu PLTA** yang dipilih di tab itu.',
					'Setiap tab punya riwayat unggahan di bagian bawah.'
				]
			},
			{
				title: 'Excel Bulanan',
				example: 'excel-rejected',
				steps: [
					'Buka **Upload**, tab **Excel Bulanan**.',
					'Pilih **Bulan** dan **Tahun** di panel kanan, lalu tekan **Unduh Template**. Template sudah terisi data tersimpan, jadi cukup dikoreksi.',
					'Isi template. Kolom **kode_plta** adalah kuncinya; **nama_plta** hanya rujukan.',
					'Tarik berkas ke kotak unggah, atau klik kotaknya untuk memilih berkas.',
					'Tekan **Unggah sekarang**.'
				],
				notes: [
					'Berkas langsung tersimpan — tidak ada tahap pratinjau.',
					'Bila satu baris bermasalah, **seluruh berkas ditolak** dan tabel **Baris bermasalah** menunjukkan barisnya. Perbaiki lalu unggah ulang.',
					'Sel yang dikosongkan tidak menghapus nilai lama. Format harus .xlsx, maksimum 5 MB.'
				]
			},
			{
				title: 'Excel Harian',
				steps: [
					'Buka **Upload**, tab **Excel Harian**.',
					'Isi rentang tanggal **Dari** dan **Sampai** (maksimal 92 hari), lalu tekan **Unduh Template**.',
					'Nyalakan **Baris per jam** bila ingin 24 baris per PLTA per tanggal (satu per jam 0–23); tanpa itu, template satu baris per tanggal.',
					'Isi template: satu baris per PLTA per tanggal. Biarkan kosong sel yang berlatar gelap.',
					'Tarik berkas ke kotak unggah. Pilih perlakuan **Sel kosong di berkas**, lalu tekan **Unggah sekarang**.'
				],
				notes: [
					'Template sudah terisi nilai yang tersimpan, jadi cukup dikoreksi. Sel kosong tidak menghapus nilai lama.',
					'**Dilewati** (bawaan): sel kosong tidak mengubah apa pun. **Isi nilai terakhir**: sel kosong diisi nilai terisi terakhir pada kolom dan PLTA yang sama, diurut waktu — nilai yang diisi itu tersimpan sebagai data, dan jumlahnya tampil di hasil unggahan sebagai **Diisi nilai lama**.',
					'Bila satu baris bermasalah, **seluruh berkas ditolak** dan tabel **Baris bermasalah** menunjukkan barisnya.',
					'Konstanta seperti batas TMA dan SWC tidak ada di template — isi lewat **Input data** di Hidrologi Harian.'
				]
			},
			{
				title: 'Gambar Hujan',
				steps: [
					'Buka **Upload**, tab **Gambar Hujan**.',
					'Tekan **Unggah** pada salah satu dari empat gambar: **Prakiraan Curah Hujan**, **Prakiraan Sifat Hujan**, **Realisasi Curah Hujan**, atau **Realisasi Sifat Hujan**.',
					'Pilih **Bulan**, **Tahun**, dan berkas gambarnya.',
					'Tekan **Unggah Gambar**.'
				],
				notes: [
					'Mengunggah ulang periode dan jenis yang sama akan menggantikan gambar sebelumnya.',
					'Gambar yang salah terunggah dan belum ada penggantinya bisa dihapus lewat **Hapus**: pilih periode, periksa gambarnya, lalu tekan **Hapus Gambar** dan **Ya, Hapus**. Penghapusan berlaku untuk seluruh PLTA dan tidak dapat dibatalkan.',
					'Gambar tampil di **Telemetering › Hidrologi Bulanan** untuk seluruh PLTA.'
				]
			},
			{
				title: 'Input EVA',
				steps: [
					'Buka **Upload**, tab **Input EVA**.',
					'Pilih **PLTA** dan **Tahun data** di panel kanan.',
					'Tekan **Unduh Template** untuk mendapatkan kurva yang sudah tersimpan.',
					'Isi kolom **Elevasi**, **Volume**, dan **Area**, lalu pilih berkasnya.',
					'Centang **Publikasikan kurva elevasi–volume setelah diproses** bila kurva langsung dipakai.',
					'Tekan **Unggah ke Server**.'
				],
				notes: [
					'Mengganti PLTA setelah memilih berkas akan mengosongkan pilihan berkas, supaya berkas tidak terunggah ke PLTA yang salah.',
					'Kurva yang diunggah tanpa centang publish tersimpan sebagai **Draft** dan belum dipakai menghitung volume waduk.'
				]
			},
			{
				title: 'Status dan publish kurva EVA',
				steps: [
					'Di tab **Input EVA**, tabel **Status kurva seluruh PLTA** menunjukkan setiap PLTA: **Siap** (kurva dipakai perhitungan), **Draft** (sudah diunggah, belum dipakai), atau **Belum ada**.',
					'Klik nama PLTA di tabel itu untuk membukanya di panel unggah.',
					'Di bagian **Kurva** PLTA itu, tekan **Publish** pada kurva draft agar dipakai menghitung volume waduk.',
					'Untuk menarik kurva dari perhitungan, tekan **Jadikan draft**. Kurva draft yang salah unggah bisa dihapus dengan ikon tempat sampah.'
				],
				notes: [
					'Tanpa kurva yang **Berlaku**, volume waduk dan turunannya di Hidrologi Harian (volume efektif, ketersediaan energi, Service Hour, inflow) kosong.',
					'Kurva lama tetap berlaku sampai ada kurva published yang lebih baru: kurva 2024 bisa masih **Berlaku** di 2026.',
					'Publish ditolak bila titik kurvanya identik dengan kurva PLTA lain — tanda berkas PLTA lain terunggah ke sini. Peringatannya tampil di baris kurva itu.',
					'Hanya kurva draft yang bisa dihapus, dan penghapusan tidak dapat dibatalkan. Kurva published harus dijadikan draft dulu.'
				]
			}
		]
	},
	{
		id: 'katalog',
		title: 'Katalog Data',
		summary: 'Struktur Wilayah Sungai, PLTA, serta tag dan parameter yang tersedia.',
		access: 'dataTools',
		blocks: [
			{
				title: 'Menjelajah katalog',
				steps: [
					'Buka menu **Katalog Data**.',
					'Pilih tab **Wilayah Sungai**, **PLTA**, atau **Tag & Parameter**.',
					'Di tab **Tag & Parameter**, saring daftar berdasarkan PLTA, protokol, dan status.'
				],
				notes: [
					'Satu Wilayah Sungai bisa menaungi beberapa PLTA, tetapi setiap PLTA hanya berada di satu Wilayah Sungai.'
				]
			},
			{
				title: 'Mengatur batas valid tag',
				steps: [
					'Di tab **Tag & Parameter**, tekan **Atur batas** pada tag yang dimaksud.',
					'Isi **Batas bawah** dan/atau **Batas atas**. Biarkan kosong bila tidak ada batas di sisi itu.',
					'Tekan **Simpan**.'
				],
				notes: [
					'Pembacaan di luar rentang tetap disimpan apa adanya, tetapi ditandai tidak mungkin dan tidak ikut parameter turunan, agregat, maupun akurasi.',
					'Batas berlaku **ke depan**: pembacaan yang sudah tersimpan tidak dinilai ulang.',
					'Mengosongkan **kedua** batas mencabut pembatasan untuk tag itu. Batas bawah harus lebih kecil dari batas atas.'
				]
			}
		]
	},
	{
		id: 'user-management',
		title: 'User Management',
		summary: 'Menambah, mengubah, menonaktifkan, dan menghapus akun pengguna.',
		access: 'userManagement',
		blocks: [
			{
				title: 'Menambah pengguna',
				steps: [
					'Buka menu **User Management** dan tekan **Tambah User**.',
					'Isi **Nama Lengkap**, **Username**, **Email**, dan **Password Awal** (minimal 8 karakter).',
					'Pilih **Peran** dan **Status akun**, lalu tekan **Simpan Pengguna**.'
				],
				notes: [
					'Sampaikan password awal kepada pengguna dan minta ia menggantinya di **Profil Saya**.'
				]
			},
			{
				title: 'Mengelola pengguna',
				example: 'user-status',
				notes: [
					'Tekan sakelar di kolom **Status** untuk mengubah status akun. Menonaktifkan meminta konfirmasi **Ya, nonaktifkan**; pengguna nonaktif tidak bisa masuk.',
					'Tekan ikon edit untuk mengubah nama, email, peran, atau status.',
					'Tekan ikon hapus lalu konfirmasi untuk menghapus akun.',
					'Tekan ikon keluar (di antara ikon edit dan hapus) lalu **Ya, cabut sesi** untuk mengeluarkan pengguna dari semua perangkatnya — misalnya bila akunnya dicurigai dipakai orang lain. Akunnya tetap aktif dan bisa masuk kembali.',
					'Akun Anda sendiri tidak bisa dinonaktifkan, dicabut sesinya, atau dihapus dari sini; barisnya hanya punya tombol **Profil Saya**.'
				]
			}
		]
	},
	{
		id: 'profil',
		title: 'Profil Saya',
		summary:
			'Mengubah data diri dan password akun sendiri, serta mengeluarkan sesi di perangkat lain.',
		blocks: [
			{
				title: 'Mengubah profil',
				steps: [
					'Klik nama Anda di pojok kiri bawah sidebar, lalu pilih **Profil Saya**.',
					'Ubah **Nama Lengkap** atau **Email** di bagian **Informasi Profil**.',
					'Tekan **Simpan Profil**.'
				]
			},
			{
				title: 'Mengganti password',
				steps: [
					'Di bagian **Ganti Password**, isi **Password Saat Ini**.',
					'Isi **Password Baru** dan ulangi di **Konfirmasi Password Baru**.',
					'Tekan **Ubah Password**.'
				]
			},
			{
				title: 'Keluar dari semua perangkat',
				steps: [
					'Di bagian **Sesi di perangkat lain**, tekan **Keluar dari semua perangkat**.',
					'Tekan **Ya, keluar dari semua** pada kotak konfirmasi.'
				],
				notes: [
					'Semua sesi akun Anda dicabut, termasuk di perangkat ini, sehingga semua perangkat harus masuk kembali.',
					'Pakai ini bila Anda curiga akun dipakai di perangkat lain atau lupa keluar di komputer bersama.'
				]
			}
		]
	},
	{
		id: 'faq',
		title: 'Pertanyaan Umum',
		summary: 'Masalah yang paling sering ditemui dan cara mengatasinya.',
		blocks: [
			{
				title: 'Grafik tren bertuliskan "Belum ada titik data pada periode ini"',
				notes: [
					'Belum ada pembacaan untuk parameter itu pada periode yang dipilih. Coba periode yang lebih panjang atau parameter lain.'
				]
			},
			{
				title: 'Halaman menampilkan "belum bisa dimuat"',
				notes: [
					'Sambungan ke server sedang terganggu. Tekan **Coba lagi** di pesan tersebut. Bila berulang, periksa jaringan atau hubungi administrator.'
				]
			},
			{
				title: 'Menu Upload atau Katalog Data tidak terlihat',
				notes: [
					'Kedua menu itu tidak tersedia untuk peran **Viewer**. Minta administrator mengubah peran akun bila Anda perlu mengunggah data.'
				]
			},
			{
				title: 'Unggahan Excel ditolak',
				access: 'dataTools',
				notes: [
					'Periksa tabel **Baris bermasalah** di bawah kotak unggah. Pastikan format berkas .xlsx, ukurannya di bawah 5 MB, dan kolomnya sesuai template terbaru.'
				]
			},
			{
				title: 'Lupa password',
				notes: ['Aplikasi tidak menyediakan reset password mandiri. Hubungi administrator.']
			},
			{
				title: 'Tiba-tiba kembali ke halaman masuk',
				notes: [
					'Sesi Anda berakhir atau Anda keluar dari tab lain. Masuk kembali untuk melanjutkan.'
				]
			}
		]
	}
];

function canRead(access: GuideAccess | undefined, user: User | null): boolean {
	if (access === 'dataTools') return canAccessDataTools(user);
	if (access === 'userManagement') return canManageUsers(user);
	return true;
}

/** Bab dan bagian yang boleh dibaca pengguna ini. Bab tanpa bagian tersisa dibuang. */
export function filterGuideByAccess(chapters: GuideChapter[], user: User | null): GuideChapter[] {
	return chapters.flatMap((chapter) => {
		if (!canRead(chapter.access, user)) return [];

		const blocks = chapter.blocks.filter((block) => canRead(block.access, user));
		return blocks.length > 0 ? [{ ...chapter, blocks }] : [];
	});
}

/** Huruf kecil tanpa penanda tebal, supaya `**Unggah**` cocok dengan pencarian "unggah". */
function normalize(text: string): string {
	return text.replaceAll('**', '').toLocaleLowerCase('id-ID');
}

/**
 * Pencarian panduan. Bab yang judul atau ringkasannya cocok ditampilkan utuh;
 * selain itu hanya bagian yang cocok yang tersisa. Setiap kata harus muncul,
 * tapi urutannya bebas — "upload eva" menemukan bagian Input EVA.
 */
export function searchGuide(chapters: GuideChapter[], query: string): GuideChapter[] {
	const terms = normalize(query).split(/\s+/).filter(Boolean);
	if (terms.length === 0) return chapters;

	const matches = (...texts: string[]) => {
		const haystack = normalize(texts.join(' '));
		return terms.every((term) => haystack.includes(term));
	};

	return chapters.flatMap((chapter) => {
		if (matches(chapter.title, chapter.summary)) return [chapter];

		const blocks = chapter.blocks.filter((block) =>
			matches(chapter.title, block.title, ...(block.steps ?? []), ...(block.notes ?? []))
		);
		return blocks.length > 0 ? [{ ...chapter, blocks }] : [];
	});
}

/** Memecah `**tebal**` menjadi potongan teks biasa dan tebal. */
export function parseEmphasis(text: string): { text: string; strong: boolean }[] {
	return text
		.split('**')
		.map((part, index) => ({ text: part, strong: index % 2 === 1 }))
		.filter((part) => part.text.length > 0);
}
