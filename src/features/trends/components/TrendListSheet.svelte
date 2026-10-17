<script lang="ts">
	import IconPlus from '~icons/ph/plus';
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconSave from '~icons/ph/floppy-disk';
	import IconX from '~icons/ph/x';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Select from '$components/controls/Select.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import SortableList from '$components/ui/SortableList.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import {
		createPlantTrendListQuery,
		createTrendCatalogQuery,
		createUpdatePlantTrendListMutation
	} from '../api/queries';
	import { getTrendErrorMessage, getTrendListErrorDetail } from '../error';
	import type { TrendPanel } from '../model';
	import {
		TREND_LIST_LIMITS,
		draftFromList,
		draftItemFromCandidate,
		draftToInput,
		validateTrendDraft,
		type TrendListDraftItem
	} from '../trend-list';

	interface Props {
		isOpen: boolean;
		pltaId: string;
		plantName: string;
		onClose: () => void;
	}

	let { isOpen, pltaId, plantName, onClose }: Props = $props();

	/**
	 * Daftar Tren & Grafik satu PLTA — khusus admin. Item mana yang ditampilkan,
	 * urutannya, pengelompokan ke grafik (`grup` sama = satu grafik), dan nama
	 * khususnya. Disimpan utuh: item yang dibuang dari daftar dihapus di server.
	 */
	const PANEL_LABEL: Record<TrendPanel, string> = {
		hulu: 'Hulu',
		dam: 'Bendungan',
		hilir: 'Hilir'
	};

	const listQuery = createPlantTrendListQuery(() => pltaId);
	const catalogQuery = createTrendCatalogQuery(
		() => pltaId,
		() => isOpen
	);
	const saveMutation = createUpdatePlantTrendListMutation();

	let draft = $state<TrendListDraftItem[]>([]);
	let isDraftReady = $state(false);
	/** Draf saat baru disalin, untuk mengenali suntingan yang belum disimpan. */
	let draftBaseline = $state('');
	let candidateToAdd = $state('');
	let serverProblems = $state<{ message: string; problems: string[] } | null>(null);

	/**
	 * Draf disalin SEKALI saat sheet dibuka dan kedua data sudah datang — bukan
	 * setiap kali query menyegarkan diri, yang akan membuang suntingan yang
	 * sedang berjalan. Sheet yang ditutup lalu dibuka lagi mulai dari data
	 * server terbaru (lihat `state_referenced_locally` di CLAUDE.md).
	 */
	$effect(() => {
		if (!isOpen) {
			isDraftReady = false;
			serverProblems = null;
			return;
		}
		if (isDraftReady || !listQuery.data || !catalogQuery.data) return;
		draft = draftFromList(listQuery.data, catalogQuery.data.candidates);
		draftBaseline = JSON.stringify(draft);
		isDraftReady = true;
	});

	const isPending = $derived(saveMutation.isPending);
	const isDirty = $derived(isDraftReady && JSON.stringify(draft) !== draftBaseline);
	const candidates = $derived(catalogQuery.data?.candidates ?? []);
	const usedKeys = $derived(new Set(draft.map((item) => item.key)));
	const addOptions = $derived(
		candidates
			.filter((candidate) => !usedKeys.has(candidate.key))
			.map((candidate) => ({
				value: candidate.key,
				label: `${candidate.label}${candidate.unit ? ` (${candidate.unit})` : ''} · ${PANEL_LABEL[candidate.panel]}${candidate.lastDataDate ? '' : ' · belum ada data'}`
			}))
	);
	const unavailable = $derived(Object.entries(catalogQuery.data?.unavailable ?? {}));
	const problems = $derived(validateTrendDraft(draft));
	const groupNames = $derived(
		[...new Set(draft.map((item) => item.group.trim()).filter(Boolean))].sort((first, second) =>
			first.localeCompare(second, 'id-ID')
		)
	);

	function addCandidate(key: string) {
		const candidate = candidates.find((item) => item.key === key);
		if (!candidate) return;
		draft = [...draft, draftItemFromCandidate(candidate)];
		candidateToAdd = '';
	}

	function updateItem(key: string, changes: Partial<TrendListDraftItem>) {
		draft = draft.map((item) => (item.key === key ? { ...item, ...changes } : item));
	}

	function removeItem(key: string) {
		draft = draft.filter((item) => item.key !== key);
	}

	function reorder(keys: string[]) {
		const byKey = new Map(draft.map((item) => [item.key, item]));
		draft = keys.map((key) => byKey.get(key)).filter((item) => item !== undefined);
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (problems.length > 0) return;
		serverProblems = null;

		try {
			await saveMutation.mutateAsync({ pltaId, items: draftToInput(draft) });
			notificationStore.addToast({
				type: 'success',
				message: `Daftar tren PLTA ${plantName} diperbarui`
			});
			onClose();
		} catch (error) {
			serverProblems = getTrendListErrorDetail(error);
		}
	}
</script>

