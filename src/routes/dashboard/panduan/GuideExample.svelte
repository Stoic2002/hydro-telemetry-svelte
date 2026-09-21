<script lang="ts">
	import IconArrowRight from '~icons/ph/arrow-right';
	import IconBuilding from '~icons/ph/buildings';
	import IconDownload from '~icons/ph/download-simple';
	import IconPencil from '~icons/ph/pencil-line';
	import IconPlus from '~icons/ph/plus';

	import Badge from '$components/controls/Badge.svelte';
	import Button from '$components/controls/Button.svelte';
	import SegmentedControl from '$components/controls/SegmentedControl.svelte';
	import Select from '$components/controls/Select.svelte';
	import SourceMarker, {
		SOURCE_MARKER_LABEL,
		type SourceMarkerType
	} from '$components/controls/SourceMarker.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import Tabs from '$components/ui/Tabs.svelte';
	import RoleBadge from '$features/users/components/RoleBadge.svelte';
	import MetricRowItem from '../plta/[pltaId]/telemetering/MetricRowItem.svelte';
	import DmnUnitPicker from '../plta/[pltaId]/telemetering/harian/DmnUnitPicker.svelte';
	import type { GuideExampleId } from './guide';

	/**
	 * Contoh tampilan di samping teks panduan.
	 *
	 * Yang dirender adalah **komponen asli** aplikasi dengan data contoh, bukan
	 * gambar atau tiruan: kalau tombol atau badge di halaman sungguhan berubah
	 * bentuk, contoh di sini ikut berubah, jadi tidak pernah basi seperti
	 * screenshot. Dua komponen milik rute Telemetering diimpor langsung dari
	 * folder rutenya karena hanya dipakai di sana dan di sini.
	 *
	 * Seluruh contoh dibungkus `inert`: tidak bisa diklik, difokus, atau dibaca
	 * pembaca layar. Teks panduan sudah menjelaskan isinya, dan kontrol yang bisa
	 * ditekan tapi tidak melakukan apa-apa hanya membingungkan operator.
	 */
	let { id }: { id: GuideExampleId } = $props();

	const noop = () => {};

	const SOURCE_TYPES: SourceMarkerType[] = [
		'api',
		'formula',
		'input',
		'constant',
		'constant-input',
		'unavailable'
	];

	const REPORT_FLOW = [
		{ label: 'Menunggu', tone: 'amber' as const, spinning: false },
		{ label: 'Diproses', tone: 'cyan' as const, spinning: true },
		{ label: 'Selesai', tone: 'green' as const, spinning: false }
	];

	const CAPTIONS: Record<GuideExampleId, string> = {
		'plant-switcher': 'Pemilih PLTA di kanan atas halaman',
		roles: 'Label peran di User Management',
		'monthly-input-button': 'Tombol di bagian Ringkasan',
		'source-markers': 'Penanda asal nilai',
		'dmn-picker': 'Pemilih unit beban penuh di zona hulu',
		'metric-row': 'Satu baris parameter yang bisa diisi manual',
		'forecast-controls': 'Pilihan parameter dan horizon',
		'forecast-accuracy': 'Status kelayakan dan peringatannya',
		'trend-period': 'Pilihan periode grafik',
		'report-create': 'Tombol di kanan atas halaman Laporan',
		'report-status': 'Perjalanan status laporan',
		'upload-tabs': 'Tab jenis unggahan dan cakupannya',
		'excel-rejected': 'Pesan bila berkas ditolak',
		'user-status': 'Kolom Role dan Status di daftar pengguna'
	};
</script>

