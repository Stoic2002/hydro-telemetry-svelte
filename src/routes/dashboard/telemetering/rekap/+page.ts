import { redirectToDefaultPLTA } from '$core/guards';

/**
 * Rekap Hidrologi sudah dipecah (29 Sep 2026): ringkasan armada pindah ke
 * Overview, unduhan laporan ke tab Laporan Hidrologi di menu Laporan. Tautan
 * lama dialihkan ke tab laporan — itu yang paling sering dicari lewat
 * bookmark — beserta `?tahun=`, `?bulan=`, dan `?plta=`-nya.
 */
export const load = ({ url }) => {
	// Salinan sekali pakai untuk menyusun URL tujuan.
	const params = new URLSearchParams(url.searchParams);
	params.set('tab', 'hidrologi');
	return redirectToDefaultPLTA('laporan', `?${params.toString()}`);
};
