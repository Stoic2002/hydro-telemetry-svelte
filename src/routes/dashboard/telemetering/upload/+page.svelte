<script lang="ts">
	import IconCheck from '~icons/ph/check-circle';
	import IconDownload from '~icons/ph/download-simple';
	import IconInfo from '~icons/ph/info';
	import IconTrash from '~icons/ph/trash';
	import IconUploadCloud from '~icons/ph/cloud-arrow-up';
	import IconWarning from '~icons/ph/warning';

	import Badge from '$components/atoms/Badge.svelte';
	import Select from '$components/atoms/Select.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import Tabs from '$components/ui/Tabs.svelte';
	import UploadHistoryPanel from '$features/audit/components/UploadHistoryPanel.svelte';
	import {
		createDownloadMonthlyTemplateMutation,
		createUploadMonthlyHydrologyExcelMutation,
		getMonthlyExcelErrorMessage,
		getMonthlyExcelRowErrors,
		type MonthlyHydrologyExcelResult,
		type MonthlyHydrologyExcelRowError
	} from '$features/hydrology';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { MONTHS } from '../../plta/[pltaId]/telemetering/presentation';
	import MonthlyImageUploadPanel from './MonthlyImageUploadPanel.svelte';

	const MAX_FILE_SIZE = 5 * 1024 * 1024;
	const CURRENT_YEAR = new Date().getFullYear();
	const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: String(index + 1), label }));
	const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR + 1 - index).map(
		(value) => ({ value: String(value), label: String(value) })
	);

	/** Urutan kolom template, dipakai sebagai rujukan cepat di panel kanan. */
	const TEMPLATE_COLUMNS = [
		'kode_plta',
		'nama_plta',
		'tahun',
		'bulan',
		'prediksi_hidrologi',
		'aktual_hidrologi',
		'prediksi_produksi_mwh',
		'target_produksi_mwh',
		'pencapaian_sd_prev_mwh',
		'prediksi_pencapaian_sd_prev_mwh',
		'target_pencapaian_sd_prev_mwh'
	];

	const UPLOAD_TABS = [
		{ value: 'excel' as const, label: 'Excel Bulanan' },
		{ value: 'prakiraan' as const, label: 'Prakiraan Hujan' }
	];

	const uploadMutation = createUploadMonthlyHydrologyExcelMutation();
	const templateMutation = createDownloadMonthlyTemplateMutation();

	let selectedFile = $state<File | null>(null);
	let selectionError = $state<string | null>(null);
	let result = $state<MonthlyHydrologyExcelResult | null>(null);
	let rowErrors = $state<MonthlyHydrologyExcelRowError[]>([]);
	let errorMessage = $state<string | null>(null);
	// Periode diangkat ke level halaman supaya pindah tab tidak mengulang pilihan
	// bulan/tahun yang sama untuk template dan gambar.
	let month = $state(String(new Date().getMonth() + 1));
	let year = $state(String(CURRENT_YEAR));
	let isDragging = $state(false);
	let activeTab = $state<'excel' | 'prakiraan'>('excel');
	let fileInput = $state<HTMLInputElement | null>(null);

	const isUploading = $derived(uploadMutation.isPending);

	function validateWorkbook(file: File): string | null {
		if (!file.name.toLowerCase().endsWith('.xlsx')) {
			return 'File harus menggunakan format .xlsx. Berkas .csv tidak dapat dibaca server.';
		}
		if (file.size > MAX_FILE_SIZE) {
			return 'Ukuran file melebihi batas unggah 5 MB.';
		}
		return null;
	}

	function formatPeriod(period: string): string {
		const [periodYear, periodMonth] = period.split('-');
		const label = MONTHS[Number(periodMonth) - 1];
		return label ? `${label} ${periodYear}` : period;
	}

	function selectFile(file: File) {
		selectedFile = file;
		selectionError = validateWorkbook(file);
		result = null;
		rowErrors = [];
		errorMessage = null;
	}

	function clearSelection() {
		if (fileInput) fileInput.value = '';
		selectedFile = null;
		selectionError = null;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const file = event.dataTransfer?.files[0];
		if (file) selectFile(file);
	}

	async function downloadTemplate() {
		try {
			const blob = await templateMutation.mutateAsync({
				year: Number(year),
				month: Number(month)
			});
			downloadBlob(blob, `hidrologi_bulanan_${year}-${month.padStart(2, '0')}.xlsx`);
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getMonthlyExcelErrorMessage(error) });
		}
	}

	async function uploadWorkbook() {
		if (!selectedFile || selectionError) return;

		try {
			const uploaded = await uploadMutation.mutateAsync(selectedFile);
			result = uploaded;
			rowErrors = [];
			errorMessage = null;
			clearSelection();
			notificationStore.addToast({
				type: 'success',
				message: `${uploaded.processedRows} baris tersimpan untuk ${uploaded.pltaCodes.length} PLTA.`
			});
		} catch (error) {
			result = null;
			rowErrors = getMonthlyExcelRowErrors(error);
			errorMessage = getMonthlyExcelErrorMessage(error);
		}
	}
