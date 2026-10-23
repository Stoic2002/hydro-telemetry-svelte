<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import IconFileSpreadsheet from '~icons/ph/microsoft-excel-logo';
	import IconPlus from '~icons/ph/plus';
	import IconSave from '~icons/ph/floppy-disk';
	import IconTrash from '~icons/ph/trash';
	import IconUpload from '~icons/ph/upload-simple';

	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
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
		buildDeleteRange,
		buildTelemetryPoints,
		type TelemetryPointRow,
		type TelemetryRangeBoundary
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

	function createPointRow(date: string): PointRow {
		pointRowId += 1;
		return { id: pointRowId, date, time: '00:00', value: null };
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
		rows = [createPointRow(defaultDate)];
		file = null;
		// Bawaan satu hari penuh pada tanggal panel. 23.59, bukan 23.00: data
		// manual tidak selalu jatuh tepat di jam bulat.
		deleteFrom = { date: defaultDate, time: '00:00' };
		deleteTo = { date: defaultDate, time: '23:59' };
		isConfirmOpen = false;
		templateScopeValue = 'day-hourly';
		templateDate = defaultDate;
		mode = 'manual';
	});

	const isPending = $derived(
		uploadPointsMutation.isPending ||
			uploadExcelMutation.isPending ||
			deletePointsMutation.isPending
	);
	/** Ada nilai yang sudah diketik atau berkas yang sudah dipilih. */
	const isDirty = $derived(
		file !== null || rows.length > 1 || rows.some((row) => row.value !== null)
	);
	const deleteRange = $derived(buildDeleteRange(deleteFrom, deleteTo));
	const templateScope = $derived(templateScopeValue as TelemetryTemplateScope);
	const unit = $derived(target.unit);
	const selectedStation = $derived(
		target.stations.find((option) => option.station === station) ?? target.stations[0]
	);

	const stationOptions = $derived(
		target.stations.map((option) => ({ value: option.station, label: option.label }))
	);

	async function submitManual() {
		const points = buildTelemetryPoints(rows);
		if (!points) {
			notificationStore.addToast({
				type: 'error',
				message: 'Lengkapi tanggal, jam, dan nilai tanpa timestamp duplikat'
			});
			return;
		}

		try {
			const result = await uploadPointsMutation.mutateAsync({
				pltaId,
				parameter: target.parameter,
				station,
				points
			});
			notificationStore.addToast({
				type: 'success',
				message: `${result.pointsUpserted} titik ${target.label} berhasil disimpan`
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

		<div class="grid grid-cols-3 border-b border-border-subtle">
			{#each MODE_TABS as tab (tab.value)}
				<button
					type="button"
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
			<section class="flex flex-col gap-4">
				<p class="text-xs text-text-muted">Waktu dalam WIB. Waktu yang sama menimpa nilai lama.</p>

				<div class="divide-y divide-surface-overlay border-y border-surface-overlay">
					{#each rows as row, index (row.id)}
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
							<div class="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr]">
								<label class="field-label flex flex-col gap-1.5">
									Tanggal
									<input
										type="date"
										bind:value={row.date}
										disabled={isPending}
										class="field h-10"
									/>
								</label>
								<label class="field-label flex flex-col gap-1.5">
									Jam
									<input
										type="time"
										bind:value={row.time}
										disabled={isPending}
										class="field h-10"
									/>
								</label>
								<label class="field-label flex flex-col gap-1.5">
									Nilai {unit ? `(${unit})` : ''}
									<input
										type="number"
										step="any"
										placeholder="0"
										bind:value={row.value}
										disabled={isPending}
										class="field h-10"
									/>
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
					Tambah titik data
				</button>
			</section>
		{:else if mode === 'excel'}
			<section class="flex flex-col gap-4">
				<p class="text-xs text-text-muted">
					Satu berkas untuk parameter ini saja. Paling mudah mulai dari template.
				</p>

				<div class="flex flex-col gap-3 rounded-xl border border-border-subtle p-4">
					<div>
						<h4 class="text-xs font-semibold text-text-strong">Template</h4>
						<p class="mt-1 text-xs text-text-muted">
							Sudah berisi nilai tersimpan; cukup dikoreksi.
						</p>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<Select
							label="Isi template"
							bind:value={templateScopeValue}
							disabled={isPending || templateMutation.isPending}
							options={TELEMETRY_TEMPLATE_SCOPE_OPTIONS}
						/>
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
			</section>
		{:else}
			<section class="flex flex-col gap-4">
				<!-- Nilai salah cukup diunggah ulang di waktu yang sama; tab ini untuk jam/station keliru. -->
				<p class="text-xs text-text-muted">
					Untuk jam atau station yang keliru. Hanya isian manual dan unggahan yang terhapus — data
					sensor aman. Waktu awal dan akhir ikut terhapus.
				</p>

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
			</section>
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
