import { z } from 'zod';

const nullableString = z.string().nullable().optional().default(null);

const uploadAuditSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	jenis: z.string(),
	aksi: z.string(),
	user_id: z.string().uuid().nullable(),
	username: nullableString,
	plta_id: z.string().uuid().nullable(),
	plta_code: nullableString,
	parameter: nullableString,
	station: nullableString,
	nama_berkas: nullableString,
	jumlah: z.number(),
	periode_start: nullableString,
	periode_end: nullableString,
	rincian: z.record(z.string(), z.unknown()).nullable().optional().default(null)
});

export const apiUploadAuditPageSchema = z.object({
	items: z.array(uploadAuditSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	pages: z.number()
});

export type ApiUploadAudit = z.infer<typeof uploadAuditSchema>;
