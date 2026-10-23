<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
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
	 *
	 * Sejak 23 Okt 2026 berupa tombol di toolbar daftar laporan yang membuka
	 * sheet, bukan kartu permanen di atas daftar: kartu itu berebut perhatian
	 * dengan tab, daftar, dan tombol Buat Laporan dalam satu layar.
	 */
	let { pltaId, plantCode, plantName }: Props = $props();

	let isOpen = $state(false);
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
			isOpen = false;
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getTrendErrorMessage(error) });
		} finally {
			isTrendDownloadPending = false;
		}
	}
</script>

<button type="button" onclick={() => (isOpen = true)} class="btn btn-ghost btn-sm h-9">
	<IconDownload class="size-3.5" aria-hidden="true" />
	Excel per jam
</button>

<Sheet
	{isOpen}
	title="Unduh Excel per jam"
	isDismissible={!isPending}
	onClose={() => (isOpen = false)}
>
	{#snippet description()}
		{#if usesTrendList}
			Satu kolom per item daftar tren {plantName} — isinya sama dengan Tren & Grafik. Langsung diunduh,
			tanpa antrean.
		{:else}
			13 kolom rata-rata per jam untuk {plantName}, langsung diunduh tanpa antrean. Daftar tren PLTA
			ini belum diatur, jadi memakai format lama.
		{/if}
	{/snippet}

	<div class="grid gap-3 sm:grid-cols-2">
		<Input
			type="date"
			label="Dari"
			bind:value={start}
			max={end || undefined}
			disabled={isPending}
		/>
		<Input
			type="date"
			label="Sampai"
			bind:value={end}
			min={start || undefined}
			max={today}
			disabled={isPending}
			error={rangeError ?? undefined}
			helperText={`Maksimal ${maxDays} hari.`}
		/>
	</div>

	{#snippet footer()}
		<div class="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
			<Button
				type="button"
				variant="ghost"
				disabled={isPending}
				onclick={() => (isOpen = false)}
				class="w-full sm:w-auto"
			>
				Batal
			</Button>
			<Button
				type="button"
				isLoading={isPending}
				disabled={Boolean(rangeError) || listQuery.isLoading}
				onclick={() => void download()}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconDownload class="size-4" />{/snippet}
				{isPending ? 'Menyiapkan…' : 'Unduh Excel'}
			</Button>
		</div>
	{/snippet}
</Sheet>
