import { describe, expect, it } from 'vitest';
import {
	emptyTagForm,
	parseHttpHeaders,
	parseTagForm,
	tagParameterOptions,
	TAG_PROTOCOL_OPTIONS
} from './tag-form';

const PLTA_ID = '11111111-1111-4111-8111-111111111111';

function form(patch: Partial<ReturnType<typeof emptyTagForm>> = {}) {
	return { ...emptyTagForm(), parameter: 'plan_outflow_hjv', ...patch };
}

describe('form tag baru', () => {
	it('bawaan: input manual beralamat upload, skala 1, offset 0, aktif', () => {
		expect(parseTagForm(PLTA_ID, form({ station: ' G1 ', unit: 'm3/s' }))).toStrictEqual({
			ok: true,
			input: {
				pltaId: PLTA_ID,
				parameter: 'plan_outflow_hjv',
				station: 'G1',
				label: null,
				protocol: 'upload',
				address: 'upload',
				httpHeaders: null,
				valuePath: null,
				timestampPath: null,
				scale: 1,
				offset: 0,
				unit: 'm3/s',
				minValid: null,
				maxValid: null,
				enabled: true,
				panel: null,
				formula: null
			}
		});
	});

	it('menawarkan protokol formulasi sejak Swagger 9 Nov 2026', () => {
		expect(TAG_PROTOCOL_OPTIONS.map((option) => option.value)).toContain('derived');
	});

	it('mewajibkan parameter', () => {
		const empty = parseTagForm(PLTA_ID, form({ parameter: '' }));

		expect(empty.ok ? null : empty.errors.parameter).toBe('Pilih parameter.');
	});

	it.each([
		['opcua', 'TMA', 'Node ID diawali ns=.'],
		['modbus', 'abc', 'Isi nomor register, atau unit:register.'],
		['sql', 'DELETE FROM x', 'Query harus diawali SELECT.'],
		['sql', 'SELECT 1; SELECT 2', 'Query tidak boleh memuat titik koma.'],
		['rest', 'ftp://x', 'URL diawali http:// atau https://.']
	] as const)('menolak alamat %s yang salah: %s', (protocol, address, message) => {
		const parsed = parseTagForm(PLTA_ID, form({ protocol, address }));

		expect(parsed.ok ? null : parsed.errors.address).toBe(message);
	});

	it.each([
		['opcua', 'ns=2;s=Channel1.TMA'],
		['modbus', '1:40001'],
		['sql', 'select nilai from sensor where id = 3'],
		['rest', 'https://api.example.com/tma']
	] as const)('menerima alamat %s yang sah', (protocol, address) => {
		expect(parseTagForm(PLTA_ID, form({ protocol, address })).ok).toBe(true);
	});

	it('bidang REST hanya ikut untuk protokol REST', () => {
		const rest = parseTagForm(
			PLTA_ID,
			form({
				protocol: 'rest',
				address: 'https://x',
				httpHeaders: 'Authorization: Bearer ${TOKEN}\n',
				valuePath: 'data.tma'
			})
		);
		const opc = parseTagForm(
			PLTA_ID,
			form({ protocol: 'opcua', address: 'ns=2;s=X', valuePath: 'data.tma', httpHeaders: 'A: b' })
		);

		expect(rest.ok && rest.input).toMatchObject({
			httpHeaders: { Authorization: 'Bearer ${TOKEN}' },
			valuePath: 'data.tma'
		});
		expect(opc.ok && opc.input).toMatchObject({ httpHeaders: null, valuePath: null });
	});

	it('menolak skala nol dan batas yang terbalik', () => {
		const parsed = parseTagForm(PLTA_ID, form({ scale: 0, minValid: 10, maxValid: 5 }));

		expect(parsed.ok ? null : Object.keys(parsed.errors).sort()).toEqual(['maxValid', 'scale']);
	});
});

describe('parseHttpHeaders', () => {
	it('satu header per baris dan baris kosong dilewati', () => {
		expect(parseHttpHeaders('A: 1\n\nB:2:3')).toEqual({ A: '1', B: '2:3' });
	});

	it('menolak baris tanpa titik dua', () => {
		expect(parseHttpHeaders('Authorization Bearer x')).toBeNull();
	});
});

