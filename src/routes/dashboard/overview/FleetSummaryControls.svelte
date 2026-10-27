<script lang="ts">
	import IconArrowRight from '~icons/ph/arrow-right';
	import IconX from '~icons/ph/x';

	import Select from '$components/controls/Select.svelte';
	import {
		ALL_MONTHS,
		NO_RANGE,
		REPORT_END_MONTH_OPTIONS,
		REPORT_END_YEAR_OPTIONS,
		REPORT_MONTH_OPTIONS,
		REPORT_YEAR_OPTIONS,
		hasReportRange
	} from '../hydrology-report';
	import { createFleetSummary, type FleetPeriodKey } from './fleet-summary.svelte';

	interface Props {
		/** Jumlah PLTA terdaftar; diteruskan agar status ringkasannya sama dengan kartunya. */
		registeredPlantCount: number | null;
	}

	/**
	 * Seluruh query ringkasan seluruh PLTA di kepala halaman Overview: bulan,
	 * tahun, rentang ("Sampai"), dan tautan laporan Excel periode yang sama.
	 * Angka dan rata-rata per PLTA tampil di kartu dasar peta (`FleetSummary`);
	 * keduanya membaca periode yang sama dari URL.
	 *
	 * Sampai 23 Okt 2026 rentang dan unduhan ada di kaki kartu itu; tim meminta
	 * semua pemilih periode di satu tempat. Sejak 27 Okt 2026 tautan Excel
	 * berupa teks biru di bawah pemilih, bukan tombol sebaris (keputusan rapat
	 * tim).
	 */
	let { registeredPlantCount }: Props = $props();

	const summary = createFleetSummary(() => registeredPlantCount);

	function setPeriod(key: FleetPeriodKey, value: string) {
		summary.setPeriods({ [key]: value });
	}
</script>

<!--
	Dua kelompok yang masing-masing tidak terpatah: periode awal, lalu
	"Sampai". `Select` memakai `w-full` di akarnya, jadi lebar tetapnya dipasang
	di pembungkus — kelas lebar yang dikirim ke `Select` bertabrakan dengan
	`w-full` dan pemilihnya bertumpuk ke bawah.
-->
<div class="flex flex-col gap-1.5 xl:items-end">
	<div class="flex flex-wrap items-center gap-x-3 gap-y-2 xl:justify-end">
		<div class="flex flex-nowrap items-center gap-2">
			<div class="w-[160px] shrink-0">
				<Select
					ariaLabel="Bulan ringkasan"
					value={summary.month ? String(summary.month) : ALL_MONTHS}
					onValueChange={(value) => setPeriod('bulan', value)}
					options={REPORT_MONTH_OPTIONS}
					controlSize="sm"
				/>
			</div>
			<div class="w-[96px] shrink-0">
				<Select
					ariaLabel="Tahun ringkasan"
					value={String(summary.year)}
					onValueChange={(value) => setPeriod('tahun', value)}
					options={REPORT_YEAR_OPTIONS}
					controlSize="sm"
				/>
			</div>
		</div>

		<div class="flex flex-nowrap items-center gap-2">
			<span class="text-xs font-medium text-text-muted">Sampai</span>
			<div class="w-[116px] shrink-0">
				<Select
					ariaLabel="Bulan akhir ringkasan"
					value={summary.endMonth ? String(summary.endMonth) : NO_RANGE}
					onValueChange={(value) => setPeriod('bulan_akhir', value)}
					options={REPORT_END_MONTH_OPTIONS}
					controlSize="sm"
				/>
			</div>
			<div class="w-[84px] shrink-0">
				<Select
					ariaLabel="Tahun akhir ringkasan"
					value={summary.endYear ? String(summary.endYear) : NO_RANGE}
					onValueChange={(value) => setPeriod('tahun_akhir', value)}
					options={REPORT_END_YEAR_OPTIONS}
					controlSize="sm"
				/>
			</div>
			{#if hasReportRange(summary.period)}
				<button
					type="button"
					onclick={() => summary.setPeriods({ tahun_akhir: NO_RANGE, bulan_akhir: NO_RANGE })}
					aria-label="Hapus rentang"
					title="Hapus rentang"
					class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
				>
					<IconX class="size-3.5" aria-hidden="true" />
				</button>
			{/if}
		</div>
	</div>

	<a
		href={summary.reportHref}
		class="inline-flex items-center gap-1 text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed hover:underline"
	>
		Unduh laporan Excel
		<IconArrowRight class="size-3.5 shrink-0" aria-hidden="true" />
	</a>
</div>
