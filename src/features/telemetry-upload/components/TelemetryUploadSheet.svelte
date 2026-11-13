<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import IconFileSpreadsheet from '~icons/ph/microsoft-excel-logo';
	import IconPlus from '~icons/ph/plus';
	import IconSave from '~icons/ph/floppy-disk';
	import IconTrash from '~icons/ph/trash';
	import IconUpload from '~icons/ph/upload-simple';

	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
	import InfoTip from '$components/ui/InfoTip.svelte';
	import ConfirmDialog from '$components/ui/ConfirmDialog.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { formatLongCalendarDate } from '$shared/lib/date';
	import { downloadBlob } from '$shared/lib/download';
	import {
		createDeleteTelemetryPointsMutation,
		createDownloadTelemetryTemplateMutation,
		createUploadTelemetryExcelMutation,
		createUploadTelemetryPointsMutation
	} from '../api/queries';
	import {
		getTelemetryDeleteErrorMessage,
		getTelemetryTemplateErrorMessage,
		getTelemetryUploadErrorMessage
	} from '../error';
	import type { DailyTelemetryUploadTarget, TelemetryTemplateScope } from '../model';
	import {
		MAX_TELEMETRY_POINTS,
		buildConstantPoint,
		buildDeleteRange,
		buildTelemetryPoints,
		hasTelemetryRowErrors,
		initialTelemetryRow,
		isConstantParameter,
		isDailyValueParameter,
		validateTelemetryRows,
		type TelemetryPointRow,
		type TelemetryRangeBoundary,
		type TelemetryRowErrors
	} from '../points';
	import {
		TELEMETRY_TEMPLATE_SCOPE_OPTIONS,
		formatTemplateMonth,
		telemetryTemplateFilename
	} from '../template';

	interface Props {
		isOpen: boolean;
		pltaId: string;
		plantName: string;
		defaultDate: string;
		target: DailyTelemetryUploadTarget;
		onClose: () => void;
	}

	let { isOpen, pltaId, plantName, defaultDate, target, onClose }: Props = $props();

	const MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024;
	const MAX_POINTS = MAX_TELEMETRY_POINTS;

	interface PointRow extends TelemetryPointRow {
		id: number;
	}

	let pointRowId = 0;

	function createPointRow(date: string, initial?: TelemetryPointRow): PointRow {
		pointRowId += 1;
		return { id: pointRowId, date, time: '00:00', value: null, ...initial };
	}

	/** Isian saat panel dibuka; `isDirty` membandingkan dengan ini, bukan dengan kosong. */
	let rowsBaseline = $state('');
	/** Galat baris baru ditampilkan setelah operator menekan Simpan sekali. */
	let showRowErrors = $state(false);
	/** Form "Edit data" terbuka berisi nilai tersimpan. */
	let isPrefilled = $state(false);

	function rowsSignature(items: readonly TelemetryPointRow[]): string {
		return JSON.stringify(items.map(({ date, time, value }) => ({ date, time, value })));
	}

	const uploadPointsMutation = createUploadTelemetryPointsMutation();
	const uploadExcelMutation = createUploadTelemetryExcelMutation();
	const deletePointsMutation = createDeleteTelemetryPointsMutation();
	const templateMutation = createDownloadTelemetryTemplateMutation();

	type Mode = 'manual' | 'excel' | 'delete';

	const MODE_TABS: { value: Mode; label: string }[] = [
		{ value: 'manual', label: 'Input Manual' },
		{ value: 'excel', label: 'Upload Excel' },
		{ value: 'delete', label: 'Hapus Data' }
	];

	let mode = $state<Mode>('manual');
	let station = $state('');
	let rows = $state<PointRow[]>([]);
	let file = $state<File | null>(null);
	let deleteFrom = $state<TelemetryRangeBoundary>({ date: '', time: '00:00' });
	let deleteTo = $state<TelemetryRangeBoundary>({ date: '', time: '23:59' });
	let isConfirmOpen = $state(false);
	let templateScopeValue = $state<string>('day-hourly');
	let templateDate = $state('');

	/**
	 * Panel yang sama dipakai ulang untuk parameter mana pun yang diklik di kartu,
	 * jadi isiannya disetel ulang setiap kali targetnya berganti — bukan hanya
	 * saat komponen pertama dipasang.
	 */
	$effect(() => {
		station = target.stations[0]?.station ?? '';
		const firstRow = createPointRow(
			defaultDate,
			initialTelemetryRow(target.current, defaultDate, {
				constant: isConstantParameter(target.parameter),
				dailyValue: isDailyValueParameter(target.parameter)
			})
		);
		rows = [firstRow];
		rowsBaseline = rowsSignature([firstRow]);
		isPrefilled = firstRow.value !== null;
		showRowErrors = false;
		file = null;
		// Bawaan satu hari penuh pada tanggal panel. 23.59, bukan 23.00: data
		// manual tidak selalu jatuh tepat di jam bulat.
		deleteFrom = { date: defaultDate, time: '00:00' };
		deleteTo = { date: defaultDate, time: '23:59' };
		isConfirmOpen = false;
		templateScopeValue = isDailyValueParameter(target.parameter) ? 'month-daily' : 'day-hourly';
		templateDate = defaultDate;
		mode = 'manual';
	});

	const isPending = $derived(
		uploadPointsMutation.isPending ||
			uploadExcelMutation.isPending ||
			deletePointsMutation.isPending
	);
	/** Isian berubah dari saat panel dibuka, atau berkas sudah dipilih. */
	const isDirty = $derived(file !== null || rowsSignature(rows) !== rowsBaseline);
	const deleteRange = $derived(buildDeleteRange(deleteFrom, deleteTo));
	const templateScope = $derived(templateScopeValue as TelemetryTemplateScope);
	const unit = $derived(target.unit);
	/** Konstanta: cukup satu nilai, tanpa tanggal, tanpa tab Excel dan Hapus. */
	const isConstant = $derived(isConstantParameter(target.parameter));
	/** Target TMA: tanggal dan nilai saja; template satu baris per tanggal. */
	const isDailyValue = $derived(isDailyValueParameter(target.parameter));
	const selectedStation = $derived(
		target.stations.find((option) => option.station === station) ?? target.stations[0]
	);

	const stationOptions = $derived(
		target.stations.map((option) => ({ value: option.station, label: option.label }))
	);

	/**
	 * Galat per bidang, ditampilkan sesudah Simpan ditekan sekali dan langsung
	 * hilang begitu bidangnya diperbaiki. Konstanta hanya punya bidang Nilai.
	 */
	const rowErrors = $derived(
		showRowErrors
			? isConstant
				? [
						rows[0]?.value === null || !Number.isFinite(rows[0]?.value)
							? { value: 'Isi nilai.' }
							: {}
					]
				: validateTelemetryRows(rows, { dailyValue: isDailyValue })
			: []
	);

	async function submitManual() {
		showRowErrors = true;
		const points = isConstant
			? buildConstantPoint(rows[0]?.value ?? null)
			: hasTelemetryRowErrors(validateTelemetryRows(rows, { dailyValue: isDailyValue }))
				? null
				: buildTelemetryPoints(rows);
		if (!points) return;

		try {
			const result = await uploadPointsMutation.mutateAsync({
				pltaId,
				parameter: target.parameter,
				station,
				points
			});
			notificationStore.addToast({
				type: 'success',
				message: isConstant
					? `${target.label} berhasil disimpan`
					: `${result.pointsUpserted} titik ${target.label} berhasil disimpan`
			});
			onClose();
		} catch (error) {
			notificationStore.addToast({
				type: 'error',
				message: getTelemetryUploadErrorMessage(error)
			});
		}
	}

	async function submitExcel() {
		if (!file) {
			notificationStore.addToast({ type: 'error', message: 'Pilih file Excel terlebih dahulu' });
			return;
		}
		if (!file.name.toLowerCase().endsWith('.xlsx')) {
			notificationStore.addToast({
				type: 'error',
				message: 'File harus menggunakan format .xlsx'
			});
			return;
		}
		if (file.size > MAX_EXCEL_FILE_SIZE) {
			notificationStore.addToast({ type: 'error', message: 'Ukuran file maksimal 5 MB' });
			return;
		}

		try {
			const result = await uploadExcelMutation.mutateAsync({
				pltaId,
				parameter: target.parameter,
				station,
				file
			});
			notificationStore.addToast({
				type: 'success',
				message: `${result.pointsUpserted} titik dari ${file.name} berhasil disimpan`
			});
			onClose();
		} catch (error) {
			notificationStore.addToast({
				type: 'error',
				message: getTelemetryUploadErrorMessage(error)
			});
		}
	}

	async function downloadTemplate() {
		if (!templateDate) return;

		try {
			const blob = await templateMutation.mutateAsync({
				pltaId,
				parameter: target.parameter,
				station,
				scope: templateScope,
				date: templateDate
			});
			downloadBlob(
				blob,
				telemetryTemplateFilename(target.parameter, station, templateScope, templateDate)
			);
		} catch (error) {
			notificationStore.addToast({
				type: 'error',
				message: getTelemetryTemplateErrorMessage(error)
			});
		}
	}

	function formatBoundary(boundary: TelemetryRangeBoundary): string {
		return `${formatLongCalendarDate(boundary.date)} pukul ${boundary.time.replace(':', '.')}`;
	}

	async function deletePoints() {
		if (!deleteRange.ok) return;

		try {
			const result = await deletePointsMutation.mutateAsync({
				pltaId,
				parameter: target.parameter,
				station,
				start: deleteRange.start,
				end: deleteRange.end
			});
			isConfirmOpen = false;
			if (result.pointsDeleted === 0) {
				// Bukan galat: rentangnya sah, hanya tidak ada data manual di sana.
				notificationStore.addToast({
					type: 'info',
					message: `Tidak ada data manual ${target.label} pada rentang itu`
				});
				return;
			}
			notificationStore.addToast({
				type: 'success',
				message: `${result.pointsDeleted} titik ${target.label} berhasil dihapus`
			});
			onClose();
		} catch (error) {
			isConfirmOpen = false;
			notificationStore.addToast({
				type: 'error',
				message: getTelemetryDeleteErrorMessage(error)
			});
		}
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (mode === 'manual') await submitManual();
		else if (mode === 'excel') await submitExcel();
		else if (deleteRange.ok) isConfirmOpen = true;
	}
