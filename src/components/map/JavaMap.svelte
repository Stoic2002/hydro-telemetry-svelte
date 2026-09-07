<script lang="ts">
	import { geoMercator, geoPath } from 'd3-geo';
	import type { FeatureCollection, Geometry, GeoJsonProperties, LineString } from 'geojson';
	import IconCloudRain from '~icons/ph/cloud-rain';

	import Badge from '$components/atoms/Badge.svelte';
	import MapSkeleton from '$components/skeletons/MapSkeleton.svelte';
	import {
		createPlantCatalogQuery,
		getPLTAErrorMessage,
		getPlantDisplayName
	} from '$features/plta';
	import { formatTimeWIB } from '$shared/lib/date';
	import { formatMetric } from '$shared/utils/number';
	import { getLabelCoordinate } from './label-placement';
	import { horizontalShiftForWidth, pixelShiftToLongitude } from './projection';
	import { createMapLayersQuery, createRainRadarFrameQuery, type RiverProperties } from './queries';
	import {
		CENTRAL_JAVA_RADAR_TILES,
		RAIN_VIEWER_TILE_HOST,
		tileXToLongitude,
		tileYToLatitude
	} from './radar-tiles';

	interface Props {
		onPLTAClick: (pltaId: string) => void;
		showPrecipitation?: boolean;
		projectionConfig?: { center?: [number, number]; scale?: number };
	}

	let { onPLTAClick, showPrecipitation = false, projectionConfig }: Props = $props();

	/**
	 * `react-simple-maps` tidak punya padanan Svelte, jadi `d3-geo` dipakai
	 * langsung: `geoMercator()` untuk proyeksi dan `geoPath()` untuk menghasilkan
	 * atribut `d`. Library itu sendiri sebenarnya pembungkus tipis di atas kedua
	 * fungsi ini, jadi hasilnya justru lebih sedikit lapisan.
	 */

	// Bounding box di sekitar Jawa Tengah dengan skala besar untuk tampilan luas.
	const DEFAULT_PROJECTION = {
		scale: 22000,
		center: [110.1, -7.42] as [number, number]
	};

	const MAP_VIEWBOX = { width: 800, height: 600 } as const;

	const CITY_LABEL_OFFSETS: Record<string, { x: number; y: number }> = {
		'Kota Magelang': { x: -36, y: 11 },
		'Kota Pekalongan': { x: -4, y: -15 },
		'Kota Salatiga': { x: 13, y: 12 },
		'Kota Semarang': { x: 13, y: -14 },
		'Kota Surakarta': { x: 15, y: -10 },
		'Kota Tegal': { x: -14, y: -13 }
	};

	const plantsQuery = createPlantCatalogQuery();
	const mapLayersQuery = createMapLayersQuery();
	const radarQuery = createRainRadarFrameQuery(() => showPrecipitation);

	let hoveredId = $state<string | null>(null);
	/** Dipisahkan dari hover agar cincin fokus hanya tampil untuk keyboard. */
	let focusedId = $state<string | null>(null);
	/**
	 * Sakelar radar dikendalikan operator setelah peta tampil, tetapi nilai
	 * awalnya mengikuti prop. `$derived` yang bisa ditulis ulang memberi keduanya:
	 * ia disetel ulang saat prop berubah, dan tetap boleh diubah dari sakelar.
	 */
	let isPrecipitationVisible = $derived(showPrecipitation);

	let mapContainer = $state<HTMLDivElement | null>(null);
	let mapSize = $state<{ width: number; height: number }>({ ...MAP_VIEWBOX });

	const instanceId = $props.id();
	const clipPathId = `central-java-map-${instanceId}`;

	const plantList = $derived(plantsQuery.data ?? []);
	const mapLayers = $derived(mapLayersQuery.data ?? null);
	const radarFrame = $derived(radarQuery.data ?? null);

	const radarStatus = $derived(
		radarQuery.isPending
			? radarQuery.fetchStatus === 'idle'
				? 'idle'
				: 'loading'
			: radarQuery.isError
				? 'error'
				: 'ready'
	);

	const isMapReady = $derived(Boolean(mapLayers && !plantsQuery.isPending));

	$effect(() => {
		const container = mapContainer;
		if (!container || !isMapReady) return;

		const updateMapSize = ({ width, height }: { width: number; height: number }) => {
			const nextWidth = Math.max(1, Math.round(width));
			const nextHeight = Math.max(1, Math.round(height));
			if (mapSize.width === nextWidth && mapSize.height === nextHeight) return;
			mapSize = { width: nextWidth, height: nextHeight };
		};

		updateMapSize(container.getBoundingClientRect());
		const observer = new ResizeObserver(([entry]) => {
			if (entry) updateMapSize(entry.contentRect);
		});
		observer.observe(container);

		return () => observer.disconnect();
	});

	const projection = $derived.by(() => {
		const config = projectionConfig ?? DEFAULT_PROJECTION;
		const viewportScale = Math.min(
			mapSize.width / MAP_VIEWBOX.width,
			mapSize.height / MAP_VIEWBOX.height
		);
		const effectiveScale = (config.scale ?? DEFAULT_PROJECTION.scale) * viewportScale;
		const [baseLongitude, baseLatitude] = config.center ?? DEFAULT_PROJECTION.center;

		// Digeser ke kiri sejauh setengah lebar panel melayang di kanan, supaya
		// daratan tidak tertutup sakelar radar dan legenda.
		const centerLongitude =
			baseLongitude + pixelShiftToLongitude(horizontalShiftForWidth(mapSize.width), effectiveScale);

		return geoMercator()
			.center([centerLongitude, baseLatitude])
			.scale(effectiveScale)
			.translate([mapSize.width / 2, mapSize.height / 2]);
	});

	const path = $derived(geoPath(projection));

	// Pengelompokan 555 fitur sungai hanya bergantung pada datanya, bukan pada
	// ukuran peta maupun penanda yang sedang disorot.
	const riverLayers = $derived.by(() => {
		const rivers = mapLayers?.rivers;
		if (!rivers) return null;

		const byOrder = (
			predicate: (order: number) => boolean
		): FeatureCollection<LineString, RiverProperties> => ({
			type: 'FeatureCollection',
			features: rivers.features.filter((feature) => predicate(feature.properties.strahlerOrder))
		});

		return {
			tributaries: byOrder((order) => order === 4),
			secondaryRivers: byOrder((order) => order === 5),
			primaryRivers: byOrder((order) => order >= 6)
		};
	});

	// Centroid dihitung dari 6.069 titik dan tidak bergantung pada ukuran peta,
	// jadi cukup sekali per kumpulan data.
	const regencyLabels = $derived.by(() => {
		const regencies = mapLayers?.regencies;
		if (!regencies) return [];

		return regencies.features.flatMap((feature) => {
			const name = String(feature.properties?.namobj || feature.properties?.wadmkk || '').trim();
			if (!name) return [];

			const coordinate = getLabelCoordinate(feature.geometry);
			return coordinate ? [{ name, coordinate }] : [];
		});
	});

	const labelResponsiveFactor = $derived(
		mapSize.width < 480 ? 0.62 : mapSize.width < 768 ? 0.78 : 1
	);
	const labelFontSize = $derived(mapSize.width < 480 ? 5.8 : mapSize.width < 768 ? 7 : 8.5);

	const hoveredPlant = $derived(
		hoveredId ? (plantList.find((plant) => plant.id === hoveredId) ?? null) : null
	);

	const isRadarVisible = $derived(
		showPrecipitation && isPrecipitationVisible && radarStatus === 'ready' && radarFrame !== null
	);

	const hasError = $derived(mapLayersQuery.isError || plantsQuery.isError);

	function shapePath(
		geography: FeatureCollection<Geometry, GeoJsonProperties>
	): string | undefined {
		return path(geography) ?? undefined;
	}
