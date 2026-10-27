import { describe, expect, it } from 'vitest';
import { emptyTagForm, parseHttpHeaders, parseTagForm, TAG_PROTOCOL_OPTIONS } from './tag-form';

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
				panel: null
			}
		});
	});

	it('tidak menawarkan protokol formulasi', () => {
		expect(TAG_PROTOCOL_OPTIONS.map((option) => option.value)).not.toContain('derived');
	});

	it('mewajibkan parameter yang dikenal server', () => {
		const empty = parseTagForm(PLTA_ID, form({ parameter: '' }));
		const unknown = parseTagForm(PLTA_ID, form({ parameter: 'bukan_parameter' }));

		expect(empty.ok ? null : empty.errors.parameter).toBe('Pilih parameter.');
		expect(unknown.ok ? null : unknown.errors.parameter).toBe('Parameter tidak dikenal server.');
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
