<script lang="ts">
	import Skeleton from '../controls/Skeleton.svelte';
	import type { DashboardSkeletonVariant } from './dashboardSkeletonVariant';

	let { variant = 'default' }: { variant?: DashboardSkeletonVariant } = $props();

	/** Deret indeks untuk `{#each}` — pengganti `Array.from(...).map()` di JSX. */
	function range(length: number): number[] {
		return Array.from({ length }, (_, index) => index);
	}
</script>

{#snippet pageHeading()}
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
		<div class="space-y-2">
			<Skeleton class="h-6 w-44 rounded-xl" />
			<Skeleton class="h-3 w-72 max-w-[70vw] rounded" />
		</div>
		<Skeleton class="h-10 w-44 max-w-full rounded-full" />
	</div>
{/snippet}

{#snippet tableVariant()}
	<div class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
		<div
			class="flex flex-col gap-3 border-b border-border-subtle p-4 sm:flex-row sm:justify-between"
		>
			<Skeleton class="h-10 w-full rounded-xl sm:w-72" />
			<Skeleton class="h-10 w-32 rounded-full" />
		</div>
		<div class="overflow-hidden">
			<div class="grid grid-cols-[1.5fr_1fr_0.8fr_88px] gap-4 bg-surface-base px-4 py-3">
				{#each range(4) as index (index)}
					<Skeleton class="h-3 w-full rounded" />
				{/each}
			</div>
			{#each range(6) as rowIndex (rowIndex)}
				<div
					class="grid grid-cols-[1.5fr_1fr_0.8fr_88px] gap-4 border-t border-surface-overlay px-4 py-4"
				>
					{#each range(4) as columnIndex (columnIndex)}
						<Skeleton class="h-3 w-full rounded" />
					{/each}
				</div>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet telemeteringVariant()}
	<div class="border-t border-border-subtle pt-5">
		<div class="flex justify-between">
			<Skeleton class="h-5 w-40 rounded" />
			<Skeleton class="h-3 w-12 rounded" />
		</div>
		<Skeleton class="mt-4 h-28 w-full rounded-xl" />
		<div class="mt-5 grid gap-5 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
			<Skeleton class="h-[360px] rounded-xl" />
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
				<Skeleton class="h-[172px] rounded-xl" />
				<Skeleton class="h-[172px] rounded-xl" />
			</div>
		</div>
	</div>
	<div class="border-t border-border-subtle pt-5">
		<Skeleton class="h-5 w-36 rounded" />
		<div class="mt-4 grid gap-4 xl:grid-cols-3">
			{#each range(3) as index (index)}
				<Skeleton class="h-72 rounded-xl" />
			{/each}
		</div>
		<Skeleton class="mt-5 h-[380px] rounded-xl" />
	</div>
{/snippet}

{#snippet trendsVariant()}
	<div class="flex flex-col gap-4 border-y border-border-subtle py-4 sm:flex-row">
		<Skeleton class="h-10 w-full rounded-xl sm:w-64" />
		<Skeleton class="h-10 w-full rounded-xl sm:w-64" />
	</div>
	<div class="rounded-xl border border-border-subtle bg-surface-raised p-4 sm:p-6">
		<div class="flex justify-between gap-4">
			<div class="space-y-2">
				<Skeleton class="h-5 w-28 rounded" />
				<Skeleton class="h-3 w-40 rounded" />
			</div>
			<Skeleton class="h-9 w-28 rounded-full" />
		</div>
		<div class="mt-5 grid grid-cols-2 border-y border-surface-overlay lg:grid-cols-4">
			{#each range(4) as index (index)}
				<div class="px-3 py-3 sm:px-4">
					<Skeleton class="h-2.5 w-16 rounded" />
					<Skeleton class="mt-2 h-4 w-24 max-w-full rounded" />
				</div>
			{/each}
		</div>
		<Skeleton class="mt-5 h-[330px] rounded-xl" />
	</div>
{/snippet}

{#snippet forecastingVariant()}
	<div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
		{#each range(4) as index (index)}
			<Skeleton class="h-24 rounded-xl" />
		{/each}
	</div>
	<Skeleton class="h-[420px] rounded-xl" />
{/snippet}

{#snippet loadingText()}
	<!--
		Form, dialog, dan panel kecil tidak memakai skeleton: bentuknya tidak
		sepadat tabel atau grafik, jadi kerangka palsu justru menambah kedipan.
		Teks ini yang menggantikannya.
	-->
	<p class="loading-text">Memuat…</p>
{/snippet}

<div role="status" aria-label="Memuat halaman" class="flex w-full flex-col gap-5 py-1">
	{@render pageHeading()}

	{#if variant === 'overview'}
		<Skeleton class="h-[560px] rounded-xl" />
	{:else if variant === 'telemetering'}
		{@render telemeteringVariant()}
	{:else if variant === 'trends'}
		{@render trendsVariant()}
	{:else if variant === 'forecasting'}
		{@render forecastingVariant()}
	{:else if variant === 'table'}
		{@render tableVariant()}
	{:else if variant === 'upload'}
		{@render loadingText()}
	{:else if variant === 'form'}
		{@render loadingText()}
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each range(3) as index (index)}
				<Skeleton class="h-28 rounded-xl" />
			{/each}
		</div>
		<Skeleton class="h-[360px] rounded-xl" />
	{/if}

	<span class="sr-only">Memuat halaman...</span>
</div>
