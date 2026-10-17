import { describe, expect, it } from 'vitest';
import type { DashboardMetric, MonthlyHydrology } from '$features/hydrology';
import type { MonitoringParameterLatest } from '$features/monitoring';
import {
	buildMonthlyComparison,
	currentWibDate,
	dashboardMetricRows,
	formatReadingAge,
	freshnessThresholdsFor,
	HOURLY_SENSOR_FRESHNESS_MINUTES,
	METRIC_FRESHNESS_MINUTES,
	latestMonitoringParameter,
	filterMetricRows,
	markRecalculating,
	parseDailyRowFilter,
	parseDailyZoneFilter,
	metricFreshness,
	staleMetricRows,
	resolveMetricUploadTargets,
	type MetricRow
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
			{ station: 'SKW', label: 'Pos Sokawera', value: 15.2, time: null, input: null },
			{ station: 'WND', label: 'Pos Wanadadi', value: 9.6, time: null, input: null }
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
		// Tidak ada lagi penanda "Belum tersedia": baris kosong memakai penanda sumbernya.
		expect(row.sourceType).toBe('api');
		expect(row.subRows).toHaveLength(2);
	});
});

describe('empat klasifikasi sumber panel harian', () => {
	it.each([
		['measured', 'api', 'Realtime'],
		['derived', 'formula', 'Formulasi'],
		['plan', 'input', 'Input'],
		['constant', 'constant-input', 'Konstanta (input)']
	] as const)('%s → %s', (source, sourceType, label) => {
		const [row] = dashboardMetricRows({ metrik: { ...measuredMetric, source } }, false);

		expect(row).toMatchObject({ sourceType, source: label });
	});

	it('nilai realtime tetap mengalahkan penanda konstanta', () => {
		// TMA tailrace berupa konstanta di respons harian, tetapi bila sensornya
		// mengirim angka, yang dibaca operator adalah angka sensor itu.
		const [row] = dashboardMetricRows(
			{ tma_tailrace: { ...measuredMetric, source: 'constant' } },
			false,
			{},
			{ tma_tailrace: { value: 134.9, source: 'Realtime' } }
		);

		expect(row.sourceType).toBe('api');
	});

	it('panel kosong tidak menghasilkan baris N/A tanpa nama', () => {
		expect(dashboardMetricRows({}, false)).toEqual([]);
		expect(dashboardMetricRows(undefined, true)).toHaveLength(1);
	});
});

