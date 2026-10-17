<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import Input from '$components/controls/Input.svelte';
	import {
		MAX_TIMESERIES_DAYS,
		MAX_TREND_EXPORT_DAYS,
		createDownloadTimeseriesExcelMutation,
		shiftIsoDate,
		timeseriesRangeError
	} from '$features/reports';
	import {
		createPlantTrendListQuery,
		getTrendErrorMessage,
		trendsRepository
	} from '$features/trends';
	import { toISODateWIB } from '$shared/lib/date';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';

	interface Props {
		pltaId: string;
		plantCode: string;
		plantName: string;
	}

	/**
	 * Excel per jam yang langsung diunduh, tanpa antrean — berbeda dari laporan
	 * di daftar bawah, yang dibuat server di belakang.
	 *
	 * Sejak 13 Okt 2026 memakai `GET /trends/plta/{id}/data.xlsx` bila daftar
	 * tren PLTA ini sudah diatur: kolomnya mengikuti daftar itu, isinya sama
	 * dengan grafik Tren & Grafik. Excel 13 kolom lama (`timeseries.xlsx`,
	 * deprecated — kolom mockup PBS yang sebagian besar kosong di PLTA lain)
	 * tinggal cadangan untuk PLTA yang daftarnya belum diatur.
	 */
	let { pltaId, plantCode, plantName }: Props = $props();

	const today = toISODateWIB(new Date());
	let start = $state(shiftIsoDate(today, -6));
	let end = $state(today);

	const mutation = createDownloadTimeseriesExcelMutation();
	const listQuery = createPlantTrendListQuery(() => pltaId);
	const usesTrendList = $derived(
		Boolean(listQuery.data?.isConfigured && listQuery.data.items.length > 0)
	);
	const maxDays = $derived(usesTrendList ? MAX_TREND_EXPORT_DAYS : MAX_TIMESERIES_DAYS);

	let isTrendDownloadPending = $state(false);
	const isPending = $derived(mutation.isPending || isTrendDownloadPending);

	/** Rentang yang pasti ditolak server tidak dikirim. */
	const rangeError = $derived(timeseriesRangeError(start, end, maxDays));

	async function download() {
		if (rangeError) return;
		const range = start === end ? start : `${start}_sd_${end}`;
		try {
			if (usesTrendList) {
				isTrendDownloadPending = true;
				// Tanggal WIB inklusif: dari 00.00 hari pertama sampai akhir hari terakhir.
				const blob = await trendsRepository.downloadPlantTrendData(
					{
						pltaId,
						from: `${start}T00:00:00+07:00`,
						to: `${end}T23:59:59+07:00`,
						resolution: '1h'
					},
					'xlsx'
				);
				downloadBlob(blob, `tren-${plantCode.toLowerCase()}-${range}.xlsx`);
			} else {
				const blob = await mutation.mutateAsync({ pltaId, start, end });
				downloadBlob(blob, `timeseries-${plantCode.toLowerCase()}-${range}.xlsx`);
			}
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getTrendErrorMessage(error) });
		} finally {
			isTrendDownloadPending = false;
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
			{#if usesTrendList}
				Satu kolom per item daftar tren {plantName}, per jam — isinya sama dengan Tren & Grafik.
				Langsung tanpa antrean. Maksimal {maxDays} hari.
			{:else}
				13 kolom rata-rata per jam untuk {plantName}, langsung tanpa antrean. Maksimal {maxDays} hari.
				Daftar tren PLTA ini belum diatur, jadi memakai format lama.
			{/if}
		</p>
	</div>
	<div class="flex flex-wrap items-start gap-2">
		<div class="w-[160px]">
			<Input
				type="date"
				label="Dari"
				bind:value={start}
				max={end || undefined}
				disabled={isPending}
			/>
		</div>
		<div class="w-[160px]">
			<Input
				type="date"
				label="Sampai"
				bind:value={end}
				min={start || undefined}
				max={today}
				disabled={isPending}
				error={rangeError ?? undefined}
			/>
		</div>
		<button
			type="button"
			onclick={() => void download()}
			disabled={Boolean(rangeError) || isPending || listQuery.isLoading}
			class="btn btn-ghost btn-sm mt-[26px] h-10 text-brand-primary-strong"
		>
			<IconDownload class="size-4" aria-hidden="true" />
			{isPending ? 'Menyiapkan…' : 'Unduh Excel'}
		</button>
	</div>
</section>
