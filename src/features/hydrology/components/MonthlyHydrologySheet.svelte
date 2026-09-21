<script lang="ts">
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createUpsertMonthlyHydrologyMutation } from '../api/queries';
	import { getHydrologyErrorMessage } from '../error';
	import type { MonthlyHydrology } from '../model';
	import {
		buildMonthlyHydrologyPayload,
		createEmptyMonthlyForm,
		isEmptyMonthlyHydrologyPayload,
		type MonthlyHydrologyFormValues
	} from '../monthly-form';

	interface Props {
		isOpen: boolean;
		pltaId: string;
		plantName: string;
		year: number;
		month: number;
		monthLabel: string;
		record?: MonthlyHydrology;
		onClose: () => void;
	}

	let { isOpen, pltaId, plantName, year, month, monthLabel, record, onClose }: Props = $props();

	const upsertMutation = createUpsertMonthlyHydrologyMutation();

	let values = $state<MonthlyHydrologyFormValues>(createEmptyMonthlyForm());

	// Panel dibuka ulang untuk periode berbeda; isian mengikuti data periode itu.
	$effect(() => {
		if (!isOpen) return;

		values = {
			hydrologyPrediction: record?.hydrologyPrediction ?? '',
			hydrologyActual: record?.hydrologyActual ?? '',
			predictedProductionMwh: record?.predictedProductionMwh ?? null,
			targetProductionMwh: record?.targetProductionMwh ?? null,
			previousAchievementMwh: record?.previousAchievementMwh ?? null,
			predictedPreviousAchievementMwh: record?.predictedPreviousAchievementMwh ?? null,
			targetPreviousAchievementMwh: record?.targetPreviousAchievementMwh ?? null
		};
	});

	const isPending = $derived(upsertMutation.isPending);

	async function submitHydrology(event: SubmitEvent) {
		event.preventDefault();

		const payload = buildMonthlyHydrologyPayload(values);

		if (isEmptyMonthlyHydrologyPayload(payload)) {
			notificationStore.addToast({
				type: 'error',
				message: 'Isi minimal satu data hidrologi sebelum menyimpan'
			});
			return;
		}

		try {
			await upsertMutation.mutateAsync({ pltaId, year, month, ...payload });
			notificationStore.addToast({
				type: 'success',
				message: `Data hidrologi ${monthLabel} ${year} berhasil disimpan`
			});
			onClose();
		} catch (error) {
			notificationStore.addToast({ type: 'error', message: getHydrologyErrorMessage(error) });
		}
	}
</script>

<Sheet {isOpen} title="Input Hidrologi Bulanan" isDismissible={!isPending} {onClose}>
	{#snippet description()}
		Upsert parsial data {monthLabel}
		{year} untuk PLTA {plantName}.
	{/snippet}

	<form id="monthly-hydrology-form" onsubmit={submitHydrology} class="flex flex-col gap-6">
		<div class="border-b border-surface-overlay pb-5">
			<p class="text-xs font-medium text-brand-primary-pressed">Periode dan PLTA</p>
			<p class="mt-1 text-sm font-semibold text-text-strong">
				{monthLabel}
				{year} · PLTA {plantName}
			</p>
		</div>

		<section class="flex flex-col gap-4">
			<div>
				<h3 class="text-sm font-semibold text-text-strong">Kondisi hidrologi</h3>
				<p class="mt-1 text-xs text-text-muted">
					Field kosong tidak akan menimpa data yang sudah tersimpan.
				</p>
			</div>

			<label class="field-label flex flex-col gap-2">
				Prediksi Hidrologi
				<textarea
					bind:value={values.hydrologyPrediction}
					disabled={isPending}
					rows={3}
					placeholder="Contoh: Normal–Basah"
					class="field resize-y font-normal"></textarea>
			</label>

			<label class="field-label flex flex-col gap-2">
				Aktual Hidrologi
				<textarea
					bind:value={values.hydrologyActual}
					disabled={isPending}
					rows={3}
					placeholder="Masukkan kondisi aktual..."
					class="field resize-y font-normal"></textarea>
			</label>
		</section>

		<section class="flex flex-col gap-4 border-t border-surface-overlay pt-5">
			<div>
				<h3 class="text-sm font-semibold text-text-strong">Energi produksi</h3>
				<p class="mt-1 text-xs text-text-muted">Semua nilai menggunakan satuan MWh.</p>
			</div>

			<Input
				label="Prediksi Produksi"
				type="number"
				min="0"
				step="any"
				placeholder="0"
				disabled={isPending}
				bind:value={values.predictedProductionMwh}
			/>
			<Input
				label="Target Produksi"
				type="number"
				min="0"
				step="any"
				placeholder="0"
				disabled={isPending}
				bind:value={values.targetProductionMwh}
			/>
			<Input
				label="Pencapaian s.d. Bulan Sebelumnya"
				type="number"
				min="0"
				step="any"
				placeholder="0"
				disabled={isPending}
				bind:value={values.previousAchievementMwh}
			/>
			<Input
				label="Prediksi Pencapaian"
				type="number"
				min="0"
				step="any"
				placeholder="0"
				disabled={isPending}
				bind:value={values.predictedPreviousAchievementMwh}
			/>
			<Input
				label="Target Pencapaian"
				type="number"
				min="0"
				step="any"
				placeholder="0"
				disabled={isPending}
				bind:value={values.targetPreviousAchievementMwh}
			/>

			<p class="text-xs leading-5 text-text-muted">
				Persentase pencapaian dihitung otomatis oleh server.
			</p>
		</section>
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
				form="monthly-hydrology-form"
				isLoading={isPending}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconSave class="size-4" />{/snippet}
				{isPending ? 'Menyimpan…' : 'Simpan Data'}
			</Button>
		</div>
	{/snippet}
</Sheet>
