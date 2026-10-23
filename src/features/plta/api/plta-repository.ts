import type {
	ListParams,
	PaginatedResult,
	Plant,
	PlantChanges,
	PlantInput,
	PlantTag,
	PlantTagListParams,
	RiverBasin,
	RiverBasinChanges,
	RiverBasinInput,
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
	/** Khusus admin. `400` bila kode sudah dipakai atau isian ditolak aturan server. */
	createRiverBasin(input: RiverBasinInput): Promise<RiverBasin>;
	updateRiverBasin(riverBasinId: string, changes: RiverBasinChanges): Promise<RiverBasin>;
	/** Khusus admin. `400` bila `riverBasinId` tidak dikenal. */
	createPlant(input: PlantInput): Promise<Plant>;
	/** Hanya bidang yang dikirim yang berubah; `constants` tidak pernah disentuh. */
	updatePlant(pltaId: string, changes: PlantChanges): Promise<Plant>;
}
