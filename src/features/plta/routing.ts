export type PLTADashboardPage =
	| 'overview'
	| 'telemetering'
	| 'telemetering/bulanan'
	| 'telemetering/harian'
	| 'forecasting'
	| 'trends'
	| 'laporan'
	| 'user-management'
	| 'account';

/**
 * Menu Upload. Excel bulanan dan prakiraan hujan berlaku untuk SELURUH PLTA,
 * jadi rutenya sengaja tidak memuat `pltaId`. Kurva EVA memang milik satu PLTA,
 * tapi PLTA-nya dibawa lewat `?plta=` — bukan path — supaya ketiga jenis unggahan
 * tetap berada di satu halaman dan tab yang sama.
 */
export const UPLOAD_PATH = '/dashboard/upload';

/**
 * Rekap Hidrologi: ringkasan dan laporan SELURUH PLTA, jadi — seperti Upload —
 * rutenya tidak memuat `pltaId` walau menunya berada di bawah Telemetering.
 */
export const HYDROLOGY_RECAP_PATH = '/dashboard/telemetering/rekap';

export type UploadTab = 'excel' | 'harian' | 'prakiraan' | 'eva';

export function getUploadPath(tab: UploadTab): string {
	return `${UPLOAD_PATH}?tab=${tab}`;
}

/** Tanpa `pltaId`, halaman memilih PLTA bawaan. */
export function getEvaUploadPath(pltaId?: string): string {
	const base = getUploadPath('eva');
	return pltaId ? `${base}&plta=${encodeURIComponent(pltaId)}` : base;
}

export function isValidPLTAId(pltaId: string | undefined): pltaId is string {
	return Boolean(
		pltaId &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pltaId)
	);
}

export function getPLTADashboardPath(pltaId: string, page: PLTADashboardPage): string {
	return `/dashboard/plta/${encodeURIComponent(pltaId)}/${page}`;
}

export function getUnscopedDashboardPath(page: PLTADashboardPage): string {
	return `/dashboard/${page}`;
}
