<script lang="ts">
	/**
	 * Shimmer selebar dan setinggi peta aslinya (`JavaMap`: `clamp(280px, 55vw,
	 * 560px)`), tanpa bingkai sendiri. Dulu kartu berbingkai dengan padding 20px
	 * dan shimmer di dalamnya, sehingga terbaca sebagai kotak di dalam kotak dan
	 * tidak memenuhi tempat peta (permintaan tim 12 Nov 2026).
	 */
</script>

<div
	role="status"
	aria-label="Memuat peta"
	class="skeleton-shimmer h-[clamp(280px,55vw,560px)] w-full rounded-xl"
>
	<span class="sr-only">Memuat peta...</span>
</div>
