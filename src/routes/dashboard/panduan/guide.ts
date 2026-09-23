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
					'Tombol panah kecil di tepi sidebar menciutkan sidebar menjadi deretan ikon. Arahkan kursor ke ikon untuk melihat nama menunya.',
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
					'Tekan ikon keluar di pojok kiri bawah sidebar, di sebelah nama Anda.',
					'Tekan **Ya, Keluar** pada kotak konfirmasi.'
				],
				notes: ['Keluar dari satu tab juga mengakhiri sesi di tab lain pada browser yang sama.']
			}
		]
	},
	{
		id: 'overview',
		title: 'Overview',
		summary: 'Peta sebaran PLTA di Jawa Tengah beserta citra awan hujan terkini.',
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
			}
		]
	},
	{
		id: 'telemetering',
		title: 'Telemetering',
		summary: 'Rekap seluruh PLTA, serta kondisi hidrologi bulanan dan harian per PLTA.',
		blocks: [
			{
				title: 'Rekap Hidrologi',
				steps: [
					'Buka **Telemetering › Rekap Hidrologi**.',
					'Pilih **Bulan** — atau **Sepanjang tahun** — dan **Tahun**.',
					'Baca **Ringkasan armada**, lalu unduh **Laporan Hidrologi Bulanan** atau **Laporan Hidrologi Harian** dengan **Unduh Excel**.'
				],
				notes: [
					'**Pencapaian armada** adalah total prediksi dibagi total target seluruh PLTA — angka yang dipakai untuk melaporkan kinerja gabungan. **Rata-rata antar-PLTA** memberi bobot sama pada setiap PLTA, besar maupun kecil.',
					'Baris yang prediksi atau targetnya belum diisi tidak dihitung sebagai "tidak tercapai" dan tidak ikut angka armada.',
					'Pilih **Cakupan PLTA** untuk mempersempit laporan ke satu PLTA, dan pilih panel Hulu, Bendungan, atau Hilir untuk laporan harian.'
				]
			},
			{
				title: 'Hidrologi Bulanan',
				steps: [
					'Buka **Telemetering › Hidrologi Bulanan**.',
					'Pilih **Bulan** dan **Tahun** pada bagian **Periode**.',
					'Baca prediksi dan realisasi di bagian **Ringkasan**, serta gambar **Curah Hujan** dan **Sifat Hujan** di bagian **Prakiraan Hujan**.'
				]
			},
			{
				title: 'Mengisi ringkasan bulanan',
				example: 'monthly-input-button',
				access: 'dataTools',
				steps: [
					'Pada bagian **Ringkasan**, tekan **Input data** — atau **Edit data** bila periode itu sudah terisi.',
					'Isi kondisi hidrologi dan energi produksi (dalam MWh).',
					'Tekan **Simpan Data**.'
				],
				notes: [
					'Field yang dikosongkan tidak menimpa data yang sudah tersimpan.',
					'Persentase pencapaian dihitung otomatis oleh server.',
					'Untuk mengisi seluruh PLTA sekaligus, gunakan menu **Upload** tab **Excel Bulanan**.'
				]
			},
			{
				title: 'Hidrologi Harian',
				example: 'source-markers',
				notes: [
					'Menampilkan kondisi **hari ini** untuk tiga zona: hulu, bendungan, dan hilir.',
					'Penanda **Realtime aktif** berarti nilai diperbarui langsung dari lapangan. Bila tertulis **Realtime belum aktif**, tekan **Hubungkan ulang** bila tombol itu muncul.',
					'Penanda di depan setiap nilai menunjukkan asalnya: **Formulasi** (dihitung), **Input** (diisi manual), **Konstanta**, atau **Belum tersedia**.'
				]
			},
			{
				title: 'Mengatur unit beban penuh',
				example: 'dmn-picker',
				steps: [
					'Di zona hulu, cari bagian **Unit beban penuh**.',
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
					'Berkas Excel hanya untuk satu parameter, dengan kolom **datetime + value** atau **tanggal + jam + value**.'
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
			}
		]
	},
	{
		id: 'tren',
		title: 'Tren & Grafik',
		summary: 'Grafik riwayat satu parameter dalam 24 jam, 7 hari, atau 30 hari terakhir.',
		blocks: [
			{
				title: 'Menampilkan grafik',
				example: 'trend-period',
				steps: [
					'Buka menu **Tren & Grafik** dan pilih PLTA di kanan atas.',
					'Pilih parameter dari kotak pilihan di bawah judul halaman.',
					'Pilih periode: **24 Jam Terakhir**, **7 Hari Terakhir**, atau **30 Hari Terakhir**.',
					'Arahkan kursor ke grafik untuk melihat nilai pada waktu tertentu.'
				]
			},
			{
				title: 'Membaca grafik',
				notes: [
					'Baris di atas grafik berisi **Rata-rata**, **Minimum**, **Maksimum**, dan **Perubahan periode**.',
					'Garis putus-putus adalah nilai rata-rata periode.',
					'Curah hujan digambar sebagai batang dan dijumlahkan; parameter lain dirata-rata.',
					'Nilai yang jauh di luar batas wajar tidak ikut digambar, dan jumlahnya disebutkan di atas grafik.'
				]
			},
			{
				title: 'Membagikan grafik',
				notes: [
					'Parameter dan periode tersimpan di alamat halaman. Salin alamat dari browser untuk membagikan grafik yang sama persis.'
				]
			}
		]
	},
	{
		id: 'laporan',
		title: 'Laporan',
		summary: 'Membuat dan mengunduh laporan time series bulanan dalam format Excel.',
		blocks: [
			{
				title: 'Membuat laporan',
				example: 'report-create',
				steps: [
					'Buka menu **Laporan** dan pilih PLTA di kanan atas.',
					'Tekan **Buat Laporan**.',
					'Pilih **Bulan** dan **Tahun**, lalu centang parameter yang dibutuhkan.',
					'Tekan **Buat Laporan** pada panel.'
				],
				notes: ['Laporan diproses di server dan langsung muncul di daftar.']
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
					'Gunakan kotak pencarian untuk menemukan laporan lama.'
				]
			}
		]
	},
	{
		id: 'upload',
		title: 'Upload',
		summary: 'Excel ringkasan bulanan, gambar prakiraan hujan, dan kurva EVA per PLTA.',
		access: 'dataTools',
		blocks: [
			{
				title: 'Empat jenis unggahan',
				example: 'upload-tabs',
				notes: [
					'**Excel Bulanan**, **Excel Harian**, dan **Prakiraan Hujan** berlaku untuk **seluruh PLTA** sekaligus.',
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
					'Isi template: satu baris per PLTA per tanggal. Biarkan kosong sel yang berlatar gelap.',
					'Tarik berkas ke kotak unggah, lalu tekan **Unggah sekarang**.'
				],
				notes: [
					'Template sudah terisi nilai yang tersimpan, jadi cukup dikoreksi. Sel kosong tidak menghapus nilai lama.',
					'Bila satu baris bermasalah, **seluruh berkas ditolak** dan tabel **Baris bermasalah** menunjukkan barisnya.',
					'Konstanta seperti batas TMA dan SWC tidak ada di template — isi lewat **Input data** di Hidrologi Harian.'
				]
			},
			{
				title: 'Prakiraan Hujan',
				steps: [
					'Buka **Upload**, tab **Prakiraan Hujan**.',
					'Tekan **Unggah** pada **Curah Hujan** atau **Sifat Hujan**.',
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
					'Mengganti PLTA setelah memilih berkas akan mengosongkan pilihan berkas, supaya berkas tidak terunggah ke PLTA yang salah.'
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
					'Klik **Aktif** atau **Nonaktif** di kolom **Status** untuk mengubah status akun. Pengguna nonaktif tidak bisa masuk.',
					'Tekan ikon edit untuk mengubah nama, email, peran, atau status.',
					'Tekan ikon hapus lalu konfirmasi untuk menghapus akun.',
					'Akun Anda sendiri tidak bisa dinonaktifkan atau dihapus dari sini; kelola lewat **Profil Saya**.'
				]
			}
		]
	},
	{
		id: 'profil',
		title: 'Profil Saya',
		summary: 'Mengubah data diri dan password akun sendiri.',
		blocks: [
			{
				title: 'Mengubah profil',
				steps: [
					'Klik nama Anda di pojok kiri bawah sidebar.',
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
