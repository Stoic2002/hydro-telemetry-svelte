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
}

export interface DamImagery {
	damName: string;
	location: string;
	anchors: Record<HydrologyZone, DamImageryAnchor>;
	imageUrl: string;
	mapUrl: string;
	alt: string;
}

interface DamImageryDefinition extends DamImagery {
	identities: string[];
}

/**
 * Bingkai gambar dalam satuan SVG. Rasionya 16:10 dan **harus** sama dengan
 * `aspect-*` pada `<figure>` di `DamHydrologyMap.svelte`, kalau tidak posisi
 * penanda akan meleset dari titik yang dimaksud pada foto.
 */
export const DAM_IMAGERY_VIEWBOX = {
	width: 1600,
	height: 1000
} as const;

/**
 * Anchor persen → koordinat viewBox. 0% berarti tepi kiri/atas, 100% tepi
 * kanan/bawah, 50% titik tengah.
 *
 * Dulu di sini ada proyeksi lat/long terhadap bbox citra satelit beserta cabang
 * rotasi 180°. Keduanya hilang bersama citra satelitnya: foto disiapkan sudah
 * dalam orientasi yang benar, jadi posisi penanda cukup ditulis sebagai persen
 * di atas fotonya.
 */
export function projectDamAnchor(anchor: DamImageryAnchor): { x: number; y: number } {
	return {
		x: (anchor.xPercent / 100) * DAM_IMAGERY_VIEWBOX.width,
		y: (anchor.yPercent / 100) * DAM_IMAGERY_VIEWBOX.height
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
		// Citra Soedirman disimpan utara-di-atas. Konsekuensinya arah aliran
		// terbaca kanan ke kiri — berlawanan dengan urutan kartu Hulu →
		// Bendungan → Hilir di bawahnya. Itu diterima: citra yang terbalik
		// membuat operator ragu apakah yang dilihatnya benar lokasi ini, dan
		// penanda sudah bernomor 1/2/3 sehingga urutannya tetap terbaca.
		anchors: {
			upstream: { xPercent: 75.0, yPercent: 25.0 },
			dam: { xPercent: 49.9, yPercent: 53.7 },
			downstream: { xPercent: 34.0, yPercent: 75.0 }
		},
		imageUrl: '/dam/soedirman.jpg',
		mapUrl: satelliteMapUrl(-7.392557, 109.605829),
		alt: 'Citra satelit Bendungan Panglima Besar Soedirman atau Waduk Mrica di Banjarnegara'
	},
	{
		identities: ['wonogiri', 'gajahmungkur', 'wng'],
		damName: 'Bendungan Wonogiri (Gajah Mungkur)',
		location: 'Wonogiri, Jawa Tengah',
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
		anchors: match.anchors,
		imageUrl: match.imageUrl,
		mapUrl: match.mapUrl,
		alt: match.alt
	};
}
