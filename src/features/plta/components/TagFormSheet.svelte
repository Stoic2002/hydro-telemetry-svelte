<script lang="ts">
	import IconPlus from '~icons/ph/plus';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Select from '$components/controls/Select.svelte';
	import StatusToggle from '$components/controls/StatusToggle.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createCreateTagMutation } from '../api/queries';
	import { getTagSaveErrorDetail } from '../error';
	import type { TagInputProtocol } from '../model';
	import {
		PARAMETER_LABEL,
		TAG_ADDRESS_MAX_LENGTH,
		TAG_LABEL_MAX_LENGTH,
		TAG_PANEL_OPTIONS,
		TAG_PARAMETER_OPTIONS,
		TAG_PATH_MAX_LENGTH,
		TAG_PROTOCOL_OPTIONS,
		TAG_STATION_MAX_LENGTH,
		emptyTagForm,
		parseTagForm,
		type TagFormValues
	} from '../tag-form';
	import type { MonitoringParameter } from '../../monitoring';

	interface Props {
		isOpen: boolean;
		pltaId: string;
		plantName: string;
		onClose: () => void;
	}

	let { isOpen, pltaId, plantName, onClose }: Props = $props();

	/**
	 * Daftarkan parameter baru untuk satu PLTA (khusus admin, `POST /tags`).
	 * Hanya parameter yang bukan formulasi: protokol `derived` tidak ditawarkan
	 * (keputusan rapat tim 27 Okt 2026). Bidang lanjutan (skala, batas valid)
	 * berbawaan aman, jadi form inti cukup parameter, protokol, dan alamat.
	 */
	const createMutation = createCreateTagMutation();
	/** Contoh placeholder rahasia; server mengganti `${…}` dengan variabel lingkungannya. */
	const ENV_PLACEHOLDER = '${NAMA_ENV}';

	let values = $state<TagFormValues>(emptyTagForm());
	let showErrors = $state(false);
	let serverProblems = $state<{ message: string; problems: string[] } | null>(null);

	$effect(() => {
		if (!isOpen) return;
		void pltaId;
		values = emptyTagForm();
		showErrors = false;
		serverProblems = null;
	});

	const parsed = $derived(parseTagForm(pltaId, values));
	const errors = $derived(showErrors && !parsed.ok ? parsed.errors : {});
	const isDirty = $derived(JSON.stringify(values) !== JSON.stringify(emptyTagForm()));
	const isPending = $derived(createMutation.isPending);
	const protocolConfig = $derived(
		TAG_PROTOCOL_OPTIONS.find((option) => option.value === values.protocol) ??
			TAG_PROTOCOL_OPTIONS[0]
	);

	/** Alamat bawaan "upload" hanya masuk akal untuk input manual. */
	function changeProtocol(next: string) {
		const protocol = next as TagInputProtocol;
		const address = values.address.trim();
		values.protocol = protocol;
		if (protocol === 'upload' && address === '') values.address = 'upload';
		else if (protocol !== 'upload' && address === 'upload') values.address = '';
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		showErrors = true;
		serverProblems = null;
		if (!parsed.ok) return;

		try {
			const tag = await createMutation.mutateAsync(parsed.input);
			const name =
				tag.label ?? PARAMETER_LABEL[tag.parameter as MonitoringParameter] ?? tag.parameter;
			notificationStore.addToast({
				type: 'success',
				message: `${name}${tag.station ? ` · ${tag.station}` : ''} ditambahkan ke PLTA ${plantName}`
			});
			onClose();
		} catch (error) {
			serverProblems = getTagSaveErrorDetail(error);
		}
	}
</script>

