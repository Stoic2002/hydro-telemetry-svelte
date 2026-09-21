<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import SegmentedControl from '$components/controls/SegmentedControl.svelte';
	import Select from '$components/controls/Select.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { createPLTATagsQuery, getActivePLTA } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import { alignTrendRange, createTrendQuery, type TrendResolution } from '$features/trends';
	import TrendCard from './TrendCard.svelte';

	const TREND_PERIODS = ['24 Jam Terakhir', '7 Hari Terakhir', '30 Hari Terakhir'] as const;
	type TrendPeriod = (typeof TREND_PERIODS)[number];

	const TREND_COLORS = [
		'var(--color-chart-series-1)',
		'var(--color-chart-series-2)',
		'var(--color-chart-series-3)',
		'var(--color-chart-series-4)',
		'var(--color-chart-series-5)',
		'var(--color-chart-series-6)'
	];

	function isTrendPeriod(value: string | null): value is TrendPeriod {
		return TREND_PERIODS.some((period) => period === value);
	}

	function formatParameterLabel(parameter: string): string {
		return parameter
			.replaceAll('_', ' ')
			.replace(/\b\w/g, (character) => character.toLocaleUpperCase('id-ID'));
	}

	function periodConfig(period: TrendPeriod): { durationMs: number; resolution: TrendResolution } {
		if (period === '24 Jam Terakhir') return { durationMs: 24 * 60 * 60 * 1_000, resolution: '1h' };
		if (period === '7 Hari Terakhir') {
			return { durationMs: 7 * 24 * 60 * 60 * 1_000, resolution: '1h' };
		}
		return { durationMs: 30 * 24 * 60 * 60 * 1_000, resolution: '1d' };
	}

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTA = $derived(getActivePLTA());
	const displayName = $derived(activePLTA.displayName);
	const pltaId = $derived(activePLTA.pltaId);

	/** Filter disimpan di URL supaya tautan ke grafik tertentu bisa dibagikan. */
	const period = $derived.by(() => {
		const value = page.url.searchParams.get('period');
		return isTrendPeriod(value) ? value : TREND_PERIODS[0];
	});
	const parameterParam = $derived(page.url.searchParams.get('parameter'));

	const tagsQuery = createPLTATagsQuery(
		() => pltaId,
		() => ({ page: 1, limit: 200, enabled: true })
	);

	const parameterOptions = $derived.by(() => {
		if (tagsQuery.isPlaceholderData) return [];

		const grouped: Record<
			string,
			{ value: string; label: string; unit: string; stations: string[] }
		> = {};

		for (const tag of tagsQuery.data?.items ?? []) {
			const value = tag.parameter.trim();
			if (!value) continue;

			const existing = (grouped[value] ??= {
				value,
				label: formatParameterLabel(value),
				unit: tag.unit.trim(),
				stations: []
			});
			if (!existing.unit && tag.unit.trim()) existing.unit = tag.unit.trim();
			const station = tag.station.trim();
			if (station && !existing.stations.includes(station)) existing.stations.push(station);
		}

		return Object.values(grouped)
			.sort((left, right) => left.label.localeCompare(right.label, 'id-ID'))
			.map((option, index) => {
				// Curah hujan dan outflow total adalah besaran terakumulasi, jadi
				// diagregasi dengan jumlah — bukan rata-rata seperti parameter lain.
				const isRainfall = option.value.includes('rainfall');
				const isAccumulated = isRainfall || option.value === 'total_outflow';

				return {
					...option,
					subtitle:
						option.stations.length > 0
							? `${option.stations.length} stasiun aktif`
							: 'Tag aktif PLTA',
					color: TREND_COLORS[index % TREND_COLORS.length],
					aggregation: isAccumulated ? ('sum' as const) : ('avg' as const),
					chartType: isRainfall ? ('bar' as const) : ('line' as const)
				};
			});
	});

	const parameterConfig = $derived(
		parameterOptions.find((item) => item.value === parameterParam) ??
			parameterOptions[0] ?? {
				value: '',
				label: 'Parameter',
				subtitle: 'Menunggu tag aktif PLTA',
				unit: '',
				stations: [] as string[],
				color: TREND_COLORS[0],
				aggregation: 'avg' as const,
				chartType: 'line' as const
			}
	);

	const timeRange = $derived.by(() => {
		const config = periodConfig(period);
		return {
			...alignTrendRange(new Date(), config.durationMs, config.resolution),
			resolution: config.resolution
		};
	});

	const trendQuery = createTrendQuery(() => ({
		pltaId,
		parameter: parameterConfig.value,
		...timeRange,
		aggregation: parameterConfig.aggregation
	}));

	const isWaitingForTags = $derived(tagsQuery.isLoading || tagsQuery.isPlaceholderData);
	const hasNoParameters = $derived(
		!isWaitingForTags && !tagsQuery.isError && parameterOptions.length === 0
	);

	async function setFilter(key: 'parameter' | 'period', value: string) {
		// Salinan sekali pakai untuk menyusun URL berikutnya; dibuang setelah
		// `goto`, jadi tidak perlu `SvelteURLSearchParams`.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.searchParams);
		params.set(key, value);
		await goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		title="Tren & Grafik"
		description={`Pilih satu parameter untuk melihat tren data PLTA ${displayName}`}
	>
		{#snippet actions()}
			<PlantSwitcher page="trends" />
		{/snippet}
	</PageHeader>

	<section
		class="flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:gap-4"
	>
		<Select
			ariaLabel="Parameter grafik"
			value={parameterConfig.value}
			disabled={isWaitingForTags || parameterOptions.length === 0}
			onValueChange={(value) => void setFilter('parameter', value)}
			controlSize="sm"
			class="w-full sm:w-60"
			options={parameterOptions.map((item) => ({ value: item.value, label: item.label }))}
		/>
		<SegmentedControl
			ariaLabel="Periode tren"
			value={period}
			onChange={(value) => void setFilter('period', value)}
			options={TREND_PERIODS.map((item) => ({ value: item, label: item }))}
		/>
		<span class="text-xs text-text-muted sm:ml-auto">Filter tersimpan di URL</span>
	</section>

	{#if hasNoParameters}
		<EmptyState
			title="Belum ada parameter"
			description="PLTA ini belum punya tag aktif yang bisa ditampilkan sebagai grafik."
		/>
	{:else}
		<TrendCard
			title={parameterConfig.label}
			subtitle={parameterConfig.subtitle}
			unit={parameterConfig.unit}
			color={parameterConfig.color}
			chartType={parameterConfig.chartType}
			series={trendQuery.data}
			isLoading={isWaitingForTags || trendQuery.isLoading}
			isError={tagsQuery.isError || trendQuery.isError}
			onRetry={() => {
				if (tagsQuery.isError) void tagsQuery.refetch();
				if (trendQuery.isError) void trendQuery.refetch();
			}}
		/>
	{/if}
</div>
