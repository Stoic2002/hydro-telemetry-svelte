<script lang="ts">
	import Select from '$components/controls/Select.svelte';
	import { ALL_MONTHS, REPORT_MONTH_OPTIONS, REPORT_YEAR_OPTIONS } from '../hydrology-report';
	import { createFleetSummary, type FleetPeriodKey } from './fleet-summary.svelte';

	interface Props {
		/** Jumlah PLTA terdaftar; diteruskan agar status ringkasannya sama dengan kartunya. */
		registeredPlantCount: number | null;
	}

	/**
	 * Pemilih bulan dan tahun ringkasan seluruh PLTA, di kepala halaman Overview.
	 * Angkanya tampil di kartu dasar peta (`FleetSummary`), rentang dan tabel
	 * rata-rata di kartu "Detail ringkasan" di kolom kanan peta
	 * (`FleetSummaryDetail`); ketiganya membaca periode yang sama dari URL.
	 */
	let { registeredPlantCount }: Props = $props();

	const summary = createFleetSummary(() => registeredPlantCount);

	function setPeriod(key: FleetPeriodKey, value: string) {
		summary.setPeriods({ [key]: value });
	}
</script>

<!--
	Satu baris: Bulan dan Tahun. `Select` memakai `w-full` di akarnya, jadi
	lebar tetapnya dipasang di pembungkus — kelas lebar yang dikirim ke `Select`
	bertabrakan dengan `w-full` dan pemilihnya bertumpuk ke bawah.
-->
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
