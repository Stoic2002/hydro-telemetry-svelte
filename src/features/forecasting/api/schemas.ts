import { z } from 'zod';

export const apiForecastSeriesSchema = z.object({
	plta_id: z.string().uuid(),
	parameter: z.enum(['inflow', 'water_level']),
	model_name: z.string(),
	generated_at: z.string().nullable().optional().default(null),
	unit: z.string().nullable().optional().default(null),
	label: z.string().nullable().optional().default(null),
	akurasi: z
		.object({
			skill: z.number().nullable().optional().default(null),
			n: z.number().int().nonnegative().optional().default(0),
			jendela_hari: z.number().int().nonnegative().optional().default(3),
			layak_disajikan: z.boolean().optional().default(true)
		})
		.nullable()
		.optional()
		.default(null),
	points: z.array(
		z.object({
			time: z.string(),
			horizon: z.number().int(),
			// Swagger menyebut `value` wajib angka, tetapi run 1 Okt 2026 00.30 WIB
			// mengirim 24 titik dengan `value: null` semua. Menolaknya membuat seluruh
			// halaman jatuh ke "respons tidak sesuai kontrak" — padahal yang benar
			// "run ini belum berisi prediksi", dan halaman bisa menyampaikannya.
			value: z.number().nullable(),
			value_p10: z.number().nullable().optional().default(null),
			value_p90: z.number().nullable().optional().default(null)
		})
	)
});

export type ApiForecastSeries = z.infer<typeof apiForecastSeriesSchema>;