describe('tujuan isian hanya dari `input` server', () => {
	function metric(
		label: string,
		input: DashboardMetric['input'],
		source: DashboardMetric['source'] = 'plan'
	): DashboardMetric {
		return {
			label,
			value: null,
			unit: 'm³/s',
			time: null,
			source,
			stations: null,
			input,
			hidden: false,
			order: null
		};
	}

	it('memakai parameter dan station dari server beserta label metriknya', () => {
		const targets = resolveMetricUploadTargets([
			{
				debit_irigasi_kanan: metric(
					'Debit Irigasi Kanan',
					{ parameter: 'outflow_irigasi', station: 'KANAN' },
					'measured'
				)
			}
		]);

		expect(targets.debit_irigasi_kanan).toEqual({
			label: 'Debit Irigasi Kanan',
			parameter: 'outflow_irigasi',
			unit: 'm³/s',
			stations: [{ station: 'KANAN', label: 'KANAN' }]
		});
	});

	/**
	 * Backend: Target TMA sengaja `input: null` (diubah lewat RTOW) dan Pintu Air
	 * ber-`source` `plan` tanpa tag. Tombol tidak boleh diturunkan dari `source`.
	 */
	it('tidak memunculkan tombol dari `source` bila `input` null', () => {
		const targets = resolveMetricUploadTargets([
			{
				target_tma: metric('Target TMA', null, 'plan'),
				rencana_debit_pintu_air: metric('Rencana Debit Pintu Air', null, 'plan'),
				batas_tma_mol: metric('Batas TMA MOL', null, 'constant')
			}
		]);

		expect(targets).toEqual({});
	});

	it('menyusun pilihan station dari `input` tiap stasiun (pintu spillway)', () => {
		const spillway: DashboardMetric = {
			...metric('Debit Spillway', null, 'measured'),
			stations: [
				{
					station: 'G1',
					label: 'Pintu 1',
					value: 0,
					time: null,
					input: { parameter: 'outflow_spillway', station: 'G1' }
				},
				{
					station: 'G2',
					label: 'Pintu 2',
					value: 0,
					time: null,
					input: { parameter: 'outflow_spillway', station: 'G2' }
				},
				{ station: 'SENSOR', label: 'Sensor', value: 0, time: null, input: null }
			]
		};

		const targets = resolveMetricUploadTargets([{ debit_spillway: spillway }]);

		expect(targets.debit_spillway?.parameter).toBe('outflow_spillway');
		expect(targets.debit_spillway?.stations).toEqual([
			{ station: 'G1', label: 'Pintu 1' },
			{ station: 'G2', label: 'Pintu 2' }
		]);
	});

	it('station kosong ditampilkan sebagai Default', () => {
		const targets = resolveMetricUploadTargets([
			{
				rencana_debit_turbin_total: metric('Rencana Total', {
					parameter: 'plan_outflow_turbine',
					station: ''
				})
			}
		]);

		expect(targets.rencana_debit_turbin_total?.stations).toEqual([
			{ station: '', label: 'Default' }
		]);
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

describe('nilai yang dihitung ulang saat penyebut DMN diganti', () => {
	const rows = [
		{ key: 'tma_waduk', label: 'TMA Waduk', value: '1', source: 'Realtime', sourceType: 'api' },
		{
			key: 'service_hour_full_load',
			label: 'Service Hour Full Load',
			value: '2',
			source: 'Formulasi',
			sourceType: 'formula'
		},
		{
			key: 'dmn_beban_penuh',
			label: 'DMN Beban Penuh',
			value: '3',
			source: 'Formulasi',
			sourceType: 'formula'
		}
	] satisfies MetricRow[];

	it('hanya menandai SHFL dan DMN beban penuh', () => {
		const marked = markRecalculating(rows, true);

		expect(marked.filter((row) => row.isRecalculating).map((row) => row.key)).toEqual([
			'service_hour_full_load',
			'dmn_beban_penuh'
		]);
	});

	it('tidak mengubah apa pun bila tidak sedang menghitung ulang', () => {
		expect(markRecalculating(rows, false)).toBe(rows);
	});
});

describe('mode tampilan Hidrologi Harian', () => {
	const base = { source: 'Realtime', sourceType: 'api', hasData: true } as const;
	const rows = [
		{ ...base, key: 'tma_waduk', label: 'TMA Waduk', value: '231' },
		{
			...base,
			key: 'inflow',
			label: 'Inflow',
			value: '12',
			freshness: { level: 'stale', ageLabel: '2 jam lalu', measuredAt: '2026-10-13T00:00:00Z' }
		},
		{ ...base, key: 'ph_hulu', label: 'pH', value: 'N/A', hasData: false },
		{ ...base, key: 'volume_waduk', label: 'Volume', value: '9', sourceType: 'formula' },
		{
			...base,
			key: 'batas_tma_mol',
			label: 'Batas MOL',
			value: '200',
			sourceType: 'constant-input'
		},
		{ ...base, key: 'rencana_debit_ddc', label: 'Rencana DDC', value: '1', sourceType: 'input' }
	] satisfies MetricRow[];
	const keys = (filtered: MetricRow[]) => filtered.map((row) => row.key);

	it('Semua tidak menyaring apa pun', () => {
		expect(filterMetricRows(rows, 'semua')).toBe(rows);
	});

	it('Perlu perhatian: sensor basi, nilai kosong, dan formula yang menunggu', () => {
		expect(keys(filterMetricRows(rows, 'perhatian', new Set(['volume_waduk'])))).toEqual([
			'inflow',
			'ph_hulu',
			'volume_waduk'
		]);
	});

	it('Isian manual: baris Input dan Konstanta (input)', () => {
		expect(keys(filterMetricRows(rows, 'manual'))).toEqual(['batas_tma_mol', 'rencana_debit_ddc']);
	});

	it('Ringkas: hanya metrik kunci', () => {
		expect(keys(filterMetricRows(rows, 'ringkas'))).toEqual(['tma_waduk', 'inflow']);
	});

	it('baris memuat selalu dipertahankan', () => {
		const loading = {
			label: 'Memuat parameter…',
			value: 'Memuat…',
			source: 'Memuat',
			sourceType: 'api'
		} as const;
		expect(filterMetricRows([loading], 'ringkas')).toEqual([loading]);
	});

	it('nilai URL yang tidak dikenal jatuh ke Semua', () => {
		expect(parseDailyZoneFilter('hulu')).toBe('hulu');
		expect(parseDailyZoneFilter('atap')).toBe('semua');
		expect(parseDailyRowFilter(null)).toBe('semua');
	});
});
