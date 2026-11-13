/**
 * Penempatan nama PLTA di peta (temuan QA T10).
 *
 * Penanda yang berjarak lebih dari `MARKER_MIN_DISTANCE` tidak disebar, tetapi
 * namanya — lebar 60–90 px — tetap bisa saling tindih bila selalu ditulis di
 * atas penanda (PB Soedirman tertimpa Plumbungan, Gunung Wugul tertimpa
 * Tulis). Di sini setiap nama mencoba atas, bawah, kanan, lalu kiri, dan
 * mengambil posisi pertama yang tidak menabrak nama lain maupun titik penanda
 * lain. Bila semua sisi tabrakan, dipilih sisi dengan tumpang-tindih terkecil.
 *
 * Murni dan berbasis piksel layar, jadi dihitung ulang saat peta berubah
 * ukuran, dan dapat diuji tanpa merender peta.
 */

export type LabelSide = 'top' | 'bottom' | 'right' | 'left';

export interface LabelInput {
	id: string;
	x: number;
	y: number;
	text: string;
}

export interface LabelPlacement {
	side: LabelSide;
	/** Atribut `<text>` relatif terhadap titik penanda. */
	x: number;
	y: number;
	anchor: 'start' | 'middle' | 'end';
}

interface Box {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/** Perkiraan lebar karakter Inter semibold 10,5 px; cukup untuk mendeteksi tabrakan. */
const CHAR_WIDTH = 6;
const LABEL_HEIGHT = 12;
/** Jarak tepi teks ke pusat penanda. */
const GAP = 12;
/** Radius titik penanda (lingkaran luar 12 px) yang tidak boleh tertutup nama lain. */
const MARKER_RADIUS = 7;

const SIDES: readonly LabelSide[] = ['top', 'bottom', 'right', 'left'];

function placementFor(side: LabelSide): LabelPlacement {
	switch (side) {
		case 'top':
			return { side, x: 0, y: -GAP - 4, anchor: 'middle' };
		case 'bottom':
			return { side, x: 0, y: GAP + LABEL_HEIGHT - 2, anchor: 'middle' };
		case 'right':
			return { side, x: GAP, y: 4, anchor: 'start' };
		case 'left':
			return { side, x: -GAP, y: 4, anchor: 'end' };
	}
}

function boxFor(input: LabelInput, placement: LabelPlacement): Box {
	const width = input.text.length * CHAR_WIDTH;
	const baseline = input.y + placement.y;
	const top = baseline - LABEL_HEIGHT + 2;
	const left =
		placement.anchor === 'middle'
			? input.x - width / 2
			: placement.anchor === 'start'
				? input.x + placement.x
				: input.x + placement.x - width;
	return { left, top, right: left + width, bottom: top + LABEL_HEIGHT };
}

function overlapArea(a: Box, b: Box): number {
	const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
	const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
	return width > 0 && height > 0 ? width * height : 0;
}

export function placeMarkerLabels(inputs: readonly LabelInput[]): Map<string, LabelPlacement> {
	const markerBoxes = inputs.map((input) => ({
		id: input.id,
		box: {
			left: input.x - MARKER_RADIUS,
			top: input.y - MARKER_RADIUS,
			right: input.x + MARKER_RADIUS,
			bottom: input.y + MARKER_RADIUS
		}
	}));
	const placed: Box[] = [];
	const result = new Map<string, LabelPlacement>();

	// Dari atas ke bawah layar: nama di utara memilih lebih dulu, sehingga
	// hasilnya stabil dan tidak bergantung pada urutan daftar PLTA.
	const ordered = [...inputs].sort((a, b) => a.y - b.y || a.x - b.x);

	for (const input of ordered) {
		let best: { placement: LabelPlacement; box: Box; cost: number } | null = null;
		for (const side of SIDES) {
			const placement = placementFor(side);
			const box = boxFor(input, placement);
			const cost =
				placed.reduce((total, other) => total + overlapArea(box, other), 0) +
				markerBoxes
					.filter((marker) => marker.id !== input.id)
					.reduce((total, marker) => total + overlapArea(box, marker.box), 0);
			if (!best || cost < best.cost) best = { placement, box, cost };
			if (cost === 0) break;
		}
		if (best) {
			placed.push(best.box);
			result.set(input.id, best.placement);
		}
	}

	return result;
}
