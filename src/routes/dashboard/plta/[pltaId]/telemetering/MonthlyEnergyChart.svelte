<script lang="ts">
	import { scaleBand } from 'd3-scale';
	import { Axis, Bars, Chart, Highlight, Points, Spline, Svg, Tooltip } from 'layerchart';

	import InfoTip from '$components/ui/InfoTip.svelte';
	import { axisMapping, chartValueDomain, valueAxisTicks } from '$shared/utils/chart';
	import { formatNumber } from '$shared/utils/number';
	import {
		ENERGY_SERIES,
		hasEnergyValue,
		type EnergyMonth,
		type EnergySeriesKey,
		type EnergyValues
	} from './energy-chart';

	/**
	 * Energi bulanan dan akumulasinya dalam SATU grafik (permintaan tim 9 Nov
	 * 2026): batang = energi bulan itu (sumbu kiri), garis = akumulasi Januari
	 * s.d. bulan itu (sumbu kanan). Akumulasi Desember kira-kira dua belas kali
	 * energi sebulan, jadi satu sumbu untuk keduanya membuat batang tinggal
	 * sejengkal di dasar grafik.
	 *
	 * Kedua sumbu berangkat dari nol: tinggi batang adalah besarnya, dan garis
	 * akumulasi pun memang tumbuh dari nol di awal tahun. Seri yang belum diisi
	 * **tidak diberi batang** dan **memutus garis** — bukan bernilai nol.
	 */
	let { months }: { months: EnergyMonth[] } = $props();

	/** Gaya garis akumulasi. Warnanya sama dengan batang serinya, tetapi pekat. */
	const LINE_CLASS: Record<EnergySeriesKey, string> = {
		target: 'stroke-[2] [stroke-dasharray:6_4]',
		prediction: 'stroke-[2]',
		actual: 'stroke-[2.5]'
	};

	const hasAnyValue = $derived(
		hasEnergyValue(months, 'monthly') || hasEnergyValue(months, 'accumulated')
	);

	function maximum(scope: 'monthly' | 'accumulated'): number {
		const values = months.flatMap((month) =>
			ENERGY_SERIES.map((series) => month[scope][series.key]).filter(
				(value): value is number => value !== null
			)
		);
		return chartValueDomain(values)[1];
	}

	const leftDomain = $derived<[number, number]>([0, maximum('monthly')]);
	const rightDomain = $derived<[number, number]>([0, maximum('accumulated')]);
	const mapping = $derived(axisMapping(leftDomain, rightDomain));
	const rightAxis = $derived(valueAxisTicks(rightDomain));
	const rightTicksInLeftSpace = $derived(rightAxis.ticks.map((tick) => mapping.toLeft(tick)));

	/** `Bars` tidak mengenal `defined`, jadi tiap seri hanya diberi bulan yang terisi. */
	const series = $derived(
		ENERGY_SERIES.map((item) => ({
			...item,
			lineClass: LINE_CLASS[item.key],
			bars: months.filter((month) => month.monthly[item.key] !== null),
			points: months.filter((month) => month.accumulated[item.key] !== null)
		}))
	);

	function accumulatedInLeftSpace(month: EnergyMonth, key: EnergySeriesKey): number | null {
		const value = month.accumulated[key];
		return value === null ? null : mapping.toLeft(value);
	}
</script>

