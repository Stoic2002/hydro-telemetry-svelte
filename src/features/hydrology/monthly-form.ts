import type { UpsertMonthlyHydrologyInput } from './model';

/**
 * Isian form hidrologi bulanan.
 *
 * Field energi bertipe `number | null`, bukan string, karena itulah yang
 * dikembalikan `bind:value` pada `<input type="number">` — angka saat terisi,
 * `null` saat dikosongkan. Menyimpannya sebagai string pernah membuat
 * penyusunan payload melempar `TypeError` dan tombol Simpan diam saja.
 */
export interface MonthlyHydrologyFormValues {
	hydrologyPrediction: string;
	hydrologyActual: string;
	predictedProductionMwh: number | null;
	targetProductionMwh: number | null;
	previousAchievementMwh: number | null;
	predictedPreviousAchievementMwh: number | null;
	targetPreviousAchievementMwh: number | null;
}

export function createEmptyMonthlyForm(): MonthlyHydrologyFormValues {
	return {
		hydrologyPrediction: '',
		hydrologyActual: '',
		predictedProductionMwh: null,
		targetProductionMwh: null,
		previousAchievementMwh: null,
		predictedPreviousAchievementMwh: null,
		targetPreviousAchievementMwh: null
	};
}

function optionalText(value: string): string | undefined {
	return value.trim() || undefined;
}

function optionalNumber(value: number | null): number | undefined {
	return value === null || !Number.isFinite(value) ? undefined : value;
}

export type MonthlyHydrologyPayload = Omit<
	UpsertMonthlyHydrologyInput,
	'pltaId' | 'year' | 'month'
>;

/**
 * Field kosong dibuang, bukan dikirim sebagai null: server melakukan upsert
 * parsial, jadi mengirim null akan menghapus nilai yang sudah tersimpan.
 */
export function buildMonthlyHydrologyPayload(
	values: MonthlyHydrologyFormValues
): MonthlyHydrologyPayload {
	return {
		hydrologyPrediction: optionalText(values.hydrologyPrediction),
		hydrologyActual: optionalText(values.hydrologyActual),
		predictedProductionMwh: optionalNumber(values.predictedProductionMwh),
		targetProductionMwh: optionalNumber(values.targetProductionMwh),
		previousAchievementMwh: optionalNumber(values.previousAchievementMwh),
		predictedPreviousAchievementMwh: optionalNumber(values.predictedPreviousAchievementMwh),
		targetPreviousAchievementMwh: optionalNumber(values.targetPreviousAchievementMwh)
	};
}

/** Kiriman tanpa satu pun nilai akan menimpa seluruh data dengan "tidak ada". */
export function isEmptyMonthlyHydrologyPayload(payload: MonthlyHydrologyPayload): boolean {
	return Object.values(payload).every((value) => value === undefined);
}
