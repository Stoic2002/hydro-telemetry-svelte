export type PLTADashboardPage =
	| 'overview'
	| 'telemetering'
	| 'telemetering/bulanan'
	| 'telemetering/harian'
	| 'forecasting'
	| 'trends'
	| 'laporan'
	| 'input-ghw'
	| 'user-management'
	| 'account';

/**
 * Unggah ringkasan bulanan berlaku untuk SELURUH PLTA sekaligus, jadi rutenya
 * sengaja tidak memuat `pltaId`. Menaruhnya di bawah `/dashboard/plta/:id`
 * akan menyiratkan cakupan satu PLTA yang tidak pernah dipakai halamannya.
 */
export const TELEMETERING_UPLOAD_PATH = '/dashboard/telemetering/upload';

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
