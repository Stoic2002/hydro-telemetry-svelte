<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as currentPage } from '$app/state';
	import IconBuilding from '~icons/ph/buildings';
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import Select from '$components/controls/Select.svelte';
	import Skeleton from '$components/controls/Skeleton.svelte';
	import { getActivePLTAId } from '../active-plta-context';
	import { createPlantCatalogQuery } from '../api/queries';
	import { getPlantDisplayName } from '../presentation';
	import { getPLTADashboardPath, type PLTADashboardPage } from '../routing';

	interface Props {
		page: PLTADashboardPage;
		class?: string;
	}

	let { page, class: className = '' }: Props = $props();

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePlantId = $derived(getActivePLTAId());
	const plantsQuery = createPlantCatalogQuery();

	const options = $derived(
		(plantsQuery.data ?? []).map((plant) => ({
			value: plant.id,
			label: `${getPlantDisplayName(plant)} · ${plant.code}${plant.isActive ? '' : ' (Tidak aktif)'}`
		}))
	);

	function switchPlant(nextPlantId: string) {
		if (!nextPlantId || nextPlantId === activePlantId) return;

		// Query string dipertahankan: filter periode dan pencarian yang sedang
		// dipakai operator tidak boleh hilang hanya karena berpindah PLTA.
		void goto(`${getPLTADashboardPath(nextPlantId, page)}${currentPage.url.search}`);
	}
</script>

{#if plantsQuery.isPending}
	<div role="status" aria-label="Memuat pilihan PLTA" class={`shrink-0 ${className}`}>
		<Skeleton class="h-10 w-full rounded-lg sm:w-[260px]" />
		<span class="sr-only">Memuat pilihan PLTA...</span>
	</div>
{:else if plantsQuery.isError}
	<button
		type="button"
		onclick={() => void plantsQuery.refetch()}
		class={`btn btn-ghost h-10 w-full shrink-0 border-status-danger-strong/30 text-status-danger-strong sm:w-[260px] ${className}`}
	>
		<IconRefresh class="size-4" />
		Muat ulang daftar PLTA
	</button>
{:else if options.length === 0}
	<div
		class={`flex h-10 w-full shrink-0 items-center rounded-lg border border-border-subtle bg-surface-base px-3 text-xs text-text-muted sm:w-[260px] ${className}`}
	>
		Belum ada PLTA tersedia
	</div>
{:else}
	<Select
		ariaLabel="Pilih PLTA"
		value={activePlantId}
		onValueChange={switchPlant}
		{options}
		class={`shrink-0 sm:w-[260px] ${className}`}
	>
		{#snippet leadingIcon()}<IconBuilding />{/snippet}
	</Select>
{/if}
