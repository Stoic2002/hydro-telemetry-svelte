import type { Plant } from './model';
import { plantMatchesIdentity } from './presentation';

export type HydrologyZone = 'upstream' | 'dam' | 'downstream';

export const HYDROLOGY_ZONES: HydrologyZone[] = ['upstream', 'dam', 'downstream'];

export interface HydrologyZonePresentation {
	order: number;
	title: string;
	markerClassName: string;
	badgeClassName: string;
	/** Isian kartu saat zona itu sedang disorot — bukan warna tetap. */
	highlightSurfaceClassName: string;
	/** Cincin sorot mengikuti warna zonanya sendiri, bukan cyan untuk semua. */
	highlightRingClassName: string;
	dividerClassName: string;
	borderClassName: string;
	/** Warna dasar penanda dan arsiran zona di atas foto bendungan. */
	accentColor: string;
	/** Warna teks di atas `accentColor`, dipakai label penanda pada citra. */
	accentTextColor: string;
}

/**
 * Warna zona hanya muncul saat zona itu jadi tujuan sorot. Sebelumnya kolom
 * Bendungan berlatar amber permanen sementara cincin sorotnya selalu cyan,
 * sehingga warna tidak pernah menunjuk ke zona yang sedang dibaca — kartu
 * Bendungan terlihat seperti sedang berstatus peringatan padahal tidak.
 */
export const HYDROLOGY_ZONE_PRESENTATION: Record<HydrologyZone, HydrologyZonePresentation> = {
	upstream: {
		order: 1,
		title: 'Hulu',
		markerClassName: 'bg-brand-primary text-cyan-950',
		badgeClassName: 'bg-cyan-100 text-cyan-700',
		highlightSurfaceClassName: 'bg-cyan-50/70',
		highlightRingClassName: 'ring-cyan-400',
		dividerClassName: 'divide-surface-overlay',
		borderClassName: 'border-surface-overlay',
		accentColor: '#22d3ee',
		accentTextColor: '#083344'
	},
	dam: {
		order: 2,
		title: 'Bendungan',
		markerClassName: 'bg-amber-500 text-white',
		badgeClassName: 'bg-amber-500 text-white',
		highlightSurfaceClassName: 'bg-amber-50/70',
		highlightRingClassName: 'ring-amber-400',
		dividerClassName: 'divide-surface-overlay',
		borderClassName: 'border-surface-overlay',
		accentColor: '#f59e0b',
		accentTextColor: '#ffffff'
	},
	downstream: {
		order: 3,
		title: 'Hilir',
		markerClassName: 'bg-status-success text-emerald-950',
		badgeClassName: 'bg-emerald-100 text-emerald-700',
		highlightSurfaceClassName: 'bg-emerald-50/70',
		highlightRingClassName: 'ring-emerald-400',
		dividerClassName: 'divide-surface-overlay',
		borderClassName: 'border-surface-overlay',
		accentColor: '#34d399',
		accentTextColor: '#022c22'
	}
};

export interface DamImageryAnchor {
	/** Posisi horizontal pada foto, 0-100 dari tepi kiri. */
	xPercent: number;
	/** Posisi vertikal pada foto, 0-100 dari tepi atas. */
	yPercent: number;
	/**
	 * Bentuk arsiran zona. Opsional — tanpa ini dipakai elips generik.
	 */
	field?: DamImageryField;
}

/**
 * Arsiran zona punya dua bentuk.
 *
 * `ellipse` adalah pendekatan kasar: cukup untuk menandai "kira-kira di sini",
 * dan itu yang dipakai selama bentuk aslinya belum ditelusuri.
 *
 * `outline` adalah batas sesungguhnya — garis pantai waduk, kaki tanggul, tepi
 * alur keluaran — dan itulah yang membuat arsiran terbaca sebagai wilayah, bukan
 * sebagai noda di atas citra. Titiknya persen terhadap bingkai, sama seperti
 * anchor, jadi ikut benar bila bingkainya berubah.
 */
export type DamImageryField =
	| {
			kind: 'ellipse';
			/** Setengah-lebar elips, persen dari lebar citra. */
			widthPercent: number;
			/** Setengah-tinggi elips, persen dari tinggi citra. */
			heightPercent: number;
			/** Rotasi elips dalam derajat, searah jarum jam. */
			angle: number;
	  }
	| { kind: 'outline'; points: readonly (readonly [number, number])[] };

export interface DamImagery {
	damName: string;
	location: string;
	frame: DamImageryFrame;
	anchors: Record<HydrologyZone, DamImageryAnchor>;
	imageUrl: string;
	mapUrl: string;
	alt: string;
}

interface DamImageryDefinition extends DamImagery {
	identities: string[];
}

/**
 * Bingkai gambar dalam satuan SVG. Rasionya milik masing-masing bendungan,
 * bukan konstanta global: memutar citra untuk meluruskan arah aliran mengubah
 * rasio bingkainya, dan citra bendungan lain tidak boleh ikut terpotong karena
 * itu. `<figure>` mengambil `aspect-ratio`-nya dari sini, jadi keduanya
 * dijamin tidak pernah lepas sinkron.
 */
export interface DamImageryFrame {
	width: number;
	height: number;
}

export const DEFAULT_DAM_FRAME: DamImageryFrame = { width: 1600, height: 1000 };

/**
 * Anchor persen → koordinat viewBox. 0% berarti tepi kiri/atas, 100% tepi
 * kanan/bawah, 50% titik tengah.
 *
 * Dulu di sini ada proyeksi lat/long terhadap bbox citra satelit beserta cabang
 * rotasi 180°. Keduanya hilang bersama citra satelitnya: foto disiapkan sudah
 * dalam orientasi yang benar, jadi posisi penanda cukup ditulis sebagai persen
 * di atas fotonya.
 */
