import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type { TelemetryUploadResult } from '../model';
import { telemetryTemplateQuery } from '../template';
import type { TelemetryUploadRepository } from './telemetry-upload-repository';
import {
	apiTelemetryDeleteResultSchema,
	apiTelemetryUploadResultSchema,
	type ApiTelemetryUploadResult
} from './schemas';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const parseResponse = createApiResponseParser(
	'Respons server tidak sesuai kontrak upload telemetri'
);

function mapResult(result: ApiTelemetryUploadResult): TelemetryUploadResult {
	return {
		pltaId: result.plta_id,
		parameter: result.parameter,
		pointsUpserted: result.points_upserted,
		filename: result.filename
	};
}

export const httpTelemetryUploadRepository: TelemetryUploadRepository = {
	async uploadPoints(input) {
		const endpoint = '/api/v1/telemetry/upload';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			json: {
				plta_id: input.pltaId,
				parameter: input.parameter,
				station: input.station,
				points: input.points
			}
		});

		return mapResult(parseResponse(payload, apiTelemetryUploadResultSchema, endpoint));
	},

	async uploadExcel(input) {
		const endpoint = '/api/v1/telemetry/upload-excel';
		const formData = new FormData();
		formData.set('plta_id', input.pltaId);
		formData.set('parameter', input.parameter);
		formData.set('station', input.station);
		formData.set('file', input.file);

		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			body: formData
		});

		return mapResult(parseResponse(payload, apiTelemetryUploadResultSchema, endpoint));
	},

	async deletePoints(input) {
		const endpoint = '/api/v1/telemetry/points';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'DELETE',
			query: {
				plta_id: input.pltaId,
				parameter: input.parameter,
				station: input.station,
				start: input.start,
				end: input.end
			}
		});
		const result = parseResponse(payload, apiTelemetryDeleteResultSchema, endpoint);

		return {
			pltaId: result.plta_id,
			parameter: result.parameter,
			station: result.station,
			pointsDeleted: result.points_deleted
		};
	},

	async downloadTemplate(input) {
		const endpoint = '/api/v1/telemetry/upload-template.xlsx';
		const query = telemetryTemplateQuery(input.scope, input.date);
		if (!query) {
			throw new ApiError('Tanggal template belum diisi', {
				status: 400,
				statusText: 'Invalid Template Period',
				url: endpoint
			});
		}

		const payload = await apiRequest<Blob>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			headers: { Accept: XLSX_MIME },
			query: { plta_id: input.pltaId, parameter: input.parameter, station: input.station, ...query }
		});

		if (!(payload instanceof Blob)) {
			throw new ApiError('Respons template upload telemetri tidak valid', {
				status: 502,
				statusText: 'Invalid API Response',
				url: endpoint
			});
		}

		return payload;
	}
};
