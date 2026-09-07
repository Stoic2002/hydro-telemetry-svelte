<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className = '', ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div aria-hidden="true" class={`skeleton-shimmer ${className}`} {...rest}></div>