<Sheet {isOpen} title="Atur daftar tren" isDismissible={!isPending} {isDirty} {onClose}>
	{#snippet description()}
		Pilih metrik yang tampil di Tren & Grafik PLTA {plantName}, seret untuk mengubah urutan, dan
		beri nama grup yang sama untuk menggambarnya dalam satu grafik. Berlaku untuk semua pengguna
		PLTA ini.
	{/snippet}

	{#if listQuery.isPending || catalogQuery.isPending}
		<p class="loading-text py-4" role="status">Memuat daftar tren…</p>
	{:else if listQuery.isError || catalogQuery.isError}
		<Banner tone="warning" title="Daftar tren belum dapat dimuat">
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
				{getTrendErrorMessage(listQuery.error ?? catalogQuery.error)}
				<button
					type="button"
					onclick={() => {
						if (listQuery.isError) void listQuery.refetch();
						if (catalogQuery.isError) void catalogQuery.refetch();
					}}
					class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
				>
					<IconRefresh class="size-3" />
					Coba lagi
				</button>
			</span>
		</Banner>
	{:else}
		<form id="trend-list-form" onsubmit={save} class="flex flex-col gap-5">
			{#if serverProblems}
				<Banner tone="danger" title={serverProblems.message}>
					{#if serverProblems.problems.length > 0}
						<ul class="list-disc pl-4">
							{#each serverProblems.problems as problem (problem)}<li>{problem}</li>{/each}
						</ul>
					{/if}
					Tidak ada yang tersimpan.
				</Banner>
			{/if}

			<div class="flex items-end gap-2">
				<div class="min-w-0 flex-1">
					<Select
						label="Tambah metrik"
						placeholder={addOptions.length > 0 ? 'Pilih metrik' : 'Semua metrik sudah dipakai'}
						value={candidateToAdd}
						options={addOptions}
						disabled={isPending ||
							addOptions.length === 0 ||
							draft.length >= TREND_LIST_LIMITS.items}
						onValueChange={addCandidate}
					/>
				</div>
				<IconPlus class="mb-3 size-4 shrink-0 text-text-muted" aria-hidden="true" />
			</div>

			<div class="flex flex-col gap-2">
				<p class="text-xs text-text-muted" role="status">
					{draft.length} dari maks. {TREND_LIST_LIMITS.items} item{groupNames.length > 0
						? ` · grup: ${groupNames.join(', ')}`
						: ''}
				</p>

				{#if draft.length === 0}
					<p
						class="rounded-xl border border-dashed border-border-subtle px-4 py-6 text-center text-xs text-text-muted"
					>
						Daftar kosong. Tambahkan metrik di atas — tanpa daftar, halaman Tren menampilkan grafik
						satu parameter.
					</p>
				{:else}
					<SortableList
						ariaLabel="Urutan item tren"
						items={draft}
						getKey={(item) => item.key}
						getLabel={(item) => item.label || item.defaultLabel}
						disabled={isPending}
						onReorder={reorder}
					>
						{#snippet row(item)}
							<div class="flex min-w-0 flex-1 flex-col gap-2 py-1">
								<div class="flex items-center justify-between gap-2">
									<span class="truncate text-sm text-text-secondary">
										{item.defaultLabel}
										<span class="text-xs text-text-muted">
											· {PANEL_LABEL[item.panel]}{item.unit ? ` · ${item.unit}` : ''}
										</span>
									</span>
									<button
										type="button"
										disabled={isPending}
										onclick={() => removeItem(item.key)}
										aria-label={`Buang ${item.defaultLabel} dari daftar`}
										class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted hover:bg-surface-overlay hover:text-status-danger-strong"
									>
										<IconX class="size-4" aria-hidden="true" />
									</button>
								</div>
								<div class="grid grid-cols-[1fr_120px] gap-2">
									<Input
										size="sm"
										aria-label={`Nama khusus ${item.defaultLabel}`}
										placeholder="Nama khusus (opsional)"
										maxlength={TREND_LIST_LIMITS.label}
										value={item.label}
										disabled={isPending}
										oninput={(event) => updateItem(item.key, { label: event.currentTarget.value })}
									/>
									<Input
										size="sm"
										aria-label={`Grup ${item.defaultLabel}`}
										placeholder="Grup"
										list="trend-group-names"
										maxlength={TREND_LIST_LIMITS.group}
										value={item.group}
										disabled={isPending}
										oninput={(event) => updateItem(item.key, { group: event.currentTarget.value })}
									/>
								</div>
							</div>
						{/snippet}
					</SortableList>
					<datalist id="trend-group-names">
						{#each groupNames as name (name)}<option value={name}></option>{/each}
					</datalist>
				{/if}
			</div>

			{#if problems.length > 0}
				<Banner tone="warning" title="Perbaiki sebelum menyimpan">
					<ul class="list-disc pl-4">
						{#each problems as problem (problem)}<li>{problem}</li>{/each}
					</ul>
				</Banner>
			{/if}

			{#if unavailable.length > 0}
				<details class="text-xs text-text-muted">
					<summary class="cursor-pointer font-medium text-text-secondary">
						{unavailable.length} metrik panel belum bisa dijadikan tren
					</summary>
					<ul class="mt-2 flex flex-col gap-1">
						{#each unavailable as [key, reason] (key)}
							<li><span class="font-mono">{key}</span> — {reason}</li>
						{/each}
					</ul>
				</details>
			{/if}
		</form>
	{/if}

	{#snippet footer()}
		<div class="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
			<Button
				type="button"
				variant="ghost"
				disabled={isPending}
				onclick={onClose}
				class="w-full sm:w-auto"
			>
				Batal
			</Button>
			<Button
				type="submit"
				form="trend-list-form"
				isLoading={isPending}
				disabled={!isDraftReady || problems.length > 0}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconSave class="size-4" />{/snippet}
				{isPending ? 'Menyimpan…' : 'Simpan daftar'}
			</Button>
		</div>
	{/snippet}
</Sheet>
