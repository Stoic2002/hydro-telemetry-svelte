<script lang="ts">
	import { page } from '$app/state';
	import { isNavActive } from './nav-active';

	interface Props {
		href: string;
		label: string;
		/** Panel mengambang tidak perlu indentasi — tidak ada induk di atasnya. */
		inFlyout?: boolean;
		onNavigate?: () => void;
	}

	let { href, label, inFlyout = false, onNavigate }: Props = $props();

	const isActive = $derived(isNavActive(page.url.pathname, href));
</script>

<a
	{href}
	onclick={onNavigate}
	aria-current={isActive ? 'page' : undefined}
	class={`flex h-9 items-center rounded-full pr-3 text-sm whitespace-nowrap transition-colors ${
		inFlyout ? 'px-3' : 'pl-[42px]'
	} ${
		isActive
			? 'bg-surface-overlay font-medium text-text-primary'
			: 'text-text-secondary hover:bg-surface-overlay'
	}`}
>
	{label}
</a>
