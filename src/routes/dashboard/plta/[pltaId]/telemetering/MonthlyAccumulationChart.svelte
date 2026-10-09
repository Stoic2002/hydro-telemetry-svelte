<script lang="ts">
	import { scaleTime } from 'd3-scale';
	import { Axis, Chart, Highlight, Points, Spline, Svg, Tooltip } from 'layerchart';

	import ErrorState from '$components/ui/ErrorState.svelte';
	import type { MonthlyAccumulationChart } from '$features/hydrology';
	import { chartValueDomain } from '$shared/utils/chart';
	import { formatNumber } from '$shared/utils/number';
	import { MONTHS } from './presentation';

	interface Props {
		chart?: MonthlyAccumulationChart;
		isLoading: boolean;
		isError: boolean;
		onRetry: () => void;
	}

	/**
	 * Target vs realisasi akumulasi produksi per bulan. Setiap bulan dalam
	 * rentang ada di sumbu X; bulan yang belum diisi bernilai `null`, jadi garis
	 * **terputus** di sana alih-alih turun ke nol atau disambung seakan ada
	 * data. Bulan yang berdiri sendiri tetap terlihat lewat penanda titik.
	 */
	let { chart, isLoading, isError, onRetry }: Props = $props();

	interface Datum {
		date: Date;
		label: string;
		/** Teks server `s.d. Bulan Maret 2026`: nilainya posisi Januari s.d. bulan itu. */
		through: string | null;
		target: number | null;
		actual: number | null;
	}

	const points = $derived(chart?.points ?? []);
	const spansYears = $derived(new Set(points.map((point) => point.year)).size > 1);

	function monthLabel(year: number, month: number): string {
		const short = MONTHS[month - 1].slice(0, 3);
		return spansYears ? `${short} ${String(year).slice(-2)}` : short;
	}

	const data = $derived<Datum[]>(
		points.map((point) => ({
			date: new Date(point.year, point.month - 1, 1),
			label: `${MONTHS[point.month - 1]} ${point.year}`,
			through: point.throughLabel,
			target: point.targetMwh,
			actual: point.actualMwh
		}))
	);
	const targetData = $derived(data.filter((datum) => datum.target !== null));
	const actualData = $derived(data.filter((datum) => datum.actual !== null));
	const hasAnyValue = $derived(targetData.length > 0 || actualData.length > 0);

	const yDomain = $derived(
		chartValueDomain(
			data.flatMap((datum) => [datum.target, datum.actual]).filter((value) => value !== null)
		)
	);
	const ticks = $derived(data.map((datum) => datum.date));

	// Perbandingan target–realisasi baru adil bila PLTA penyumbang kedua seri
	// sama banyak. Pada grafik satu PLTA nilainya 0 atau 1, jadi tidak pernah
	// memicu ini; disiapkan untuk grafik gabungan.
	const isIncomplete = $derived(
		points.some(
			(point) =>
				point.targetMwh !== null &&
				point.actualMwh !== null &&
				point.targetPlantCount !== point.actualPlantCount
		)
	);
</script>

