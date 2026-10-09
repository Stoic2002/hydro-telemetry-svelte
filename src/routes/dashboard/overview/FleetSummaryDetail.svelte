<script lang="ts">
	import IconArrowRight from '~icons/ph/arrow-right';
	import IconCaretDown from '~icons/ph/caret-down';

	import Select from '$components/controls/Select.svelte';
	import { getHydrologyErrorMessage, type MonthlyHydrologyOverview } from '$features/hydrology';
	import { formatNumber } from '$shared/utils/number';
	import {
		NO_RANGE,
		REPORT_END_MONTH_OPTIONS,
		REPORT_END_YEAR_OPTIONS,
		hasReportRange
	} from '../hydrology-report';
	import { createFleetSummary, type FleetPeriodKey } from './fleet-summary.svelte';

	interface Props {
		/** Jumlah PLTA terdaftar, untuk peringatan cakupan. `null` bila belum dimuat. */
		registeredPlantCount: number | null;
	}

	/**
	 * Detail ringkasan seluruh PLTA: rentang periode, catatan cakupan, tabel
	 * rata-rata per PLTA, dan tautan laporan Excel. Bertumpuk di kolom kanan peta
	 * bersama Awan Hujan dan Legenda (7 Okt 2026) — dulu popover di kanan atas.
	 * Peta tidak punya celah kosong setinggi isinya, jadi kartunya terlipat
	 * secara bawaan; saat dibuka, kolom kanannya yang bergulir.
	 */
	let { registeredPlantCount }: Props = $props();

	const AVERAGE_ROWS: {
		key: keyof MonthlyHydrologyOverview['averages'];
		label: string;
	}[] = [
		{ key: 'predictedProductionMwh', label: 'Prognosa energi' },
		{ key: 'targetProductionMwh', label: 'Target produksi' },
		{ key: 'actualProductionMwh', label: 'Realisasi produksi' },
		{ key: 'predictedAccumulatedMwh', label: 'Prognosa akumulasi' },
		{ key: 'targetAccumulatedMwh', label: 'Target akumulasi' },
		{ key: 'actualAccumulatedMwh', label: 'Realisasi akumulasi' }
	];

	const summary = createFleetSummary(() => registeredPlantCount);
	const overviewQuery = $derived(summary.query);
	const overview = $derived(summary.overview);
	const period = $derived(summary.period);
	const periodLabel = $derived(summary.periodLabel);
	const rangeError = $derived(summary.rangeError);
	const needsAttention = $derived(summary.needsAttention);
	const plantsWithoutData = $derived(summary.plantsWithoutData);
	const reportHref = $derived(summary.reportHref);
	const endYear = $derived(summary.endYear);
	const endMonth = $derived(summary.endMonth);

	let isOpen = $state(false);

	function setPeriod(key: FleetPeriodKey, value: string) {
		summary.setPeriods({ [key]: value });
	}

	const setPeriods = summary.setPeriods;
</script>

<section
	class="pointer-events-auto shrink-0 rounded-xl border border-border-subtle bg-surface-raised/95 shadow-overlay backdrop-blur-sm"