<Sheet {isOpen} title="Tambah parameter" isDismissible={!isPending} {isDirty} {onClose}>
	{#snippet description()}
		Sumber data baru untuk PLTA {plantName}. Parameter formulasi dihitung sistem dan tidak
		ditambahkan di sini.
	{/snippet}

	<form id="tag-form" onsubmit={save} class="flex flex-col gap-6" novalidate>
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

		<section class="flex flex-col gap-4">
			<Select
				label="Parameter"
				placeholder="Pilih parameter"
				bind:value={values.parameter}
				options={TAG_PARAMETER_OPTIONS}
				disabled={isPending}
				error={errors.parameter}
			/>
			<div class="grid gap-4 sm:grid-cols-2">
				<Input
					label="Station (opsional)"
					placeholder="mis. G1, KANAN"
					maxlength={TAG_STATION_MAX_LENGTH}
					bind:value={values.station}
					disabled={isPending}
					error={errors.station}
					helperText="Kosongkan bila hanya satu sumber."
				/>
				<Input
					label="Satuan (opsional)"
					placeholder="mis. mdpl, m3/s"
					bind:value={values.unit}
					disabled={isPending}
				/>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<Input
					label="Nama tampilan (opsional)"
					maxlength={TAG_LABEL_MAX_LENGTH}
					bind:value={values.label}
					disabled={isPending}
					error={errors.label}
				/>
				<Select
					label="Panel Hidrologi Harian"
					bind:value={values.panel}
					options={TAG_PANEL_OPTIONS}
					disabled={isPending}
				/>
			</div>
		</section>

		<section class="flex flex-col gap-4 border-t border-surface-overlay pt-5">
			<Select
				label="Protokol"
				value={values.protocol}
				onValueChange={changeProtocol}
				options={TAG_PROTOCOL_OPTIONS.map((option) => ({
					value: option.value,
					label: option.label
				}))}
				disabled={isPending}
			/>
			<Input
				label={protocolConfig.addressLabel}
				placeholder={protocolConfig.addressPlaceholder}
				maxlength={TAG_ADDRESS_MAX_LENGTH}
				bind:value={values.address}
				disabled={isPending}
				error={errors.address}
				helperText={protocolConfig.addressHint}
			/>

			{#if values.protocol === 'rest'}
				<label class="field-label flex flex-col gap-1.5">
					Header HTTP (opsional)
					<textarea
						rows="3"
						placeholder={'Authorization: Bearer ${API_TOKEN}'}
						bind:value={values.httpHeaders}
						disabled={isPending}
						aria-invalid={errors.httpHeaders ? 'true' : undefined}
						class={`field min-h-20 py-2 font-mono text-xs ${errors.httpHeaders ? 'field-invalid' : ''}`}
					></textarea>
					{#if errors.httpHeaders}
						<span class="text-xs font-medium text-status-danger-strong">{errors.httpHeaders}</span>
					{:else}
						<span class="text-xs font-normal text-text-muted">
							Satu per baris. Rahasia ditulis sebagai {ENV_PLACEHOLDER} yang diizinkan server.
						</span>
					{/if}
				</label>
				<div class="grid gap-4 sm:grid-cols-2">
					<Input
						label="Jalur nilai (opsional)"
						placeholder="[data.nama_station=X].data.tma"
						maxlength={TAG_PATH_MAX_LENGTH}
						bind:value={values.valuePath}
						disabled={isPending}
						error={errors.valuePath}
					/>
					<Input
						label="Jalur waktu (opsional)"
						maxlength={TAG_PATH_MAX_LENGTH}
						bind:value={values.timestampPath}
						disabled={isPending}
						error={errors.timestampPath}
					/>
				</div>
			{/if}
		</section>

		<section class="flex flex-col gap-4 border-t border-surface-overlay pt-5">
			<div class="grid grid-cols-2 gap-4">
				<Input
					label="Skala"
					type="number"
					step="any"
					bind:value={values.scale}
					disabled={isPending}
					error={errors.scale}
				/>
				<Input
					label="Offset"
					type="number"
					step="any"
					bind:value={values.offset}
					disabled={isPending}
					error={errors.offset}
				/>
				<Input
					label="Batas bawah"
					type="number"
					step="any"
					placeholder="Tanpa batas"
					bind:value={values.minValid}
					disabled={isPending}
				/>
				<Input
					label="Batas atas"
					type="number"
					step="any"
					placeholder="Tanpa batas"
					bind:value={values.maxValid}
					disabled={isPending}
					error={errors.maxValid}
				/>
			</div>
			<p class="-mt-2 text-xs text-text-muted">
				Biarkan skala 1 dan offset 0 bila bacaan tidak perlu dikonversi. Pembacaan di luar batas
				ditandai tidak wajar.
			</p>
			<StatusToggle
				label="Status parameter"
				align="stretch"
				isActive={values.enabled}
				disabled={isPending}
				onChange={(next) => (values.enabled = next)}
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
				form="tag-form"
				isLoading={isPending}
				disabled={!isDirty}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconPlus class="size-4" />{/snippet}
				{isPending ? 'Menyimpan…' : 'Tambah'}
			</Button>
		</div>
	{/snippet}
</Sheet>
