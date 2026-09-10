import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type { ElevationUploadResult } from '../model';
import type { UploadsRepository } from './uploads-repository';
import { apiElevationUploadResultSchema, type ApiElevationUploadResult } from './schemas';

const parseResponse = createApiResponseParser(
	'Respons server tidak sesuai kontrak upload data PLTA'
);

function mapElevationResult(result: ApiElevationUploadResult): ElevationUploadResult {
	return {
		id: result.id,
		pltaId: result.plta_id,
		year: result.year,
		status: result.status,
		minElevation: result.min_elevation,
		maxElevation: result.max_elevation,
		points: result.points
	};
}

export const httpUploadsRepository: UploadsRepository = {
	async downloadElevationTemplate(pltaId, year, options) {
		const endpoint = '/api/v1/elevations/template.xlsx';
		const payload = await apiRequest<Blob>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			headers: {
				Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			},
			query: { plta_id: pltaId, year }
		});

		if (!(payload instanceof Blob)) {
			throw new ApiError('Respons template kurva elevasi tidak valid', {
				status: 502,
				statusText: 'Invalid API Response',
				url: endpoint
			});
		}

		return payload;
	},

	async uploadElevationExcel(input) {
		const endpoint = '/api/v1/elevations/upload-excel';
		const formData = new FormData();
		formData.set('plta_id', input.pltaId);
		formData.set('year', String(input.year));
		formData.set('file', input.file);
		formData.set('publish', String(input.publish));

		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			cache: 'no-store',
			body: formData
		});

		return mapElevationResult(parseResponse(payload, apiElevationUploadResultSchema, endpoint));
	}
};