</script>

{#snippet centralJavaShape(fill?: string, outline?: string)}
	{#if mapLayers}
		{@const d = shapePath(mapLayers.regencies)}
		{#if outline}
			<!--
				Goresan digambar lebih dulu untuk seluruh batas, lalu ditimpa isian.
				Batas antar kabupaten tertutup isian, menyisakan garis terluar saja.
			-->
			<g pointer-events="none">
				<path {d} fill="none" stroke={outline} stroke-width={3} stroke-linejoin="round" />
				<path {d} {fill} />
			</g>
		{:else}
			<path {d} {fill} />
		{/if}
	{/if}
{/snippet}

{#if hasError}
	<div class="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
		<p class="text-sm font-medium text-status-danger-strong">
			{mapLayersQuery.isError
				? 'Data batas wilayah peta gagal dimuat.'
				: getPLTAErrorMessage(plantsQuery.error)}
		</p>
		<button
			type="button"
			onclick={() => {
				if (mapLayersQuery.isError) void mapLayersQuery.refetch();
				else void plantsQuery.refetch();
			}}
			class="btn btn-ghost btn-sm text-status-danger-strong"
		>
			{mapLayersQuery.isError ? 'Muat ulang peta' : 'Muat ulang data PLTA'}
		</button>
	</div>
{:else if !mapLayers || plantsQuery.isPending}
	<MapSkeleton />
{:else}
	<div
		bind:this={mapContainer}
		class="relative flex h-[clamp(280px,55vw,560px)] w-full min-w-0 items-center justify-center overflow-hidden bg-transparent select-none"
	>
		<svg
			width={mapSize.width}
			height={mapSize.height}
			viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
			class="block h-full w-full"
		>
			<defs>
				<clipPath id={clipPathId}>
					{@render centralJavaShape()}
				</clipPath>
			</defs>

			{@render centralJavaShape(isRadarVisible ? '#f1f1f1' : '#f9f9f9', '#c7c7c7')}

			{#if isRadarVisible && radarFrame}
				<g
					clip-path={`url(#${clipPathId})`}
					aria-label="Presipitasi radar terbaru"
					opacity={0.72}
					pointer-events="none"
				>
					{#each CENTRAL_JAVA_RADAR_TILES as tile (`${tile.zoom}-${tile.x}-${tile.y}`)}
						{@const northWest = projection([
							tileXToLongitude(tile.x, tile.zoom),
							tileYToLatitude(tile.y, tile.zoom)
						])}
						{@const southEast = projection([
							tileXToLongitude(tile.x + 1, tile.zoom),
							tileYToLatitude(tile.y + 1, tile.zoom)
						])}
						{#if northWest && southEast}
							<!--
								Ubin dilebihkan setengah piksel di setiap sisi. Tanpa itu,
								pembulatan sub-piksel meninggalkan garis rambut transparan di
								antara ubin yang bersebelahan.
							-->
							<image
								href={`${RAIN_VIEWER_TILE_HOST}${radarFrame.path}/256/${tile.zoom}/${tile.x}/${tile.y}/2/1_1.png`}
								x={northWest[0] - 0.5}
								y={northWest[1] - 0.5}
								width={southEast[0] - northWest[0] + 1}
								height={southEast[1] - northWest[1] + 1}
								preserveAspectRatio="none"
							/>
						{/if}
					{/each}
				</g>
			{/if}

			<!-- Batas kabupaten/kota. -->
			<g pointer-events="none" aria-label="Batas kabupaten dan kota di Jawa Tengah">
				{#each mapLayers.regencies.features as feature, index (index)}
					<path
						d={path(feature) ?? undefined}
						fill="transparent"
						stroke="#6e6e6e"
						stroke-width={0.42}
						vector-effect="non-scaling-stroke"
					/>
				{/each}
			</g>

			{#if riverLayers}
				<g
					clip-path={`url(#${clipPathId})`}
					aria-label="Jaringan aliran sungai Jawa Tengah"
					fill="none"
					stroke-linecap="round"
					stroke-linejoin="round"
					pointer-events="none"
				>
					<path
						d={path(riverLayers.tributaries) ?? undefined}
						stroke="#38bdf8"
						stroke-opacity={0.68}
						stroke-width={0.85}
						vector-effect="non-scaling-stroke"
					/>
					<path
						d={path(riverLayers.secondaryRivers) ?? undefined}
						stroke="#0284c7"
						stroke-opacity={0.86}
						stroke-width={1.4}
						vector-effect="non-scaling-stroke"
					/>
					<path
						d={path(riverLayers.primaryRivers) ?? undefined}
						stroke="#0369a1"
						stroke-width={2.1}
						vector-effect="non-scaling-stroke"
					/>
				</g>
			{/if}

			<g aria-label="Nama kabupaten dan kota di Jawa Tengah" pointer-events="none">
				{#each regencyLabels as label, index (`${label.name}-${index}`)}
					{@const centroid = projection(label.coordinate)}
					{#if centroid && Number.isFinite(centroid[0]) && Number.isFinite(centroid[1])}
						{@const offset = CITY_LABEL_OFFSETS[label.name]}
						{@const labelX = centroid[0] + (offset?.x ?? 0) * labelResponsiveFactor}
						{@const labelY = centroid[1] + (offset?.y ?? 0) * labelResponsiveFactor}
						{@const isCity = label.name.startsWith('Kota ')}
						<g>
							{#if offset}
								<!-- Garis penghubung ke centroid asli, untuk label yang digeser. -->
								<line
									x1={centroid[0]}
									y1={centroid[1]}
									x2={labelX}
									y2={labelY}
									stroke="#6e6e6e"
									stroke-opacity={0.72}
									stroke-width={0.65}
									vector-effect="non-scaling-stroke"
								/>
							{/if}
							<text
								x={labelX}
								y={labelY}
								text-anchor="middle"
								dominant-baseline="central"
								fill="#454545"
								font-family="Manrope, ui-sans-serif, system-ui, sans-serif"
								font-size={labelFontSize}
								font-weight={700}
								letter-spacing={0.08}
								stroke="#ffffff"
								stroke-opacity={0.94}
								stroke-width={2.5}
								stroke-linejoin="round"
								paint-order="stroke"
							>
								{#if isCity}
									<tspan x={labelX} dy={-labelFontSize * 0.42} font-size={labelFontSize * 0.72}>
										Kota
									</tspan>
									<tspan x={labelX} dy={labelFontSize * 0.92}>{label.name.slice(5)}</tspan>
								{:else}
									{label.name}
								{/if}
							</text>
						</g>
					{/if}
				{/each}
			</g>

			{#each plantList as plant (plant.id)}
				{#if plant.longitude !== null && plant.latitude !== null}
					{@const position = projection([plant.longitude, plant.latitude])}
					{#if position}
						{@const isHighlighted = hoveredId === plant.id}
						{@const isFocused = focusedId === plant.id}
						{@const statusColor = plant.isActive ? '#0891b2' : '#9b9b9b'}
						{@const plantName = getPlantDisplayName(plant)}
						<g
							transform={`translate(${position[0]} ${position[1]})`}
							role="button"
							tabindex="0"
							aria-label={`Buka telemetering PLTA ${plantName}`}
							onclick={() => onPLTAClick(plant.id)}
							onpointerenter={() => (hoveredId = plant.id)}
							onpointerleave={() => (hoveredId = null)}
							onfocus={() => {
								focusedId = plant.id;
								hoveredId = plant.id;
							}}
							onblur={() => {
								focusedId = null;
								hoveredId = null;
							}}
							onkeydown={(event) => {
								if (event.key !== 'Enter' && event.key !== ' ') return;
								// Spasi menggulirkan halaman bila tidak dicegat.
								event.preventDefault();
								onPLTAClick(plant.id);
							}}
							class="cursor-pointer transition-all duration-300 outline-none"
						>
							{#if isFocused}
								<circle
									r={26}
									fill="none"
									stroke="var(--color-brand-primary-strong)"
									stroke-width={2}
									stroke-dasharray="4 3"
								/>
							{/if}
							<circle
								r={isHighlighted ? 20 : 12}
								fill={statusColor}
								fill-opacity={isHighlighted ? 0.2 : 0.1}
								class={isHighlighted ? '' : 'animate-pulse'}
							/>
							<circle
								r={isHighlighted ? 7 : 5}
								fill={statusColor}
								stroke="#ffffff"
								stroke-width={2}
							/>
							<text
								text-anchor="middle"
								y={isHighlighted ? -26 : -16}
								aria-hidden="true"
								class={`font-sans text-[10px] font-bold transition-all ${
									isHighlighted ? 'fill-text-primary opacity-100' : 'fill-text-muted opacity-70'
								}`}
							>
								{plantName}
							</text>
						</g>
					{/if}
				{/if}
			{/each}
		</svg>

		{#if showPrecipitation}
			<div
				class="absolute top-3 right-3 z-10 w-[212px] max-w-[calc(100%-1.5rem)] rounded-xl border border-border-subtle bg-surface-raised/95 px-3.5 py-3 shadow-overlay backdrop-blur-sm sm:top-4 sm:right-4"
			>
				<div class="flex items-center justify-between gap-3">
					<span class="flex items-center gap-1.5 text-sm font-medium text-text-primary">
						<IconCloudRain class="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
						Radar Hujan
					</span>
					<button
						type="button"
						role="switch"
						aria-checked={isPrecipitationVisible}
						aria-label={isPrecipitationVisible ? 'Matikan radar hujan' : 'Nyalakan radar hujan'}
						onclick={() => (isPrecipitationVisible = !isPrecipitationVisible)}
						class={`relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full transition-colors ${
							isPrecipitationVisible ? 'bg-brand-primary-strong' : 'bg-border-subtle'
						}`}
					>
						<span
							class={`absolute top-0.5 left-0.5 size-3.5 rounded-full bg-surface-raised transition-transform ${
								isPrecipitationVisible ? 'translate-x-[14px]' : 'translate-x-0'
							}`}
						></span>
					</button>
				</div>

				{#if isPrecipitationVisible}
					<div role="status" class="mt-2.5 border-t border-surface-overlay pt-2">
						<p
							class="flex items-center justify-between gap-2 text-xs font-medium text-text-secondary"
						>
							<span>Frame terakhir</span>
							{#if radarStatus === 'ready' && radarFrame}
								<span class="font-mono text-xs text-text-primary tabular-nums">
									{formatTimeWIB(radarFrame.time * 1000)} WIB
								</span>
							{:else if radarStatus === 'error'}
								<span class="text-status-warning-strong">Tidak tersedia</span>
							{:else if radarStatus === 'loading'}
								<span class="animate-pulse text-text-muted">Memuat…</span>
							{/if}
						</p>
						{#if radarStatus === 'ready'}
							<a
								href="https://www.rainviewer.com/"
								target="_blank"
								rel="noreferrer"
								class="mt-1 block text-xs font-medium text-brand-primary-strong underline underline-offset-2"
							>
								Data radar: RainViewer
							</a>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if hoveredPlant}
			<div
				class="pointer-events-none absolute inset-x-3 top-3 rounded-xl border border-border-subtle bg-surface-raised p-3 shadow-panel sm:inset-x-auto sm:top-4 sm:left-4 sm:min-w-[250px] sm:p-4"
			>
				<div class="mb-3 flex items-start justify-between gap-3">
					<h4 class="min-w-0 font-sans text-sm font-semibold text-text-strong">
						{hoveredPlant.name}
					</h4>
					<Badge tone={hoveredPlant.isActive ? 'green' : 'slate'}>
						{hoveredPlant.isActive ? 'Aktif' : 'Tidak aktif'}
					</Badge>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between gap-3">
						<span class="text-xs text-text-muted">Kode</span>
						<span class="metric-value text-sm">{hoveredPlant.code}</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-xs text-text-muted">Kapasitas</span>
						<span class="metric-value text-sm">
							{formatMetric(hoveredPlant.capacityMw, 1)}<span class="metric-unit ml-1">MW</span>
						</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-xs text-text-muted">Koordinat</span>
						<span class="text-right font-mono text-xs text-text-secondary">
							{hoveredPlant.latitude?.toFixed(4)}, {hoveredPlant.longitude?.toFixed(4)}
						</span>
					</div>
				</div>
				<div
					class="mt-4 flex items-center gap-1 border-t border-surface-overlay pt-3 text-xs font-medium text-brand-primary-strong"
				>
					Klik untuk detail telemetering →
				</div>
			</div>
		{/if}

		{#if plantList.length === 0}
			<div
				class="absolute inset-x-4 top-4 rounded-xl border border-border-subtle bg-surface-raised/95 px-4 py-3 text-center text-sm text-text-muted backdrop-blur-sm"
			>
				Belum ada PLTA yang dapat ditampilkan pada peta.
			</div>
		{/if}

		<div
			class="absolute right-3 bottom-3 flex max-w-[calc(100%-1.5rem)] min-w-[150px] flex-col gap-2 rounded-xl border border-border-subtle bg-surface-raised/95 px-3 py-2.5 shadow-overlay backdrop-blur-sm sm:right-4 sm:bottom-4 sm:min-w-[212px] sm:px-3.5"
		>
			<span class="table-head-cell">Legenda</span>
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center gap-2">
					<div class="h-2.5 w-3.5 shrink-0 rounded-sm bg-border-subtle"></div>
					<span class="text-xs text-text-secondary">Jawa Tengah</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="w-3.5 shrink-0 border-t border-dashed border-text-placeholder"></div>
					<span class="text-xs text-text-secondary">Batas Kab/Kota</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="h-0.5 w-3.5 shrink-0 rounded-full bg-sky-400"></div>
					<span class="text-xs text-text-secondary">Jaringan Sungai</span>
				</div>
				{#if isRadarVisible}
					<div class="flex items-center gap-2">
						<div
							class="h-2.5 w-3.5 shrink-0 rounded-sm bg-gradient-to-r from-sky-300 via-amber-300 to-fuchsia-500"
						></div>
						<span class="text-xs text-text-secondary">Radar Hujan</span>
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<div class="size-2.5 shrink-0 rounded-full bg-brand-primary-strong"></div>
					<span class="text-xs text-text-secondary">PLTA</span>
				</div>
			</div>
			<span
				class="hidden max-w-[210px] border-t border-surface-overlay pt-2 text-xs leading-tight text-text-muted sm:block"
				title="Batas wilayah: BIG · Jaringan sungai: HydroRIVERS/HydroSHEDS"
			>
				Batas: BIG · Sungai: HydroRIVERS{showPrecipitation && radarStatus === 'ready'
					? ' · Radar: RainViewer'
					: ''}
			</span>
		</div>
	</div>
{/if}
