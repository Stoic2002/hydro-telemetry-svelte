import { describe, expect, it } from 'vitest';
import type { MonitoringParameterLatest } from './model';
import { sensorProblemKey, sensorProblems } from './sensor-health';

function reading(overrides: Partial<MonitoringParameterLatest>): MonitoringParameterLatest {
	return {
		parameter: 'water_level',
		station: '',
		time: '2026-11-06T11:00:00+07:00',
		value: 229.62,
		quality: 'good',
		...overrides
	};
}

/**
 * Contoh diambil dari snapshot staging 6 Nov 2026: beban Garung `bad`, pH
 * Soedirman `impossible` bernilai 0 — keduanya dulu hanya tampil "N/A" tanpa
 * penjelasan di Hidrologi Harian.
 */
describe('sensorProblems', () => {
	it('mengabaikan pembacaan yang sehat, turunan, dan manual', () => {
		expect(
			sensorProblems([
				reading({ quality: 'good' }),
				reading({ parameter: 'inflow', quality: 'derived' }),
				reading({ parameter: 'plan_water_level', quality: 'manual' }),
				reading({ quality: null })
			])
		).toEqual([]);
	});

	it('menggolongkan bad dan uncertain sebagai komunikasi terputus', () => {
		const problems = sensorProblems([
			reading({
				parameter: 'beban',
				quality: 'bad',
				value: null,
				time: '2026-11-06T10:32:33+07:00'
			}),
			reading({ parameter: 'beban', station: 'U1', quality: 'Uncertain', value: null })
		]);

		expect(problems.map((problem) => problem.kind)).toEqual(['communication', 'communication']);
		expect(problems[0]).toMatchObject({
			parameter: 'beban',
			station: '',
			since: '2026-11-06T10:32:33+07:00',
			value: null
		});
	});

	it('menyimpan angka mustahil untuk ditampilkan', () => {
		const [problem] = sensorProblems([
			reading({ parameter: 'ph', station: 'CLANGAP', quality: 'impossible', value: 0 })
		]);

		expect(problem).toMatchObject({ kind: 'impossible', value: 0, station: 'CLANGAP' });
	});

	it('mendahulukan komunikasi terputus, lalu urut parameter dan stasiun', () => {
		const problems = sensorProblems([
			reading({ parameter: 'ph', station: 'CLANGAP', quality: 'impossible', value: 0 }),
			reading({ parameter: 'beban', station: 'U2', quality: 'bad', value: null }),
			reading({ parameter: 'beban', station: 'U1', quality: 'bad', value: null })
		]);

		expect(problems.map(sensorProblemKey)).toEqual([
			'beban|U1|communication',
			'beban|U2|communication',
			'ph|CLANGAP|impossible'
		]);
	});

	it('menerima snapshot kosong', () => {
		expect(sensorProblems(undefined)).toEqual([]);
	});
});
