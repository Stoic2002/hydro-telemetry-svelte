<script lang="ts">
	import IconExternalLink from '~icons/ph/arrow-square-out';
	import {
		HYDROLOGY_ZONES,
		HYDROLOGY_ZONE_PRESENTATION,
		projectDamAnchor,
		resolveDamZoneField,
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
	 * Arah arsiran dibedakan per zona, bukan 45° untuk semuanya. Di tempat dua
	 * zona bersinggungan, arah garis yang berbeda memisahkannya bahkan sebelum
	 * warnanya terbaca.
	 */
	const ZONE_HATCH_ANGLE: Record<HydrologyZone, number> = {
		upstream: 30,
		dam: 105,
		downstream: 150
	};

	/**
	 * Arsiran digambar pada intensitas keadaan tersorot, lalu diredam lewat
	 * `opacity` grup. Satu pengali menjaga tint dan garis arsiran bergerak
	 * bersama — kalau dipisah, keduanya cepat lepas sinkron saat disetel ulang.
	 */
	function fieldOpacity(isActive: boolean, isMuted: boolean): number {
		if (isActive) return 1;
		return isMuted ? 0.18 : 0.64;
	}

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

	const frame = $derived(imagery.frame);

	function projectAnchor(zone: HydrologyZone) {
		return projectDamAnchor(imagery.anchors[zone], frame);
	}

	function zoneField(zone: HydrologyZone) {
		return resolveDamZoneField(zone, imagery.anchors[zone], frame);
	}

	/**
	 * Batas zona sebagai daftar titik, dipakai dua kali: sebagai mask arsiran
	 * dan sebagai garis tepi. Elips diubah jadi poligon di sini supaya kedua
	 * bentuk zona ditangani satu jalur yang sama.
	 */
	function zoneOutline(zone: HydrologyZone): string {
		const shape = zoneField(zone);
		if (shape.kind === 'polygon') return shape.points;

		const radians = (shape.angle * Math.PI) / 180;
		const cos = Math.cos(radians);
		const sin = Math.sin(radians);

		return Array.from({ length: 72 }, (_, index) => {
			const t = (2 * Math.PI * index) / 72;
			const ex = shape.rx * Math.cos(t);
			const ey = shape.ry * Math.sin(t);
			return `${shape.cx + ex * cos - ey * sin},${shape.cy + ex * sin + ey * cos}`;
		}).join(' ');
	}

	const flowPoints = $derived(
		HYDROLOGY_ZONES.map((zone) => {
			const { x, y } = projectAnchor(zone);
			return `${x},${y}`;
		}).join(' ')
	);
</script>

<figure
	class="relative max-h-[480px] min-h-[220px] w-full overflow-hidden bg-[#0f172a]"
	style={`aspect-ratio: ${frame.width} / ${frame.height}`}
>
	<svg
		viewBox={`0 0 ${frame.width} ${frame.height}`}
		preserveAspectRatio="xMidYMid slice"
		role="group"
		aria-label={`Pemetaan hidrologi ${imagery.damName}`}
		class="absolute inset-0 h-full w-full"
	>
		<title>Pemetaan titik hulu, bendungan, dan hilir pada {imagery.damName}</title>

		<defs>
			<!--
				Garis alir diberi mata panah: tiga titik yang terhubung hanya
				menyatakan urutan, bukan ke arah mana air bergerak.
			-->
			<marker
				id="flow-arrow"
				viewBox="0 0 10 10"
				refX="8"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" fill="#ffffff" fill-opacity="0.85" />
			</marker>
			{#each HYDROLOGY_ZONES as zone (zone)}
				{@const accentColor = HYDROLOGY_ZONE_PRESENTATION[zone].accentColor}
				<!--
					Arsiran diagonal: pola garis terbaca di atas foto tanpa menutupi
					detail permukaannya seperti blok warna solid.
				-->
				<pattern
					id={`hatch-${zone}`}
					patternUnits="userSpaceOnUse"
					width="14"
					height="14"
					patternTransform={`rotate(${ZONE_HATCH_ANGLE[zone]})`}
				>
					<line x1="0" y1="0" x2="0" y2="14" stroke={accentColor} stroke-width="2" />
				</pattern>
				<mask id={`field-${zone}`}>
					<polygon points={zoneOutline(zone)} fill="#ffffff" />
				</mask>
			{/each}
		</defs>

		<image
			href={imagery.imageUrl}
			x="0"
			y="0"
			width={frame.width}
			height={frame.height}
			preserveAspectRatio="xMidYMid slice"
			onerror={onImageError}
		/>
		<rect
			width={frame.width}
			height={frame.height}
			fill="#020617"
			opacity="0.06"
			pointer-events="none"
		/>

		<!-- Arsiran zona berada di bawah penanda supaya nomor tetap terbaca. -->
		{#each HYDROLOGY_ZONES as zone (zone)}
			{@const isActive = activeZone === zone}
			{@const isMuted = activeZone !== null && !isActive}
			<g
				opacity={fieldOpacity(isActive, isMuted)}
				pointer-events="none"
				class="transition-opacity duration-200"
			>
				<!--
					Tint tipis di bawah arsiran: garis saja terlalu renggang untuk
					terbaca sebagai satu area pada citra yang ramai seperti ini.
				-->
				<rect
					width={frame.width}
					height={frame.height}
					fill={HYDROLOGY_ZONE_PRESENTATION[zone].accentColor}
					mask={`url(#field-${zone})`}
					opacity="0.23"
				/>
				<rect
					width={frame.width}
					height={frame.height}
					fill={`url(#hatch-${zone})`}
					mask={`url(#field-${zone})`}
					opacity="0.63"
				/>
				<!--
					Batas zona digambar sebagai garis putus-putus, bukan hanya
					dibiarkan memudar. Tanpa tepi yang tegas, arsiran di atas citra
					seramai ini terbaca sebagai noda cahaya, bukan sebagai wilayah.
				-->
				<polygon
					points={zoneOutline(zone)}
					fill="none"
					stroke={HYDROLOGY_ZONE_PRESENTATION[zone].accentColor}
					stroke-width="3"
					stroke-opacity="0.75"
					stroke-dasharray="16 12"
					stroke-linecap="round"
					vector-effect="non-scaling-stroke"
				/>
			</g>
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
			stroke-opacity="0.6"
			stroke-dasharray="14 10"
			stroke-linecap="round"
			marker-end="url(#flow-arrow)"
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
			{@const flip = anchor.x > frame.width * 0.7}
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
