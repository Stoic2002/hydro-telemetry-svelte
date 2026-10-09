<script lang="ts">
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createUpdateTagBoundsMutation } from '../api/queries';
	import { getPLTAErrorMessage } from '../error';
	import type { PlantTag } from '../model';
	import { describeTagBounds, parseTagBounds } from '../tag-bounds';

	interface Props {
		isOpen: boolean;
		tag: PlantTag;
		onClose: () => void;
	}

	let { isOpen, tag, onClose }: Props = $props();

	/**
	 * Batas kelayakan satu tag. Disunting terpisah dari konfigurasi lain karena
	 * disetel sebagai tanggapan atas data yang baru terlihat keliru — bukan
	 * konfigurasi pemasangan. Kedua sisi selalu dikirim bersama: server
	 * menganggapnya satu rentang utuh.
	 */
	const updateMutation = createUpdateTagBoundsMutation();

	let min = $state<number | null>(null);
	let max = $state<number | null>(null);

	// Isian mengikuti tag yang sedang dibuka; membuka panel untuk tag lain tidak
	// boleh menampilkan angka tag sebelumnya.
	$effect(() => {
		if (!isOpen) return;
		min = tag.minValid;
		max = tag.maxValid;
	});

	const parsed = $derived(parseTagBounds(min, max));
	const isChanged = $derived(
		parsed.ok &&
			(parsed.bounds.minValid !== tag.minValid || parsed.bounds.maxValid !== tag.maxValid)
	);
	const isRemovingBounds = $derived(
		parsed.ok &&
			parsed.bounds.minValid === null &&
			parsed.bounds.maxValid === null &&
			describeTagBounds(tag) !== null
	);
	const isPending = $derived(updateMutation.isPending);
	const targetLabel = $derived(
		[tag.label ?? tag.parameter, tag.station].filter((part) => part).join(' · ')
	);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!parsed.ok || !isChanged) return;

		try {
			await updateMutation.mutateAsync({ tagId: tag.id, bounds: parsed.bounds });
			notificationStore.addToast({
				type: 'success',
				message: describeTagBounds(parsed.bounds)
					? `Batas valid ${targetLabel} disimpan`
					: `Batas valid ${targetLabel} dicabut`
			});
			onClose();
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getPLTAErrorMessage(error) });
		}
	}
</script>

<Sheet {isOpen} title="Batas valid tag" isDismissible={!isPending} {onClose}>
	{#snippet description()}
		Rentang pembacaan yang dianggap sah untuk tag ini.
	{/snippet}

	<form id="tag-bounds-form" onsubmit={save} class="flex flex-col gap-6">
		<div class="border-b border-surface-overlay pb-5">
			<p class="text-xs font-medium text-brand-primary-pressed">Tag</p>
			<p class="mt-1 text-sm font-semibold text-text-strong">{targetLabel}</p>
			<p class="mt-1 font-mono text-xs text-text-muted">
				{tag.parameter}{tag.station ? ` · ${tag.station}` : ''}{tag.unit ? ` · ${tag.unit}` : ''}
			</p>
			<p class="mt-2 text-xs text-text-muted">
				Batas tersimpan: {describeTagBounds(tag) ?? 'tanpa batas'}
			</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<Input
				label="Batas bawah"
				type="number"
				step="any"
				placeholder="Tanpa batas"
				disabled={isPending}
				bind:value={min}
			/>
			<Input
				label="Batas atas"
				type="number"
				step="any"
				placeholder="Tanpa batas"
				disabled={isPending}
				bind:value={max}
				error={parsed.ok ? undefined : parsed.message}
			/>
		</div>

		{#if isRemovingBounds}
			<Banner tone="warning" title="Pembatasan akan dicabut">
				Kedua batas kosong berarti tidak ada pembacaan yang ditandai di luar rentang untuk tag ini.
			</Banner>
		{/if}

		<Banner tone="info" title="Cara kerjanya">
			Pembacaan di luar rentang tetap disimpan apa adanya, tetapi ditandai tidak mungkin dan tidak
			ikut parameter turunan, agregat, maupun akurasi. Batas berlaku ke depan — pembacaan yang sudah
			tersimpan tidak dinilai ulang.
		</Banner>
	</form>

	{#snippet footer()}
		<div class="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
			<Button
				type="button"
				variant="ghost"
				disabled={isPending}
				onclick={onClose}
				class="w-full sm:w-auto"
			>
				Batal
			</Button>
			<Button
				type="submit"
				form="tag-bounds-form"
				isLoading={isPending}
				disabled={!parsed.ok || !isChanged}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconSave class="size-4" />{/snippet}
				{isPending ? 'Menyimpan…' : 'Simpan'}
			</Button>
		</div>
	{/snippet}
</Sheet>
