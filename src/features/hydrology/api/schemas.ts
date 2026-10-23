import { z } from 'zod';

const nullableNumberSchema = z.number().nullable().optional().default(null);
const nullableStringSchema = z.string().nullable().optional().default(null);

/**
 * Parameter telemetri di balik sebuah metrik, bila nilainya memang diisi manual
 * DAN PLTA-nya punya tag `upload` untuk itu. Server yang menentukan, jadi FE
 * tidak perlu menebak dari nama kunci metrik.
 */
const apiDashboardMetricInputSchema = z.object({
	parameter: z.string().min(1),
	// Station kosong dikirim sebagai `""` atau `null` tergantung tagnya; keduanya
	// berarti "parameter ini tidak dipecah per station".
	station: z
		.string()
		.nullable()
		.optional()
		.transform((value) => value ?? '')
});

/**
 * Satu sub-sumber metrik multi-stasiun. `input`-nya sendiri: hujan dan pintu
 * spillway G1–G4 diisi satu per satu, sedangkan `input` di tingkat metrik
 * (agregatnya) `null` karena agregat tidak punya tag.
 */
const apiDashboardStationMetricSchema = z.object({
	station: z.string(),
	label: z.string(),
	value: nullableNumberSchema,
	time: nullableStringSchema,
	input: apiDashboardMetricInputSchema.nullable().optional().default(null)
});

const apiDashboardMetricSchema = z.object({
	input: apiDashboardMetricInputSchema.nullable().optional().default(null),
	value: nullableNumberSchema,
	unit: nullableStringSchema,
	label: z.string(),
	time: nullableStringSchema,
	source: z.enum(['measured', 'derived', 'plan', 'constant']),
	stations: z.array(apiDashboardStationMetricSchema).nullable().optional().default(null),
	/**
	 * Disembunyikan operator untuk PLTA ini. Server tetap mengirim metriknya
	 * lengkap dengan nilai; layar yang memutuskan tidak menampilkannya.
	 * Hilang dianggap tampil.
	 */
	hidden: z.boolean().optional().default(false),
	/**
	 * Posisi di panelnya (0 = teratas) menurut pengaturan PLTA ini. Urutan kunci
	 * JSON mengikuti skema server, bukan pengaturan ini. Swagger mewajibkannya,
	 * tetapi hilang tetap diterima: layar jatuh ke urutan bawaannya sendiri.
	 */
	urutan: z.number().int().nullable().optional().default(null),
	/**
	 * Hanya terisi pada `dmn_beban_penuh`: dari mana penyebutnya berasal —
	 * `unit` bila dihitung dari unit terpilih, `manual` bila operator mengisi
	 * DMN sendiri.
	 */
	mode: nullableStringSchema,
	/** Nomor unit yang ikut dihitung saat `mode` = `unit`. */
	units: z.array(z.number().int()).nullable().optional().default(null)
});

const apiDashboardMetricGroupSchema = z.record(z.string(), apiDashboardMetricSchema);

export type ApiDashboardMetricGroup = z.infer<typeof apiDashboardMetricGroupSchema>;

export const apiDailyHydrologySchema = z.object({
	tanggal: z.string(),
	constants: z.record(z.string(), z.unknown()).nullable().optional().default(null),
	hulu: apiDashboardMetricGroupSchema,
	dam: apiDashboardMetricGroupSchema,
	hilir: apiDashboardMetricGroupSchema,
	pending_formulas: z.array(z.string()).optional().default([])
});

// Field wajib-tapi-boleh-null (sesuai Swagger) sengaja TIDAK diberi `default`:
// kunci yang hilang berarti kontrak berubah, dan lebih baik layar menampilkan
// galat kontrak daripada diam-diam menampilkan N/A untuk seluruh angka.
const requiredNullableNumberSchema = z.number().nullable();
const requiredNullableStringSchema = z.string().nullable();
const achievementStatusSchema = z.enum(['tercapai', 'tidak_tercapai']).nullable();

