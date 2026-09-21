<script lang="ts">
	import IconInfo from '~icons/ph/info';
	import IconPencil from '~icons/ph/pencil-line';
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconUpload from '~icons/ph/upload-simple';

	import Button from '$components/controls/Button.svelte';
	import Select from '$components/controls/Select.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { authStore, canEditHydrologyData, canUploadMonthlyHydrology } from '$features/auth';
	import {
		createMonthlyHydrologyImageQuery,
		createMonthlyHydrologyPanelQuery,
		getHydrologyErrorMessage
	} from '$features/hydrology';
	import MonthlyHydrologySheet from '$features/hydrology/components/MonthlyHydrologySheet.svelte';
	import { UPLOAD_PATH, getActivePLTA, getUploadPath } from '$features/plta';
	import PlantSwitcher from '$features/plta/components/PlantSwitcher.svelte';
	import { createObjectUrl } from '$shared/lib/object-url.svelte';
	import ForecastDetail from '../ForecastDetail.svelte';
	import ForecastMapCard from '../ForecastMapCard.svelte';
	import { MONTHS, buildMonthlyForecastRows } from '../presentation';

	const CURRENT_YEAR = new Date().getFullYear();
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

	// Periode dipilih operator, bukan selalu bulan berjalan — inilah penelusuran
	// riwayatnya setelah tabel 12 bulan disembunyikan.
	let year = $state(String(CURRENT_YEAR));
	let month = $state(String(new Date().getMonth() + 1));
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

	// `id` null berarti baris bulanan PLTA ini belum ada, sedangkan path gambar
	// tetap terisi karena gambarnya global — keduanya tidak boleh dicampur.
	const hasMonthlyRecord = $derived(Boolean(record?.id));

	const rainfallImageQuery = createMonthlyHydrologyImageQuery(
		() => Number(year),
		() => Number(month),
		() => 'curah_hujan',
		() => Boolean(record?.rainfallImage)
	);
	const rainfallCharacteristicImageQuery = createMonthlyHydrologyImageQuery(
		() => Number(year),
		() => Number(month),
		() => 'sifat_hujan',
		() => Boolean(record?.rainfallCharacteristicImage)
	);

	const rainfallImageUrl = createObjectUrl(() => rainfallImageQuery.data);
	const rainfallCharacteristicImageUrl = createObjectUrl(
		() => rainfallCharacteristicImageQuery.data
	);

	const forecastRows = $derived(buildMonthlyForecastRows(record, monthLabel));
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		eyebrow="Telemetering"
		title="Hidrologi Bulanan"
		description={`Prediksi dan realisasi kondisi hidrologi bulanan PLTA ${displayName}`}
	>
		{#snippet actions()}
			<PlantSwitcher page="telemetering/bulanan" />
		{/snippet}
	</PageHeader>

	<section>
		<h2 class="section-title">Periode</h2>
		<div class="mt-2.5 flex flex-wrap items-end gap-3">
			<Select
				label="Bulan"
				bind:value={month}
				options={MONTH_OPTIONS}
				controlSize="sm"
				class="w-full sm:w-[180px]"
			/>
			<Select
				label="Tahun"
				bind:value={year}
				options={YEAR_OPTIONS}
				controlSize="sm"
				class="w-full sm:w-[140px]"
			/>
		</div>
	</section>

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
				<h2 class="card-title">Ringkasan {monthLabel} {year}</h2>
				{#if canEditData}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						disabled={panelQuery.isLoading}
						onclick={() => (isMonthlySheetOpen = true)}
						class="shrink-0 whitespace-nowrap text-brand-primary-strong"
					>
						{#snippet leftIcon()}<IconPencil class="size-3.5" />{/snippet}
						{hasMonthlyRecord ? 'Edit data' : 'Input data'}
					</Button>
				{/if}
			</div>

			<div class="mt-2.5">
				{#if panelQuery.isLoading}
					<p class="loading-text py-4" role="status">Memuat ringkasan…</p>
				{:else}
					<ForecastDetail rows={forecastRows} />
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
				<h2 class="card-title">Prakiraan Hujan</h2>
				<span class="shrink-0 text-xs text-text-muted">Gambar bulanan</span>
			</div>

			<div class="mt-2.5 grid grid-cols-2 gap-3">
				<ForecastMapCard
					title="Curah Hujan"
					subtitle={`${monthLabel} ${year}`}
					imageUrl={rainfallImageUrl.current}
					isLoading={panelQuery.isLoading || rainfallImageQuery.isLoading}
					isError={rainfallImageQuery.isError}
				/>
				<ForecastMapCard
					title="Sifat Hujan"
					subtitle={`${monthLabel} ${year}`}
					imageUrl={rainfallCharacteristicImageUrl.current}
					isLoading={panelQuery.isLoading || rainfallCharacteristicImageQuery.isLoading}
					isError={rainfallCharacteristicImageQuery.isError}
				/>
			</div>

			<p class="mt-2 text-xs text-text-muted">
				Gambar sama untuk seluruh PLTA.{#if canUploadImage}
					<a
						href={getUploadPath('prakiraan')}
						class="font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
					>
						Unggah dari menu Upload</a
					>.
				{/if}
			</p>
		</section>
	</div>

	<div class="flex items-start gap-2">
		<IconInfo class="mt-0.5 size-3.5 shrink-0 text-text-muted" />
		<p class="max-w-[88ch] text-xs leading-relaxed text-text-muted">
			Prediksi hidrologi belum mempertimbangkan kebutuhan alokasi air, kesiapan unit pembangkit, dan
			kebutuhan sistem kelistrikan.
		</p>
	</div>
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
