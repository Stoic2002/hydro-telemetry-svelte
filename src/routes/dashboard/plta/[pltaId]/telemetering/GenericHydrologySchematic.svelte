<script lang="ts">
	/**
	 * Skema aliran generik. Ditampilkan ketika PLTA belum punya citra satelit
	 * bendungan, atau ketika citranya gagal dimuat — supaya operator tetap melihat
	 * urutan hulu → waduk → dam → powerhouse → hilir.
	 */
	let { plantName }: { plantName: string } = $props();
</script>

<article class="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
	<div class="border-b border-border-subtle px-5 py-4">
		<h3 class="card-title">Skema Hidrologi</h3>
	</div>

	<div class="overflow-x-auto">
		<div class="min-w-[860px] p-5">
			<svg
				viewBox="0 0 1040 280"
				class="h-[280px] w-full"
				role="img"
				aria-label={`Skema aliran hidrologi PLTA ${plantName}`}
			>
				<defs>
					<pattern id="schematic-grid" width="24" height="24" patternUnits="userSpaceOnUse">
						<path d="M24 0H0V24" fill="none" stroke="#e8e8e8" stroke-width="1" />
					</pattern>
					<marker
						id="schematic-arrow"
						markerWidth="10"
						markerHeight="10"
						refX="8"
						refY="3"
						orient="auto"
					>
						<path d="M0 0V6L9 3Z" fill="#0891b2" />
					</marker>
				</defs>

				<rect width="1040" height="280" rx="10" fill="#f9f9f9" />
				<rect width="1040" height="280" rx="10" fill="url(#schematic-grid)" />

				<path
					d="M106 168H266C322 168 342 207 408 207H483"
					fill="none"
					marker-end="url(#schematic-arrow)"
					stroke="#0891b2"
					stroke-linecap="round"
					stroke-width="8"
				/>
				<path
					d="M560 207H659"
					fill="none"
					marker-end="url(#schematic-arrow)"
					stroke="#0891b2"
					stroke-linecap="round"
					stroke-width="8"
				/>
				<path
					d="M744 207H939"
					fill="none"
					marker-end="url(#schematic-arrow)"
					stroke="#0891b2"
					stroke-linecap="round"
					stroke-width="8"
				/>

				<g>
					<rect
						x="45"
						y="87"
						width="150"
						height="82"
						rx="10"
						fill="#ffffff"
						stroke="#c7c7c7"
						stroke-width="2"
					/>
					<text
						x="120"
						y="117"
						text-anchor="middle"
						fill="#131313"
						font-size="14"
						font-weight="700"
					>
						HULU
					</text>
					<text x="120" y="140" text-anchor="middle" fill="#6e6e6e" font-size="11">
						Catchment &amp; inflow
					</text>
				</g>

				<g>
					<path
						d="M290 109C328 83 368 84 402 101C438 119 464 96 503 107V205H290Z"
						fill="#cffafe"
						stroke="#0891b2"
						stroke-width="2"
					/>
					<text
						x="397"
						y="145"
						text-anchor="middle"
						fill="#131313"
						font-size="14"
						font-weight="700"
					>
						WADUK
					</text>
					<text x="397" y="167" text-anchor="middle" fill="#6e6e6e" font-size="11">{plantName}</text
					>
				</g>

				<g>
					<path d="M518 72H552L573 220H532Z" fill="#e8e8e8" stroke="#6e6e6e" stroke-width="2" />
					<text x="546" y="51" text-anchor="middle" fill="#131313" font-size="14" font-weight="700">
						DAM
					</text>
					<text x="546" y="239" text-anchor="middle" fill="#6e6e6e" font-size="11">Spillway</text>
				</g>

				<g>
					<rect
						x="630"
						y="106"
						width="145"
						height="100"
						rx="10"
						fill="#ffffff"
						stroke="#c7c7c7"
						stroke-width="2"
					/>
					<circle cx="702" cy="143" r="18" fill="#ecfeff" stroke="#0891b2" stroke-width="2" />
					<path d="M702 129V157M688 143H716" stroke="#0891b2" stroke-width="2" />
					<text
						x="702"
						y="182"
						text-anchor="middle"
						fill="#131313"
						font-size="13"
						font-weight="700"
					>
						POWERHOUSE
					</text>
				</g>

				<g>
					<rect
						x="845"
						y="87"
						width="150"
						height="82"
						rx="10"
						fill="#ffffff"
						stroke="#c7c7c7"
						stroke-width="2"
					/>
					<text
						x="920"
						y="117"
						text-anchor="middle"
						fill="#131313"
						font-size="14"
						font-weight="700"
					>
						HILIR
					</text>
					<text x="920" y="140" text-anchor="middle" fill="#6e6e6e" font-size="11">
						Tailrace &amp; downstream
					</text>
				</g>

				<text x="221" y="157" text-anchor="middle" fill="#6e6e6e" font-size="10">Inflow</text>
				<text x="610" y="196" text-anchor="middle" fill="#6e6e6e" font-size="10">Debit turbin</text>
				<text x="806" y="196" text-anchor="middle" fill="#6e6e6e" font-size="10">Outflow</text>
			</svg>
		</div>
	</div>
</article>
