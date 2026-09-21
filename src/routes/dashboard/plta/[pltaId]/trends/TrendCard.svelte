<script lang="ts">
	import { scaleTime } from 'd3-scale';
	import {
		Area,
		Axis,
		Bars,
		Chart,
		Highlight,
		LinearGradient,
		Rule,
		Svg,
		Tooltip
	} from 'layerchart';
	import IconArrowDown from '~icons/ph/arrow-down-right';
	import IconArrowUp from '~icons/ph/arrow-up-right';
	import IconMinus from '~icons/ph/minus';

	import Banner from '$components/ui/Banner.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import type { TrendSeries } from '$features/trends';
	import { formatDayMonthTimeWIB, formatDayMonthWIB } from '$shared/lib/date';
	import { chartValueDomain } from '$shared/utils/chart';
	import { formatNumber } from '$shared/utils/number';

	interface Props {
		title: string;
		subtitle: string;
		unit: string;
		color: string;
		chartType?: 'line' | 'bar';
		series?: TrendSeries;
		isLoading: boolean;
		isError: boolean;
		onRetry: () => void;
	}

	let {
		title,
		subtitle,
		unit,
		color,
		chartType = 'line',
		series,
		isLoading,
		isError,
		onRetry
	}: Props = $props();

	interface TrendChartDatum {
		time: Date;
		iso: string;
		value: number;
	}

	const points = $derived(series?.points ?? []);

	const chartData = $derived(
		points.map<TrendChartDatum>((point) => ({
			time: new Date(point.time),
			iso: point.time,
			value: point.value
		}))
	);

	const values = $derived(points.map((point) => point.value));
	const latest = $derived(points.at(-1));
	const first = $derived(points.at(0));

	const averageValue = $derived(
		values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0
	);
	const minimumValue = $derived(values.length > 0 ? Math.min(...values) : 0);
	const maximumValue = $derived(values.length > 0 ? Math.max(...values) : 0);
	const changeValue = $derived(latest && first ? latest.value - first.value : 0);
	const yDomain = $derived(chartValueDomain(values));

	const changeClass = $derived(
		changeValue > 0
			? 'text-status-success-strong'
			: changeValue < 0
				? 'text-status-warning-strong'
				: 'text-text-muted'
	);
</script>

