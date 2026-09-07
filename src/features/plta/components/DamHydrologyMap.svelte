<script lang="ts">
	import IconExternalLink from '~icons/ph/arrow-square-out';
	import {
		DAM_IMAGERY_VIEWBOX,
		HYDROLOGY_ZONES,
		HYDROLOGY_ZONE_PRESENTATION,
		projectDamAnchor,
		type DamImagery,
		type HydrologyZone
	} from '../dam-imagery';

	interface Props {
		imagery: DamImagery;
		activeZone: HydrologyZone | null;
		onActiveZoneChange: (zone: HydrologyZone | null) => void;
		onImageError: () => void;
		onZoneSelect: (zone: HydrologyZone) => void;
	}

	let { imagery, activeZone, onActiveZoneChange, onImageError, onZoneSelect }: Props = $props();

	const MARKER_HALO: Record<HydrologyZone, string> = {
		upstream: 'rgba(34,211,238,.24)',
		dam: 'rgba(245,158,11,.24)',
		downstream: 'rgba(52,211,153,.24)'
	};

	/**
	 * Radius arsiran tiap zona dalam satuan viewBox. Bendungan dibuat paling kecil
	 * karena bangunannya memang satu titik, sedangkan hulu (genangan waduk) dan
	 * hilir (alur sungai) mencakup area yang jauh lebih luas.
	 */
	const ZONE_FIELD_RADIUS: Record<HydrologyZone, { rx: number; ry: number }> = {
		upstream: { rx: 300, ry: 225 },
		dam: { rx: 175, ry: 140 },
		downstream: { rx: 265, ry: 205 }
	};

	const MARKER_FILL: Record<HydrologyZone, string> = {
		upstream: 'fill-brand-primary',
		dam: 'fill-zone-dam',
		downstream: 'fill-status-success'
	};

	const MARKER_TEXT_FILL: Record<HydrologyZone, string> = {
		upstream: 'fill-cyan-950',
		dam: 'fill-white',
		downstream: 'fill-emerald-950'
	};

	function projectAnchor(zone: HydrologyZone) {
		return projectDamAnchor(imagery.anchors[zone]);
	}

	const flowPoints = $derived(
		HYDROLOGY_ZONES.map((zone) => {
			const { x, y } = projectAnchor(zone);
			return `${x},${y}`;
		}).join(' ')
	);
</script>

<figure
	class="relative aspect-[8/5] max-h-[480px] min-h-[320px] w-full overflow-hidden bg-[#0f172a]"
