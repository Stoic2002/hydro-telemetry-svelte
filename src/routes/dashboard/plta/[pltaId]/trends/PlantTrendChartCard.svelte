<script lang="ts">
	import { scaleTime } from 'd3-scale';
	import IconArrowDown from '~icons/ph/arrow-down-right';
	import IconArrowUp from '~icons/ph/arrow-up-right';
	import IconMinus from '~icons/ph/minus';
	import { Axis, Bars, Chart, Highlight, Rule, Spline, Svg, Tooltip } from 'layerchart';

	import { formatDayMonthTimeWIB } from '$shared/lib/date';
	import { timeAxisFormatter, valueAxisTicks } from '$shared/utils/chart';
	import { formatNumber } from '$shared/utils/number';
	import { displayUnit } from '$shared/utils/unit';
	import {
		axisMapping,
		valueAt,
		type TrendChartDatum,
		type TrendChartView,
		type TrendReference,
		type TrendSeriesView
	} from './plant-trend';

	interface Props {
		chart: TrendChartView;
		/** Batas TMA dari panel harian; yang dekat digambar, semuanya tertulis di keterangan. */
		references?: TrendReference[];
	}

	/**
	 * Satu grafik dari daftar tren PLTA: item segrup dalam satu sumbu waktu.
	 * Legenda di bawahnya sekaligus tabel statistik per deret — dengan beberapa
	 * garis, kartu statistik tunggal seperti di grafik satu parameter tidak lagi
	 * berarti.
	 */
	let { chart, references = [] }: Props = $props();

	const chartReferences = $derived(references.filter((reference) => reference.isOnChart));

	/**
	 * Deret yang angkanya ditonjolkan di kepala kartu: yang terukur lebih dulu,
	 * karena garis rencana (bertangga) tidak punya "nilai terkini" yang berarti.
	 * Dulu nilai terkini hanya ada di baris kecil tabel di bawah grafik.
	 */
	const headline = $derived(
		chart.series.find((view) => view.stats && !view.isStep) ??
			chart.series.find((view) => view.stats)
	);
	const headlineChange = $derived(
		headline?.stats && headline.points.length > 0
			? headline.stats.latest.value - headline.points[0].value
			: null
	);
	/** Satu deret: statistik jadi strip ringkas; tabel deret hanya untuk beberapa garis. */
	const isSingleSeries = $derived(chart.series.length === 1);

	function describeDistance(reference: TrendReference): string {
		const distance = reference.distanceFromLatest;
		if (distance === null) return '';
		if (Math.abs(distance) < 0.005) return 'setara nilai terkini';
		const amount = `${formatNumber(Math.abs(distance), 2)}${unitLabel(reference.unit)}`;
		return `${amount} ${distance > 0 ? 'di atas' : 'di bawah'} nilai terkini`;
	}

	const mapping = $derived(
		chart.rightDomain ? axisMapping(chart.leftDomain, chart.rightDomain) : null
	);
	const leftAxis = $derived(valueAxisTicks(chart.leftDomain));
	const rightAxis = $derived(chart.rightDomain ? valueAxisTicks(chart.rightDomain) : null);
	const rightTicksInLeftSpace = $derived(
		rightAxis && mapping ? rightAxis.ticks.map((tick) => mapping.toLeft(tick)) : []
	);
	const formatTimeTick = $derived(
		timeAxisFormatter(
			chart.data.length > 1
				? chart.data[chart.data.length - 1].time.getTime() - chart.data[0].time.getTime()
				: 0
		)
	);

	function plotted(view: TrendSeriesView, value: number | undefined): number | undefined {
		if (value === undefined) return undefined;
		return view.axis === 'right' && mapping ? mapping.toLeft(value) : value;
	}

	function unitLabel(unit: string | null): string {
		return unit ? ` ${displayUnit(unit)}` : '';
	}
</script>