<figure class="mt-3.5 overflow-hidden rounded-xl border border-border-subtle bg-surface-base">
	<figcaption
		class="flex items-center justify-between gap-2 border-b border-border-subtle px-3.5 py-2 text-xs text-text-muted"
	>
		<span class="table-head-cell">Contoh tampilan</span>
		<span class="truncate">{CAPTIONS[id]}</span>
	</figcaption>

	<div inert class="flex min-w-0 flex-wrap items-center gap-3 p-4 select-none">
		{#if id === 'plant-switcher'}
			<Select
				ariaLabel="Pilih PLTA"
				value="sdr"
				options={[{ value: 'sdr', label: 'Soedirman · SDR' }]}
				class="w-full sm:w-[260px]"
			>
				{#snippet leadingIcon()}<IconBuilding />{/snippet}
			</Select>
		{:else if id === 'roles'}
			<RoleBadge role="Viewer" />
			<RoleBadge role="Operator PLTA" />
			<RoleBadge role="Super Admin" />
		{:else if id === 'monthly-input-button'}
			<div class="flex w-full items-center justify-between gap-3">
				<span class="card-title">Ringkasan September 2026</span>
				<Button type="button" size="sm" variant="ghost" class="text-brand-primary-strong">
					{#snippet leftIcon()}<IconPencil class="size-3.5" />{/snippet}
					Input data
				</Button>
			</div>
		{:else if id === 'source-markers'}
			<ul class="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
				{#each SOURCE_TYPES as type (type)}
					<li class="flex items-center gap-2 text-xs text-text-secondary">
						<SourceMarker {type} />
						{SOURCE_MARKER_LABEL[type]}
					</li>
				{/each}
			</ul>
		{:else if id === 'dmn-picker'}
			<div class="w-full">
				<DmnUnitPicker
					units={[
						{ unit: 1, dmnMw: 60.3 },
						{ unit: 2, dmnMw: 60.3 },
						{ unit: 3, dmnMw: 60.4 }
					]}
					selectedUnits={[1, 2]}
					manualDmn={undefined}
					onChange={noop}
				/>
			</div>
		{:else if id === 'metric-row'}
			<div class="w-full">
				<MetricRowItem
					row={{
						label: 'TMA Waduk',
						value: '231,52',
						unit: 'm',
						source: 'Input',
						sourceType: 'input',
						hasData: false,
						uploadTarget: {
							label: 'TMA Waduk',
							parameter: 'reservoir',
							unit: 'm',
							tags: []
						}
					}}
					onUpload={noop}
				/>
			</div>
		{:else if id === 'forecast-controls'}
			<SegmentedControl
				ariaLabel="Parameter forecasting"
				value="inflow"
				onChange={noop}
				options={[
					{ value: 'inflow', label: 'Inflow' },
					{ value: 'water_level', label: 'TMA Waduk' }
				]}
			/>
			<SegmentedControl
				ariaLabel="Horizon forecasting"
				value="24"
				onChange={noop}
				options={[
					{ value: '24', label: '24 Jam' },
					{ value: '168', label: '7 Hari' }
				]}
			/>
		{:else if id === 'forecast-accuracy'}
			<div class="flex w-full flex-col gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge tone="green">Layak</Badge>
					<Badge tone="amber">Layak dengan catatan</Badge>
				</div>
				<Banner tone="warning" title="Akurasi model belum layak jadi acuan tunggal">
					Gunakan bersama data aktual dan pertimbangan operator.
				</Banner>
			</div>
		{:else if id === 'trend-period'}
			<SegmentedControl
				ariaLabel="Periode tren"
				value="24 Jam Terakhir"
				onChange={noop}
				options={['24 Jam Terakhir', '7 Hari Terakhir', '30 Hari Terakhir'].map((value) => ({
					value,
					label: value
				}))}
			/>
		{:else if id === 'report-create'}
			<Button type="button" size="lg">
				{#snippet leftIcon()}<IconPlus class="size-4" />{/snippet}
				Buat Laporan
			</Button>
		{:else if id === 'report-status'}
			<div class="flex w-full flex-col gap-3">
				<div class="flex flex-wrap items-center gap-2">
					{#each REPORT_FLOW as step, index (step.label)}
						{#if index > 0}
							<IconArrowRight class="size-3.5 text-text-muted" aria-hidden="true" />
						{/if}
						<Badge tone={step.tone} spinning={step.spinning}>{step.label}</Badge>
					{/each}
				</div>
				<div class="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3">
					<!-- Kelas yang sama dengan tombol di tabel Laporan. -->
					<button type="button" disabled class="btn btn-ghost btn-sm text-brand-primary-strong">
						<IconDownload class="size-3.5" />
						Unduh Excel
					</button>
					<span class="text-xs text-text-muted">sebelum Selesai</span>
					<button type="button" class="btn btn-ghost btn-sm text-brand-primary-strong">
						<IconDownload class="size-3.5" />
						Unduh Excel
					</button>
					<span class="text-xs text-text-muted">setelah Selesai</span>
				</div>
			</div>
		{:else if id === 'upload-tabs'}
			<div class="flex w-full flex-col gap-3">
				<Tabs
					idPrefix="panduan-upload"
					ariaLabel="Jenis unggahan"
					items={[
						{ value: 'excel', label: 'Excel Bulanan' },
						{ value: 'harian', label: 'Excel Harian' },
						{ value: 'prakiraan', label: 'Prakiraan Hujan' },
						{ value: 'eva', label: 'Input EVA' }
					]}
					activeValue="excel"
					onChange={noop}
				/>
				<div class="flex flex-wrap items-center gap-2">
					<Badge tone="cyan">Berlaku untuk semua PLTA</Badge>
					<span class="text-xs text-text-muted">Excel Bulanan, Excel Harian, Prakiraan Hujan</span>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<Badge tone="slate">Per PLTA</Badge>
					<span class="text-xs text-text-muted">Input EVA</span>
				</div>
			</div>
		{:else if id === 'excel-rejected'}
			<Banner tone="danger" title="Berkas ditolak" class="w-full">
				Baris 7: kode_plta "XYZ" tidak dikenal.
			</Banner>
		{:else if id === 'user-status'}
			<!-- Status di tabel pengguna bukan komponen tersendiri; kelasnya disamakan. -->
			<div class="grid w-full grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2.5">
				{#each [{ role: 'Operator PLTA' as const, isActive: true }, { role: 'Viewer' as const, isActive: false }] as item (item.role)}
					<RoleBadge role={item.role} />
					<button
						type="button"
						class="flex w-fit items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] font-medium text-text-secondary"
					>
						<span class={`size-2 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-disabled'}`}
						></span>
						{item.isActive ? 'Aktif' : 'Nonaktif'}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</figure>
