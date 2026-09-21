<script lang="ts">
	import { parseEmphasis } from './guide';

	/**
	 * Merender `**tebal**` tanpa `{@html}`. Isi panduan memang ditulis sendiri,
	 * tapi merender string sebagai HTML membuka jalan bagi markup yang tidak
	 * disengaja — dan satu-satunya format yang dibutuhkan hanya huruf tebal.
	 */
	let { text }: { text: string } = $props();

	const parts = $derived(parseEmphasis(text));
</script>

{#each parts as part, index (index)}{#if part.strong}<strong class="font-semibold text-text-primary"
			>{part.text}</strong
		>{:else}{part.text}{/if}{/each}
