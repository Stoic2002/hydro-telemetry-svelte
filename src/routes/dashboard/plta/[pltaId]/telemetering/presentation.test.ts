import { describe, expect, it } from 'vitest';
import type { DashboardMetric, MonthlyHydrology } from '$features/hydrology';
import type { MonitoringParameterLatest } from '$features/monitoring';
import type { PlantTag } from '$features/plta';
import {
	buildMonthlyForecastRows,
	buildUploadTarget,
	currentWibDate,
	dashboardMetricRows,
	latestMonitoringParameter
} from './presentation';

const measuredMetric: DashboardMetric = {
	label: 'Tinggi muka air',
	value: 223.1,
	unit: 'mdpl',
	time: '2026-08-10T08:00:00Z',
	source: 'measured',
	stations: null
};

const monthlyRecord: MonthlyHydrology = {
	id: 'monthly-1',
	pltaId: 'plta-1',
	year: 2026,
	month: 8,
	hydrologyPrediction: 'Normal',
	hydrologyActual: null,
	rainfallCharacteristicImage: null,
	rainfallImage: null,
	predictedProductionMwh: 1200.5,
	targetProductionMwh: 1300,
	previousAchievementMwh: 6400,
	predictedPreviousAchievementMwh: 7600.5,
	targetPreviousAchievementMwh: 7800,
	achievementPercentage: 97.44
};

function monitoringReading(
	station: string,
	time: string,
	value: number | null
): MonitoringParameterLatest {
	return {
		parameter: 'water_level',
		station,
		time,
		value,
		quality: 'good'
	};
}

describe('telemetering presentation', () => {
	it('prioritizes requested metrics and applies realtime overrides', () => {
		const rows = dashboardMetricRows(
			{
				inflow: { ...measuredMetric, label: 'Inflow', value: 120 },
				tma_waduk: measuredMetric
			},
			false,
			{},
			{ tma_waduk: { value: 224.25, source: 'Realtime' } },
			['tma_waduk', 'inflow']
		);

		expect(rows.map((row) => row.label)).toEqual(['Tinggi muka air', 'Inflow']);
		expect(rows[0]).toMatchObject({
			value: '224,25',
			source: 'Realtime',
			sourceType: 'api',
			hasData: true
		});
	});

	it('selects the newest valid reading from the preferred station', () => {
		const readings = [
			monitoringReading('Hulu', '2026-08-10T08:00:00Z', 100),
			monitoringReading('Tailrace Utama', '2026-08-10T07:00:00Z', 90),
			monitoringReading('Tailrace Utama', '2026-08-10T09:00:00Z', 92),
			monitoringReading('Tailrace Utama', '2026-08-10T10:00:00Z', null)
		];

		expect(latestMonitoringParameter(readings, 'water_level', ['tailrace'])?.value).toBe(92);
	});

	it('only exposes enabled upload tags for the requested parameter', () => {
		const baseTag: PlantTag = {
			id: 'tag-1',
			pltaId: 'plta-1',
			parameter: 'plan_water_level',
			station: 'manual',
			protocol: 'upload',
			address: '',
			httpHeaders: {},
			valuePath: null,
			timestampPath: null,
			scale: 1,
			offset: 0,
			unit: 'mdpl',
			enabled: true
		};
		const target = buildUploadTarget(
			[baseTag, { ...baseTag, id: 'tag-2', enabled: false }],
			'plan_water_level',
			'Target TMA',
			'mdpl'
		);

		expect(target?.tags.map((tag) => tag.id)).toEqual(['tag-1']);
	});

	it('maps monthly data into stable display rows and unavailable states', () => {
		const rows = buildMonthlyForecastRows(monthlyRecord, 'Agustus');

		expect(rows).toHaveLength(8);
		expect(rows[0]).toMatchObject({ value: 'Normal', sourceType: 'api' });
		expect(rows[1]).toMatchObject({ value: 'N/A', sourceType: 'unavailable' });
		expect(rows[2]).toMatchObject({ value: '1.200,5', unit: 'MWh' });
		expect(rows[7]).toMatchObject({ value: '97,4', unit: '%', source: 'Formulasi' });
	});

	it('calculates the calendar date in WIB deterministically', () => {
		expect(currentWibDate(new Date('2026-08-09T18:00:00Z'))).toBe('2026-08-10');
	});
});

