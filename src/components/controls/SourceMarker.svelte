<script lang="ts" module>
	export type SourceMarkerType =
		'api' | 'formula' | 'input' | 'constant' | 'constant-input' | 'unavailable';

	/**
	 * Penanda sumber data memakai dua kode sekaligus: bentuk (terbaca tanpa warna)
	 * dan warna. Ditempel setelah label parameter, tidak pernah menyentuh angkanya.
	 */
	export const SHAPE_CLASSES: Record<SourceMarkerType, string> = {
		api: 'size-[7px] rounded-full bg-brand-primary-strong',
		formula: 'size-[7px] rounded-full border-[1.5px] border-violet-600',
		input: 'size-[7px] bg-amber-600',
		constant: 'size-[7px] rotate-45 bg-text-muted',
		// Dua kode dibaca terpisah: bentuk belah ketupat tetap berarti konstanta,
		// warna amber berarti nilainya diisi operator. Jadi konstanta yang bisa
		// diunggah tidak perlu penanda ketiga yang harus dihafal.
		'constant-input': 'size-[7px] rotate-45 bg-amber-600',
		unavailable: 'h-[1.5px] w-[7px] bg-text-placeholder'
	};

	export const LABEL_CLASSES: Record<SourceMarkerType, string> = {
		api: 'text-cyan-700',
		formula: 'text-violet-700',
		input: 'text-amber-700',
		constant: 'text-text-subtle',
		'constant-input': 'text-amber-700',
		unavailable: 'text-text-muted'
	};

	export const SOURCE_MARKER_LABEL: Record<SourceMarkerType, string> = {
		api: 'Realtime',
		formula: 'Formulasi',
		input: 'Input',
		constant: 'Konstanta',
		'constant-input': 'Konstanta (input)',
		unavailable: 'Belum tersedia'
	};
</script>

<script lang="ts">
	let { type, class: className = '' }: { type: SourceMarkerType; class?: string } = $props();
</script>

<span aria-hidden="true" class={`shrink-0 ${SHAPE_CLASSES[type]} ${className}`}></span>
