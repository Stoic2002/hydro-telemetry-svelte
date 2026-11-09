/**
 * Penyesuaian titik pusat proyeksi peta.
 *
 * Sakelar radar dan legenda melayang di sisi kanan peta dan menutupi sebagian
 * daratan. Menggeser gambar peta ke kiri membuat wilayah yang tertutup panel
 * berkurang, tanpa mengubah ukuran maupun skala peta.
 */

/** Lebar panel melayang di sisi kanan, termasuk jaraknya dari tepi. */
export const RIGHT_PANEL_GUTTER_PX = 228;

/** Di bawah lebar ini panel menumpuk hampir selebar peta; pergeseran dilewati. */
const MIN_WIDTH_FOR_SHIFT_PX = 640;

/**
 * Mengubah pergeseran horizontal dalam piksel menjadi selisih bujur.
 *
 * Pada proyeksi Mercator, `x = skala * (bujur - bujurPusat) + lebar / 2`.
 * Menaikkan bujur pusat menggeser gambar ke kiri, dan besarnya berbanding lurus
 * dengan skala — itulah sebabnya pergeseran dihitung, bukan ditulis tetap.
 */
export function pixelShiftToLongitude(shiftPx: number, scale: number): number {
	if (!Number.isFinite(scale) || scale <= 0) return 0;

	return (shiftPx / scale) * (180 / Math.PI);
}

/**
 * Besar pergeseran ke kiri untuk lebar peta tertentu. Bernilai nol pada layar
 * sempit, dan tidak pernah melebihi seperempat lebar peta agar daratan tetap
 * berada di dalam bingkai.
 */
export function horizontalShiftForWidth(mapWidth: number): number {
	if (mapWidth < MIN_WIDTH_FOR_SHIFT_PX) return 0;

	return Math.min(RIGHT_PANEL_GUTTER_PX / 2, mapWidth / 4);
}

export interface OverlayFit {
	/** Pengali skala proyeksi; 1 = ukuran peta tidak berubah. */
	scaleFactor: number;
	/** Geseran vertikal tambahan dalam piksel; negatif = ke atas. */
	offsetY: number;
}

/**
 * Menjaga isi peta (penanda PLTA) tetap di atas kartu yang menempel di dasar
 * peta. Dulu peta hanya digeser setengah tinggi kartu, padahal kartu berisi
 * data setinggi ±230px — Wonogiri dan separuh selatan peta tertutup di layar
 * 1366×850 maupun 1920×1080 (temuan QA T7, 4 Nov 2026).
 *
 * Urutannya: geser naik secukupnya; perkecil hanya bila isinya memang tidak
 * muat di sisa tinggi — peta yang lebih kecil dulu dikeluhkan tim. Skala
 * diperkecil terhadap titik tengah peta (sumbu y Mercator linear terhadap
 * `translate`), jadi `contentTop`/`contentBottom` cukup diukur sekali pada
 * proyeksi dasar.
 */
export function fitAboveOverlay(input: {
	mapHeight: number;
	overlayHeight: number;
	/** y teratas dan terbawah isi pada proyeksi dasar, termasuk ruang label. */
	contentTop: number;
	contentBottom: number;
	padding?: number;
}): OverlayFit {
	const { mapHeight, overlayHeight, contentTop, contentBottom, padding = 12 } = input;
	if (overlayHeight <= 0 || !(contentBottom > contentTop)) return { scaleFactor: 1, offsetY: 0 };

	const bandTop = padding;
	const bandBottom = mapHeight - overlayHeight - padding;
	const available = bandBottom - bandTop;
	if (available <= 0) return { scaleFactor: 1, offsetY: 0 };

	const scaleFactor = Math.min(1, available / (contentBottom - contentTop));
	const middle = mapHeight / 2;
	const top = middle + (contentTop - middle) * scaleFactor;
	const bottom = middle + (contentBottom - middle) * scaleFactor;

	let offsetY = 0;
	if (bottom > bandBottom) offsetY = bandBottom - bottom;
	if (top + offsetY < bandTop) offsetY = bandTop - top;
	return { scaleFactor, offsetY };
}
