<script lang="ts">
	import IconTrash from '~icons/ph/trash';
	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
	import ConfirmDialog from '$components/ui/ConfirmDialog.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { ApiError } from '../../../api/http';
	import { createObjectUrl } from '$shared/lib/object-url.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import {
		createDeleteMonthlyHydrologyImageMutation,
		createMonthlyHydrologyImageQuery
	} from '../api/queries';
	import { getHydrologyErrorMessage } from '../error';
	import type { MonthlyHydrologyImageKind } from '../model';

	interface Props {
		isOpen: boolean;
		kind: MonthlyHydrologyImageKind;
		onClose: () => void;
	}

	/**
	 * Menghapus satu gambar prakiraan hujan untuk seluruh PLTA.
	 *
	 * Gambar periode yang dipilih ditampilkan lebih dulu: penghapusan tidak dapat
	 * dibatalkan dan berlaku untuk semua PLTA, jadi operator harus melihat persis
	 * gambar mana yang akan hilang — bukan hanya nama bulannya. Tombol hapus baru
	 * aktif setelah gambarnya terbukti ada.
	 */
	let { isOpen, kind, onClose }: Props = $props();

	const MONTH_LABELS = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];
	const MONTH_OPTIONS = MONTH_LABELS.map((label, index) => ({
		value: String(index + 1),
		label
	}));
	const CURRENT_YEAR = new Date().getFullYear();
	const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR + 1 - index).map(
		(value) => ({ value: String(value), label: String(value) })
	);

	const IMAGE_KIND_LABEL: Record<MonthlyHydrologyImageKind, string> = {
		curah_hujan: 'Prakiraan Curah Hujan',
		sifat_hujan: 'Prakiraan Sifat Hujan'
	};

	let month = $state(String(new Date().getMonth() + 1));
	let year = $state(String(CURRENT_YEAR));
	let isConfirmOpen = $state(false);

	const imageQuery = createMonthlyHydrologyImageQuery(
		() => Number(year),
		() => Number(month),
		() => kind,
		() => isOpen
	);
	const imageUrl = createObjectUrl(() => imageQuery.data);
	const deleteMutation = createDeleteMonthlyHydrologyImageMutation();

	const monthLabel = $derived(MONTH_LABELS[Number(month) - 1]);
	const imageLabel = $derived(IMAGE_KIND_LABEL[kind]);
	const isPending = $derived(deleteMutation.isPending);
	const isMissing = $derived(
		imageQuery.isError && ApiError.isApiError(imageQuery.error) && imageQuery.error.status === 404
	);
	const canDelete = $derived(Boolean(imageQuery.data) && !imageQuery.isFetching && !isPending);

	async function deleteImage() {
		try {
			await deleteMutation.mutateAsync({ year: Number(year), month: Number(month), kind });
			notificationStore.addToast({
				type: 'success',
				message: `${imageLabel} ${monthLabel} ${year} dihapus untuk seluruh PLTA`
			});
			isConfirmOpen = false;
			onClose();
		} catch (error) {
			isConfirmOpen = false;
			const message =
				ApiError.isApiError(error) && error.status === 404
					? 'Gambar periode ini memang belum ada'
					: getHydrologyErrorMessage(error);
			notificationStore.addToast({ type: 'error', message });
		}
	}
</script>

<Sheet {isOpen} title={`Hapus ${imageLabel}`} isDismissible={!isPending} {onClose}>
	{#snippet description()}
		Untuk gambar yang salah terunggah sementara penggantinya belum ada. Bila gambar penggantinya
		sudah ada, cukup unggah ulang — gambar lama otomatis tergantikan.
	{/snippet}

	<div class="flex flex-col gap-6">
		<div class="grid gap-4 sm:grid-cols-2">
			<Select label="Bulan" bind:value={month} disabled={isPending} options={MONTH_OPTIONS} />
			<Select label="Tahun" bind:value={year} disabled={isPending} options={YEAR_OPTIONS} />
		</div>

		<div>
			<p class="field-label">Gambar yang akan dihapus</p>
			<div
				class="mt-1.5 flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface-base"
			>
				{#if imageQuery.isLoading}
					<p class="loading-text" role="status">Memuat gambar…</p>
				{:else if imageUrl.current}
					<img
						src={imageUrl.current}
						alt={`${imageLabel} ${monthLabel} ${year}`}
						class="max-h-[320px] w-full object-contain"
					/>
				{:else if isMissing}
					<p class="px-6 text-center text-sm text-text-muted">
						Belum ada gambar untuk {monthLabel}
						{year}. Tidak ada yang perlu dihapus.
					</p>
				{:else if imageQuery.isError}
					<p class="px-6 text-center text-sm text-status-danger-strong" role="alert">
						{getHydrologyErrorMessage(imageQuery.error)}
					</p>
				{/if}
			</div>
		</div>
	</div>

	{#snippet footer()}
		<div class="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
			<Button
				type="button"
				variant="ghost"
				disabled={isPending}
				onclick={onClose}
				class="w-full sm:w-auto"
			>
				Batal
			</Button>
			<Button
				type="button"
				variant="danger"
				disabled={!canDelete}
				onclick={() => (isConfirmOpen = true)}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconTrash class="size-4" />{/snippet}
				Hapus Gambar
			</Button>
		</div>
	{/snippet}
</Sheet>

<ConfirmDialog
	isOpen={isConfirmOpen}
	variant="danger"
	title={`Hapus ${imageLabel} ${monthLabel} ${year}?`}
	confirmLabel={isPending ? 'Menghapus…' : 'Ya, Hapus'}
	cancelLabel="Batal"
	isConfirming={isPending}
	onConfirm={() => void deleteImage()}
	onClose={() => (isConfirmOpen = false)}
>
	{#snippet icon()}<IconTrash class="size-5" />{/snippet}
	{#snippet description()}
		Gambar hilang dari panel Prakiraan Hujan <strong>seluruh PLTA</strong> dan tidak dapat dikembalikan.
		Penghapusan tercatat di riwayat unggah.
	{/snippet}
</ConfirmDialog>
