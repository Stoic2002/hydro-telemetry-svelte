/**
 * Penyebaran penanda PLTA yang berdempet di peta.
 *
 * Beberapa PLTA berjarak hanya beberapa kilometer (mis. rantai Jelok–Timo),
 * sehingga pada skala Jawa Tengah penandanya bertumpuk: label saling tindih
 * dan hanya satu yang bisa diklik. Penanda yang terlalu dekat di LAYAR — bukan
 * di peta — disebar melingkar mengelilingi titik tengah kelompoknya; pemanggil
 * menggambar garis tipis ke koordinat aslinya, jadi posisi sebenarnya tetap
 * terbaca.
 *
 * Jarak dihitung dalam piksel setelah proyeksi, sehingga hasilnya ikut berubah
 * saat peta mengecil: di layar lebar penanda yang sama mungkin tidak perlu
 * disebar sama sekali.
 *
 * Fungsi di sini murni sehingga dapat diuji tanpa merender peta.
 */

export interface MarkerPoint {
	id: string;
	x: number;
	y: number;
}

export interface SpreadMarker extends MarkerPoint {
	/** Posisi asli hasil proyeksi; sama dengan `x`/`y` bila tidak digeser. */
	anchorX: number;
	anchorY: number;
	isDisplaced: boolean;
}

/** Jarak minimum antar-penanda di layar, dalam piksel. */
export const MARKER_MIN_DISTANCE = 26;

/** Kelompok penanda yang saling terhubung lewat jarak < `minDistance` (single-linkage). */
function groupByProximity(points: MarkerPoint[], minDistance: number): MarkerPoint[][] {
	const parent = points.map((_, index) => index);
	const find = (index: number): number => {
		while (parent[index] !== index) {
			parent[index] = parent[parent[index]];
			index = parent[index];
		}
		return index;
	};

	for (let first = 0; first < points.length; first += 1) {
		for (let second = first + 1; second < points.length; second += 1) {
			const distance = Math.hypot(
				points[first].x - points[second].x,
				points[first].y - points[second].y
			);
			if (distance < minDistance) parent[find(first)] = find(second);
		}
	}

	const groups = new Map<number, MarkerPoint[]>();
	points.forEach((point, index) => {
		const root = find(index);
		groups.set(root, [...(groups.get(root) ?? []), point]);
	});
	return [...groups.values()];
}

export function spreadMarkers(
	points: MarkerPoint[],
	minDistance = MARKER_MIN_DISTANCE
): SpreadMarker[] {
	const placed = new Map<string, SpreadMarker>();

	for (const group of groupByProximity(points, minDistance)) {
		if (group.length === 1) {
			const [point] = group;
			placed.set(point.id, { ...point, anchorX: point.x, anchorY: point.y, isDisplaced: false });
			continue;
		}

		const centerX = group.reduce((sum, point) => sum + point.x, 0) / group.length;
		const centerY = group.reduce((sum, point) => sum + point.y, 0) / group.length;

		// Jari-jari terkecil yang membuat tetangga di lingkaran berjarak
		// `minDistance` (tali busur), tetapi tidak kurang dari itu sendiri agar
		// garis penghubungnya tetap terlihat.
		const radius = Math.max(minDistance, minDistance / (2 * Math.sin(Math.PI / group.length)));

		// Urutan di lingkaran mengikuti arah asli tiap penanda dari titik tengah,
		// supaya yang aslinya di utara tetap di utara. Penanda yang tepat
		// bertumpuk (arah tak terdefinisi) diurutkan menurut id agar stabil.
		const ordered = [...group].sort((first, second) => {
			const firstAngle = Math.atan2(first.y - centerY, first.x - centerX);
			const secondAngle = Math.atan2(second.y - centerY, second.x - centerX);
			return firstAngle - secondAngle || first.id.localeCompare(second.id);
		});
		const isStacked = group.every(
			(point) => Math.hypot(point.x - centerX, point.y - centerY) < 0.5
		);
		const startAngle = isStacked
			? -Math.PI / 2
			: Math.atan2(ordered[0].y - centerY, ordered[0].x - centerX);

		ordered.forEach((point, index) => {
			const angle = startAngle + (index * 2 * Math.PI) / group.length;
			placed.set(point.id, {
				id: point.id,
				x: centerX + radius * Math.cos(angle),
				y: centerY + radius * Math.sin(angle),
				anchorX: point.x,
				anchorY: point.y,
				isDisplaced: true
			});
		});
	}

	// Urutan masukan dipertahankan: urutan gambar SVG = urutan tumpukan.
	return points.map((point) => placed.get(point.id)!);
}
