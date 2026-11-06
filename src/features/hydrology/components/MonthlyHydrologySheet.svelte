<script lang="ts">
	import { untrack } from 'svelte';
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Select, { type SelectOption } from '$components/controls/Select.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import {
		createMonthlyConditionsQuery,
		createUpsertMonthlyHydrologyMutation
	} from '../api/queries';
	import { getHydrologyErrorMessage } from '../error';
	import type { MonthlyHydrology } from '../model';
	import {
		MONTHLY_HYDROLOGY_CONDITIONS,
		buildMonthlyHydrologyPayload,
		createEmptyMonthlyForm,
		isEmptyMonthlyHydrologyPayload,
		isLegacyHydrologyCondition,
		matchHydrologyCondition,
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
	const conditionsQuery = createMonthlyConditionsQuery();

	/** Dari server bila sudah termuat; cadangan statis bila belum atau gagal. */
	const conditions = $derived(conditionsQuery.data ?? MONTHLY_HYDROLOGY_CONDITIONS);

	/**
	 * "Belum diisi" bernilai `''`: untuk data yang sudah punya kondisi, memilihnya
	 * mengosongkan kondisi itu. Nilai lama di luar kelas (isian bebas sebelum
	 * 6 Nov 2026) tetap tampil sebagai opsi nonaktif supaya operator tahu apa
	 * yang tersimpan, tetapi tidak bisa dipilih ulang.
	 */
	function conditionOptions(current: string): SelectOption[] {
		const options: SelectOption[] = [
			{ value: '', label: 'Belum diisi' },
			...conditions.map((condition) => ({ value: condition, label: condition }))
		];
		if (isLegacyHydrologyCondition(current, conditions)) {
			options.push({ value: current, label: `${current} (bukan kelas baku)`, disabled: true });
		}
		return options;
	}

	function legacyHint(saved: string | null | undefined, current: string): string | undefined {
		if (!isLegacyHydrologyCondition(saved, conditions) || current !== saved?.trim()) {
			return undefined;
		}
		return `Tersimpan "${saved}", bukan salah satu kelas. Pilih kelas yang sesuai; bila dibiarkan, nilai ini tidak diubah.`;
	}

	let values = $state<MonthlyHydrologyFormValues>(createEmptyMonthlyForm());
	/** Isian saat panel dibuka, untuk mengenali perubahan yang belum disimpan. */
	let valuesBaseline = $state('');

	// Panel dibuka ulang untuk periode berbeda; isian mengikuti data periode itu.
	// Baseline diambil dari objek biasa `next`, bukan dari `values`: membaca
	// `values` sesudah menulisnya menjadikannya dependensi efek ini sendiri, dan
	// efek berputar tanpa henti (`effect_update_depth_exceeded`) — tombol
	// "Edit data" dulu membuat seluruh halaman gagal ditampilkan.
	//
	// Daftar kelas dibaca lewat `untrack`: kalau ia ikut jadi dependensi, daftar
	// dari server yang tiba sesudah panel terbuka akan menyetel ulang isian yang
	// sedang diketik operator.
	$effect(() => {
		if (!isOpen) return;

		const known = untrack(() => conditions);
		const toFormCondition = (saved: string | null | undefined) =>
			matchHydrologyCondition(saved, known) ?? saved?.trim() ?? '';
		const next: MonthlyHydrologyFormValues = {
			hydrologyPrediction: toFormCondition(record?.hydrologyPrediction),
			hydrologyActual: toFormCondition(record?.hydrologyActual),
			predictedProductionMwh: record?.predictedProductionMwh ?? null,
			targetProductionMwh: record?.targetProductionMwh ?? null,
			actualProductionMwh: record?.actualProductionMwh ?? null,
			predictedAccumulatedMwh: record?.predictedAccumulatedMwh ?? null,
			targetAccumulatedMwh: record?.targetAccumulatedMwh ?? null,
			actualAccumulatedMwh: record?.actualAccumulatedMwh ?? null
		};
		values = next;
		valuesBaseline = JSON.stringify(next);
	});

	const isPending = $derived(upsertMutation.isPending);
	const isDirty = $derived(JSON.stringify(values) !== valuesBaseline);

	async function submitHydrology(event: SubmitEvent) {
		event.preventDefault();

		const payload = buildMonthlyHydrologyPayload(values, {
			conditions,
			saved: {
				hydrologyPrediction: record?.hydrologyPrediction ?? null,
				hydrologyActual: record?.hydrologyActual ?? null
			}
		});

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

<Sheet {isOpen} title="Input Hidrologi Bulanan" isDismissible={!isPending} {isDirty} {onClose}>
	{#snippet description()}
		Isi atau ubah data {monthLabel}
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
					Pilih salah satu kelas. "Belum diisi" mengosongkan kondisi yang tersimpan; angka energi
					yang dikosongkan tidak menimpa data tersimpan.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<Select
					label="Prediksi Hidrologi"
					bind:value={values.hydrologyPrediction}
					options={conditionOptions(values.hydrologyPrediction)}
					disabled={isPending}
					helperText={legacyHint(record?.hydrologyPrediction, values.hydrologyPrediction)}
				/>
				<Select
					label="Realisasi Hidrologi"
					bind:value={values.hydrologyActual}
					options={conditionOptions(values.hydrologyActual)}
					disabled={isPending}
					helperText={legacyHint(record?.hydrologyActual, values.hydrologyActual)}
				/>
			</div>
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
