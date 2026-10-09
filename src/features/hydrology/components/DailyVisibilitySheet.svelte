<script lang="ts">
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/controls/Button.svelte';
	import StatusToggle from '$components/controls/StatusToggle.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import SortableList from '$components/ui/SortableList.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createDailyVisibilityQuery, createSetDailyVisibilityMutation } from '../api/queries';
	import {
		DAILY_PANEL_LABEL,
		panelOrderChanges,
		resolvePanelOrder,
		visibilityChanges,
		type PanelOrderDraft
	} from '../daily-visibility';
	import type { DailyReportPanel } from '../model';
	import { getHydrologyErrorMessage } from '../error';

	interface Props {
		isOpen: boolean;
		pltaId: string;
		plantName: string;
		/** Panel yang diatur; sheet dibuka dari ikon di sebelah judul kartunya. */
		panel: DailyReportPanel;
		onClose: () => void;
	}

	let { isOpen, pltaId, plantName, panel, onClose }: Props = $props();

	/**
	 * Tata letak SATU panel harian untuk satu PLTA: metrik mana yang ditampilkan
	 * — mis. pH hulu di PLTA yang tidak punya sensornya — dan urutannya.
	 * Metrik tersembunyi tetap dikirim server; halaman harian yang tidak
	 * menampilkannya. Berlaku untuk semua pengguna PLTA ini.
	 *
	 * Daftarnya diambil utuh (endpoint-nya per PLTA), lalu disaring ke panel
	 * ini; perubahan yang dikirim pun hanya milik panel ini.
	 */
	const visibilityQuery = createDailyVisibilityQuery(
		() => pltaId,
		() => isOpen
	);
	const saveMutation = createSetDailyVisibilityMutation();

	const metrics = $derived(
		(visibilityQuery.data?.metrics ?? []).filter((metric) => metric.panel === panel)
	);
	const panelLabel = $derived(DAILY_PANEL_LABEL[panel]);

	// Draf hanya memuat sakelar yang DISENTUH operator; selebihnya dibaca dari
	// data server. Menyalin seluruh status ke draf akan membekukannya: query
	// ini di bawah `dashboardRoot`, dan bila data yang datang kemudian membawa
	// perubahan operator lain, simpan berikutnya diam-diam membatalkannya.
	let draft = $state<Record<string, boolean>>({});
	// Sama untuk urutan: hanya panel yang diseret (atau diminta kembali ke
	// bawaan) yang punya entri.
	let orderDraft = $state<PanelOrderDraft>({});

	// Membuka sheet untuk PLTA atau panel lain tidak membawa pilihan yang belum
	// disimpan.
	$effect(() => {
		void pltaId;
		void panel;
		draft = {};
		orderDraft = {};
	});

	function isHiddenInDraft(key: string, saved: boolean): boolean {
		return draft[key] ?? saved;
	}

	const hiddenChanges = $derived(visibilityChanges(metrics, draft));
	const orderChanges = $derived(panelOrderChanges(metrics, orderDraft));
	const changeCount = $derived(
		Object.keys(hiddenChanges).length + Object.keys(orderChanges).length
	);
	const hiddenInDraft = $derived(
		metrics.filter((metric) => isHiddenInDraft(metric.key, metric.hidden)).length
	);
	const isPending = $derived(saveMutation.isPending);

	function setHidden(key: string, hidden: boolean) {
		draft = { ...draft, [key]: hidden };
	}

	const orderedMetrics = $derived.by(() => {
		const byKey = new Map(metrics.map((metric) => [metric.key, metric]));
		return resolvePanelOrder(
			metrics.map((metric) => metric.key),
			orderDraft[panel]
		).flatMap((key) => byKey.get(key) ?? []);
	});
	const isResetPending = $derived(orderDraft[panel] === null);
	const canReset = $derived(
		!isResetPending &&
			(Array.isArray(orderDraft[panel]) || metrics.some((metric) => metric.isCustomOrder))
	);

	function setPanelOrder(keys: string[]) {
		orderDraft = { [panel]: keys };
	}

	function discardPanelOrder() {
		orderDraft = {};
	}

	/**
	 * Urutan yang pernah diatur di server dikembalikan lewat permintaan simpan
	 * (`[]`); urutan yang baru diseret dan belum disimpan cukup dibuang.
	 */
	function resetPanelOrder() {
		if (metrics.some((metric) => metric.isCustomOrder)) {
			orderDraft = { [panel]: null };
		} else {
			discardPanelOrder();
		}
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (changeCount === 0) return;

		try {
			await saveMutation.mutateAsync({
				pltaId,
				changes: { hidden: hiddenChanges, order: orderChanges }
			});
			notificationStore.addToast({
				type: 'success',
				message: `Tampilan ${panelLabel} PLTA ${plantName} diperbarui`
			});
			onClose();
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getHydrologyErrorMessage(error) });
		}
	}
