import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type {
	ElevationCurveSummary,
	ElevationReadiness,
	ElevationStatusOverview,
	ElevationUploadResult
} from '../model';
import type { UploadsRepository } from './uploads-repository';
import {
	apiElevationCurveListSchema,
	apiElevationStatusSchema,
	apiElevationUploadResultSchema,
	type ApiElevationCurveList,
	type ApiElevationStatus,
	type ApiElevationUploadResult
} from './schemas';

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

const READINESS: Record<ApiElevationStatus['items'][number]['status'], ElevationReadiness> = {
	siap: 'ready',
	draft: 'draft',
	belum_ada: 'missing'
};

function mapElevationStatus(status: ApiElevationStatus): ElevationStatusOverview {
	return {
		year: status.tahun,
		totals: {
			plants: status.ringkasan.total_plta,
			ready: status.ringkasan.siap,
			draft: status.ringkasan.draft,
			missing: status.ringkasan.belum_ada
		},
		plants: status.items.map((item) => ({
			pltaId: item.plta_id,
			plantCode: item.kode_plta,
			plantName: item.nama_plta,
			readiness: READINESS[item.status],
			effectiveYear: item.tahun_berlaku,
			pointCount: item.jumlah_titik,
			minElevation: item.elevasi_min,
			maxElevation: item.elevasi_maks,
			publishedYears: item.tahun_published,
			draftYears: item.tahun_draft
		}))
	};
}

function mapCurve(curve: ApiElevationCurveList['items'][number]): ElevationCurveSummary {
	return {
		id: curve.id,
		pltaId: curve.plta_id,
		plantCode: curve.kode_plta,
		plantName: curve.nama_plta,
		year: curve.tahun,
		status: curve.status,
		pointCount: curve.jumlah_titik,
		minElevation: curve.elevasi_min,
		maxElevation: curve.elevasi_maks,
		isEffective: curve.berlaku,
		twins: curve.kembar.map((twin) => ({
			id: twin.id,
			pltaId: twin.plta_id,
			plantCode: twin.kode_plta,
			plantName: twin.nama_plta,
			year: twin.tahun,
			status: twin.status
		}))
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
	},

	async getElevationStatus(year, options) {
		const endpoint = '/api/v1/elevations/status';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: { year }
		});

		return mapElevationStatus(parseResponse(payload, apiElevationStatusSchema, endpoint));
	},

	async listElevationCurves({ pltaId, year }, options) {
		const endpoint = '/api/v1/elevations/curves';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			signal: options?.signal,
			query: { plta_id: pltaId, year }
		});

		return parseResponse(payload, apiElevationCurveListSchema, endpoint).items.map(mapCurve);
	},

	async setElevationCurveStatus(curveId, status) {
		// Responsnya kurva lengkap beserta seluruh titiknya (Wonogiri ±158 kB);
		// layar hanya perlu tahu berhasil, lalu mengambil ulang daftar ringkas.
		await apiRequest<unknown>(`/api/v1/elevations/${encodeURIComponent(curveId)}/status`, {
			method: 'PATCH',
			json: { status }
		});
	},

	async deleteElevationCurve(curveId) {
		await apiRequest<unknown>(`/api/v1/elevations/${encodeURIComponent(curveId)}`, {
			method: 'DELETE'
		});
	}
};
