import { z } from 'zod';

const nullableNumberSchema = z.number().nullable().optional().default(null);
const nullableStringSchema = z.string().nullable().optional().default(null);

const apiDashboardStationMetricSchema = z.object({
	station: z.string(),
	label: z.string(),
	value: nullableNumberSchema,
	time: nullableStringSchema
});

const apiDashboardMetricSchema = z.object({
	value: nullableNumberSchema,
	unit: nullableStringSchema,
	label: z.string(),
	time: nullableStringSchema,
	source: z.enum(['measured', 'derived', 'plan', 'constant']),
	stations: z.array(apiDashboardStationMetricSchema).nullable().optional().default(null),
	/**
	 * Hanya terisi pada `dmn_beban_penuh`: dari mana penyebutnya berasal —
	 * `unit` bila dihitung dari unit terpilih, `manual` bila operator mengisi
	 * DMN sendiri.
	 */
	mode: nullableStringSchema,
	/** Nomor unit yang ikut dihitung saat `mode` = `unit`. */
	units: z.array(z.number().int()).nullable().optional().default(null)
});

const apiDashboardMetricGroupSchema = z.record(z.string(), apiDashboardMetricSchema);

export const apiDailyHydrologySchema = z.object({
	tanggal: z.string(),
	constants: z.record(z.string(), z.unknown()).nullable().optional().default(null),
	hulu: apiDashboardMetricGroupSchema,
	dam: apiDashboardMetricGroupSchema,
	hilir: apiDashboardMetricGroupSchema,
	pending_formulas: z.array(z.string()).optional().default([])
});

export const apiMonthlyHydrologySchema = z.object({
	id: z.string().uuid().nullable(),
	plta_id: z.string().uuid(),
	tahun: z.number(),
	bulan: z.number().min(1).max(12),
	prediksi_hidrologi: nullableStringSchema,
	aktual_hidrologi: nullableStringSchema,
	image_sifat_hujan: nullableStringSchema,
	image_curah_hujan: nullableStringSchema,
	prediksi_produksi_mwh: nullableNumberSchema,
	target_produksi_mwh: nullableNumberSchema,
	pencapaian_sd_prev_mwh: nullableNumberSchema,
	prediksi_pencapaian_sd_prev_mwh: nullableNumberSchema,
	target_pencapaian_sd_prev_mwh: nullableNumberSchema,
	prosentase_pencapaian: nullableNumberSchema
});

const apiDmnUnitSchema = z.object({
	unit: z.number().int(),
	dmn_mw: z.number()
});

const apiDashboardPLTASchema = z.object({
	id: z.string().uuid(),
	code: z.string(),
	name: z.string(),
	constants: z.record(z.string(), z.unknown()).nullable().optional().default(null),
	/** DMN per unit pembangkit — dasar pemilih penyebut SHFL. */
	dmn_units: z.array(apiDmnUnitSchema).nullable().optional().default([])
});

/** `GET /dashboard/plta/{id}/daily` — panel harian saja. */
export const apiPLTADailyDashboardSchema = z.object({
	plta: apiDashboardPLTASchema,
	daily: apiDailyHydrologySchema.nullable()
});

/** `GET /dashboard/plta/{id}/monthly` — panel satu bulan saja. */
export const apiPLTAMonthlyDashboardSchema = z.object({
	plta: apiDashboardPLTASchema,
	monthly: apiMonthlyHydrologySchema.nullable()
});

export const apiMonthlyHydrologyExcelResultSchema = z.object({
	baris_diproses: z.number(),
	dibuat: z.number(),
	diperbarui: z.number(),
	plta: z.array(z.string()).nullable().optional().default([]),
	periode: z.array(z.string()).nullable().optional().default([])
});

/** Isi `detail` pada respons 400 endpoint impor Excel. */
export const apiMonthlyHydrologyExcelErrorSchema = z.object({
	pesan: z.string().nullable().optional().default(null),
	rincian: z
		.array(
			z.object({
				baris: z.number(),
				kode_plta: z.string().nullable().optional().default(null),
				pesan: z.string()
			})
		)
		.nullable()
		.optional()
		.default([])
});

export const apiMonthlyHydrologyPageSchema = z.object({
	items: z.array(apiMonthlyHydrologySchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	pages: z.number()
});

export type ApiMonthlyHydrologyExcelResult = z.infer<typeof apiMonthlyHydrologyExcelResultSchema>;
export type ApiDailyHydrology = z.infer<typeof apiDailyHydrologySchema>;
export type ApiMonthlyHydrology = z.infer<typeof apiMonthlyHydrologySchema>;
