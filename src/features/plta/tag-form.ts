import { MONITORING_PARAMETERS } from '../monitoring';
import type { ParameterInfo, TagInput, TagInputProtocol, TagPanel } from './model';
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
 * Protokol yang boleh dipilih. `derived` (formulasi) tidak ditawarkan: server
 * menolaknya karena nilainya dihitung sistem (keputusan rapat tim 27 Okt
 * 2026: hanya parameter yang bukan formulasi).
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
	}
];

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

export type TagFormField = keyof TagFormValues;

export function emptyTagForm(): TagFormValues {
	return {
		parameter: '',
		station: '',
		label: '',
		protocol: 'upload',
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

export function parseTagForm(
	pltaId: string,
	values: TagFormValues
): ParsedForm<TagInput, TagFormField> {
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
			panel: values.panel === '' ? null : values.panel
		}
	};
}
