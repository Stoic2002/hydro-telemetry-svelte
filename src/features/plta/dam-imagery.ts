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
		imageUrl: '/dam/soedirman.jpg',
		mapUrl: satelliteMapUrl(-7.392557, 109.605829),
		alt: 'Citra satelit Bendungan Panglima Besar Soedirman atau Waduk Mrica di Banjarnegara'
	},
	{
		identities: ['wonogiri', 'gajahmungkur', 'wng'],
		damName: 'Bendungan Wonogiri (Gajah Mungkur)',
		location: 'Wonogiri, Jawa Tengah',
		frame: DEFAULT_DAM_FRAME,
		anchors: {
			upstream: { xPercent: 36.0, yPercent: 26.0 },
			dam: { xPercent: 49.7, yPercent: 49.1 },
			downstream: { xPercent: 51.0, yPercent: 80.0 }
		},
		imageUrl: '/dam/wonogiri.jpg',
		mapUrl: satelliteMapUrl(-7.8381, 110.9266),
		alt: 'Citra satelit Bendungan Wonogiri atau Waduk Gajah Mungkur di Wonogiri'
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
