<script lang="ts">
	import Badge from '$components/controls/Badge.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import {
		createMonthlyHydrologyOverviewQuery,
		getHydrologyErrorMessage,
		type MonthlyHydrologyOverview
	} from '$features/hydrology';
	import { formatNumber } from '$shared/utils/number';
	import { isFleetAchieved, missingPlantCount } from './model';

	interface Props {
		year: number;
		/** `undefined` = sepanjang tahun. */
		month: number | undefined;
		periodLabel: string;
		/** Jumlah PLTA terdaftar, untuk menunjukkan cakupan ringkasan. `null` bila belum dimuat. */
		registeredPlantCount: number | null;
	}

	/**
	 * Ringkasan armada dari `GET /hydrology/monthly/overview`.
	 *
	 * Angka utamanya **pencapaian agregat** (total prediksi ÷ total target) —
	 * menurut backend itulah angka armada sesungguhnya. Rata-rata antar-PLTA
	 * tetap ditampilkan, tapi sebagai pembanding: ia memberi bobot sama pada PLTA
	 * 1 MW dan 179 MW. Setiap rata-rata membawa jumlah baris yang ikut dihitung,
	 * karena rata-rata atas 2 dari 13 PLTA tidak boleh terbaca sebagai angka
	 * armada.
	 */
	let { year, month, periodLabel, registeredPlantCount }: Props = $props();

	const overviewQuery = createMonthlyHydrologyOverviewQuery(() => ({ year, month }));
	const overview = $derived(overviewQuery.data);

	const AVERAGE_ROWS: {
		key: keyof MonthlyHydrologyOverview['averages'];
		label: string;
	}[] = [
		{ key: 'predictedProductionMwh', label: 'Prediksi produksi' },
		{ key: 'targetProductionMwh', label: 'Target produksi' },
		{ key: 'previousAchievementMwh', label: 'Pencapaian s.d. bulan sebelumnya' },
		{ key: 'predictedPreviousAchievementMwh', label: 'Prediksi pencapaian' },
		{ key: 'targetPreviousAchievementMwh', label: 'Target pencapaian' }
	];

	const fleetAchieved = $derived(overview ? isFleetAchieved(overview) : null);
	const plantsWithoutData = $derived(
		overview ? missingPlantCount(overview, registeredPlantCount) : 0
	);

	function formatPercent(value: number | null): string {
		return value === null ? '—' : `${formatNumber(value, 2)}%`;
	}
</script>

