import { HIMAWARI_BAND13_COLORMAP } from './himawari-colormap';

/**
 * Mengubah citra inframerah Himawari menjadi lapisan "awan hujan" yang
 * transparan di luar awannya.
 *
 * Ubin GIBS kanal 13 berupa gambar opak: daratan dan laut abu-abu, awan dingin
 * berwarna. Ditumpuk begitu saja, ia menutupi seluruh peta Jawa Tengah. Di sini
 * setiap piksel dibaca kembali menjadi suhu puncak awan lewat colormap GIBS,
 * lalu hanya awan yang cukup dingin untuk menurunkan hujan yang digambar ulang
 * dengan tiga tingkat warna milik aplikasi sendiri.
 *
 * Suhu puncak awan adalah perkiraan, bukan pengukuran hujan: semakin dingin
 * puncaknya, semakin tinggi dan tebal awannya, semakin besar peluang hujan
 * lebat. Awan cirrus tipis pun bisa dingin tanpa menurunkan hujan.
 */

export type CloudTier = 'moderate' | 'heavy' | 'extreme';

export interface CloudTierDefinition {
	tier: CloudTier;
	/** Suhu puncak awan tertinggi (°C) yang masih masuk tingkat ini. */
	maxCelsius: number;
	label: string;
	color: string;
}

/**
 * Ambang mengikuti praktik umum pembacaan citra IR: sekitar -32 °C awan mulai
 * cukup tinggi untuk hujan, -52 °C awan konvektif dalam, dan -65 °C ke bawah
 * puncak kumulonimbus yang biasanya membawa hujan lebat dan petir.
 * Urutan dari yang paling dingin, karena pencarian berhenti di kecocokan pertama.
 */
export const CLOUD_TIERS: readonly CloudTierDefinition[] = [
	{ tier: 'extreme', maxCelsius: -65, label: 'Sangat lebat', color: '#d946ef' },
	{ tier: 'heavy', maxCelsius: -52, label: 'Lebat', color: '#f59e0b' },
	{ tier: 'moderate', maxCelsius: -32, label: 'Ringan–sedang', color: '#38bdf8' }
];

const TIER_NONE = 0;
/** Indeks ke `CLOUD_TIERS` digeser satu; 0 berarti bukan awan hujan. */
const TIER_EXTREME = 1;

export function cloudTierIndex(celsius: number): number {
	const index = CLOUD_TIERS.findIndex((tier) => celsius <= tier.maxCelsius);
	return index === -1 ? TIER_NONE : index + 1;
}

/**
 * Abu-abu paling terang untuk suhu di atas -20 °C. Colormap GIBS juga memakai
 * abu-abu untuk -70…-79 °C, jadi abu-abu di bawah angka ini tidak bisa dibedakan
 * dari daratan hanya dari warnanya — lihat `fillEnclosedCores`.
 */
const WARM_GRAY_MAX = Math.max(
	...HIMAWARI_BAND13_COLORMAP.filter(
		([red, green, blue, celsius]) => red === green && green === blue && celsius > -20
	).map(([red]) => red)
);

/**
 * GIBS memproyeksikan ulang citranya dengan interpolasi, jadi piksel di tepi
 * awan bernilai di antara dua warna colormap — termasuk campuran abu-abu dan
 * warna seperti `(196, 197, 197)`. Warna yang jaraknya melebihi ini dari
 * seluruh entri dianggap tidak dikenali.
 */
const MAX_COLOR_DISTANCE_SQUARED = 40 ** 2;

const UNRECOGNIZED = -1;

/** Tingkat awan untuk satu warna, atau `UNRECOGNIZED`. */
function classifyColor(red: number, green: number, blue: number): number {
	let nearest: (typeof HIMAWARI_BAND13_COLORMAP)[number] | null = null;
	let nearestDistance = MAX_COLOR_DISTANCE_SQUARED;

	for (const entry of HIMAWARI_BAND13_COLORMAP) {
		const distance = (red - entry[0]) ** 2 + (green - entry[1]) ** 2 + (blue - entry[2]) ** 2;
		if (distance <= nearestDistance) {
			nearestDistance = distance;
			nearest = entry;
		}
	}

	if (!nearest) return UNRECOGNIZED;

	const [entryRed, entryGreen, entryBlue, celsius] = nearest;
	if (entryRed === entryGreen && entryGreen === entryBlue) return classifyGray(entryRed);
	return cloudTierIndex(celsius);
}

/**
 * Abu-abu di atas `WARM_GRAY_MAX` hanya dipakai untuk -91…-78 °C. Abu-abu di
 * bawahnya bisa daratan atau inti awan -70…-79 °C; keduanya dibiarkan kosong
 * dulu dan inti awannya dipulihkan oleh `fillEnclosedCores`.
 */
function classifyGray(value: number): number {
	return value > WARM_GRAY_MAX ? TIER_EXTREME : TIER_NONE;
}