export function projectDamAnchor(
	anchor: DamImageryAnchor,
	frame: DamImageryFrame
): { x: number; y: number } {
	return {
		x: (anchor.xPercent / 100) * frame.width,
		y: (anchor.yPercent / 100) * frame.height
	};
}

/**
 * Bentuk arsiran bawaan, dipakai bila anchor tidak menyebutkannya sendiri.
 *
 * Bendungan dibuat paling kecil karena bangunannya memang satu titik,
 * sedangkan hulu (genangan waduk) dan hilir (alur sungai) mencakup area yang
 * jauh lebih luas.
 */
const DEFAULT_ZONE_FIELD: Record<HydrologyZone, DamImageryField> = {
	upstream: { kind: 'ellipse', widthPercent: 18.75, heightPercent: 22.5, angle: 0 },
	dam: { kind: 'ellipse', widthPercent: 10.9, heightPercent: 14, angle: 0 },
	downstream: { kind: 'ellipse', widthPercent: 16.6, heightPercent: 20.5, angle: 0 }
};

export type DamZoneShape =
	| { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; angle: number }
	| { kind: 'polygon'; points: string };

/** Bentuk arsiran satu zona dalam satuan viewBox, siap dipakai `<ellipse>`. */
export function resolveDamZoneField(
	zone: HydrologyZone,
	anchor: DamImageryAnchor,
	frame: DamImageryFrame
): DamZoneShape {
	const field = anchor.field ?? DEFAULT_ZONE_FIELD[zone];

	if (field.kind === 'outline') {
		return {
			kind: 'polygon',
			points: field.points
				.map(([x, y]) => `${(x / 100) * frame.width},${(y / 100) * frame.height}`)
				.join(' ')
		};
	}

	const { x, y } = projectDamAnchor(anchor, frame);

	return {
		kind: 'ellipse',
		cx: x,
		cy: y,
		rx: (field.widthPercent / 100) * frame.width,
		ry: (field.heightPercent / 100) * frame.height,
		angle: field.angle
	};
}

function satelliteMapUrl(latitude: number, longitude: number): string {
	const params = new URLSearchParams({
		api: '1',
		map_action: 'map',
		center: `${latitude},${longitude}`,
		zoom: '16',
		basemap: 'satellite'
	});

	return `https://www.google.com/maps/@?${params.toString()}`;
}

/**
 * Gambar dilayani dari `static/dam/`, jadi origin-nya sama dengan aplikasi dan
 * ter-cache browser. Sebelumnya setiap kali halaman dibuka browser menembak
 * server ArcGIS di luar jaringan dan menunggu JPG 1600x1000 di-render di sana —
 * lambat lewat LAN dan tunnel, dan gagal total begitu internet putus.
 *
 * Isinya tetap citra Esri World Imagery, hanya diambil sekali lalu disimpan.
 * Kredit sumbernya sengaja TIDAK ditampilkan — keputusan tim, kotak keterangan
 * di atas citra dinilai mengganggu. Kalau citra ini nanti diganti foto milik
 * PLN sendiri, persoalannya selesai dengan sendirinya.
 *
 * Orientasi tiap berkas ditentukan saat menyimpan, bukan di kode. Kalau sebuah
 * berkas diputar, seluruh anchor-nya harus ikut dibalik (`100 - nilai` pada
 * kedua sumbu) — tidak ada lagi field `rotation` yang mengurusnya.
 */
