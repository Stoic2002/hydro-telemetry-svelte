import { describe, expect, it } from 'vitest';
import type { PlantTrendDataItem, PlantTrendList, TrendPoint } from '$features/trends';
import {
	axisMapping,
	buildTrendChart,
	selectTrendChart,
	stepPoints,
	trendChartOptions,
	valueAt
} from './plant-trend';

function point(time: string, value: number): TrendPoint {
	return { time, value, quality: 'good', pureQuality: true };
}

function item(
	id: string,
	overrides: Partial<PlantTrendDataItem> = {},
	points: TrendPoint[] = [point('2026-10-13T00:00:00Z', 1)]
): PlantTrendDataItem {
	return {
		id,
		key: id,
		order: 0,
		group: null,
		label: id,
		isLabelCustom: false,
		unit: 'm',
		panel: 'hulu',
		source: 'measured',
		effectiveResolution: '1h',
		hasData: points.length > 0,
		series: [{ name: id, station: null, stations: [], points, isTruncated: false }],
		...overrides
	};
}

function chartOf(...items: PlantTrendDataItem[]) {
	return buildTrendChart(
		{ title: 'Uji', group: 'G', itemIds: items.map((entry) => entry.id) },
		new Map(items.map((entry) => [entry.id, entry]))
	);
}

describe('model grafik daftar tren', () => {
	it('menaruh satuan kedua di sumbu kanan', () => {
		const chart = chartOf(item('tma', { unit: 'mdpl' }), item('inflow', { unit: 'm3/s' }));

		expect(chart.leftUnit).toBe('mdpl');
		expect(chart.rightUnit).toBe('m3/s');
		expect(chart.series.map((view) => view.axis)).toEqual(['left', 'right']);
		expect(chart.rightDomain).not.toBeNull();
	});

	it('satu satuan: tanpa sumbu kanan', () => {
		const chart = chartOf(item('a'), item('b'));

		expect(chart.rightUnit).toBeNull();
		expect(chart.series.every((view) => view.axis === 'left')).toBe(true);
	});

	it('menamai deret per stasiun dengan nama item dan stasiunnya', () => {
		const chart = chartOf(
			item('debit_sungai_hulu', {
				label: 'Debit Sungai Hulu',
				series: [
					{ name: 'AWLR 1', station: 'A1', stations: [], points: [], isTruncated: false },
					{ name: 'AWLR 2', station: 'A2', stations: [], points: [], isTruncated: false }
				]
			})
		);

		expect(chart.series.map((view) => view.name)).toEqual([
			'Debit Sungai Hulu · AWLR 1',
			'Debit Sungai Hulu · AWLR 2'
		]);
	});

	it('curah hujan tunggal digambar sebagai batang dari nol', () => {
		const chart = chartOf(
			item('curah_hujan', { unit: 'mm' }, [
				point('2026-10-13T00:00:00Z', 5),
				point('2026-10-13T01:00:00Z', 8)
			])
		);

		expect(chart.isBarChart).toBe(true);
		expect(chart.leftDomain[0]).toBe(0);
	});

	it('mencatat item tanpa data, bukan menganggapnya nol', () => {
		const chart = chartOf(item('a'), item('target_tma', { label: 'Target TMA' }, []));

		expect(chart.emptyItems).toEqual(['Target TMA']);
		expect(chart.hasData).toBe(true);
	});

	it('rencana harian menjadi garis tangga', () => {
		const steps = stepPoints([
			point('2026-10-12T00:00:00Z', 10),
			point('2026-10-13T00:00:00Z', 12)
		]);

		expect(steps.map((entry) => [entry.time, entry.value])).toEqual([
			['2026-10-12T00:00:00Z', 10],
			['2026-10-13T00:00:00Z', 10],
			['2026-10-13T00:00:00Z', 12]
		]);
	});

	it('tooltip garis tangga memakai nilai terakhir yang berlaku', () => {
		const [view] = chartOf(
			item('rencana', { source: 'plan' }, [
				point('2026-10-12T00:00:00Z', 10),
				point('2026-10-13T00:00:00Z', 12)
			])
		).series;

		expect(valueAt(view, Date.parse('2026-10-12T15:00:00Z'))).toBe(10);
		expect(valueAt(view, Date.parse('2026-10-11T15:00:00Z'))).toBeUndefined();
	});

	it('memetakan sumbu kanan ke ruang sumbu kiri dan kembali', () => {
		const mapping = axisMapping([200, 240], [0, 100]);

		expect(mapping.toLeft(50)).toBe(220);
		expect(mapping.toRight(220)).toBe(50);
	});
});

describe('pemilih grafik daftar tren', () => {
	const list: PlantTrendList = {
		pltaId: 'plta',
		isConfigured: true,
		items: [
			item('i-tma', { key: 'tma_waduk', group: 'TMA' }),
			item('i-target', { key: 'target_tma', group: 'TMA' }),
			item('i-inflow', { key: 'inflow' })
		],
		charts: [
			{ title: 'TMA', group: 'TMA', itemIds: ['i-tma', 'i-target'] },
			{ title: 'Inflow', group: null, itemIds: ['i-inflow'] },
			{ title: 'Yatim', group: null, itemIds: ['tak-dikenal'] }
		]
	};
	const options = trendChartOptions(list);

	it('satu pilihan per grafik admin, bernilai kunci item pertamanya', () => {
		expect(options.map(({ value, label }) => ({ value, label }))).toEqual([
			{ value: 'tma_waduk', label: 'TMA' },
			{ value: 'inflow', label: 'Inflow' }
		]);
	});

	it('memilih grafik lewat kunci item mana pun di dalamnya', () => {
		expect(selectTrendChart(list, options, 'target_tma')?.label).toBe('TMA');
		expect(selectTrendChart(list, options, 'inflow')?.label).toBe('Inflow');
	});

	it('jatuh ke grafik pertama bila kunci kosong atau tidak dikenal', () => {
		expect(selectTrendChart(list, options, null)?.label).toBe('TMA');
		expect(selectTrendChart(list, options, 'debit_spillway')?.label).toBe('TMA');
	});
});