export const apiMonthlyHydrologySchema = z.object({
	id: z.string().uuid().nullable(),
	plta_id: z.string().uuid(),
	tahun: z.number(),
	bulan: z.number().min(1).max(12),
	prediksi_hidrologi: requiredNullableStringSchema,
	realisasi_hidrologi: requiredNullableStringSchema,
	image_prediksi_sifat_hujan: nullableStringSchema,
	image_prediksi_curah_hujan: nullableStringSchema,
	image_realisasi_sifat_hujan: nullableStringSchema,
	image_realisasi_curah_hujan: nullableStringSchema,
	prediksi_ketersediaan_energi_primer: requiredNullableNumberSchema,
	target_produksi_energi_listrik: requiredNullableNumberSchema,
	realisasi_produksi_energi_listrik: requiredNullableNumberSchema,
	prediksi_akumulasi_ketersediaan_energi_primer: requiredNullableNumberSchema,
	target_akumulasi_produksi_energi_listrik: requiredNullableNumberSchema,
	realisasi_akumulasi_produksi_energi_listrik: requiredNullableNumberSchema,
	prosentase_prediksi_ketersediaan_energi_primer_vs_target_produksi_energi_listrik:
		requiredNullableNumberSchema,
	status_pencapaian_target_produksi_energi_listrik: achievementStatusSchema,
	prosentase_prediksi_akumulasi_ketersediaan_energi_primer_vs_target_akumulasi_produksi_energi_listrik:
		requiredNullableNumberSchema,
	status_pencapaian_target_akumulasi_produksi_energi_listrik: achievementStatusSchema
});

const apiDmnUnitSchema = z.object({
	unit: z.number().int(),
	dmn_mw: z.number()
});

const apiDashboardPLTASchema = z.object({
	id: z.string().uuid(),
	code: z.string(),
	name: z.string(),
	constants: z.record(z.string(), z.unknown()).nullable().optional().default(null),
	/** DMN per unit pembangkit — dasar pemilih penyebut SHFL. */
	dmn_units: z.array(apiDmnUnitSchema).nullable().optional().default([])
});

/** `GET /dashboard/plta/{id}/daily` — panel harian saja. */
export const apiPLTADailyDashboardSchema = z.object({
	plta: apiDashboardPLTASchema,
	daily: apiDailyHydrologySchema.nullable()
});

/** `GET /dashboard/plta/{id}/monthly` — panel satu bulan saja. */
export const apiPLTAMonthlyDashboardSchema = z.object({
	plta: apiDashboardPLTASchema,
	monthly: apiMonthlyHydrologySchema.nullable()
});

export const apiMonthlyHydrologyExcelResultSchema = z.object({
	baris_diproses: z.number(),
	dibuat: z.number(),
	diperbarui: z.number(),
	plta: z.array(z.string()).nullable().optional().default([]),
	periode: z.array(z.string()).nullable().optional().default([])
});

/** `POST /hydrology/daily/excel` — respons sukses unggah Excel harian seluruh PLTA. */
export const apiDailyHydrologyExcelResultSchema = z.object({
	baris_diproses: z.number(),
	titik_ditulis: z.number(),
	titik_diwarisi: z.number().int().nonnegative().optional().default(0),
	plta: z.array(z.string()).nullable().optional().default([]),
	periode: z.array(z.string()).nullable().optional().default([])
});

/** Isi `detail` pada respons 400 endpoint impor Excel. */
export const apiMonthlyHydrologyExcelErrorSchema = z.object({
	pesan: z.string().nullable().optional().default(null),
	rincian: z
		.array(
			z.object({
				baris: z.number(),
				kode_plta: z.string().nullable().optional().default(null),
				pesan: z.string()
			})
		)
		.nullable()
		.optional()
		.default([])
});

