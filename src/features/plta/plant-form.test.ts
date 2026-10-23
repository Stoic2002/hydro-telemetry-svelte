import { describe, expect, it } from 'vitest';
import type { Plant } from './model';
import {
	emptyPlantForm,
	parsePlantForm,
	parseRiverBasinForm,
	plantChanges,
	plantFormFromPlant,
	riverBasinChanges
} from './plant-form';

const WS_ID = '22222222-2222-4222-8222-222222222222';

const SAVED: Plant = {
	id: '11111111-1111-4111-8111-111111111111',
	code: 'PBS',
	name: 'Soedirman',
	riverBasinId: WS_ID,
	latitude: -7.39,
	longitude: 109.68,
	capacityMw: 184.5,
	description: null,
	isActive: true,
	bebanToOutflowNum: 204,
	bebanToOutflowDen: 180,
	constants: { tma_limpas: 231.5 }
};

function validForm() {
	return { ...emptyPlantForm(WS_ID), code: ' PBS ', name: 'Soedirman  Baru' };
}

describe('form PLTA', () => {
	it('merapikan teks, mengosongkan deskripsi kosong, dan memakai rasio bawaan', () => {
		const parsed = parsePlantForm(validForm());

		expect(parsed).toStrictEqual({
			ok: true,
			input: {
				code: 'PBS',
				name: 'Soedirman Baru',
				riverBasinId: WS_ID,
				latitude: null,
				longitude: null,
				capacityMw: null,
				description: null,
				isActive: true,
				bebanToOutflowNum: 204,
				bebanToOutflowDen: 180
			}
		});
	});

	it('menolak bidang wajib kosong dan kode terlalu panjang', () => {
		const parsed = parsePlantForm({ ...emptyPlantForm(), code: 'X'.repeat(33) });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.errors.code).toContain('32');
		expect(parsed.errors.name).toBeDefined();
		expect(parsed.errors.riverBasinId).toBeDefined();
	});

	it('meminta lintang dan bujur sekaligus, dan dalam rentangnya', () => {
		const half = parsePlantForm({ ...validForm(), latitude: -7.39 });
		expect(half.ok ? null : half.errors.longitude).toBe('Isi lintang dan bujur sekaligus.');

		const outOfRange = parsePlantForm({ ...validForm(), latitude: -95, longitude: 200 });
		expect(outOfRange.ok ? null : outOfRange.errors).toMatchObject({
			latitude: expect.stringContaining('-90'),
			longitude: expect.stringContaining('-180')
		});
	});

	it('membaca isian angka kosong (null, undefined, NaN) sebagai kosong', () => {
		const parsed = parsePlantForm({ ...validForm(), capacityMw: Number.NaN, latitude: undefined });

		expect(parsed.ok && parsed.input.capacityMw).toBeNull();
	});

	it('menolak kapasitas negatif dan rasio nol', () => {
		const parsed = parsePlantForm({ ...validForm(), capacityMw: -1, bebanToOutflowDen: 0 });

		expect(parsed.ok ? null : Object.keys(parsed.errors).sort()).toEqual([
			'bebanToOutflowDen',
			'capacityMw'
		]);
	});

	it('perubahan hanya memuat bidang yang berbeda, tanpa kode', () => {
		const form = { ...plantFormFromPlant(SAVED), name: 'PLTA Soedirman', isActive: false };
		const parsed = parsePlantForm(form);

		expect(parsed.ok && plantChanges(SAVED, parsed.input)).toStrictEqual({
			name: 'PLTA Soedirman',
			isActive: false
		});
	});

	it('tidak ada perubahan bila isian sama dengan yang tersimpan', () => {
		const parsed = parsePlantForm(plantFormFromPlant(SAVED));

		expect(parsed.ok && plantChanges(SAVED, parsed.input)).toStrictEqual({});
	});
});

describe('form Wilayah Sungai', () => {
	it('mewajibkan kode dan nama', () => {
		const parsed = parseRiverBasinForm({ code: '', name: ' ', description: '' });

		expect(parsed.ok ? null : Object.keys(parsed.errors).sort()).toEqual(['code', 'name']);
	});

	it('perubahan hanya nama dan deskripsi', () => {
		const saved = { id: WS_ID, code: 'WS-SERAYU', name: 'Serayu', description: null };
		const parsed = parseRiverBasinForm({ code: 'WS-SERAYU', name: 'Serayu', description: 'Hulu' });

		expect(parsed.ok && riverBasinChanges(saved, parsed.input)).toStrictEqual({
			description: 'Hulu'
		});
	});
});
