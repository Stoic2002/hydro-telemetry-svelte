import { z } from 'zod';
import { MONITORING_PARAMETERS } from '../model';

const monitoringParameterSchema = z.enum(MONITORING_PARAMETERS);

export const apiMonitoringParameterLatestSchema = z.object({
	parameter: monitoringParameterSchema,
	station: z.string().optional().default(''),
	time: z.string().nullable().optional().default(null),
	value: z.number().nullable().optional().default(null),
	quality: z.string().nullable().optional().default(null)
});

function isUnknownParameter(value: unknown): boolean {
	if (typeof value !== 'object' || value === null) return false;
	const parameter = Reflect.get(value, 'parameter');
	return (
		typeof parameter === 'string' &&
		!(MONITORING_PARAMETERS as readonly string[]).includes(parameter)
	);
}

/**
 * Parameter yang belum dikenal FE dilewati, bukan menolak seluruh snapshot:
 * backend menambah `ParameterType` antar-rilis (mis. `rumus`), dan satu tag baru
 * tidak boleh mematikan data PLTA itu. Kesalahan bentuk lain tetap galat kontrak.
 */
export const apiPLTALatestMonitoringSchema = z.object({
	plta_id: z.string().uuid(),
	parameters: z.preprocess(
		(items) => (Array.isArray(items) ? items.filter((item) => !isUnknownParameter(item)) : items),
		z.array(apiMonitoringParameterLatestSchema)
	)
});

export const apiMonitoringEventSchema = apiMonitoringParameterLatestSchema.extend({
	plta_id: z.string().uuid()
});

/** Pesan realtime untuk parameter yang belum dikenal FE: diabaikan, bukan galat. */
export const apiUnknownMonitoringEventSchema = z
	.object({ plta_id: z.string().uuid(), parameter: z.string() })
	.refine(isUnknownParameter);

export const apiRiverBasinLatestMonitoringSchema = z.array(apiPLTALatestMonitoringSchema);

export type ApiMonitoringParameterLatest = z.infer<typeof apiMonitoringParameterLatestSchema>;
export type ApiPLTALatestMonitoring = z.infer<typeof apiPLTALatestMonitoringSchema>;
