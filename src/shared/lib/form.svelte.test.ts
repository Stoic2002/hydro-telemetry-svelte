import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Form } from './form.svelte';

function createForm() {
	return new Form({
		schema: z.object({ name: z.string(), isActive: z.boolean() }),
		initial: { name: 'Budi', isActive: true },
		onSubmit: () => {}
	});
}

describe('Form.isDirty', () => {
	it('bersih sampai ada isian yang berbeda dari nilai awal', () => {
		const form = createForm();
		expect(form.isDirty).toBe(false);

		form.values.name = 'Budi Santoso';
		expect(form.isDirty).toBe(true);

		form.values.name = 'Budi';
		expect(form.isDirty).toBe(false);
	});

	it('mengikuti nilai awal baru dari setInitial dan kembali bersih setelah reset', () => {
		const form = createForm();
		form.setInitial({ name: 'Sari', isActive: false });
		expect(form.isDirty).toBe(false);

		form.values.isActive = true;
		expect(form.isDirty).toBe(true);

		form.reset();
		expect(form.isDirty).toBe(false);
	});
});