<article class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
	<div class="p-4 sm:p-6">
		<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
			<div class="min-w-0">
				<h2 class="card-title">{chart.title}</h2>
				{#if chart.rightUnit}
					<p class="mt-0.5 text-xs text-text-muted">
						Kiri: {chart.leftUnit ?? '—'} · Kanan: {chart.rightUnit}
					</p>
				{:else if chart.leftUnit}
					<p class="mt-0.5 text-xs text-text-muted">{chart.leftUnit}</p>
				{/if}
			</div>

			{#if headline?.stats}
				<div class="text-left sm:text-right">
					<p class="text-xs font-medium text-text-muted">
						Nilai terkini{#if !isSingleSeries}&nbsp;· {headline.name}{/if}
					</p>
					<p class="metric-value mt-0.5 text-2xl font-semibold tracking-tight">
						{formatNumber(headline.stats.latest.value, 2)}<span class="metric-unit ml-1.5 text-xs"
							>{displayUnit(headline.unit) ?? ''}</span
						>
					</p>
					<p
						class="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-text-muted sm:justify-end"
					>
						{#if headlineChange !== null}
							<span class="inline-flex items-center gap-0.5 font-medium text-text-secondary">
								{#if headlineChange > 0}
									<IconArrowUp class="size-3.5" aria-hidden="true" />
								{:else if headlineChange < 0}
									<IconArrowDown class="size-3.5" aria-hidden="true" />
								{:else}
									<IconMinus class="size-3.5" aria-hidden="true" />
								{/if}
								{headlineChange > 0 ? '+' : ''}{formatNumber(headlineChange, 2)}
							</span>
							<span class="whitespace-nowrap"
								>sejak {formatDayMonthTimeWIB(headline.points[0].time)} ·</span
							>
						{/if}
						<span class="whitespace-nowrap"
							>pembacaan {formatDayMonthTimeWIB(headline.stats.latest.time)} WIB</span
						>
					</p>
				</div>
			{/if}
		</div>

		{#if !chart.hasData}
			<div
				class="mt-4 flex h-[220px] items-center justify-center border-y border-surface-overlay bg-surface-base/40 px-4 text-center text-xs text-text-muted"
			>
				Belum ada data pada periode ini.
			</div>
		{:else}
			<div
				class="mt-4"
				role="img"
				aria-label={`Grafik ${chart.title} dengan tooltip nilai per waktu`}
			>
				<div class="h-[280px] w-full">
					<Chart
						data={chart.data}
						x="time"
						xScale={scaleTime()}
						yDomain={chart.leftDomain}
						padding={{ top: 14, right: chart.rightDomain ? 58 : 18, bottom: 28, left: 58 }}
						tooltipContext={{ mode: 'bisect-x' }}
					>
						<Svg>
							<Axis
								placement="left"
								rule={false}
								grid={{ class: 'stroke-chart-grid' }}
								ticks={leftAxis.ticks}
								format={(value: number) => formatNumber(value, leftAxis.fractionDigits)}
								classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
							/>
							{#if rightAxis && mapping}
								<Axis
									placement="right"
									rule={false}
									ticks={rightTicksInLeftSpace}
									format={(value: number) =>
										formatNumber(mapping.toRight(value), rightAxis.fractionDigits)}
									classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
								/>
							{/if}
							<Axis
								placement="bottom"
								rule={false}
								format={formatTimeTick}
								ticks={6}
								classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
							/>

							{#each chart.series as view (view.id)}
								{#if chart.isBarChart}
									<Bars
										data={chart.data.filter((datum) => datum.values[view.id] !== undefined)}
										y={(datum: TrendChartDatum) => datum.values[view.id]}
										fill={view.color}
										fillOpacity={0.82}
										radius={3}
									/>
								{:else}
									<Spline
										y={(datum: TrendChartDatum) => plotted(view, datum.values[view.id])}
										defined={(datum: TrendChartDatum) => datum.values[view.id] !== undefined}
										stroke={view.color}
										class="stroke-[2.5]"
									/>
								{/if}
							{/each}

							<!-- Namanya di keterangan bawah grafik; atas = Limpas, bawah = MOL. -->
							{#each chartReferences as reference (reference.key)}
								<Rule
									y={reference.value}
									class="stroke-status-warning-strong stroke-[1.25] [stroke-dasharray:6_4]"
								/>
							{/each}

							<Highlight lines points />
						</Svg>

						<Tooltip.Root variant="none" classes={{ container: 'chart-tooltip' }}>
							{#snippet children({ data })}
								{@const datum = data as TrendChartDatum}
								<div class="min-w-48">
									<p class="text-xs font-medium text-text-on-inverse">
										{formatDayMonthTimeWIB(datum.iso)}
									</p>
									<dl class="mt-2 flex flex-col gap-1">
										{#each chart.series as view (view.id)}
											{@const value = valueAt(view, datum.time.getTime())}
											<div class="flex items-baseline justify-between gap-4 text-xs">
												<dt class="flex items-center gap-1.5 text-text-on-inverse-muted">
													<span
														class="size-2 shrink-0 rounded-full"
														style:background-color={view.color}
													></span>
													{view.name}
												</dt>
												<dd class="font-mono text-sm text-text-on-inverse tabular-nums">
													{value === undefined ? '–' : formatNumber(value, 2)}<span
														class="text-xs text-text-on-inverse-muted">{unitLabel(view.unit)}</span
													>
												</dd>
											</div>
										{/each}
									</dl>
								</div>
							{/snippet}
						</Tooltip.Root>
					</Chart>
				</div>
			</div>
		{/if}

		{#if isSingleSeries && headline?.stats}
			{@const stats = headline.stats}
			<dl class="mt-3 grid grid-cols-3 border-t border-surface-overlay pt-3">
				{#each [{ label: 'Rata-rata', value: stats.average }, { label: 'Minimum', value: stats.minimum }, { label: 'Maksimum', value: stats.maximum }] as statistic (statistic.label)}
					<div class="border-surface-overlay px-1 not-first:border-l not-first:pl-3 sm:px-3">
						<dt class="table-head-cell">{statistic.label}</dt>
						<dd class="metric-value mt-0.5 text-sm text-text-strong">
							{formatNumber(statistic.value, 2)}<span class="metric-unit ml-1"
								>{displayUnit(headline.unit) ?? ''}</span
							>
						</dd>
					</div>
				{/each}
			</dl>
		{:else if chart.series.length > 0}
			<div class="mt-3 overflow-x-auto border-t border-surface-overlay">
				<table class="w-full min-w-[520px] border-collapse text-left">
					<thead>
						<tr class="border-b border-surface-overlay">
							<th class="table-head-cell py-2 pr-3">Deret</th>
							<th class="table-head-cell px-2 py-2 text-right">Terkini</th>
							<th class="table-head-cell px-2 py-2 text-right">Rata-rata</th>
							<th class="table-head-cell px-2 py-2 text-right">Min</th>
							<th class="table-head-cell py-2 pl-2 text-right">Maks</th>
						</tr>
					</thead>
					<tbody>
						{#each chart.series as view (view.id)}
							<tr class="border-b border-surface-overlay last:border-b-0">
								<th scope="row" class="py-2 pr-3 text-left font-normal">
									<span class="flex items-center gap-2 text-xs text-text-secondary">
										<span
											class={`h-0.5 w-4 shrink-0 rounded-full ${view.isStep ? 'opacity-70' : ''}`}
											style:background-color={view.color}
										></span>
										{view.name}
										{#if view.axis === 'right'}<span class="text-text-muted">(kanan)</span>{/if}
										{#if view.isStep}<span class="text-text-muted">· rencana harian</span>{/if}
									</span>
								</th>
								{#if view.stats}
									<td
										class="metric-value px-2 py-2 text-right text-xs text-text-primary"
										title={formatDayMonthTimeWIB(view.stats.latest.time)}
									>
										{formatNumber(view.stats.latest.value, 2)}{unitLabel(view.unit)}
									</td>
									<td class="metric-value px-2 py-2 text-right text-xs text-text-secondary">
										{formatNumber(view.stats.average, 2)}
									</td>
									<td class="metric-value px-2 py-2 text-right text-xs text-text-secondary">
										{formatNumber(view.stats.minimum, 2)}
									</td>
									<td class="metric-value py-2 pl-2 text-right text-xs text-text-secondary">
										{formatNumber(view.stats.maximum, 2)}
									</td>
								{:else}
									<td colspan="4" class="py-2 pl-2 text-right text-xs text-text-muted">
										Belum ada data
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if references.length > 0}
			<!--
				Batas tertulis dengan jaraknya ke nilai terkini, termasuk yang terlalu
				jauh untuk digambar tanpa meratakan garis datanya.
			-->
			<ul class="mt-3 flex flex-col gap-1.5 border-t border-surface-overlay pt-3">
				{#each references as reference (reference.key)}
					<li class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
						<span
							aria-hidden="true"
							class="w-4 shrink-0 border-t-[1.5px] border-dashed border-status-warning-strong"
						></span>
						<span class="text-text-secondary">{reference.label}</span>
						<span class="metric-value text-text-primary">
							{formatNumber(reference.value, 2)}{unitLabel(reference.unit)}
						</span>
						{#if reference.distanceFromLatest !== null}
							<span class="text-text-muted">· {describeDistance(reference)}</span>
						{/if}
						{#if !reference.isOnChart}
							<span class="text-text-muted">· di luar rentang grafik</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if chart.series.some((view) => view.isTruncated)}
			<p class="mt-2 text-xs text-status-warning-strong">
				Sebagian deret dipotong pada batas 5.000 titik — perkecil rentang untuk melihat semuanya.
			</p>
		{/if}
	</div>
</article>
