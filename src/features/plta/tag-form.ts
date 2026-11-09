import { MONITORING_PARAMETERS } from '../monitoring';
import type { ParameterInfo, TagFormula, TagInput, TagInputProtocol, TagPanel } from './model';
import type { FormErrors, ParsedForm } from './plant-form';

/** Batas panjang dari Swagger (`TagMappingCreate`). */
export const TAG_STATION_MAX_LENGTH = 64;
export const TAG_LABEL_MAX_LENGTH = 128;
export const TAG_ADDRESS_MAX_LENGTH = 512;
export const TAG_PATH_MAX_LENGTH = 256;

/**
 * Pilihan parameter dari katalog resmi `GET /parameter`, dengan kuncinya di
 * samping nama. Rumus kustom tidak ditawarkan (hanya yang bukan formulasi,
 * rapat tim 27 Okt 2026). Bila katalog gagal dimuat, kuncinya saja yang tampil
 * supaya form tetap bisa dipakai.
 */
export function tagParameterOptions(catalog: readonly ParameterInfo[] | undefined) {
	const items =
		catalog && catalog.length > 0
			? catalog.filter((item) => item.key !== 'rumus' && item.group !== 'rumus')
			: MONITORING_PARAMETERS.filter((key) => key !== 'rumus').map((key) => ({ key, label: '' }));

	return items
		.map((item) => ({
			value: item.key,
			label: item.label ? `${item.label} · ${item.key}` : item.key
		}))
		.sort((left, right) => left.label.localeCompare(right.label, 'id-ID'));
}

/**
 * Protokol yang boleh dipilih. `derived` (formulasi) ditawarkan sejak Swagger
 * 9 Nov 2026 — dulu server menolaknya, dan rapat tim 27 Okt 2026 membatasi form
 * ini pada parameter yang bukan formulasi. Jenis formulasinya dipilih
 * terpisah (`DERIVED_KIND_OPTIONS`); alamatnya tidak diisi pengguna.
 */
export const TAG_PROTOCOL_OPTIONS: {
	value: TagInputProtocol;
	label: string;
	addressLabel: string;
	addressPlaceholder: string;
	addressHint: string;
}[] = [
	{
		value: 'opcua',
		label: 'OPC UA',
		addressLabel: 'Node ID',
		addressPlaceholder: 'ns=2;s=Channel1.Device1.TMA',
		addressHint: 'Diawali ns=. Berlaku paling lambat 5 menit setelah disimpan.'
	},
	{
		value: 'modbus',
		label: 'Modbus',
		addressLabel: 'Register',
		addressPlaceholder: '40001 atau 1:40001',
		addressHint: 'Nomor register, atau unit:register.'
	},
	{
		value: 'sql',
		label: 'SQL',
		addressLabel: 'Query',
		addressPlaceholder: 'SELECT nilai FROM …',
		addressHint: 'Satu query SELECT yang menghasilkan satu angka, tanpa titik koma.'
	},
	{
		value: 'rest',
		label: 'REST',
		addressLabel: 'URL',
		addressPlaceholder: 'https://…',
		addressHint: 'Diawali http:// atau https://.'
	},
	{
		value: 'upload',
		label: 'Input manual',
		addressLabel: 'Alamat',
		addressPlaceholder: 'upload',
		addressHint: 'Diisi operator lewat Input data atau Upload; alamatnya cukup "upload".'
	},
	{
		value: 'derived',
		label: 'Formulasi (dihitung server)',
		addressLabel: 'Alamat',
		addressPlaceholder: '',
		addressHint: ''
	}
];

/** Jenis formulasi `derived` yang diterima `POST /tags`. */
export type DerivedKind = 'swc' | 'rumus';

export const DERIVED_KIND_OPTIONS: {
	value: DerivedKind;
	label: string;
	address: string;
	/** Parameter yang dikunci server untuk jenis ini. */
	parameter: string;
}[] = [
	{
		value: 'swc',
		label: 'Debit unit dari SWC',
		address: 'computed:swc',
		parameter: 'total_outflow'
	},
	{ value: 'rumus', label: 'Rumus kustom', address: 'rumus', parameter: 'rumus' }
];

/** Station unit turbin untuk `computed:swc`: `T1`, `T2`, … (Swagger `POST /tags`). */
export const SWC_STATION_PATTERN = /^T\d+$/;

export function derivedKindConfig(kind: DerivedKind) {
	return DERIVED_KIND_OPTIONS.find((option) => option.value === kind) ?? DERIVED_KIND_OPTIONS[0];
}

