<script lang="ts">
	import IconSearch from '~icons/ph/magnifying-glass';

	interface Props {
		value?: string;
		placeholder: string;
		/** Nama untuk pembaca layar; placeholder bukan label. */
		ariaLabel: string;
		onSubmit: (event: SubmitEvent) => void;
		/** Bila diisi, tombol "Bersihkan" muncul selama ada teks. */
		onClear?: () => void;
		/** Dipanggil tiap ketikan — untuk pemanggil yang menyimpan nilainya sendiri. */
		onValueChange?: (value: string) => void;
		class?: string;
	}

	/**
	 * Kolom cari daftar (Laporan, Katalog Data, User Management): ikon, isian
	 * `.field`, tombol Cari, dan Bersihkan opsional. Dulu ditulis ulang di tiap
	 * layar dan User Management sudah menyimpang — radius 8px, 12,5px, dan
	 * tombol Cari buatan sendiri.
	 */
	let {
		value = $bindable(''),
		placeholder,
		ariaLabel,
		onSubmit,
		onClear,
		onValueChange,
		class: className = ''
	}: Props = $props();
</script>

<form role="search" onsubmit={onSubmit} class={`flex min-w-0 items-center gap-2 ${className}`}>
	<div class="relative flex min-w-0 flex-1 items-center">
		<IconSearch
			class="pointer-events-none absolute left-3 size-4 shrink-0 text-text-muted"
			aria-hidden="true"
		/>
		<input
			type="search"
			bind:value
			oninput={(event) => onValueChange?.(event.currentTarget.value)}
			maxlength={100}
			{placeholder}
			aria-label={ariaLabel}
			class="field h-9 pl-9 text-[13px]"
		/>
	</div>
	<button type="submit" class="btn btn-ghost btn-sm h-9 shrink-0">Cari</button>
	{#if onClear && value.length > 0}
		<button
			type="button"
			onclick={onClear}
			class="h-9 shrink-0 cursor-pointer rounded-lg px-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-surface-overlay"
		>
			Bersihkan
		</button>
	{/if}
</form>
