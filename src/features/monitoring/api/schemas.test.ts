import { describe, expect, it } from 'vitest';
import { apiPLTALatestMonitoringSchema } from './schemas';

const PLTA_ID = '11111111-1111-4111-8111-111111111111';

function reading(parameter: unknown, value: unknown = 1) {
	return { parameter, station: '', time: '2026-11-02T00:00:00Z', value, quality: 'good' };
}

/**
 * Backend menambah `ParameterType` antar-rilis (staging: `rumus`). Satu tag baru
 * dulu akan membuat seluruh snapshot PLTA ditolak sebagai galat kontrak.
 */
describe('snapshot monitoring', () => {
	it('menerima hasil rumus kustom', () => {
		const parsed = apiPLTALatestMonitoringSchema.parse({
			plta_id: PLTA_ID,
			parameters: [reading('rumus')]
		});

		expect(parsed.parameters.map((item) => item.parameter)).toEqual(['rumus']);
	});

	it('melewati parameter yang belum dikenal, yang lain tetap terbaca', () => {
		const parsed = apiPLTALatestMonitoringSchema.parse({
			plta_id: PLTA_ID,
			parameters: [reading('parameter_masa_depan'), reading('water_level', 230.5)]
		});

		expect(parsed.parameters).toHaveLength(1);
		expect(parsed.parameters[0]).toMatchObject({ parameter: 'water_level', value: 230.5 });
	});

	it('bentuk yang salah tetap galat kontrak', () => {
		const parsed = apiPLTALatestMonitoringSchema.safeParse({
			plta_id: PLTA_ID,
			parameters: [reading('water_level', 'bukan angka')]
		});

		expect(parsed.success).toBe(false);
	});
});
