import { describe, expect, it } from 'vitest';
import type { DashboardMetric, MonthlyHydrology } from '$features/hydrology';
import type { MonitoringParameterLatest } from '$features/monitoring';
import type { PlantTag } from '$features/plta';
import {
	buildMonthlyForecastRows,
	buildUploadTarget,
	currentWibDate,
	dashboardMetricRows,
	latestMonitoringParameter,
	resolveMetricUploadTargets
} from './presentation';

const measuredMetric: DashboardMetric = {
	label: 'Tinggi muka air',
	value: 223.1,
	unit: 'mdpl',
	time: '2026-08-10T08:00:00Z',
	source: 'measured',
	stations: null,
	input: null
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
		],
		input: null
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
		stations: null,
		input: null
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

describe('tombol Input data otomatis per baris', () => {
	function uploadTag(parameter: string, station = ''): PlantTag {
		return {
			id: `tag-${parameter}-${station}`,
			pltaId: 'plta-1',
			parameter,
			station,
			protocol: 'upload',
			address: '',
			httpHeaders: {},
			valuePath: null,
			timestampPath: null,
			scale: 1,
			offset: 0,
			unit: 'm3/s',
			enabled: true
		};
	}

	function planMetric(label: string, input: DashboardMetric['input'] = null): DashboardMetric {
		return { label, value: null, unit: 'm³/s', time: null, source: 'plan', stations: null, input };
	}

	it('memetakan rencana baru ke parameter unggahnya dengan label dari API', () => {
		// Pola tag PLTA-SDJ: PDAM dan buangan sampah diisi manual.
		const targets = resolveMetricUploadTargets(
			[
				{
					rencana_debit_intake_pdam: planMetric('Rencana Debit Intake PDAM'),
					rencana_debit_buangan_sampah: planMetric('Rencana Debit Buangan Sampah')
				}
			],
			[uploadTag('plan_outflow_pdam'), uploadTag('plan_outflow_trash')]
		);

		expect(targets.rencana_debit_intake_pdam?.parameter).toBe('plan_outflow_pdam');
		expect(targets.rencana_debit_intake_pdam?.label).toBe('Rencana Debit Intake PDAM');
		expect(targets.rencana_debit_buangan_sampah?.parameter).toBe('plan_outflow_trash');
	});

	it('memisahkan irigasi kanan dan kiri berdasarkan station tag', () => {
		const tags = [
			uploadTag('plan_outflow_irigasi', 'KANAN'),
			uploadTag('plan_outflow_irigasi', 'KIRI')
		];
		const targets = resolveMetricUploadTargets(
			[
				{
					rencana_debit_irigasi_kanan: planMetric('Rencana Irigasi Kanan'),
					rencana_debit_irigasi_kiri: planMetric('Rencana Irigasi Kiri')
				}
			],
			tags
		);

		expect(targets.rencana_debit_irigasi_kanan?.tags.map((tag) => tag.station)).toEqual(['KANAN']);
		expect(targets.rencana_debit_irigasi_kiri?.tags.map((tag) => tag.station)).toEqual(['KIRI']);
	});

	it('tidak memunculkan tombol kanan/kiri di PLTA yang irigasinya satu tag', () => {
		const targets = resolveMetricUploadTargets(
			[{ rencana_debit_irigasi_kanan: planMetric('Rencana Irigasi Kanan') }],
			[uploadTag('plan_outflow_irigasi')]
		);

		expect(targets.rencana_debit_irigasi_kanan).toBeUndefined();
	});

	it('rencana turbin memakai tag per unit, atau tag tunggal bila PLTA tidak membaginya', () => {
		const perUnit = resolveMetricUploadTargets(
			[{ rencana_debit_turbin_unit_2: planMetric('Rencana Turbin 2') }],
			[uploadTag('plan_outflow_turbine', 'T1'), uploadTag('plan_outflow_turbine', 'T2')]
		);
		const single = resolveMetricUploadTargets(
			[{ rencana_debit_turbin_unit_2: planMetric('Rencana Turbin 2') }],
			[uploadTag('plan_outflow_turbine')]
		);

		expect(perUnit.rencana_debit_turbin_unit_2?.tags.map((tag) => tag.station)).toEqual(['T2']);
		expect(single.rencana_debit_turbin_unit_2?.tags).toHaveLength(1);
	});

	it('baris tanpa tag unggah tetap hanya-baca', () => {
		const targets = resolveMetricUploadTargets(
			[{ rencana_debit_pintu_air: planMetric('Rencana Pintu Air') }],
			[]
		);

		expect(targets.rencana_debit_pintu_air).toBeUndefined();
	});
});

