import type { FormulaDictionary, TagFormula, TagFormulaTake } from './model';

/**
 * Isian rumus kustom (`derived` beralamat `rumus`, Swagger 9 Nov 2026). Alur
 * Swagger: kamus `GET /tags/rumus/kamus` → pratinjau `POST /tags/rumus/uji` →
 * simpan `POST /tags`. Aturan di sini hanya menahan isian yang pasti ditolak;
 * aturan lengkapnya (sintaks, fungsi yang diizinkan, variabel dipakai, deret
 * terdaftar, rujukan melingkar) dinilai server lewat Uji rumus.
 */

/** Batas dari `DefinisiRumus` di Swagger; kamus server boleh menyebut lain. */
export const FORMULA_EXPRESSION_MAX_LENGTH = 500;
export const FORMULA_VARIABLE_LIMIT = 20;

/** Cadangan bila kamus belum termuat. Kode = station tag, mis. `EFISIENSI_TOTAL`. */
const FALLBACK_CODE_PATTERN = '^[A-Z][A-Z0-9_]*$';
const FALLBACK_VARIABLE_PATTERN = '^[a-z][a-z0-9_]*$';

export const FORMULA_TAKE_LABELS: Record<TagFormulaTake, string> = {
	terbaru: 'Nilai terbaru',
	rata_jam: 'Rata-rata jam lalu',
	harian: 'Titik terakhir hari ini'
};

export interface FormulaVariableRow {
	/** Kunci render saja; tidak dikirim. */
	id: string;
	name: string;
	kind: 'series' | 'constant';
	parameter: string;
	station: string;
	take: TagFormulaTake;
	fallback: number | null | undefined;
	constant: string;
}

export interface FormulaFormValues {
	expression: string;
	variables: FormulaVariableRow[];
}

export interface FormulaVariableErrors {
	name?: string;
	parameter?: string;
	constant?: string;
}

export interface FormulaFormErrors {
	expression?: string;
	/** Galat yang bukan milik satu baris, mis. jumlah variabel. */
	variables?: string;
	rows: Record<string, FormulaVariableErrors>;
}

let rowCounter = 0;

export function createFormulaVariableRow(
	patch: Partial<Omit<FormulaVariableRow, 'id'>> = {}
): FormulaVariableRow {
	rowCounter += 1;
	return {
		id: `variabel-${rowCounter}`,
		name: '',
		kind: 'series',
		parameter: '',
		station: '',
		take: 'terbaru',
		fallback: null,
		constant: '',
		...patch
	};
}

export function emptyFormulaForm(): FormulaFormValues {
	return { expression: '', variables: [createFormulaVariableRow()] };
}

/** Rumus (mis. contoh dari kamus) → isian form. */
export function formulaFormFrom(formula: TagFormula): FormulaFormValues {
	return {
		expression: formula.expression,
		variables: Object.entries(formula.variables).map(([name, variable]) =>
			variable.kind === 'constant'
				? createFormulaVariableRow({ name, kind: 'constant', constant: variable.constant })
				: createFormulaVariableRow({
						name,
						kind: 'series',
						parameter: variable.parameter,
						station: variable.station,
						take: variable.take,
						fallback: variable.fallback
					})
		)
	};
}

function toRegExp(pattern: string | undefined, fallback: string): RegExp {
	try {
		return new RegExp(pattern || fallback);
	} catch {
		return new RegExp(fallback);
	}
}

export function formulaCodePattern(dictionary: FormulaDictionary | undefined): RegExp {
	return toRegExp(dictionary?.codePattern, FALLBACK_CODE_PATTERN);
}

function numberOrNull(value: number | null | undefined): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export type ParsedFormula =
	| { ok: true; formula: TagFormula; errors: FormulaFormErrors }
	| { ok: false; errors: FormulaFormErrors };

export function parseFormulaForm(
	values: FormulaFormValues,
	dictionary?: FormulaDictionary
): ParsedFormula {
	const errors: FormulaFormErrors = { rows: {} };
	const variablePattern = toRegExp(dictionary?.variablePattern, FALLBACK_VARIABLE_PATTERN);

	const expression = values.expression.trim();
	if (!expression) errors.expression = 'Tulis ekspresi rumus.';
	else if (expression.length > FORMULA_EXPRESSION_MAX_LENGTH) {
		errors.expression = `Maksimal ${FORMULA_EXPRESSION_MAX_LENGTH} karakter.`;
	}

	if (values.variables.length === 0) errors.variables = 'Tambahkan minimal satu variabel.';
	else if (values.variables.length > FORMULA_VARIABLE_LIMIT) {
		errors.variables = `Maksimal ${FORMULA_VARIABLE_LIMIT} variabel.`;
	}

	const seen = new Set<string>();
	const variables: TagFormula['variables'] = {};
	for (const row of values.variables) {
		const rowErrors: FormulaVariableErrors = {};
		const name = row.name.trim();
		if (!name) rowErrors.name = 'Isi nama.';
		else if (!variablePattern.test(name)) rowErrors.name = 'Huruf kecil, angka, garis bawah.';
		else if (seen.has(name)) rowErrors.name = 'Nama sudah dipakai.';
		seen.add(name);

		if (row.kind === 'series' && !row.parameter) rowErrors.parameter = 'Pilih parameter.';
		if (row.kind === 'constant' && !row.constant) rowErrors.constant = 'Pilih konstanta.';

		if (Object.keys(rowErrors).length > 0) {
			errors.rows[row.id] = rowErrors;
			continue;
		}
		variables[name] =
			row.kind === 'constant'
				? { kind: 'constant', constant: row.constant }
				: {
						kind: 'series',
						parameter: row.parameter,
						station: row.station.trim(),
						take: row.take,
						fallback: numberOrNull(row.fallback)
					};
	}

	const hasErrors =
		Boolean(errors.expression || errors.variables) || Object.keys(errors.rows).length > 0;
	if (hasErrors) return { ok: false, errors };
	return { ok: true, formula: { expression, variables }, errors };
}
