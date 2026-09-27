import { describe, expect, it } from 'vitest';
import { rainGauges, summarizeMeasuredRain, type RainStationWindow } from './rainfall';

const NOW = Date.parse('2026-09-25T04:30:00Z');
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

function station(
	name: string,
	latestMinutesAgo: number | null,
	readings: [number, number][] = []
): RainStationWindow {
	return {
		station: name,
		latestTime: latestMinutesAgo === null ? null : minutesAgo(latestMinutesAgo),
		readings: readings.map(([ago, value]) => ({ time: minutesAgo(ago), value }))
	};
}

describe('summarizeMeasuredRain', () => {
	it('menyebut tidak hujan bila penakar mengirim 0', () => {
		const rain = summarizeMeasuredRain('plta', [station('A', 30, [[30, 0]])], NOW);

		expect(rain.status).toBe('dry');
		expect(rain.peak).toBeNull();
	});

	it('mengambil pembacaan tertinggi di antara stasiun', () => {
		const rain = summarizeMeasuredRain(
			'plta',
			[
				station('ARR_GI', 30, [[30, 0]]),
				station('ARR_ST02', 30, [
					[34, 0.2],
					[30, 0.6]
				]),
				station('ARR_ST03', 30, [[30, 0.4]])
			],
			NOW
		);

		expect(rain.status).toBe('raining');
		expect(rain.peak).toMatchObject({ station: 'ARR_ST02', value: 0.6 });
		expect(rain.stationCount).toBe(3);
	});

	it('tidak menjumlahkan pembacaan keadaan yang sama', () => {
		// Data nyata ARR_ST02: 03.56 = 0,2 · 04.00 = 0,2 · 04.06 = 0. Hujannya satu
		// kali 0,2 mm; menjumlahkan jendela akan menghasilkan 0,4.
		const rain = summarizeMeasuredRain(
			'plta',
			[
				station('ARR_ST02', 24, [
					[34, 0.2],
					[30, 0.2],
					[24, 0]
				])
			],
			NOW
		);

		expect(rain.peak?.value).toBe(0.2);
	});

	it('membedakan penakar yang diam dari cuaca kering', () => {
		const rain = summarizeMeasuredRain('plta', [station('A', 5 * 60)], NOW);

		expect(rain.status).toBe('stale');
		expect(rain.latestTime).toBe(minutesAgo(5 * 60));
	});

	it('mengabaikan stasiun yang diam bila stasiun lain masih mengirim', () => {
		// Stasiun yang diam 5 jam tidak membuat PLTA-nya "tidak diperbarui" selama
		// stasiun lain masih melapor.
		const rain = summarizeMeasuredRain(
			'plta',
			[station('mati', 5 * 60), station('hidup', 30, [[30, 0]])],
			NOW
		);

		expect(rain.status).toBe('dry');
		expect(rain.stationCount).toBe(2);
	});

	it('mempercayai pembacaan terbaru walau snapshot tertinggal', () => {
		// Snapshot ARR Soedirman menyebut 2 hari lalu, padahal /trends punya
		// pembacaan 0 tiap jam sampai 30 menit lalu.
		const rain = summarizeMeasuredRain('plta', [station('ARR_GI', 2 * 24 * 60, [[30, 0]])], NOW);

		expect(rain.status).toBe('dry');
		expect(rain.latestTime).toBe(minutesAgo(30));
	});

	it('hanya mengambil puncak dari 60 menit terakhir', () => {
		// Pembacaan 90 menit lalu membuktikan penakar hidup, tetapi hujannya sudah lewat.
		const rain = summarizeMeasuredRain(
			'plta',
			[
				station('A', null, [
					[90, 2],
					[30, 0]
				])
			],
			NOW
		);

		expect(rain.status).toBe('dry');
	});

	it('menganggap penakar tanpa waktu pembacaan sebagai diam', () => {
		expect(summarizeMeasuredRain('plta', [station('A', null)], NOW).status).toBe('stale');
	});
});

describe('rainGauges', () => {
	it('hanya mengambil parameter rainfall, termasuk stasiun tanpa nama', () => {
		const gauges = rainGauges([
			{ parameter: 'rainfall', station: '', time: '2026-09-25T04:00:00Z', value: 0, quality: null },
			{
				parameter: 'rainfall_forecast_bmkg',
				station: '',
				time: '2026-09-25T04:00:00Z',
				value: 5,
				quality: null
			},
			{ parameter: 'water_level', station: 'waduk', time: null, value: 230, quality: null }
		]);

		expect(gauges).toEqual([{ station: '', time: '2026-09-25T04:00:00Z' }]);
	});
});
