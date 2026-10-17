<script lang="ts">
	import IconCheck from '~icons/ph/check-circle';
	import IconTrash from '~icons/ph/trash';
	import IconWarning from '~icons/ph/warning';

	interface Props {
		file: File;
		/** Galat validasi berkas; kartu berubah merah bila diisi. */
		error?: string | null;
		/** Keterangan tambahan sesudah ukuran, mis. "Tahun 2026". */
		detail?: string;
		disabled?: boolean;
		onClear: () => void;
	}

	/** Kartu berkas terpilih di panel Upload — pasangan `FileDropzone`. */
	let { file, error = null, detail, disabled = false, onClear }: Props = $props();

	const sizeLabel = $derived(
		`${(file.size / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} KB`
	);
</script>

<div
	class={`rounded-xl border p-3.5 ${
		error
			? 'border-status-danger-strong/30 bg-status-danger-soft'
			: 'border-status-success-strong/30 bg-status-success-soft'
	}`}
>
	<div class="flex items-start gap-3">
		{#if error}
			<IconWarning class="mt-0.5 size-5 shrink-0 text-status-danger-strong" aria-hidden="true" />
		{:else}
			<IconCheck class="mt-0.5 size-5 shrink-0 text-status-success-strong" aria-hidden="true" />
		{/if}
		<div class="min-w-0 flex-1">
			<p class="text-sm font-medium [overflow-wrap:anywhere] text-text-primary">{file.name}</p>
			<p class="mt-0.5 text-xs text-text-muted">
				{sizeLabel}{#if detail}&nbsp;· {detail}{/if}
			</p>
		</div>
		<button
			type="button"
			onclick={onClear}
			{disabled}
			aria-label="Hapus file terpilih"
			title="Hapus file"
			class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted hover:bg-surface-raised hover:text-status-danger-strong disabled:cursor-not-allowed disabled:opacity-50"
		>
			<IconTrash class="size-4" aria-hidden="true" />
		</button>
	</div>
</div>