</script>

<!--
	Satu-satunya halaman Telemetering yang tidak ter-scope ke satu PLTA: satu
	berkas mengisi ringkasan bulanan seluruh PLTA sekaligus. Karena itu tidak ada
	PlantSwitcher di kanan header, diganti badge cakupan.

	Tidak ada pratinjau sebelum simpan karena server tidak menyediakan mode uji
	coba — begitu berkas dikirim, isinya langsung tersimpan. Yang ditampilkan
	halaman ini adalah hasil setelah tersimpan, atau daftar baris bermasalah bila
	berkasnya ditolak seluruhnya.
-->
<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		eyebrow="Telemetering"
		title="Upload"
		description="Unggah satu berkas Excel untuk mengisi ringkasan hidrologi bulanan seluruh PLTA sekaligus"
	>
		{#snippet actions()}
			<Badge tone="cyan">Berlaku untuk semua PLTA</Badge>
		{/snippet}
	</PageHeader>

	<Tabs
		idPrefix="upload"
		ariaLabel="Jenis unggahan hidrologi bulanan"
		items={UPLOAD_TABS}
		activeValue={activeTab}
		onChange={(value) => (activeTab = value)}
	/>

	<div
		id={`upload-panel-${activeTab}`}
		role="tabpanel"
		aria-labelledby={`upload-tab-${activeTab}`}
		tabindex="0"
		class="flex flex-col gap-6 outline-none"
	>
		{#if activeTab === 'excel'}
			<p class="text-xs text-text-muted">
				Satu berkas mengisi angka produksi dan keterangan hidrologi seluruh PLTA.
			</p>

			<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_268px]">
				<div class="flex flex-col gap-5">
					{#if !selectedFile}
						<div
							role="button"
							tabindex="0"
							ondragenter={(event) => {
								event.preventDefault();
								isDragging = true;
							}}
							ondragover={(event) => {
								event.preventDefault();
								isDragging = true;
							}}
							ondragleave={() => (isDragging = false)}
							ondrop={handleDrop}
							onclick={() => fileInput?.click()}
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									fileInput?.click();
								}
							}}
							class={`flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
								isDragging
									? 'border-brand-primary-strong bg-brand-tint'
									: 'border-border-strong bg-surface-base hover:border-brand-primary-strong'
							}`}
						>
							<input
								bind:this={fileInput}
								type="file"
								accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
								class="hidden"
								onchange={(event) => {
									const file = event.currentTarget.files?.[0];
									if (file) selectFile(file);
								}}
							/>
							<IconUploadCloud class="size-6 text-text-muted" />
							<p class="mt-2 text-sm font-medium text-text-secondary">
								Tarik file Excel ke area ini
							</p>
							<p class="mt-1 text-xs text-text-muted">atau klik untuk memilih file</p>
							<span
								class="mt-2.5 rounded-full border border-border-subtle bg-surface-raised px-2.5 py-[3px] font-mono text-xs text-text-muted"
							>
								.xlsx · maksimum 5 MB · satu baris per PLTA
							</span>
						</div>
					{:else}
						<div>
							<div
								class={`rounded-xl border p-3.5 ${
									selectionError
										? 'border-status-danger-strong/30 bg-status-danger-soft'
										: 'border-status-success-strong/30 bg-status-success-soft'
								}`}
							>
								<div class="flex items-start gap-3">
									{#if selectionError}
										<IconWarning class="mt-0.5 size-5 shrink-0 text-status-danger-strong" />
									{:else}
										<IconCheck class="mt-0.5 size-5 shrink-0 text-status-success-strong" />
									{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-text-primary">
											{selectedFile.name}
										</p>
										<p class="mt-0.5 text-xs text-text-muted">
											{(selectedFile.size / 1024).toLocaleString('id-ID', {
												maximumFractionDigits: 1
											})} KB
										</p>
									</div>
									<button
										type="button"
										onclick={clearSelection}
										disabled={isUploading}
										title="Hapus file"
										class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-muted hover:bg-surface-raised hover:text-status-danger-strong disabled:cursor-not-allowed disabled:opacity-50"
									>
										<IconTrash class="size-4" />
									</button>
								</div>
							</div>

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
										Berkas langsung tersimpan begitu dikirim — tidak ada tahap pratinjau. Bila ada
										satu baris bermasalah, seluruh berkas ditolak dan tidak ada data yang berubah.
										Sel yang dikosongkan tidak menghapus nilai lama.
									</p>
								</div>
							{/if}
						</div>
					{/if}

					{#if errorMessage}
						<Banner tone="danger" title="Berkas ditolak">{errorMessage}</Banner>
					{/if}

					{#if rowErrors.length > 0}
						<section>
							<h2 class="section-title">Baris bermasalah</h2>
							<p class="mt-1 text-xs text-text-muted">
								Perbaiki baris di bawah lalu unggah ulang berkasnya.
							</p>

							<div class="mt-3 overflow-x-auto">
								<table class="w-full min-w-[440px] border-collapse text-left">
									<thead>
										<tr class="bg-surface-overlay">
											<th class="table-head-cell w-20 px-3 py-2">Baris</th>
											<th class="table-head-cell w-36 px-3 py-2">Kode PLTA</th>
											<th class="table-head-cell px-3 py-2">Keterangan</th>
										</tr>
									</thead>
									<tbody>
										{#each rowErrors as row (`${row.row}-${row.pltaCode ?? ''}`)}
											<tr class="border-b border-border-subtle">
												<td class="px-3 py-2.5 font-mono text-xs text-text-secondary">{row.row}</td>
												<td class="px-3 py-2.5 font-mono text-xs text-text-secondary">
													{row.pltaCode ?? '—'}
												</td>
												<td class="px-3 py-2.5 text-sm text-text-secondary">{row.message}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</section>
					{/if}

					{#if result}
						<section>
							<h2 class="section-title">Hasil unggahan</h2>

							<div class="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-border-subtle">
								{#each [{ label: 'Baris diproses', value: result.processedRows }, { label: 'Data baru', value: result.created }, { label: 'Data diperbarui', value: result.updated }] as item (item.label)}
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
											{result.periods.map(formatPeriod).join(', ')}
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
						title="Riwayat Excel bulanan"
						description="Berkas Excel yang pernah diimpor, terbaru lebih dulu."
						kind="monthly_excel"
						emptyDescription="Impor Excel ringkasan bulanan akan tercatat di sini."
					/>
				</div>

				<aside class="flex flex-col gap-3.5 rounded-xl bg-surface-overlay p-4">
					<p class="table-head-cell">Periode</p>

					<Select
						label="Bulan"
						bind:value={month}
						disabled={templateMutation.isPending}
						options={MONTH_OPTIONS}
					/>
					<Select
						label="Tahun"
						bind:value={year}
						disabled={templateMutation.isPending}
						options={YEAR_OPTIONS}
					/>

					<button
						type="button"
						onclick={() => void downloadTemplate()}
						disabled={templateMutation.isPending}
						class="btn btn-ghost btn-sm h-9"
					>
						<IconDownload class="size-3.5" />
						{templateMutation.isPending ? 'Menyiapkan…' : 'Unduh Template'}
					</button>

					<p class="text-xs leading-relaxed text-text-muted">
						Template berisi satu baris per PLTA dan sudah terisi nilai yang tersimpan untuk periode
						itu, jadi tinggal dikoreksi.
					</p>

					<div class="border-t border-border-subtle pt-2.5">
						<p class="table-head-cell">Kolom template</p>
						<ul class="mt-1.5 flex flex-col gap-0.5">
							{#each TEMPLATE_COLUMNS as column (column)}
								<li class="font-mono text-xs text-text-muted">{column}</li>
							{/each}
						</ul>
						<p class="mt-2 text-xs leading-relaxed text-text-muted">
							<span class="font-medium text-text-secondary">kode_plta</span> adalah kuncinya.
							<span class="font-medium text-text-secondary">nama_plta</span> hanya rujukan dan diabaikan
							saat impor.
						</p>
					</div>
				</aside>
			</div>
		{:else}
			<MonthlyImageUploadPanel />
		{/if}
	</div>
</div>
