<script lang="ts">
	import Skeleton from '../atoms/Skeleton.svelte';
</script>

<div
	role="status"
	aria-label="Memuat peta"
	class="relative h-[clamp(280px,55vw,560px)] w-full overflow-hidden rounded-xl border border-surface-overlay bg-surface-raised p-5"
>
	<Skeleton class="h-full w-full rounded-xl" />
	<div class="absolute bottom-8 left-8 flex gap-3">
		<Skeleton class="size-5 rounded-full" />
		<Skeleton class="size-5 rounded-full" />
		<Skeleton class="size-5 rounded-full" />
	</div>
	<span class="sr-only">Memuat peta...</span>
</div>
