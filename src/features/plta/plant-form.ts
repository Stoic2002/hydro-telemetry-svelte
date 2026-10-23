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

/**
 * Bidang yang benar-benar berubah dari data tersimpan — hanya itu yang dikirim
 * `PATCH`. Kode tidak termasuk: server tidak menerimanya pada pembaruan.
 */
export function plantChanges(saved: Plant, input: PlantInput): PlantChanges {
	const current: Omit<PlantInput, 'code'> = {
		name: saved.name,
		riverBasinId: saved.riverBasinId,
		latitude: saved.latitude,
		longitude: saved.longitude,
		capacityMw: saved.capacityMw,
		description: saved.description,
		isActive: saved.isActive,
		bebanToOutflowNum: saved.bebanToOutflowNum,
		bebanToOutflowDen: saved.bebanToOutflowDen
	};
	const changes: Record<string, unknown> = {};
	for (const key of Object.keys(current) as (keyof typeof current)[]) {
		if (input[key] !== current[key]) changes[key] = input[key];
	}
	return changes as PlantChanges;
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

export function riverBasinChanges(saved: RiverBasin, input: RiverBasinInput): RiverBasinChanges {
	const changes: RiverBasinChanges = {};
	if (input.name !== saved.name) changes.name = input.name;
	if (input.description !== saved.description) changes.description = input.description;
	return changes;
}
