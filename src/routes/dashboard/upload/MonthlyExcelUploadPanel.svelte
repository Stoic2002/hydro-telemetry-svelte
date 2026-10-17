<script lang="ts">
	import IconDownload from '~icons/ph/download-simple';
	import IconInfo from '~icons/ph/info';

	import FileDropzone from '$components/controls/FileDropzone.svelte';
	import Select from '$components/controls/Select.svelte';
	import SelectedFile from '$components/controls/SelectedFile.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import UploadHistoryPanel from '$features/audit/components/UploadHistoryPanel.svelte';
	import {
		createDownloadMonthlyTemplateMutation,
		createMonthlyFieldLabelsQuery,
		createUploadMonthlyHydrologyExcelMutation,
		getMonthlyExcelErrorMessage,
		getMonthlyExcelRowErrors,
		type MonthlyHydrologyExcelResult,
		type MonthlyHydrologyExcelRowError
	} from '$features/hydrology';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { MONTHS } from '../plta/[pltaId]/telemetering/presentation';

	/**
	 * Unggah Excel ringkasan hidrologi bulanan. Satu berkas mengisi seluruh PLTA
	 * sekaligus, jadi panel ini tidak menerima PLTA apa pun.
	 *
	 * Tidak ada pratinjau sebelum simpan karena server tidak menyediakan mode uji
	 * coba — begitu berkas dikirim, isinya langsung tersimpan. Yang ditampilkan
	 * adalah hasil setelah tersimpan, atau daftar baris bermasalah bila berkasnya
	 * ditolak seluruhnya.
	 */
	const MAX_FILE_SIZE = 5 * 1024 * 1024;
	const CURRENT_YEAR = new Date().getFullYear();
	const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: String(index + 1), label }));
	const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR + 1 - index).map(
		(value) => ({ value: String(value), label: String(value) })
	);

	/**
	 * Urutan kolom template, dipakai sebagai rujukan cepat di panel kanan. Nama
	 * kontrak 5 Okt 2026; server masih memetakan header lama, tetapi menolak
	 * berkas yang memuat nama lama dan baru untuk bidang yang sama.
	 *
	 * Yang ditonjolkan nama tampilannya (baris 1 berkas); kunci kolom (baris 2)
	 * kecil di bawahnya. Dulu hanya kunci mentah yang tampil, terpotong di
	 * tengah kata. Nama bidang yang diganti admin dibaca dari server; daftar di
	 * bawah cadangan bila belum termuat.
	 */
	const TEMPLATE_COLUMNS: { key: string; label: string }[] = [
		{ key: 'kode_plta', label: 'Kode PLTA' },
		{ key: 'nama_plta', label: 'Nama PLTA' },
		{ key: 'tahun', label: 'Tahun' },
		{ key: 'bulan', label: 'Bulan' },
		{ key: 'prediksi_hidrologi', label: 'Prediksi Kondisi Hidrologi' },
		{ key: 'realisasi_hidrologi', label: 'Realisasi Kondisi Hidrologi' },
		{ key: 'prediksi_ketersediaan_energi_primer', label: 'Prognosa Ketersediaan Energi Primer' },
		{ key: 'target_produksi_energi_listrik', label: 'Target Produksi Energi Listrik' },
		{ key: 'realisasi_produksi_energi_listrik', label: 'Realisasi Produksi Energi Listrik' },
		{
			key: 'prediksi_akumulasi_ketersediaan_energi_primer',
			label: 'Prognosa Akumulasi Ketersediaan Energi Primer'
		},
		{
			key: 'target_akumulasi_produksi_energi_listrik',
			label: 'Target Akumulasi Produksi Energi Listrik'
		},
		{
			key: 'realisasi_akumulasi_produksi_energi_listrik',
			label: 'Realisasi Akumulasi Produksi Energi Listrik'
		}
	];

	const fieldLabelsQuery = createMonthlyFieldLabelsQuery(() => true);
	const templateColumns = $derived.by(() => {
		const custom = new Map(
			(fieldLabelsQuery.data?.fields ?? []).map((field) => [field.key, field.label])
		);
		return TEMPLATE_COLUMNS.map((column) => ({
			...column,
			label: custom.get(column.key) ?? column.label
		}));
	});

	const uploadMutation = createUploadMonthlyHydrologyExcelMutation();
	const templateMutation = createDownloadMonthlyTemplateMutation();

	let selectedFile = $state<File | null>(null);
	let selectionError = $state<string | null>(null);
	let result = $state<MonthlyHydrologyExcelResult | null>(null);
	let rowErrors = $state<MonthlyHydrologyExcelRowError[]>([]);
	let errorMessage = $state<string | null>(null);
	let month = $state(String(new Date().getMonth() + 1));
	let year = $state(String(CURRENT_YEAR));

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
		selectedFile = null;
		selectionError = null;
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

<div class="flex flex-col gap-6">
	<p class="text-xs text-text-muted">
		Satu berkas mengisi angka produksi dan keterangan hidrologi seluruh PLTA.
	</p>

	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_268px]">
		<div class="flex flex-col gap-5">
			{#if !selectedFile}
				<FileDropzone
					accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					title="Tarik file Excel ke area ini"
					hint=".xlsx · maksimum 5 MB · satu baris per PLTA"
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
								Berkas langsung tersimpan begitu dikirim — tidak ada tahap pratinjau. Bila ada satu
								baris bermasalah, seluruh berkas ditolak dan tidak ada data yang berubah. Sel yang
								dikosongkan tidak menghapus nilai lama.
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
				Template berisi satu baris per PLTA dan sudah terisi nilai yang tersimpan untuk periode itu,
				jadi tinggal dikoreksi.
			</p>

			<div class="border-t border-border-subtle pt-2.5">
				<p class="table-head-cell">Kolom template</p>
				<ul class="mt-1.5 flex flex-col gap-1.5">
					{#each templateColumns as column (column.key)}
						<li class="flex flex-col">
							<span class="text-xs text-text-secondary">{column.label}</span>
							<span class="font-mono text-[11px] [overflow-wrap:anywhere] text-text-muted">
								{column.key}
							</span>
						</li>
					{/each}
				</ul>
				<p class="mt-2 text-xs leading-relaxed text-text-muted">
					Baris 1 berkas berisi nama tampilan, baris 2 kunci kolom di atas — jangan ubah baris 2.
					Kolom akumulasi diisi posisi Januari s.d. bulan barisnya.
					<span class="font-medium text-text-secondary">kode_plta</span> adalah kuncinya.
					<span class="font-medium text-text-secondary">nama_plta</span> hanya rujukan dan diabaikan saat
					impor.
				</p>
			</div>
		</aside>
	</div>
</div>
