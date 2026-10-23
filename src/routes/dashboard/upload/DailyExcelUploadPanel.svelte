<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import IconInfo from '~icons/ph/info';

	import FileDropzone from '$components/controls/FileDropzone.svelte';
	import SelectedFile from '$components/controls/SelectedFile.svelte';
	import Input from '$components/controls/Input.svelte';
	import SegmentedControl from '$components/controls/SegmentedControl.svelte';
	import StatusToggle from '$components/controls/StatusToggle.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import UploadHistoryPanel from '$features/audit/components/UploadHistoryPanel.svelte';
	import {
		createDownloadDailyTemplateMutation,
		createUploadDailyHydrologyExcelMutation,
		getDailyExcelErrorDetail,
		getMonthlyExcelErrorMessage,
		type DailyEmptyCellMode,
		type DailyHydrologyExcelResult
	} from '$features/hydrology';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { toISODateWIB } from '$shared/lib/date';
	import {
		MAX_DAILY_TEMPLATE_RANGE_DAYS,
		dailyTemplateFilename,
		dailyTemplateRangeError,
		formatUploadedPeriods
	} from './model';
	import UploadTips from './UploadTips.svelte';

	/**
	 * Unggah Excel hidrologi harian SELURUH PLTA: satu baris per (PLTA, tanggal),
	 * kolom diturunkan server dari tag berprotokol `upload` — rencana turbin per
	 * unit, spillway, HJV, irigasi, dan isian manual lain. Menggantikan puluhan
	 * kali "Input data" per parameter per PLTA.
	 *
	 * Sama seperti Excel bulanan: atomik (satu baris bermasalah menolak seluruh
	 * berkas) dan tanpa pratinjau. Konstanta tidak ada di template karena tidak
	 * berubah harian; tetap diisi lewat Input data di Hidrologi Harian.
	 */
	const MAX_FILE_SIZE = 5 * 1024 * 1024;

	const uploadMutation = createUploadDailyHydrologyExcelMutation();
	const templateMutation = createDownloadDailyTemplateMutation();

	let selectedFile = $state<File | null>(null);
	let selectionError = $state<string | null>(null);
	let result = $state<DailyHydrologyExcelResult | null>(null);
	let problems = $state<string[]>([]);
	let errorMessage = $state<string | null>(null);
	const today = toISODateWIB(new Date());
	let fromDate = $state(today);
	let toDate = $state(today);
	// Dua pilihan, dua-duanya bawaan server bila tidak disentuh: template satu
	// baris per tanggal, dan sel kosong dilewati.
	let perHour = $state(false);
	let emptyCells = $state<DailyEmptyCellMode>('skip');

	const isUploading = $derived(uploadMutation.isPending);

	const resultTiles = $derived(
		result
			? [
					{ label: 'Baris diproses', value: result.processedRows },
					{ label: 'Nilai tersimpan', value: result.writtenPoints },
					// Hanya muncul bila ada yang diwarisi: pada mode bawaan angkanya selalu nol.
					...(result.inheritedPoints > 0
						? [{ label: 'Diisi nilai lama', value: result.inheritedPoints }]
						: []),
					{ label: 'PLTA', value: result.pltaCodes.length }
				]
			: []
	);

	/** Pesan rentang yang pasti ditolak server, supaya tombol unduh tidak dicoba sia-sia. */
	const rangeError = $derived(dailyTemplateRangeError(fromDate, toDate));

	function validateWorkbook(file: File): string | null {
		if (!file.name.toLowerCase().endsWith('.xlsx')) {
			return 'File harus menggunakan format .xlsx. Berkas .csv tidak dapat dibaca server.';
		}
		if (file.size > MAX_FILE_SIZE) {
			return 'Ukuran file melebihi batas unggah 5 MB.';
		}
		return null;
	}

	function selectFile(file: File) {
		selectedFile = file;
		selectionError = validateWorkbook(file);
		result = null;
		problems = [];
		errorMessage = null;
	}

	function clearSelection() {
		selectedFile = null;
		selectionError = null;
	}

	async function downloadTemplate() {
		try {
			if (rangeError) return;
			const blob = await templateMutation.mutateAsync({
				from: fromDate,
				to: toDate === fromDate ? undefined : toDate,
				perHour
			});
			downloadBlob(blob, dailyTemplateFilename(fromDate, toDate, perHour));
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getMonthlyExcelErrorMessage(error) });
		}
	}

	async function uploadWorkbook() {
		if (!selectedFile || selectionError) return;

		try {
			const uploaded = await uploadMutation.mutateAsync({ file: selectedFile, emptyCells });
			result = uploaded;
			problems = [];
			errorMessage = null;
			clearSelection();
			notificationStore.addToast({
				type: 'success',
				message: `${uploaded.writtenPoints} nilai dari ${uploaded.processedRows} baris tersimpan untuk ${uploaded.pltaCodes.length} PLTA${
					uploaded.inheritedPoints > 0
						? `, termasuk ${uploaded.inheritedPoints} sel kosong yang diisi nilai sebelumnya`
						: ''
				}.`
			});
		} catch (error) {
			result = null;
			const detail = getDailyExcelErrorDetail(error);
			problems = detail.problems;
			errorMessage = detail.message;
		}
	}
