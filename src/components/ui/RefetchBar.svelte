<script lang="ts">
	/**
	 * Indikator refetch: garis tipis di atas tabel, isi tabel tetap tampil.
	 * Jangan mengosongkan tabel saat data sedang diperbarui.
	 */
	let { isRefetching }: { isRefetching: boolean } = $props();
</script>

<div aria-hidden="true" class="h-0.5 shrink-0">
	{#if isRefetching}
		<div class="refetch-bar"></div>
	{/if}
</div>
