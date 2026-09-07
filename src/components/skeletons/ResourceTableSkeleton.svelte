<script lang="ts">
	import Skeleton from '../atoms/Skeleton.svelte';

	let { columns, rows = 10 }: { columns: number; rows?: number } = $props();

	// Dirender langsung sebagai deretan <tr>, jadi komponen ini harus dipasang di
	// dalam <tbody> pemanggilnya — sama seperti versi React yang mengembalikan
	// array baris tanpa pembungkus.
	function cellWidth(rowIndex: number, columnIndex: number): string {
		const bucket = (rowIndex + columnIndex) % 3;
		if (bucket === 0) return 'w-28';
		if (bucket === 1) return 'w-20';
		return 'w-16';
	}
</script>

{#each Array.from({ length: rows }, (_, index) => index) as rowIndex (rowIndex)}
	<tr aria-hidden="true" class="border-b border-surface-overlay last:border-b-0">
		{#each Array.from({ length: columns }, (_, index) => index) as columnIndex (columnIndex)}
			<td class="px-3.5 py-2.5">
				<Skeleton class={`h-[11px] rounded-[4px] ${cellWidth(rowIndex, columnIndex)}`} />
			</td>
		{/each}
	</tr>
{/each}
