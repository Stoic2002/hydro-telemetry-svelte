import { describe, expect, it } from 'vitest';
import type { DashboardMetric, MonthlyHydrology } from '$features/hydrology';
import type { MonitoringParameterLatest } from '$features/monitoring';
import type { PlantTag } from '$features/plta';
import {
	buildMonthlyComparison,
	buildUploadTarget,
	currentWibDate,
	dashboardMetricRows,
	formatReadingAge,
	freshnessThresholdsFor,
	HOURLY_SENSOR_FRESHNESS_MINUTES,
	METRIC_FRESHNESS_MINUTES,
	latestMonitoringParameter,
	metricFreshness,
	staleMetricRows,
	resolveMetricUploadTargets
} from './presentation';

const measuredMetric: DashboardMetric = {
	label: 'Tinggi muka air',
	value: 223.1,
	unit: 'mdpl',
	time: '2026-08-10T08:00:00Z',
	source: 'measured',
	stations: null,
	input: null,
	hidden: false,
	order: null
};

const monthlyRecord: MonthlyHydrology = {
	id: 'monthly-1',
	pltaId: 'plta-1',
	year: 2026,
	month: 8,
	hydrologyPrediction: 'Normal',
	hydrologyActual: null,
	images: {
		prediksi_sifat_hujan: null,
		prediksi_curah_hujan: null,
		realisasi_sifat_hujan: null,
		realisasi_curah_hujan: null
	},
	predictedProductionMwh: 1200.5,
	targetProductionMwh: 1300,
	actualProductionMwh: 1180,
	predictedAccumulatedMwh: 7600.5,
	targetAccumulatedMwh: 7800,
	actualAccumulatedMwh: 6400,
	monthlyAchievement: { percentage: 92.35, status: 'not-achieved' },
	accumulatedAchievement: { percentage: 97.44, status: 'not-achieved' }
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
			enabled: true,
			label: null,
			minValid: null,
			maxValid: null
		};
		const target = buildUploadTarget(
			[baseTag, { ...baseTag, id: 'tag-2', enabled: false }],
			'plan_water_level',
			'Target TMA',
			'mdpl'
		);

		expect(target?.tags.map((tag) => tag.id)).toEqual(['tag-1']);
	});

	it('memasangkan target, prediksi, dan realisasi dalam satu baris per parameter', () => {
		const { rows } = buildMonthlyComparison(monthlyRecord, 'Agustus');

		expect(rows.map((row) => row.label)).toEqual([
			'Kondisi hidrologi',
			'Energi Agustus',
			'Energi akumulasi s.d. Agustus'
		]);

		const [hydrology, production, cumulative] = rows;
		expect(hydrology.cells.target).toBeUndefined();
		expect(hydrology.cells.prediction).toMatchObject({ value: 'Normal', sourceType: 'api' });
		expect(hydrology.cells.actual).toMatchObject({ value: 'N/A', sourceType: 'unavailable' });

		expect(production.unit).toBe('MWh');
		expect(production.cells.target).toMatchObject({ value: '1.300', sourceType: 'input' });
		expect(production.cells.prediction).toMatchObject({ value: '1.200,5', sourceType: 'api' });
		expect(production.cells.actual).toMatchObject({ value: '1.180', sourceType: 'api' });

		expect(cumulative.cells.target).toMatchObject({ value: '7.800' });
		expect(cumulative.cells.prediction).toMatchObject({ value: '7.600,5' });
		expect(cumulative.cells.actual).toMatchObject({ value: '6.400' });
	});

	it('memasangkan persentase dan status dari server ke baris pasangannya', () => {
		const [hydrology, production, cumulative] = buildMonthlyComparison(
			monthlyRecord,
			'Agustus'
		).rows;

		expect(hydrology.achievement).toBeUndefined();
		expect(production.achievement).toEqual({
			value: '92,4',
			status: 'not-achieved',
			isAvailable: true
		});
		expect(cumulative.achievement).toEqual({
			value: '97,4',
			status: 'not-achieved',
			isAvailable: true
		});
	});

	it('memakai status server, bukan menghitung ulang dari persentase yang dibulatkan', () => {
		const [, production] = buildMonthlyComparison(
			{
				...monthlyRecord,
				monthlyAchievement: { percentage: 100, status: 'not-achieved' }
			},
			'Agustus'
		).rows;

		expect(production.achievement).toMatchObject({ value: '100', status: 'not-achieved' });
	});

	it('menandai sel yang seharusnya ada tetapi belum terisi sebagai tidak tersedia', () => {
		const { rows } = buildMonthlyComparison(undefined, 'Agustus');

		expect(rows[1].cells.target).toMatchObject({ value: 'N/A', sourceType: 'unavailable' });
		expect(rows[2].cells.actual).toMatchObject({ value: 'N/A', sourceType: 'unavailable' });
		expect(rows[1].achievement).toMatchObject({ value: 'N/A', status: null, isAvailable: false });
	});

	it('calculates the calendar date in WIB deterministically', () => {
		expect(currentWibDate(new Date('2026-08-09T18:00:00Z'))).toBe('2026-08-10');
	});
});

