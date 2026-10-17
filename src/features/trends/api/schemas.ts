import { z } from 'zod';

const apiTrendPointSchema = z.object({
	time: z.string(),
	value: z.number(),
	quality: z.string().optional().default('good'),
	quality_murni: z.boolean().optional().default(true)
});

export const apiTrendSeriesSchema = z.object({
	plta_id: z.string().uuid(),
	parameter: z.string().min(1),
	station: z.string().nullable().optional().default(null),
	resolution: z.string(),
	points: z.array(apiTrendPointSchema),
	/**
	 * Station yang ikut diagregasi; terisi hanya bila `station` null (agregat
	 * lintas station).
	 */
	aggregated_stations: z.array(z.string()).nullable().optional().default(null)
});

export type ApiTrendSeries = z.infer<typeof apiTrendSeriesSchema>;

const trendPanelSchema = z.enum(['hulu', 'dam', 'hilir']);

const apiPlantTrendItemSchema = z.object({
	id: z.string(),
	key: z.string(),
	urutan: z.number().int(),
	grup: z.string().nullable().optional().default(null),
	label: z.string(),
	label_diatur: z.boolean().optional().default(false),
	unit: z.string().nullable().optional().default(null),
	panel: trendPanelSchema,
	sumber: z.string()
});

const apiPlantTrendChartSchema = z.object({
	judul: z.string(),
	grup: z.string().nullable().optional().default(null),
	item: z.array(z.string())
});

/** `GET`/`PUT /trends/plta/{plta_id}/series`. */
export const apiPlantTrendListSchema = z.object({
	plta_id: z.string(),
	diatur: z.boolean(),
	item: z.array(apiPlantTrendItemSchema),
	grafik: z.array(apiPlantTrendChartSchema)
});

const apiPlantTrendSeriesSchema = z.object({
	nama: z.string(),
	station: z.string().nullable().optional().default(null),
	stasiun: z.array(z.string()).optional().default([]),
	points: z.array(apiTrendPointSchema),
	terpotong: z.boolean().optional().default(false)
});

/** `GET /trends/plta/{plta_id}/data`. */
export const apiPlantTrendDataSchema = z.object({
	plta_id: z.string(),
	resolution: z.string(),
	dari: z.string(),
	sampai: z.string(),
	item: z.array(
		apiPlantTrendItemSchema.extend({
			resolusi_efektif: z.string(),
			ada_data: z.boolean(),
			deret: z.array(apiPlantTrendSeriesSchema)
		})
	),
	grafik: z.array(apiPlantTrendChartSchema)
});

/** `GET /trends/plta/{plta_id}/catalog`. */
export const apiTrendCatalogSchema = z.object({
	plta_id: z.string(),
	kandidat: z.array(
		z.object({
			key: z.string(),
			label: z.string(),
			unit: z.string().nullable().optional().default(null),
			panel: trendPanelSchema,
			sumber: z.string(),
			jenis: z.string(),
			hujan: z.boolean().optional().default(false),
			data_terakhir: z.string().nullable().optional().default(null),
			dipakai: z.boolean().optional().default(false)
		})
	),
	belum_ditrenkan: z.record(z.string(), z.string()).optional().default({})
});

/** `400` dari `PUT …/series` — tidak ada yang disimpan. */
export const apiTrendListErrorSchema = z.object({
	pesan: z.string(),
	masalah: z.array(z.string()).optional().default([]),
	kunci_sah: z.array(z.string()).optional().default([])
});

export type ApiPlantTrendList = z.infer<typeof apiPlantTrendListSchema>;
export type ApiPlantTrendData = z.infer<typeof apiPlantTrendDataSchema>;
export type ApiTrendCatalog = z.infer<typeof apiTrendCatalogSchema>;
