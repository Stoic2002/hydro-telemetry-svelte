<script lang="ts">
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import {
		createMonthlyFieldLabelsQuery,
		createSetMonthlyFieldLabelsMutation
	} from '../api/queries';
	import { getHydrologyErrorMessage, getLabelErrorDetail } from '../error';
	import { LABEL_MAX_LENGTH, labelChanges } from '../labels';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	/**
	 * Nama bidang hidrologi bulanan — khusus admin, berlaku untuk SEMUA PLTA
	 * (satu kolom laporan memuat seluruh PLTA, jadi namanya satu).
	 *
	 * Server memakai nama ini di template unggah, laporan Excel, grafik, dan
	 * pesan galat impor. Tabel Hidrologi Bulanan di aplikasi ini masih memakai
	 * istilah lembar client — pemakaian `label` di layar itu di-hold tim (lihat
	 * CLAUDE.md), dan kalimat di sheet ini menyebutkannya.
	 */
	let { isOpen, onClose }: Props = $props();

	const labelsQuery = createMonthlyFieldLabelsQuery(() => isOpen);
	const saveMutation = createSetMonthlyFieldLabelsMutation();

	/** Hanya isian yang disentuh (lihat `labelChanges`). */
	let draft = $state<Record<string, string>>({});
	let problems = $state<{ message: string; problems: string[] } | null>(null);

	$effect(() => {
		if (isOpen) return;
		draft = {};
		problems = null;
	});

	const fields = $derived(labelsQuery.data?.fields ?? []);
	const changes = $derived(
		labelChanges(
			fields.map((field) => ({ key: field.key, label: field.label, isCustom: field.isCustom })),
			draft
		)
	);
	const changeCount = $derived(Object.keys(changes).length);
	const isPending = $derived(saveMutation.isPending);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (changeCount === 0) return;
		problems = null;

		try {
			await saveMutation.mutateAsync(changes);
			notificationStore.addToast({ type: 'success', message: 'Nama bidang bulanan diperbarui' });
			onClose();
		} catch (error) {
			problems = getLabelErrorDetail(error);
		}
	}
</script>

<Sheet
	{isOpen}
	title="Nama bidang bulanan"
	isDismissible={!isPending}
	isDirty={changeCount > 0}
	{onClose}
>
	{#snippet description()}
		Ganti nama bidang hidrologi bulanan untuk <strong>seluruh PLTA</strong>. Nama ini dipakai di
		template unggah, laporan Excel, dan pesan galat impor; tabel Hidrologi Bulanan di aplikasi masih
		memakai istilah lembar client.
	{/snippet}

	{#if labelsQuery.isPending}
		<p class="loading-text py-4" role="status">Memuat nama bidang…</p>
	{:else if labelsQuery.isError}
		<Banner tone="warning" title="Nama bidang belum dapat dimuat">
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
				{getHydrologyErrorMessage(labelsQuery.error)}
				<button
					type="button"
					onclick={() => void labelsQuery.refetch()}
					class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
				>
					<IconRefresh class="size-3" />
					Coba lagi
				</button>
			</span>
		</Banner>
	{:else}
		<form id="monthly-field-label-form" onsubmit={save} class="flex flex-col gap-4">
			{#if problems}
				<Banner tone="danger" title={problems.message}>
					{#if problems.problems.length > 0}
						<ul class="list-disc pl-4">
							{#each problems.problems as problem (problem)}<li>{problem}</li>{/each}
						</ul>
					{/if}
					Tidak ada yang tersimpan.
				</Banner>
			{/if}
			<p class="text-xs text-text-muted">
				Kosongkan isian untuk kembali ke nama bawaan. Untuk bidang akumulasi tulis nama dasarnya
				saja — "s.d. Bulan …" ditambahkan sistem.
			</p>
			<ul class="flex flex-col divide-y divide-surface-overlay">
				{#each fields as field (field.key)}
					<li class="flex flex-col gap-1.5 py-2.5">
						<span class="text-xs text-text-secondary">
							{field.defaultLabel}{#if field.isAccumulated}<span class="text-text-muted">
									· s.d. Bulan …</span
								>{/if}
						</span>
						<Input
							size="sm"
							aria-label={`Nama ${field.defaultLabel}`}
							placeholder={field.defaultLabel}
							maxlength={LABEL_MAX_LENGTH}
							value={draft[field.key] ?? (field.isCustom ? field.label : '')}
							disabled={isPending}
							oninput={(event) => (draft = { ...draft, [field.key]: event.currentTarget.value })}
						/>
					</li>
				{/each}
			</ul>
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
				form="monthly-field-label-form"
				isLoading={isPending}
				disabled={changeCount === 0}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconSave class="size-4" />{/snippet}
				{isPending ? 'Menyimpan…' : changeCount > 0 ? `Simpan (${changeCount})` : 'Simpan'}
			</Button>
		</div>
	{/snippet}
</Sheet>