</script>

<Sheet {isOpen} title="Input Data Harian" isDismissible={!isPending} {isDirty} {onClose}>
	{#snippet description()}
		Input {target.label} untuk PLTA {plantName}.
	{/snippet}

	<form
		id="telemetry-upload-form"
		onsubmit={(event) => void submit(event)}
		class="flex flex-col gap-6"
	>
		<!--
			Nama parameter sudah di deskripsi sheet; yang tersisa satuan dan
			station dalam satu baris. Dulu blok tersendiri yang juga menampilkan
			kunci parameter mentah (23 Okt 2026).
		-->
		{#if target.stations.length > 1}
			<Select label="Station" bind:value={station} disabled={isPending} options={stationOptions} />
			{#if unit}<p class="-mt-4 text-xs text-text-muted">Satuan {unit}</p>{/if}
		{:else}
			<p class="text-xs text-text-muted">
				Satuan <span class="font-medium text-text-secondary">{unit || '—'}</span>
				· Station
				<span class="font-medium text-text-secondary">{selectedStation?.label ?? 'Default'}</span>
			</p>
		{/if}

		{#if isConstant}
			<!--
				Konstanta tidak punya tanggal (27 Okt 2026): cukup satu nilai. Tab
				Upload Excel dan Hapus Data tidak ditawarkan — server menolak
				konstanta di template dan unggah Excel.
			-->
			<section class="flex flex-col gap-2">
				{#if rows[0]}
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center gap-1.5">
							<label for="telemetry-constant-value" class="field-label">
								Nilai {unit ? `(${unit})` : ''}
							</label>
							<InfoTip
								label="Keterangan nilai konstanta"
								text="Konstanta berlaku tanpa tanggal; nilai baru menggantikan yang lama."
							/>
						</div>
						<input
							id="telemetry-constant-value"
							type="number"
							step="any"
							placeholder="0"
							bind:value={rows[0].value}
							disabled={isPending}
							aria-invalid={rowErrors[0]?.value ? 'true' : undefined}
							aria-describedby={rowErrors[0]?.value ? 'telemetry-constant-value-error' : undefined}
							class={`field h-10 ${rowErrors[0]?.value ? 'field-invalid' : ''}`}
						/>
						{#if rowErrors[0]?.value}
							<span
								id="telemetry-constant-value-error"
								class="text-xs font-medium text-status-danger-strong"
							>
								{rowErrors[0].value}
							</span>
						{/if}
					</div>
				{/if}
			</section>
		{:else}
			<!-- Peran tab (temuan aksesibilitas QA): dulu tiga tombol polos. -->
			<div
				role="tablist"
				aria-label="Cara mengisi"
				class="grid grid-cols-3 border-b border-border-subtle"
			>
				{#each MODE_TABS as tab (tab.value)}
					<button
						id={`telemetry-mode-tab-${tab.value}`}
						type="button"
						role="tab"
						aria-selected={mode === tab.value}
						aria-controls={`telemetry-mode-panel-${tab.value}`}
						disabled={isPending}
						onclick={() => (mode = tab.value)}
						class={`cursor-pointer border-b-2 px-3 py-3 text-xs font-medium transition-colors ${
							mode === tab.value
								? 'border-brand-primary-strong text-brand-primary-pressed'
								: 'border-transparent text-text-muted hover:text-text-secondary'
						}`}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			{#if mode === 'manual'}
				<div
					id="telemetry-mode-panel-manual"
					role="tabpanel"
					aria-labelledby="telemetry-mode-tab-manual"
					class="flex flex-col gap-4"
				>
					<div class="flex items-start gap-1.5">
						<p class="text-xs text-text-muted">
							{isDailyValue ? 'Satu nilai per tanggal, pukul 00.00 WIB.' : 'Waktu dalam WIB.'}
							{#if isPrefilled}
								Terisi nilai yang tersimpan — ubah lalu simpan untuk menimpanya.
							{/if}
						</p>
						<InfoTip
							label="Keterangan isian manual"
							text={isDailyValue
								? 'Tanggal yang sama menimpa nilai lama.'
								: 'Waktu yang sama menimpa nilai lama.'}
						/>
					</div>

					<div class="divide-y divide-surface-overlay border-y border-surface-overlay">
						{#each rows as row, index (row.id)}
							{@const errors: TelemetryRowErrors = rowErrors[index] ?? {}}
							<div class="py-4">
								<div class="mb-3 flex items-center justify-between">
									<span class="text-xs font-medium text-text-muted">Data {index + 1}</span>
									{#if rows.length > 1}
										<button
											type="button"
											disabled={isPending}
											onclick={() => (rows = rows.filter((item) => item.id !== row.id))}
											aria-label={`Hapus data ${index + 1}`}
											class="inline-flex size-8 cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-status-danger-soft hover:text-status-danger-strong disabled:cursor-not-allowed disabled:opacity-50"
										>
											<IconTrash class="size-4" />
										</button>
									{/if}
								</div>

								<!-- Tanggal, jam, dan nilai sebaris: satu titik data = satu baris. -->
								<div
									class={`grid gap-3 ${isDailyValue ? 'sm:grid-cols-2' : 'sm:grid-cols-[1.3fr_1fr_1fr]'}`}
								>
									<label class="field-label flex flex-col gap-1.5">
										Tanggal
										<input
											type="date"
											bind:value={row.date}
											disabled={isPending}
											aria-invalid={errors.date ? 'true' : undefined}
											class={`field h-10 ${errors.date ? 'field-invalid' : ''}`}
										/>
										{#if errors.date}
											<span class="text-xs font-medium text-status-danger-strong"
												>{errors.date}</span
											>
										{/if}
									</label>
									{#if !isDailyValue}
										<label class="field-label flex flex-col gap-1.5">
											Jam
											<input
												type="time"
												bind:value={row.time}
												disabled={isPending}
												aria-invalid={errors.time ? 'true' : undefined}
												class={`field h-10 ${errors.time ? 'field-invalid' : ''}`}
											/>
											{#if errors.time}
												<span class="text-xs font-medium text-status-danger-strong">
													{errors.time}
												</span>
											{/if}
										</label>
									{/if}
									<label class="field-label flex flex-col gap-1.5">
										Nilai {unit ? `(${unit})` : ''}
										<input
											type="number"
											step="any"
											placeholder="0"
											bind:value={row.value}
											disabled={isPending}
											aria-invalid={errors.value ? 'true' : undefined}
											class={`field h-10 ${errors.value ? 'field-invalid' : ''}`}
										/>
										{#if errors.value}
											<span class="text-xs font-medium text-status-danger-strong"
												>{errors.value}</span
											>
										{/if}
									</label>
								</div>
							</div>
						{/each}
					</div>

					<button
						type="button"
						disabled={isPending || rows.length >= MAX_POINTS}
						onclick={() => (rows = [...rows, createPointRow(rows.at(-1)?.date || defaultDate)])}
						class="inline-flex cursor-pointer items-center gap-1.5 self-start text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed disabled:cursor-not-allowed disabled:opacity-50"
					>
						<IconPlus class="size-4" />
						{isDailyValue ? 'Tambah tanggal' : 'Tambah titik data'}
					</button>
				</div>
			{:else if mode === 'excel'}
				<div
					id="telemetry-mode-panel-excel"
					role="tabpanel"
					aria-labelledby="telemetry-mode-tab-excel"
					class="flex flex-col gap-4"
				>
					<div class="flex flex-col gap-3 rounded-xl border border-border-subtle p-4">
						<div class="flex items-center gap-1.5">
							<h4 class="text-xs font-semibold text-text-strong">Template</h4>
							<InfoTip
								label="Keterangan template"
								text="Satu berkas untuk parameter ini saja. Template sudah berisi nilai tersimpan, jadi cukup dikoreksi lalu diunggah."
							/>
						</div>

						<div class="grid gap-3 sm:grid-cols-2">
							{#if !isDailyValue}
								<Select
									label="Isi template"
									bind:value={templateScopeValue}
									disabled={isPending || templateMutation.isPending}
									options={TELEMETRY_TEMPLATE_SCOPE_OPTIONS}
								/>
							{/if}
							<label class="field-label flex flex-col gap-1.5">
								Tanggal
								<input
									type="date"
									bind:value={templateDate}
									disabled={isPending || templateMutation.isPending}
									class="field h-10"
								/>
							</label>
						</div>

						{#if templateScope !== 'day-hourly' && templateDate}
							<p class="text-xs text-text-muted">
								Mencakup seluruh {formatTemplateMonth(templateDate)}.
							</p>
						{/if}

						<button
							type="button"
							onclick={() => void downloadTemplate()}
							disabled={isPending || templateMutation.isPending || !templateDate}
							class="btn btn-ghost btn-sm h-9 self-start"
						>
							<IconDownload class="size-3.5" />
							{templateMutation.isPending ? 'Menyiapkan…' : 'Unduh Template'}
						</button>
					</div>

					<label
						class="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-5 py-8 text-center transition-colors hover:border-brand-primary-strong hover:bg-brand-tint/40"
					>
						<IconFileSpreadsheet class="size-8 text-brand-primary-strong" />
						<span class="mt-3 text-sm font-medium text-text-secondary">
							{file?.name ?? 'Pilih file Excel'}
						</span>
						<span class="mt-1 text-xs text-text-muted">Format .xlsx, maksimal 5 MB</span>
						<input
							type="file"
							accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
							disabled={isPending}
							onchange={(event) => (file = event.currentTarget.files?.[0] ?? null)}
							class="sr-only"
						/>
					</label>
				</div>
			{:else}
				<div
					id="telemetry-mode-panel-delete"
					role="tabpanel"
					aria-labelledby="telemetry-mode-tab-delete"
					class="flex flex-col gap-4"
				>
					<!-- Nilai salah cukup diunggah ulang di waktu yang sama; tab ini untuk jam/station keliru. -->
					<div class="flex items-start gap-1.5">
						<p class="text-xs text-text-muted">Waktu awal dan akhir ikut terhapus.</p>
						<InfoTip
							label="Keterangan hapus data"
							text="Untuk jam atau station yang keliru. Hanya isian manual dan unggahan yang terhapus — data sensor aman."
						/>
					</div>

					{#each [{ label: 'Dari', boundary: deleteFrom }, { label: 'Sampai', boundary: deleteTo }] as item (item.label)}
						<fieldset class="grid gap-3 sm:grid-cols-2">
							<legend class="mb-2 text-xs font-medium text-text-muted">{item.label}</legend>
							<label class="field-label flex flex-col gap-1.5">
								Tanggal
								<input
									type="date"
									bind:value={item.boundary.date}
									disabled={isPending}
									class="field h-10"
								/>
							</label>
							<label class="field-label flex flex-col gap-1.5">
								Jam
								<input
									type="time"
									bind:value={item.boundary.time}
									disabled={isPending}
									class="field h-10"
								/>
							</label>
						</fieldset>
					{/each}

					{#if !deleteRange.ok}
						<p class="text-xs font-medium text-status-danger-strong">{deleteRange.error}</p>
					{/if}
				</div>
			{/if}
		{/if}
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
				form="telemetry-upload-form"
				variant={mode === 'delete' ? 'danger' : 'primary'}
				isLoading={isPending}
				disabled={mode === 'delete' && !deleteRange.ok}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}
					{#if mode === 'manual'}<IconSave class="size-4" />{:else if mode === 'excel'}<IconUpload
							class="size-4"
						/>{:else}<IconTrash class="size-4" />{/if}
				{/snippet}
				{#if isPending}
					{mode === 'manual' ? 'Menyimpan…' : mode === 'excel' ? 'Mengunggah…' : 'Menghapus…'}
				{:else}
					{mode === 'manual' ? 'Simpan Data' : mode === 'excel' ? 'Upload Excel' : 'Hapus Data'}
				{/if}
			</Button>
		</div>
	{/snippet}
</Sheet>

<ConfirmDialog
	isOpen={isConfirmOpen}
	variant="danger"
	title={`Hapus data manual ${target.label}?`}
	confirmLabel={deletePointsMutation.isPending ? 'Menghapus…' : 'Ya, Hapus'}
	cancelLabel="Batal"
	isConfirming={deletePointsMutation.isPending}
	onConfirm={() => void deletePoints()}
	onClose={() => (isConfirmOpen = false)}
>
	{#snippet icon()}<IconTrash class="size-5" />{/snippet}
	{#snippet description()}
		Seluruh data manual {target.label}
		{#if target.stations.length > 1}station <strong>{selectedStation?.label}</strong>{/if}
		di PLTA {plantName} dari <strong>{formatBoundary(deleteFrom)}</strong> sampai
		<strong>{formatBoundary(deleteTo)}</strong> akan dihapus dan tidak dapat dikembalikan. Penghapusan
		tercatat di riwayat unggah.
	{/snippet}
</ConfirmDialog>
