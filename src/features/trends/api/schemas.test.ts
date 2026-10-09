import { describe, expect, it } from 'vitest';
import { apiTrendSeriesSchema } from './schemas';

const base = {
	plta_id: '11111111-1111-4111-8111-111111111111',
	parameter: 'rainfall',
	resolution: '1h',
	points: []
};

describe('apiTrendSeriesSchema', () => {
	it('membawa daftar station yang diagregasi', () => {
		const series = apiTrendSeriesSchema.parse({
			...base,
			station: null,
			aggregated_stations: ['SKW', 'WND']
		});

		expect(series.station).toBeNull();
		expect(series.aggregated_stations).toEqual(['SKW', 'WND']);
	});

	it('menerima respons tanpa `aggregated_stations` (seri tunggal)', () => {
		const series = apiTrendSeriesSchema.parse({ ...base, station: '' });

		expect(series.aggregated_stations).toBeNull();
	});
});