export const TAG_PANEL_OPTIONS: { value: TagPanel | ''; label: string }[] = [
	{ value: '', label: 'Tidak di panel' },
	{ value: 'hulu', label: 'Hulu' },
	{ value: 'dam', label: 'Bendungan' },
	{ value: 'hilir', label: 'Hilir' }
];

export interface TagFormValues {
	parameter: string;
	station: string;
	label: string;
	protocol: TagInputProtocol;
	/** Hanya berlaku untuk protokol `derived`. */
	derivedKind: DerivedKind;
	address: string;
	unit: string;
	panel: TagPanel | '';
	enabled: boolean;
	scale: number | null | undefined;
	offset: number | null | undefined;
	minValid: number | null | undefined;
	maxValid: number | null | undefined;
	/** Satu header per baris, `Nama: nilai`. Hanya untuk REST. */
	httpHeaders: string;
	valuePath: string;
	timestampPath: string;
}

/** `formula` = galat isian rumus kustom, yang tampil di editor rumusnya sendiri. */
export type TagFormField = keyof TagFormValues | 'formula';

export function emptyTagForm(): TagFormValues {
	return {
		parameter: '',
		station: '',
		label: '',
		protocol: 'upload',
		derivedKind: 'swc',
		address: 'upload',
		unit: '',
		panel: '',
		enabled: true,
		scale: 1,
		offset: 0,
		minValid: null,
		maxValid: null,
		httpHeaders: '',
		valuePath: '',
		timestampPath: ''
	};
}

