import { formatDayMonthYearWIB } from '$shared/lib/date';
import type { Plant, UploadTab } from '$features/plta';

/**
 * Aturan murni halaman Upload.
 *
 * Dipisah dari komponen supaya bisa diuji tanpa merender halaman: ketiganya
 * gagal secara diam-diam kalau salah — tab terbuka di posisi yang keliru, berkas
 * terunggah untuk PLTA yang salah, atau tombol unduh mati padahal rentangnya
 * sah.
 */

export const UPLOAD_TABS: { value: UploadTab; label: string; description: string }[] = [
	{
		value: 'excel',
		label: 'Excel Bulanan',
		description:
			'Unggah satu berkas Excel untuk mengisi ringkasan hidrologi bulanan seluruh PLTA sekaligus'
	},
	{
		value: 'harian',
		label: 'Excel Harian',
		description: 'Unggah satu berkas Excel untuk mengisi nilai harian manual seluruh PLTA sekaligus'
	},
	{
		value: 'prakiraan',
		label: 'Prakiraan Hujan',
		description: 'Unggah gambar curah hujan dan sifat hujan bulanan untuk seluruh PLTA'
	},
	{
		value: 'eva',
		label: 'Input EVA',
		description: 'Unggah data elevasi dan volume waduk untuk memperbarui kurva EVA satu PLTA'
	}
];

const DEFAULT_TAB: UploadTab = 'excel';

/** Tab dari `?tab=`. Nilai tak dikenal jatuh ke tab pertama, bukan halaman kosong. */
export function parseUploadTab(value: string | null): UploadTab {
	return UPLOAD_TABS.some((tab) => tab.value === value) ? (value as UploadTab) : DEFAULT_TAB;
}

export function uploadTabMeta(tab: UploadTab): (typeof UPLOAD_TABS)[number] {
	return UPLOAD_TABS.find((item) => item.value === tab) ?? UPLOAD_TABS[0];
}

/**
 * PLTA untuk tab Input EVA: `?plta=` bila ada di katalog, selain itu PLTA
 * bawaan. Id asing tidak boleh membuat panel kosong — bookmark lama dan salah
 * ketik sama-sama berakhir di PLTA yang benar-benar ada.
 */
export function resolveEvaPlant(plants: Plant[], requestedId: string | null): Plant | undefined {
	const requested = requestedId ? plants.find((plant) => plant.id === requestedId) : undefined;

	return requested ?? plants.find((plant) => plant.isActive) ?? plants[0];
}

/** Batas server untuk satu template harian — pagar salah ketik. */
export const MAX_DAILY_TEMPLATE_RANGE_DAYS = 92;

const DAY_MS = 24 * 60 * 60 * 1_000;

/**
 * Alasan rentang tanggal template harian ditolak, atau `null` bila sah.
 * Diperiksa di klien supaya operator tidak menunggu unduhan yang sudah pasti
 * ditolak server dengan pesan yang sama.
 */
export function dailyTemplateRangeError(from: string, to: string): string | null {
	if (!from || !to) return 'Isi tanggal awal dan akhir.';

	const span = (Date.parse(to) - Date.parse(from)) / DAY_MS;
	if (!Number.isFinite(span)) return 'Tanggal tidak valid.';
	if (span < 0) return 'Tanggal akhir tidak boleh sebelum tanggal awal.';
	if (span + 1 > MAX_DAILY_TEMPLATE_RANGE_DAYS) {
		return `Rentang maksimal ${MAX_DAILY_TEMPLATE_RANGE_DAYS} hari.`;
	}

	return null;
}

/** `hidrologi_harian_2026-09-01_sd_2026-09-30.xlsx` — rentangnya terbaca dari nama berkas. */
export function dailyTemplateFilename(from: string, to: string): string {
	return to === from ? `hidrologi_harian_${from}.xlsx` : `hidrologi_harian_${from}_sd_${to}.xlsx`;
}

/** Tanggal-tanggal hasil unggah dirangkum jadi satu rentang untuk dibaca operator. */
export function formatUploadedPeriods(periods: string[]): string {
	const sorted = [...periods].sort();
	const first = sorted.at(0);
	const last = sorted.at(-1);
	if (!first || !last) return '';

	return first === last
		? formatDayMonthYearWIB(first)
		: `${formatDayMonthYearWIB(first)} – ${formatDayMonthYearWIB(last)}`;
}
