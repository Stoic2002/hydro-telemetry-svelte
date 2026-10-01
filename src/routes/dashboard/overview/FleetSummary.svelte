<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Popover } from 'bits-ui';
	import IconArrowRight from '~icons/ph/arrow-right';
	import IconCaretDown from '~icons/ph/caret-down';

	import Badge from '$components/controls/Badge.svelte';
	import Select from '$components/controls/Select.svelte';
	import {
		createMonthlyHydrologyOverviewQuery,
		getHydrologyErrorMessage,
		type MonthlyHydrologyOverview
	} from '$features/hydrology';
	import { formatNumber } from '$shared/utils/number';
	import {
		ALL_MONTHS,
		isFleetAchieved,
		missingPlantCount,
		parseReportMonth,
		parseReportYear,
		reportPeriodLabel
	} from '../hydrology-report';
	import { MONTHS } from '../plta/[pltaId]/telemetering/presentation';

	interface Props {
		/** Jumlah PLTA terdaftar, untuk menunjukkan cakupan ringkasan. `null` bila belum dimuat. */
		registeredPlantCount: number | null;
	}

	/**
	 * Ringkasan armada dari `GET /hydrology/monthly/overview` — dulu bagian atas
	 * Telemetering › Rekap Hidrologi, kini satu baris di kepala halaman Overview.
	 *
	 * Satu baris, bukan kolom di samping peta: kolom 300px membuat gambar peta
	 * 15–20% lebih kecil, sedangkan kepala halaman punya ruang mendatar yang
	 * kosong. Angka utama tetap terlihat; tabel rata-rata dan pemilih periode ada
	 * di balik "Detail", satu klik jauhnya.
	 *
	 * Angka utamanya **pencapaian agregat** (total prediksi ÷ total target) —
	 * menurut backend itulah angka armada sesungguhnya. Rata-rata antar-PLTA
	 * tetap ditampilkan, tapi sebagai pembanding: ia memberi bobot sama pada PLTA
	 * 1 MW dan 179 MW. Setiap rata-rata membawa jumlah baris yang ikut dihitung,
	 * karena rata-rata atas 2 dari 13 PLTA tidak boleh terbaca sebagai angka
	 * armada.
	 */
	let { registeredPlantCount }: Props = $props();

	const CURRENT_YEAR = new Date().getFullYear();
	const MONTH_OPTIONS = [
		{ value: ALL_MONTHS, label: 'Sepanjang tahun' },
		...MONTHS.map((label, index) => ({ value: String(index + 1), label }))
	];
	const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR + 1 - index).map(
		(value) => ({ value: String(value), label: String(value) })
	);

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

	const year = $derived(parseReportYear(page.url.searchParams.get('tahun'), CURRENT_YEAR));
	/** `undefined` = sepanjang tahun. Tanpa `?bulan=` sama sekali, bulan berjalan. */
	const month = $derived(
		parseReportMonth(page.url.searchParams.get('bulan'), new Date().getMonth() + 1)
	);
	const periodLabel = $derived(reportPeriodLabel(year, month));

	const overviewQuery = createMonthlyHydrologyOverviewQuery(() => ({ year, month }));
	const overview = $derived(overviewQuery.data);

	const fleetAchieved = $derived(overview ? isFleetAchieved(overview) : null);
	const plantsWithoutData = $derived(
		overview ? missingPlantCount(overview, registeredPlantCount) : 0
	);
	const needsAttention = $derived(
		Boolean(overview && (plantsWithoutData > 0 || overview.unassessedCount > 0))
	);

	/** Laporan Excel periode yang sama, di tab Laporan Hidrologi. */
	const reportHref = $derived(
		`/dashboard/laporan?tab=hidrologi&tahun=${year}&bulan=${month ?? ALL_MONTHS}`
	);

	function formatPercent(value: number | null): string {
		return value === null ? '—' : `${formatNumber(value, 2)}%`;
	}

	function setPeriod(key: 'tahun' | 'bulan', value: string) {
		// Salinan sekali pakai untuk menyusun URL berikutnya; dibuang setelah
		// `goto`, jadi tidak perlu `SvelteURLSearchParams`.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.searchParams);
		params.set(key, value);
		void goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

{#snippet divider()}
	<span class="hidden h-4 w-px shrink-0 bg-border-subtle sm:block" aria-hidden="true"></span>
{/snippet}

<section
	aria-label={`Ringkasan armada ${periodLabel}`}
	class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border-subtle bg-surface-raised px-3.5 py-2"
>
	<span class="flex items-baseline gap-1.5 text-xs whitespace-nowrap">
		<span class="font-medium text-text-secondary">Ringkasan armada</span>
		<span class="text-text-muted">· {periodLabel}</span>
	</span>
	{@render divider()}

	{#if overviewQuery.isLoading}
		<span role="status" class="flex items-center gap-2">
			<span class="skeleton-shimmer h-4 w-48 rounded"></span>
			<span class="sr-only">Memuat ringkasan armada...</span>
		</span>
	{:else if overviewQuery.isError}
		<span role="alert" class="flex items-center gap-2 text-xs text-status-danger-strong">
			Ringkasan belum bisa dimuat
			<button
				type="button"
				onclick={() => void overviewQuery.refetch()}
				disabled={overviewQuery.isFetching}
				class="cursor-pointer font-medium underline underline-offset-2"
			>
				{overviewQuery.isFetching ? 'Mencoba lagi…' : 'Coba lagi'}
			</button>
		</span>
	{:else if overview && overview.rowCount === 0}
		<span class="text-xs text-text-muted">Belum ada data hidrologi bulanan</span>
	{:else if overview}
		<span class="flex items-center gap-2" title="Total prediksi ÷ total target seluruh PLTA">
			<span class="sr-only">Pencapaian armada</span>
			<span class="metric-value text-base font-semibold text-text-strong">
				{formatPercent(overview.aggregateAchievementPercent)}
			</span>
			{#if fleetAchieved !== null}
				<Badge tone={fleetAchieved ? 'green' : 'amber'}>
					{fleetAchieved ? 'Tercapai' : 'Belum tercapai'}
				</Badge>
			{/if}
		</span>
		{@render divider()}
		<span class="text-xs whitespace-nowrap text-text-muted">
			Rata-rata
			<span class="metric-value font-medium text-text-primary">
				{formatPercent(overview.averageAchievementPercent.value)}
			</span>
		</span>
		{@render divider()}
		<span class="flex items-center gap-1.5">
			<Badge tone="green">{overview.achievedCount} tercapai</Badge>
			<Badge tone="amber">{overview.notAchievedCount} tidak</Badge>
		</span>
		{@render divider()}
		<span class="text-xs whitespace-nowrap text-text-muted">
			<span class="metric-value font-medium text-text-primary">
				{overview.plantCount}{#if registeredPlantCount !== null}/{registeredPlantCount}{/if}
			</span>
			PLTA
		</span>
	{/if}

	<Popover.Root>
		<Popover.Trigger
			class="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-primary-strong transition-colors outline-none hover:bg-surface-overlay focus-visible:ring-2 focus-visible:ring-brand-primary-strong/40 data-[state=open]:bg-surface-overlay"
		>
			Detail
			{#if needsAttention}
				<!-- Peringatan cakupan ada di dalam; titik ini yang memberi tahu. -->
				<span class="size-1.5 rounded-full bg-status-warning-strong" aria-hidden="true"></span>
				<span class="sr-only">(ada peringatan cakupan)</span>
			{/if}
			<IconCaretDown class="size-3" aria-hidden="true" />
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content
				side="bottom"
				align="end"
				sideOffset={8}
				class="z-100 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-border-subtle bg-surface-raised p-4 shadow-overlay outline-none"
			>
				<p class="card-title">Ringkasan armada</p>
				<p class="mt-0.5 text-xs text-text-muted">Hidrologi bulanan seluruh PLTA</p>

				<div class="mt-3 grid grid-cols-[1fr_96px] gap-2">
					<Select
						ariaLabel="Bulan ringkasan"
						value={month ? String(month) : ALL_MONTHS}
						onValueChange={(value) => setPeriod('bulan', value)}
						options={MONTH_OPTIONS}
						controlSize="sm"
					/>
					<Select
						ariaLabel="Tahun ringkasan"
						value={String(year)}
						onValueChange={(value) => setPeriod('tahun', value)}
						options={YEAR_OPTIONS}
						controlSize="sm"
					/>
				</div>

				{#if overview && overview.rowCount > 0}
					<p class="mt-3 text-xs leading-relaxed text-text-muted">
						<span class="font-medium text-text-secondary">Pencapaian armada</span>
						{formatNumber(overview.totalPredictedAchievementMwh, 0)} dari
						{formatNumber(overview.totalTargetAchievementMwh, 0)} MWh target.
						<span class="font-medium text-text-secondary">Rata-rata antar-PLTA</span>
						memberi bobot sama pada setiap PLTA ({overview.averageAchievementPercent.count} baris).
					</p>

					{#if needsAttention}
						<p
							class="mt-3 rounded-lg bg-status-warning-soft px-2.5 py-2 text-xs leading-relaxed text-status-warning-strong"
						>
							{#if plantsWithoutData > 0}
								{plantsWithoutData} dari {registeredPlantCount} PLTA belum punya data periode ini.
							{/if}
							{#if overview.unassessedCount > 0}
								{overview.unassessedCount} baris belum bisa dinilai karena prediksi atau targetnya kosong
								— tidak dihitung "tidak tercapai" dan tidak ikut angka armada.
							{/if}
						</p>
					{/if}

					<table class="mt-3 w-full border-collapse text-left">
						<caption class="sr-only">Rata-rata energi per PLTA pada {periodLabel}</caption>
						<thead>
							<tr class="border-b border-border-subtle">
								<th class="table-head-cell py-1.5">Rata-rata per PLTA</th>
								<th class="table-head-cell py-1.5 text-right">MWh</th>
								<th class="table-head-cell py-1.5 text-right">Baris</th>
							</tr>
						</thead>
						<tbody>
							{#each AVERAGE_ROWS as row (row.key)}
								{@const average = overview.averages[row.key]}
								<tr class="border-b border-surface-overlay last:border-b-0">
									<td class="py-1.5 text-xs text-text-secondary">{row.label}</td>
									<td class="metric-value py-1.5 text-right text-xs text-text-primary">
										{formatNumber(average.value, 2)}
									</td>
									<td class="py-1.5 text-right text-xs text-text-muted">{average.count}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else if overview}
					<p class="mt-3 text-xs leading-relaxed text-text-muted">
						Belum ada data untuk {periodLabel}. Isi lewat Upload › Excel Bulanan untuk seluruh PLTA
						sekaligus, atau lewat Input data di Hidrologi Bulanan per PLTA.
					</p>
				{:else if overviewQuery.isError}
					<p class="mt-3 text-xs text-status-danger-strong">
						{getHydrologyErrorMessage(overviewQuery.error)}
					</p>
				{/if}

				<a
					href={reportHref}
					class="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3 text-xs font-medium text-brand-primary-strong hover:underline"
				>
					Unduh laporan Excel {periodLabel}
					<IconArrowRight class="size-3.5 shrink-0" aria-hidden="true" />
				</a>
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
</section>
