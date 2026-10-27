<script lang="ts">
	import IconBuilding from '~icons/ph/buildings';
	import IconDatabase from '~icons/ph/database';
	import IconPencil from '~icons/ph/pencil-line';
	import IconPlus from '~icons/ph/plus';
	import IconTag from '~icons/ph/tag';
	import Badge from '$components/controls/Badge.svelte';
	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
	import { authStore, canEditTagBounds, canManagePlants } from '$features/auth';
	import {
		createPLTATagsQuery,
		createPlantCatalogQuery,
		describeTagBounds,
		getPLTAErrorMessage,
		type PlantTag,
		type PlantTagProtocol
	} from '$features/plta';
	import TagBoundsSheet from '$features/plta/components/TagBoundsSheet.svelte';
	import TagFormSheet from '$features/plta/components/TagFormSheet.svelte';
	import CatalogTable from './CatalogTable.svelte';
	import { PAGE_LIMIT, TAG_PROTOCOLS } from './model';

	let {
		requestedPlantId,
		onPlantChange
	}: { requestedPlantId: string; onPlantChange: (pltaId: string) => void } = $props();

	let page = $state(1);
	let searchInput = $state('');
	let search = $state('');
	let protocol = $state('');
	let enabled = $state('');
	let editingTag = $state<PlantTag | null>(null);

	const canEdit = $derived(canEditTagBounds(authStore.user));
	/** Menambah parameter khusus admin (`POST /tags` menolak non-admin dengan 403). */
	const canAddTag = $derived(canManagePlants(authStore.user));
	let isTagFormOpen = $state(false);

	const plantsCatalogQuery = createPlantCatalogQuery();
	const plants = $derived(plantsCatalogQuery.data ?? []);

	// PLTA pada URL bisa saja sudah tidak ada di server; kalau begitu jatuh ke
	// PLTA aktif pertama, bukan menampilkan tabel kosong tanpa penjelasan.
	const selectedPlantId = $derived.by(() => {
		if (plants.some((plant) => plant.id === requestedPlantId)) return requestedPlantId;
		return (plants.find((plant) => plant.isActive) ?? plants[0])?.id ?? '';
	});

	const tagsQuery = createPLTATagsQuery(
		() => selectedPlantId,
		() => ({
			page,
			limit: PAGE_LIMIT,
			search: search || undefined,
			protocol: (protocol || undefined) as PlantTagProtocol | undefined,
			enabled: enabled === '' ? undefined : enabled === 'true'
		})
	);

	const tags = $derived(tagsQuery.data?.items ?? []);
	const totalPages = $derived(Math.max(tagsQuery.data?.pages ?? 1, 1));
	const tableError = $derived(
		plantsCatalogQuery.isError
			? plantsCatalogQuery.error
			: tagsQuery.isError
				? tagsQuery.error
				: undefined
	);

	const hasFilter = $derived(Boolean(search || protocol || enabled));

	const plantOptions = $derived(
		plants.length === 0
			? [{ value: '', label: 'Belum ada PLTA' }]
			: plants.map((plant) => ({ value: plant.id, label: `${plant.name} · ${plant.code}` }))
	);

	const selectedPlantName = $derived(
		plants.find((plant) => plant.id === selectedPlantId)?.name ?? ''
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
</script>

<CatalogTable
	columns={[
		{ key: 'parameter', label: 'Parameter', class: 'min-w-48' },
		{ key: 'station', label: 'Stasiun', class: 'min-w-40' },
		{ key: 'protocol', label: 'Protokol', class: 'w-28' },
		{ key: 'address', label: 'Alamat', class: 'min-w-60' },
		{ key: 'calibration', label: 'Scale / Offset', class: 'w-36' },
		{ key: 'bounds', label: 'Batas valid', class: 'w-36' },
		{ key: 'unit', label: 'Satuan', class: 'w-28' },
		{ key: 'status', label: 'Status', class: 'w-28' },
		...(canEdit ? [{ key: 'actions', label: 'Aksi', class: 'w-28' }] : [])
	]}
	minWidthClass={canEdit ? 'min-w-[1380px]' : 'min-w-[1260px]'}
	{searchInput}
	searchPlaceholder="Cari parameter, stasiun, protokol, atau alamat..."
	onSearchInputChange={(value) => (searchInput = value)}
	onSearch={applySearch}
	onClearSearch={search || searchInput ? clearSearch : undefined}
	isLoading={plantsCatalogQuery.isLoading || (Boolean(selectedPlantId) && tagsQuery.isLoading)}
	isFetching={plantsCatalogQuery.isFetching || tagsQuery.isFetching}
	isError={Boolean(tableError)}
	errorMessage={tableError ? getPLTAErrorMessage(tableError) : undefined}
	onRetry={() => {
		void plantsCatalogQuery.refetch();
		if (selectedPlantId) void tagsQuery.refetch();
	}}
	isEmpty={!selectedPlantId || tags.length === 0}
	emptyTitle={!selectedPlantId
		? 'Belum ada PLTA'
		: hasFilter
			? 'Tag tidak ditemukan'
			: 'Belum ada tag dan parameter'}
	emptyDescription={!selectedPlantId
		? 'Tambahkan data PLTA terlebih dahulu sebelum melihat konfigurasi tag.'
		: hasFilter
			? 'Coba ubah kata kunci atau filter yang digunakan.'
			: 'PLTA yang dipilih belum memiliki konfigurasi tag monitoring.'}
	{page}
	{totalPages}
	total={tagsQuery.data?.total ?? 0}
	itemLabel="tag"
	onPreviousPage={() => (page = Math.max(page - 1, 1))}
	onNextPage={() => (page = Math.min(page + 1, totalPages))}
>
	{#snippet filters()}
		<Select
			ariaLabel="Pilih PLTA"
			value={selectedPlantId}
			disabled={plantsCatalogQuery.isPending || plants.length === 0}
			onValueChange={(value) => {
				onPlantChange(value);
				page = 1;
			}}
			class="max-w-full sm:w-64"
			controlSize="sm"
			options={plantOptions}
		>
			{#snippet leadingIcon()}<IconBuilding />{/snippet}
		</Select>

		<Select
			ariaLabel="Filter protokol"
			bind:value={protocol}
			onValueChange={() => (page = 1)}
			class="w-full sm:w-44"
			controlSize="sm"
			options={[
				{ value: '', label: 'Semua protokol' },
				...TAG_PROTOCOLS.map((item) => ({ value: item, label: item.toUpperCase() }))
			]}
		>
			{#snippet leadingIcon()}<IconDatabase />{/snippet}
		</Select>

		<Select
			ariaLabel="Filter status tag"
			bind:value={enabled}
			onValueChange={() => (page = 1)}
			class="w-full sm:w-40"
			controlSize="sm"
			options={[
				{ value: '', label: 'Semua status' },
				{ value: 'true', label: 'Aktif' },
				{ value: 'false', label: 'Nonaktif' }
			]}
		>
			{#snippet leadingIcon()}<IconTag />{/snippet}
		</Select>
	{/snippet}

	{#snippet actions()}
		{#if canAddTag && selectedPlantId}
			<Button
				type="button"
				size="sm"
				onclick={() => (isTagFormOpen = true)}
				class="whitespace-nowrap"
			>
				{#snippet leftIcon()}<IconPlus class="size-4" />{/snippet}
				Tambah parameter
			</Button>
		{/if}
	{/snippet}

	{#snippet rows()}
		{#each tags as tag (tag.id)}
			<tr
				class="border-b border-surface-overlay transition-colors last:border-b-0 hover:bg-surface-base/60"
			>
				<!--
					Nama tampilan di atas, kunci parameter kecil di bawahnya (23 Okt
					2026); dulu kunci mentah yang ditonjolkan. Tag tanpa nama tampilan
					hanya punya kuncinya.
				-->
				<td class="px-3.5 py-2.5">
					{#if tag.label}
						<span class="block text-sm font-medium text-text-primary">{tag.label}</span>
						<span class="mt-0.5 block font-mono text-xs text-text-muted">{tag.parameter}</span>
					{:else}
						<span class="font-mono text-xs font-medium text-text-primary">{tag.parameter}</span>
					{/if}
				</td>
				<td class="px-3.5 py-2.5 text-sm text-text-secondary">{tag.station || '—'}</td>
				<td class="px-3.5 py-2.5">
					<Badge tone="slate" mono>{tag.protocol}</Badge>
				</td>
				<td class="max-w-72 px-3.5 py-2.5">
					<span title={tag.address} class="block truncate font-mono text-xs text-text-muted">
						{tag.address || '—'}
					</span>
				</td>
				<td class="px-3.5 py-2.5 font-mono text-xs text-text-secondary tabular-nums">
					{tag.scale} / {tag.offset}
				</td>
				<td class="px-3.5 py-2.5 font-mono text-xs text-text-secondary tabular-nums">
					{describeTagBounds(tag) ?? '—'}
				</td>
				<td class="px-3.5 py-2.5 text-sm text-text-secondary">{tag.unit || '—'}</td>
				<td class="px-3.5 py-2.5">
					<span class="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
						<span
							class={`size-2 rounded-full ${tag.enabled ? 'bg-status-success-strong' : 'bg-disabled'}`}
						></span>
						{tag.enabled ? 'Aktif' : 'Nonaktif'}
					</span>
				</td>
				{#if canEdit}
					<td class="px-3.5 py-2.5">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onclick={() => (editingTag = tag)}
							aria-label={`Atur batas valid ${[tag.label ?? tag.parameter, tag.station].filter(Boolean).join(' ')}`}
							class="whitespace-nowrap text-brand-primary-strong"
						>
							{#snippet leftIcon()}<IconPencil class="size-3" />{/snippet}
							Atur batas
						</Button>
					</td>
				{/if}
			</tr>
		{/each}
	{/snippet}
</CatalogTable>

{#if canEdit && editingTag}
	<TagBoundsSheet isOpen tag={editingTag} onClose={() => (editingTag = null)} />
{/if}

{#if canAddTag && selectedPlantId}
	<TagFormSheet
		isOpen={isTagFormOpen}
		pltaId={selectedPlantId}
		plantName={selectedPlantName}
		onClose={() => (isTagFormOpen = false)}
	/>
{/if}
