<script lang="ts">
	import IconImagePlus from '~icons/ph/image-square';
	import IconUpload from '~icons/ph/upload-simple';
	import Button from '$components/atoms/Button.svelte';
	import Select from '$components/atoms/Select.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createUploadMonthlyHydrologyImageMutation } from '../api/queries';
	import { getHydrologyErrorMessage } from '../error';
	import type { MonthlyHydrologyImageKind } from '../model';

	interface Props {
		isOpen: boolean;
		kind: MonthlyHydrologyImageKind;
		onClose: () => void;
	}

	let { isOpen, kind, onClose }: Props = $props();

	const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
	const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg'];

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

	const uploadMutation = createUploadMonthlyHydrologyImageMutation();

	let file = $state<File | null>(null);
	let fileError = $state<string | null>(null);
	// Periode dipilih di dalam sheet: operator memilih bulan sekalian saat
	// memilih berkasnya, bukan menyetel periode lebih dulu di halaman lalu
	// mencari tombol unggah yang cocok.
	let month = $state(String(new Date().getMonth() + 1));
	let year = $state(String(CURRENT_YEAR));

	const monthLabel = $derived(MONTH_LABELS[Number(month) - 1]);
	const imageLabel = $derived(IMAGE_KIND_LABEL[kind]);
	const isPending = $derived(uploadMutation.isPending);

	function selectFile(nextFile: File | null) {
		fileError = null;

		if (!nextFile) {
			file = null;
			return;
		}
		if (!ACCEPTED_IMAGE_TYPES.includes(nextFile.type)) {
			file = null;
			fileError = 'Gunakan file PNG, JPG, atau JPEG';
			return;
		}
		if (nextFile.size > MAX_IMAGE_SIZE) {
			file = null;
			fileError = 'Ukuran gambar maksimal 5 MB';
			return;
		}

		file = nextFile;
	}

	async function uploadImage(event: SubmitEvent) {
		event.preventDefault();

		if (!file) {
			fileError = 'Pilih gambar yang akan diunggah';
			return;
		}

		try {
			await uploadMutation.mutateAsync({ year: Number(year), month: Number(month), kind, file });
			notificationStore.addToast({
				type: 'success',
				message: `${imageLabel} ${monthLabel} ${year} berhasil diunggah untuk seluruh PLTA`
			});
			onClose();
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getHydrologyErrorMessage(error) });
		}
	}
</script>

<Sheet {isOpen} title={`Unggah ${imageLabel}`} isDismissible={!isPending} {onClose}>
	{#snippet description()}
		Pilih periode dan gambarnya. Satu unggahan berlaku untuk seluruh PLTA.
	{/snippet}

	<form id="hydrology-image-upload-form" onsubmit={uploadImage} class="flex flex-col gap-6">
		<div class="border-b border-surface-overlay pb-5">
			<p class="text-xs font-medium text-brand-primary-pressed">Target gambar</p>
			<p class="mt-1 text-sm font-semibold text-text-strong">{imageLabel}</p>
			<p class="mt-1 text-xs text-text-muted">Berlaku untuk seluruh PLTA</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<Select label="Bulan" bind:value={month} disabled={isPending} options={MONTH_OPTIONS} />
			<Select label="Tahun" bind:value={year} disabled={isPending} options={YEAR_OPTIONS} />
		</div>

		<label
			class="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface-base/70 px-5 py-8 text-center transition-colors hover:border-brand-primary-strong hover:bg-brand-tint/40"
		>
			<span
				class="flex size-11 items-center justify-center rounded-full bg-surface-raised text-brand-primary-strong ring-1 ring-border-subtle"
			>
				<IconImagePlus class="size-5" />
			</span>
			<span class="text-sm font-medium text-text-secondary">
				{file ? file.name : 'Pilih gambar prakiraan hujan'}
			</span>
			<span class="text-xs text-text-muted">PNG, JPG, atau JPEG · maksimal 5 MB</span>
			<input
				type="file"
				accept=".png,.jpg,.jpeg,image/png,image/jpeg"
				disabled={isPending}
				onchange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
				class="sr-only"
			/>
		</label>

		{#if file}
			<p class="text-xs font-medium text-status-success-strong">
				File siap diunggah · {(file.size / 1024 / 1024).toLocaleString('id-ID', {
					maximumFractionDigits: 2
				})} MB
			</p>
		{/if}
		{#if fileError}
			<p class="text-xs font-medium text-status-danger-strong" role="alert">{fileError}</p>
		{/if}
	</form>

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
				type="submit"
				form="hydrology-image-upload-form"
				isLoading={isPending}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconUpload class="size-4" />{/snippet}
				{isPending ? 'Mengunggah…' : 'Unggah Gambar'}
			</Button>
		</div>
	{/snippet}
</Sheet>
