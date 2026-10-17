<script lang="ts">
	import IconArrowRight from '~icons/ph/arrow-right';

	import Badge from '$components/controls/Badge.svelte';
	import Select from '$components/controls/Select.svelte';
	import type { MonthlyHydrologyOverview } from '$features/hydrology';
	import { formatNumber } from '$shared/utils/number';
	import {
		NO_RANGE,
		REPORT_END_MONTH_OPTIONS,
		REPORT_END_YEAR_OPTIONS,
		hasReportRange,
		reportPeriodLabel
	} from '../hydrology-report';
	import { createFleetSummary } from './fleet-summary.svelte';

	interface Props {
		/** Jumlah PLTA terdaftar, untuk menunjukkan cakupan ringkasan. `null` bila belum dimuat. */
		registeredPlantCount: number | null;
	}

	/**
	 * Kartu ringkasan seluruh PLTA dari `GET /hydrology/monthly/overview`,
	 * menempel di dasar peta Overview seperti kartu Awan Hujan dan Legenda —
	 * dulu bagian atas Telemetering › Rekap Hidrologi.
	 *
	 * Riwayat penempatan: kolom 300px di samping peta (mengecilkan peta 15–20%),
	 * lalu strip di kanan judul (dinilai kurang terlihat, 7 Okt 2026). Bagian
	 * bawah peta adalah laut di selatan Jawa, jadi kartu di sana tidak menutupi
	 * satu PLTA pun. Pemilih periodenya tetap di kepala halaman
	 * (`FleetSummaryControls`).
	 *
	 * Sejak 13 Okt 2026 kartu ini juga memuat isi "Detail ringkasan" yang dulu
	 * terlipat di kolom kanan peta — rata-rata per PLTA, rentang periode, dan
	 * unduhan Excel — dipadatkan jadi dua baris di kakinya supaya selalu
	 * terlihat tanpa menutupi pantai selatan. Catatan cakupan cukup dari angka
	 * Cakupan dan "belum dinilai" di baris atas.
	 *
	 * Angka utamanya **pencapaian agregat** (total prediksi ÷ total target) —
	 * menurut backend itulah angka gabungan sesungguhnya. Rata-rata antar-PLTA
	 * tetap ditampilkan, tapi sebagai pembanding: ia memberi bobot sama pada PLTA
	 * 1 MW dan 179 MW. Setiap rata-rata membawa jumlah data yang ikut dihitung,
	 * karena rata-rata atas 2 dari 13 PLTA tidak boleh terbaca sebagai angka
	 * gabungan.
	 */
	let { registeredPlantCount }: Props = $props();

	const summary = createFleetSummary(() => registeredPlantCount);
	const overview = $derived(summary.overview);
	const previousMonth = $derived(summary.previousMonth);

	function formatPercent(value: number | null): string {
		return value === null ? '—' : `${formatNumber(value, 2)}%`;
	}

	type AverageKey = keyof MonthlyHydrologyOverview['averages'];

	/** Rata-rata energi per PLTA: Prognosa, Target, Realisasi — untuk bulan dan akumulasinya. */
	const AVERAGE_GROUPS: { label: string; keys: [string, AverageKey][] }[] = [
		{
			label: 'Bulan ini',
			keys: [
				['Prognosa', 'predictedProductionMwh'],
				['Target', 'targetProductionMwh'],
				['Realisasi', 'actualProductionMwh']
			]
		},
		{
			label: 'Akumulasi',
			keys: [
				['Prognosa', 'predictedAccumulatedMwh'],
				['Target', 'targetAccumulatedMwh'],
				['Realisasi', 'actualAccumulatedMwh']
			]
		}
	];
</script>

<section
	aria-label={`Ringkasan seluruh PLTA ${summary.periodLabel}`}
	class="rounded-xl border border-border-subtle bg-surface-raised/95 px-4 py-3 shadow-overlay backdrop-blur-sm"
