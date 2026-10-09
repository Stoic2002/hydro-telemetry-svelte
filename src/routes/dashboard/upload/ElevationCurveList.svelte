<script lang="ts">
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconTrash from '~icons/ph/trash';
	import IconWarning from '~icons/ph/warning';
	import Badge from '$components/controls/Badge.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import ConfirmDialog from '$components/ui/ConfirmDialog.svelte';
	import {
		createDeleteElevationCurveMutation,
		createElevationCurvesQuery,
		createSetElevationCurveStatusMutation,
		type ElevationCurveSummary
	} from '$features/uploads';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { formatNumber } from '$shared/utils/number';

	interface Props {
		pltaId: string;
		plantName: string;
		/** Tahun penentu penanda "Berlaku". */
		year: number;
	}

	/**
	 * Kurva EVA satu PLTA dan pengelolaannya. Kurva yang diunggah berstatus
	 * draft dan TIDAK dipakai perhitungan apa pun sampai di-publish — dulu
	 * langkah ini hanya bisa lewat Swagger, sehingga unggahan dari aplikasi tidak
	 * berpengaruh.
	 *
	 * Publish langsung dijalankan (tidak merusak; server menolaknya bila titiknya
	 * identik dengan kurva PLTA lain). Menurunkan kurva yang sedang berlaku dan
	 * menghapus draft lewat konfirmasi: yang pertama mengosongkan volume waduk,
	 * yang kedua tidak dapat dibatalkan.
	 */
	let { pltaId, plantName, year }: Props = $props();

	const curvesQuery = createElevationCurvesQuery(
		() => pltaId,
		() => year
	);
	const statusMutation = createSetElevationCurveStatusMutation();
	const deleteMutation = createDeleteElevationCurveMutation();

	const curves = $derived(curvesQuery.data ?? []);
	const isBusy = $derived(statusMutation.isPending || deleteMutation.isPending);

	let pendingDraft = $state<ElevationCurveSummary | null>(null);
	let pendingDelete = $state<ElevationCurveSummary | null>(null);

	function errorMessage(error: unknown): string {
		if (error instanceof Error && error.message.trim()) return error.message;
		return 'Perubahan kurva belum dapat disimpan.';
	}

	function elevationRange(curve: ElevationCurveSummary): string {
		return curve.minElevation === null || curve.maxElevation === null
			? '—'
			: `${formatNumber(curve.minElevation, 2)} – ${formatNumber(curve.maxElevation, 2)}`;
	}

	async function publish(curve: ElevationCurveSummary) {
		try {
			await statusMutation.mutateAsync({ curveId: curve.id, status: 'published' });
			notificationStore.addToast({
				type: 'success',
				message: `Kurva ${curve.year} ${plantName} di-publish`
			});
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: errorMessage(error) });
		}
	}

	async function confirmDraft() {
		const curve = pendingDraft;
		if (!curve) return;
		try {
			await statusMutation.mutateAsync({ curveId: curve.id, status: 'draft' });
			notificationStore.addToast({
				type: 'success',
				message: `Kurva ${curve.year} ${plantName} dijadikan draft`
			});
			pendingDraft = null;
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: errorMessage(error) });
		}
	}

	/** Kurva published yang tidak berlaku cukup diturunkan tanpa konfirmasi. */
	function requestDraft(curve: ElevationCurveSummary) {
		if (curve.isEffective) {
			pendingDraft = curve;
			return;
		}
		pendingDraft = curve;
		void confirmDraft();
	}

	async function confirmDelete() {
		const curve = pendingDelete;
		if (!curve) return;
		try {
			await deleteMutation.mutateAsync(curve.id);
			notificationStore.addToast({
				type: 'success',
				message: `Kurva draft ${curve.year} ${plantName} dihapus`
			});
			pendingDelete = null;
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: errorMessage(error) });
		}
	}
</script>

