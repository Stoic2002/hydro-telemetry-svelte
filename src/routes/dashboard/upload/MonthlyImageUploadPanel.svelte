<script lang="ts">
	import IconCloudRain from '~icons/ph/cloud-rain';
	import IconTrash from '~icons/ph/trash';
	import IconUpload from '~icons/ph/upload-simple';
	import Button from '$components/controls/Button.svelte';
	import UploadHistoryPanel from '$features/audit/components/UploadHistoryPanel.svelte';
	import HydrologyImageDeleteSheet from '$features/hydrology/components/HydrologyImageDeleteSheet.svelte';
	import HydrologyImageUploadSheet from '$features/hydrology/components/HydrologyImageUploadSheet.svelte';
	import { MONTHLY_IMAGE_KIND_LABEL, type MonthlyHydrologyImageKind } from '$features/hydrology';

	/**
	 * Unggah gambar hujan (prakiraan dan realisasi) ada di sini, bukan di Hidrologi Bulanan: satu
	 * gambar berlaku untuk seluruh PLTA, jadi menaruhnya di halaman yang ter-scope
	 * satu PLTA menyiratkan cakupan yang tidak benar.
	 *
	 * Periode tidak dipilih di panel ini melainkan di dalam sheet, karena bulan
	 * yang dituju baru relevan pada saat berkasnya dipilih.
	 */
	const IMAGE_KINDS: { kind: MonthlyHydrologyImageKind; description: string }[] = [
		{
			kind: 'prediksi_curah_hujan',
			description: 'Peta prakiraan jumlah hujan bulanan.'
		},
		{
			kind: 'prediksi_sifat_hujan',
			description: 'Peta prakiraan sifat hujan terhadap normalnya.'
		},
		{
			kind: 'realisasi_curah_hujan',
			description: 'Peta analisis jumlah hujan setelah bulannya berjalan.'
		},
		{
			kind: 'realisasi_sifat_hujan',
			description: 'Peta analisis sifat hujan setelah bulannya berjalan.'
		}
	];

	let uploadKind = $state<MonthlyHydrologyImageKind | null>(null);
	let deleteKind = $state<MonthlyHydrologyImageKind | null>(null);
</script>

<div class="flex flex-col gap-6">
	<section>
		<p class="text-xs text-text-muted">
			Gambar berlaku untuk seluruh PLTA. Mengunggah ulang periode dan jenis yang sama akan
			menggantikan gambar sebelumnya. Hapus hanya bila gambar salah terunggah dan penggantinya belum
			ada.
		</p>

		<div class="mt-3 grid gap-3 sm:grid-cols-2">
			{#each IMAGE_KINDS as item (item.kind)}
				{@const title = MONTHLY_IMAGE_KIND_LABEL[item.kind]}
				<article
					class="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-raised px-4 py-3.5"
				>
					<div class="flex min-w-0 items-center gap-3">
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-text-muted"
						>
							<IconCloudRain class="size-4.5" />
						</span>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-text-primary">{title}</p>
							<p class="truncate text-xs text-text-muted">{item.description}</p>
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-1">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onclick={() => (uploadKind = item.kind)}
							class="whitespace-nowrap text-brand-primary-strong"
						>
							{#snippet leftIcon()}<IconUpload class="size-3" />{/snippet}
							Unggah
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onclick={() => (deleteKind = item.kind)}
							aria-label={`Hapus gambar ${title}`}
							class="whitespace-nowrap text-status-danger-strong"
						>
							{#snippet leftIcon()}<IconTrash class="size-3" />{/snippet}
							Hapus
						</Button>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<UploadHistoryPanel
		title="Riwayat gambar hujan"
		description="Gambar yang pernah diunggah atau dihapus, terbaru lebih dulu."
		kind="monthly_image"
		emptyDescription="Gambar hujan yang diunggah akan tercatat di sini."
	/>
</div>

{#if uploadKind}
	<HydrologyImageUploadSheet isOpen kind={uploadKind} onClose={() => (uploadKind = null)} />
{/if}

{#if deleteKind}
	<HydrologyImageDeleteSheet isOpen kind={deleteKind} onClose={() => (deleteKind = null)} />
{/if}