function numberOrNull(value: number | null | undefined): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function optionalText(value: string): string | null {
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

/** `Nama: nilai` per baris → objek header; `null` bila ada baris tanpa titik dua. */
export function parseHttpHeaders(text: string): Record<string, string> | null {
	const headers: Record<string, string> = {};
	for (const line of text.split('\n')) {
		if (!line.trim()) continue;
		const separator = line.indexOf(':');
		if (separator <= 0) return null;
		headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
	}
	return headers;
}

/**
 * Alamat sesuai protokol, dicek sebelum dikirim supaya pesannya menempel di
 * bidangnya. Aturan dari deskripsi `POST /tags`; server tetap penentu akhir.
 */
function addressError(protocol: TagInputProtocol, address: string): string | undefined {
	if (!address) return 'Alamat wajib diisi.';
	if (address.length > TAG_ADDRESS_MAX_LENGTH)
		return `Maksimal ${TAG_ADDRESS_MAX_LENGTH} karakter.`;
	if (protocol === 'opcua' && !address.startsWith('ns=')) return 'Node ID diawali ns=.';
	if (protocol === 'modbus' && !/^\d+(:\d+)?$/.test(address)) {
		return 'Isi nomor register, atau unit:register.';
	}
	if (protocol === 'sql') {
		if (!/^select\s/i.test(address)) return 'Query harus diawali SELECT.';
		if (address.includes(';')) return 'Query tidak boleh memuat titik koma.';
	}
	if (protocol === 'rest' && !/^https?:\/\//i.test(address)) {
		return 'URL diawali http:// atau https://.';
	}
	return undefined;
}

export interface DerivedTagOptions {
	/** Rumus kustom yang sudah lolos `parseFormulaForm`; `null` bila belum. */
	formula?: TagFormula | null;
	/** `pola_kode` dari kamus rumus. */
	codePattern?: RegExp;
}

export function parseTagForm(
	pltaId: string,
	values: TagFormValues,
	options: DerivedTagOptions = {}
): ParsedForm<TagInput, TagFormField> {
	if (values.protocol === 'derived') return parseDerivedTagForm(pltaId, values, options);

	const errors: FormErrors<TagFormField> = {};

	const parameter = values.parameter;
	if (!parameter) errors.parameter = 'Pilih parameter.';

	const station = values.station.trim();
	if (station.length > TAG_STATION_MAX_LENGTH) {
		errors.station = `Maksimal ${TAG_STATION_MAX_LENGTH} karakter.`;
	}

	const label = optionalText(values.label);
	if (label && label.length > TAG_LABEL_MAX_LENGTH) {
		errors.label = `Maksimal ${TAG_LABEL_MAX_LENGTH} karakter.`;
	}

	const address = values.address.trim();
	const addressProblem = addressError(values.protocol, address);
	if (addressProblem) errors.address = addressProblem;

	const scale = numberOrNull(values.scale);
	if (scale === null) errors.scale = 'Isi angka.';
	else if (scale === 0) errors.scale = 'Skala tidak boleh 0.';
	const offset = numberOrNull(values.offset);
	if (offset === null) errors.offset = 'Isi angka.';

	const minValid = numberOrNull(values.minValid);
	const maxValid = numberOrNull(values.maxValid);
	if (minValid !== null && maxValid !== null && minValid >= maxValid) {
		errors.maxValid = 'Batas atas harus lebih besar dari batas bawah.';
	}

	const isRest = values.protocol === 'rest';
	const httpHeaders = isRest ? parseHttpHeaders(values.httpHeaders) : null;
	if (isRest && httpHeaders === null)
		errors.httpHeaders = 'Tulis satu header per baris: Nama: nilai.';
	const valuePath = isRest ? optionalText(values.valuePath) : null;
	const timestampPath = isRest ? optionalText(values.timestampPath) : null;
	if (valuePath && valuePath.length > TAG_PATH_MAX_LENGTH) {
		errors.valuePath = `Maksimal ${TAG_PATH_MAX_LENGTH} karakter.`;
	}
	if (timestampPath && timestampPath.length > TAG_PATH_MAX_LENGTH) {
		errors.timestampPath = `Maksimal ${TAG_PATH_MAX_LENGTH} karakter.`;
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };

	return {
		ok: true,
		input: {
			pltaId,
			parameter,
			station,
			label,
			protocol: values.protocol,
			address,
			httpHeaders: httpHeaders && Object.keys(httpHeaders).length > 0 ? httpHeaders : null,
			valuePath,
			timestampPath,
			scale: scale as number,
			offset: offset as number,
			unit: optionalText(values.unit),
			minValid,
			maxValid,
			enabled: values.enabled,
			panel: values.panel === '' ? null : values.panel,
			formula: null
		}
	};
}

/**
 * Tag formulasi. Alamat dan parameternya ditentukan jenisnya, bukan diisi
 * pengguna, dan skala/offset wajib 1/0 (Swagger `POST /tags`): nilai `derived`
 * disimpan apa adanya.
 *
 * - `computed:swc`: debit unit = beban unit × SWC ÷ 3,6, hanya untuk
 *   `total_outflow` ber-station unit turbin `T<n>`.
 * - `rumus`: station = kode rumus, definisinya di `formula`.
 */
function parseDerivedTagForm(
	pltaId: string,
	values: TagFormValues,
	{ formula = null, codePattern = /^[A-Z][A-Z0-9_]*$/ }: DerivedTagOptions
): ParsedForm<TagInput, TagFormField> {
	const errors: FormErrors<TagFormField> = {};
	const kind = derivedKindConfig(values.derivedKind);

	// Kode rumus dibesarkan otomatis, seperti kode PLTA: `efisiensi` = `EFISIENSI`.
	const station =
		kind.value === 'rumus' ? values.station.trim().toUpperCase() : values.station.trim();
	if (kind.value === 'swc') {
		if (!station) errors.station = 'Isi unit turbin, mis. T1.';
		else if (!SWC_STATION_PATTERN.test(station)) errors.station = 'Unit turbin ditulis T1, T2, …';
	} else {
		if (!station) errors.station = 'Isi kode rumus, mis. EFISIENSI_TOTAL.';
		else if (station.length > TAG_STATION_MAX_LENGTH) {
			errors.station = `Maksimal ${TAG_STATION_MAX_LENGTH} karakter.`;
		} else if (!codePattern.test(station)) {
			errors.station = 'Huruf besar, angka, dan garis bawah; diawali huruf.';
		}
		if (!formula) errors.formula = 'Lengkapi rumus.';
	}

	const label = optionalText(values.label);
	if (label && label.length > TAG_LABEL_MAX_LENGTH) {
		errors.label = `Maksimal ${TAG_LABEL_MAX_LENGTH} karakter.`;
	}

	const minValid = numberOrNull(values.minValid);
	const maxValid = numberOrNull(values.maxValid);
	if (minValid !== null && maxValid !== null && minValid >= maxValid) {
		errors.maxValid = 'Batas atas harus lebih besar dari batas bawah.';
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };

	return {
		ok: true,
		input: {
			pltaId,
			parameter: kind.parameter,
			station,
			label,
			protocol: 'derived',
			address: kind.address,
			httpHeaders: null,
			valuePath: null,
			timestampPath: null,
			scale: 1,
			offset: 0,
			unit: optionalText(values.unit),
			minValid,
			maxValid,
			enabled: values.enabled,
			panel: values.panel === '' ? null : values.panel,
			formula: kind.value === 'rumus' ? formula : null
		}
	};
}
