<script lang="ts">
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import Badge from '$components/controls/Badge.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import {
		ACCURACY_WINDOW_DAYS,
		createForecastAccuracyQuery,
		forecastAccuracyWindow,
		type ForecastHorizon,
		type ForecastParameter
	} from '$features/forecasting';
	import { formatNumber } from '$shared/utils/number';

	interface Props {
		pltaId: string;
		parameter: ForecastParameter;
		horizon: ForecastHorizon;
		unit: string;
	}

	/**
	 * Akurasi prediksi yang SUDAH tersaji ke operator dibanding realisasinya
	 * (`GET /forecasts/accuracy`), bukan metrik saat model dilatih. Keduanya bisa
	 * berselisih jauh: di Soedirman pernah tersaji TMA 0,15 mdpl selama tiga
	 * hari tanpa terlihat dari metrik latih. Pecahan per versi memperlihatkan
	 * penurunan mutu setelah model baru dipromosikan, dan porsi prediksi
	 * "fallback" (tanpa model).
	 *
	 * MAPE sengaja tidak ada (backend tidak menyajikannya): inflow kerap mendekati
	 * nol sehingga nilainya meledak.
	 */
	let { pltaId, parameter, horizon, unit }: Props = $props();

	// Dihitung sekali per halaman: rentang yang berubah tiap render mengubah
	// kunci query dan memicu permintaan tanpa henti.
	const accuracyWindow = forecastAccuracyWindow();

	const accuracyQuery = createForecastAccuracyQuery(() => ({
		pltaId,
		parameter,
		horizon,
		...accuracyWindow
	}));
	const report = $derived(accuracyQuery.data);

	function metric(value: number | null, digits = 2, suffix = ''): string {
		return value === null ? '—' : `${formatNumber(value, digits)}${suffix}`;
	}
</script>

<section
	aria-labelledby="forecast-accuracy-title"
	class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised"
>
	<div class="border-b border-surface-overlay px-5 py-4">
		<h2 id="forecast-accuracy-title" class="section-title">Akurasi prediksi yang tersaji</h2>
		<p class="mt-1 text-xs text-text-muted">
			Prediksi horizon {horizon} jam yang sudah jatuh tempo dalam {ACCURACY_WINDOW_DAYS} hari terakhir,
			dibanding realisasi rata-rata per jam.
		</p>
	</div>

	{#if accuracyQuery.isLoading}
		<div role="status" class="grid grid-cols-2 gap-4 p-5 xl:grid-cols-4">
			{#each Array.from({ length: 4 }, (_, index) => index) as index (index)}
				<div>
					<div class="skeleton-shimmer h-2.5 w-20 rounded"></div>
					<div class="skeleton-shimmer mt-2 h-6 w-24 rounded"></div>
				</div>
			{/each}
			<span class="sr-only">Memuat akurasi prediksi...</span>
		</div>
	{:else if accuracyQuery.isError}
		<div class="p-5">
			<Banner tone="warning" title="Akurasi prediksi belum dapat dimuat">
				<button
					type="button"
					onclick={() => void accuracyQuery.refetch()}
					class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
				>
					<IconRefresh class="size-3" />
					Coba lagi
				</button>
			</Banner>
		</div>
	{:else if report && report.sampleCount === 0}
		<p class="px-5 py-4 text-sm text-text-muted">
			Belum ada prediksi yang jatuh tempo pada periode ini, jadi akurasinya belum bisa dinilai.
		</p>
	{:else if report}
		<dl class="grid grid-cols-2 xl:grid-cols-4">
			<div class="p-4">
				<dt class="table-head-cell">Akurasi</dt>
				<dd class="metric-value mt-1.5 text-xl font-semibold">
					{metric(report.accuracyPercent, 1, '%')}
				</dd>
				<dd class="mt-1 text-xs text-text-muted">100 − galat relatif</dd>
			</div>
			<div class="p-4">
				<dt class="table-head-cell">Galat rata-rata (MAE)</dt>
				<dd class="metric-value mt-1.5 text-xl font-semibold">
					{metric(report.mae)}{#if report.mae !== null}<span class="metric-unit ml-1">{unit}</span
						>{/if}
				</dd>
				<dd class="mt-1 text-xs text-text-muted">Selisih rata-rata dari realisasi</dd>
			</div>
			<div class="p-4">
				<dt class="table-head-cell">RMSE</dt>
				<dd class="metric-value mt-1.5 text-xl font-semibold">
					{metric(report.rmse)}{#if report.rmse !== null}<span class="metric-unit ml-1">{unit}</span
						>{/if}
				</dd>
				<dd class="mt-1 text-xs text-text-muted">Lebih peka pada selisih besar</dd>
			</div>
			<div class="p-4">
				<dt class="table-head-cell">Titik dinilai</dt>
				<dd class="metric-value mt-1.5 text-xl font-semibold">
					{formatNumber(report.sampleCount, 0)}
				</dd>
				<dd class="mt-1 text-xs text-text-muted">
					Galat relatif {metric(report.relativeErrorPercent, 1, '%')}
				</dd>
			</div>
		</dl>

		{#if parameter === 'inflow'}
			<p class="border-t border-surface-overlay px-5 py-3 text-xs leading-relaxed text-text-muted">
				Saat inflow mendekati nol (musim kering), persentase akurasi bisa menyesatkan — bacalah MAE
				yang dalam satuan aslinya.
			</p>
		{/if}

		{#if report.byVersion.length > 0}
			<div class="overflow-x-auto border-t border-surface-overlay">
				<table class="w-full min-w-[520px] border-collapse text-left">
					<thead class="bg-surface-overlay/50">
						<tr>
							<th class="table-head-cell px-5 py-2">Versi model</th>
							<th class="table-head-cell px-3.5 py-2 text-right">Titik</th>
							<th class="table-head-cell px-3.5 py-2 text-right"
								>MAE (<span class="normal-case">{unit}</span>)</th
							>
							<th class="table-head-cell px-3.5 py-2 text-right"
								>RMSE (<span class="normal-case">{unit}</span>)</th
							>
							<th class="table-head-cell px-5 py-2 text-right">Akurasi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-overlay">
						{#each report.byVersion as version (version.version)}
							<tr class="text-sm text-text-secondary">
								<td class="px-5 py-2">
									{#if version.isFallback}
										<Badge tone="amber">Tanpa model (fallback)</Badge>
									{:else}
										<span class="font-mono text-xs">v{version.version}</span>
									{/if}
								</td>
								<td class="metric-value px-3.5 py-2 text-right">
									{formatNumber(version.sampleCount, 0)}
								</td>
								<td class="metric-value px-3.5 py-2 text-right">{metric(version.mae)}</td>
								<td class="metric-value px-3.5 py-2 text-right">{metric(version.rmse)}</td>
								<td class="metric-value px-5 py-2 text-right">
									{metric(version.accuracyPercent, 1, '%')}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</section>
