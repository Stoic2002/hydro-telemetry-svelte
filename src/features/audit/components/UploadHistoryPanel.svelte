<script lang="ts">
	import IconSearch from '~icons/ph/magnifying-glass';
	import Badge from '$components/controls/Badge.svelte';
	import Input from '$components/controls/Input.svelte';
	import Select from '$components/controls/Select.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import TablePagination from '$components/ui/TablePagination.svelte';
	import { formatDayMonthYearTimeWIB } from '$shared/lib/date';
	import { createUploadAuditQuery } from '../api/queries';
	import type { UploadAuditEntry, UploadAuditKind } from '../model';
	import {
		UPLOAD_AUDIT_KIND_OPTIONS,
		uploadAuditActionLabel,
		uploadAuditKindLabel
	} from '../presentation';

	interface Props {
		title?: string;
		description?: string;
		/**
		 * Bila diisi, jalur dipakukan ke satu jenis dan saringan jalurnya
		 * disembunyikan — panel ini menempel di bawah formulir unggah yang
		 * bersangkutan, jadi jalurnya sudah jelas dari konteksnya.
		 */
		kind?: UploadAuditKind;
		/** Membatasi ke satu PLTA. Kosongkan untuk riwayat lintas-PLTA. */
		pltaId?: string;
		emptyDescription?: string;
	}

	let {
		title = 'Riwayat unggah',
		description = 'Siapa memasukkan atau menghapus data manual, terbaru lebih dulu.',
		kind,
		pltaId,
		emptyDescription = 'Unggahan dan penghapusan akan tercatat di sini.'
	}: Props = $props();

	const PAGE_LIMIT = 10;

	const isKindLocked = $derived(Boolean(kind));
	const isScopedToPlta = $derived(Boolean(pltaId));

	let page = $state(1);
	let freeKind = $state('');
	let search = $state('');

	const historyQuery = createUploadAuditQuery(() => ({
		page,
		limit: PAGE_LIMIT,
		kind: (kind ?? freeKind) as UploadAuditKind | '',
		pltaId,
		search
	}));

	const data = $derived(historyQuery.data);
	const items = $derived(data?.items ?? []);

	const columns = $derived([
		'Waktu',
		...(isKindLocked ? [] : ['Jalur']),
		'Aksi',
		'Berkas / Parameter',
		...(isScopedToPlta ? [] : ['Cakupan']),
		'Periode data',
		'Jumlah',
		'Oleh'
	]);

	function periodLabel(entry: UploadAuditEntry): string {
		const detailYear = entry.details?.tahun;
		const detailMonth = entry.details?.bulan;

		if (typeof detailYear === 'number' && typeof detailMonth === 'number') {
			return `${String(detailMonth).padStart(2, '0')}/${detailYear}`;
		}

		if (!entry.periodStart) return '—';

		const start = formatDayMonthYearTimeWIB(entry.periodStart);
		if (!entry.periodEnd || entry.periodEnd === entry.periodStart) return start;

		return `${start} – ${formatDayMonthYearTimeWIB(entry.periodEnd)}`;
	}
</script>

<section>
	<h2 class="card-title">{title}</h2>
	<p class="mt-1 text-xs text-text-muted">{description}</p>

	<div class="mt-3 flex flex-wrap items-end gap-3">
		<Input
			bind:value={search}
			oninput={() => (page = 1)}
			placeholder="Cari nama berkas atau parameter"
			size="sm"
			class="w-full sm:w-[260px]"
		>
			{#snippet leftIcon()}<IconSearch class="size-4" />{/snippet}
		</Input>

		{#if !isKindLocked}
			<Select
				ariaLabel="Filter jalur unggahan"
				bind:value={freeKind}
				onValueChange={() => (page = 1)}
				options={UPLOAD_AUDIT_KIND_OPTIONS}
				controlSize="sm"
				class="w-full sm:w-[180px]"
			/>
		{/if}
	</div>

	{#if historyQuery.isError}
		<EmptyState
			class="mt-3"
			title="Riwayat belum dapat dimuat"
			description="Silakan muat ulang halaman untuk mencoba lagi."
		/>
	{:else if historyQuery.isLoading}
		<p class="loading-text mt-3" role="status">Memuat riwayat…</p>
	{:else if items.length === 0}
		<EmptyState class="mt-3" title="Belum ada riwayat" description={emptyDescription} />
	{:else}
		<div class="mt-3 overflow-x-auto">
			<table class="w-full min-w-[680px] border-collapse text-left">
				<thead>
					<tr class="bg-surface-overlay">
						{#each columns as head (head)}
							<th class="table-head-cell px-3 py-2">{head}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each items as entry (entry.id)}
						<tr class="border-b border-border-subtle">
							<td class="px-3 py-2.5 text-xs whitespace-nowrap text-text-secondary">
								{formatDayMonthYearTimeWIB(entry.createdAt)}
							</td>
							{#if !isKindLocked}
								<td class="px-3 py-2.5 text-xs whitespace-nowrap text-text-secondary">
									{uploadAuditKindLabel(entry.kind)}
								</td>
							{/if}
							<td class="px-3 py-2.5">
								<Badge tone={entry.action === 'hapus' ? 'red' : 'green'}>
									{uploadAuditActionLabel(entry.action)}
								</Badge>
							</td>
							<td class="max-w-[220px] px-3 py-2.5 text-xs text-text-secondary">
								<span class="block truncate">{entry.fileName ?? entry.parameter ?? '—'}</span>
							</td>
							{#if !isScopedToPlta}
								<td class="px-3 py-2.5 whitespace-nowrap">
									<!--
										`plta_id` null berarti lintas-PLTA, bukan data yang hilang —
										dibedakan secara eksplisit supaya operator tidak menganggapnya
										catatan rusak.
									-->
									{#if entry.pltaId}
										<span class="font-mono text-xs text-text-secondary"
											>{entry.pltaCode ?? '—'}</span
										>
									{:else}
										<span class="text-xs font-medium text-text-secondary">Semua PLTA</span>
									{/if}
								</td>
							{/if}
							<td class="px-3 py-2.5 text-xs whitespace-nowrap text-text-muted">
								{periodLabel(entry)}
							</td>
							<td class="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-text-secondary">
								{entry.count}
							</td>
							<td class="px-3 py-2.5 text-xs whitespace-nowrap text-text-secondary">
								{#if entry.username}
									{entry.username}
								{:else}
									<span class="text-text-muted">Akun dihapus</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if data}
			<TablePagination
				class="mt-3"
				page={data.page}
				totalPages={data.pages}
				total={data.total}
				pageSize={data.limit}
				itemLabel="catatan"
				isBusy={historyQuery.isFetching}
				onPrevious={() => (page = Math.max(1, page - 1))}
				onNext={() => (page = Math.min(data.pages, page + 1))}
			/>
		{/if}
	{/if}
</section>
