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

describe('kontrak daftar tren per PLTA', () => {
	it('menerima daftar yang belum diatur', async () => {
		const { apiPlantTrendListSchema } = await import('./schemas');
		const list = apiPlantTrendListSchema.parse({
			plta_id: 'p',
			diatur: false,
			item: [],
			grafik: []
		});

		expect(list.diatur).toBe(false);
	});

	it('membaca item data beserta deret per stasiun', async () => {
		const { apiPlantTrendDataSchema } = await import('./schemas');
		const data = apiPlantTrendDataSchema.parse({
			plta_id: 'p',
			resolution: '1h',
			dari: '2026-10-12T00:00:00+07:00',
			sampai: '2026-10-13T00:00:00+07:00',
			grafik: [{ judul: 'TMA', grup: 'TMA', item: ['i1'] }],
			item: [
				{
					id: 'i1',
					key: 'tma_waduk',
					urutan: 0,
					grup: 'TMA',
					label: 'TMA Waduk',
					label_diatur: false,
					unit: 'mdpl',
					panel: 'hulu',
					sumber: 'measured',
					resolusi_efektif: '1h',
					ada_data: true,
					deret: [
						{
							nama: 'TMA Waduk',
							station: '',
							stasiun: [''],
							points: [{ time: '2026-10-12T01:00:00+07:00', value: 231.5 }],
							terpotong: false
						}
					]
				}
			]
		});

		expect(data.item[0].deret[0].points[0].value).toBe(231.5);
	});
});
