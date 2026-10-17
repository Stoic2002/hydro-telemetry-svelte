import { z } from 'zod';
import { MONITORING_PARAMETERS } from '../../monitoring';

export const apiTelemetryUploadResultSchema = z.object({
	plta_id: z.string().uuid(),
	parameter: z.enum(MONITORING_PARAMETERS),
	points_upserted: z.number().int().nonnegative(),
	filename: z.string().nullable().optional().default(null)
});

export type ApiTelemetryUploadResult = z.infer<typeof apiTelemetryUploadResultSchema>;

export const apiTelemetryDeleteResultSchema = z.object({
	plta_id: z.string().uuid(),
	parameter: z.enum(MONITORING_PARAMETERS),
	station: z.string(),
	points_deleted: z.number().int().nonnegative()
});

export type ApiTelemetryDeleteResult = z.infer<typeof apiTelemetryDeleteResultSchema>;
