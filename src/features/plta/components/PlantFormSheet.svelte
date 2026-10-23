<script lang="ts">
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Select from '$components/controls/Select.svelte';
	import StatusToggle from '$components/controls/StatusToggle.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createCreatePlantMutation, createUpdatePlantMutation } from '../api/queries';
	import { getPLTASaveErrorMessage } from '../error';
	import type { Plant, RiverBasin } from '../model';
	import {
		CODE_MAX_LENGTH,
		NAME_MAX_LENGTH,
		emptyPlantForm,
		parsePlantForm,
		plantChanges,
		plantFormFromPlant,
		type PlantFormValues
	} from '../plant-form';

	interface Props {
		isOpen: boolean;
		/** `null` = tambah PLTA baru. */
		plant: Plant | null;
		/** Pilihan Wilayah Sungai; satu PLTA hanya punya satu `ws_id`. */
		riverBasins: readonly RiverBasin[];
		onClose: () => void;
	}

	let { isOpen, plant, riverBasins, onClose }: Props = $props();

	/**
	 * Tambah atau ubah PLTA (khusus admin): identitas, Wilayah Sungai, lokasi,
	 * kapasitas, status, dan rasio beban → outflow. Konstanta (batas TMA, SWC,
	 * formula inflow) sengaja TIDAK di sini: server menimpa `constants` utuh, dan
	 * daftar kuncinya belum dipastikan ke backend. Sheet ini tidak pernah
	 * mengirimnya, jadi konstanta yang ada tetap utuh. Server tidak menyediakan
	 * hapus PLTA; menonaktifkan memakai status.
	 */
	const createMutation = createCreatePlantMutation();
	const updateMutation = createUpdatePlantMutation();

	let values = $state<PlantFormValues>(emptyPlantForm());
	let baseline = $state('');
	let showErrors = $state(false);

	// Membuka sheet untuk PLTA lain tidak boleh membawa isian lama.
	$effect(() => {
		if (!isOpen) return;
		const next = plant
			? plantFormFromPlant(plant)
			: emptyPlantForm(riverBasins.length === 1 ? riverBasins[0].id : '');
		values = next;
		baseline = JSON.stringify(next);
		showErrors = false;
	});

	const isEdit = $derived(plant !== null);
	const parsed = $derived(parsePlantForm(values));
	const errors = $derived(showErrors && !parsed.ok ? parsed.errors : {});
	const changes = $derived(plant && parsed.ok ? plantChanges(plant, parsed.input) : null);
	const isDirty = $derived(JSON.stringify(values) !== baseline);
	const canSave = $derived(isEdit ? changes !== null && Object.keys(changes).length > 0 : isDirty);
	const isPending = $derived(createMutation.isPending || updateMutation.isPending);
	const riverBasinOptions = $derived(
		riverBasins.map((riverBasin) => ({
			value: riverBasin.id,
			label: `${riverBasin.name} · ${riverBasin.code}`
		}))
	);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		showErrors = true;
		if (!parsed.ok || !canSave) return;

		try {
			if (plant && changes) {
				await updateMutation.mutateAsync({ pltaId: plant.id, changes });
			} else {
				await createMutation.mutateAsync(parsed.input);
			}
			notificationStore.addToast({
				type: 'success',
				message: `PLTA ${parsed.input.name} ${isEdit ? 'diperbarui' : 'ditambahkan'}`
			});
			onClose();
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getPLTASaveErrorMessage(error) });
		}
	}
</script>

<Sheet
	{isOpen}
	title={isEdit ? 'Ubah PLTA' : 'Tambah PLTA'}
	isDismissible={!isPending}
	{isDirty}
	{onClose}
>
	{#snippet description()}
		{isEdit
			? `Kode ${plant?.code} tidak bisa diubah. Konstanta PLTA tidak ikut berubah.`
			: 'Kode dipakai sebagai kunci di template Excel dan tidak bisa diubah setelah dibuat.'}
	{/snippet}

	<form id="plant-form" onsubmit={save} class="flex flex-col gap-6" novalidate>
		<section class="flex flex-col gap-4">
			<div class="grid gap-4 sm:grid-cols-[1fr_2fr]">
				<Input
					label="Kode"
					placeholder="mis. PBS"
					maxlength={CODE_MAX_LENGTH}
					bind:value={values.code}
					disabled={isPending || isEdit}
					error={errors.code}
				/>
				<Input
					label="Nama"
					placeholder="mis. Soedirman"
					maxlength={NAME_MAX_LENGTH}
					bind:value={values.name}
					disabled={isPending}
					error={errors.name}
				/>
			</div>
			<Select
				label="Wilayah Sungai"
				placeholder="Pilih Wilayah Sungai"
				bind:value={values.riverBasinId}
				options={riverBasinOptions}
				disabled={isPending}
				error={errors.riverBasinId}
			/>
			<Input label="Deskripsi (opsional)" bind:value={values.description} disabled={isPending} />
		</section>

		<section class="flex flex-col gap-4 border-t border-surface-overlay pt-5">
			<div class="grid gap-4 sm:grid-cols-3">
				<Input
					label="Lintang"
					type="number"
					step="any"
					placeholder="-7,39"
					bind:value={values.latitude}
					disabled={isPending}
					error={errors.latitude}
				/>
				<Input
					label="Bujur"
					type="number"
					step="any"
					placeholder="109,68"
					bind:value={values.longitude}
					disabled={isPending}
					error={errors.longitude}
				/>
				<Input
					label="Kapasitas (MW)"
					type="number"
					step="any"
					min="0"
					bind:value={values.capacityMw}
					disabled={isPending}
					error={errors.capacityMw}
				/>
			</div>
			<p class="-mt-2 text-xs text-text-muted">
				Tanpa koordinat, PLTA tidak tampil di peta Overview.
			</p>
		</section>

		<section class="flex flex-col gap-4 border-t border-surface-overlay pt-5">
			<div class="flex flex-col gap-1.5">
				<span class="field-label">Rasio beban → outflow</span>
				<div class="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
					<Input
						type="number"
						step="any"
						aria-label="Pembilang rasio beban ke outflow"
						bind:value={values.bebanToOutflowNum}
						disabled={isPending}
						error={errors.bebanToOutflowNum}
					/>
					<span class="pt-2.5 text-sm text-text-muted">/</span>
					<Input
						type="number"
						step="any"
						aria-label="Penyebut rasio beban ke outflow"
						bind:value={values.bebanToOutflowDen}
						disabled={isPending}
						error={errors.bebanToOutflowDen}
					/>
				</div>
				<span class="text-xs text-text-muted">
					Mengubah outflow yang dihitung dari beban. Bawaan 204 / 180.
				</span>
			</div>

			<StatusToggle
				label="Status PLTA"
				align="stretch"
				isActive={values.isActive}
				disabled={isPending}
				onChange={(next) => (values.isActive = next)}
			/>
		</section>
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
				form="plant-form"
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