</script>

<div class="flex flex-col gap-6">
	<p class="text-xs text-text-muted">
		Satu berkas mengisi nilai harian manual seluruh PLTA — rencana dan realisasi yang tidak datang
		dari sensor.
	</p>

	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_268px]">
		<div class="flex flex-col gap-5">
			{#if !selectedFile}
				<FileDropzone
					accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					title="Tarik file Excel ke area ini"
					hint=".xlsx · maksimum 5 MB · satu baris per PLTA per tanggal"
					onSelect={selectFile}
				/>
			{:else}
				<div>
					<SelectedFile
						file={selectedFile}
						error={selectionError}
						disabled={isUploading}
						onClear={clearSelection}
					/>

					{#if selectionError}
						<p class="mt-3 text-xs leading-relaxed text-status-danger-strong">
							{selectionError}
							<button
								type="button"
								onclick={clearSelection}
								class="cursor-pointer font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
							>
								Pilih file lain
							</button>
						</p>
					{:else}
						<div class="mt-3 flex flex-col gap-1.5">
							<p class="field-label">Sel kosong di berkas</p>
							<SegmentedControl
								ariaLabel="Perlakuan sel kosong"
								value={emptyCells}
								onChange={(next) => (emptyCells = next)}
								options={[
									{ value: 'skip', label: 'Dilewati' },
									{ value: 'carry-forward', label: 'Isi nilai terakhir' }
								]}
							/>
							<p class="text-xs leading-relaxed text-text-muted">
								{#if emptyCells === 'skip'}
									Sel kosong tidak mengubah nilai lama.
								{:else}
									Sel kosong diisi nilai terakhir di kolom yang sama, dan ikut tersimpan.
								{/if}
							</p>
						</div>
						<button
							type="button"
							onclick={() => void uploadWorkbook()}
							disabled={isUploading}
							class="btn btn-primary mt-2.5 h-10 w-full"
						>
							{isUploading ? 'Sedang mengunggah…' : 'Unggah sekarang'}
						</button>
						<div class="mt-3 flex items-start gap-2">
							<IconInfo class="mt-0.5 size-3.5 shrink-0 text-text-muted" />
							<p class="text-xs leading-relaxed text-text-muted">
								Langsung tersimpan tanpa pratinjau. Satu sel bermasalah menolak seluruh berkas.
							</p>
						</div>
					{/if}
				</div>
			{/if}

			{#if errorMessage}
				<Banner tone="danger" title="Berkas ditolak">{errorMessage}</Banner>
			{/if}

			{#if problems.length > 0}
				<section>
					<h2 class="section-title">Sel bermasalah</h2>
					<p class="mt-1 text-xs text-text-muted">
						Perbaiki lalu unggah ulang. Paling banyak 50 masalah ditampilkan.
					</p>

					<div class="mt-3">
						<ul class="flex flex-col">
							{#each problems as problem, index (index)}
								<li class="border-b border-border-subtle px-3 py-2.5 text-sm text-text-secondary">
									{problem}
								</li>
							{/each}
						</ul>
					</div>
				</section>
			{/if}

			{#if result}
				<section>
					<h2 class="section-title">Hasil unggahan</h2>

					<div
						class={`mt-3 grid gap-px overflow-hidden rounded-xl bg-border-subtle ${
							resultTiles.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
						}`}
					>
						{#each resultTiles as item (item.label)}
							<div class="bg-surface-raised px-4 py-3">
								<p class="table-head-cell">{item.label}</p>
								<p class="metric-value mt-1 text-xl font-semibold">{item.value}</p>
							</div>
						{/each}
					</div>

					<dl class="mt-3.5 flex flex-col gap-2 text-sm">
						{#if result.periods.length > 0}
							<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
								<dt class="text-text-muted">Periode</dt>
								<dd class="font-medium text-text-secondary">
									{formatUploadedPeriods(result.periods)}
								</dd>
							</div>
						{/if}
						{#if result.pltaCodes.length > 0}
							<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
								<dt class="text-text-muted">PLTA</dt>
								<dd class="flex flex-wrap gap-1.5">
									{#each result.pltaCodes as code (code)}
										<span
											class="rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-text-secondary"
										>
											{code}
										</span>
									{/each}
								</dd>
							</div>
						{/if}
					</dl>
				</section>
			{/if}

			<!--
				Riwayat menempel di kolom kiri, bukan setelah grid: tinggi grid
				ditentukan kartu periode di kanan yang jauh lebih panjang, sehingga
				riwayat terdorong jauh di bawah kotak unggahnya.
			-->
			<UploadHistoryPanel
				title="Riwayat Excel telemetri"
				description="Unggahan Excel data harian, terbaru lebih dulu."
				kind="telemetry_excel"
				emptyDescription="Impor Excel data harian akan tercatat di sini."
			/>
		</div>

		<aside class="flex flex-col gap-3.5 rounded-xl bg-surface-overlay p-4">
			<p class="table-head-cell">Rentang tanggal</p>

			<Input
				type="date"
				label="Dari"
				bind:value={fromDate}
				max={toDate || undefined}
				disabled={templateMutation.isPending}
			/>
			<Input
				type="date"
				label="Sampai"
				bind:value={toDate}
				min={fromDate || undefined}
				disabled={templateMutation.isPending}
				error={rangeError ?? undefined}
			/>

			<StatusToggle
				label="Baris per jam"
				activeLabel="Per jam"
				align="stretch"
				inactiveLabel="Harian"
				isActive={perHour}
				disabled={templateMutation.isPending}
				onChange={(next) => (perHour = next)}
			/>

			<button
				type="button"
				onclick={() => void downloadTemplate()}
				disabled={templateMutation.isPending || Boolean(rangeError)}
				class="btn btn-ghost btn-sm h-9"
			>
				<IconDownload class="size-3.5" />
				{templateMutation.isPending ? 'Menyiapkan…' : 'Unduh Template'}
			</button>

			<p class="text-xs leading-relaxed text-text-muted">
				{perHour ? '24 baris' : 'Satu baris'} per PLTA per tanggal, maks. {MAX_DAILY_TEMPLATE_RANGE_DAYS}
				hari. Sudah berisi nilai tersimpan.
			</p>

			<UploadTips
				tips={[
					{ term: 'Sel gelap:', text: 'tidak berlaku untuk PLTA itu, biarkan kosong.' },
					{ term: 'kode_plta + tanggal', text: 'adalah kuncinya; nama_plta hanya rujukan.' },
					{
						term: 'Konstanta',
						text: '(batas TMA, SWC) diisi lewat Input data di Hidrologi Harian.'
					}
				]}
			/>
		</aside>
	</div>
</div>
