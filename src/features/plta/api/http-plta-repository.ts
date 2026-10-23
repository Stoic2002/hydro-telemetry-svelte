import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type {
	ListParams,
	PaginatedResult,
	Plant,
	PlantChanges,
	PlantTag,
	RiverBasin,
	RiverBasinChanges
} from '../model';
import type { PLTARepository } from './plta-repository';
import {
	apiPlantSchema,
	apiPlantTagSchema,
	apiRiverBasinSchema,
	paginatedPlantTagsSchema,
	paginatedPlantsSchema,
	paginatedRiverBasinsSchema,
	type ApiPlant,
	type ApiPlantTag,
	type ApiRiverBasin
} from './schemas';

const parseResponse = createApiResponseParser('Respons server tidak sesuai kontrak data Plants');

function mapRiverBasin(riverBasin: ApiRiverBasin): RiverBasin {
	return {
		id: riverBasin.id,
		code: riverBasin.code,
		name: riverBasin.name,
		description: riverBasin.description
	};
}

function mapPlant(plant: ApiPlant): Plant {
	return {
		id: plant.id,
		code: plant.code,
		name: plant.name,
		riverBasinId: plant.ws_id,
		latitude: plant.latitude,
		longitude: plant.longitude,
		capacityMw: plant.capacity_mw,
		description: plant.description,
		isActive: plant.is_active,
		bebanToOutflowNum: plant.beban_to_outflow_num,
		bebanToOutflowDen: plant.beban_to_outflow_den,
		constants: plant.constants
	};
}

function mapPlantTag(tag: ApiPlantTag): PlantTag {
	return {
		id: tag.id,
		pltaId: tag.plta_id,
		parameter: tag.parameter,
		station: tag.station,
		protocol: tag.protocol,
		address: tag.address,
		httpHeaders: tag.http_headers ?? {},
		valuePath: tag.value_path,
		timestampPath: tag.timestamp_path,
		scale: tag.scale,
		offset: tag.offset,
		unit: tag.unit,
		enabled: tag.enabled,
		label: tag.label,
		minValid: tag.min_valid,
		maxValid: tag.max_valid
	};
}

function mapPage<TApiItem, TItem>(
	page: {
		items: TApiItem[];
		total: number;
		page: number;
		limit: number;
		pages: number;
	},
	mapItem: (item: TApiItem) => TItem
): PaginatedResult<TItem> {
	return {
		...page,
		items: page.items.map(mapItem)
	};
}

/** Nama bidang model → nama bidang API untuk badan `POST`/`PATCH` PLTA. */
const PLANT_FIELD: Record<keyof PlantChanges, string> = {
	name: 'name',
	riverBasinId: 'ws_id',
	latitude: 'latitude',
	longitude: 'longitude',
	capacityMw: 'capacity_mw',
	description: 'description',
	isActive: 'is_active',
	bebanToOutflowNum: 'beban_to_outflow_num',
	bebanToOutflowDen: 'beban_to_outflow_den'
};

/**
 * Hanya bidang yang ADA di `changes` yang dikirim. `null` tetap dikirim karena
 * artinya mengosongkan (mis. koordinat), sedangkan bidang yang tidak disebut
 * dibiarkan server apa adanya — termasuk `constants`.
 */
function plantBody(changes: PlantChanges): Record<string, unknown> {
	const body: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(PLANT_FIELD) as [keyof PlantChanges, string][]) {
		if (key in changes && changes[key] !== undefined) body[field] = changes[key];
	}
	return body;
}

function listQuery(params: ListParams) {
	return {
		page: params.page,
		limit: params.limit,
		search: params.search
	};
}

export const httpPltaRepository: PLTARepository = {
	async listRiverBasins(params) {
		const endpoint = '/api/v1/wilayah-sungai';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			query: listQuery(params)
		});
		const result = parseResponse(payload, paginatedRiverBasinsSchema, endpoint);

		return mapPage(result, mapRiverBasin);
	},

	async list(params) {
		const endpoint = '/api/v1/plta';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			query: listQuery(params)
		});
		const result = parseResponse(payload, paginatedPlantsSchema, endpoint);

		return mapPage(result, mapPlant);
	},

	async getById(pltaId) {
		const endpoint = `/api/v1/plta/${encodeURIComponent(pltaId)}`;

		try {
			const payload = await apiRequest<unknown>(endpoint, {
				method: 'GET',
				cache: 'no-store'
			});

			return mapPlant(parseResponse(payload, apiPlantSchema, endpoint));
		} catch (error) {
			if (ApiError.isApiError(error) && error.status === 404) return null;
			throw error;
		}
	},

	async listTags(pltaId, params) {
		const endpoint = `/api/v1/plta/${encodeURIComponent(pltaId)}/tags`;
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'GET',
			cache: 'no-store',
			query: {
				...listQuery(params),
				protocol: params.protocol,
				enabled: params.enabled
			}
		});
		const result = parseResponse(payload, paginatedPlantTagsSchema, endpoint);

		return mapPage(result, mapPlantTag);
	},

	async updateTagBounds(tagId, bounds) {
		const endpoint = `/api/v1/tags/${encodeURIComponent(tagId)}/bounds`;
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'PATCH',
			// Kedua sisi SELALU dikirim, termasuk `null`: server menganggap badan
			// permintaan sebagai rentang utuh, dan sisi yang tidak dikirim ikut
			// terhapus.
			json: { min_valid: bounds.minValid, max_valid: bounds.maxValid }
		});

		return mapPlantTag(parseResponse(payload, apiPlantTagSchema, endpoint));
	},

	async createRiverBasin(input) {
		const endpoint = '/api/v1/wilayah-sungai';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			json: { code: input.code, name: input.name, description: input.description }
		});

		return mapRiverBasin(parseResponse(payload, apiRiverBasinSchema, endpoint));
	},

	async updateRiverBasin(riverBasinId, changes: RiverBasinChanges) {
		const endpoint = `/api/v1/wilayah-sungai/${encodeURIComponent(riverBasinId)}`;
		const json: Record<string, unknown> = {};
		if (changes.name !== undefined) json.name = changes.name;
		if (changes.description !== undefined) json.description = changes.description;
		const payload = await apiRequest<unknown>(endpoint, { method: 'PATCH', json });

		return mapRiverBasin(parseResponse(payload, apiRiverBasinSchema, endpoint));
	},

	async createPlant(input) {
		const endpoint = '/api/v1/plta';
		const { code, ...rest } = input;
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			json: { code, ...plantBody(rest) }
		});

		return mapPlant(parseResponse(payload, apiPlantSchema, endpoint));
	},

	async updatePlant(pltaId, changes) {
		const endpoint = `/api/v1/plta/${encodeURIComponent(pltaId)}`;
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'PATCH',
			json: plantBody(changes)
		});

		return mapPlant(parseResponse(payload, apiPlantSchema, endpoint));
	}
};
