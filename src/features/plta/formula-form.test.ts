import { describe, expect, it } from 'vitest';
import {
	createFormulaVariableRow,
	emptyFormulaForm,
	formulaCodePattern,
	formulaFormFrom,
	parseFormulaForm
} from './formula-form';
import type { FormulaDictionary } from './model';

const DICTIONARY: FormulaDictionary = {
	functions: [{ name: 'jika', description: 'jika(syarat, ya, tidak)' }],
	operators: ['+', '-'],
	takeModes: [],
	constants: ['swc'],
	limits: {},
	codePattern: '^[A-Z][A-Z0-9_]{1,31}$',
	variablePattern: '^[a-z][a-z0-9_]{0,15}$',
	example: {
		expression: 'a * swc',
		variables: {
			a: { kind: 'series', parameter: 'beban', station: 'T1', take: 'rata_jam', fallback: 0 },
			swc: { kind: 'constant', constant: 'swc' }
		}
	}
};

describe('form rumus kustom', () => {
	it('mengubah isian menjadi DefinisiRumus: deret dan konstanta', () => {
		const result = parseFormulaForm({
			expression: '  jika(b > 1, a / b * 3.6, 0) ',
			variables: [
				createFormulaVariableRow({ name: 'a', parameter: 'beban', station: ' T1 ', fallback: 0 }),
				createFormulaVariableRow({ name: 'b', kind: 'constant', constant: 'swc' })
			]
		});

		expect(result.ok && result.formula).toEqual({
			expression: 'jika(b > 1, a / b * 3.6, 0)',
			variables: {
				a: { kind: 'series', parameter: 'beban', station: 'T1', take: 'terbaru', fallback: 0 },
				b: { kind: 'constant', constant: 'swc' }
			}
		});
	});

	it('pengganti kosong dikirim null: rumus tidak dihitung pada jam deretnya kosong', () => {
		const result = parseFormulaForm({
			expression: 'a',
			variables: [createFormulaVariableRow({ name: 'a', parameter: 'beban', fallback: undefined })]
		});
		expect(result.ok && result.formula.variables.a).toMatchObject({ fallback: null });
	});

	it('menahan ekspresi kosong, nama ganda, dan sumber yang belum dipilih', () => {
		const first = createFormulaVariableRow({ name: 'a', parameter: 'beban' });
		const duplicate = createFormulaVariableRow({ name: 'a', parameter: 'beban' });
		const noParameter = createFormulaVariableRow({ name: 'b' });
		const noConstant = createFormulaVariableRow({ name: 'c', kind: 'constant' });

		const result = parseFormulaForm({
			expression: ' ',
			variables: [first, duplicate, noParameter, noConstant]
		});

		expect(result.ok).toBe(false);
		expect(result.errors.expression).toBe('Tulis ekspresi rumus.');
		expect(result.errors.rows[first.id]).toBeUndefined();
		expect(result.errors.rows[duplicate.id]).toEqual({ name: 'Nama sudah dipakai.' });
		expect(result.errors.rows[noParameter.id]).toEqual({ parameter: 'Pilih parameter.' });
		expect(result.errors.rows[noConstant.id]).toEqual({ constant: 'Pilih konstanta.' });
	});

	it('memakai pola nama variabel dari kamus', () => {
		const row = createFormulaVariableRow({ name: 'Debit', parameter: 'beban' });
		const result = parseFormulaForm({ expression: 'Debit', variables: [row] }, DICTIONARY);
		expect(result.errors.rows[row.id]).toEqual({ name: 'Huruf kecil, angka, garis bawah.' });
	});

	it('mewajibkan minimal satu variabel', () => {
		expect(parseFormulaForm({ expression: '1 + 1', variables: [] }).errors.variables).toBe(
			'Tambahkan minimal satu variabel.'
		);
	});

	it('contoh kamus mengisi form apa adanya', () => {
		const values = formulaFormFrom(DICTIONARY.example);
		expect(values.expression).toBe('a * swc');
		expect(values.variables.map((row) => [row.name, row.kind])).toEqual([
			['a', 'series'],
			['swc', 'constant']
		]);
		expect(parseFormulaForm(values, DICTIONARY).ok).toBe(true);
	});

	it('form kosong berisi satu baris variabel siap diisi', () => {
		expect(emptyFormulaForm().variables).toHaveLength(1);
	});

	it('pola kode dari kamus, dengan cadangan bila kamus belum ada atau polanya rusak', () => {
		expect(formulaCodePattern(DICTIONARY).test('EFISIENSI_TOTAL')).toBe(true);
		expect(formulaCodePattern(undefined).test('EFISIENSI_TOTAL')).toBe(true);
		expect(formulaCodePattern({ ...DICTIONARY, codePattern: '([' }).test('EFISIENSI')).toBe(true);
		expect(formulaCodePattern(undefined).test('efisiensi')).toBe(false);
	});
});
