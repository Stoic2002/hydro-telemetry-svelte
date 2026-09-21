<script lang="ts">
	import Skeleton from '$components/controls/Skeleton.svelte';
	import {
		createPlantCatalogQuery,
		createRiverBasinsQuery,
		getPLTAErrorMessage
	} from '$features/plta';
	import CatalogTable from './CatalogTable.svelte';
	import { PAGE_LIMIT } from './model';

	let page = $state(1);
	let searchInput = $state('');
	let search = $state('');

	const riverBasinsQuery = createRiverBasinsQuery(() => ({
		page,
		limit: PAGE_LIMIT,
		search: search || undefined
	}));
	const plantsCatalogQuery = createPlantCatalogQuery();

	// Jumlah PLTA per wilayah sungai tidak disediakan endpoint-nya, jadi dihitung
	// dari katalog PLTA yang memang sudah dimuat untuk sidebar.
	const plantCountsByRiverBasin = $derived.by(() => {
		// Objek biasa, bukan Map: nilainya dibangun ulang setiap kali katalog
		// berubah dan tidak pernah dimutasi setelah itu, jadi tidak perlu struktur
		// reaktif seperti `SvelteMap`.
		const counts: Record<string, number> = {};
		for (const plant of plantsCatalogQuery.data ?? []) {
			counts[plant.riverBasinId] = (counts[plant.riverBasinId] ?? 0) + 1;
		}
		return counts;
	});

	const riverBasins = $derived(riverBasinsQuery.data?.items ?? []);
	const totalPages = $derived(Math.max(riverBasinsQuery.data?.pages ?? 1, 1));

	function applySearch(event: SubmitEvent) {
		event.preventDefault();
		search = searchInput.trim();
		page = 1;
	}

	function clearSearch() {
		searchInput = '';
		search = '';
		page = 1;
	}
</script>

<CatalogTable
	columns={[
		{ key: 'code', label: 'Kode', class: 'w-32' },
		{ key: 'name', label: 'Wilayah Sungai' },
		{ key: 'description', label: 'Deskripsi', class: 'w-[38%]' },
		{ key: 'plants', label: 'Jumlah PLTA', class: 'w-36 text-center' }
	]}
	minWidthClass="min-w-[760px]"
	{searchInput}
	searchPlaceholder="Cari kode, nama, atau deskripsi wilayah sungai..."
	onSearchInputChange={(value) => (searchInput = value)}
	onSearch={applySearch}
	onClearSearch={search || searchInput ? clearSearch : undefined}
	isLoading={riverBasinsQuery.isLoading}
	isFetching={riverBasinsQuery.isFetching || plantsCatalogQuery.isFetching}
	isError={riverBasinsQuery.isError}
	errorMessage={riverBasinsQuery.isError ? getPLTAErrorMessage(riverBasinsQuery.error) : undefined}
	onRetry={() => {
		void riverBasinsQuery.refetch();
		if (plantsCatalogQuery.isError) void plantsCatalogQuery.refetch();
	}}
	isEmpty={riverBasins.length === 0}
	emptyTitle={search ? 'Wilayah sungai tidak ditemukan' : 'Belum ada wilayah sungai'}
	emptyDescription={search
		? 'Coba gunakan kata kunci lain atau bersihkan pencarian.'
		: 'Server belum memiliki data wilayah sungai yang dapat ditampilkan.'}
	{page}
	{totalPages}
	total={riverBasinsQuery.data?.total ?? 0}
	itemLabel="wilayah sungai"
	onPreviousPage={() => (page = Math.max(page - 1, 1))}
	onNextPage={() => (page = Math.min(page + 1, totalPages))}
>
	{#snippet rows()}
		{#each riverBasins as riverBasin (riverBasin.id)}
			<tr
				class="border-b border-surface-overlay transition-colors last:border-b-0 hover:bg-surface-base/60"
			>
				<td class="px-3.5 py-2.5 font-mono text-xs font-medium text-text-secondary tabular-nums">
					{riverBasin.code}
				</td>
				<td class="px-3.5 py-2.5 text-sm font-medium text-text-primary">{riverBasin.name}</td>
				<td class="px-3.5 py-2.5 text-xs leading-normal text-text-muted">
					<span class="line-clamp-2">{riverBasin.description || '—'}</span>
				</td>
				<td class="px-3.5 py-2.5 text-center text-sm font-medium text-text-secondary">
					{#if plantsCatalogQuery.isPending}
						<Skeleton class="mx-auto h-3.5 w-8 rounded-sm" />
					{:else if plantsCatalogQuery.isError}
						—
					{:else}
						{plantCountsByRiverBasin[riverBasin.id] ?? 0}
					{/if}
				</td>
			</tr>
		{/each}
	{/snippet}
</CatalogTable>
