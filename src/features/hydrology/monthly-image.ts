import type { MonthlyHydrologyImageKind } from './model';

/**
 * Nama tampilan keempat gambar BMKG. Satu sumber untuk sheet unggah, sheet
 * hapus, dan tab Upload › Gambar Hujan, supaya ketiganya menyebut gambar yang
 * sama dengan nama yang sama. "Prediksi", bukan "Prakiraan": istilah yang sama
 * dengan Hidrologi Bulanan (temuan QA T18, 13 Nov 2026).
 */
export const MONTHLY_IMAGE_KIND_LABEL: Record<MonthlyHydrologyImageKind, string> = {
	prediksi_curah_hujan: 'Prediksi Curah Hujan',
	prediksi_sifat_hujan: 'Prediksi Sifat Hujan',
	realisasi_curah_hujan: 'Realisasi Curah Hujan',
	realisasi_sifat_hujan: 'Realisasi Sifat Hujan'
};