describe('pilihan parameter', () => {
	const catalog = [
		{ key: 'plan_outflow_hjv', label: 'Rencana Debit HJV', unit: 'm3/s', group: 'rencana' },
		{ key: 'rumus', label: 'Rumus Kustom', unit: null, group: 'rumus' }
	];

	it('memakai nama resmi dengan kuncinya, tanpa rumus kustom', () => {
		expect(tagParameterOptions(catalog)).toEqual([
			{ value: 'plan_outflow_hjv', label: 'Rencana Debit HJV · plan_outflow_hjv' }
		]);
	});

	it('jatuh ke kunci bila katalog belum tersedia, tetap tanpa rumus', () => {
		const options = tagParameterOptions(undefined);

		expect(options.map((option) => option.value)).toContain('water_level');
		expect(options.map((option) => option.value)).not.toContain('rumus');
		expect(options.find((option) => option.value === 'water_level')?.label).toBe('water_level');
	});
});

describe('formulasi debit unit dari SWC', () => {
	const swc = (patch: Partial<ReturnType<typeof emptyTagForm>> = {}) =>
		form({ protocol: 'derived', derivedKind: 'swc', parameter: '', station: 'T1', ...patch });

	it('mengunci parameter, alamat, skala, dan offset sesuai Swagger', () => {
		const result = parseTagForm(PLTA_ID, swc({ scale: 5, offset: 2, address: 'apa saja' }));

		expect(result.ok && result.input).toMatchObject({
			parameter: 'total_outflow',
			station: 'T1',
			protocol: 'derived',
			address: 'computed:swc',
			scale: 1,
			offset: 0,
			httpHeaders: null,
			formula: null
		});
	});

	it('mewajibkan unit turbin T<n>', () => {
		expect(parseTagForm(PLTA_ID, swc({ station: '' }))).toMatchObject({
			ok: false,
			errors: { station: 'Isi unit turbin, mis. T1.' }
		});
		expect(parseTagForm(PLTA_ID, swc({ station: 'unit 1' }))).toMatchObject({
			ok: false,
			errors: { station: 'Unit turbin ditulis T1, T2, …' }
		});
	});
});

describe('formulasi rumus kustom', () => {
	const FORMULA = {
		expression: 'a * 2',
		variables: {
			a: {
				kind: 'series' as const,
				parameter: 'beban',
				station: '',
				take: 'terbaru' as const,
				fallback: null
			}
		}
	};
	const rumus = (patch: Partial<ReturnType<typeof emptyTagForm>> = {}) =>
		form({
			protocol: 'derived',
			derivedKind: 'rumus',
			parameter: '',
			station: 'efisiensi',
			...patch
		});

	it('parameter rumus, alamat rumus, kode dibesarkan, rumus ikut terkirim', () => {
		const result = parseTagForm(PLTA_ID, rumus(), { formula: FORMULA });

		expect(result.ok && result.input).toMatchObject({
			parameter: 'rumus',
			station: 'EFISIENSI',
			protocol: 'derived',
			address: 'rumus',
			scale: 1,
			offset: 0,
			formula: FORMULA
		});
	});

	it('menahan kode kosong atau tak sesuai pola, dan rumus yang belum lengkap', () => {
		expect(parseTagForm(PLTA_ID, rumus({ station: '' }), { formula: FORMULA })).toMatchObject({
			ok: false,
			errors: { station: 'Isi kode rumus, mis. EFISIENSI_TOTAL.' }
		});
		expect(
			parseTagForm(PLTA_ID, rumus({ station: '1 efisiensi' }), { formula: FORMULA })
		).toMatchObject({
			ok: false,
			errors: { station: 'Huruf besar, angka, dan garis bawah; diawali huruf.' }
		});
		expect(parseTagForm(PLTA_ID, rumus())).toMatchObject({
			ok: false,
			errors: { formula: 'Lengkapi rumus.' }
		});
	});
});