<section aria-labelledby="elevation-curves-title">
	<h2 id="elevation-curves-title" class="section-title">Kurva {plantName}</h2>
	<p class="mt-1 text-xs text-text-muted">
		Kurva baru berstatus draft. Tekan <span class="font-medium text-text-secondary">Publish</span> agar
		dipakai menghitung volume waduk.
	</p>

	{#if curvesQuery.isLoading}
		<div role="status" class="mt-3 flex flex-col gap-2">
			{#each Array.from({ length: 2 }, (_, index) => index) as index (index)}
				<div class="skeleton-shimmer h-11 rounded-lg"></div>
			{/each}
			<span class="sr-only">Memuat daftar kurva...</span>
		</div>
	{:else if curvesQuery.isError}
		<Banner tone="warning" title="Daftar kurva belum dapat dimuat" class="mt-3">
			<button
				type="button"
				onclick={() => void curvesQuery.refetch()}
				class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
			>
				<IconRefresh class="size-3" />
				Coba lagi
			</button>
		</Banner>
	{:else if curves.length === 0}
		<div
			class="mt-3 rounded-xl border border-dashed border-border-subtle px-4 py-4 text-sm text-text-muted"
		>
			Belum ada kurva untuk {plantName}. Unggah berkas Excel kurva di atas.
		</div>
	{:else}
		<div class="mt-3 overflow-x-auto rounded-xl border border-border-subtle">
			<table class="w-full min-w-[640px] border-collapse text-left">
				<thead>
					<tr class="border-b border-border-subtle bg-surface-overlay/50">
						<th class="table-head-cell px-3.5 py-2">Tahun</th>
						<th class="table-head-cell px-3.5 py-2">Status</th>
						<th class="table-head-cell px-3.5 py-2 text-right">Titik</th>
						<th class="table-head-cell px-3.5 py-2 text-right">Elevasi (mdpl)</th>
						<th class="table-head-cell px-3.5 py-2 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each curves as curve (curve.id)}
						<tr class="border-b border-surface-overlay align-top last:border-b-0">
							<td class="px-3.5 py-2.5 text-sm font-medium text-text-primary">{curve.year}</td>
							<td class="px-3.5 py-2.5">
								<span class="flex flex-wrap items-center gap-1.5">
									<Badge tone={curve.status === 'published' ? 'green' : 'amber'}>
										{curve.status === 'published' ? 'Published' : 'Draft'}
									</Badge>
									{#if curve.isEffective}
										<Badge tone="cyan">Berlaku</Badge>
									{/if}
								</span>
								{#if curve.twins.length > 0}
									<p
										class="mt-1.5 flex items-start gap-1 text-xs leading-snug text-status-warning-strong"
									>
										<IconWarning class="mt-px size-3.5 shrink-0" aria-hidden="true" />
										<span>
											Titiknya identik dengan
											{curve.twins
												.map((twin) => `${twin.plantName} ${twin.year} (${twin.status})`)
												.join(', ')}
										</span>
									</p>
								{/if}
							</td>
							<td class="metric-value px-3.5 py-2.5 text-right text-sm text-text-secondary">
								{formatNumber(curve.pointCount, 0)}
							</td>
							<td class="metric-value px-3.5 py-2.5 text-right text-xs text-text-secondary">
								{elevationRange(curve)}
							</td>
							<td class="px-3.5 py-2.5">
								<span class="flex justify-end gap-1.5">
									{#if curve.status === 'draft'}
										<button
											type="button"
											disabled={isBusy}
											onclick={() => void publish(curve)}
											class="btn btn-primary btn-sm h-8"
										>
											Publish
										</button>
										<button
											type="button"
											disabled={isBusy}
											onclick={() => (pendingDelete = curve)}
											aria-label={`Hapus kurva draft ${curve.year}`}
											title="Hapus kurva draft"
											class="btn btn-ghost btn-sm h-8 text-status-danger-strong"
										>
											<IconTrash class="size-3.5" aria-hidden="true" />
										</button>
									{:else}
										<button
											type="button"
											disabled={isBusy}
											onclick={() => requestDraft(curve)}
											class="btn btn-ghost btn-sm h-8"
										>
											Jadikan draft
										</button>
									{/if}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<ConfirmDialog
	isOpen={pendingDraft !== null && pendingDraft.isEffective}
	variant="warning"
	title={`Jadikan draft kurva ${pendingDraft?.year ?? ''}?`}
	confirmLabel={statusMutation.isPending ? 'Menyimpan…' : 'Ya, jadikan draft'}
	cancelLabel="Batal"
	isConfirming={statusMutation.isPending}
	onConfirm={() => void confirmDraft()}
	onClose={() => (pendingDraft = null)}
>
	{#snippet description()}
		Kurva ini sedang <strong>dipakai</strong> menghitung volume waduk {plantName}. Bila tidak ada
		kurva published lain yang berlaku, volume waduk dan turunannya di Hidrologi Harian akan kosong
		sampai ada kurva yang di-publish lagi.
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	isOpen={pendingDelete !== null}
	variant="danger"
	title={`Hapus kurva draft ${pendingDelete?.year ?? ''}?`}
	confirmLabel={deleteMutation.isPending ? 'Menghapus…' : 'Ya, Hapus'}
	cancelLabel="Batal"
	isConfirming={deleteMutation.isPending}
	onConfirm={() => void confirmDelete()}
	onClose={() => (pendingDelete = null)}
>
	{#snippet icon()}<IconTrash class="size-5" />{/snippet}
	{#snippet description()}
		Kurva draft {pendingDelete?.year}
		{plantName} beserta {formatNumber(pendingDelete?.pointCount ?? 0, 0)}
		titiknya dihapus dan <strong>tidak dapat dikembalikan</strong>. Penghapusan tercatat di riwayat
		unggah; unggah ulang dari berkas aslinya bila diperlukan.
	{/snippet}
</ConfirmDialog>