describe('urutan metrik panel harian', () => {
	const metric = (order: number | null) => ({ ...measuredMetric, order });

	it('mengikuti urutan dari server, bukan urutan bawaan layar', () => {
		const rows = dashboardMetricRows(
			{ target_tma: metric(2), tma_waduk: metric(0), inflow: metric(1) },
			false,
			{},
			{},
			['target_tma', 'tma_waduk', 'inflow']
		);

		expect(rows.map((row) => row.key)).toEqual(['tma_waduk', 'inflow', 'target_tma']);
	});

	it('memakai urutan bawaan layar bila server belum mengirim urutan', () => {
		const rows = dashboardMetricRows(
			{ inflow: metric(null), tma_waduk: metric(null), target_tma: metric(null) },
			false,
			{},
			{},
			['target_tma', 'tma_waduk']
		);

		expect(rows.map((row) => row.key)).toEqual(['target_tma', 'tma_waduk', 'inflow']);
	});

	it('tidak mencampur dua sumber urutan dalam satu panel', () => {
		const rows = dashboardMetricRows(
			{ inflow: metric(0), tma_waduk: metric(null), target_tma: metric(1) },
			false,
			{},
			{},
			['target_tma', 'tma_waduk', 'inflow']
		);

		expect(rows.map((row) => row.key)).toEqual(['target_tma', 'tma_waduk', 'inflow']);
	});

	it('menghitung urutan setelah metrik tersembunyi dibuang', () => {
		const rows = dashboardMetricRows(
			{
				tma_waduk: metric(1),
				ph_hulu: { ...metric(null), hidden: true },
				inflow: metric(0)
			},
			false
		);

		expect(rows.map((row) => row.key)).toEqual(['inflow', 'tma_waduk']);
	});
});

