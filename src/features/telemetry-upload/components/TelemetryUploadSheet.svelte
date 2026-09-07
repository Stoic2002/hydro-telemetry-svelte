<script lang="ts">
	import IconFileSpreadsheet from '~icons/ph/microsoft-excel-logo';
	import IconPlus from '~icons/ph/plus';
	import IconSave from '~icons/ph/floppy-disk';
	import IconTrash from '~icons/ph/trash';
	import IconUpload from '~icons/ph/upload-simple';

	import Button from '$components/atoms/Button.svelte';
	import Select from '$components/atoms/Select.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import {
		createUploadTelemetryExcelMutation,
		createUploadTelemetryPointsMutation
	} from '../api/queries';
	import { getTelemetryUploadErrorMessage } from '../error';
	import type { DailyTelemetryUploadTarget, TelemetryUploadPoint } from '../model';

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
	const MAX_POINTS = 20_000;

	interface PointRow {
		id: number;
		date: string;
		time: string;
		value: string;
	}

	let pointRowId = 0;

	function createPointRow(date: string): PointRow {
		pointRowId += 1;
		return { id: pointRowId, date, time: '00:00', value: '' };
	}

	const uploadPointsMutation = createUploadTelemetryPointsMutation();
	const uploadExcelMutation = createUploadTelemetryExcelMutation();

	let mode = $state<'manual' | 'excel'>('manual');
	let station = $state('');
	let rows = $state<PointRow[]>([]);
	let file = $state<File | null>(null);

	/**
	 * Panel yang sama dipakai ulang untuk parameter mana pun yang diklik di kartu,
	 * jadi isiannya disetel ulang setiap kali targetnya berganti — bukan hanya
	 * saat komponen pertama dipasang.
	 */
	$effect(() => {
		station = target.tags[0]?.station ?? '';
		rows = [createPointRow(defaultDate)];
		file = null;
		mode = 'manual';
	});

	const isPending = $derived(uploadPointsMutation.isPending || uploadExcelMutation.isPending);
	const selectedTag = $derived(
		target.tags.find((tag) => tag.station === station) ?? target.tags[0]
	);
	const unit = $derived(selectedTag?.unit || target.unit);

	const stationOptions = $derived(
		target.tags.map((tag) => ({ value: tag.station, label: tag.station || 'Default' }))
	);

	/**
	 * Mengubah baris jadi payload, atau `null` bila ada yang belum lengkap.
	 * Timestamp duplikat ditolak di sini: server melakukan upsert, jadi dua baris
	 * dengan waktu sama akan saling menimpa diam-diam dan operator mengira
	 * keduanya tersimpan.
	 */
	function buildPoints(currentRows: PointRow[]): TelemetryUploadPoint[] | null {
		if (currentRows.length === 0 || currentRows.length > MAX_POINTS) return null;

		const points: TelemetryUploadPoint[] = [];
		const seenTimestamps: Record<string, true> = {};

		for (const row of currentRows) {
			const rawValue = row.value.trim();
			if (!row.date || !row.time || !rawValue) return null;

			const value = Number(rawValue);
			if (!Number.isFinite(value)) return null;

			const time = `${row.date}T${row.time}:00`;
			if (seenTimestamps[time]) return null;
			seenTimestamps[time] = true;
			points.push({ time, value });
		}

		return points;
	}

	async function submitManual() {
		const points = buildPoints(rows);
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

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (mode === 'manual') await submitManual();
		else await submitExcel();
	}
</script>

<Sheet {isOpen} title="Input Data Harian" isDismissible={!isPending} {onClose}>
	{#snippet description()}
		Input {target.label} untuk PLTA {plantName}.
	{/snippet}

	<form
		id="telemetry-upload-form"
		onsubmit={(event) => void submit(event)}
		class="flex flex-col gap-6"
	>
		<section class="border-b border-surface-overlay pb-5">
			<p class="font-mono text-xs font-medium text-brand-primary-pressed">{target.parameter}</p>
			<p class="mt-1 text-sm font-semibold text-text-strong">{target.label}</p>
			<p class="mt-1 text-xs text-text-muted">
				Satuan {unit || 'mengikuti konfigurasi tag'}
			</p>
		</section>

		{#if target.tags.length > 1}
			<Select label="Station" bind:value={station} disabled={isPending} options={stationOptions} />
		{:else}
			<div class="flex items-center justify-between border-b border-surface-overlay pb-4 text-xs">
				<span class="font-medium text-text-muted">Station</span>
				<span class="font-medium text-text-secondary">{station || 'Default'}</span>
			</div>
		{/if}

		<div class="grid grid-cols-2 border-b border-border-subtle">
			{#each [{ value: 'manual' as const, label: 'Input Manual' }, { value: 'excel' as const, label: 'Upload Excel' }] as tab (tab.value)}
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
				<div>
					<h3 class="text-sm font-semibold text-text-strong">Titik data</h3>
					<p class="mt-1 text-xs leading-5 text-text-muted">
						Waktu tanpa zona waktu diproses server sebagai WIB. Timestamp yang pernah tersimpan akan
						diperbarui.
					</p>
				</div>

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

							<div class="grid gap-3 sm:grid-cols-2">
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
							</div>

							<label class="field-label mt-3 flex flex-col gap-1.5">
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
		{:else}
			<section class="flex flex-col gap-4">
				<div>
					<h3 class="text-sm font-semibold text-text-strong">File time-series</h3>
					<p class="mt-1 text-xs leading-5 text-text-muted">
						Satu file hanya untuk parameter ini. Header yang diterima: datetime + value, atau
						tanggal + jam + value.
					</p>
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
				isLoading={isPending}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}
					{#if mode === 'manual'}<IconSave class="size-4" />{:else}<IconUpload
							class="size-4"
						/>{/if}
				{/snippet}
				{#if isPending}
					{mode === 'manual' ? 'Menyimpan…' : 'Mengunggah…'}
				{:else}
					{mode === 'manual' ? 'Simpan Data' : 'Upload Excel'}
				{/if}
			</Button>
		</div>
	{/snippet}
</Sheet>
