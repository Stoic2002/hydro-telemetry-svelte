import { z } from 'zod';

const apiElevationPointSchema = z.object({
	id: z.string().uuid(),
	elevation: z.number(),
	volume: z.number(),
	area: z.number()
});

export const apiElevationUploadResultSchema = z.object({
	id: z.string().uuid(),
	plta_id: z.string().uuid(),
	year: z.number().int(),
	status: z.enum(['draft', 'published']),
	min_elevation: z.number().nullable(),
	max_elevation: z.number().nullable(),
	points: z.array(apiElevationPointSchema)
});

export type ApiElevationUploadResult = z.infer<typeof apiElevationUploadResultSchema>;

const apiCurveStatusSchema = z.enum(['draft', 'published']);

/** `GET /elevations/status` — kesiapan kurva EVA tiap PLTA. */
export const apiElevationStatusSchema = z.object({
	tahun: z.number().int(),
	ringkasan: z.object({
		total_plta: z.number().int().nonnegative(),
		siap: z.number().int().nonnegative(),
		draft: z.number().int().nonnegative(),
		belum_ada: z.number().int().nonnegative()
	}),
	items: z.array(
		z.object({
			plta_id: z.string().uuid(),
			kode_plta: z.string(),
			nama_plta: z.string(),
			/** `siap` = ada published yang berlaku; `draft` = diunggah tapi belum dipakai. */
			status: z.enum(['siap', 'draft', 'belum_ada']),
			tahun_berlaku: z.number().int().nullable(),
			jumlah_titik: z.number().int().nullable(),
			elevasi_min: z.number().nullable(),
			elevasi_maks: z.number().nullable(),
			tahun_published: z.array(z.number().int()),
			tahun_draft: z.array(z.number().int())
		})
	)
});

const apiCurveTwinSchema = z.object({
	id: z.string().uuid(),
	plta_id: z.string().uuid(),
	kode_plta: z.string(),
	nama_plta: z.string(),
	tahun: z.number().int(),
	status: apiCurveStatusSchema
});

/** `GET /elevations/curves` — daftar kurva tanpa titik, untuk layar kelola publish. */
export const apiElevationCurveListSchema = z.object({
	tahun: z.number().int(),
	total: z.number().int().nonnegative(),
	items: z.array(
		z.object({
			id: z.string().uuid(),
			plta_id: z.string().uuid(),
			kode_plta: z.string(),
			nama_plta: z.string(),
			tahun: z.number().int(),
			status: apiCurveStatusSchema,
			jumlah_titik: z.number().int().nonnegative(),
			elevasi_min: z.number().nullable(),
			elevasi_maks: z.number().nullable(),
			/** Kurva yang sungguh dipakai perhitungan: published terbaru ber-`tahun <= year`. */
			berlaku: z.boolean(),
			/** Kurva lain (PLTA mana pun) yang titiknya identik. */
			kembar: z.array(apiCurveTwinSchema)
		})
	)
});

export type ApiElevationStatus = z.infer<typeof apiElevationStatusSchema>;
export type ApiElevationCurveList = z.infer<typeof apiElevationCurveListSchema>;