<section>
	<h2 class="section-title">Ringkasan armada</h2>
	<p class="mt-1 text-xs text-text-muted">{periodLabel} · seluruh PLTA</p>

	{#if overviewQuery.isLoading}
		<div role="status" aria-label="Memuat ringkasan armada" class="mt-3.5">
			<div class="grid grid-cols-2 border-y border-surface-overlay lg:grid-cols-4">
				{#each Array.from({ length: 4 }, (_, index) => index) as index (index)}
					<div class="px-3 py-3.5 sm:px-4">
						<div class="skeleton-shimmer h-2.5 w-20 rounded"></div>
						<div class="skeleton-shimmer mt-2.5 h-6 w-24 max-w-full rounded"></div>
						<div class="skeleton-shimmer mt-2 h-2.5 w-28 max-w-full rounded"></div>
					</div>
				{/each}
			</div>
			<span class="sr-only">Memuat ringkasan armada...</span>
		</div>
	{:else if overviewQuery.isError}
		<ErrorState
			title="Ringkasan armada belum bisa dimuat"
			description={getHydrologyErrorMessage(overviewQuery.error)}
			isRetrying={overviewQuery.isFetching}
			onRetry={() => void overviewQuery.refetch()}
			class="mt-3.5"
		/>
	{:else if overview && overview.rowCount === 0}
		<EmptyState
			title={`Belum ada data hidrologi bulanan untuk ${periodLabel}`}
			description="Isi lewat Upload › Excel Bulanan untuk seluruh PLTA sekaligus, atau lewat Input data di Hidrologi Bulanan per PLTA."
			class="mt-3.5"
		/>
	{:else if overview}
		{#if plantsWithoutData > 0 || overview.unassessedCount > 0}
			<Banner tone="warning" title="Ringkasan belum mencakup seluruh armada" class="mt-3.5">
				{#if plantsWithoutData > 0}
					{plantsWithoutData} dari {registeredPlantCount} PLTA belum punya data periode ini.
				{/if}
				{#if overview.unassessedCount > 0}
					{overview.unassessedCount} baris belum bisa dinilai karena prediksi atau targetnya kosong —
					tidak dihitung sebagai "tidak tercapai" dan tidak ikut angka armada.
				{/if}
			</Banner>
		{/if}

		<div class="mt-3.5 grid grid-cols-2 border-y border-surface-overlay lg:grid-cols-4">
			<div class="px-3 py-3.5 sm:px-4">
				<p class="table-head-cell">Pencapaian armada</p>
				<p class="mt-1 flex flex-wrap items-center gap-2">
					<span class="metric-value text-2xl font-semibold text-text-strong">
						{formatPercent(overview.aggregateAchievementPercent)}
					</span>
					{#if fleetAchieved !== null}
						<Badge tone={fleetAchieved ? 'green' : 'amber'}>
							{fleetAchieved ? 'Tercapai' : 'Belum tercapai'}
						</Badge>
					{/if}
				</p>
				<p class="mt-1 text-xs text-text-muted">
					{formatNumber(overview.totalPredictedAchievementMwh, 0)} dari
					{formatNumber(overview.totalTargetAchievementMwh, 0)} MWh target
				</p>
			</div>

			<div class="border-l border-surface-overlay px-3 py-3.5 sm:px-4">
				<p class="table-head-cell">Rata-rata antar-PLTA</p>
				<p class="metric-value mt-1 text-2xl font-semibold text-text-strong">
					{formatPercent(overview.averageAchievementPercent.value)}
				</p>
				<p class="mt-1 text-xs text-text-muted">
					Bobot sama tiap PLTA · {overview.averageAchievementPercent.count} baris
				</p>
			</div>

			<div class="border-surface-overlay px-3 py-3.5 max-lg:border-t sm:px-4 lg:border-l">
				<p class="table-head-cell">Status per baris</p>
				<div class="mt-2 flex flex-wrap items-center gap-1.5">
					<Badge tone="green">{overview.achievedCount} tercapai</Badge>
					<Badge tone="amber">{overview.notAchievedCount} tidak tercapai</Badge>
					{#if overview.unassessedCount > 0}
						<Badge tone="slate">{overview.unassessedCount} belum dinilai</Badge>
					{/if}
				</div>
			</div>

			<div class="border-l border-surface-overlay px-3 py-3.5 max-lg:border-t sm:px-4">
				<p class="table-head-cell">Cakupan</p>
				<p class="metric-value mt-1 text-2xl font-semibold text-text-strong">
					{overview.plantCount}{#if registeredPlantCount !== null}<span
							class="text-sm font-medium text-text-muted">/{registeredPlantCount}</span
						>{/if}
					<span class="text-sm font-medium text-text-muted">PLTA</span>
				</p>
				<p class="mt-1 text-xs text-text-muted">
					{overview.rowCount} baris data{month === undefined ? ' sepanjang tahun' : ''}
				</p>
			</div>
		</div>

		<div class="mt-5 overflow-x-auto">
			<table class="w-full min-w-[420px] border-collapse text-left">
				<caption class="sr-only">Rata-rata energi per PLTA pada {periodLabel}</caption>
				<thead>
					<tr class="bg-surface-overlay">
						<th class="table-head-cell px-3 py-2">Rata-rata per PLTA</th>
						<th class="table-head-cell px-3 py-2 text-right">MWh</th>
						<th class="table-head-cell w-28 px-3 py-2 text-right">Dihitung dari</th>
					</tr>
				</thead>
				<tbody>
					{#each AVERAGE_ROWS as row (row.key)}
						{@const average = overview.averages[row.key]}
						<tr class="border-b border-border-subtle">
							<td class="px-3 py-2.5 text-sm text-text-secondary">{row.label}</td>
							<td class="metric-value px-3 py-2.5 text-right text-sm text-text-primary">
								{formatNumber(average.value, 2)}
							</td>
							<td class="px-3 py-2.5 text-right text-xs text-text-muted">{average.count} baris</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