</script>

<Sheet {isOpen} title={`Atur tampilan ${panelLabel}`} isDismissible={!isPending} {onClose}>
	{#snippet description()}
		Pilih metrik panel {panelLabel} PLTA {plantName} yang ditampilkan, dan seret barisnya untuk mengubah
		urutan. Berlaku untuk semua pengguna PLTA ini.
	{/snippet}

	{#if visibilityQuery.isPending}
		<p class="loading-text py-4" role="status">Memuat daftar metrik…</p>
	{:else if visibilityQuery.isError}
		<Banner tone="warning" title="Daftar metrik belum dapat dimuat">
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
				{getHydrologyErrorMessage(visibilityQuery.error)}
				<button
					type="button"
					onclick={() => void visibilityQuery.refetch()}
					class="inline-flex cursor-pointer items-center gap-1 font-medium underline underline-offset-2"
				>
					<IconRefresh class="size-3" />
					Coba lagi
				</button>
			</span>
		</Banner>
	{:else}
		<form id="daily-visibility-form" onsubmit={save} class="flex flex-col gap-6">
			<div class="flex flex-col gap-2">
				<div class="flex items-baseline justify-between gap-3">
					<p class="text-xs text-text-muted" role="status">
						{hiddenInDraft} dari {metrics.length} metrik disembunyikan
					</p>
					{#if canReset}
						<button
							type="button"
							disabled={isPending}
							onclick={resetPanelOrder}
							class="cursor-pointer text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed disabled:cursor-not-allowed disabled:opacity-50"
						>
							Urutan bawaan
						</button>
					{/if}
				</div>
				{#if isResetPending}
					<p class="flex flex-wrap items-baseline gap-x-2 text-xs text-text-muted">
						Urutan bawaan dipakai lagi setelah disimpan.
						<button
							type="button"
							disabled={isPending}
							onclick={discardPanelOrder}
							class="cursor-pointer font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
						>
							Batalkan
						</button>
					</p>
				{/if}
				<SortableList
					ariaLabel={`Urutan metrik ${panelLabel}`}
					items={orderedMetrics}
					getKey={(metric) => metric.key}
					getLabel={(metric) => metric.label}
					disabled={isPending || isResetPending}
					onReorder={setPanelOrder}
				>
					{#snippet row(metric)}
						<StatusToggle
							label={metric.label}
							activeLabel="Tampil"
							align="stretch"
							inactiveLabel="Sembunyi"
							isActive={!isHiddenInDraft(metric.key, metric.hidden)}
							disabled={isPending}
							onChange={(visible) => setHidden(metric.key, !visible)}
						/>
					{/snippet}
				</SortableList>
			</div>
		</form>
	{/if}

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
				form="daily-visibility-form"
				isLoading={isPending}
				disabled={changeCount === 0 || !visibilityQuery.isSuccess}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconSave class="size-4" />{/snippet}
				{isPending ? 'Menyimpan…' : changeCount > 0 ? `Simpan (${changeCount})` : 'Simpan'}
			</Button>
		</div>
	{/snippet}
</Sheet>
