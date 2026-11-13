import { describe, expect, it } from 'vitest';
import { editUserSchema, resetPasswordSchema } from './form-schemas';

describe('reset password oleh admin', () => {
	it('menerima password 8–128 karakter yang diulang sama', () => {
		expect(
			resetPasswordSchema.safeParse({ newPassword: 'abcdefgh', confirmPassword: 'abcdefgh' })
				.success
		).toBe(true);
	});

	it('menolak password kurang dari 8 karakter', () => {
		const result = resetPasswordSchema.safeParse({ newPassword: 'abc', confirmPassword: 'abc' });

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(['newPassword']);
	});

	it('menolak konfirmasi yang berbeda', () => {
		const result = resetPasswordSchema.safeParse({
			newPassword: 'abcdefgh',
			confirmPassword: 'abcdefgx'
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
	});
});

describe('email pengguna', () => {
	const base = { fullName: 'Operator Uji', role: 'operator' as const, isActive: true };
	const firstMessage = (email: string) =>
		editUserSchema.safeParse({ ...base, email }).error?.issues[0]?.message;

	it('kosong: "wajib diisi", bukan "format tidak valid" (temuan QA T26)', () => {
		expect(firstMessage('   ')).toBe('Email wajib diisi');
	});

	it('terisi tetapi salah format: "format tidak valid"', () => {
		expect(firstMessage('operator@')).toBe('Format email tidak valid');
	});
});
