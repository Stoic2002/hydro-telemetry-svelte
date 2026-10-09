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

	type EnergyKey = Exclude<
		keyof MonthlyHydrologyFormValues,
		'hydrologyPrediction' | 'hydrologyActual'
	>;

	/**
	 * Urutan dan istilahnya sama dengan tabel di halaman: Target, Prediksi,
	 * Realisasi — operator mengisi persis seperti membacanya.
	 */
	const ENERGY_GROUPS: {
		title: string;
		description: string;
		fields: { key: EnergyKey; label: string }[];
	}[] = [
		{
			title: 'Energi bulan ini',
			description:
				'Semua nilai dalam MWh. Prognosa adalah ketersediaan energi primer; target dan realisasi adalah produksi energi listrik.',
			fields: [
				{ key: 'targetProductionMwh', label: 'Target Produksi Energi Listrik' },
				{ key: 'predictedProductionMwh', label: 'Prognosa Ketersediaan Energi Primer' },
				{ key: 'actualProductionMwh', label: 'Realisasi Produksi Energi Listrik' }
			]
		},
		{
			title: 'Energi akumulasi s.d. bulan ini',
			description: 'Akumulasi sampai bulan ini, dalam MWh.',
			fields: [
				{ key: 'targetAccumulatedMwh', label: 'Target Akumulasi Produksi Energi Listrik' },
				{ key: 'predictedAccumulatedMwh', label: 'Prognosa Akumulasi Ketersediaan Energi Primer' },
				{ key: 'actualAccumulatedMwh', label: 'Realisasi Akumulasi Produksi Energi Listrik' }
			]
		}
	];

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
			actualProductionMwh: record?.actualProductionMwh ?? null,
			predictedAccumulatedMwh: record?.predictedAccumulatedMwh ?? null,
			targetAccumulatedMwh: record?.targetAccumulatedMwh ?? null,
			actualAccumulatedMwh: record?.actualAccumulatedMwh ?? null
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
				Realisasi Hidrologi
				<textarea
					bind:value={values.hydrologyActual}
					disabled={isPending}
					rows={3}
					placeholder="Masukkan kondisi realisasi..."
					class="field resize-y font-normal"></textarea>
			</label>
		</section>

		{#each ENERGY_GROUPS as group (group.title)}
			<section class="flex flex-col gap-4 border-t border-surface-overlay pt-5">
				<div>
					<h3 class="text-sm font-semibold text-text-strong">{group.title}</h3>
					<p class="mt-1 text-xs text-text-muted">{group.description}</p>
				</div>

				{#each group.fields as field (field.key)}
					<Input
						label={field.label}
						type="number"
						min="0"
						step="any"
						placeholder="0"
						disabled={isPending}
						bind:value={values[field.key]}
					/>
				{/each}
			</section>
		{/each}

		<p class="text-xs leading-5 text-text-muted">
			Prognosa pencapaian dan kesimpulannya (Tercapai / Belum tercapai) dihitung otomatis oleh
			server.
		</p>
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
