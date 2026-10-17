<script lang="ts">
	import Select from '$components/controls/Select.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import { createPLTATagsQuery } from '$features/plta';
	import { createTrendQuery, type TrendResolution } from '$features/trends';
	import TrendCard, { type TrendComparisonView } from './TrendCard.svelte';
	import type { TimeRange } from './comparison';

	interface Props {
		pltaId: string;
		range: TimeRange & { resolution: TrendResolution };
		/** `null` = tanpa pembanding. */
		comparison: { range: TimeRange; offsetMs: number; label: string; currentLabel: string } | null;
		/** Parameter terpilih dari URL (`?parameter=`). */
		parameter: string | null;
		onParameterChange: (value: string) => void;
	}

	/**
	 * Grafik satu parameter dari daftar tag PLTA — tampilan Tren & Grafik sebelum
	 * ada daftar tren per PLTA. Dipertahankan sebagai cadangan untuk PLTA yang
	 * daftarnya belum diatur admin (`diatur: false`), supaya halamannya tidak
	 * kosong.
	 */
	let { pltaId, range, comparison, parameter, onParameterChange }: Props = $props();

	const TREND_COLORS = [
		'var(--color-chart-series-1)',
		'var(--color-chart-series-2)',
		'var(--color-chart-series-3)',
		'var(--color-chart-series-4)',
		'var(--color-chart-series-5)',
		'var(--color-chart-series-6)'
	];

	function formatParameterLabel(value: string): string {
		return value
			.replaceAll('_', ' ')
			.replace(/\b\w/g, (character) => character.toLocaleUpperCase('id-ID'));
	}

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
		parameterOptions.find((item) => item.value === parameter) ??
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

	const trendQuery = createTrendQuery(() => ({
		pltaId,
		parameter: parameterConfig.value,
		...range,
		aggregation: parameterConfig.aggregation
	}));

	// Parameter, resolusi, dan agregasi sama persis dengan periode ini; hanya
	// rentangnya yang digeser. Tanpa itu kedua garis tidak sebanding.
	const comparisonQuery = createTrendQuery(
		() => ({
			pltaId,
			parameter: parameterConfig.value,
			from: comparison?.range.from ?? '',
			to: comparison?.range.to ?? '',
			resolution: range.resolution,
			aggregation: parameterConfig.aggregation
		}),
		() => comparison !== null
	);

	const comparisonView = $derived<TrendComparisonView | null>(
		comparison
			? {
					label: comparison.label,
					currentLabel: comparison.currentLabel,
					offsetMs: comparison.offsetMs,
					series: comparisonQuery.data,
					isLoading: comparisonQuery.isLoading,
					isError: comparisonQuery.isError,
					onRetry: () => void comparisonQuery.refetch()
				}
			: null
	);

	const isWaitingForTags = $derived(tagsQuery.isLoading || tagsQuery.isPlaceholderData);
	const hasNoParameters = $derived(
		!isWaitingForTags && !tagsQuery.isError && parameterOptions.length === 0
	);
</script>

<div class="flex flex-col gap-4">
	<div class="w-full sm:w-60">
		<Select
			ariaLabel="Parameter grafik"
			value={parameterConfig.value}
			disabled={isWaitingForTags || parameterOptions.length === 0}
			onValueChange={onParameterChange}
			controlSize="sm"
			options={parameterOptions.map((item) => ({ value: item.value, label: item.label }))}
		/>
	</div>

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
			comparison={comparisonView}
			onRetry={() => {
				if (tagsQuery.isError) void tagsQuery.refetch();
				if (trendQuery.isError) void trendQuery.refetch();
			}}
		/>
	{/if}
</div>
