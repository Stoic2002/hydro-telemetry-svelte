import { createQuery, keepPreviousData, type QueryClient } from '@tanstack/svelte-query';
import type { ListParams, Plant, PlantTagListParams } from '../model';
import { pltaRepository } from './repository';

/**
 * Berbeda dari versi React yang menerima nilai langsung, factory query di sini
 * menerima *accessor* (`() => T`). svelte-query membaca opsi lewat fungsi supaya
 * perubahan parameter memicu pengambilan ulang; menerima nilai biasa akan
 * membekukan query pada nilai saat komponen pertama dirender.
 */

const CATALOG_PAGE_LIMIT = 200;
const CATALOG_STALE_TIME = 5 * 60 * 1_000;

function normalizeListParams(params: ListParams): ListParams {
	const search = params.search?.trim();
	const page = Number.isFinite(params.page) ? Math.floor(params.page) : 1;
	const limit = Number.isFinite(params.limit) ? Math.floor(params.limit) : 20;

	return {
		page: Math.max(1, page),
		limit: Math.min(200, Math.max(1, limit)),
		search: search ? search.slice(0, 100) : undefined
	};
}

function normalizeTagListParams(params: PlantTagListParams): PlantTagListParams {
	return {
		...normalizeListParams(params),
		protocol: params.protocol,
		enabled: params.enabled
	};
}

async function fetchPlantCatalog(): Promise<Plant[]> {
	const firstPage = await pltaRepository.list({
		page: 1,
		limit: CATALOG_PAGE_LIMIT
	});

	if (firstPage.pages <= 1) return firstPage.items;

	const remainingPages = await Promise.all(
		Array.from({ length: firstPage.pages - 1 }, (_, index) =>
			pltaRepository.list({
				page: index + 2,
				limit: CATALOG_PAGE_LIMIT
			})
		)
	);

	const plantsById = new Map(
		[firstPage, ...remainingPages]
			.flatMap((page) => page.items)
			.map((plant) => [plant.id, plant] as const)
	);

	return [...plantsById.values()];
}

export const pltaQueryKeys = {
	all: ['plta'] as const,
	riverBasins: () => [...pltaQueryKeys.all, 'river-basins'] as const,
	riverBasinList: (params: ListParams) => [...pltaQueryKeys.riverBasins(), 'list', params] as const,
	lists: () => [...pltaQueryKeys.all, 'list'] as const,
	list: (params: ListParams) => [...pltaQueryKeys.lists(), params] as const,
	catalog: () => [...pltaQueryKeys.lists(), 'catalog'] as const,
	details: () => [...pltaQueryKeys.all, 'detail'] as const,
	detail: (pltaId: string) => [...pltaQueryKeys.details(), pltaId] as const,
	tags: (pltaId: string, params: PlantTagListParams) =>
		[...pltaQueryKeys.detail(pltaId), 'tags', params] as const
};

export function createRiverBasinsQuery(params: () => ListParams) {
	return createQuery(() => {
		const normalizedParams = normalizeListParams(params());

		return {
			queryKey: pltaQueryKeys.riverBasinList(normalizedParams),
			queryFn: () => pltaRepository.listRiverBasins(normalizedParams),
			placeholderData: keepPreviousData,
			staleTime: CATALOG_STALE_TIME
		};
	});
}

export function createPLTAListQuery(params: () => ListParams) {
	return createQuery(() => {
		const normalizedParams = normalizeListParams(params());

		return {
			queryKey: pltaQueryKeys.list(normalizedParams),
			queryFn: () => pltaRepository.list(normalizedParams),
			placeholderData: keepPreviousData,
			staleTime: CATALOG_STALE_TIME
		};
	});
}

export function createPlantCatalogQuery(enabled: () => boolean = () => true) {
	return createQuery(() => ({
		queryKey: pltaQueryKeys.catalog(),
		queryFn: fetchPlantCatalog,
		enabled: enabled(),
		staleTime: CATALOG_STALE_TIME
	}));
}

export function createPLTADetailQuery(pltaId: () => string) {
	return createQuery(() => {
		const id = pltaId();

		return {
			queryKey: pltaQueryKeys.detail(id),
			queryFn: () => pltaRepository.getById(id),
			enabled: Boolean(id),
			staleTime: CATALOG_STALE_TIME
		};
	});
}

export function createPLTATagsQuery(pltaId: () => string, params: () => PlantTagListParams) {
	return createQuery(() => {
		const id = pltaId();
		const normalizedParams = normalizeTagListParams(params());

		return {
			queryKey: pltaQueryKeys.tags(id, normalizedParams),
			queryFn: () => pltaRepository.listTags(id, normalizedParams),
			enabled: Boolean(id),
			placeholderData: keepPreviousData
		};
	});
}

/**
 * Katalog PLTA di luar konteks komponen — dipakai `load` rute untuk menentukan
 * PLTA bawaan pada tautan lama yang belum memuat `pltaId`.
 *
 * Memakai `ensureQueryData`, bukan `fetchQuery`: kalau katalognya sudah ada di
 * cache, redirect terjadi tanpa satu pun request tambahan.
 */
export async function ensurePlantCatalog(queryClient: QueryClient): Promise<Plant[]> {
	return queryClient.ensureQueryData({
		queryKey: pltaQueryKeys.catalog(),
		queryFn: fetchPlantCatalog,
		staleTime: CATALOG_STALE_TIME
	});
}

/** PLTA aktif pertama, atau PLTA pertama bila tidak ada yang aktif. */
export function pickDefaultPlant(plants: Plant[]): Plant | undefined {
	return plants.find((plant) => plant.isActive) ?? plants[0];
}

/**
 * Detail satu PLTA di luar konteks komponen — dipakai `load` rute
 * `/dashboard/plta/[pltaId]` untuk menyelesaikan PLTA aktif sebelum halaman di
 * bawahnya dirender. Halaman jadi tidak perlu lagi menangani kondisi datanya
 * kosong.
 */
export async function ensurePlantDetail(queryClient: QueryClient, pltaId: string): Promise<Plant> {
	return queryClient.ensureQueryData({
		queryKey: pltaQueryKeys.detail(pltaId),
		queryFn: () => pltaRepository.getById(pltaId),
		staleTime: CATALOG_STALE_TIME
	});
}
