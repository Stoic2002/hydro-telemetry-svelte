<script lang="ts" module>
	export type BadgeTone = 'cyan' | 'amber' | 'green' | 'red' | 'slate';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone: BadgeTone;
		mono?: boolean;
		/** Menampilkan cincin berputar di depan label — dipakai untuk status "Diproses" */
		spinning?: boolean;
		icon?: Snippet;
		children: Snippet;
		class?: string;
	}

	let {
		tone,
		mono = false,
		spinning = false,
		icon,
		children,
		class: className = ''
	}: Props = $props();

	const TONE_CLASSES: Record<BadgeTone, string> = {
		cyan: 'bg-brand-tint text-brand-primary-pressed',
		amber: 'bg-status-warning-soft text-status-warning-strong',
		green: 'bg-status-success-soft text-status-success-strong',
		red: 'bg-status-danger-soft text-status-danger-strong',
		slate: 'bg-surface-overlay text-text-subtle'
	};

	/**
	 * Cincin berputar mewarisi warna teks badge (`currentColor`), jadi setiap
	 * nada otomatis cocok — dulu lima kelas palet mentah per nada.
	 */
	const SPINNER_CLASS = 'border-current border-r-transparent opacity-70';
</script>

<span
	class={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
		mono ? 'font-mono text-[10.5px]' : 'font-sans'
	} ${TONE_CLASSES[tone]} ${className}`}
>
	{#if spinning}
		<span
			aria-hidden="true"
			class={`size-[11px] shrink-0 animate-spin rounded-full border-[1.5px] ${SPINNER_CLASS}`}
		></span>
	{:else if icon}
		<span class="shrink-0">{@render icon()}</span>
	{/if}
	{@render children()}
</span>