{#snippet valueRows(values: EnergyValues)}
	{#each ENERGY_SERIES as item (item.key)}
		{@const value = values[item.key]}
		<div class="flex items-baseline justify-between gap-4">
			<dt class="text-text-on-inverse-muted">{item.label}</dt>
			<dd class="font-mono text-sm text-text-on-inverse tabular-nums">
				{value === null ? 'belum diisi' : `${formatNumber(value, 1)} MWh`}
			</dd>
		</div>
	{/each}
{/snippet}

{#if !hasAnyValue}
	<div
		class="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-base/40 px-4 text-center text-xs text-text-muted"
	>
		Belum ada energi pada tahun ini.
	</div>
{:else}
	<div
		role="img"
		aria-label="Grafik energi bulanan (batang) dan akumulasi (garis): target, prediksi, dan realisasi"
	>
		<div class="h-[300px] w-full">
			<Chart
				data={months}
				x="shortLabel"
				y={(month: EnergyMonth) => month.monthly.actual}
				xScale={scaleBand().padding(0.24)}
				x1={() => 'target'}
				x1Scale={scaleBand().paddingInner(0.1)}
				x1Domain={ENERGY_SERIES.map((item) => item.key)}
				x1Range={({ xScale }) => [0, xScale.bandwidth()]}
				yDomain={leftDomain}
				padding={{ top: 14, right: 62, bottom: 28, left: 62 }}
				tooltipContext={{ mode: 'band' }}
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
						placement="right"
						rule={false}
						ticks={rightTicksInLeftSpace}
						format={(value: number) =>
							formatNumber(mapping.toRight(value), rightAxis.fractionDigits)}
						classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
					/>
					<Axis
						placement="bottom"
						rule={false}
						classes={{ tickLabel: 'fill-chart-axis text-[11px]' }}
					/>

					{#each series as item (item.key)}
						<Bars
							data={item.bars}
							y={(month: EnergyMonth) => month.monthly[item.key]}
							x1={() => item.key}
							radius={2}
							rounded="top"
							fill={item.color}
							class="opacity-50"
						/>
					{/each}

					<!-- Garis di atas seluruh batang, supaya tidak tertutup batang bulan berikutnya. -->
					{#each series as item (item.key)}
						<Spline
							y={(month: EnergyMonth) => accumulatedInLeftSpace(month, item.key)}
							defined={(month: EnergyMonth) => month.accumulated[item.key] !== null}
							stroke={item.color}
							class={item.lineClass}
						/>
						<Points
							data={item.points}
							y={(month: EnergyMonth) => accumulatedInLeftSpace(month, item.key)}
							r={item.key === 'actual' ? 3.5 : 3}
							fill={item.color}
							class="stroke-surface-raised"
						/>
					{/each}

					<Highlight area />
				</Svg>

				<Tooltip.Root variant="none" classes={{ container: 'chart-tooltip' }}>
					{#snippet children({ data: hovered })}
						{@const month = hovered as EnergyMonth}
						<div class="min-w-48">
							<p class="text-xs font-medium text-text-on-inverse">{month.label}</p>
							<p class="mt-2 text-[11px] text-text-on-inverse-muted">Bulan ini</p>
							<dl class="mt-1 flex flex-col gap-1 text-xs">
								{@render valueRows(month.monthly)}
							</dl>
							<p class="mt-2 text-[11px] text-text-on-inverse-muted">
								Akumulasi Januari s.d. {month.label}
							</p>
							<dl class="mt-1 flex flex-col gap-1 text-xs">
								{@render valueRows(month.accumulated)}
							</dl>
						</div>
					{/snippet}
				</Tooltip.Root>
			</Chart>
		</div>

		<div
			class="mt-2 flex flex-col gap-2 border-t border-surface-overlay pt-3 text-xs text-text-muted lg:flex-row lg:items-center lg:justify-between"
		>
			<div class="flex flex-col gap-1.5 sm:flex-row sm:gap-6">
				<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<span class="font-medium text-text-secondary">Bulanan · sumbu kiri</span>
					{#each series as item (item.key)}
						<span class="flex items-center gap-1.5">
							<span class="size-2.5 rounded-sm opacity-60" style:background-color={item.color}
							></span>
							{item.label}
						</span>
					{/each}
				</span>
				<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<span class="font-medium text-text-secondary">Akumulasi · sumbu kanan</span>
					{#each series as item (item.key)}
						<span class="flex items-center gap-1.5">
							{#if item.key === 'target'}
								<span class="w-4 border-t-2 border-dashed" style:border-color={item.color}></span>
							{:else}
								<span class="h-0.5 w-4 rounded-full" style:background-color={item.color}></span>
							{/if}
							{item.label}
						</span>
					{/each}
				</span>
			</div>
			<span class="flex items-center gap-1.5">
				Satuan MWh
				<InfoTip
					label="Keterangan grafik energi"
					text="Batang = energi bulan itu. Garis = akumulasi Januari s.d. bulan itu. Bulan yang belum diisi tidak diberi batang dan memutus garis, supaya tidak terbaca sebagai produksi nol."
				/>
			</span>
		</div>
	</div>
{/if}