describe('metrik yang disembunyikan operator', () => {
	it('tidak dirender walau server tetap mengirimnya', () => {
		const rows = dashboardMetricRows(
			{
				tma_waduk: measuredMetric,
				ph_hulu: { ...measuredMetric, label: 'pH Hulu', hidden: true }
			},
			false
		);

		expect(rows.map((row) => row.key)).toEqual(['tma_waduk']);
	});

	it('tidak ikut ringkasan sensor basi', () => {
		const stale = { ...measuredMetric, time: '2026-08-10T00:00:00Z' };
		const now = Date.parse('2026-08-10T08:00:00Z');
		const rows = dashboardMetricRows(
			{ tma_waduk: stale, ph_hulu: { ...stale, hidden: true } },
			false,
			{},
			{},
			[],
			now
		);

		expect(staleMetricRows([{ title: 'Hulu', rows }]).map((row) => row.key)).toEqual(['tma_waduk']);
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
		input: null,
		hidden: false,
		order: null
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
		input: null,
		hidden: false,
		order: null
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
			enabled,
			label: null,
			minValid: null,
			maxValid: null
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
			enabled: true,
			label: null,
			minValid: null,
			maxValid: null
		};
	}

	function planMetric(label: string, input: DashboardMetric['input'] = null): DashboardMetric {
		return {
			label,
			value: null,
			unit: 'm³/s',
			time: null,
			source: 'plan',
			stations: null,
			input,
			hidden: false,
			order: null
		};
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
			enabled: true,
			label: null,
			minValid: null,
			maxValid: null
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
			input,
			hidden: false,
			order: null
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

describe('umur pembacaan sensor', () => {
	// measuredMetric diukur 2026-08-10T08:00:00Z.
	const at = (minutesAfter: number) => Date.parse('2026-08-10T08:00:00Z') + minutesAfter * 60_000;

	it('tidak memberi penanda selama pembacaan masih segar', () => {
		expect(metricFreshness('2026-08-10T08:00:00Z', at(14))).toBeUndefined();
	});

	it('menandai kuning setelah 30 menit dan merah setelah 60 menit', () => {
		expect(metricFreshness('2026-08-10T08:00:00Z', at(29))).toBeUndefined();
		expect(metricFreshness('2026-08-10T08:00:00Z', at(30))?.level).toBe('aging');
		expect(metricFreshness('2026-08-10T08:00:00Z', at(59))?.level).toBe('aging');
		expect(metricFreshness('2026-08-10T08:00:00Z', at(60))?.level).toBe('stale');
	});

	it('memberi sensor per jam kelonggaran satu pembacaan terlewat', () => {
		// Curah hujan dikirim tiap 60 menit: 70 menit berarti baru terlambat sedikit.
		const rain = (minutes: number) =>
			dashboardMetricRows(
				{ curah_hujan_bendungan: measuredMetric },
				false,
				{},
				{},
				[],
				at(minutes)
			)[0].freshness?.level;

		expect(rain(70)).toBeUndefined();
		expect(rain(90)).toBe('aging');
		expect(rain(180)).toBe('stale');
	});

	it('memperlakukan setiap stasiun curah hujan sebagai sensor per jam', () => {
		expect(freshnessThresholdsFor('curah_hujan')).toBe(HOURLY_SENSOR_FRESHNESS_MINUTES);
		expect(freshnessThresholdsFor('curah_hujan_bendungan')).toBe(HOURLY_SENSOR_FRESHNESS_MINUTES);
		expect(freshnessThresholdsFor('elevasi_sedimen')).toBe(HOURLY_SENSOR_FRESHNESS_MINUTES);
		expect(freshnessThresholdsFor('tma_waduk')).toBe(METRIC_FRESHNESS_MINUTES);
	});

	it('tidak menyebut basi tanpa waktu yang valid, atau bila waktunya di masa depan', () => {
		expect(metricFreshness(null, at(600))).toBeUndefined();
		expect(metricFreshness('bukan tanggal', at(600))).toBeUndefined();
		expect(metricFreshness('2026-08-10T09:00:00Z', at(0))).toBeUndefined();
	});

	it('menulis umur dalam satuan yang paling mudah dibaca', () => {
		expect(formatReadingAge(32.9)).toBe('32 mnt lalu');
		expect(formatReadingAge(6 * 60 + 10)).toBe('6 jam lalu');
		expect(formatReadingAge(2 * 24 * 60 + 5)).toBe('2 hari lalu');
	});

	it('hanya menandai pembacaan sensor, bukan formula, rencana, atau konstanta', () => {
		const rows = dashboardMetricRows(
			{
				tma: measuredMetric,
				formula: { ...measuredMetric, label: 'Formula', source: 'derived' },
				rencana: { ...measuredMetric, label: 'Rencana', source: 'plan' },
				konstanta: { ...measuredMetric, label: 'Konstanta', source: 'constant' }
			},
			false,
			{},
			{},
			[],
			at(120)
		);

		expect(rows.map((row) => [row.key, row.freshness?.level])).toEqual([
			['tma', 'stale'],
			['formula', undefined],
			['rencana', undefined],
			['konstanta', undefined]
		]);
	});

	it('tidak menandai realisasi yang di PLTA ini diisi manual', () => {
		// Baris dengan tombol isian = diisi operator sekali sehari, bukan sensor.
		const [row] = dashboardMetricRows(
			{ debit_spillway: measuredMetric },
			false,
			{
				debit_spillway: {
					label: 'Debit spillway',
					parameter: 'outflow_spillway',
					unit: 'm³/s',
					tags: []
				} as never
			},
			{},
			[],
			at(120)
		);

		expect(row.freshness).toBeUndefined();
	});

	it('memakai waktu nilai realtime bila nilai harian ditimpa', () => {
		// Nilai harian sudah basi, tetapi realtime baru masuk 5 menit lalu.
		const [row] = dashboardMetricRows(
			{ tma_waduk: measuredMetric },
			false,
			{},
			{ tma_waduk: { value: 224, source: 'Realtime', time: new Date(at(115)).toISOString() } },
			[],
			at(120)
		);

		expect(row.value).toBe('224');
		expect(row.freshness).toBeUndefined();
	});

	it('tidak menghitung umur bila halaman tidak memberi jam', () => {
		const [row] = dashboardMetricRows({ tma: measuredMetric }, false);

		expect(row.freshness).toBeUndefined();
	});
});

describe('ringkasan sensor basi', () => {
	const row = (
		key: string,
		level: 'aging' | 'stale' | undefined,
		measuredAt = '2026-08-10T08:00:00Z'
	) => ({
		key,
		label: key,
		value: '1',
		source: 'Realtime',
		sourceType: 'api' as const,
		freshness: level ? { level, ageLabel: '-', measuredAt } : undefined
	});

	it('hanya memuat yang merah, yang paling lama diam lebih dulu', () => {
		const rows = staleMetricRows([
			{ title: 'Hulu', rows: [row('a', 'stale', '2026-08-10T06:00:00Z'), row('b', 'aging')] },
			{ title: 'Hilir', rows: [row('c', undefined), row('d', 'stale', '2026-08-10T02:00:00Z')] }
		]);

		expect(rows.map((item) => item.key)).toEqual(['d', 'a']);
	});
});
