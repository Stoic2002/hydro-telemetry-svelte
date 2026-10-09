<script lang="ts">
	import IconArrowRight from '~icons/ph/arrow-right';

	import Badge from '$components/controls/Badge.svelte';
	import { formatNumber } from '$shared/utils/number';
	import { reportPeriodLabel } from '../hydrology-report';
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
			Rentang periode tidak valid — atur di Detail.
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
	{/if}
</section>