describe('sub-parameter per stasiun', () => {
	const rainfall: DashboardMetric = {
		label: 'Curah hujan',
		value: 12.4,
		unit: 'mm',
		time: '2026-08-10T08:00:00Z',
		source: 'measured',
		stations: [
			{ station: 'SKW', label: 'Pos Sokawera', value: 15.2, time: null },
			{ station: 'WND', label: 'Pos Wanadadi', value: 9.6, time: null }
		]
	};

	it('memunculkan tiap stasiun sebagai sub-baris dengan satuan induknya', () => {
		const [row] = dashboardMetricRows({ rainfall }, false);

		expect(row.value).toBe('12,4');
		expect(row.subRows).toEqual([
			{ label: 'Pos Sokawera', value: '15,2', unit: 'mm' },
			{ label: 'Pos Wanadadi', value: '9,6', unit: 'mm' }
		]);
	});

	it('tidak membuat sub-baris untuk parameter berstasiun tunggal', () => {
		const [row] = dashboardMetricRows(
			{ rainfall: { ...rainfall, stations: [rainfall.stations![0]] } },
			false
		);

		expect(row.subRows).toBeUndefined();
	});

	it('tetap merinci stasiun walau nilai induknya belum tersedia', () => {
		const [row] = dashboardMetricRows({ rainfall: { ...rainfall, value: null } }, false);

		expect(row.value).toBe('N/A');
		expect(row.sourceType).toBe('unavailable');
		expect(row.subRows).toHaveLength(2);
	});
});

describe('penanda konstanta yang bisa diunggah', () => {
	const constantMetric: DashboardMetric = {
		label: 'Batas TMA MOL',
		value: 225.7,
		unit: 'mdpl',
		time: null,
		source: 'constant',
		stations: null
	};

	function constantTag(parameter: string, enabled = true): PlantTag {
		return {
			id: `tag-${parameter}`,
			pltaId: 'plta-1',
			parameter,
			station: 'MANUAL',
			protocol: 'upload',
			address: '',
			httpHeaders: {},
			valuePath: null,
			timestampPath: null,
			scale: 1,
			offset: 0,
			unit: 'm dpl',
			enabled
		};
	}

	/**
	 * Dua jenis konstanta harus terbaca beda: yang hanya bisa diubah lewat
	 * konfigurasi server, dan yang boleh diisi operator. Tanpa pembedaan ini
	 * operator tidak punya cara tahu baris mana yang bisa dia perbaiki sendiri.
	 */
	it('tetap "constant" bila tidak ada tag unggah untuk parameternya', () => {
		const [row] = dashboardMetricRows({ batas_tma_mol: constantMetric }, false);

		expect(row.sourceType).toBe('constant');
		expect(row.uploadTarget).toBeUndefined();
	});

	it('menjadi "constant-input" begitu parameternya punya tag unggah', () => {
		const target = buildUploadTarget(
			[constantTag('const_tma_mol')],
			'const_tma_mol',
			'Batas TMA MOL',
			'mdpl'
		);

		const [row] = dashboardMetricRows({ batas_tma_mol: constantMetric }, false, {
			batas_tma_mol: target
		});

		expect(row.sourceType).toBe('constant-input');
		expect(row.uploadTarget?.parameter).toBe('const_tma_mol');
	});

	it('tidak menandai konstanta bila tag unggahnya dinonaktifkan', () => {
		const target = buildUploadTarget(
			[constantTag('const_tma_mol', false)],
			'const_tma_mol',
			'Batas TMA MOL',
			'mdpl'
		);

		const [row] = dashboardMetricRows({ batas_tma_mol: constantMetric }, false, {
			batas_tma_mol: target
		});

		expect(target).toBeUndefined();
		expect(row.sourceType).toBe('constant');
	});

	it('nilai realtime tetap mengalahkan penanda konstanta', () => {
		// TMA tailrace berupa konstanta di respons harian, tetapi bila sensornya
		// mengirim angka, yang dibaca operator adalah angka sensor itu.
		const target = buildUploadTarget(
			[constantTag('const_tma_tailrace')],
			'const_tma_tailrace',
			'TMA tailrace',
			'mdpl'
		);

		const [row] = dashboardMetricRows(
			{ tma_tailrace: { ...constantMetric, label: 'TMA Tailrace' } },
			false,
			{ tma_tailrace: target },
			{ tma_tailrace: { value: 134.9, source: 'Realtime' } }
		);

		expect(row.sourceType).toBe('api');
	});
});
