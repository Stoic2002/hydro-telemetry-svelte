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
	actualProductionMwh: number | null;
	predictedAccumulatedMwh: number | null;
	targetAccumulatedMwh: number | null;
	actualAccumulatedMwh: number | null;
}

/**
 * Kelas kondisi hidrologi, urut dari terkering ke terbasah. Sumber
 * kebenarannya `GET /hydrology/monthly/kondisi`; daftar ini hanya cadangan
 * selama daftar dari server belum termuat atau gagal dimuat (Swagger 6 Nov 2026).
 */
export const MONTHLY_HYDROLOGY_CONDITIONS: readonly string[] = [
	'Kering',
	'Normal Kering',
	'Normal',
	'Normal Basah',
	'Basah'
];

/**
 * Bentuk baku dari `value` bila ia salah satu kelas, tanpa peduli huruf besar
 * kecil — server menerima `basah` dan menyimpannya sebagai `Basah`. `null`
 * bila kosong atau bukan kelas yang sah (mis. isian bebas sebelum 6 Nov 2026).
 */
export function matchHydrologyCondition(
	value: string | null | undefined,
	conditions: readonly string[]
): string | null {
	const normalized = value?.trim().toLowerCase();
	if (!normalized) return null;
	return conditions.find((condition) => condition.toLowerCase() === normalized) ?? null;
}

/**
 * Isian kondisi yang tersimpan tetapi bukan kelas sah. Ia tidak boleh dikirim
 * ulang apa adanya — server menolaknya `422` dan seluruh isian ikut gagal.
 */
export function isLegacyHydrologyCondition(
	value: string | null | undefined,
	conditions: readonly string[]
): boolean {
	return Boolean(value?.trim()) && matchHydrologyCondition(value, conditions) === null;
}

export interface MonthlyHydrologyPayloadContext {
	/** Kelas yang sah; bawaannya `MONTHLY_HYDROLOGY_CONDITIONS`. */
	conditions?: readonly string[];
	/** Kondisi tersimpan, untuk membedakan "kosongkan" dari "biarkan". */
	saved?: { hydrologyPrediction: string | null; hydrologyActual: string | null };
}

/**
 * - kosong + ada isian tersimpan → `''`, yang oleh server berarti kosongkan;
 * - kosong + tidak ada isian tersimpan → tidak dikirim;
 * - kelas sah (huruf apa pun) → bentuk bakunya;
 * - nilai lama di luar kelas yang tidak disentuh → tidak dikirim, supaya
 *   simpan bidang lain tidak ikut ditolak.
 */
function conditionPayload(
	value: string,
	saved: string | null | undefined,
	conditions: readonly string[]
): string | undefined {
	if (!value.trim()) return saved?.trim() ? '' : undefined;
	return matchHydrologyCondition(value, conditions) ?? undefined;
}

export function createEmptyMonthlyForm(): MonthlyHydrologyFormValues {
	return {
		hydrologyPrediction: '',
		hydrologyActual: '',
		predictedProductionMwh: null,
		targetProductionMwh: null,
		actualProductionMwh: null,
		predictedAccumulatedMwh: null,
		targetAccumulatedMwh: null,
		actualAccumulatedMwh: null
	};
}

function optionalNumber(value: number | null): number | undefined {
	return value === null || !Number.isFinite(value) ? undefined : value;
}

export type MonthlyHydrologyPayload = Omit<
	UpsertMonthlyHydrologyInput,
	'pltaId' | 'year' | 'month'
>;

/**
 * Field angka yang kosong dibuang, bukan dikirim sebagai null. Server melakukan
 * upsert parsial — field yang tidak dikirim atau `null` tidak menimpa nilai
 * tersimpan — sehingga mengosongkan angka di form tidak menghapus datanya.
 * Kondisi hidrologi berbeda: `''` berarti kosongkan (lihat `conditionPayload`).
 */
export function buildMonthlyHydrologyPayload(
	values: MonthlyHydrologyFormValues,
	context: MonthlyHydrologyPayloadContext = {}
): MonthlyHydrologyPayload {
	const conditions = context.conditions ?? MONTHLY_HYDROLOGY_CONDITIONS;
	return {
		hydrologyPrediction: conditionPayload(
			values.hydrologyPrediction,
			context.saved?.hydrologyPrediction,
			conditions
		),
		hydrologyActual: conditionPayload(
			values.hydrologyActual,
			context.saved?.hydrologyActual,
			conditions
		),
		predictedProductionMwh: optionalNumber(values.predictedProductionMwh),
		targetProductionMwh: optionalNumber(values.targetProductionMwh),
		actualProductionMwh: optionalNumber(values.actualProductionMwh),
		predictedAccumulatedMwh: optionalNumber(values.predictedAccumulatedMwh),
		targetAccumulatedMwh: optionalNumber(values.targetAccumulatedMwh),
		actualAccumulatedMwh: optionalNumber(values.actualAccumulatedMwh)
	};
}

/** Kiriman tanpa satu pun nilai akan menimpa seluruh data dengan "tidak ada". */
export function isEmptyMonthlyHydrologyPayload(payload: MonthlyHydrologyPayload): boolean {
	return Object.values(payload).every((value) => value === undefined);
}