export const apiMonthlyHydrologyPageSchema = z.object({
	items: z.array(apiMonthlyHydrologySchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	pages: z.number()
});

const apiOverviewAverageSchema = z.object({
	rata2: z.number().nullable(),
	/** Jumlah data yang benar-benar ikut dihitung. */
	n: z.number().int().nonnegative()
});

/** Satu blok pencapaian: `bulanan` atau `akumulasi`. */
const apiOverviewAchievementSchema = z.object({
	prosentase_rata2: z.number().nullable(),
	prosentase_rata2_n: z.number().int().nonnegative(),
	prosentase_agregat: z.number().nullable(),
	total_prediksi: z.number(),
	total_target: z.number(),
	jumlah_tercapai: z.number().int().nonnegative(),
	jumlah_tidak_tercapai: z.number().int().nonnegative(),
	jumlah_belum_dinilai: z.number().int().nonnegative(),
	/**
	 * Bulan pertama/terakhir yang dirangkum blok ini, `YYYY-MM`. Blok `akumulasi`
	 * hanya memakai SATU bulan — yang terakhir berdata dalam rentang — karena
	 * nilai akumulasi tiap bulan sudah Januari s.d. bulan itu. Ditambahkan
	 * backend 6–7 Okt 2026; hilang dianggap tidak diketahui.
	 */
	periode_awal: z.string().nullable().optional().default(null),
	periode_akhir: z.string().nullable().optional().default(null)
});

/**
 * `GET /hydrology/monthly/overview` — ringkasan satu periode lintas SELURUH
 * PLTA. `rerata` bertipe objek bebas di Swagger ("kunci = keenam bidang
 * angka"); kuncinya dibaca satu per satu di mapper, sehingga kunci yang tidak
 * ada menjadi "tidak ada data", bukan galat kontrak.
 */
export const apiMonthlyHydrologyOverviewSchema = z.object({
	tahun: z.number().int(),
	bulan: z.number().int().nullable(),
	periode: z.string(),
	jumlah_baris: z.number().int().nonnegative(),
	jumlah_plta: z.number().int().nonnegative(),
	bulanan: apiOverviewAchievementSchema,
	akumulasi: apiOverviewAchievementSchema,
	rerata: z.record(z.string(), apiOverviewAverageSchema)
});

/** `GET /hydrology/monthly/chart`. Bulan yang belum diisi bernilai `null`, bukan 0. */
export const apiMonthlyChartSchema = z.object({
	plta_id: z.string().uuid().nullable(),
	jumlah_plta: z.number().int().nonnegative(),
	seri: z.array(
		z.object({
			periode: z.string(),
			tahun: z.number().int(),
			bulan: z.number().int().min(1).max(12),
			target_akumulasi_produksi_energi_listrik: z.number().nullable(),
			realisasi_akumulasi_produksi_energi_listrik: z.number().nullable(),
			n_target: z.number().int().nonnegative(),
			n_realisasi: z.number().int().nonnegative(),
			/** `s.d. Bulan Maret 2026`: nilai titik ini = posisi Januari s.d. bulan itu. */
			sd_bulan: z.string().nullable().optional().default(null)
		})
	)
});

export type ApiMonthlyChart = z.infer<typeof apiMonthlyChartSchema>;

/**
 * `GET`/`PUT /dashboard/plta/{id}/daily/visibility` — tata letak panel harian:
 * status sembunyi dan urutan. `metrik` sudah dalam urutan EFEKTIF per panel.
 */
export const apiDailyVisibilitySchema = z.object({
	plta_id: z.string().uuid(),
	jumlah_tersembunyi: z.number().int().nonnegative(),
	metrik: z.array(
		z.object({
			key: z.string().min(1),
			panel: z.enum(['hulu', 'dam', 'hilir']),
			label: z.string(),
			hidden: z.boolean(),
			/** Posisi efektif di panelnya (0 = teratas). */
			urutan: z.number().int().nullable().optional().default(null),
			/** `false` = masih posisi bawaan, belum pernah diurutkan untuk PLTA ini. */
			urutan_diatur: z.boolean().optional().default(false),
			/** Nama bawaan sistem; hilang = sama dengan `label` (server lama). */
			label_bawaan: z.string().nullable().optional().default(null),
			label_diatur: z.boolean().optional().default(false)
		})
	)
});

export type ApiDailyVisibility = z.infer<typeof apiDailyVisibilitySchema>;

/** `GET`/`PUT /hydrology/monthly/labels` — urut seperti di panel. */
export const apiMonthlyFieldLabelsSchema = z.object({
	jumlah_diatur: z.number().int().nonnegative(),
	bidang: z.array(
		z.object({
			key: z.string().min(1),
			label: z.string(),
			label_bawaan: z.string(),
			label_diatur: z.boolean(),
			akumulasi: z.boolean(),
			updated_by: z.string().nullable().optional().default(null),
			updated_at: z.string().nullable().optional().default(null)
		})
	)
});

export type ApiMonthlyFieldLabels = z.infer<typeof apiMonthlyFieldLabelsSchema>;

/** `400` dari kedua `PUT …/labels` — tidak ada yang disimpan. */
/**
 * `400` impor Excel harian bila isi berkasnya bermasalah. Berbeda dengan
 * bulanan, `rincian` berupa satu kalimat per baris/sel (maks. 50), bukan objek.
 */
export const apiDailyHydrologyExcelErrorSchema = z.object({
	pesan: z.string(),
	rincian: z.array(z.string()).optional().default([])
});

export const apiLabelErrorSchema = z.object({
	pesan: z.string(),
	masalah: z.array(z.string()).optional().default([])
});
export type ApiMonthlyHydrologyOverview = z.infer<typeof apiMonthlyHydrologyOverviewSchema>;
export type ApiMonthlyHydrologyExcelResult = z.infer<typeof apiMonthlyHydrologyExcelResultSchema>;
export type ApiDailyHydrology = z.infer<typeof apiDailyHydrologySchema>;
export type ApiMonthlyHydrology = z.infer<typeof apiMonthlyHydrologySchema>;
