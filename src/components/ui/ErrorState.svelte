<script lang="ts">
	import Button from '../controls/Button.svelte';

	interface Props {
		title: string;
		/** Kalimat ramah non-teknis — jangan tampilkan pesan mentah dari server. */
		description: string;
		retryLabel?: string;
		isRetrying?: boolean;
		onRetry?: () => void;
		class?: string;
	}

	/**
	 * Gagal memuat halaman ditampilkan inline, bukan lewat toast: di layar itu
	 * tidak ada isi lain, dan toast keburu hilang sebelum sempat dibaca.
	 *
	 * Untuk kegagalan sebagian — sebagian data gagal tapi layar tetap berguna —
	 * pakai `Banner` bertona warning, bukan komponen ini.
	 */
	let {
		title,
		description,
		retryLabel = 'Coba lagi',
		isRetrying = false,
		onRetry,
		class: className = ''
	}: Props = $props();
</script>

<div class={`px-6 py-12 text-center ${className}`}>
	<p class="text-sm font-medium text-text-primary">{title}</p>
	<p class="mx-auto mt-1 max-w-sm text-sm text-text-muted">{description}</p>
	{#if onRetry}
		<div class="mt-4 flex justify-center">
			<Button type="button" variant="ghost" size="sm" isLoading={isRetrying} onclick={onRetry}>
				{isRetrying ? 'Memuat…' : retryLabel}
			</Button>
		</div>
	{/if}
</div>
