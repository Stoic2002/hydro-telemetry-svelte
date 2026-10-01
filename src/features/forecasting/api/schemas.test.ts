import { describe, expect, it } from 'vitest';
import { apiForecastSeriesSchema } from './schemas';

/**
 * Bentuk respons nyata `GET /forecasts` dari run 1 Okt 2026 00.30 WIB: seluruh
 * titik ada tetapi `value`-nya `null`, padahal Swagger menyebutnya wajib angka.
 * Dulu respons ini ditolak dan halaman Forecasting hanya menampilkan "respons
 * tidak sesuai kontrak".
 */
const EMPTY_RUN = {
	plta_id: '727c0a7e-2186-4c40-a995-62c7e4024ed5',
	parameter: 'inflow',
	model_name: 'plta-727c0a7e-2186-4c40-a995-62c7e4024ed5-inflow-h24',
	generated_at: '2026-10-01T00:30:00.601086+07:00',
	unit: 'm3/s',
	label: 'Inflow',
	akurasi: { skill: null, n: 72, jendela_hari: 3, layak_disajikan: true },
	points: [
		{
			time: '2026-10-01T01:00:00+07:00',
			horizon: 24,
			value: null,
			value_p10: null,
			value_p90: null
		},
		{
			time: '2026-10-01T02:00:00+07:00',
			horizon: 24,
			value: null,
			value_p10: null,
			value_p90: null
		}
	]
};

describe('kontrak respons Forecasting', () => {
	it('menerima run yang titiknya belum berisi nilai', () => {
		const parsed = apiForecastSeriesSchema.safeParse(EMPTY_RUN);

		expect(parsed.success).toBe(true);
		expect(parsed.data?.points.every((point) => point.value === null)).toBe(true);
	});

	it('tetap menerima run normal dengan pita P10–P90', () => {
		const parsed = apiForecastSeriesSchema.safeParse({
			...EMPTY_RUN,
			points: [
				{
					time: '2026-10-01T01:00:00+07:00',
					horizon: 24,
					value: 42.5,
					value_p10: 40,
					value_p90: 45
				}
			]
		});

		expect(parsed.success).toBe(true);
		expect(parsed.data?.points[0].value).toBe(42.5);
	});

	it('tetap menolak parameter di luar yang didukung Forecasting', () => {
		expect(apiForecastSeriesSchema.safeParse({ ...EMPTY_RUN, parameter: 'beban' }).success).toBe(
			false
		);
	});
});
