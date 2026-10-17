<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import {
		createPlantTrendDataQuery,
		describeResolution,
		getTrendErrorMessage,
		trendsRepository,
		type TrendExportFormat,
		type TrendResolution
	} from '$features/trends';
	import { createDailyHydrologyQuery } from '$features/hydrology';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import PlantTrendChartCard from './PlantTrendChartCard.svelte';
	import {
		buildTrendChart,
		trendReferenceKeys,
		withTrendReferences,
		type TrendChartOption
	} from './plant-trend';
	import type { TimeRange } from './comparison';

	interface Props {
		pltaId: string;
		plantCode: string;
		range: TimeRange & { resolution: TrendResolution };
		/** Rentang periode pembanding (sudah digeser); `null` = tanpa pembanding. */
		comparison: { range: TimeRange; offsetMs: number; label: string } | null;
		/** Seluruh grafik daftar tren, urut admin. */
		options: TrendChartOption[];
		selected: TrendChartOption;
		onChartChange: (value: string) => void;
	}

	/**
	 * SATU grafik daftar tren yang dipilih (17 Okt 2026; dulu seluruh grafik
	 * bertumpuk). Pilihannya per grafik admin, jadi item segrup tetap tampil
	 * bersama, dan hanya item grafik itu yang diminta (`?item=`). Periode
	 * pembanding = panggilan kedua dengan rentang digeser; item dan resolusinya
	 * sama persis.
	 */
	let { pltaId, plantCode, range, comparison, options, selected, onChartChange }: Props = $props();

	const itemIds = $derived(selected.chart.itemIds);

	const dataQuery = createPlantTrendDataQuery(() => ({
		pltaId,
		from: range.from,
		to: range.to,
		resolution: range.resolution,
		itemIds
	}));
	const comparisonQuery = createPlantTrendDataQuery(
		() => ({
			pltaId,
			from: comparison?.range.from ?? '',
			to: comparison?.range.to ?? '',
			resolution: range.resolution,
			itemIds
		}),
		() => comparison !== null
	);

	/**
	 * Batas TMA (Limpas, MOL, maks. hilir) dari panel Hidrologi Harian hari ini.
	 * Hanya diminta bila grafik terpilih memuat metrik yang punya batas.
	 */
	const selectedItemKeys = $derived(
		(dataQuery.data?.items ?? [])
			.filter((item) => itemIds.includes(item.id))
			.map((item) => item.key)
	);
	const needsReferences = $derived(trendReferenceKeys(selectedItemKeys).length > 0);
	const dailyQuery = createDailyHydrologyQuery(() => (needsReferences ? pltaId : ''));

	function referenceSource(key: string) {
		const daily = dailyQuery.data?.daily;
		if (!daily) return null;
		const metric = daily.upstream[key] ?? daily.dam[key] ?? daily.downstream[key];
		return metric ? { label: metric.label, value: metric.value, unit: metric.unit } : null;
	}

	const baseChart = $derived(
		dataQuery.data
			? buildTrendChart(
					selected.chart,
					new Map(dataQuery.data.items.map((item) => [item.id, item])),
					comparison && comparisonQuery.data
						? {
								itemsById: new Map(comparisonQuery.data.items.map((item) => [item.id, item])),
								offsetMs: comparison.offsetMs
							}
						: undefined
				)
			: null
	);
	const referenced = $derived(baseChart ? withTrendReferences(baseChart, referenceSource) : null);

	let downloading = $state<TrendExportFormat | null>(null);

	async function download(format: TrendExportFormat) {
		downloading = format;
		try {
			// Tanpa `itemIds`: unduhan dipakai sebagai laporan, jadi isinya seluruh
			// daftar tren, bukan hanya grafik yang sedang tampil.
			const blob = await trendsRepository.downloadPlantTrendData(
				{ pltaId, from: range.from, to: range.to, resolution: range.resolution },
				format
			);
			downloadBlob(blob, `tren-${plantCode}-${range.from.slice(0, 10)}.${format}`);
		} catch (error) {
			// Server menolak (400) bila melebihi 100.000 titik/baris — tidak
			// pernah memotong diam-diam; pesannya menyarankan rentang lebih kecil.
			notificationStore.addToast({ type: 'error', message: getTrendErrorMessage(error) });
		} finally {
			downloading = null;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-2">
		<div class="w-full sm:w-72">
			<Select
				ariaLabel="Grafik tren"
				value={selected.value}
				disabled={options.length < 2}
				onValueChange={onChartChange}
				controlSize="sm"
				options={options.map((option) => ({ value: option.value, label: option.label }))}
			/>
		</div>
		<span class="text-xs text-text-muted sm:ml-auto">
			Unduhan berisi seluruh daftar tren, {describeResolution(range.resolution)}
		</span>
		{#each [{ format: 'xlsx' as const, label: 'Unduh Excel' }, { format: 'csv' as const, label: 'Unduh CSV' }] as option (option.format)}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={downloading !== null || !dataQuery.isSuccess}
				onclick={() => void download(option.format)}
			>
				{#snippet leftIcon()}<IconDownload class="size-3.5" />{/snippet}
				{downloading === option.format ? 'Menyiapkan…' : option.label}
			</Button>
		{/each}
	</div>

	{#if dataQuery.isLoading}
		<div role="status" aria-label="Memuat grafik tren" class="flex flex-col gap-4">
			<div class="skeleton-shimmer h-[380px] rounded-xl"></div>
			<span class="sr-only">Memuat grafik tren...</span>
		</div>
	{:else if dataQuery.isError}
		<ErrorState
			title="Data tren belum bisa dimuat"
			description={getTrendErrorMessage(dataQuery.error)}
			onRetry={() => void dataQuery.refetch()}
		/>
	{:else}
		{#if comparison && comparisonQuery.isError}
			<p class="text-xs text-status-warning-strong">
				Periode pembanding gagal dimuat.
				<button
					type="button"
					onclick={() => void comparisonQuery.refetch()}
					class="cursor-pointer font-medium underline underline-offset-2">Coba lagi</button
				>
			</p>
		{/if}
		{#if referenced}
			<PlantTrendChartCard
				chart={referenced.chart}
				references={referenced.references}
				comparisonLabel={comparison?.label ?? null}
			/>
		{/if}
	{/if}
</div>
