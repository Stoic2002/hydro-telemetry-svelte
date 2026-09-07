<script lang="ts">
	import { createPLTAListQuery, createRiverBasinsQuery, getPLTAErrorMessage } from '$features/plta';
	import CatalogTable from './CatalogTable.svelte';
	import { PAGE_LIMIT, RIVER_BASIN_LOOKUP_LIMIT, formatCoordinate } from './model';

	let { onOpenTags }: { onOpenTags: (pltaId: string) => void } = $props();

	let page = $state(1);
	let searchInput = $state('');
	let search = $state('');

	const plantsQuery = createPLTAListQuery(() => ({
		page,
		limit: PAGE_LIMIT,
		search: search || undefined
	}));

	// Nama wilayah sungai diambil sekali dalam satu halaman besar, bukan per baris:
	// respons PLTA hanya membawa `riverBasinId`.
	const riverBasinsQuery = createRiverBasinsQuery(() => ({
		page: 1,
		limit: RIVER_BASIN_LOOKUP_LIMIT
	}));

	const riverBasinNames = $derived(
		Object.fromEntries(
			(riverBasinsQuery.data?.items ?? []).map(
				(riverBasin) => [riverBasin.id, riverBasin.name] as const
			)
		)
	);

	const plants = $derived(plantsQuery.data?.items ?? []);
	const totalPages = $derived(Math.max(plantsQuery.data?.pages ?? 1, 1));
	const tableError = $derived(
		plantsQuery.isError
			? plantsQuery.error
			: riverBasinsQuery.isError
				? riverBasinsQuery.error
				: undefined
	);

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

	function formatCapacity(capacityMw: number | null): string {
		if (capacityMw === null) return '—';
		return `${capacityMw.toLocaleString('id-ID', { maximumFractionDigits: 2 })} MW`;
	}
</script>

<CatalogTable
	columns={[
		{ key: 'plant', label: 'PLTA', class: 'min-w-52' },
		{ key: 'river-basin', label: 'Wilayah Sungai', class: 'min-w-44' },
		{ key: 'capacity', label: 'Kapasitas', class: 'w-32' },
		{ key: 'coordinates', label: 'Koordinat', class: 'min-w-52' },
		{ key: 'status', label: 'Status', class: 'w-28' },
		{ key: 'action', label: 'Aksi', class: 'w-36' }
	]}
	minWidthClass="min-w-[1040px]"
	{searchInput}
	searchPlaceholder="Cari kode, nama, atau deskripsi PLTA..."
	onSearchInputChange={(value) => (searchInput = value)}
	onSearch={applySearch}
	onClearSearch={search || searchInput ? clearSearch : undefined}
	isLoading={plantsQuery.isLoading || riverBasinsQuery.isLoading}
	isFetching={plantsQuery.isFetching || riverBasinsQuery.isFetching}
	isError={Boolean(tableError)}
	errorMessage={tableError ? getPLTAErrorMessage(tableError) : undefined}
	onRetry={() => {
		void plantsQuery.refetch();
		void riverBasinsQuery.refetch();
	}}
	isEmpty={plants.length === 0}
	emptyTitle={search ? 'PLTA tidak ditemukan' : 'Belum ada PLTA'}
	emptyDescription={search
		? 'Coba gunakan kata kunci lain atau bersihkan pencarian.'
		: 'Server belum memiliki data PLTA yang dapat ditampilkan.'}
	{page}
	{totalPages}
	total={plantsQuery.data?.total ?? 0}
	itemLabel="PLTA"
	onPreviousPage={() => (page = Math.max(page - 1, 1))}
	onNextPage={() => (page = Math.min(page + 1, totalPages))}
>
	{#snippet rows()}
		{#each plants as plant (plant.id)}
			<tr
				class="border-b border-surface-overlay transition-colors last:border-b-0 hover:bg-surface-base/60"
			>
				<td class="px-3.5 py-2.5">
					<div class="flex min-w-0 flex-col gap-0.5">
						<span class="truncate text-sm font-medium text-text-primary">{plant.name}</span>
						<span class="font-mono text-xs font-medium text-text-muted">{plant.code}</span>
					</div>
				</td>
				<td class="px-3.5 py-2.5 text-sm text-text-secondary">
					{riverBasinNames[plant.riverBasinId] ?? 'Wilayah sungai tidak ditemukan'}
				</td>
				<td class="px-3.5 py-2.5 font-mono text-xs font-medium text-text-secondary tabular-nums">
					{formatCapacity(plant.capacityMw)}
				</td>
				<td class="px-3.5 py-2.5 font-mono text-xs text-text-muted">
					{formatCoordinate(plant.latitude)}, {formatCoordinate(plant.longitude)}
				</td>
				<td class="px-3.5 py-2.5">
					<span class="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
						<span
							class={`size-2 rounded-full ${plant.isActive ? 'bg-status-success-strong' : 'bg-disabled'}`}
						></span>
						{plant.isActive ? 'Aktif' : 'Nonaktif'}
					</span>
				</td>
				<td class="px-3.5 py-2.5">
					<button type="button" onclick={() => onOpenTags(plant.id)} class="btn btn-ghost btn-sm">
						Lihat Parameter
					</button>
				</td>
			</tr>
		{/each}
	{/snippet}
</CatalogTable>
