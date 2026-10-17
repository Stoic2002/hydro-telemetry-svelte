<script lang="ts">
	import IconRefresh from '~icons/ph/arrow-clockwise';
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import StatusToggle from '$components/controls/StatusToggle.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import SortableList from '$components/ui/SortableList.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import {
		createDailyVisibilityQuery,
		createSetDailyLabelsMutation,
		createSetDailyVisibilityMutation
	} from '../api/queries';
	import { LABEL_MAX_LENGTH, labelChanges } from '../labels';
	import {
		DAILY_PANEL_LABEL,
		panelOrderChanges,
		resolvePanelOrder,
		visibilityChanges,
		type PanelOrderDraft
	} from '../daily-visibility';
	import type { DailyReportPanel } from '../model';
	import { getHydrologyErrorMessage, getLabelErrorDetail } from '../error';

	interface Props {
		isOpen: boolean;
		pltaId: string;
		plantName: string;
		/** Panel yang diatur; sheet dibuka dari ikon di sebelah judul kartunya. */
		panel: DailyReportPanel;
		/**
		 * Admin juga bisa mengganti nama metrik (`PUT …/daily/labels`). Tata
		 * letak terbuka untuk operator, ganti nama khusus admin — jadi isiannya
		 * hanya dirender untuk admin.
		 */
		canRename?: boolean;
		onClose: () => void;
	}

	let { isOpen, pltaId, plantName, panel, canRename = false, onClose }: Props = $props();

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
	const labelsMutation = createSetDailyLabelsMutation();

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
		labelDraft = {};
		labelProblems = null;
	});

	function isHiddenInDraft(key: string, saved: boolean): boolean {
		return draft[key] ?? saved;
	}

	/** Hanya isian nama yang disentuh admin (lihat `labelChanges`). */
	let labelDraft = $state<Record<string, string>>({});
	let labelProblems = $state<{ message: string; problems: string[] } | null>(null);

	const hiddenChanges = $derived(visibilityChanges(metrics, draft));
	const orderChanges = $derived(panelOrderChanges(metrics, orderDraft));
	const nameChanges = $derived(
		canRename
			? labelChanges(
					metrics.map((metric) => ({
						key: metric.key,
						label: metric.label,
						isCustom: metric.isLabelCustom
					})),
					labelDraft
				)
			: {}
	);
	const layoutChangeCount = $derived(
		Object.keys(hiddenChanges).length + Object.keys(orderChanges).length
	);
	const changeCount = $derived(layoutChangeCount + Object.keys(nameChanges).length);

	function labelInputValue(key: string, label: string, isCustom: boolean): string {
		return labelDraft[key] ?? (isCustom ? label : '');
	}
	const hiddenInDraft = $derived(
		metrics.filter((metric) => isHiddenInDraft(metric.key, metric.hidden)).length
	);
	const isPending = $derived(saveMutation.isPending || labelsMutation.isPending);

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
		labelProblems = null;

		// Dua permintaan terpisah (tata letak dan nama punya endpoint dan hak
		// akses sendiri). Tata letak lebih dulu; bila nama ditolak, tata letak
		// yang sudah tersimpan tetap berlaku dan sheet tetap terbuka.
		try {
			if (layoutChangeCount > 0) {
				await saveMutation.mutateAsync({
					pltaId,
					changes: { hidden: hiddenChanges, order: orderChanges }
				});
				draft = {};
				orderDraft = {};
			}
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getHydrologyErrorMessage(error) });
			return;
		}

		try {
			if (Object.keys(nameChanges).length > 0) {
				await labelsMutation.mutateAsync({ pltaId, labels: nameChanges });
			}
		} catch (error) {
			labelProblems = getLabelErrorDetail(error);
			return;
		}

		notificationStore.addToast({
			type: 'success',
			message: `Tampilan ${panelLabel} PLTA ${plantName} diperbarui`
		});
		onClose();
	}
</script>

<Sheet
	{isOpen}
	title={`Atur tampilan ${panelLabel}`}
	isDismissible={!isPending}
	isDirty={changeCount > 0}
	{onClose}
>
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
			{#if labelProblems}
				<Banner tone="danger" title={labelProblems.message}>
					{#if labelProblems.problems.length > 0}
						<ul class="list-disc pl-4">
							{#each labelProblems.problems as problem (problem)}<li>{problem}</li>{/each}
						</ul>
					{/if}
					Nama belum tersimpan; perubahan tampil/urutan sudah tersimpan.
				</Banner>
			{/if}
			{#if canRename}
				<p class="text-xs text-text-muted">
					Isi nama untuk mengganti nama metrik di PLTA ini; kosongkan untuk kembali ke nama bawaan.
				</p>
			{/if}
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
						<div class="flex min-w-0 flex-1 flex-col gap-1.5">
							<StatusToggle
								label={metric.label}
								activeLabel="Tampil"
								align="stretch"
								inactiveLabel="Sembunyi"
								isActive={!isHiddenInDraft(metric.key, metric.hidden)}
								disabled={isPending}
								onChange={(visible) => setHidden(metric.key, !visible)}
							/>
							{#if canRename}
								<Input
									size="sm"
									aria-label={`Nama tampilan ${metric.defaultLabel}`}
									placeholder={metric.defaultLabel}
									maxlength={LABEL_MAX_LENGTH}
									value={labelInputValue(metric.key, metric.label, metric.isLabelCustom)}
									disabled={isPending}
									oninput={(event) =>
										(labelDraft = { ...labelDraft, [metric.key]: event.currentTarget.value })}
								/>
							{/if}
						</div>
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