{#if isLoading}
	<div role="status" aria-label="Memuat grafik akumulasi">
		<div class="skeleton-shimmer h-[260px] rounded-xl"></div>
		<span class="sr-only">Memuat grafik akumulasi...</span>
	</div>
{:else if isError}
	<ErrorState
		title="Grafik akumulasi belum bisa dimuat"
		description="Sambungan ke server terputus sebentar."
		{onRetry}
	/>
{:else if !hasAnyValue}
	<div
		class="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-base/40 px-4 text-center text-xs text-text-muted"
	>
		Belum ada target maupun realisasi akumulasi pada periode ini.
	</div>
{:else}
	<div
		role="img"
		aria-label="Grafik target dan realisasi akumulasi produksi energi listrik per bulan"
	>
		<div class="h-[260px] w-full">
			<Chart
				{data}
				x="date"
				y="actual"
				xScale={scaleTime()}
				{yDomain}
				padding={{ top: 14, right: 18, bottom: 28, left: 62 }}
				tooltipContext={{ mode: 'bisect-x' }}
			>
				<Svg>
					<Axis
						placement="left"
						rule={false}
						grid={{ class: 'stroke-chart-grid' }}
						format={(value: number) => formatNumber(value, 0)}
						classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
					/>
					<Axis
						placement="bottom"
						rule={false}
						{ticks}
						format={(value: Date) => monthLabel(value.getFullYear(), value.getMonth() + 1)}
						classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
					/>

					<!-- Target: garis putus-putus abu-abu, sebagai acuan. -->
					<Spline
						y={(datum: Datum) => datum.target}
						defined={(datum: Datum) => datum.target !== null}
						class="stroke-chart-axis stroke-[2] [stroke-dasharray:6_4]"
					/>
					<Points
						data={targetData}
						y={(datum: Datum) => datum.target}
						r={3}
						class="fill-chart-axis stroke-surface-raised"
					/>

					<!-- Realisasi: garis utama. -->
					<Spline
						y={(datum: Datum) => datum.actual}
						defined={(datum: Datum) => datum.actual !== null}
						class="stroke-[3]"
						stroke="var(--color-brand-primary-strong)"
					/>
					<Points
						data={actualData}
						y={(datum: Datum) => datum.actual}
						r={3.5}
						fill="var(--color-brand-primary-strong)"
						class="stroke-surface-raised"
					/>

					<!--
						Titik sorot di KEDUA garis. Tanpa `y` sendiri, Highlight memakai `y`
						milik Chart (realisasi saja). Sisi yang `null` tidak diberi titik:
						d3-scale memetakan `null` ke `undefined`, lalu layerchart melewatinya.
					-->
					<Highlight points lines y={(datum: Datum) => [datum.target, datum.actual]} />
				</Svg>

				<Tooltip.Root variant="none" classes={{ container: 'chart-tooltip' }}>
					{#snippet children({ data: hovered })}
						{@const datum = hovered as Datum}
						<div class="min-w-44">
							<p class="text-xs font-medium text-text-on-inverse">{datum.label}</p>
							{#if datum.through}
								<p class="mt-0.5 text-[11px] text-text-on-inverse-muted">
									Akumulasi {datum.through}
								</p>
							{/if}
							<dl class="mt-2 flex flex-col gap-1 text-xs">
								<div class="flex items-baseline justify-between gap-4">
									<dt class="text-text-on-inverse-muted">Target</dt>
									<dd class="font-mono text-sm text-text-on-inverse tabular-nums">
										{datum.target === null ? 'belum diisi' : `${formatNumber(datum.target, 1)} MWh`}
									</dd>
								</div>
								<div class="flex items-baseline justify-between gap-4">
									<dt class="text-text-on-inverse-muted">Realisasi</dt>
									<dd class="font-mono text-sm text-text-on-inverse tabular-nums">
										{datum.actual === null ? 'belum diisi' : `${formatNumber(datum.actual, 1)} MWh`}
									</dd>
								</div>
							</dl>
						</div>
					{/snippet}
				</Tooltip.Root>
			</Chart>
		</div>

		<div
			class="mt-2 flex flex-col gap-1 border-t border-surface-overlay pt-3 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between"
		>
			<span class="flex flex-wrap items-center gap-x-4 gap-y-1">
				<span class="flex items-center gap-1.5">
					<span class="w-4 border-t-2 border-dashed border-chart-axis"></span>
					Target akumulasi
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-0.5 w-4 rounded-full bg-brand-primary-strong"></span>
					Realisasi akumulasi
				</span>
			</span>
			<span>Bulan yang belum diisi memutus garis.</span>
		</div>
		{#if isIncomplete}
			<p class="mt-1.5 text-xs text-status-warning-strong">
				Jumlah PLTA penyumbang target dan realisasi tidak sama pada sebagian bulan — bandingkan
				dengan hati-hati.
			</p>
		{/if}
	</div>
{/if}
