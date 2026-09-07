<script lang="ts" module>
	export interface CatalogColumn {
		key: string;
		label: string;
		class?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconSearch from '~icons/ph/magnifying-glass';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import RefetchBar from '$components/ui/RefetchBar.svelte';
	import TablePagination from '$components/ui/TablePagination.svelte';
	import ResourceTableSkeleton from '$components/skeletons/ResourceTableSkeleton.svelte';
	import { PAGE_LIMIT } from './model';

	interface Props {
		columns: CatalogColumn[];
		minWidthClass: string;
		searchInput: string;
		searchPlaceholder: string;
		onSearchInputChange: (value: string) => void;
		onSearch: (event: SubmitEvent) => void;
		onClearSearch?: () => void;
		filters?: Snippet;
		isLoading: boolean;
		isFetching: boolean;
		isError: boolean;
		errorMessage?: string;
		onRetry: () => void;
		isEmpty: boolean;
		emptyTitle: string;
		emptyDescription: string;
		page: number;
		totalPages: number;
		total: number;
		itemLabel: string;
		onPreviousPage: () => void;
		onNextPage: () => void;
		rows: Snippet;
	}

	let {
		columns,
		minWidthClass,
		searchInput,
		searchPlaceholder,
		onSearchInputChange,
		onSearch,
		onClearSearch,
		filters,
		isLoading,
		isFetching,
		isError,
		errorMessage,
		onRetry,
		isEmpty,
		emptyTitle,
		emptyDescription,
		page,
		totalPages,
		total,
		itemLabel,
		onPreviousPage,
		onNextPage,
		rows
	}: Props = $props();
</script>

<!-- Baris filter berdiri sendiri di atas tabel — tabel tidak dibungkus kartu lagi. -->
<div
	class="flex flex-col gap-2.5 border-b border-border-subtle py-4 lg:flex-row lg:flex-wrap lg:items-center"
>
	<form onsubmit={onSearch} class="flex min-w-0 items-center gap-2 lg:w-72 lg:shrink-0">
		<div class="relative flex min-w-0 flex-1 items-center">
			<IconSearch class="pointer-events-none absolute left-3 size-4 shrink-0 text-text-muted" />
			<input
				type="search"
				value={searchInput}
				oninput={(event) => onSearchInputChange(event.currentTarget.value)}
				maxlength={100}
				placeholder={searchPlaceholder}
				class="field h-9 pl-9 text-[13px]"
			/>
		</div>
		<button type="submit" class="btn btn-ghost btn-sm h-9 shrink-0">Cari</button>
		{#if onClearSearch && searchInput.length > 0}
			<button
				type="button"
				onclick={onClearSearch}
				class="h-9 shrink-0 cursor-pointer rounded-lg px-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-surface-overlay"
			>
				Bersihkan
			</button>
		{/if}
	</form>

	{#if filters}
		<div class="flex flex-wrap items-center gap-2">{@render filters()}</div>
	{/if}

	{#if !isLoading && !isError}
		<span class="text-xs text-text-muted lg:ml-auto">{total} {itemLabel}</span>
	{/if}
</div>

<section
	class="mt-5 flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-raised"
>
	<RefetchBar isRefetching={isFetching && !isLoading} />

	<div class="overflow-x-auto">
		<table class={`w-full border-collapse ${minWidthClass}`}>
			<thead>
				<tr class="h-9 border-b border-border-subtle bg-surface-overlay">
					{#each columns as column (column.key)}
						<th scope="col" class={`table-head-cell px-3.5 text-left ${column.class ?? ''}`}>
							{column.label}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody aria-busy={isLoading || isFetching}>
				{#if isLoading}
					<ResourceTableSkeleton rows={PAGE_LIMIT} columns={columns.length} />
				{:else if isError}
					<tr>
						<td colspan={columns.length}>
							<ErrorState
								title="Data belum bisa dimuat"
								description={errorMessage ?? 'Sambungan ke server terputus sebentar.'}
								{onRetry}
							/>
						</td>
					</tr>
				{:else if isEmpty}
					<tr>
						<td colspan={columns.length} class="p-5">
							<EmptyState title={emptyTitle} description={emptyDescription} />
						</td>
					</tr>
				{:else}
					{@render rows()}
				{/if}
			</tbody>
		</table>
	</div>

	{#if !isLoading && !isError}
		<TablePagination
			{page}
			{totalPages}
			{total}
			pageSize={PAGE_LIMIT}
			{itemLabel}
			isBusy={isFetching}
			onPrevious={onPreviousPage}
			onNext={onNextPage}
		/>
	{/if}
</section>
