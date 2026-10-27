<script lang="ts">
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createCreateRiverBasinMutation, createUpdateRiverBasinMutation } from '../api/queries';
	import { getPLTASaveErrorMessage } from '../error';
	import type { RiverBasin } from '../model';
	import {
		CODE_MAX_LENGTH,
		NAME_MAX_LENGTH,
		parseRiverBasinForm,
		parseRiverBasinEdit,
		riverBasinFormFrom,
		type RiverBasinFormValues
	} from '../plant-form';

	interface Props {
		isOpen: boolean;
		/** `null` = tambah Wilayah Sungai baru. */
		riverBasin: RiverBasin | null;
		onClose: () => void;
	}

	let { isOpen, riverBasin, onClose }: Props = $props();

	/**
	 * Tambah atau ubah Wilayah Sungai (khusus admin). Kode tidak bisa diubah
	 * setelah dibuat — `PATCH` hanya menerima nama dan deskripsi. Server tidak
	 * menyediakan hapus.
	 */
	const createMutation = createCreateRiverBasinMutation();
	const updateMutation = createUpdateRiverBasinMutation();

	let values = $state<RiverBasinFormValues>(riverBasinFormFrom(null));
	let baseline = $state('');
	let showErrors = $state(false);

	// Membuka sheet untuk Wilayah Sungai lain tidak boleh membawa isian lama.
	$effect(() => {
		if (!isOpen) return;
		const next = riverBasinFormFrom(riverBasin);
		values = next;
		baseline = JSON.stringify(next);
		showErrors = false;
	});

	const isEdit = $derived(riverBasin !== null);
	// Ubah hanya memvalidasi bidang yang berubah (`parseRiverBasinEdit`).
	const parsed = $derived(parseRiverBasinForm(values));
	const edit = $derived(riverBasin ? parseRiverBasinEdit(riverBasin, values) : null);
	const activeResult = $derived(edit ?? parsed);
	const errors = $derived(showErrors && !activeResult.ok ? activeResult.errors : {});
	const isDirty = $derived(JSON.stringify(values) !== baseline);
	const canSave = $derived(edit ? !edit.ok || Object.keys(edit.input).length > 0 : isDirty);
	const isPending = $derived(createMutation.isPending || updateMutation.isPending);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		showErrors = true;
		if (!canSave) return;

		try {
			if (riverBasin && edit) {
				if (!edit.ok) return;
				await updateMutation.mutateAsync({ riverBasinId: riverBasin.id, changes: edit.input });
			} else {
				if (!parsed.ok) return;
				await createMutation.mutateAsync(parsed.input);
			}
			notificationStore.addToast({
				type: 'success',
				message: `Wilayah Sungai ${values.name.trim() || riverBasin?.name} ${isEdit ? 'diperbarui' : 'ditambahkan'}`
			});
			onClose();
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getPLTASaveErrorMessage(error) });
		}
	}
</script>

<Sheet
	{isOpen}
	title={isEdit ? 'Ubah Wilayah Sungai' : 'Tambah Wilayah Sungai'}
	isDismissible={!isPending}
	{isDirty}
	{onClose}
>
	{#snippet description()}
		{isEdit
			? `Kode ${riverBasin?.code} tidak bisa diubah.`
			: 'Setelah dibuat, tambahkan PLTA di bawahnya dari tab PLTA.'}
	{/snippet}

	<form id="river-basin-form" onsubmit={save} class="flex flex-col gap-4" novalidate>
		<Input
			label="Kode"
			placeholder="mis. WS-SERAYU"
			maxlength={CODE_MAX_LENGTH}
			bind:value={values.code}
			disabled={isPending || isEdit}
			error={errors.code}
		/>
		<Input
			label="Nama"
			maxlength={NAME_MAX_LENGTH}
			bind:value={values.name}
			disabled={isPending}
			error={errors.name}
		/>
		<Input label="Deskripsi (opsional)" bind:value={values.description} disabled={isPending} />
	</form>

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
				form="river-basin-form"
				isLoading={isPending}
				disabled={!canSave}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconSave class="size-4" />{/snippet}
				{isPending ? 'Menyimpan…' : isEdit ? 'Simpan' : 'Tambah'}
			</Button>
		</div>
	{/snippet}
</Sheet>