>
	<svg
		viewBox={`0 0 ${DAM_IMAGERY_VIEWBOX.width} ${DAM_IMAGERY_VIEWBOX.height}`}
		preserveAspectRatio="xMidYMid slice"
		role="group"
		aria-label={`Pemetaan hidrologi ${imagery.damName}`}
		class="absolute inset-0 h-full w-full"
	>
		<title>Pemetaan titik hulu, bendungan, dan hilir pada {imagery.damName}</title>

		<defs>
			{#each HYDROLOGY_ZONES as zone (zone)}
				{@const accentColor = HYDROLOGY_ZONE_PRESENTATION[zone].accentColor}
				{@const anchor = projectAnchor(zone)}
				<!--
					Arsiran diagonal: pola garis terbaca di atas foto tanpa menutupi
					detail permukaannya seperti blok warna solid.
				-->
				<pattern
					id={`hatch-${zone}`}
					patternUnits="userSpaceOnUse"
					width="10"
					height="10"
					patternTransform="rotate(45)"
				>
					<line x1="0" y1="0" x2="0" y2="10" stroke={accentColor} stroke-width="3" />
				</pattern>
				<!--
					Tepi arsiran dilembutkan supaya tidak terbaca sebagai batas wilayah
					yang presisi — batas zona memang tidak setegas itu.
				-->
				<radialGradient id={`fade-${zone}`}>
					<stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
					<stop offset="55%" stop-color="#ffffff" stop-opacity="0.85" />
					<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
				</radialGradient>
				<mask id={`field-${zone}`}>
					<ellipse
						cx={anchor.x}
						cy={anchor.y}
						rx={ZONE_FIELD_RADIUS[zone].rx}
						ry={ZONE_FIELD_RADIUS[zone].ry}
						fill={`url(#fade-${zone})`}
					/>
				</mask>
			{/each}
		</defs>

		<image
			href={imagery.imageUrl}
			x="0"
			y="0"
			width={DAM_IMAGERY_VIEWBOX.width}
			height={DAM_IMAGERY_VIEWBOX.height}
			preserveAspectRatio="xMidYMid slice"
			onerror={onImageError}
		/>
		<rect
			width={DAM_IMAGERY_VIEWBOX.width}
			height={DAM_IMAGERY_VIEWBOX.height}
			fill="#020617"
			opacity="0.08"
			pointer-events="none"
		/>

		<!-- Arsiran zona berada di bawah penanda supaya nomor tetap terbaca. -->
		{#each HYDROLOGY_ZONES as zone (zone)}
			{@const isActive = activeZone === zone}
			{@const isMuted = activeZone !== null && !isActive}
			<rect
				width={DAM_IMAGERY_VIEWBOX.width}
				height={DAM_IMAGERY_VIEWBOX.height}
				fill={`url(#hatch-${zone})`}
				mask={`url(#field-${zone})`}
				opacity={isActive ? 0.5 : isMuted ? 0.07 : 0.22}
				pointer-events="none"
				class="transition-opacity duration-200"
			/>
		{/each}

		<!--
			Garis alir hulu → bendungan → hilir: arah aliran air, bukan sekadar tiga
			titik yang berdiri sendiri.
		-->
		<polyline
			points={flowPoints}
			fill="none"
			stroke="#ffffff"
			stroke-width="3"
			stroke-opacity="0.5"
			stroke-dasharray="14 10"
			stroke-linecap="round"
			pointer-events="none"
			vector-effect="non-scaling-stroke"
		/>

		{#each HYDROLOGY_ZONES as zone (zone)}
			{@const anchor = projectAnchor(zone)}
			{@const presentation = HYDROLOGY_ZONE_PRESENTATION[zone]}
			{@const isActive = activeZone === zone}
			{@const isMuted = activeZone !== null && !isActive}
			{@const radius = isActive ? 15 : 13}
			{@const chipWidth = 20 + presentation.title.length * 11}
			{@const flip = anchor.x > DAM_IMAGERY_VIEWBOX.width * 0.7}
			{@const chipOffset = flip ? -(radius + 8 + chipWidth) : radius + 8}

			<g
				transform={`translate(${anchor.x} ${anchor.y})`}
				role="button"
				tabindex="0"
				aria-label={`Sorot parameter ${presentation.title}`}
				onclick={() => onZoneSelect(zone)}
				onkeydown={(event) => {
					if (event.key !== 'Enter' && event.key !== ' ') return;
					event.preventDefault();
					onZoneSelect(zone);
				}}
				onpointerenter={() => onActiveZoneChange(zone)}
				onpointerleave={() => onActiveZoneChange(null)}
				onfocus={() => onActiveZoneChange(zone)}
				onblur={() => onActiveZoneChange(null)}
				class="cursor-pointer transition-opacity duration-200"
				style={`opacity: ${isMuted ? 0.55 : 1}`}
			>
				{#if isActive}
					<circle r={radius + 5} fill={MARKER_HALO[zone]} />
				{/if}
				<circle
					r={radius}
					class={MARKER_FILL[zone]}
					stroke="#ffffff"
					stroke-width={2}
					vector-effect="non-scaling-stroke"
				/>
				<text
					text-anchor="middle"
					dominant-baseline="central"
					font-family="'JetBrains Mono', monospace"
					font-weight={600}
					font-size={isActive ? 13 : 12}
					class={MARKER_TEXT_FILL[zone]}
				>
					{presentation.order}
				</text>

				<!--
					Nama zona ditulis di foto, bukan hanya nomor: tanpa ini pembaca harus
					bolak-balik ke legenda untuk tahu titik 2 itu bendungan. Label dibalik
					ke kiri bila penanda dekat tepi kanan supaya tidak terpotong.
				-->
				<g transform={`translate(${chipOffset} 0)`} pointer-events="none">
					<rect
						x={0}
						y={-15}
						rx={7}
						width={chipWidth}
						height={30}
						fill={presentation.accentColor}
						opacity={0.95}
					/>
					<text
						x={chipWidth / 2}
						y={1}
						text-anchor="middle"
						dominant-baseline="central"
						font-family="Manrope, system-ui, sans-serif"
						font-weight={700}
						font-size={17}
						fill={presentation.accentTextColor}
					>
						{presentation.title}
					</text>
				</g>
			</g>
		{/each}
	</svg>

	<a
		href={imagery.mapUrl}
		target="_blank"
		rel="noreferrer"
		class="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-surface-raised/90 px-2.5 py-1.5 text-xs font-medium text-text-primary backdrop-blur transition-colors hover:bg-surface-raised"
	>
		Buka peta satelit
		<IconExternalLink class="size-3" aria-hidden="true" />
	</a>
</figure>