<article class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
	<div class="p-4 sm:p-6">
		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
			<div>
				<h2 class="section-title">{title}</h2>
				<p class="mt-1 text-xs text-text-muted">{subtitle}</p>
			</div>

			<div class="text-left sm:text-right">
				<p class="text-xs font-medium text-text-muted">Nilai terkini</p>
				<p class="mt-0.5 text-xl font-semibold tracking-tight text-text-primary">
					{latest ? formatNumber(latest.value, 2) : 'N/A'}
					<span class="ml-1.5 text-xs font-medium text-text-muted">{unit}</span>
				</p>
				<p class="mt-0.5 text-xs text-text-muted">
					{latest ? formatDayMonthTimeWIB(latest.time) : 'Belum ada data'}
				</p>
			</div>
		</div>

		{#if (series?.discardedPoints ?? 0) > 0}
			<Banner tone="warning" title="Sebagian pembacaan tidak wajar" class="mt-4">
				{series?.discardedPoints} pembacaan bernilai jauh di luar batas wajar dan tidak ikut digambar.
				Statistik di bawah dihitung tanpa pembacaan tersebut.
			</Banner>
		{/if}

		{#if isLoading}
			<!-- Grafik termasuk konten berat, jadi tetap memakai skeleton. -->
			<div role="status" aria-label="Memuat grafik tren" class="mt-5">
				<div class="grid grid-cols-2 border-y border-surface-overlay lg:grid-cols-4">
					{#each Array.from({ length: 4 }, (_, index) => index) as index (index)}
						<div class="px-3 py-3 sm:px-4">
							<div class="skeleton-shimmer h-2.5 w-16 rounded"></div>
							<div class="skeleton-shimmer mt-2 h-4 w-24 max-w-full rounded"></div>
						</div>
					{/each}
				</div>
				<div class="skeleton-shimmer mt-5 h-[330px] rounded-xl"></div>
				<span class="sr-only">Memuat grafik tren...</span>
			</div>
		{:else if isError}
			<ErrorState
				title="Data tren belum bisa dimuat"
				description="Sambungan ke server terputus sebentar."
				{onRetry}
				class="mt-5"
			/>
		{:else if chartData.length === 0}
			<div
				class="mt-5 flex h-[390px] items-center justify-center border-y border-surface-overlay bg-surface-base/40 text-xs text-text-muted"
			>
				Belum ada titik data pada periode ini.
			</div>
		{:else}
			<div class="mt-5 grid grid-cols-2 border-y border-surface-overlay lg:grid-cols-4">
				{#each [{ label: 'Rata-rata', value: averageValue }, { label: 'Minimum', value: minimumValue }, { label: 'Maksimum', value: maximumValue }] as statistic (statistic.label)}
					<div
						class="border-surface-overlay px-3 py-3 even:border-l sm:px-4 lg:border-l lg:first:border-l-0"
					>
						<p class="table-head-cell">{statistic.label}</p>
						<p class="mt-1 text-sm font-semibold text-text-strong sm:text-base">
							{formatNumber(statistic.value, 2)}
							<span class="ml-1 text-xs font-medium text-text-muted">{unit}</span>
						</p>
					</div>
				{/each}

				<div class="border-l border-surface-overlay px-3 py-3 sm:px-4">
					<p class="table-head-cell">Perubahan periode</p>
					<p
						class={`mt-1 flex items-center gap-1 text-sm font-semibold sm:text-base ${changeClass}`}
					>
						{#if changeValue > 0}
							<IconArrowUp class="size-4" aria-hidden="true" />
						{:else if changeValue < 0}
							<IconArrowDown class="size-4" aria-hidden="true" />
						{:else}
							<IconMinus class="size-4" aria-hidden="true" />
						{/if}
						{changeValue > 0 ? '+' : ''}{formatNumber(changeValue, 2)}
						<span class="text-xs font-medium text-text-muted">{unit}</span>
					</p>
				</div>
			</div>

			<div
				class="mt-5 pt-1"
				role="img"
				aria-label={`Grafik ${title} dengan tooltip nilai per waktu`}
			>
				<div class="h-[330px] w-full">
					<Chart
						data={chartData}
						x="time"
						y="value"
						xScale={scaleTime()}
						{yDomain}
						padding={{ top: 18, right: 18, bottom: 30, left: 54 }}
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
								format={(value: Date) => formatDayMonthWIB(value.toISOString())}
								classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
							/>

							{#if chartType === 'bar'}
								<Bars fill={color} fillOpacity={0.82} radius={4} />
							{:else}
								<!--
									Gradien isian dibuat lewat `LinearGradient`, bukan `<defs>` manual
									dengan id yang harus unik per kartu seperti di versi React.
								-->
								<LinearGradient
									stops={[
										[0, `${color}`],
										[1, 'transparent']
									]}
									vertical
								>
									{#snippet children({ gradient })}
										<Area
											fill={gradient}
											fillOpacity={0.3}
											line={{ class: 'stroke-[3]', stroke: color }}
										/>
									{/snippet}
								</LinearGradient>
							{/if}

							<!-- Garis rata-rata periode, sebagai acuan baca cepat. -->
							<Rule y={averageValue} class="stroke-chart-reference [stroke-dasharray:5_5]" />

							<Highlight points lines />
						</Svg>

						<!--
							Varian bawaan layerchart berlatar putih 90% + blur dan mengandalkan token
							`--color-surface-*` miliknya sendiri yang tidak ada di project ini, jadi
							tooltip tampak tembus pandang dan teks terangnya tidak terbaca. Latar
							disetel sendiri dengan token permukaan gelap yang tidak tembus.
						-->
						<Tooltip.Root variant="none" classes={{ container: 'chart-tooltip' }}>
							{#snippet children({ data })}
								{@const datum = data as TrendChartDatum}
								<div class="min-w-44">
									<div class="flex items-center gap-2 text-xs font-medium text-text-on-inverse">
										<span class="size-2 rounded-full" style={`background-color: ${color}`}></span>
										{formatDayMonthTimeWIB(datum.iso)}
									</div>
									<p class="mt-2 font-mono text-lg font-semibold text-text-on-inverse tabular-nums">
										{formatNumber(datum.value, 2)}
										<span class="ml-1.5 text-xs font-medium text-text-on-inverse-muted">
											{unit}
										</span>
									</p>
								</div>
							{/snippet}
						</Tooltip.Root>
					</Chart>
				</div>

				<div
					class="flex flex-col justify-between gap-1 border-t border-surface-overlay pt-3 text-xs text-text-muted sm:flex-row sm:items-center"
				>
					<span>Arahkan kursor ke grafik untuk melihat detail nilai.</span>
					<span>
						{chartData.length.toLocaleString('id-ID')} titik · resolusi {series?.resolution} · agregasi
						lintas stasiun
					</span>
				</div>
			</div>
		{/if}
	</div>
</article>
