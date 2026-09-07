<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Label induk yang tampil tipis di atas judul, mis. nama menu bertingkat. */
		eyebrow?: string;
		title: string;
		/** Satu kalimat ringkas. Judul halaman tidak memakai ikon dekoratif. */
		description: string;
		/** Filter atau aksi utama, ditempatkan di kanan judul. */
		actions?: Snippet;
		class?: string;
	}

	/**
	 * Pola header halaman yang sama di sepuluh layar: judul dan satu deskripsi di
	 * kiri, filter/aksi di kanan, lalu garis 1px penuh sebagai batas ke konten.
	 * Garis itu yang menggantikan kartu pembungkus.
	 */
	let { eyebrow, title, description, actions, class: className = '' }: Props = $props();
</script>

<header
	class={`flex flex-col justify-between gap-4 border-b border-border-subtle pb-6 xl:flex-row xl:items-start ${className}`}
>
	<div class="flex min-w-0 flex-col gap-1">
		{#if eyebrow}
			<span class="text-[11px] leading-none font-medium text-text-muted">{eyebrow}</span>
		{/if}
		<h1 class="page-title">{title}</h1>
		<p class="page-description">{description}</p>
	</div>

	{#if actions}
		<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>
	{/if}
</header>
