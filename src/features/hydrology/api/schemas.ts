import { z } from 'zod';

const nullableNumberSchema = z.number().nullable().optional().default(null);
const nullableStringSchema = z.string().nullable().optional().default(null);

const apiDashboardStationMetricSchema = z.object({
	station: z.string(),
	label: z.string(),
	value: nullableNumberSchema,
	time: nullableStringSchema
});

/**
 * Parameter telemetri di balik sebuah metrik, bila nilainya memang diisi manual
 * DAN PLTA-nya punya tag `upload` untuk itu. Server yang menentukan, jadi FE
 * tidak perlu menebak dari nama kunci metrik.
 */
const apiDashboardMetricInputSchema = z.object({
	parameter: z.string().min(1),
	// Station kosong dikirim sebagai `""` atau `null` tergantung tagnya; keduanya
	// berarti "parameter ini tidak dipecah per station".
	station: z
		.string()
		.nullable()
		.optional()
		.transform((value) => value ?? '')
});

const apiDashboardMetricSchema = z.object({
	input: apiDashboardMetricInputSchema.nullable().optional().default(null),
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

/** `POST /hydrology/daily/excel` — respons sukses unggah Excel harian seluruh PLTA. */
export const apiDailyHydrologyExcelResultSchema = z.object({
	baris_diproses: z.number(),
	titik_ditulis: z.number(),
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

const apiOverviewAverageSchema = z.object({
	rata2: z.number().nullable(),
	/** Jumlah baris yang benar-benar ikut dihitung. */
	n: z.number().int().nonnegative()
});

/**
 * `GET /hydrology/monthly/overview` — ringkasan satu periode lintas SELURUH
 * PLTA. Swagger hanya menuliskannya sebagai objek bebas; bentuk ini diambil
 * dari respons asli server.
 */
export const apiMonthlyHydrologyOverviewSchema = z.object({
	tahun: z.number().int(),
	bulan: z.number().int().nullable(),
	periode: z.string(),
	jumlah_baris: z.number().int().nonnegative(),
	jumlah_plta: z.number().int().nonnegative(),
	prosentase_pencapaian_rata2: z.number().nullable(),
	prosentase_pencapaian_rata2_n: z.number().int().nonnegative(),
	prosentase_pencapaian_agregat: z.number().nullable(),
	total_prediksi_pencapaian_sd_prev_mwh: z.number(),
	total_target_pencapaian_sd_prev_mwh: z.number(),
	jumlah_tercapai: z.number().int().nonnegative(),
	jumlah_tidak_tercapai: z.number().int().nonnegative(),
	jumlah_belum_dinilai: z.number().int().nonnegative(),
	rerata: z.object({
		prediksi_produksi_mwh: apiOverviewAverageSchema,
		target_produksi_mwh: apiOverviewAverageSchema,
		pencapaian_sd_prev_mwh: apiOverviewAverageSchema,
		prediksi_pencapaian_sd_prev_mwh: apiOverviewAverageSchema,
		target_pencapaian_sd_prev_mwh: apiOverviewAverageSchema
	})
});

export type ApiMonthlyHydrologyOverview = z.infer<typeof apiMonthlyHydrologyOverviewSchema>;
export type ApiMonthlyHydrologyExcelResult = z.infer<typeof apiMonthlyHydrologyExcelResultSchema>;
export type ApiDailyHydrology = z.infer<typeof apiDailyHydrologySchema>;
export type ApiMonthlyHydrology = z.infer<typeof apiMonthlyHydrologySchema>;