>
	<p class="text-xs font-medium text-text-secondary">
		Ringkasan hidrologi seluruh PLTA
		<span class="font-normal text-text-muted">
			· {overview && overview.rowCount > 0
				? `Akumulasi s.d. ${summary.accumulatedThrough}`
				: summary.periodLabel}
		</span>
	</p>

	{#if summary.query.isLoading}
		<div role="status" class="mt-2 grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-4">
			{#each Array.from({ length: 4 }, (_, index) => index) as index (index)}
				<div>
					<div class="skeleton-shimmer h-2.5 w-20 rounded"></div>
					<div class="skeleton-shimmer mt-1.5 h-6 w-24 rounded"></div>
				</div>
			{/each}
			<span class="sr-only">Memuat ringkasan seluruh PLTA...</span>
		</div>
	{:else if summary.rangeError}
		<p role="alert" class="mt-1.5 text-sm text-status-warning-strong">
			Rentang periode tidak valid — atur di bawah.
		</p>
	{:else if summary.query.isError}
		<p
			role="alert"
			class="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-status-danger-strong"
		>
			Ringkasan belum bisa dimuat.
			<button
				type="button"
				onclick={() => void summary.query.refetch()}
				disabled={summary.query.isFetching}
				class="cursor-pointer font-medium underline underline-offset-2"
			>
				{summary.query.isFetching ? 'Mencoba lagi…' : 'Coba lagi'}
			</button>
		</p>
	{:else if overview && overview.rowCount === 0}
		<p class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
			Belum ada data hidrologi bulanan {summary.periodLabel}.
			{#if previousMonth}
				<button
					type="button"
					onclick={() =>
						summary.setPeriods({
							tahun: String(previousMonth.year),
							bulan: String(previousMonth.month)
						})}
					class="inline-flex cursor-pointer items-center gap-1 font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
				>
					Lihat {reportPeriodLabel(previousMonth.year, previousMonth.month)}
					<IconArrowRight class="size-3.5" aria-hidden="true" />
				</button>
			{/if}
		</p>
	{:else if overview}
		<dl class="mt-2 grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-[repeat(4,auto)]">
			<div title="Total prediksi ÷ total target seluruh PLTA">
				<dt class="text-[11px] font-medium text-text-muted">Pencapaian seluruh PLTA</dt>
				<dd class="mt-0.5 flex flex-wrap items-center gap-1.5">
					<span class="metric-value text-xl font-semibold text-text-strong">
						{formatPercent(overview.accumulated.aggregatePercent)}
					</span>
					{#if summary.fleetAchieved !== null}
						<Badge tone={summary.fleetAchieved ? 'green' : 'amber'}>
							{summary.fleetAchieved ? 'Tercapai' : 'Belum tercapai'}
						</Badge>
					{/if}
				</dd>
				<dd class="mt-0.5 text-[11px] text-text-muted">
					{formatNumber(overview.accumulated.totalPredictedMwh, 0)} dari
					{formatNumber(overview.accumulated.totalTargetMwh, 0)} MWh target
				</dd>
			</div>
			<div class="md:border-l md:border-border-subtle md:pl-5">
				<dt class="text-[11px] font-medium text-text-muted">Rata-rata antar-PLTA</dt>
				<dd class="metric-value mt-0.5 text-xl font-semibold text-text-strong">
					{formatPercent(overview.accumulated.averagePercent.value)}
				</dd>
				<dd class="mt-0.5 text-[11px] text-text-muted">
					Bobot sama · {overview.accumulated.averagePercent.count} data
				</dd>
			</div>
			<div class="md:border-l md:border-border-subtle md:pl-5">
				<dt class="text-[11px] font-medium text-text-muted">Status per PLTA</dt>
				<dd class="mt-1.5 flex flex-wrap items-center gap-1.5">
					<Badge tone="green">{overview.accumulated.achievedCount} tercapai</Badge>
					<Badge tone="amber">{overview.accumulated.notAchievedCount} tidak</Badge>
				</dd>
				{#if overview.accumulated.unassessedCount > 0}
					<dd class="mt-0.5 text-[11px] text-status-warning-strong">
						{overview.accumulated.unassessedCount} belum dinilai
					</dd>
				{/if}
			</div>
			<div class="md:border-l md:border-border-subtle md:pl-5">
				<dt class="text-[11px] font-medium text-text-muted">Cakupan</dt>
				<dd class="metric-value mt-0.5 text-xl font-semibold text-text-strong">
					{overview.plantCount}{#if registeredPlantCount !== null}<span
							class="text-sm font-medium text-text-muted">/{registeredPlantCount}</span
						>{/if}
					<span class="text-xs font-medium text-text-muted">PLTA</span>
				</dd>
				<dd
					class={`mt-0.5 text-[11px] ${summary.plantsWithoutData > 0 ? 'text-status-warning-strong' : 'text-text-muted'}`}
				>
					{summary.plantsWithoutData > 0
						? `${summary.plantsWithoutData} PLTA belum punya data`
						: 'Semua PLTA sudah terisi'}
				</dd>
			</div>
		</dl>

		<!-- Kaki kartu: dulu isi kartu "Detail ringkasan" yang terlipat. -->
		<div class="mt-3 border-t border-surface-overlay pt-2.5">
			<p class="text-[11px] font-medium text-text-muted">
				Rata-rata per PLTA <span class="font-normal">(MWh)</span>
			</p>
			<dl class="mt-1 flex flex-wrap gap-x-5 gap-y-1">
				{#each AVERAGE_GROUPS as group (group.label)}
					<div class="flex flex-wrap items-baseline gap-x-2.5">
						<dt class="text-xs text-text-secondary">
							{group.label === 'Akumulasi'
								? `Akumulasi s.d. ${summary.accumulatedThrough}`
								: group.label}
						</dt>
						{#each group.keys as [label, key] (key)}
							{@const average = overview.averages[key]}
							<dd class="text-xs text-text-muted" title={`${average.count} data`}>
								{label}
								<span class="metric-value text-text-primary">{formatNumber(average.value, 0)}</span>
							</dd>
						{/each}
					</div>
				{/each}
			</dl>
		</div>
	{/if}

	{#if !summary.query.isLoading}
		<div
			class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface-overlay pt-2.5"
		>
			<div class="flex items-center gap-1.5">
				<span class="text-xs font-medium text-text-secondary">Sampai</span>
				<div class="w-[116px]">
					<Select
						ariaLabel="Bulan akhir ringkasan"
						value={summary.endMonth ? String(summary.endMonth) : NO_RANGE}
						onValueChange={(value) => summary.setPeriods({ bulan_akhir: value })}
						options={REPORT_END_MONTH_OPTIONS}
						controlSize="sm"
					/>
				</div>
				<div class="w-[84px]">
					<Select
						ariaLabel="Tahun akhir ringkasan"
						value={summary.endYear ? String(summary.endYear) : NO_RANGE}
						onValueChange={(value) => summary.setPeriods({ tahun_akhir: value })}
						options={REPORT_END_YEAR_OPTIONS}
						controlSize="sm"
					/>
				</div>
				{#if hasReportRange(summary.period) && !summary.rangeError}
					<button
						type="button"
						onclick={() => summary.setPeriods({ tahun_akhir: NO_RANGE, bulan_akhir: NO_RANGE })}
						class="cursor-pointer text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
					>
						Hapus rentang
					</button>
				{/if}
			</div>
			{#if summary.rangeError}
				<p role="alert" class="text-xs text-status-danger-strong">{summary.rangeError}</p>
			{:else if overview && overview.rowCount > 0 && (hasReportRange(summary.period) || summary.month === undefined)}
				<!--
					Server merangkum blok akumulasi dari SATU bulan: yang terakhir
					berdata. Menjumlahkan akumulasi lintas bulan menghitung bulan yang
					sama berkali-kali.
				-->
				<p class="text-xs text-text-muted">
					Akumulasi = posisi {summary.accumulatedThrough}, bukan jumlah seluruh bulan.
				</p>
			{/if}
			<a
				href={summary.reportHref}
				class="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-primary-strong hover:underline"
			>
				Unduh laporan Excel
				<IconArrowRight class="size-3.5 shrink-0" aria-hidden="true" />
			</a>
		</div>
	{/if}
</section>
