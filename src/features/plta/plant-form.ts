import type {
	Plant,
	PlantChanges,
	PlantInput,
	RiverBasin,
	RiverBasinChanges,
	RiverBasinInput
} from './model';

/** Batas panjang dari Swagger (`PLTACreate`, `WilayahSungaiCreate`). */
export const CODE_MAX_LENGTH = 32;
export const NAME_MAX_LENGTH = 128;

/** Rasio beban → outflow bawaan server untuk PLTA baru. */
export const DEFAULT_BEBAN_TO_OUTFLOW = { num: 204, den: 180 } as const;

/**
 * Isian form PLTA. Angka berasal dari `<input type="number">`, yang bisa
 * mengikat `null`, `undefined`, atau `NaN` saat dikosongkan — semuanya dibaca
 * sebagai kosong.
 */
export interface PlantFormValues {
	code: string;
	name: string;
	riverBasinId: string;
	latitude: number | null | undefined;
	longitude: number | null | undefined;
	capacityMw: number | null | undefined;
	description: string;
	isActive: boolean;
	bebanToOutflowNum: number | null | undefined;
	bebanToOutflowDen: number | null | undefined;
}

export type PlantFormField = keyof PlantFormValues;
export type FormErrors<TField extends string> = Partial<Record<TField, string>>;

export type ParsedForm<TInput, TField extends string> =
	{ ok: true; input: TInput } | { ok: false; errors: FormErrors<TField> };

