<script lang="ts">
	import IconUploadCloud from '~icons/ph/cloud-arrow-up';

	interface Props {
		/** Nilai `accept` untuk input berkas. */
		accept: string;
		/** Kalimat utama, mis. "Tarik file Excel ke area ini". */
		title: string;
		/** Batasan berkas dalam satu baris, mis. ".xlsx · maksimum 5 MB". */
		hint: string;
		onSelect: (file: File) => void;
		disabled?: boolean;
	}

	/**
	 * Area tarik-lepas berkas, bisa juga diklik atau dibuka dengan Enter/Spasi.
	 * Dulu disalin utuh di tiga panel Upload (Excel bulanan, Excel harian, EVA).
	 *
	 * Validasi berkas tetap milik pemanggil — tiap panel punya batas sendiri.
	 * Nilai input dikosongkan setelah tiap pilihan supaya berkas yang sama bisa
	 * dipilih lagi sesudah dihapus.
	 */
	let { accept, title, hint, onSelect, disabled = false }: Props = $props();

	let isDragging = $state(false);
	let input = $state<HTMLInputElement | null>(null);

	function open() {
		if (!disabled) input?.click();
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (disabled) return;
		const file = event.dataTransfer?.files[0];
		if (file) onSelect(file);
	}
</script>

<div
	role="button"
	tabindex={disabled ? -1 : 0}
	aria-disabled={disabled}
	aria-label={`${title}, atau tekan untuk memilih file. ${hint}`}
	ondragenter={(event) => {
		event.preventDefault();
		isDragging = !disabled;
	}}
	ondragover={(event) => {
		event.preventDefault();
		isDragging = !disabled;
	}}
	ondragleave={() => (isDragging = false)}
	ondrop={handleDrop}
	onclick={open}
	onkeydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			open();
		}
	}}
	class={`flex min-h-[190px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
		disabled
			? 'cursor-not-allowed border-border-subtle bg-surface-base opacity-60'
			: isDragging
				? 'cursor-pointer border-brand-primary-strong bg-brand-tint'
				: 'cursor-pointer border-border-strong bg-surface-base hover:border-brand-primary-strong'
	}`}
>
	<input
		bind:this={input}
		type="file"
		{accept}
		class="hidden"
		tabindex="-1"
		onchange={(event) => {
			const file = event.currentTarget.files?.[0];
			event.currentTarget.value = '';
			if (file) onSelect(file);
		}}
	/>
	<IconUploadCloud class="size-6 text-text-muted" aria-hidden="true" />
	<p class="mt-2 text-sm font-medium text-text-secondary">{title}</p>
	<p class="mt-1 text-xs text-text-muted">atau klik untuk memilih file</p>
	<span
		class="mt-2.5 rounded-full border border-border-subtle bg-surface-raised px-2.5 py-[3px] font-mono text-xs text-text-muted"
	>
		{hint}
	</span>
</div>