export interface PixelWindow {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export interface CloudMaskResult {
	/** Bagian piksel berisi data yang warnanya dikenali colormap, 0–1. */
	recognizedRatio: number;
	/** Jumlah piksel awan hujan di dalam `window`. */
	rainPixels: number;
}

/**
 * Menimpa `pixels` (RGBA, seperti `ImageData.data`) dengan lapisan awan hujan.
 * Piksel yang bukan awan hujan menjadi transparan.
 */
export function maskCloudPixels(
	pixels: Uint8ClampedArray,
	width: number,
	height: number,
	window: PixelWindow = { left: 0, right: width, top: 0, bottom: height }
): CloudMaskResult {
	const tiers = new Uint8Array(width * height);
	// Satu ubin hanya memakai beberapa ratus warna; hasil pencarian terdekat
	// di-cache supaya tidak diulang untuk 130 ribu piksel.
	const colorCache = new Map<number, number>();
	let dataPixels = 0;
	let recognizedPixels = 0;

	for (let index = 0; index < tiers.length; index += 1) {
		const offset = index * 4;
		if (pixels[offset + 3] === 0) continue;

		dataPixels += 1;
		const red = pixels[offset];
		const green = pixels[offset + 1];
		const blue = pixels[offset + 2];

		const key = (red << 16) | (green << 8) | blue;
		let tier = colorCache.get(key);
		if (tier === undefined) {
			tier = red === green && green === blue ? classifyGray(red) : classifyColor(red, green, blue);
			colorCache.set(key, tier);
		}

		if (tier === UNRECOGNIZED) continue;
		recognizedPixels += 1;
		tiers[index] = tier;
	}

	fillEnclosedCores(tiers, width, height);

	const colors = CLOUD_TIERS.map(({ color }) => [
		Number.parseInt(color.slice(1, 3), 16),
		Number.parseInt(color.slice(3, 5), 16),
		Number.parseInt(color.slice(5, 7), 16)
	]);
	let rainPixels = 0;

	for (let index = 0; index < tiers.length; index += 1) {
		const offset = index * 4;
		const tier = tiers[index];

		if (tier === TIER_NONE) {
			pixels[offset + 3] = 0;
			continue;
		}

		const [red, green, blue] = colors[tier - 1];
		pixels[offset] = red;
		pixels[offset + 1] = green;
		pixels[offset + 2] = blue;
		pixels[offset + 3] = 255;

		const x = index % width;
		const y = Math.floor(index / width);
		if (x >= window.left && x < window.right && y >= window.top && y < window.bottom) {
			rainPixels += 1;
		}
	}

	return {
		recognizedRatio: dataPixels === 0 ? 0 : recognizedPixels / dataPixels,
		rainPixels
	};
}

/**
 * Inti awan -70…-79 °C berwarna abu-abu di colormap GIBS, sama seperti daratan.
 * Suhu berubah bertahap, jadi inti seperti itu selalu dikelilingi cincin -65…-69
 * °C yang berwarna merah. Area bukan-awan yang tidak tersambung ke tepi kanvas
 * dan bersentuhan dengan tingkat paling dingin dianggap inti tersebut.
 *
 * Batasnya: inti yang terpotong tepi kanvas tidak terisi. Kanvasnya jauh lebih
 * luas dari Jawa Tengah, jadi itu hanya terjadi di luar area yang ditampilkan.
 */
function fillEnclosedCores(tiers: Uint8Array, width: number, height: number): void {
	const OUTSIDE = 1;
	const visited = new Uint8Array(tiers.length);
	const stack = new Int32Array(tiers.length);

	const neighbors = (index: number, visit: (neighbor: number) => void) => {
		const x = index % width;
		if (x > 0) visit(index - 1);
		if (x < width - 1) visit(index + 1);
		if (index >= width) visit(index - width);
		if (index < tiers.length - width) visit(index + width);
	};

	let top = 0;
	const pushIfOpen = (index: number) => {
		if (visited[index] === 0 && tiers[index] === TIER_NONE) {
			visited[index] = OUTSIDE;
			stack[top++] = index;
		}
	};

	for (let x = 0; x < width; x += 1) {
		pushIfOpen(x);
		pushIfOpen((height - 1) * width + x);
	}
	for (let y = 0; y < height; y += 1) {
		pushIfOpen(y * width);
		pushIfOpen(y * width + width - 1);
	}
	while (top > 0) neighbors(stack[--top], pushIfOpen);

	const component: number[] = [];
	for (let start = 0; start < tiers.length; start += 1) {
		if (visited[start] !== 0 || tiers[start] !== TIER_NONE) continue;

		component.length = 0;
		let touchesExtreme = false;
		visited[start] = 2;
		stack[top++] = start;

		while (top > 0) {
			const index = stack[--top];
			component.push(index);
			neighbors(index, (neighbor) => {
				if (tiers[neighbor] === TIER_EXTREME) touchesExtreme = true;
				if (visited[neighbor] === 0 && tiers[neighbor] === TIER_NONE) {
					visited[neighbor] = 2;
					stack[top++] = neighbor;
				}
			});
		}

		if (touchesExtreme) {
			for (const index of component) tiers[index] = TIER_EXTREME;
		}
	}
}
