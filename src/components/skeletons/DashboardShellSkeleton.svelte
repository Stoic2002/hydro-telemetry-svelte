<script lang="ts">
	import Skeleton from '../atoms/Skeleton.svelte';
	import DashboardPageSkeleton from './DashboardPageSkeleton.svelte';
	import { getDashboardSkeletonVariant } from './dashboardSkeletonVariant';

	/**
	 * Skeleton untuk shell dashboard, dipakai sebelum layout aslinya siap dirender.
	 *
	 * Ukuran sidebar, header, dan padding di sini sengaja disamakan dengan
	 * `DashboardLayout`. Sebelumnya tahap pertama pemuatan memakai skeleton generik
	 * tanpa sidebar, sehingga seluruh layout melompat begitu shell aslinya muncul.
	 *
	 * Varian isi halaman ditentukan dari path yang sedang dibuka, jadi bentuk
	 * shimmer pertama sudah sama dengan konten yang akan menggantikannya.
	 */
	let {
		pathname = typeof window === 'undefined' ? '' : window.location.pathname
	}: { pathname?: string } = $props();

	function range(length: number): number[] {
		return Array.from({ length }, (_, index) => index);
	}
</script>

<div role="status" aria-label="Memuat dashboard" class="flex min-h-screen min-w-0 bg-surface-base">
	<aside
		class="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border-subtle bg-surface-raised lg:flex"
	>
		<div class="flex h-[72px] shrink-0 items-center gap-2.5 border-b border-border-subtle px-4">
			<Skeleton class="size-9 shrink-0 rounded-xl" />
			<div class="flex flex-1 flex-col gap-1.5">
				<Skeleton class="h-3 w-28 rounded" />
				<Skeleton class="h-2 w-16 rounded" />
			</div>
		</div>

		<nav class="flex flex-1 flex-col gap-0.5 p-3">
			{#each range(7) as index (index)}
				<div class="flex h-10 items-center gap-2.5 px-3">
					<Skeleton class="size-[18px] shrink-0 rounded" />
					<Skeleton class="h-3 flex-1 rounded" />
				</div>
			{/each}
		</nav>

		<div class="flex h-[68px] shrink-0 items-center gap-2.5 border-t border-border-subtle px-4">
			<Skeleton class="size-9 shrink-0 rounded-full" />
			<div class="flex flex-1 flex-col gap-1.5">
				<Skeleton class="h-3 w-24 rounded" />
				<Skeleton class="h-2 w-16 rounded" />
			</div>
		</div>
	</aside>

	<div class="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">
		<header
			class="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border-subtle bg-surface-raised/95 px-4 lg:hidden"
		>
			<Skeleton class="size-10 shrink-0 rounded-xl" />
			<Skeleton class="size-8 shrink-0 rounded-xl" />
			<Skeleton class="h-3 w-32 rounded" />
		</header>

		<main class="mx-auto w-full max-w-[1440px] min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
			<DashboardPageSkeleton variant={getDashboardSkeletonVariant(pathname)} />
		</main>
	</div>

	<span class="sr-only">Memuat dashboard...</span>
</div>
