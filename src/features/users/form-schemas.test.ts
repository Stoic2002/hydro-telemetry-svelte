import { describe, expect, it } from 'vitest';
import { resetPasswordSchema } from './form-schemas';

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
