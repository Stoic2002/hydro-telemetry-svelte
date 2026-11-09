import { ApiError, apiRequest, createApiResponseParser } from '../../../api/http';
import type {
	ListParams,
	PaginatedResult,
	Plant,
	PlantChanges,
	PlantTag,
	RiverBasin,
	RiverBasinChanges,
	FormulaDictionary,
	TagFormula,
	TagFormulaVariable,
	TagInput
} from '../model';
import type { PLTARepository } from './plta-repository';
import {
	apiFormulaDictionarySchema,
	apiFormulaTestSchema,
	apiParameterCatalogSchema,
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

type ApiFormulaVariable =
	| { konstanta: string }
	| {
			parameter: string;
			station: string;
			ambil: 'terbaru' | 'rata_jam' | 'harian';
			bawaan: number | null;
	  };

function mapFormulaVariable(variable: ApiFormulaVariable): TagFormulaVariable {
	return 'konstanta' in variable
		? { kind: 'constant', constant: variable.konstanta }
		: {
				kind: 'series',
				parameter: variable.parameter,
				station: variable.station,
				take: variable.ambil,
				fallback: variable.bawaan
			};
}

function mapFormulaDictionary(
	dictionary: ReturnType<typeof apiFormulaDictionarySchema.parse>
): FormulaDictionary {
	return {
		functions: dictionary.fungsi.map((item) => ({ name: item.nama, description: item.keterangan })),
		operators: dictionary.operator,
		takeModes: dictionary.ambil.map((item) => ({ name: item.nama, description: item.keterangan })),
		constants: dictionary.konstanta,
		limits: dictionary.batas,
		codePattern: dictionary.pola_kode,
		variablePattern: dictionary.pola_variabel,
		example: {
			expression: dictionary.contoh.ekspresi,
			variables: Object.fromEntries(
				Object.entries(dictionary.contoh.variabel).map(([name, variable]) => [
					name,
					mapFormulaVariable(variable)
				])
			)
		}
	};
}

/** `TagFormula` → `DefinisiRumus` Swagger. */
export function formulaBody(formula: TagFormula) {
	return {
		ekspresi: formula.expression,
		variabel: Object.fromEntries(
			Object.entries(formula.variables).map(([name, variable]) => [
				name,
				variable.kind === 'constant'
					? { konstanta: variable.constant }
					: {
							parameter: variable.parameter,
							station: variable.station,
							ambil: variable.take,
							bawaan: variable.fallback
						}
			])
		)
	};
}

/**
 * Badan `POST /tags`. Bidang REST hanya disertakan untuk protokol `rest`:
 * server menolak bidang itu di protokol lain, bahkan bila nilainya `null`.
 * `rumus` hanya untuk tag `derived` beralamat `rumus`.
 */
function tagBody(input: TagInput): Record<string, unknown> {
	return {
		plta_id: input.pltaId,
		parameter: input.parameter,
		station: input.station,
		label: input.label,
		protocol: input.protocol,
		address: input.address,
		scale: input.scale,
		offset: input.offset,
		unit: input.unit,
		min_valid: input.minValid,
		max_valid: input.maxValid,
		enabled: input.enabled,
		panel: input.panel,
		...(input.protocol === 'derived' && input.formula ? { rumus: formulaBody(input.formula) } : {}),
		...(input.protocol === 'rest'
			? {
					http_headers: input.httpHeaders,
					value_path: input.valuePath,
					timestamp_path: input.timestampPath
				}
			: {})
	};
}

function listQuery(params: ListParams) {
	return {
		page: params.page,
		limit: params.limit,
		search: params.search
	};
}

export const httpPltaRepository: PLTARepository = {
	async listParameters() {
		const endpoint = '/api/v1/parameter';
		const payload = await apiRequest<unknown>(endpoint, { method: 'GET' });

		return parseResponse(payload, apiParameterCatalogSchema, endpoint).map((item) => ({
			key: item.key,
			label: item.label,
			unit: item.satuan,
			group: item.kelompok
		}));
	},

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

	async deleteRiverBasin(riverBasinId) {
		await apiRequest<void>(`/api/v1/wilayah-sungai/${encodeURIComponent(riverBasinId)}`, {
			method: 'DELETE'
		});
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

	async getFormulaDictionary() {
		const endpoint = '/api/v1/tags/rumus/kamus';
		const payload = await apiRequest<unknown>(endpoint, { method: 'GET' });
		return mapFormulaDictionary(parseResponse(payload, apiFormulaDictionarySchema, endpoint));
	},

	async testFormula(pltaId, formula, code) {
		const endpoint = '/api/v1/tags/rumus/uji';
		const payload = await apiRequest<unknown>(endpoint, {
			method: 'POST',
			json: { plta_id: pltaId, station: code || null, rumus: formulaBody(formula) }
		});
		const result = parseResponse(payload, apiFormulaTestSchema, endpoint);
		return {
			value: result.nilai,
			time: result.waktu,
			variables: result.variabel.map((item) => ({
				name: item.nama,
				value: item.nilai,
				time: item.waktu,
				source: item.sumber
			})),
			problems: result.masalah
		};
	},

	async createTag(input) {
		const endpoint = '/api/v1/tags';
		const payload = await apiRequest<unknown>(endpoint, { method: 'POST', json: tagBody(input) });

		return mapPlantTag(parseResponse(payload, apiPlantTagSchema, endpoint));
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
