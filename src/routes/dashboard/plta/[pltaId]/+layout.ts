import { error } from '@sveltejs/kit';
import {
	ensurePlantDetail,
	getPLTAErrorMessage,
	getPlantDisplayName,
	isValidPLTAId,
	type ActivePLTA
} from '../../../../features/plta';
import { ApiError } from '$api/http';
import { UNKNOWN_PLANT_NOTICE, redirectWithNotice } from '$core/guards';
import { queryClient } from '$core/query-client';

/**
 * PLTA aktif diselesaikan sekali di sini, lalu dibagikan ke seluruh halaman di
 * bawahnya lewat context.
 *
 * Karena `load` menunggu datanya siap, halaman turunan dijamin menerima PLTA
 * yang sudah ada — persis perilaku versi React, yang baru merender turunan
 * setelah datanya tersedia.
 */
export const load = async ({ params, parent }): Promise<{ activePLTA: ActivePLTA }> => {
	// Guard sesi di layout dashboard harus selesai lebih dulu. Tanpa ini request
	// detail PLTA berlomba dengan pemulihan sesi saat halaman di-refresh, dan
	// pengguna yang sesinya habis melihat galat 503 alih-alih halaman login.
	await parent();

	const { pltaId } = params;

	// Bentuk id tidak valid berarti tautan rusak, bukan kegagalan server.
	if (!isValidPLTAId(pltaId)) {
		redirectWithNotice('/dashboard/overview', UNKNOWN_PLANT_NOTICE);
	}

	let plant;
	try {
		plant = await ensurePlantDetail(queryClient, pltaId);
	} catch (cause) {
		// PLTA yang tidak ada (dihapus, salah salin) bukan gangguan server.
		if (ApiError.isApiError(cause) && cause.status === 404) {
			redirectWithNotice('/dashboard/overview', UNKNOWN_PLANT_NOTICE);
		}
		error(503, getPLTAErrorMessage(cause));
	}

	return { activePLTA: { pltaId, plant, displayName: getPlantDisplayName(plant) } };
};
