<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import IconReport from '~icons/ph/file-text';
	import IconPencil from '~icons/ph/pencil-line';
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconUpload from '~icons/ph/upload-simple';

	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import InfoTip from '$components/ui/InfoTip.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { authStore, canEditHydrologyData, canUploadMonthlyHydrology } from '$features/auth';
	import {
		createMonthlyHydrologyQuery,
		createMonthlyHydrologyImageQuery,
		createMonthlyHydrologyPanelQuery,
		getHydrologyErrorMessage,
		type MonthlyHydrologyImageKind
	} from '$features/hydrology';
	import MonthlyHydrologySheet from '$features/hydrology/components/MonthlyHydrologySheet.svelte';
	import { UPLOAD_PATH, getActivePLTA, getPLTADashboardPath, getUploadPath } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import { parseReportMonth, parseReportYear } from '../../../../hydrology-report';
	import { createObjectUrl } from '$shared/lib/object-url.svelte';
	import ForecastMapCard from '../ForecastMapCard.svelte';
	import MonthlyEnergyChart from '../MonthlyEnergyChart.svelte';
	import { buildEnergyMonths } from '../energy-chart';
	import MonthlyComparisonTable from '../MonthlyComparisonTable.svelte';
	import { MONTHS, buildMonthlyComparison } from '../presentation';

	const CURRENT_YEAR = new Date().getFullYear();
	const CURRENT_MONTH = new Date().getMonth() + 1;
	const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: String(index + 1), label }));
	const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR + 1 - index).map(
		(value) => ({ value: String(value), label: String(value) })
	);

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTA = $derived(getActivePLTA());
	const displayName = $derived(activePLTA.displayName);
	const pltaId = $derived(activePLTA.pltaId);

	/**
	 * Periode dipilih operator, bukan selalu bulan berjalan — inilah penelusuran
	 * riwayatnya setelah tabel 12 bulan disembunyikan.
	 *
	 * Disimpan di query string (`?tahun=&bulan=`), bukan state komponen: pemilih
	 * PLTA membawa query string ke PLTA berikutnya, jadi periode yang sudah
	 * dipilih tidak kembali ke bulan berjalan saat operator berpindah PLTA.
	 * Nilai yang tidak valid atau hilang jatuh ke tahun/bulan berjalan.
	 */
	const year = $derived(String(parseReportYear(page.url.searchParams.get('tahun'), CURRENT_YEAR)));
	const month = $derived(
		String(parseReportMonth(page.url.searchParams.get('bulan'), CURRENT_MONTH) ?? CURRENT_MONTH)
	);
	let isMonthlySheetOpen = $state(false);

	const monthLabel = $derived(MONTHS[Number(month) - 1]);
	const canUploadImage = $derived(canUploadMonthlyHydrology(authStore.user));
	// Viewer hanya membaca ringkasan; tombol dan form isiannya tidak dirender.
	const canEditData = $derived(canEditHydrologyData(authStore.user));

	const panelQuery = createMonthlyHydrologyPanelQuery(
		() => pltaId,
		() => Number(year),
		() => Number(month)
	);

	const record = $derived(panelQuery.data ?? undefined);

	// Grafik energi bulanan dan akumulasi mengikuti tahun terpilih
	// (Januari–Desember) dari satu sumber: `GET /hydrology/monthly?tahun=` memuat
	// prediksi, target, dan realisasi keduanya. `/hydrology/monthly/chart` tidak
	// memuat prediksi, jadi tidak dipakai lagi di sini (9 Nov 2026).
	const yearQuery = createMonthlyHydrologyQuery(
		() => pltaId,
		() => Number(year)
	);
	const energyMonths = $derived(buildEnergyMonths(yearQuery.data ?? [], Number(year)));

	// `id` null berarti baris bulanan PLTA ini belum ada, sedangkan path gambar
	// tetap terisi karena gambarnya global — keduanya tidak boleh dicampur.
	const hasMonthlyRecord = $derived(Boolean(record?.id));

	/**
	 * Keempat gambar BMKG tampil sekaligus, satu baris per kelompok: prediksi
	 * dan realisasi dibandingkan berdampingan tanpa berpindah tab (7 Okt 2026).
	 * Gambar yang path-nya kosong tidak diunduh.
	 */
	const IMAGE_ROWS: {
		group: string;
		slots: { kind: MonthlyHydrologyImageKind; title: string }[];
	}[] = [
		{
			group: 'Prediksi',
			slots: [
				{ kind: 'prediksi_curah_hujan', title: 'Curah Hujan' },
				{ kind: 'prediksi_sifat_hujan', title: 'Sifat Hujan' }
			]
		},
		{
			group: 'Realisasi',
			slots: [
				{ kind: 'realisasi_curah_hujan', title: 'Curah Hujan' },
				{ kind: 'realisasi_sifat_hujan', title: 'Sifat Hujan' }
			]
		}
	];

	const imageRows = IMAGE_ROWS.map((row) => ({
		...row,
		slots: row.slots.map((slot) => {
			const query = createMonthlyHydrologyImageQuery(
				() => Number(year),
				() => Number(month),
				() => slot.kind,
				() => Boolean(record?.images[slot.kind])
			);
			return { ...slot, query, url: createObjectUrl(() => query.data) };
		})
	}));

	const comparison = $derived(buildMonthlyComparison(record, monthLabel));

	/**
	 * Pintasan ke Laporan › Laporan Hidrologi, sudah terisi PLTA dan periode yang
	 * sedang dibuka (permintaan tim 9 Nov 2026: tautan, bukan unduhan langsung —
	 * di sana rentang dan cakupan masih bisa diubah sebelum mengunduh).
	 */
	const reportHref = $derived(
		`${getPLTADashboardPath(pltaId, 'laporan')}?${new URLSearchParams({
			tab: 'hidrologi',
			tahun: year,
			bulan: month,
			plta: pltaId
		}).toString()}`
	);

	async function setPeriod(key: 'tahun' | 'bulan', value: string) {
		// Salinan sekali pakai untuk menyusun URL berikutnya; dibuang setelah
		// `goto`, jadi tidak perlu `SvelteURLSearchParams`.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.searchParams);
		params.set(key, value);

		await goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		eyebrow="Telemetering · Hidrologi Bulanan"
		title={displayName}
		description="Prediksi dan realisasi kondisi hidrologi bulanan"
	>
		{#snippet actions()}
			<!--
				Periode di kepala halaman, sebaris dengan pemilih PLTA — dulu bagian
				"Periode" tersendiri yang memakan satu baris penuh di atas tabel.
				Lebar dipasang di pembungkus: `Select` memakai `w-full` di akarnya.
			-->
			<div class="w-[calc(50%-0.25rem)] sm:w-[150px]">
				<Select
					ariaLabel="Bulan"
					value={month}
					onValueChange={(next) => void setPeriod('bulan', next)}
					options={MONTH_OPTIONS}
				/>
			</div>
			<div class="w-[calc(50%-0.25rem)] sm:w-[110px]">
				<Select
					ariaLabel="Tahun"
					value={year}
					onValueChange={(next) => void setPeriod('tahun', next)}
					options={YEAR_OPTIONS}
				/>
			</div>
			<PlantSwitcher page="telemetering/bulanan" />
		{/snippet}
	</PageHeader>

	{#if panelQuery.isError}
		<Banner tone="warning" title="Data bulanan belum dapat dimuat">
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
				{getHydrologyErrorMessage(panelQuery.error)}
				<button
					type="button"
					onclick={() => void panelQuery.refetch()}
					class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
				>
					<IconRefresh class="size-3" />
					Coba lagi
				</button>
			</span>
		</Banner>
	{/if}

	<div class="grid gap-6 xl:grid-cols-2">
		<section>
			<div class="flex items-center justify-between gap-3">
				<h2 class="card-title flex items-center gap-1.5">
					Ringkasan {monthLabel}
					{year}
					<!--
						Keterangan istilah dan batasan prediksi — dulu dua paragraf yang
						selalu tertulis di bawah tabel dan di dasar halaman (permintaan tim
						9 Nov 2026: penjelasan lewat hover).
					-->
					<InfoTip label="Keterangan ringkasan bulanan">
						<span class="flex flex-col gap-1.5">
							<span>
								Kolom <strong class="font-medium text-surface-raised">Prediksi</strong> pada energi adalah
								prognosa ketersediaan energi primer; target dan realisasi adalah produksi energi listrik.
								Prognosa pencapaian = prognosa ÷ target.
							</span>
							<span>
								Prediksi hidrologi belum mempertimbangkan kebutuhan alokasi air, kesiapan unit
								pembangkit, dan kebutuhan sistem kelistrikan.
							</span>
						</span>
					</InfoTip>
				</h2>
				<div class="flex shrink-0 items-center gap-1">
					<a
						href={reportHref}
						class="btn btn-ghost btn-sm h-8 whitespace-nowrap text-brand-primary-strong"
					>
						<IconReport class="size-3.5" />
						Buka laporan
					</a>
					{#if canEditData}
						<Button
							type="button"
							size="sm"
							variant="ghost"
							disabled={panelQuery.isLoading}
							onclick={() => (isMonthlySheetOpen = true)}
							class="whitespace-nowrap text-brand-primary-strong"
						>
							{#snippet leftIcon()}<IconPencil class="size-3.5" />{/snippet}
							{hasMonthlyRecord ? 'Edit data' : 'Input data'}
						</Button>
					{/if}
				</div>
			</div>

			<div class="mt-2.5">
				{#if panelQuery.isLoading}
					<p class="loading-text py-4" role="status">Memuat ringkasan…</p>
				{:else}
					<MonthlyComparisonTable {comparison} />
				{/if}
			</div>

			{#if canUploadImage}
				<a
					href={UPLOAD_PATH}
					class="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary-strong transition-colors hover:text-brand-primary-pressed"
				>
					<IconUpload class="size-3.5" />
					Butuh mengisi banyak PLTA sekaligus? Buka Upload
				</a>
			{/if}
		</section>

		<section>
			<div class="flex items-center justify-between gap-3">
				<h2 class="card-title flex items-center gap-1.5">
					Gambar Hujan
					<InfoTip
						label="Keterangan gambar hujan"
						text="Peta BMKG berlaku sama untuk seluruh PLTA."
					/>
				</h2>
				<span class="shrink-0 text-xs text-text-muted">{monthLabel} {year}</span>
			</div>

			<div class="mt-2.5 flex flex-col gap-3">
				{#each imageRows as row (row.group)}
					<div>
						<p class="table-head-cell mb-1.5">{row.group}</p>
						<div class="grid grid-cols-2 gap-3">
							{#each row.slots as slot (slot.kind)}
								<ForecastMapCard
									title={slot.title}
									subtitle={`${row.group} · ${monthLabel} ${year}`}
									imageUrl={slot.url.current}
									isLoading={panelQuery.isLoading || slot.query.isLoading}
									isError={slot.query.isError}
								/>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			{#if canUploadImage}
				<a
					href={getUploadPath('prakiraan')}
					class="mt-2 inline-flex text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
				>
					Unggah gambar dari menu Upload
				</a>
			{/if}
		</section>
	</div>

	<!--
		Energi bulanan (batang) dan akumulasinya (garis) dalam satu grafik, satu
		sumber data (permintaan tim 9 Nov 2026).
	-->
	<section>
		<div class="flex items-center justify-between gap-3">
			<h2 class="card-title">Energi {year}</h2>
			<span class="shrink-0 text-xs text-text-muted">Bulanan dan akumulasi</span>
		</div>
		{#if yearQuery.isLoading}
			<div class="mt-2.5" role="status" aria-label="Memuat grafik energi">
				<div class="skeleton-shimmer h-[300px] rounded-xl"></div>
				<span class="sr-only">Memuat grafik energi...</span>
			</div>
		{:else if yearQuery.isError}
			<div class="mt-2.5">
				<ErrorState
					title="Grafik energi belum bisa dimuat"
					description={getHydrologyErrorMessage(yearQuery.error)}
					onRetry={() => void yearQuery.refetch()}
				/>
			</div>
		{:else}
			<div class="mt-2.5">
				<MonthlyEnergyChart months={energyMonths} />
			</div>
		{/if}
	</section>
</div>

{#if canEditData && isMonthlySheetOpen}
	<MonthlyHydrologySheet
		isOpen
		{pltaId}
		plantName={displayName}
		year={Number(year)}
		month={Number(month)}
		{monthLabel}
		{record}
		onClose={() => (isMonthlySheetOpen = false)}
	/>
{/if}
