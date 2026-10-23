<script lang="ts">
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconReset from '~icons/ph/arrow-counter-clockwise';
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
	import { LABEL_MAX_LENGTH, isCustomLabelValue, labelChanges } from '../labels';

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
			fields.map((field) => ({
				key: field.key,
				label: field.label,
				defaultLabel: field.defaultLabel,
				isCustom: field.isCustom
			})),
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
				Ubah nama langsung di kotaknya; ikon putar balik mengembalikan nama bawaan. Untuk bidang
				akumulasi tulis nama dasarnya saja — "s.d. Bulan …" ditambahkan sistem.
			</p>
			<ul class="flex flex-col">
				{#each fields as field (field.key)}
					{@const value = draft[field.key] ?? (field.isCustom ? field.label : field.defaultLabel)}
					{#snippet resetName()}
						<button
							type="button"
							disabled={isPending}
							onclick={() => (draft = { ...draft, [field.key]: field.defaultLabel })}
							aria-label={`Kembalikan nama bawaan: ${field.defaultLabel}`}
							title={`Nama bawaan: ${field.defaultLabel}`}
							class="flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-surface-overlay hover:text-text-primary disabled:cursor-not-allowed"
						>
							<IconReset class="size-3.5" aria-hidden="true" />
						</button>
					{/snippet}
					<!--
						Satu kotak per bidang (23 Okt 2026): dulu nama bawaan ditulis di atas
						kotak isian, sehingga setiap bidang memakan dua baris.
					-->
					<li class="flex items-center gap-2 py-2">
						<Input
							size="sm"
							class="flex-1"
							aria-label={`Nama ${field.defaultLabel}${field.isAccumulated ? ' s.d. Bulan' : ''}`}
							placeholder={field.defaultLabel}
							maxlength={LABEL_MAX_LENGTH}
							{value}
							disabled={isPending}
							oninput={(event) => (draft = { ...draft, [field.key]: event.currentTarget.value })}
							rightIcon={isCustomLabelValue(value, field.defaultLabel) ? resetName : undefined}
						/>
						{#if field.isAccumulated}
							<span class="shrink-0 text-xs text-text-muted">s.d. Bulan …</span>
						{/if}
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
