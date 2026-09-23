import { describe, expect, it } from 'vitest';
import { CLOUD_TIERS, cloudTierIndex, maskCloudPixels } from './cloud-mask';
import { HIMAWARI_BAND13_COLORMAP } from './himawari-colormap';

type Rgb = readonly [number, number, number];

function colorFor(celsius: number): Rgb {
	const entry = HIMAWARI_BAND13_COLORMAP.find(([, , , value]) => value === celsius);
	if (!entry) throw new Error(`Tidak ada entri colormap untuk ${celsius}`);
	return [entry[0], entry[1], entry[2]];
}

function hex(color: string): Rgb {
	return [
		Number.parseInt(color.slice(1, 3), 16),
		Number.parseInt(color.slice(3, 5), 16),
		Number.parseInt(color.slice(5, 7), 16)
	];
}

/** Kanvas `size`×`size` berisi `background`, dengan piksel tertentu ditimpa. */
function canvas(size: number, background: Rgb, paint: Record<number, Rgb> = {}) {
	const pixels = new Uint8ClampedArray(size * size * 4);
	for (let index = 0; index < size * size; index += 1) {
		const [red, green, blue] = paint[index] ?? background;
		pixels.set([red, green, blue, 255], index * 4);
	}
	return pixels;
}

function pixelAt(pixels: Uint8ClampedArray, index: number) {
	return Array.from(pixels.slice(index * 4, index * 4 + 4));
}

const WARM_GROUND = colorFor(28.9);
const [EXTREME, HEAVY, MODERATE] = CLOUD_TIERS.map(({ color }) => [...hex(color), 255]);

describe('cloudTierIndex', () => {
	it('memetakan suhu puncak awan ke tingkatnya', () => {
		expect(cloudTierIndex(-20)).toBe(0);
		expect(cloudTierIndex(-32)).toBe(3);
		expect(cloudTierIndex(-52)).toBe(2);
		expect(cloudTierIndex(-70)).toBe(1);
	});
});

describe('himawari colormap', () => {
	it('memakai setiap warna tepat sekali', () => {
		const colors = new Set(
			HIMAWARI_BAND13_COLORMAP.map(([red, green, blue]) => `${red},${green},${blue}`)
		);

		expect(colors.size).toBe(HIMAWARI_BAND13_COLORMAP.length);
	});
});

describe('maskCloudPixels', () => {
	it('membuat daratan dan awan hangat transparan', () => {
		const pixels = canvas(3, WARM_GROUND, { 4: colorFor(-19.6) });
		const result = maskCloudPixels(pixels, 3, 3);

		expect(result.rainPixels).toBe(0);
		expect(result.recognizedRatio).toBe(1);
		expect(pixelAt(pixels, 0)[3]).toBe(0);
		expect(pixelAt(pixels, 4)[3]).toBe(0);
	});

	it('mewarnai ulang awan dingin sesuai tingkatnya', () => {
		const pixels = canvas(3, WARM_GROUND, {
			0: colorFor(-35.1),
			1: colorFor(-55.1),
			2: colorFor(-66.1)
		});
		const result = maskCloudPixels(pixels, 3, 3);

		expect(pixelAt(pixels, 0)).toEqual(MODERATE);
		expect(pixelAt(pixels, 1)).toEqual(HEAVY);
		expect(pixelAt(pixels, 2)).toEqual(EXTREME);
		expect(result.rainPixels).toBe(3);
	});

	it('mengenali warna campuran hasil interpolasi di tepi awan', () => {
		const [red, green, blue] = colorFor(-55.1);
		const pixels = canvas(1, WARM_GROUND, { 0: [red - 4, green + 3, blue] });
		maskCloudPixels(pixels, 1, 1);

		expect(pixelAt(pixels, 0)).toEqual(HEAVY);
	});

	it('mengisi inti awan abu-abu yang dikelilingi cincin paling dingin', () => {
		// Abu-abu -74 °C juga bisa berarti daratan; di tengah cincin -66 °C ia inti badai.
		const ring = colorFor(-66.1);
		const core = colorFor(-74.1);
		const paint: Record<number, Rgb> = {};
		for (const index of [6, 7, 8, 11, 13, 16, 17, 18]) paint[index] = ring;
		paint[12] = core;

		const pixels = canvas(5, WARM_GROUND, paint);
		maskCloudPixels(pixels, 5, 5);

		expect(pixelAt(pixels, 12)).toEqual(EXTREME);
	});

	it('tidak mengisi abu-abu yang sama bila tersambung ke luar', () => {
		const pixels = canvas(3, WARM_GROUND, { 4: colorFor(-74.1) });
		const result = maskCloudPixels(pixels, 3, 3);

		expect(pixelAt(pixels, 4)[3]).toBe(0);
		expect(result.rainPixels).toBe(0);
	});

	it('hanya menghitung awan hujan di dalam jendela', () => {
		const cold = colorFor(-55.1);
		const pixels = canvas(4, WARM_GROUND, { 0: cold, 15: cold });
		const result = maskCloudPixels(pixels, 4, 4, { left: 2, right: 4, top: 2, bottom: 4 });

		expect(result.rainPixels).toBe(1);
	});

	it('melaporkan warna yang tidak dikenali colormap', () => {
		const pixels = canvas(2, [255, 0, 255]);
		const result = maskCloudPixels(pixels, 2, 2);

		expect(result.recognizedRatio).toBeLessThan(0.9);
	});

	it('mengabaikan piksel tanpa data', () => {
		const pixels = new Uint8ClampedArray(4);
		const result = maskCloudPixels(pixels, 1, 1);

		expect(result.recognizedRatio).toBe(0);
		expect(result.rainPixels).toBe(0);
	});
});