>
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		aria-expanded={isOpen}
		aria-controls="fleet-summary-detail"
		class="flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left"
	>
		<span class="flex min-w-0 items-center gap-1.5">
			<span class="text-sm font-medium text-text-primary">Detail ringkasan</span>
			{#if needsAttention}
				<!-- Peringatan cakupan ada di dalam; titik ini yang memberi tahu. -->
				<span class="size-1.5 shrink-0 rounded-full bg-status-warning-strong" aria-hidden="true"
				></span>
				<span class="sr-only">(ada peringatan cakupan)</span>
			{/if}
		</span>
		<IconCaretDown
			class={`size-3.5 shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
			aria-hidden="true"
		/>
	</button>

	{#if isOpen}
		<div id="fleet-summary-detail" class="border-t border-surface-overlay px-3.5 pt-2.5 pb-3">
			<p class="text-xs font-medium text-text-secondary">Sampai (opsional)</p>
			<div class="mt-1.5 grid grid-cols-[1fr_76px] gap-1.5">
				<Select
					ariaLabel="Bulan akhir ringkasan"
					value={endMonth ? String(endMonth) : NO_RANGE}
					onValueChange={(value) => setPeriod('bulan_akhir', value)}
					options={REPORT_END_MONTH_OPTIONS}
					controlSize="sm"
				/>
				<Select
					ariaLabel="Tahun akhir ringkasan"
					value={endYear ? String(endYear) : NO_RANGE}
					onValueChange={(value) => setPeriod('tahun_akhir', value)}
					options={REPORT_END_YEAR_OPTIONS}
					controlSize="sm"
				/>
			</div>
			{#if rangeError}
				<p role="alert" class="mt-1.5 text-xs text-status-danger-strong">{rangeError}</p>
			{:else if hasReportRange(period)}
				<button
					type="button"
					onclick={() => setPeriods({ tahun_akhir: NO_RANGE, bulan_akhir: NO_RANGE })}
					class="mt-1.5 cursor-pointer text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
				>
					Hapus rentang
				</button>
			{/if}

			{#if overview && overview.rowCount > 0}
				<p class="mt-3 text-xs leading-relaxed text-text-muted">
					<span class="font-medium text-text-secondary">
						Akumulasi s.d. {summary.accumulatedThrough}:
					</span>
					{formatNumber(overview.accumulated.totalPredictedMwh, 0)} dari
					{formatNumber(overview.accumulated.totalTargetMwh, 0)} MWh target.
					<span class="font-medium text-text-secondary">Rata-rata antar-PLTA</span>
					memberi bobot sama pada setiap PLTA ({overview.accumulated.averagePercent.count} data).
				</p>
				{#if hasReportRange(period) || summary.month === undefined}
					<!--
						Server merangkum blok akumulasi dari SATU bulan: yang terakhir
						berdata. Menjumlahkan akumulasi lintas bulan menghitung bulan yang
						sama berkali-kali.
					-->
					<p class="mt-2 text-xs leading-relaxed text-text-muted">
						Untuk {periodLabel}, angka akumulasi adalah posisi bulan terakhir yang berdata ({summary.accumulatedThrough}),
						bukan jumlah seluruh bulan — akumulasi tiap bulan sudah dihitung dari Januari.
					</p>
				{/if}

				{#if needsAttention}
					<p
						class="mt-3 rounded-lg bg-status-warning-soft px-2.5 py-2 text-xs leading-relaxed text-status-warning-strong"
					>
						{#if plantsWithoutData > 0}
							{plantsWithoutData} dari {registeredPlantCount} PLTA belum punya data periode ini.
						{/if}
						{#if overview.accumulated.unassessedCount > 0}
							{overview.accumulated.unassessedCount} data belum bisa dinilai karena prediksi atau targetnya
							kosong — tidak dihitung "tidak tercapai" dan tidak ikut angka gabungan.
						{/if}
					</p>
				{/if}

				<table class="mt-3 w-full border-collapse text-left">
					<caption class="sr-only">Rata-rata energi per PLTA pada {periodLabel}</caption>
					<thead>
						<tr class="border-b border-border-subtle">
							<th class="table-head-cell py-1.5">Rata-rata</th>
							<th class="table-head-cell py-1.5 text-right">MWh</th>
							<th class="table-head-cell py-1.5 text-right">n</th>
						</tr>
					</thead>
					<tbody>
						{#each AVERAGE_ROWS as row (row.key)}
							{@const average = overview.averages[row.key]}
							<tr class="border-b border-surface-overlay last:border-b-0">
								<td class="py-1.5 pr-1.5 text-xs text-text-secondary">{row.label}</td>
								<td class="metric-value py-1.5 text-right text-xs text-text-primary">
									{formatNumber(average.value, 2)}
								</td>
								<td class="py-1.5 pl-1.5 text-right text-xs text-text-muted">{average.count}</td>
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
				Unduh laporan Excel
				<IconArrowRight class="size-3.5 shrink-0" aria-hidden="true" />
			</a>
		</div>
	{/if}
</section>