function numberOrNull(value: number | null | undefined): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Spasi ganda/tepi dirapikan; kosong = `null` untuk bidang opsional. */
function tidy(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

function optionalText(value: string): string | null {
	const tidied = tidy(value);
	return tidied === '' ? null : tidied;
}

export function emptyPlantForm(riverBasinId = ''): PlantFormValues {
	return {
		code: '',
		name: '',
		riverBasinId,
		latitude: null,
		longitude: null,
		capacityMw: null,
		description: '',
		isActive: true,
		bebanToOutflowNum: DEFAULT_BEBAN_TO_OUTFLOW.num,
		bebanToOutflowDen: DEFAULT_BEBAN_TO_OUTFLOW.den
	};
}

export function plantFormFromPlant(plant: Plant): PlantFormValues {
	return {
		code: plant.code,
		name: plant.name,
		riverBasinId: plant.riverBasinId,
		latitude: plant.latitude,
		longitude: plant.longitude,
		capacityMw: plant.capacityMw,
		description: plant.description ?? '',
		isActive: plant.isActive,
		bebanToOutflowNum: plant.bebanToOutflowNum,
		bebanToOutflowDen: plant.bebanToOutflowDen
	};
}

/**
 * Isian → badan permintaan, atau galat per bidang. Yang pasti ditolak server
 * ditolak di sini lebih dulu supaya pesannya menempel di bidangnya. Koordinat
 * diisi berpasangan: satu sisi saja tidak bisa digambar di peta Overview.
 */
export function parsePlantForm(values: PlantFormValues): ParsedForm<PlantInput, PlantFormField> {
	const errors: FormErrors<PlantFormField> = {};

	const code = tidy(values.code);
	if (!code) errors.code = 'Kode wajib diisi.';
	else if (code.length > CODE_MAX_LENGTH) errors.code = `Maksimal ${CODE_MAX_LENGTH} karakter.`;

	const name = tidy(values.name);
	if (!name) errors.name = 'Nama wajib diisi.';
	else if (name.length > NAME_MAX_LENGTH) errors.name = `Maksimal ${NAME_MAX_LENGTH} karakter.`;

	if (!values.riverBasinId) errors.riverBasinId = 'Pilih Wilayah Sungai.';

	const latitude = numberOrNull(values.latitude);
	const longitude = numberOrNull(values.longitude);
	if (latitude !== null && (latitude < -90 || latitude > 90)) {
		errors.latitude = 'Lintang antara -90 dan 90.';
	}
	if (longitude !== null && (longitude < -180 || longitude > 180)) {
		errors.longitude = 'Bujur antara -180 dan 180.';
	}
	if ((latitude === null) !== (longitude === null) && !errors.latitude && !errors.longitude) {
		errors[latitude === null ? 'latitude' : 'longitude'] = 'Isi lintang dan bujur sekaligus.';
	}

	const capacityMw = numberOrNull(values.capacityMw);
	if (capacityMw !== null && capacityMw < 0) errors.capacityMw = 'Kapasitas tidak boleh negatif.';

	const bebanToOutflowNum = numberOrNull(values.bebanToOutflowNum);
	const bebanToOutflowDen = numberOrNull(values.bebanToOutflowDen);
	if (bebanToOutflowNum === null || bebanToOutflowNum <= 0) {
		errors.bebanToOutflowNum = 'Isi angka lebih dari 0.';
	}
	if (bebanToOutflowDen === null || bebanToOutflowDen <= 0) {
		errors.bebanToOutflowDen = 'Isi angka lebih dari 0.';
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };

	return {
		ok: true,
		input: {
			code,
			name,
			riverBasinId: values.riverBasinId,
			latitude,
			longitude,
			capacityMw,
			description: optionalText(values.description),
			isActive: values.isActive,
			bebanToOutflowNum: bebanToOutflowNum as number,
			bebanToOutflowDen: bebanToOutflowDen as number
		}
	};
}

type EditableField = keyof PlantChanges;

/** Isian → nilai yang akan dikirim, tanpa validasi; dipakai untuk membandingkan. */
function normalizePlantForm(values: PlantFormValues): Record<EditableField, unknown> {
	return {
		name: tidy(values.name),
		riverBasinId: values.riverBasinId,
		latitude: numberOrNull(values.latitude),
		longitude: numberOrNull(values.longitude),
		capacityMw: numberOrNull(values.capacityMw),
		description: optionalText(values.description),
		isActive: values.isActive,
		bebanToOutflowNum: numberOrNull(values.bebanToOutflowNum),
		bebanToOutflowDen: numberOrNull(values.bebanToOutflowDen)
	};
}

/**
 * Ubah PLTA: hanya bidang yang benar-benar berubah yang dikirim `PATCH`, dan
 * **hanya bidang itu yang divalidasi**. Sebagian PLTA tersimpan dengan data
 * yang tidak lolos aturan form (mis. lintang tanpa bujur, kode lebih dari 32
 * karakter); dulu seluruh isian divalidasi, sehingga mengubah status saja
 * tidak pernah bisa disimpan di PLTA itu — tombol Simpan mati tanpa pesan
 * (laporan tim 27 Okt 2026). Lintang dan bujur dinilai berpasangan: mengubah
 * salah satunya ikut memeriksa keduanya. Kode tidak termasuk — server tidak
 * menerimanya pada pembaruan.
 */
export function parsePlantEdit(
	saved: Plant,
	values: PlantFormValues
): ParsedForm<PlantChanges, PlantFormField> {
	const next = normalizePlantForm(values);
	const current = normalizePlantForm(plantFormFromPlant(saved));
	const changed = (Object.keys(next) as EditableField[]).filter(
		(key) => next[key] !== current[key]
	);

	const checked = new Set<PlantFormField>(changed);
	if (checked.has('latitude') || checked.has('longitude')) {
		checked.add('latitude');
		checked.add('longitude');
	}

	const parsed = parsePlantForm({ ...values, code: saved.code });
	if (!parsed.ok) {
		const errors: FormErrors<PlantFormField> = {};
		for (const field of checked) {
			if (parsed.errors[field]) errors[field] = parsed.errors[field];
		}
		if (Object.keys(errors).length > 0) return { ok: false, errors };
	}

	const changes: Record<string, unknown> = {};
	for (const key of changed) changes[key] = next[key];
	return { ok: true, input: changes as PlantChanges };
}

export interface RiverBasinFormValues {
	code: string;
	name: string;
	description: string;
}

export type RiverBasinFormField = keyof RiverBasinFormValues;

export function riverBasinFormFrom(riverBasin: RiverBasin | null): RiverBasinFormValues {
	return {
		code: riverBasin?.code ?? '',
		name: riverBasin?.name ?? '',
		description: riverBasin?.description ?? ''
	};
}

export function parseRiverBasinForm(
	values: RiverBasinFormValues
): ParsedForm<RiverBasinInput, RiverBasinFormField> {
	const errors: FormErrors<RiverBasinFormField> = {};

	const code = tidy(values.code);
	if (!code) errors.code = 'Kode wajib diisi.';
	else if (code.length > CODE_MAX_LENGTH) errors.code = `Maksimal ${CODE_MAX_LENGTH} karakter.`;

	const name = tidy(values.name);
	if (!name) errors.name = 'Nama wajib diisi.';
	else if (name.length > NAME_MAX_LENGTH) errors.name = `Maksimal ${NAME_MAX_LENGTH} karakter.`;

	if (Object.keys(errors).length > 0) return { ok: false, errors };

	return { ok: true, input: { code, name, description: optionalText(values.description) } };
}

/**
 * Ubah Wilayah Sungai: hanya nama dan deskripsi, dan hanya yang berubah yang
 * divalidasi — sama alasannya dengan `parsePlantEdit`. Kode tidak bisa diubah.
 */
export function parseRiverBasinEdit(
	saved: RiverBasin,
	values: RiverBasinFormValues
): ParsedForm<RiverBasinChanges, RiverBasinFormField> {
	const changes: RiverBasinChanges = {};
	const name = tidy(values.name);
	const description = optionalText(values.description);
	if (name !== saved.name) changes.name = name;
	if (description !== saved.description) changes.description = description;

	if (changes.name !== undefined) {
		const parsed = parseRiverBasinForm({ ...values, code: saved.code });
		if (!parsed.ok && parsed.errors.name)
			return { ok: false, errors: { name: parsed.errors.name } };
	}
	return { ok: true, input: changes };
}
