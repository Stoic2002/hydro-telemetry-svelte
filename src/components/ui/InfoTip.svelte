<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Tooltip } from 'bits-ui';
	import IconInfo from '~icons/ph/info';

	interface Props {
		/** Isi keterangan. Untuk teks berformat (tebal, baris baru) pakai `children`. */
		text?: string;
		children?: Snippet;
		/** Nama tombolnya bagi pembaca layar, mis. "Keterangan kolom Prediksi". */
		label?: string;
		side?: 'top' | 'right' | 'bottom' | 'left';
		class?: string;
	}

	/**
	 * Keterangan penjelas yang muncul saat ikon (i) diarahkan kursor atau
	 * difokus keyboard — bukan kalimat yang selalu tertulis di halaman
	 * (permintaan tim 9 Nov 2026: halaman dan form tidak boleh "kotor" oleh
	 * catatan). Hanya untuk penjelasan. Galat validasi dan peringatan yang harus
	 * dibaca sebelum bertindak tetap ditulis langsung.
	 *
	 * Perilaku hover, fokus, Escape, dan `aria-describedby` datang dari bits-ui.
	 * Isinya dirender lewat portal dengan `z-200`, di atas sheet (`z-100`) dan di
	 * bawah toast (`z-300`), supaya tidak terpotong wadah ber-`overflow-hidden`.
	 */
	let {
		text,
		children,
		label = 'Keterangan',
		side = 'top',
		class: className = ''
	}: Props = $props();
</script>

<Tooltip.Provider delayDuration={150}>
	<Tooltip.Root>
		<Tooltip.Trigger
			type="button"
			aria-label={label}
			class={`inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full align-middle text-text-muted transition-colors hover:text-text-secondary ${className}`}
		>
			<IconInfo class="size-3.5" aria-hidden="true" />
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				{side}
				sideOffset={6}
				collisionPadding={12}
				class="chart-tooltip z-200 max-w-72 text-xs leading-5 font-normal text-text-on-inverse"
			>
				{#if children}
					{@render children()}
				{:else}
					{text}
				{/if}
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>