describe('tujuan isian dari server (`metric.input`)', () => {
	function uploadTag(parameter: string, station = ''): PlantTag {
		return {
			id: `tag-${parameter}-${station}`,
			pltaId: 'plta-1',
			parameter,
			station,
			protocol: 'upload',
			address: '',
			httpHeaders: {},
			valuePath: null,
			timestampPath: null,
			scale: 1,
			offset: 0,
			unit: 'm3/s',
			enabled: true
		};
	}

	function metric(label: string, input: DashboardMetric['input']): DashboardMetric {
		return {
			label,
			value: null,
			unit: 'm³/s',
			time: null,
			source: 'measured',
			stations: null,
			input
		};
	}

	/**
	 * Sejak backend mengirim `input`, itulah sumber utamanya: baris realisasi yang
	 * `source`-nya `measured` pun bisa diisi manual, dan hanya server yang tahu.
	 */
	it('memakai parameter dan station dari server', () => {
		const targets = resolveMetricUploadTargets(
			[
				{
					debit_irigasi_kanan: metric('Debit Irigasi Kanan', {
						parameter: 'outflow_irigasi',
						station: 'KANAN'
					})
				}
			],
			[uploadTag('outflow_irigasi', 'KANAN'), uploadTag('outflow_irigasi', 'KIRI')]
		);

		expect(targets.debit_irigasi_kanan?.parameter).toBe('outflow_irigasi');
		expect(targets.debit_irigasi_kanan?.tags.map((tag) => tag.station)).toEqual(['KANAN']);
	});

	it('tidak memunculkan tombol bila server tidak menyebut tujuan dan tabel pun tidak punya', () => {
		const targets = resolveMetricUploadTargets(
			[{ debit_turbin_total: metric('Debit Turbin Total', null) }],
			[uploadTag('total_outflow')]
		);

		expect(targets.debit_turbin_total).toBeUndefined();
	});

	/**
	 * Dua kasus yang `input`-nya masih `null` dari backend per 21 Sep 2026:
	 * rencana turbin di PLTA yang tagnya tanpa station, dan realisasi spillway.
	 * Tanpa cadangan tabel, tombolnya hilang di 11 dari 13 PLTA.
	 */
	it('jatuh ke tabel cadangan saat server belum mengisi `input`', () => {
		const targets = resolveMetricUploadTargets(
			[
				{
					rencana_debit_turbin_unit_2: metric('Rencana Debit Turbin Unit 2', null),
					debit_spillway: metric('Debit Spillway', null)
				}
			],
			[uploadTag('plan_outflow_turbine'), uploadTag('outflow_spillway')]
		);

		expect(targets.rencana_debit_turbin_unit_2?.parameter).toBe('plan_outflow_turbine');
		expect(targets.debit_spillway?.parameter).toBe('outflow_spillway');
	});

	/**
	 * PLTA-001 mencatat rencana turbin per unit tetapi hanya punya T1–T3.
	 * Cadangan tidak boleh mengarahkan baris Unit 4 ke tag unit lain.
	 */
	it('tidak mengarahkan unit tanpa tag ke tag unit lain', () => {
		const tags = [uploadTag('plan_outflow_turbine', 'T1'), uploadTag('plan_outflow_turbine', 'T2')];
		const targets = resolveMetricUploadTargets(
			[
				{
					rencana_debit_turbin_unit_2: metric('Rencana Debit Turbin Unit 2', {
						parameter: 'plan_outflow_turbine',
						station: 'T2'
					}),
					rencana_debit_turbin_unit_4: metric('Rencana Debit Turbin Unit 4', null)
				}
			],
			tags
		);

		expect(targets.rencana_debit_turbin_unit_2?.tags.map((tag) => tag.station)).toEqual(['T2']);
		expect(targets.rencana_debit_turbin_unit_4).toBeUndefined();
	});

	it('tetap hanya-baca bila server menunjuk tag yang tidak dimiliki PLTA', () => {
		const targets = resolveMetricUploadTargets(
			[
				{
					rencana_debit_pintu_air: metric('Rencana Debit Pintu Air', {
						parameter: 'plan_outflow_sluice',
						station: ''
					})
				}
			],
			[]
		);

		expect(targets.rencana_debit_pintu_air).toBeUndefined();
	});
});
