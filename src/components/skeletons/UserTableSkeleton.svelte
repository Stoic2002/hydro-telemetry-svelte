<script lang="ts">
	import Skeleton from '../controls/Skeleton.svelte';

	let { rows = 10 }: { rows?: number } = $props();
</script>

<div role="status" aria-label="Memuat daftar pengguna" class="flex flex-col">
	{#each Array.from({ length: rows }, (_, index) => index) as index (index)}
		<div class="flex h-[65px] items-center gap-4 border-b border-surface-overlay px-5">
			<div class="flex flex-1 items-center gap-3">
				<Skeleton class="size-9 shrink-0 rounded-full" />
				<div class="flex flex-col gap-2">
					<Skeleton class={`h-3.5 rounded-xl ${index % 2 === 0 ? 'w-36' : 'w-44'}`} />
					<Skeleton class="h-2.5 w-52 max-w-[32vw] rounded-[4px]" />
				</div>
			</div>
			<div class="hidden w-[160px] shrink-0 sm:block">
				<Skeleton class="h-6 w-24 rounded-full" />
			</div>
			<div class="hidden w-[140px] shrink-0 sm:block">
				<Skeleton class="h-3 w-16 rounded-[4px]" />
			</div>
			<div class="w-[70px] shrink-0"><Skeleton class="size-7 rounded-xl" /></div>
		</div>
	{/each}
	<span class="sr-only">Memuat daftar pengguna...</span>
</div>
