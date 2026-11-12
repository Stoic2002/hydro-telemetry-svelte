import { describe, expect, it } from 'vitest';
import { forecastFeasibility, formatForecastModelName } from './presentation';

const accuracy = { skill: -62.6, sampleCount: 120, windowDays: 30, isPresentable: false };

describe('kelayakan prediksi', () => {
	it('server menilai tidak layak → Belum layak (merah), bukan "Layak dengan catatan"', () => {
		expect(forecastFeasibility(accuracy)).toEqual({ label: 'Belum layak', tone: 'red' });
	});

	it('layak → hijau; tanpa data akurasi → Belum dinilai', () => {
		expect(forecastFeasibility({ ...accuracy, isPresentable: true })).toEqual({
			label: 'Layak',
			tone: 'green'
		});
		expect(forecastFeasibility(null)).toEqual({ label: 'Belum dinilai', tone: 'slate' });
	});
});

describe('nama model', () => {
	it('membuang UUID dari nama teknis', () => {
		expect(formatForecastModelName('plta-727c0a7e-2186-4c40-a995-62c7e4024ed5-inflow-h24')).toBe(
			'Model inflow · 24 jam ke depan'
		);
		expect(
			formatForecastModelName('plta-727c0a7e-2186-4c40-a995-62c7e4024ed5-water_level-h168-v3')
		).toBe('Model TMA · 168 jam ke depan · v3');
	});

	it('nama yang tidak berpola ditampilkan apa adanya', () => {
		expect(formatForecastModelName('fallback')).toBe('fallback');
		expect(formatForecastModelName('')).toBe('');
	});
});
