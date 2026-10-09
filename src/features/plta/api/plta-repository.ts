import type {
	ListParams,
	PaginatedResult,
	Plant,
	PlantTag,
	PlantTagListParams,
	RiverBasin,
	TagBounds
} from '../model';

export interface PLTARepository {
	listRiverBasins(params: ListParams): Promise<PaginatedResult<RiverBasin>>;
	list(params: ListParams): Promise<PaginatedResult<Plant>>;
	getById(pltaId: string): Promise<Plant | null>;
	listTags(pltaId: string, params: PlantTagListParams): Promise<PaginatedResult<PlantTag>>;
	/**
	 * Menyetel rentang pembacaan sah satu tag. Berlaku ke depan: pembacaan yang
	 * sudah tersimpan tidak dinilai ulang. `{null, null}` mencabut pembatasan.
	 */
	updateTagBounds(tagId: string, bounds: TagBounds): Promise<PlantTag>;
}
