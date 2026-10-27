<script lang="ts">
	import type { Snippet } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import IconCaretDown from '~icons/ph/caret-down';
	import IconDownload from '~icons/ph/download-simple';
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
	import { formatTimeWIB } from '$shared/lib/date';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import PlantTrendChartCard from './PlantTrendChartCard.svelte';
	import {
		buildTrendChart,
		trendReferenceKeys,
		withTrendReferences,
		type TrendChartOption
	} from './plant-trend';
	import type { TimeRange } from './trend-data';

	interface Props {
		pltaId: string;
		plantCode: string;
		range: TimeRange & { resolution: TrendResolution };
		/** Seluruh grafik daftar tren, urut admin. */
		options: TrendChartOption[];
		selected: TrendChartOption;
		/** Pemilih periode dari halaman, dirender sebaris dengan pemilih grafik. */
		filters?: Snippet;
		/** Selang penyegaran otomatis; `false` = tidak menyegarkan sendiri. */
		refreshMs?: number | false;
		onChartChange: (value: string) => void;
	}

	/**
	 * SATU grafik daftar tren yang dipilih (17 Okt 2026; dulu seluruh grafik
	 * bertumpuk). Pilihannya per grafik admin, jadi item segrup tetap tampil
	 * bersama, dan hanya item grafik itu yang diminta (`?item=`). Pembanding
	 * periode dihapus 27 Okt 2026 atas keputusan rapat tim.
	 */
	let {
		pltaId,
		plantCode,
		range,
		options,
		selected,
		filters,
		refreshMs = false,
		onChartChange
	}: Props = $props();

	const itemIds = $derived(selected.chart.itemIds);

	const dataQuery = createPlantTrendDataQuery(
		() => ({
			pltaId,
			from: range.from,
			to: range.to,
			resolution: range.resolution,
			itemIds
		}),
		() => true,
		() => refreshMs
	);
	const updatedAt = $derived(
		dataQuery.dataUpdatedAt > 0
			? formatTimeWIB(new Date(dataQuery.dataUpdatedAt).toISOString())
			: null
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
					new Map(dataQuery.data.items.map((item) => [item.id, item]))
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
	<!--
		Satu toolbar: apa yang dilihat (grafik), rentangnya (periode),
		lalu alat sekunder di kanan. Excel dan CSV satu menu — dulu dua tombol
		setara dengan pemilih grafik.
	-->
	<div class="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-4">
		<div class="w-full sm:w-64">
			<Select
				ariaLabel="Grafik tren"
				value={selected.value}
				disabled={options.length < 2}
				onValueChange={onChartChange}
				controlSize="sm"
				options={options.map((option) => ({ value: option.value, label: option.label }))}
			/>
		</div>
		{@render filters?.()}

		<div class="flex w-full items-center justify-between gap-3 sm:ml-auto sm:w-auto">
			{#if updatedAt}
				<span class="text-xs text-text-muted" aria-live="polite">
					{dataQuery.isFetching ? 'Memperbarui…' : `Diperbarui ${updatedAt} WIB`}
				</span>
			{/if}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					disabled={downloading !== null || !dataQuery.isSuccess}
					class="btn btn-ghost btn-sm h-9"
				>
					<IconDownload class="size-3.5" aria-hidden="true" />
					{downloading ? 'Menyiapkan…' : 'Unduh'}
					<IconCaretDown class="size-3 text-text-muted" aria-hidden="true" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content
						align="end"
						sideOffset={6}
						class="z-200 w-60 rounded-xl border border-border-subtle bg-surface-raised p-1 shadow-overlay outline-none"
					>
						<p class="px-3 pt-2 pb-1.5 text-xs text-text-muted">
							Berisi seluruh daftar tren, {describeResolution(range.resolution)}.
						</p>
						{#each [{ format: 'xlsx' as const, label: 'Excel (.xlsx)' }, { format: 'csv' as const, label: 'CSV (.csv)' }] as option (option.format)}
							<DropdownMenu.Item
								onSelect={() => void download(option.format)}
								class="flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary outline-none data-highlighted:bg-surface-overlay data-highlighted:text-text-primary"
							>
								{option.label}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
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
		{#if referenced}
			<PlantTrendChartCard chart={referenced.chart} references={referenced.references} />
		{/if}
	{/if}
</div>