const DAM_IMAGERY: DamImageryDefinition[] = [
	{
		identities: ['soedirman', 'mrica', 'pbs'],
		damName: 'Bendungan Panglima Besar Soedirman (Mrica)',
		location: 'Banjarnegara, Jawa Tengah',
		// Berkas Soedirman disimpan terputar 225° dari orientasi utara-di-atas lalu
		// dipotong 2.4:1, supaya aliran terbaca mendatar kiri ke kanan sejajar
		// urutan kartu Hulu → Bendungan → Hilir. Harganya tinggal 26% luas citra
		// semula: memutar bingkai persegi panjang menyisakan sudut kosong yang
		// harus dibuang. Rasio bingkainya karena itu berbeda dari Wonogiri.
		//
		// Batas tiap zona ditelusuri dari citranya sendiri — air diklasifikasi per
		// warna, lalu konturnya disederhanakan — dan ikut diputar bersama
		// citranya, jadi presisinya tidak berkurang oleh rotasi.
		frame: { width: 1600, height: 667 },
		anchors: {
			upstream: {
				xPercent: 9.05,
				yPercent: 36.74,
				field: {
					kind: 'outline',
					points: [
						[25.05, -68.31],
						[31.84, -51.99],
						[29.3, -43.15],
						[37.22, -25.48],
						[38.92, -28.2],
						[42.32, -18.68],
						[42.89, -15.96],
						[41.47, -11.2],
						[45.43, 9.2],
						[51.66, 56.79],
						[66.95, 128.86],
						[62.99, 137.02],
						[59.87, 130.9],
						[56.19, 139.74],
						[57.32, 143.82],
						[55.34, 148.58],
						[54.21, 147.22],
						[52.51, 151.3],
						[50.81, 149.94],
						[48.55, 155.38],
						[47.7, 154.7],
						[44.58, 166.26],
						[36.94, 177.82],
						[33.83, 173.06],
						[31.84, 175.1],
						[28.16, 166.26],
						[29.58, 162.86],
						[32.41, 168.3],
						[33.54, 166.94],
						[34.96, 168.98],
						[36.66, 163.54],
						[34.39, 158.1],
						[31.84, 153.34],
						[29.3, 158.1],
						[27.88, 154.7],
						[24.48, 157.42],
						[-36.67, 10.56],
						[-1.57, -73.75],
						[-1.57, -68.31],
						[-3.55, -63.55],
						[-3.26, -54.71],
						[-1.57, -50.63],
						[1.83, -45.19],
						[3.81, -49.95],
						[6.65, -48.59],
						[9.48, -55.39],
						[11.46, -51.99],
						[12.59, -53.35],
						[18.82, -34.32],
						[19.95, -34.32],
						[24.77, -45.87],
						[23.92, -50.63],
						[25.05, -54.71],
						[22.78, -60.15]
					]
				}
			},
			dam: {
				xPercent: 57.79,
				yPercent: 56.21,
				field: {
					kind: 'outline',
					points: [
						[68.93, 28.92],
						[69.5, 30.28],
						[65.25, 39.11],
						[66.95, 48.63],
						[61.57, 60.19],
						[59.02, 56.79],
						[57.89, 60.87],
						[60.44, 68.35],
						[62.99, 62.23],
						[65.54, 71.07],
						[69.78, 104.39],
						[69.22, 108.47],
						[73.75, 123.42],
						[70.07, 130.9],
						[67.23, 125.46],
						[68.08, 122.06],
						[64.12, 112.55],
						[64.97, 109.15],
						[62.14, 99.63],
						[64.12, 93.51],
						[61.01, 87.39],
						[59.59, 89.43],
						[58.46, 86.71],
						[59.59, 82.63],
						[55.91, 73.79],
						[56.76, 70.39],
						[54.78, 65.63],
						[55.34, 62.91],
						[53.64, 58.83],
						[53.36, 51.35],
						[50.81, 43.87],
						[51.66, 40.47],
						[47.98, 16.68],
						[48.26, 9.2],
						[45.15, -1.0],
						[45.15, -7.8],
						[42.32, -11.88],
						[45.15, -20.04],
						[48.26, -3.04],
						[52.51, 7.16],
						[54.49, 6.48],
						[57.32, 13.28],
						[59.59, 10.56],
						[61.57, 16.68],
						[61.01, 18.04],
						[57.32, 14.64],
						[56.19, 18.72],
						[61.01, 30.28],
						[64.97, 34.36]
					]
				}
			},
			downstream: {
				xPercent: 90.88,
				yPercent: 63.25,
				field: {
					kind: 'outline',
					points: [
						[123.29, 56.11],
						[127.54, 66.31],
						[126.41, 70.39],
						[128.96, 76.51],
						[126.97, 79.91],
						[123.86, 73.79],
						[121.59, 80.59],
						[125.56, 87.39],
						[122.73, 96.91],
						[118.2, 107.79],
						[115.65, 105.75],
						[111.68, 113.9],
						[110.27, 110.51],
						[113.95, 100.31],
						[112.25, 94.87],
						[110.84, 96.91],
						[108.0, 95.55],
						[101.49, 82.63],
						[100.93, 77.19],
						[97.53, 69.03],
						[86.49, 53.39],
						[80.82, 47.95],
						[78.56, 50.67],
						[77.14, 47.27],
						[75.73, 49.31],
						[74.31, 45.91],
						[76.29, 39.79],
						[83.37, 37.76],
						[85.07, 33.68],
						[83.09, 27.56],
						[87.9, 16.0],
						[87.62, 11.24],
						[82.81, -3.04],
						[83.94, -5.76],
						[90.45, 9.88],
						[88.75, 16.68],
						[90.17, 32.32],
						[87.34, 40.47],
						[89.6, 44.55],
						[91.87, 35.04],
						[93.85, 39.79],
						[91.58, 46.59],
						[100.36, 69.03],
						[103.76, 63.59],
						[107.15, 71.75],
						[108.85, 67.67],
						[108.0, 64.27],
						[111.12, 60.87],
						[116.5, 72.43]
					]
				}
			}
		},
		imageUrl: '/dam/soedirman.avif',
		mapUrl: satelliteMapUrl(-7.392557, 109.605829),
		alt: 'Citra satelit Bendungan Panglima Besar Soedirman atau Waduk Mrica di Banjarnegara'
	},
	{
		identities: ['wonogiri', 'gajahmungkur', 'wng'],
		damName: 'Bendungan Wonogiri (Gajah Mungkur)',
		location: 'Wonogiri, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 45,
				yPercent: 22,
				field: {
					kind: 'outline',
					points: [
						[32.92, -1],
						[70.96, -1],
						[71.46, 4.21],
						[72.72, 6.21],
						[73.59, 6.21],
						[75.47, 8.62],
						[77.97, 9.42],
						[80.35, 11.42],
						[80.48, 13.03],
						[79.85, 14.03],
						[79.97, 18.24],
						[70.09, 17.84],
						[64.08, 18.84],
						[60.08, 21.84],
						[56.82, 26.05],
						[56.82, 35.27],
						[55.94, 42.89],
						[55.44, 43.69],
						[54.44, 43.69],
						[53.57, 41.88],
						[52.19, 41.88],
						[50.69, 45.29],
						[47.06, 48.3],
						[46.81, 49.3],
						[36.67, 59.72],
						[30.79, 59.92],
						[35.92, 32.67],
						[37.67, 29.86],
						[37.67, 28.26],
						[38.92, 27.86],
						[38.92, 25.85],
						[38.05, 25.45],
						[37.42, 22.65],
						[35.92, 21.84],
						[35.42, 18.44],
						[33.42, 17.64],
						[32.79, 11.82],
						[31.41, 10.22],
						[29.66, 10.22],
						[28.91, 8.42],
						[28.91, 5.21],
						[30.29, 2.81],
						[31.04, 2.81],
						[31.54, 7.01],
						[32.29, 8.42],
						[33.79, 8.02]
					]
				}
			},
			dam: {
				xPercent: 49.7,
				yPercent: 49.1,
				field: {
					kind: 'outline',
					points: [
						[29.5, 68.5],
						[40, 55.5],
						[48, 46],
						[51.5, 41.5],
						[53.5, 42],
						[56, 44.5],
						[57, 47],
						[55, 50],
						[53, 48],
						[51, 50.5],
						[47, 53.5],
						[42, 57.5],
						[36, 63],
						[31.5, 69.5]
					]
				}
			},
			downstream: {
				xPercent: 51,
				yPercent: 80,
				field: {
					kind: 'outline',
					points: [
						[49.06, 55.51],
						[50.06, 56.31],
						[50.06, 64.13],
						[51.19, 63.73],
						[51.19, 56.91],
						[51.94, 56.91],
						[52.32, 58.52],
						[54.82, 60.32],
						[54.32, 64.73],
						[53.44, 65.53],
						[53.44, 66.73],
						[54.44, 67.33],
						[54.69, 71.54],
						[52.94, 71.74],
						[52.07, 82.16],
						[53.44, 87.78],
						[57.57, 97.6],
						[58.07, 101],
						[53.32, 101],
						[53.32, 98.8],
						[51.94, 97.8],
						[51.81, 93.79],
						[50.44, 92.99],
						[49.94, 89.58],
						[48.81, 89.38],
						[48.06, 86.57],
						[48.06, 83.77],
						[47.18, 81.56],
						[47.18, 79.96],
						[49.31, 80.56],
						[50.19, 78.96],
						[50.19, 76.95],
						[49.81, 74.95],
						[47.43, 75.95],
						[46.18, 74.55],
						[46.68, 73.55],
						[46.56, 71.74],
						[45.06, 70.74],
						[45.06, 59.72],
						[47.56, 60.12],
						[47.68, 57.31],
						[48.56, 57.31]
					]
				}
			}
		},
		imageUrl: '/dam/wonogiri.avif',
		mapUrl: satelliteMapUrl(-7.8381, 110.9266),
		alt: 'Citra satelit Bendungan Wonogiri atau Waduk Gajah Mungkur di Wonogiri'
	},
	// Tiga bendungan berikut diambil dengan cara yang sama seperti Wonogiri:
	// utara di atas, 1600x1000, titik tengah dari garis bendungan dan gedung PLTA
	// di OpenStreetMap. Lebar liputannya disebut di tiap entri karena berbeda.
	{
		// Lebar ±2,6 km: tanggulnya sendiri melengkung lebih dari 1,5 km, dan
		// alur keluaran berbelok dulu sebelum masuk Kali Serang di timur laut.
		identities: ['kedungombo', 'kdo'],
		damName: 'Bendungan Kedung Ombo',
		location: 'Grobogan, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 18,
				yPercent: 55,
				field: {
					kind: 'outline',
					points: [
						[-1, -1],
						[6, -1],
						[9, 4],
						[12, 9],
						[17, 13],
						[21, 19],
						[22, 24],
						[24.5, 30],
						[26, 36],
						[28.5, 41],
						[29, 44],
						[29, 50],
						[31, 58],
						[34, 66],
						[39, 74],
						[45, 82],
						[52, 90],
						[58, 97],
						[59, 101],
						[-1, 101]
					]
				}
			},
			dam: {
				xPercent: 33.75,
				yPercent: 62,
				field: {
					kind: 'outline',
					points: [
						[29, 43],
						[29, 50],
						[31, 58],
						[34, 66],
						[39, 74],
						[45, 82],
						[52, 90],
						[58, 97],
						[60, 101],
						[64, 101],
						[60, 93],
						[54, 85],
						[47, 76],
						[41, 68],
						[37.5, 61],
						[35, 53],
						[33, 45],
						[31, 41]
					]
				}
			},
			downstream: {
				xPercent: 77.5,
				yPercent: 33,
				field: {
					kind: 'outline',
					points: [
						[84.7, -1],
						[90, -1],
						[93.75, 4],
						[96.9, 9],
						[101, 10],
						[101, 16.5],
						[98.1, 16],
						[95, 16],
						[93.75, 11],
						[90, 7],
						[87.5, 10],
						[85, 16],
						[81.9, 24],
						[79.4, 32],
						[76.6, 40],
						[75, 48],
						[73.4, 56],
						[72.5, 64],
						[71.6, 72],
						[70.9, 80],
						[69.4, 80],
						[70, 72],
						[70.9, 64],
						[71.9, 56],
						[73.1, 48],
						[74.7, 40],
						[76.25, 32],
						[78.75, 22],
						[81.9, 12],
						[85, 4]
					]
				}
			}
		},
		imageUrl: '/dam/kedungombo.avif',
		mapUrl: satelliteMapUrl(-7.2586, 110.8398),
		alt: 'Citra satelit Bendungan Kedung Ombo beserta waduk dan Kali Serang di hilirnya'
	},
	{
		// Lebar ±2 km. Waduk di kanan atas, sungai hilir mengalir ke selatan dari
		// kaki bendungan di sisi barat.
		identities: ['wadaslintang', 'wdl'],
		damName: 'Bendungan Wadaslintang',
		location: 'Wonosobo–Kebumen, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 72,
				yPercent: 30,
				field: {
					kind: 'outline',
					points: [
						[34.92, -1],
						[90.74, -1],
						[90.61, 0.8],
						[88.99, 0.8],
						[88.49, 1.8],
						[89.61, 18.04],
						[90.36, 19.04],
						[91.74, 19.24],
						[95.37, 18.44],
						[95.24, 21.84],
						[95.87, 22.24],
						[96.25, 24.45],
						[98.75, 27.05],
						[99, 29.46],
						[101, 29.46],
						[101, 37.47],
						[98.62, 37.47],
						[98.37, 39.08],
						[98.37, 41.48],
						[99.12, 43.09],
						[99.12, 47.49],
						[97.62, 50.9],
						[95.12, 51.1],
						[94.99, 53.91],
						[97.75, 54.71],
						[101, 54.31],
						[101, 55.71],
						[95.12, 56.91],
						[90.11, 59.32],
						[84.98, 64.13],
						[80.35, 66.33],
						[74.84, 63.93],
						[66.08, 58.32],
						[65.21, 59.12],
						[64.58, 55.71],
						[61.08, 47.7],
						[56.7, 38.28],
						[51.69, 29.26],
						[47.06, 22.85],
						[44.56, 20.84],
						[40.18, 20.84]
					]
				}
			},
			dam: {
				xPercent: 54.4,
				yPercent: 40,
				field: {
					kind: 'outline',
					points: [
						[40, 21],
						[44.5, 21],
						[47, 23],
						[52, 30],
						[57, 39],
						[61, 48],
						[64.5, 56],
						[65.5, 62],
						[63, 63.5],
						[58, 61],
						[52, 59],
						[46, 57],
						[43, 56],
						[41, 52],
						[40, 48],
						[40.5, 35]
					]
				}
			},
			downstream: {
				xPercent: 34.6,
				yPercent: 72,
				field: {
					kind: 'outline',
					points: [
						[42, 56],
						[39, 60],
						[36, 65],
						[33.5, 72],
						[31.5, 80],
						[30.8, 90],
						[30.5, 101],
						[32.8, 101],
						[33.2, 90],
						[34, 80],
						[36, 72],
						[38.8, 65],
						[41.8, 60],
						[44, 57.5]
					]
				}
			}
		},
		imageUrl: '/dam/wadaslintang.avif',
		mapUrl: satelliteMapUrl(-7.6081, 109.7812),
		alt: 'Citra satelit Bendungan Wadaslintang beserta waduk di hulunya'
	},
	{
		// Lebar ±2 km. Waduk di atas, saluran keluaran lurus ke tenggara.
		identities: ['sempor', 'smp'],
		damName: 'Bendungan Sempor',
		location: 'Kebumen, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 52,
				yPercent: 20,
				field: {
					kind: 'outline',
					points: [
						[15.64, -1],
						[71.46, -1],
						[72.09, 2.4],
						[75.59, 1.8],
						[75.72, -1],
						[79.22, -1],
						[79.47, 2.61],
						[80.48, 2.81],
						[81.23, 5.81],
						[81.23, 8.42],
						[81.98, 8.62],
						[81.98, 10.22],
						[78.47, 9.82],
						[75.22, 11.22],
						[74.34, 10.82],
						[73.97, 9.02],
						[70.84, 9.02],
						[70.71, 11.42],
						[72.34, 13.23],
						[73.34, 17.84],
						[76.72, 17.64],
						[78.1, 20.64],
						[78.85, 20.84],
						[76.35, 30.66],
						[74.84, 31.46],
						[72.22, 31.06],
						[68.34, 33.67],
						[64.08, 32.87],
						[61.58, 35.47],
						[59.07, 36.27],
						[59.07, 38.28],
						[60.58, 38.68],
						[60.58, 39.88],
						[56.57, 39.88],
						[53.69, 37.68],
						[47.56, 38.28],
						[41.05, 32.46],
						[32.17, 29.66],
						[30.04, 26.85],
						[27.53, 26.05],
						[23.28, 17.03],
						[21.03, 16.23],
						[20.28, 14.43],
						[19.27, 14.23],
						[18.27, 11.42],
						[17.27, 10.82],
						[16.4, 7.01],
						[16.65, 2.61]
					]
				}
			},
			dam: {
				xPercent: 38.75,
				yPercent: 37,
				field: {
					kind: 'outline',
					points: [
						[29, 28.5],
						[33, 30],
						[38, 32],
						[42, 34],
						[46, 37],
						[49.5, 40],
						[50, 42],
						[48, 45],
						[44, 46.5],
						[39, 45],
						[35, 41],
						[32, 36],
						[29.5, 32]
					]
				}
			},
			downstream: {
				xPercent: 63,
				yPercent: 85,
				field: {
					kind: 'outline',
					points: [
						[46.5, 47],
						[47.5, 51],
						[50.5, 57],
						[52.5, 65],
						[54.5, 72],
						[57.5, 78],
						[61.5, 85],
						[65.5, 93],
						[68.5, 101],
						[71.5, 101],
						[68.5, 93],
						[64.5, 85],
						[60.5, 78],
						[57.5, 72],
						[55.5, 65],
						[53.5, 57],
						[50, 50],
						[48.5, 46]
					]
				}
			}
		},
		imageUrl: '/dam/sempor.avif',
		mapUrl: satelliteMapUrl(-7.567, 109.486),
		alt: 'Citra satelit Bendungan Sempor beserta waduk dan saluran keluarannya'
	},
	// Tiga PLTA berikut berada di bendung, bukan bendungan waduk: "hulu" adalah
	// genangan di belakang mercu bendung, "hilir" sungai di bawahnya.
	{
		// Lebar ±1,6 km. Bendung di Kali Serang ±6 km hilir Kedung Ombo, Desa
		// Ngleses, Juwangi. Tidak tercatat di OpenStreetMap; posisinya dikenali dari
		// citra (genangan, mercu, intake saluran irigasi ke utara) dan alamat PLTA
		// Sidorejo. Genangan di barat daya, sungai berlanjut ke timur.
		identities: ['sidorejo', 'sdj'],
		damName: 'Bendung Sidorejo',
		location: 'Boyolali, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 35,
				yPercent: 70,
				field: {
					kind: 'outline',
					points: [
						[50, 48],
						[47, 47.5],
						[44, 48],
						[40, 50],
						[35, 53],
						[30, 58],
						[27, 63],
						[25.5, 70],
						[26, 78],
						[26.5, 88],
						[27, 101],
						[34, 101],
						[34, 92],
						[35, 84],
						[36.5, 76],
						[39, 70],
						[42, 65.5],
						[46, 62],
						[50, 60],
						[50.3, 57.5]
					]
				}
			},
			dam: {
				xPercent: 51.6,
				yPercent: 51,
				field: {
					kind: 'outline',
					points: [
						[46.5, 44],
						[52.5, 44],
						[53, 48],
						[52.5, 57.5],
						[50.3, 57.5],
						[50, 50],
						[47, 48]
					]
				}
			},
			downstream: {
				xPercent: 62,
				yPercent: 53,
				field: {
					kind: 'outline',
					points: [
						[52.94, 46.29],
						[53.44, 46.49],
						[53.44, 48.5],
						[54.07, 49.5],
						[55.94, 49.5],
						[56.2, 47.09],
						[57.45, 47.09],
						[58.57, 48.7],
						[61.2, 49.7],
						[64.08, 52.3],
						[67.33, 56.71],
						[68.21, 56.71],
						[69.21, 58.52],
						[72.97, 60.52],
						[73.59, 61.92],
						[75.34, 63.33],
						[75.72, 64.93],
						[78.72, 65.53],
						[80.6, 72.95],
						[81.48, 74.35],
						[83.1, 73.55],
						[83.1, 75.95],
						[83.98, 77.35],
						[84.98, 77.35],
						[85.61, 79.16],
						[84.73, 79.36],
						[82.6, 77.76],
						[79.47, 72.55],
						[78.72, 70.14],
						[76.97, 69.14],
						[75.09, 66.53],
						[74.84, 65.33],
						[73.47, 64.53],
						[72.34, 62.73],
						[68.71, 60.32],
						[67.21, 60.72],
						[67.21, 58.72],
						[63.45, 54.31],
						[58.57, 53.71],
						[55.94, 55.71],
						[55.94, 54.91],
						[57.07, 53.91],
						[57.07, 52.71],
						[55.32, 51.5],
						[53.07, 51.5]
					]
				}
			}
		},
		imageUrl: '/dam/sidorejo.avif',
		mapUrl: satelliteMapUrl(-7.2143, 110.8462),
		alt: 'Citra satelit Bendung Sidorejo di Kali Serang beserta genangan di hulunya'
	},
	{
		// Lebar ±1,8 km. Kali Serang datang dari tenggara, bendung melepas ke barat,
		// dan dua saluran irigasi besar bercabang di kiri citra.
		identities: ['klambu', 'klb'],
		damName: 'Bendung Klambu',
		location: 'Grobogan, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 60,
				yPercent: 45,
				field: {
					kind: 'outline',
					points: [
						[49.5, 40],
						[60, 40.5],
						[64.5, 41.5],
						[66.5, 44],
						[67.5, 48],
						[68, 55],
						[68, 62],
						[67.5, 70],
						[67, 80],
						[67, 90],
						[68, 101],
						[63, 101],
						[62.5, 90],
						[62.5, 80],
						[63, 70],
						[63.5, 62],
						[63.5, 55],
						[62, 51],
						[56, 50.5],
						[50, 51]
					]
				}
			},
			dam: {
				xPercent: 47,
				yPercent: 45,
				field: {
					kind: 'outline',
					points: [
						[44.5, 39.5],
						[49.5, 39.5],
						[50, 45],
						[49.5, 51],
						[44.5, 51]
					]
				}
			},
			downstream: {
				xPercent: 18.3,
				yPercent: 44,
				field: {
					kind: 'outline',
					points: [
						[-1, 39.5],
						[20, 40.5],
						[44.5, 40],
						[44.5, 50],
						[35, 50],
						[25, 49.5],
						[18, 48],
						[12, 47.5],
						[5, 48],
						[-1, 48.5]
					]
				}
			}
		},
		imageUrl: '/dam/klambu.avif',
		mapUrl: satelliteMapUrl(-7.0185, 110.8035),
		alt: 'Citra satelit Bendung Klambu di Kali Serang beserta saluran irigasinya'
	},
	{
		// Lebar ±1,8 km. Genangan berkelok di utara, sungai berlanjut ke selatan.
		identities: ['pejengkolan', 'pjkl'],
		damName: 'Bendung Pejengkolan',
		location: 'Kebumen, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 45,
				yPercent: 42,
				field: {
					kind: 'outline',
					points: [
						[55.57, -1],
						[61.33, -1],
						[61.33, 1.4],
						[62.33, 3.01],
						[62.33, 6.81],
						[61.45, 12.63],
						[60.08, 17.03],
						[59.32, 17.03],
						[56.95, 19.84],
						[49.81, 21.84],
						[48.94, 22.85],
						[45.43, 23.25],
						[43.3, 24.85],
						[43.3, 26.85],
						[43.93, 27.66],
						[44.93, 32.67],
						[46.31, 36.27],
						[46.31, 39.08],
						[47.06, 40.08],
						[47.06, 41.68],
						[48.56, 42.08],
						[48.56, 43.29],
						[49.44, 43.89],
						[49.44, 45.89],
						[50.19, 47.29],
						[49.56, 54.71],
						[43.68, 55.31],
						[42.18, 52.1],
						[42.3, 49.1],
						[39.8, 42.28],
						[39.67, 37.68],
						[38.55, 33.07],
						[36.67, 31.46],
						[35.17, 28.86],
						[34.92, 24.65],
						[36.17, 22.24],
						[36.05, 16.83],
						[38.17, 15.83],
						[38.55, 14.63],
						[43.93, 14.23],
						[46.43, 11.82],
						[48.69, 11.62],
						[51.44, 9.02],
						[52.19, 6.21],
						[53.44, 6.21],
						[55.07, 4.41]
					]
				}
			},
			dam: {
				xPercent: 48.5,
				yPercent: 57.5,
				field: {
					kind: 'outline',
					points: [
						[41.5, 55.5],
						[54, 54.5],
						[55, 57],
						[54.5, 60.5],
						[42, 60.5]
					]
				}
			},
			downstream: {
				xPercent: 47.5,
				yPercent: 80,
				field: {
					kind: 'outline',
					points: [
						[43.5, 60.5],
						[51, 60.5],
						[50.5, 64],
						[49.8, 68],
						[49.2, 75],
						[48.8, 82],
						[47.8, 90],
						[47.2, 101],
						[45, 101],
						[45.6, 90],
						[46.4, 82],
						[46.8, 75],
						[46.5, 68],
						[45, 64]
					]
				}
			}
		},
		imageUrl: '/dam/pejengkolan.avif',
		mapUrl: satelliteMapUrl(-7.6591, 109.7718),
		alt: 'Citra satelit Bendung Pejengkolan beserta genangan di hulunya'
	},
	// PLTA berikut memakai saluran atau terowongan panjang: sumber air dan gedung
	// pembangkitnya berjarak beberapa kilometer, jadi bingkainya jauh lebih lebar
	// (2,4–6,6 km) dan "hilir" adalah gedung PLTA, bukan sungai di kaki bendung.
	// Posisi anchor dihitung dari koordinat, bukan diukur dari gambar.
	{
		// Lebar ±5,4 km. Air Telaga Menjer turun lewat pipa pesat ke gedung PLTA
		// ±2,3 km di selatan telaga.
		identities: ['garung', 'grg'],
		damName: 'Telaga Menjer',
		location: 'Wonosobo, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 54.1,
				yPercent: 15.4,
				field: {
					kind: 'outline',
					points: [
						[47.68, -1],
						[48.44, -1],
						[48.56, 1],
						[49.56, 1],
						[49.69, -1],
						[61.58, -1],
						[62.08, 5.01],
						[61.33, 5.41],
						[61.33, 8.02],
						[62.7, 9.22],
						[62.7, 12.63],
						[61.83, 13.63],
						[61.45, 17.43],
						[60.45, 18.44],
						[60.45, 20.84],
						[59.07, 24.05],
						[56.95, 26.25],
						[55.69, 26.45],
						[54.82, 25.25],
						[53.82, 25.25],
						[53.19, 23.65],
						[51.56, 23.65],
						[50.69, 22.04],
						[49.94, 22.04],
						[48.81, 15.23],
						[47.93, 14.03],
						[47.93, 10.42],
						[46.93, 10.22],
						[46.43, 7.41],
						[46.56, 4.21]
					]
				}
			},
			dam: {
				xPercent: 57,
				yPercent: 28.2,
				field: {
					kind: 'outline',
					points: [
						[54.5, 26.8],
						[57.5, 26.2],
						[59, 27.2],
						[58.5, 29.5],
						[56, 29.8],
						[54.5, 28.5]
					]
				}
			},
			downstream: {
				xPercent: 46.3,
				yPercent: 90.6,
				field: {
					kind: 'outline',
					points: [
						[44.3, 86.5],
						[47.5, 86.8],
						[48, 89],
						[47.3, 91.5],
						[46.5, 94],
						[46, 97],
						[45.8, 101],
						[44, 101],
						[44.2, 97],
						[44.5, 94],
						[44, 91],
						[43.8, 88.5]
					]
				}
			}
		},
		imageUrl: '/dam/garung.avif',
		mapUrl: satelliteMapUrl(-7.2734, 109.9269),
		alt: 'Citra satelit Telaga Menjer dan gedung PLTA Garung di selatannya'
	},
	{
		// Lebar ±4,2 km. Air Rawa Pening keluar lewat Bendung Tuntang (kiri bawah)
		// dan mengalir ±3 km ke gedung PLTA Jelok (kanan atas).
		identities: ['jelok', 'jlo'],
		damName: 'Bendung Tuntang',
		location: 'Kabupaten Semarang, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 16.5,
				yPercent: 82,
				field: {
					kind: 'outline',
					points: [
						[8.7, 92],
						[9.9, 90],
						[13.8, 85],
						[16.3, 80],
						[18.3, 75],
						[20.2, 71],
						[21.3, 71],
						[20.2, 75],
						[18.6, 80],
						[16, 85],
						[13.3, 90],
						[10.2, 92]
					]
				}
			},
			dam: {
				xPercent: 21.4,
				yPercent: 70.4,
				field: {
					kind: 'outline',
					points: [
						[19.8, 68.8],
						[22.5, 68.3],
						[23, 70.5],
						[22, 72],
						[20, 71.8]
					]
				}
			},
			downstream: {
				xPercent: 85,
				yPercent: 18.6,
				field: {
					kind: 'outline',
					points: [
						[82.5, 15.5],
						[86.5, 14.5],
						[88.5, 16],
						[89, 21],
						[89, 25.5],
						[86, 26],
						[84.5, 21],
						[82.5, 19.5]
					]
				}
			}
		},
		imageUrl: '/dam/jelok.avif',
		mapUrl: satelliteMapUrl(-7.2563, 110.4571),
		alt: 'Citra satelit Bendung Tuntang di keluaran Rawa Pening dan gedung PLTA Jelok'
	},
	{
		// Lebar ±6,6 km. Air buangan PLTA Jelok ditampung Kolam Tando lalu dialirkan
		// lewat terowongan ±4 km ke gedung PLTA Timo di utara.
		identities: ['timo', 'tmo'],
		damName: 'Kolam Tando Timo',
		location: 'Kabupaten Semarang, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 34.6,
				yPercent: 87.5,
				field: {
					kind: 'outline',
					points: [
						[32.8, 85],
						[36, 84.8],
						[36.3, 87],
						[37.5, 89],
						[37.8, 92.2],
						[35, 92.5],
						[34, 89],
						[32.8, 88]
					]
				}
			},
			dam: {
				xPercent: 49.7,
				yPercent: 78.4,
				field: {
					kind: 'outline',
					points: [
						[48.4, 77.5],
						[49.3, 76.8],
						[50.5, 76.8],
						[51.2, 77.3],
						[51.3, 79],
						[50.6, 80],
						[48.8, 80.1],
						[48.2, 79]
					]
				}
			},
			downstream: {
				xPercent: 68.4,
				yPercent: 11.8,
				field: {
					kind: 'outline',
					points: [
						[67, 10.2],
						[69.5, 10],
						[70, 12],
						[69.3, 14.3],
						[67.2, 14.5],
						[66.8, 12.5]
					]
				}
			}
		},
		imageUrl: '/dam/timo.avif',
		mapUrl: satelliteMapUrl(-7.2409, 110.4903),
		alt: 'Citra satelit PLTA Jelok, Kolam Tando, dan gedung PLTA Timo'
	},
	{
		// Lebar ±3,4 km. Bendung di Kali Banjaran, gedung PLTA ±1 km di selatannya.
		identities: ['ketenger', 'ktg'],
		damName: 'Bendung Ketenger',
		location: 'Banyumas, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 46.9,
				yPercent: 12.3,
				field: {
					kind: 'outline',
					points: [
						[44.3, -1],
						[46, -1],
						[47, 5],
						[47.6, 10],
						[48.3, 15],
						[47.6, 20],
						[48.8, 25],
						[49.2, 28],
						[48, 28],
						[47.5, 25],
						[46.3, 20],
						[46.8, 15],
						[46.2, 10],
						[45.5, 5]
					]
				}
			},
			dam: {
				xPercent: 49.5,
				yPercent: 31.3,
				field: {
					kind: 'outline',
					points: [
						[47.8, 27.5],
						[49.5, 27],
						[50.5, 30.5],
						[51.8, 32],
						[51.5, 34],
						[49.5, 34.5],
						[48.2, 32],
						[47.6, 30]
					]
				}
			},
			downstream: {
				xPercent: 54.9,
				yPercent: 76.2,
				field: {
					kind: 'outline',
					points: [
						[53.3, 72.3],
						[55.6, 72.3],
						[55.8, 75.5],
						[56, 80],
						[56.3, 85],
						[56.8, 88.5],
						[55.3, 88.5],
						[54.5, 85],
						[54.2, 80.5],
						[53, 79],
						[52.8, 76]
					]
				}
			}
		},
		imageUrl: '/dam/ketenger.avif',
		mapUrl: satelliteMapUrl(-7.3249, 109.2184),
		alt: 'Citra satelit bendung Kali Banjaran dan gedung PLTA Ketenger'
	},
	{
		// Lebar ±2,4 km. Bendung di Kali Tulis hilir Pagentan; tercatat di
		// OpenStreetMap tanpa nama. Gedung PLTA-nya di ujung terowongan dan belum
		// ditemukan koordinatnya, jadi hilir di sini sungai di bawah bendung.
		identities: ['tulis', 'tls'],
		damName: 'Bendung Tulis',
		location: 'Banjarnegara, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: {
				xPercent: 53,
				yPercent: 45,
				field: {
					kind: 'outline',
					points: [
						[48.5, 42.5],
						[50, 40.5],
						[53, 40.5],
						[56.5, 40.8],
						[59, 40.2],
						[61, 40.3],
						[63, 42.5],
						[66, 44.5],
						[70, 45.5],
						[74, 45],
						[77, 43.5],
						[80, 43.5],
						[82.5, 42.5],
						[84.5, 38.5],
						[88, 37],
						[92, 34],
						[95, 28],
						[98, 22],
						[101, 17],
						[101, 21.5],
						[98.5, 26],
						[96, 31],
						[93, 36.5],
						[89, 39.5],
						[85.5, 41],
						[83.5, 44.5],
						[80, 46],
						[76, 46.5],
						[72, 48],
						[68, 47.5],
						[64.5, 46.8],
						[61, 45],
						[58, 46],
						[55, 47.5],
						[52.5, 48.3],
						[48.2, 48.8],
						[47.5, 46]
					]
				}
			},
			dam: {
				xPercent: 50.2,
				yPercent: 50.5,
				field: {
					kind: 'outline',
					points: [
						[48.2, 48.8],
						[52.5, 48.3],
						[52.3, 51.5],
						[50.5, 54.5],
						[48.8, 54],
						[48.3, 51]
					]
				}
			},
			downstream: {
				xPercent: 41,
				yPercent: 72,
				field: {
					kind: 'outline',
					points: [
						[48.8, 54],
						[50.5, 54.5],
						[48.5, 57.5],
						[46.5, 60.5],
						[44, 63.5],
						[42.5, 67],
						[41.8, 71],
						[40.5, 75],
						[38.5, 79],
						[37.5, 83],
						[38, 86],
						[37.3, 90],
						[35.5, 94],
						[34, 98],
						[33, 101],
						[31.5, 101],
						[32.8, 96],
						[34.8, 92],
						[36, 88],
						[35.8, 84],
						[36.5, 80],
						[38.5, 76],
						[39.8, 72],
						[40.5, 67],
						[42.5, 63],
						[45, 60],
						[47, 57]
					]
				}
			}
		},
		imageUrl: '/dam/tulis.avif',
		mapUrl: satelliteMapUrl(-7.3256, 109.7979),
		alt: 'Citra satelit bendung Kali Tulis di Pagentan beserta genangan di hulunya'
	}
];

export function getDamImagery(plant: Pick<Plant, 'code' | 'name'>): DamImagery | null {
	const match = DAM_IMAGERY.find(({ identities }) =>
		identities.some((identity) => plantMatchesIdentity(plant, identity))
	);

	if (!match) return null;

	return {
		damName: match.damName,
		location: match.location,
		frame: match.frame,
		anchors: match.anchors,
		imageUrl: match.imageUrl,
		mapUrl: match.mapUrl,
		alt: match.alt
	};
}
