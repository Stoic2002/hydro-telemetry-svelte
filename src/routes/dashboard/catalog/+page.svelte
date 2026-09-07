<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import Tabs from '$components/ui/Tabs.svelte';
	import PlantsCatalog from './PlantsCatalog.svelte';
	import RiverBasinsCatalog from './RiverBasinsCatalog.svelte';
	import TagsCatalog from './TagsCatalog.svelte';
	import { parseCatalogView, type CatalogView } from './model';

	/**
	 * Tab aktif dan PLTA terpilih disimpan di query string, bukan state komponen:
	 * operator sering membagikan tautan ke tab tertentu, dan tombol Kembali harus
	 * mengembalikan tab sebelumnya.
	 */
	const activeView = $derived(parseCatalogView(page.url.searchParams.get('view')));
	const requestedPlantId = $derived(page.url.searchParams.get('plta') ?? '');

	async function updateParams(mutate: (params: URLSearchParams) => void) {
		// Salinan sekali pakai untuk menyusun URL berikutnya; dibuang setelah
		// `goto`, jadi tidak perlu `SvelteURLSearchParams`.
		const params = new URLSearchParams(page.url.searchParams);
		mutate(params);
		await goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function setView(view: CatalogView) {
		void updateParams((params) => {
			params.set('view', view);
			// `plta` hanya bermakna di tab tag; membawanya ke tab lain akan
			// meninggalkan parameter yatim di URL.
			if (view !== 'tags') params.delete('plta');
		});
	}

	function openTags(pltaId: string) {
		void updateParams((params) => {
			params.set('view', 'tags');
			params.set('plta', pltaId);
		});
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		title="Katalog Monitoring"
		description="Lihat struktur Wilayah Sungai, PLTA, serta tag dan parameter yang tersedia di server."
	>
		{#snippet actions()}
			<Tabs
				idPrefix="catalog"
				ariaLabel="Jenis katalog monitoring"
				activeValue={activeView}
				onChange={setView}
				items={[
					{ value: 'ws' as const, label: 'Wilayah Sungai' },
					{ value: 'plta' as const, label: 'PLTA' },
					{ value: 'tags' as const, label: 'Tag & Parameter' }
				]}
			/>
		{/snippet}
	</PageHeader>

	<div
		id={`catalog-panel-${activeView}`}
		role="tabpanel"
		aria-labelledby={`catalog-tab-${activeView}`}
		tabindex="0"
		class="outline-none"
	>
		{#if activeView === 'ws'}
			<RiverBasinsCatalog />
		{:else if activeView === 'plta'}
			<PlantsCatalog onOpenTags={openTags} />
		{:else}
			<TagsCatalog {requestedPlantId} onPlantChange={openTags} />
		{/if}
	</div>
</div>
