<script lang="ts">
	import { scaleTime } from 'd3-scale';
	import { Area, Axis, Chart, Highlight, Spline, Svg, Tooltip } from 'layerchart';
	import IconCalendar from '~icons/ph/calendar-blank';

	import Badge from '$components/atoms/Badge.svelte';
	import SegmentedControl from '$components/atoms/SegmentedControl.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import {
		FORECASTING_PLTA_ID,
		FORECASTING_PLTA_NAME,
		createForecastQuery,
		type ForecastHorizon,
		type ForecastParameter
	} from '$features/forecasting';
	import { createTrendQuery } from '$features/trends';
	import { formatDayMonthWIB, formatDayMonthYearTimeWIB, formatTimeWIB } from '$shared/lib/date';
	import { chartValueDomain } from '$shared/utils/chart';
	import { formatNumber } from '$shared/utils/number';

	interface ForecastChartDatum {
		time: Date;
		iso: string;
		actual?: number;
		forecast?: number;
		p10?: number;
		p90?: number;
	}

	const PARAMETER_OPTIONS: { value: ForecastParameter; label: string }[] = [
		{ value: 'inflow', label: 'Inflow' },
		{ value: 'water_level', label: 'TMA Waduk' }
	];

	const HORIZON_OPTIONS: { value: ForecastHorizon; label: string }[] = [
		{ value: 24, label: '24 Jam' },
		{ value: 168, label: '7 Hari' }
	];

	const pltaId = FORECASTING_PLTA_ID;

	let parameter = $state<ForecastParameter>('inflow');
	let horizon = $state<ForecastHorizon>(24);

	const forecastQuery = createForecastQuery(() => ({ pltaId, parameter, horizon }));

	// Rentang aktual dihitung mundur dari sekarang sepanjang horizon prediksi,
	// sehingga garis aktual dan garis prediksi bertemu di titik "sekarang".
	const actualRange = $derived.by(() => {
		const to = new Date();
		const from = new Date(to.getTime() - horizon * 60 * 60 * 1_000);
		return { from: from.toISOString(), to: to.toISOString() };
	});

	const actualQuery = createTrendQuery(() => ({
		pltaId,
		parameter,
		...actualRange,
		resolution: '1h',
		aggregation: 'avg'
	}));

	const series = $derived(forecastQuery.data);
	const points = $derived(series?.points ?? []);

	function normalizeUnit(unit: string | null | undefined): string {
		if (!unit) return '';
		return unit.replace('m3/', 'm³/');
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '—';
		return formatDayMonthYearTimeWIB(value);
	}

	function errorMessage(error: unknown): string {
		if (error instanceof Error && error.message.trim()) return error.message;
		return 'Data Forecasting belum dapat dimuat.';
	}

	const unit = $derived(normalizeUnit(series?.unit));

	const peakPoint = $derived(
		points.reduce((peak, point) => (!peak || point.value > peak.value ? point : peak), points[0])
	);
	const minimumPoint = $derived(
		points.reduce(
			(minimum, point) => (!minimum || point.value < minimum.value ? point : minimum),
			points[0]
		)
	);
	const average = $derived(
		points.length > 0
			? points.reduce((total, point) => total + point.value, 0) / points.length
			: null
	);

	const chartData = $derived.by(() => {
		const merged: Record<string, ForecastChartDatum> = {};

		for (const point of actualQuery.data?.points ?? []) {
			merged[point.time] = { time: new Date(point.time), iso: point.time, actual: point.value };
		}

		for (const point of series?.points ?? []) {
			const current = (merged[point.time] ??= {
				time: new Date(point.time),
				iso: point.time
			});
			current.forecast = point.value;
			if (point.valueP10 !== null && point.valueP90 !== null) {
				current.p10 = point.valueP10;
				current.p90 = point.valueP90;
			}
		}

		return Object.values(merged).sort((left, right) => left.time.getTime() - right.time.getTime());
	});

	/**
	 * Pita keyakinan P10–P90 digambar satu `Area` dengan `y0`/`y1`. Versi Recharts
	 * harus menumpuk dua area (`bandBase` transparan + `bandRange`) karena tidak
	 * mengenal area dengan dasar bergerak; di sini triknya tidak diperlukan.
	 */
	const bandData = $derived(
		chartData.filter(
			(datum): datum is ForecastChartDatum & { p10: number; p90: number } =>
				datum.p10 !== undefined && datum.p90 !== undefined
		)
	);

	const yDomain = $derived(
		chartValueDomain(
			chartData.flatMap((datum) =>
				[datum.actual, datum.forecast, datum.p10, datum.p90].filter(
					(value): value is number => typeof value === 'number'
				)
			)
		)
	);

	const hasBand = $derived(bandData.length > 0);
	const parameterLabel = $derived(
		PARAMETER_OPTIONS.find((item) => item.value === parameter)?.label ?? ''
	);
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		title="Forecasting"
		description={`Prediksi ML terbaru untuk PLTA ${FORECASTING_PLTA_NAME}`}
	>
		{#snippet actions()}
			<span
				class="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border-subtle bg-surface-raised px-3 text-sm font-medium text-text-primary"
			>
				<IconCalendar class="size-4 shrink-0 text-text-muted" />
				PLTA {FORECASTING_PLTA_NAME}
			</span>
		{/snippet}
	</PageHeader>

	<section
		class="flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:gap-6"
	>
		<div class="flex items-center gap-2.5">
			<span class="table-head-cell">Parameter</span>
			<SegmentedControl
				ariaLabel="Parameter forecasting"
				value={parameter}
				onChange={(next) => (parameter = next)}
				options={PARAMETER_OPTIONS}
			/>
		</div>
		<span class="hidden h-5 w-px bg-border-subtle sm:block"></span>
		<div class="flex items-center gap-2.5">
			<span class="table-head-cell">Horizon</span>
			<SegmentedControl
				ariaLabel="Horizon forecasting"
				value={horizon}
				onChange={(next) => (horizon = next)}
				options={HORIZON_OPTIONS}
			/>
		</div>
	</section>

	{#if forecastQuery.isLoading}
		<p class="loading-text py-10 text-center" role="status">Memuat prediksi…</p>
	{:else if forecastQuery.isError}
		<section class="rounded-xl border border-border-subtle bg-surface-raised">
			<ErrorState
				title="Prediksi belum bisa dimuat"
				description={errorMessage(forecastQuery.error)}
				isRetrying={forecastQuery.isFetching}
				onRetry={() => void forecastQuery.refetch()}
			/>
		</section>
	{:else}
		{#if (actualQuery.data?.discardedPoints ?? 0) > 0}
			<Banner tone="warning" title="Sebagian pembacaan aktual tidak wajar">
				{actualQuery.data?.discardedPoints} pembacaan bernilai jauh di luar batas wajar dan tidak ikut
				digambar. Garis prediksi dan pembacaan lain tetap ditampilkan apa adanya.
			</Banner>
		{/if}

		{#if series?.accuracy && !series.accuracy.isPresentable}
			<Banner tone="warning" title="Akurasi model belum layak jadi acuan tunggal">
				Gunakan bersama data aktual dan pertimbangan operator.
			</Banner>
		{/if}

		<div
			class="grid grid-cols-1 divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-raised sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"
		>
			{#each [{ label: 'Prediksi awal', value: points[0] ? formatNumber(points[0].value, 2) : 'N/A', detail: points[0] ? formatDateTime(points[0].time) : 'Belum ada data' }, { label: 'Prediksi maksimum', value: peakPoint ? formatNumber(peakPoint.value, 2) : 'N/A', detail: peakPoint ? formatDateTime(peakPoint.time) : 'Belum ada data' }, { label: 'Prediksi minimum', value: minimumPoint ? formatNumber(minimumPoint.value, 2) : 'N/A', detail: minimumPoint ? formatDateTime(minimumPoint.time) : 'Belum ada data' }, { label: 'Rata-rata', value: average === null ? 'N/A' : formatNumber(average, 2), detail: `${points.length} titik · horizon ${horizon} jam` }] as item (item.label)}
				<div class="p-4">
					<p class="table-head-cell">{item.label}</p>
					<p class="metric-value mt-1.5 text-xl font-semibold">
						{item.value}{#if item.value !== 'N/A'}<span class="metric-unit ml-1">{unit}</span>{/if}
					</p>
					<p class="mt-1 text-xs text-text-muted">{item.detail}</p>
				</div>
			{/each}
		</div>

		<section class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
			<div
				class="flex flex-col justify-between gap-3 border-b border-surface-overlay px-5 py-4 sm:flex-row sm:items-start"
			>
				<div>
					<h2 class="section-title">{series?.label ?? parameterLabel}</h2>
					<p class="mt-1 text-xs text-text-muted">
						Aktual historis dan prediksi P50 dari model terbaru.
					</p>
				</div>
				<div class="text-left text-xs text-text-muted sm:text-right">
					<p class="font-medium">{series?.modelName}</p>
					<p class="mt-1">Dibuat {formatDateTime(series?.generatedAt)}</p>
				</div>
			</div>

			<div class="px-2 pt-5 pb-3 sm:px-5">
				<div class="h-[360px] w-full">
					<Chart
						data={chartData}
						x="time"
						y="forecast"
						xScale={scaleTime()}
						{yDomain}
						padding={{ top: 12, right: 18, bottom: 28, left: 58 }}
						tooltipContext={{ mode: 'bisect-x' }}
					>
						<Svg>
							<Axis
								placement="left"
								rule={false}
								grid={{ class: 'stroke-chart-grid' }}
								format={(value: number) => formatNumber(value, Math.abs(value) >= 100 ? 0 : 1)}
								classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
							/>
							<Axis
								placement="bottom"
								rule={false}
								format={(value: Date) =>
									horizon === 24
										? formatTimeWIB(value.toISOString())
										: formatDayMonthWIB(value.toISOString())}
								classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
							/>

							{#if hasBand}
								<Area
									data={bandData}
									y0={(datum: ForecastChartDatum) => datum.p10}
									y1={(datum: ForecastChartDatum) => datum.p90}
									fill="var(--color-brand-primary)"
									fillOpacity={0.22}
								/>
							{/if}

							<Spline
								y={(datum: ForecastChartDatum) => datum.actual}
								defined={(datum: ForecastChartDatum) => datum.actual !== undefined}
								class="stroke-chart-axis stroke-[2.25]"
							/>
							<Spline
								y={(datum: ForecastChartDatum) => datum.forecast}
								defined={(datum: ForecastChartDatum) => datum.forecast !== undefined}
								class="stroke-chart-series-1 stroke-[2.75]"
							/>

							<Highlight points lines />
						</Svg>

						<Tooltip.Root>
							{#snippet children({ data })}
								{@const datum = data as ForecastChartDatum}
								<div class="min-w-48">
									<p class="text-xs font-medium text-text-on-inverse">
										{formatDateTime(datum.iso)}
									</p>
									<div class="mt-2 space-y-1.5">
										{#each [{ label: 'Aktual', value: datum.actual }, { label: 'Prediksi P50', value: datum.forecast }, { label: 'P10', value: datum.p10 }, { label: 'P90', value: datum.p90 }].filter((item) => item.value !== undefined) as item (item.label)}
											<div class="flex items-center justify-between gap-5 text-xs">
												<span class="text-text-on-inverse-muted">{item.label}</span>
												<span class="font-mono font-medium text-text-on-inverse tabular-nums">
													{formatNumber(item.value ?? 0, 2)}
													{unit}
												</span>
											</div>
										{/each}
									</div>
								</div>
							{/snippet}
						</Tooltip.Root>
					</Chart>
				</div>

				<div
					class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-surface-overlay px-2 pt-3 text-xs text-text-muted"
				>
					<span class="inline-flex items-center gap-1.5">
						<span class="h-0.5 w-4 bg-chart-axis"></span>Aktual
					</span>
					<span class="inline-flex items-center gap-1.5">
						<span class="h-0.5 w-4 bg-chart-series-1"></span>Prediksi P50
					</span>
					{#if hasBand}
						<span class="inline-flex items-center gap-1.5">
							<span class="size-3 bg-brand-primary/25"></span>Rentang P10–P90
						</span>
					{/if}
				</div>
			</div>
		</section>

		<div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
			<section>
				<h2 class="card-title">Kelayakan Prediksi</h2>
				<div class="mt-2.5 divide-y divide-surface-overlay border-t border-border-subtle text-sm">
					<div class="flex items-center justify-between gap-4 py-2.5">
						<span class="text-sm text-text-secondary">Status</span>
						<Badge tone={series?.accuracy?.isPresentable ? 'green' : 'amber'}>
							{series?.accuracy?.isPresentable ? 'Layak' : 'Layak dengan catatan'}
						</Badge>
					</div>
					<div class="flex items-center justify-between gap-4 py-2.5">
						<span class="text-sm text-text-secondary">Skill score</span>
						<span class="metric-value text-sm">
							{series?.accuracy?.skill === null || series?.accuracy?.skill === undefined
								? 'N/A'
								: formatNumber(series.accuracy.skill, 2)}
						</span>
					</div>
					<div class="flex items-center justify-between gap-4 py-2.5">
						<span class="text-sm text-text-secondary">Sampel</span>
						<span class="metric-value text-sm">{series?.accuracy?.sampleCount ?? 0} titik</span>
					</div>
					<div class="flex items-center justify-between gap-4 py-2.5">
						<span class="text-sm text-text-secondary">Jendela data</span>
						<span class="metric-value text-sm">{series?.accuracy?.windowDays ?? 0} hari</span>
					</div>
				</div>
			</section>

			<section class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
				<div class="max-h-[222px] overflow-auto">
					<table class="w-full min-w-[480px] border-collapse text-left">
						<thead class="sticky top-0 z-10 bg-surface-overlay">
							<tr>
								<th class="table-head-cell px-3.5 py-2">Waktu</th>
								<th class="table-head-cell px-3.5 py-2">P50</th>
								<th class="table-head-cell px-3.5 py-2">P10</th>
								<th class="table-head-cell px-3.5 py-2">P90</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-overlay">
							{#each points as point (point.time)}
								<tr class="font-mono text-xs text-text-secondary hover:bg-surface-base/70">
									<td class="px-3.5 py-2">{formatDateTime(point.time)}</td>
									<td class="px-3.5 py-2 font-medium text-text-primary">
										{formatNumber(point.value, 2)}
									</td>
									<td class="px-3.5 py-2 text-text-muted">
										{point.valueP10 === null ? '—' : formatNumber(point.valueP10, 2)}
									</td>
									<td class="px-3.5 py-2 text-text-muted">
										{point.valueP90 === null ? '—' : formatNumber(point.valueP90, 2)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	{/if}
</div>
