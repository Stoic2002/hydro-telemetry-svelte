<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import Input from '$components/controls/Input.svelte';
	import {
		MAX_TIMESERIES_DAYS,
		createDownloadTimeseriesExcelMutation,
		shiftIsoDate,
		timeseriesRangeError
	} from '$features/reports';
	import { toISODateWIB } from '$shared/lib/date';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';

	interface Props {
		pltaId: string;
		plantCode: string;
		plantName: string;
	}

	/**
	 * Excel time-series 13 kolom (rata-rata per jam WIB) yang langsung diunduh,
	 * tanpa antrean — berbeda dari laporan di daftar bawah, yang dibuat server
	 * di belakang dan baru bisa diunduh setelah selesai. Kolomnya tetap: TMA
	 * waduk, inflow, debit turbin 1–3, spillway, irigasi, DDC, delta head, TMA
	 * tailrace, head, dan efisiensi turbin 1–3.
	 */
	let { pltaId, plantCode, plantName }: Props = $props();

	const today = toISODateWIB(new Date());
	let start = $state(shiftIsoDate(today, -6));
	let end = $state(today);

	const mutation = createDownloadTimeseriesExcelMutation();
	/** Rentang yang pasti ditolak server tidak dikirim. */
	const rangeError = $derived(timeseriesRangeError(start, end));

	async function download() {
		if (rangeError) return;
		try {
			const blob = await mutation.mutateAsync({ pltaId, start, end });
			const range = start === end ? start : `${start}_sd_${end}`;
			downloadBlob(blob, `timeseries-${plantCode.toLowerCase()}-${range}.xlsx`);
		} catch (error) {
			notificationStore.addToast({
				type: 'error',
				message:
					error instanceof Error && error.message.trim()
						? error.message
						: 'Excel time-series belum dapat diunduh.'
			});
		}
	}
</script>

<section
	aria-labelledby="timeseries-quick-title"
	class="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-raised px-4 py-4 lg:flex-row lg:items-end lg:justify-between"
>
	<div class="min-w-0 lg:max-w-[46ch]">
		<h2 id="timeseries-quick-title" class="card-title">Unduh langsung: Excel per jam</h2>
		<p class="mt-1 text-xs leading-relaxed text-text-muted">
			13 kolom rata-rata per jam untuk {plantName}, langsung tanpa antrean. Maksimal
			{MAX_TIMESERIES_DAYS} hari.
		</p>
	</div>
	<div class="flex flex-wrap items-start gap-2">
		<div class="w-[160px]">
			<Input
				type="date"
				label="Dari"
				bind:value={start}
				max={end || undefined}
				disabled={mutation.isPending}
			/>
		</div>
		<div class="w-[160px]">
			<Input
				type="date"
				label="Sampai"
				bind:value={end}
				min={start || undefined}
				max={today}
				disabled={mutation.isPending}
				error={rangeError ?? undefined}
			/>
		</div>
		<button
			type="button"
			onclick={() => void download()}
			disabled={Boolean(rangeError) || mutation.isPending}
			class="btn btn-ghost btn-sm mt-[26px] h-10 text-brand-primary-strong"
		>
			<IconDownload class="size-4" aria-hidden="true" />
			{mutation.isPending ? 'Menyiapkan…' : 'Unduh Excel'}
		</button>
	</div>
</section>
