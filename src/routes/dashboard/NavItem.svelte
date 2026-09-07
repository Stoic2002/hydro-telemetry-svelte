<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { isNavActive } from './nav-active';

	interface Props {
		href: string;
		icon: Snippet;
		label: string;
		collapsed: boolean;
		end?: boolean;
	}

	let { href, icon, label, collapsed, end = false }: Props = $props();

	const isActive = $derived(isNavActive(page.url.pathname, href, end));
</script>

<a
	{href}
	aria-current={isActive ? 'page' : undefined}
	title={collapsed ? label : undefined}
	class={`flex items-center gap-2.5 overflow-hidden rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-[0.12s] ${
		isActive ? 'bg-surface-overlay' : 'hover:bg-surface-overlay'
	} ${collapsed ? 'justify-center px-0 py-2' : ''}`}
>
	<span aria-hidden="true" class={`shrink-0 ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
		{@render icon()}
	</span>
	{#if !collapsed}
		<span
			class={`font-sans text-sm ${
				isActive ? 'font-medium text-text-primary' : 'text-text-secondary'
			}`}
		>
			{label}
		</span>
	{/if}
</a>
