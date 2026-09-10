<script lang="ts">
	import IconCheck from '~icons/ph/check';
	import IconDownload from '~icons/ph/download-simple';
	import IconTrash from '~icons/ph/trash';
	import IconUploadCloud from '~icons/ph/cloud-arrow-up';
	import IconWarning from '~icons/ph/warning';

	import Select from '$components/atoms/Select.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import UploadHistoryPanel from '$features/audit/components/UploadHistoryPanel.svelte';
	import { getActivePLTA } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import {
		createDownloadElevationTemplateMutation,
		createUploadElevationExcelMutation
	} from '$features/uploads';
	import { downloadBlob } from '$shared/lib/download';
	import { notificationStore } from '$shared/lib/notification.svelte';

	const MAX_FILE_SIZE = 5 * 1024 * 1024;
	const CURRENT_YEAR = new Date().getFullYear();
	const YEAR_OPTIONS = Array.from(
		{ length: CURRENT_YEAR - 1988 },
		(_, index) => CURRENT_YEAR + 1 - index
	).map((value) => ({ value: String(value), label: String(value) }));

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTA = $derived(getActivePLTA());
	const pltaId = $derived(activePLTA.pltaId);
	const displayName = $derived(activePLTA.displayName);
	const elevationMutation = createUploadElevationExcelMutation();
	const templateMutation = createDownloadElevationTemplateMutation();

	let selectedFile = $state<File | null>(null);
	let selectionError = $state<string | null>(null);
	let year = $state(String(CURRENT_YEAR));
	let publish = $state(false);
	let isDragging = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	const isUploading = $derived(elevationMutation.isPending);

	/**
	 * Berkas Excel tidak diparsing di browser — ini keputusan tim. Yang diperiksa
	 * di sini hanya hal yang pasti ditolak backend, supaya operator tidak menunggu
	 * unggahan yang sudah pasti gagal.
	 */
	function validateWorkbook(file: File): string | null {
		if (!file.name.toLowerCase().endsWith('.xlsx')) {
			return 'File harus menggunakan format .xlsx.';
		}
		if (file.size > MAX_FILE_SIZE) {
			return 'Ukuran file melebihi batas backend 5 MB.';
		}
		return null;
	}

	/**
	 * Template diambil dari server, bukan berkas statis: isinya sudah dipra-isi
	 * titik kurva yang tersimpan untuk PLTA dan tahun yang dipilih, sehingga
	 * operator mengoreksi alih-alih mengetik ulang seluruh kurva.
	 */
	async function downloadTemplate() {
		try {
			const blob = await templateMutation.mutateAsync({ pltaId, year: Number(year) });
			downloadBlob(blob, `template-eva-${displayName.toLowerCase()}-${year}.xlsx`);
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: errorMessage(error) });
		}
	}

	function errorMessage(error: unknown): string {
		if (error instanceof Error && error.message.trim()) return error.message;
		return 'Terjadi kesalahan saat mengunggah file Excel.';
	}

	function selectFile(file: File) {
		selectedFile = file;
		selectionError = validateWorkbook(file);
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

	async function uploadElevation() {
		if (!selectedFile || selectionError) return;

		try {
			const result = await elevationMutation.mutateAsync({
				pltaId,
				year: Number(year),
				file: selectedFile,
				publish
			});
			notificationStore.addToast({
				type: 'success',
				message: `${result.points.length} titik elevasi berhasil diterima backend untuk PLTA ${displayName} (${result.status}).`
			});
			clearSelection();
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: errorMessage(error) });
		}
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		title="Input GHW"
		description={`Unggah data elevasi dan volume waduk untuk memperbarui kurva GHW PLTA ${displayName}`}
	>
		{#snippet actions()}
			<PlantSwitcher page="input-ghw" />
		{/snippet}
	</PageHeader>

	<section class="w-full">
		<h2 class="section-title">Elevasi &amp; Volume Waduk</h2>

		<div class="mt-3.5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_268px]">
			<div class="flex flex-col gap-5">
				{#if !selectedFile}
					<!--
						Area jatuh berkas. `role="button"` disengaja: seluruh kotak bisa
						diklik dan dijangkau keyboard, bukan hanya tautan kecil di dalamnya.
					-->
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
						<p class="mt-2 text-sm font-medium text-text-secondary">Tarik file Excel ke area ini</p>
						<p class="mt-1 text-xs text-text-muted">atau klik untuk memilih file</p>
						<span
							class="mt-2.5 rounded-full border border-border-subtle bg-surface-raised px-2.5 py-[3px] font-mono text-xs text-text-muted"
						>
							.xlsx · maksimum 5 MB
						</span>
					</div>
				{:else}
					<div class="flex min-h-[190px] flex-col">
						<p class="table-head-cell">Setelah file dipilih</p>

						<div
							class={`mt-2 rounded-xl border p-3.5 ${
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
									<p class="truncate text-sm font-medium text-text-primary">{selectedFile.name}</p>
									<p class="mt-0.5 text-xs text-text-muted">
										{(selectedFile.size / 1024).toLocaleString('id-ID', {
											maximumFractionDigits: 1
										})} KB · Tahun {year}
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

						<button
							type="button"
							onclick={() => void uploadElevation()}
							disabled={Boolean(selectionError) || isUploading}
							class="btn btn-primary mt-2.5 h-10 w-full"
						>
							{isUploading ? 'Sedang mengunggah…' : 'Unggah ke Server'}
						</button>

						{#if selectionError}
							<div class="mt-3 flex items-start gap-2">
								<IconWarning class="mt-0.5 size-4 shrink-0 text-status-danger-strong" />
								<p class="text-xs leading-relaxed text-status-danger-strong">
									{selectionError}
									<button
										type="button"
										onclick={clearSelection}
										class="cursor-pointer font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
									>
										Pilih file lain
									</button>
								</p>
							</div>
						{/if}
					</div>
				{/if}

				<!--
					Riwayat dirender di dasar kolom KIRI, bukan setelah grid. Tinggi grid
					ditentukan kartu pengaturan di kanan yang jauh lebih panjang, jadi apa
					pun yang ditaruh setelah grid akan terdorong jauh di bawah kotak
					unggahnya.
				-->
				<UploadHistoryPanel
					title="Riwayat sesi"
					description="Unggahan kurva elevasi untuk PLTA ini, terbaru lebih dulu."
					kind="elevation_curve"
					{pltaId}
					emptyDescription="Unggahan kurva elevasi akan tercatat di sini setelah server menerimanya."
				/>
			</div>

			<aside class="flex flex-col gap-3.5 rounded-xl bg-surface-overlay p-4">
				<Select
					label="Tahun data"
					bind:value={year}
					disabled={isUploading}
					options={YEAR_OPTIONS}
				/>

				<label class="flex cursor-pointer items-start gap-2.5">
					<input
						type="checkbox"
						bind:checked={publish}
						disabled={isUploading}
						class="mt-0.5 size-4 shrink-0 accent-brand-primary-strong"
					/>
					<span class="text-sm leading-snug text-text-secondary">
						Publikasikan kurva elevasi–volume setelah diproses
					</span>
				</label>

				<p class="border-t border-border-subtle pt-2.5 text-xs leading-relaxed text-text-muted">
					Kolom wajib: <strong class="font-medium text-text-secondary">Elevasi</strong>,
					<strong class="font-medium text-text-secondary">Volume</strong>, dan
					<strong class="font-medium text-text-secondary">Area</strong>.
				</p>

				<button
					type="button"
					onclick={() => void downloadTemplate()}
					disabled={templateMutation.isPending || isUploading}
					class="btn btn-ghost btn-sm h-9"
				>
					<IconDownload class="size-3.5" />
					{templateMutation.isPending ? 'Menyiapkan…' : 'Unduh Template'}
				</button>
				<p class="text-xs leading-relaxed text-text-muted">
					Template terisi kurva {displayName} tahun {year} yang tersimpan.
				</p>
			</aside>
		</div>
	</section>

	<p class="text-xs leading-relaxed text-text-muted">
		File Excel tidak diparsing di browser — validasi kolom dan jumlah baris baru terlihat setelah
		server membalas.
	</p>
</div>
