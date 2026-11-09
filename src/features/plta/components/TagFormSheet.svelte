<script lang="ts">
	import IconPlus from '~icons/ph/plus';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Select from '$components/controls/Select.svelte';
	import StatusToggle from '$components/controls/StatusToggle.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import InfoTip from '$components/ui/InfoTip.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import {
		createCreateTagMutation,
		createFormulaDictionaryQuery,
		createParameterCatalogQuery
	} from '../api/queries';
	import FormulaEditor from './FormulaEditor.svelte';
	import {
		emptyFormulaForm,
		formulaCodePattern,
		parseFormulaForm,
		type FormulaFormValues
	} from '../formula-form';
	import { getTagSaveErrorDetail } from '../error';
	import type { TagInputProtocol } from '../model';
	import {
		DERIVED_KIND_OPTIONS,
		TAG_ADDRESS_MAX_LENGTH,
		TAG_LABEL_MAX_LENGTH,
		TAG_PANEL_OPTIONS,
		TAG_PATH_MAX_LENGTH,
		TAG_PROTOCOL_OPTIONS,
		TAG_STATION_MAX_LENGTH,
		derivedKindConfig,
		emptyTagForm,
		parseTagForm,
		tagParameterOptions,
		type DerivedKind,
		type TagFormValues
	} from '../tag-form';

	interface Props {
		isOpen: boolean;
		pltaId: string;
		plantName: string;
		onClose: () => void;
	}

	let { isOpen, pltaId, plantName, onClose }: Props = $props();

	/**
	 * Daftarkan parameter baru untuk satu PLTA (khusus admin, `POST /tags`).
	 * Bidang lanjutan (skala, batas valid) berbawaan aman, jadi form inti cukup
	 * parameter, protokol, dan alamat. Protokol **Formulasi** (`derived`, sejak
	 * Swagger 9 Nov 2026) mengunci parameter dan alamatnya sesuai jenisnya.
	 */
	const createMutation = createCreateTagMutation();
	const catalogQuery = createParameterCatalogQuery(() => isOpen);
	const parameterOptions = $derived(tagParameterOptions(catalogQuery.data));
	/** Contoh placeholder rahasia; server mengganti `${…}` dengan variabel lingkungannya. */
	const ENV_PLACEHOLDER = '${NAMA_ENV}';

	let values = $state<TagFormValues>(emptyTagForm());
	let formulaValues = $state<FormulaFormValues>(emptyFormulaForm());
	let showErrors = $state(false);
	let serverProblems = $state<{ message: string; problems: string[] } | null>(null);
	/** Satuan terakhir yang diisi otomatis; isian tangan pengguna tidak ditimpa. */
	let autoUnit = $state('');

	$effect(() => {
		if (!isOpen) return;
		void pltaId;
		values = emptyTagForm();
		formulaValues = emptyFormulaForm();
		showErrors = false;
		serverProblems = null;
		autoUnit = '';
	});

	const isDerived = $derived(values.protocol === 'derived');
	const isSwc = $derived(isDerived && values.derivedKind === 'swc');
	const isRumus = $derived(isDerived && values.derivedKind === 'rumus');

	// Kamus hanya dimuat saat rumus kustom dipilih; statis per rilis server.
	const dictionaryQuery = createFormulaDictionaryQuery(() => isOpen && isRumus);
	const formulaParsed = $derived(parseFormulaForm(formulaValues, dictionaryQuery.data));
	const formulaErrors = $derived(showErrors ? formulaParsed.errors : { rows: {} });
	const formula = $derived(formulaParsed.ok ? formulaParsed.formula : null);

	const parsed = $derived(
		parseTagForm(pltaId, values, {
			formula: isRumus ? formula : null,
			codePattern: formulaCodePattern(dictionaryQuery.data)
		})
	);
	const errors = $derived(showErrors && !parsed.ok ? parsed.errors : {});
	const isDirty = $derived(
		JSON.stringify(values) !== JSON.stringify(emptyTagForm()) ||
			(isRumus && JSON.stringify(formulaValues) !== JSON.stringify(emptyFormulaForm()))
	);
	/** Kode rumus seperti yang akan dikirim, untuk Uji rumus. */
	const formulaCode = $derived(values.station.trim().toUpperCase());
	const isPending = $derived(createMutation.isPending);
	const protocolConfig = $derived(
		TAG_PROTOCOL_OPTIONS.find((option) => option.value === values.protocol) ??
			TAG_PROTOCOL_OPTIONS[0]
	);

	function changeParameter(next: string) {
		values.parameter = next;
		const unit = catalogQuery.data?.find((item) => item.key === next)?.unit ?? '';
		if (values.unit === '' || values.unit === autoUnit) {
			values.unit = unit;
			autoUnit = unit;
		}
	}

	/**
	 * Alamat bawaan "upload" hanya masuk akal untuk input manual. Formulasi
	 * mengunci parameternya; meninggalkan formulasi melepas kunci itu.
	 */
	function changeProtocol(next: string) {
		const protocol = next as TagInputProtocol;
		const wasDerived = values.protocol === 'derived';
		const address = values.address.trim();
		values.protocol = protocol;
		if (protocol === 'derived') {
			changeDerivedKind(values.derivedKind);
			return;
		}
		if (wasDerived) {
			values.parameter = '';
			values.address = protocol === 'upload' ? 'upload' : '';
			return;
		}
		if (protocol === 'upload' && address === '') values.address = 'upload';
		else if (protocol !== 'upload' && address === 'upload') values.address = '';
	}

	function changeDerivedKind(next: string) {
		values.derivedKind = next as DerivedKind;
		changeParameter(derivedKindConfig(values.derivedKind).parameter);
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		showErrors = true;
		serverProblems = null;
		if (!parsed.ok) return;

		try {
			const tag = await createMutation.mutateAsync(parsed.input);
			const name =
				tag.label ??
				catalogQuery.data?.find((item) => item.key === tag.parameter)?.label ??
				tag.parameter;
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
		Sumber data baru untuk PLTA {plantName}.
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
				value={values.parameter}
				onValueChange={changeParameter}
				options={isRumus ? [{ value: 'rumus', label: 'Rumus kustom · rumus' }] : parameterOptions}
				disabled={isPending || catalogQuery.isLoading || isDerived}
				error={errors.parameter}
				hint={isDerived
					? 'Ditentukan jenis formulasi yang dipilih di bawah.'
					: 'Untuk parameter yang dihitung server, pilih protokol Formulasi.'}
			/>
			<div class="grid gap-4 sm:grid-cols-2">
				<Input
					label={isSwc ? 'Unit turbin' : isRumus ? 'Kode rumus' : 'Station (opsional)'}
					placeholder={isSwc ? 'mis. T1' : isRumus ? 'mis. EFISIENSI_TOTAL' : 'mis. G1, KANAN'}
					maxlength={TAG_STATION_MAX_LENGTH}
					bind:value={values.station}
					disabled={isPending}
					error={errors.station}
					hint={isSwc
						? 'Satu tag per unit turbin.'
						: isRumus
							? 'Huruf besar, angka, dan garis bawah. Hasilnya tampil sebagai deret rumus dengan kode ini di panel harian, tren, dan laporan.'
							: 'Kosongkan bila hanya satu sumber.'}
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
			{#if isDerived}
				<Select
					label="Jenis formulasi"
					value={values.derivedKind}
					onValueChange={changeDerivedKind}
					options={DERIVED_KIND_OPTIONS.map((option) => ({
						value: option.value,
						label: option.label
					}))}
					disabled={isPending}
					hint="Dihitung server tiap jam, mulai siklus jam berikutnya setelah disimpan. Maksimal 50 rumus per PLTA."
				/>
				{#if isSwc}
					<!--
						Ditulis langsung, bukan tooltip: harus dibaca sebelum menyimpan.
						Satu unit bertanda mengubah cara total debit PLTA dihitung.
					-->
					<p class="text-xs leading-5 text-status-warning-strong">
						Debit unit = beban unit × SWC ÷ 3,6. Tandai <strong>semua</strong> unit turbin PLTA ini: begitu
						ada satu unit bertanda, total debit PLTA = jumlah unit yang bertanda.
					</p>
				{/if}
				{#if isRumus}
					{#if dictionaryQuery.isError}
						<p class="text-xs text-status-warning-strong">
							Kamus rumus belum termuat; pilihan konstanta belum tersedia.
						</p>
					{/if}
					<FormulaEditor
						bind:values={formulaValues}
						errors={formulaErrors}
						dictionary={dictionaryQuery.data}
						{parameterOptions}
						disabled={isPending}
						{pltaId}
						code={formulaCode}
						{formula}
						onInvalidTest={() => (showErrors = true)}
					/>
				{/if}
			{:else}
				<Input
					label={protocolConfig.addressLabel}
					placeholder={protocolConfig.addressPlaceholder}
					maxlength={TAG_ADDRESS_MAX_LENGTH}
					bind:value={values.address}
					disabled={isPending}
					error={errors.address}
					hint={protocolConfig.addressHint}
				/>

				{#if values.protocol === 'rest'}
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center gap-1.5">
							<label for="tag-http-headers" class="field-label">Header HTTP (opsional)</label>
							<InfoTip
								label="Keterangan Header HTTP"
								text={`Satu per baris. Rahasia ditulis sebagai ${ENV_PLACEHOLDER} yang diizinkan server.`}
							/>
						</div>
						<textarea
							id="tag-http-headers"
							rows="3"
							placeholder={'Authorization: Bearer ${API_TOKEN}'}
							bind:value={values.httpHeaders}
							disabled={isPending}
							aria-invalid={errors.httpHeaders ? 'true' : undefined}
							aria-describedby={errors.httpHeaders ? 'tag-http-headers-error' : undefined}
							class={`field min-h-20 py-2 font-mono text-xs ${errors.httpHeaders ? 'field-invalid' : ''}`}
						></textarea>
						{#if errors.httpHeaders}
							<span
								id="tag-http-headers-error"
								class="text-xs font-medium text-status-danger-strong"
							>
								{errors.httpHeaders}
							</span>
						{/if}
					</div>
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
			{/if}
		</section>

		<section class="flex flex-col gap-4 border-t border-surface-overlay pt-5">
			<div class="grid grid-cols-2 gap-4">
				{#if !isDerived}
					<Input
						label="Skala"
						hint="Biarkan skala 1 dan offset 0 bila bacaan tidak perlu dikonversi."
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
				{/if}
				<Input
					label="Batas bawah"
					hint="Pembacaan di luar batas ditandai tidak wajar."
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
