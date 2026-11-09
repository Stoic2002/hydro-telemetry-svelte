import { z } from 'zod';

// `derived`: nilai dihitung server dari tag lain (mis. `total_outflow` Wonogiri). Satu
// protokol yang tidak dikenal menolak SELURUH daftar tag PLTA itu, bukan hanya
// tag-nya — pernah membuat Tren & Grafik Wonogiri kosong.
const plantTagProtocolSchema = z.enum(['opcua', 'modbus', 'sql', 'rest', 'upload', 'derived']);

export const apiRiverBasinSchema = z.object({
	code: z.string().min(1),
	name: z.string().min(1),
	description: z.string().nullable().optional().default(null),
	id: z.string().uuid()
});

export const apiPlantSchema = z.object({
	code: z.string().min(1),
	name: z.string().min(1),
	ws_id: z.string().uuid(),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	capacity_mw: z.number().nullable().optional().default(null),
	description: z.string().nullable().optional().default(null),
	is_active: z.boolean(),
	beban_to_outflow_num: z.number(),
	beban_to_outflow_den: z.number(),
	constants: z
		.record(z.string(), z.unknown())
		.nullable()
		.optional()
		.transform((value) => value ?? {}),
	id: z.string().uuid()
});

export const apiPlantTagSchema = z.object({
	plta_id: z.string().uuid(),
	parameter: z.string().min(1),
	station: z.string(),
	protocol: plantTagProtocolSchema,
	address: z.string(),
	http_headers: z.record(z.string(), z.string()).nullable().optional().default(null),
	value_path: z.string().nullable().optional().default(null),
	timestamp_path: z.string().nullable().optional().default(null),
	scale: z.number(),
	offset: z.number(),
	unit: z
		.string()
		.nullable()
		.optional()
		.transform((value) => value ?? ''),
	enabled: z.boolean(),
	label: z.string().nullable().optional().default(null),
	min_valid: z.number().nullable().optional().default(null),
	max_valid: z.number().nullable().optional().default(null),
	id: z.string().uuid()
});

export const apiParameterCatalogSchema = z.array(
	z.object({
		key: z.string().min(1),
		label: z.string().min(1),
		satuan: z.string().nullable(),
		kelompok: z.string()
	})
);

const apiFormulaVariableSchema = z.union([
	z.object({ konstanta: z.string() }),
	z.object({
		parameter: z.string(),
		station: z.string().default(''),
		ambil: z.enum(['terbaru', 'rata_jam', 'harian']).default('terbaru'),
		bawaan: z.number().nullable().default(null)
	})
]);

export const apiFormulaDefinitionSchema = z.object({
	ekspresi: z.string(),
	variabel: z.record(z.string(), apiFormulaVariableSchema)
});

const apiNamedTextSchema = z.object({ nama: z.string(), keterangan: z.string() });

/** `KamusRumus` — semua bidang wajib di Swagger 9 Nov 2026. */
export const apiFormulaDictionarySchema = z.object({
	fungsi: z.array(apiNamedTextSchema),
	operator: z.array(z.string()),
	ambil: z.array(apiNamedTextSchema),
	konstanta: z.array(z.string()),
	batas: z.record(z.string(), z.number()),
	pola_kode: z.string(),
	pola_variabel: z.string(),
	contoh: apiFormulaDefinitionSchema
});

/** `HasilUjiRumus`. */
export const apiFormulaTestSchema = z.object({
	nilai: z.number().nullable(),
	waktu: z.string(),
	variabel: z.array(
		z.object({
			nama: z.string(),
			nilai: z.number().nullable(),
			waktu: z.string().nullable(),
			sumber: z.enum(['deret', 'bawaan', 'konstanta', 'kosong'])
		})
	),
	masalah: z.array(z.string())
});

function paginatedSchema<TSchema extends z.ZodType>(itemSchema: TSchema) {
	return z.object({
		items: z.array(itemSchema),
		total: z.number().int().nonnegative(),
		page: z.number().int().nonnegative(),
		limit: z.number().int().nonnegative(),
		pages: z.number().int().nonnegative()
	});
}

export const paginatedRiverBasinsSchema = paginatedSchema(apiRiverBasinSchema);
export const paginatedPlantsSchema = paginatedSchema(apiPlantSchema);
export const paginatedPlantTagsSchema = paginatedSchema(apiPlantTagSchema);

export type ApiRiverBasin = z.infer<typeof apiRiverBasinSchema>;
export type ApiPlant = z.infer<typeof apiPlantSchema>;
export type ApiPlantTag = z.infer<typeof apiPlantTagSchema>;
