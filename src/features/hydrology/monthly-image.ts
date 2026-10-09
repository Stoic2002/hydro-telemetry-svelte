import type { MonthlyHydrologyImageKind } from './model';

/**
 * Nama tampilan keempat gambar BMKG. Satu sumber untuk sheet unggah, sheet
 * hapus, dan tab Upload › Gambar Hujan, supaya ketiganya menyebut gambar yang
 * sama dengan nama yang sama.
 */
export const MONTHLY_IMAGE_KIND_LABEL: Record<MonthlyHydrologyImageKind, string> = {
	prediksi_curah_hujan: 'Prakiraan Curah Hujan',
	prediksi_sifat_hujan: 'Prakiraan Sifat Hujan',
	realisasi_curah_hujan: 'Realisasi Curah Hujan',
	realisasi_sifat_hujan: 'Realisasi Sifat Hujan'
};
