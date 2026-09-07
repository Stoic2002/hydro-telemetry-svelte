<script lang="ts" module>
	export type BannerTone = 'info' | 'warning' | 'danger' | 'success';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone: BannerTone;
		/** Judul singkat; isi banner masuk ke `children` sebagai kalimat penjelas. */
		title?: string;
		children: Snippet;
		/** Mengganti penanda bulat bawaan, misalnya dengan ikon. */
		icon?: Snippet;
		class?: string;
	}

	let { tone, title, children, icon, class: className = '' }: Props = $props();

	const TONE_CONFIG: Record<
		BannerTone,
		{ container: string; marker: string; title: string; body: string }
	> = {
		info: {
			container: 'border-status-info/25 bg-status-info-soft',
			marker: 'bg-status-info text-white',
			title: 'text-status-info',
			body: 'text-status-info'
		},
		warning: {
			container: 'border-status-warning-strong/25 bg-status-warning-soft',
			marker: 'bg-status-warning-strong text-white',
			title: 'text-status-warning-strong',
			body: 'text-status-warning-strong'
		},
		danger: {
			container: 'border-status-danger-strong/25 bg-status-danger-soft',
			marker: 'bg-status-danger-strong text-white',
			title: 'text-status-danger-strong',
			body: 'text-status-danger-strong'
		},
		success: {
			container: 'border-status-success-strong/25 bg-status-success-soft',
			marker: 'bg-status-success-strong text-white',
			title: 'text-status-success-strong',
			body: 'text-status-success-strong'
		}
	};

	const config = $derived(TONE_CONFIG[tone]);
</script>

<div
	role={tone === 'danger' ? 'alert' : undefined}
	class={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 ${config.container} ${className}`}
>
	<span
		aria-hidden="true"
		class={`mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold ${config.marker}`}
	>
		{#if icon}{@render icon()}{:else}!{/if}
	</span>
	<div class="min-w-0 flex-1">
		{#if title}
			<p class={`text-sm font-medium ${config.title}`}>{title}</p>
		{/if}
		<div class={`${title ? 'mt-0.5' : ''} text-sm leading-relaxed ${config.body}`}>
			{@render children()}
		</div>
	</div>
</div>
