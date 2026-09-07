<script lang="ts" generics="TValue extends string">
	interface TabItem {
		value: TValue;
		label: string;
	}

	interface Props {
		/** Dipakai sebagai awalan id `tab`/`panel` agar `aria-controls` unik. */
		idPrefix: string;
		ariaLabel: string;
		items: TabItem[];
		activeValue: TValue;
		onChange: (value: TValue) => void;
		class?: string;
	}

	/**
	 * Tab bergaya segmented control. Tanpa bayangan: tab aktif dibedakan lewat
	 * isian terang dan border, bukan elevasi.
	 *
	 * Panel isinya dirender pemanggil, dengan `id="{idPrefix}-panel-{value}"` dan
	 * `aria-labelledby="{idPrefix}-tab-{value}"` supaya hubungan tab-panelnya
	 * terbaca pembaca layar.
	 */
	let {
		idPrefix,
		ariaLabel,
		items,
		activeValue,
		onChange,
		class: className = ''
	}: Props = $props();
</script>

<div
	role="tablist"
	aria-label={ariaLabel}
	class={`grid w-full grid-cols-1 gap-1 rounded-lg bg-surface-overlay p-1 sm:w-fit sm:auto-cols-fr sm:grid-flow-col ${className}`}
>
	{#each items as item (item.value)}
		{@const isActive = item.value === activeValue}
		<button
			id={`${idPrefix}-tab-${item.value}`}
			type="button"
			role="tab"
			aria-selected={isActive}
			aria-controls={`${idPrefix}-panel-${item.value}`}
			onclick={() => onChange(item.value)}
			class={`inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-3.5 text-sm whitespace-nowrap transition-colors ${
				isActive
					? 'border border-border-subtle bg-surface-raised font-semibold text-brand-primary-strong'
					: 'border border-transparent font-medium text-text-subtle hover:text-text-primary'
			}`}
		>
			{item.label}
		</button>
	{/each}
</div>
