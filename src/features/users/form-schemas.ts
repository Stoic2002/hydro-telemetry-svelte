import { z } from 'zod';

export const createUserSchema = z.object({
	fullName: z.string().trim().min(3, 'Nama minimal 3 karakter'),
	email: z.string().trim().email('Format email tidak valid'),
	username: z
		.string()
		.trim()
		.min(3, 'Username minimal 3 karakter')
		.max(64, 'Username maksimal 64 karakter')
		.regex(/^[a-zA-Z0-9._-]+$/, 'Gunakan huruf, angka, titik, garis bawah, atau tanda hubung'),
	password: z
		.string()
		.min(8, 'Password minimal 8 karakter')
		.max(128, 'Password maksimal 128 karakter'),
	role: z.enum(['admin', 'operator', 'viewer']),
	isActive: z.boolean()
});

export const editUserSchema = z.object({
	fullName: z.string().trim().min(3, 'Nama minimal 3 karakter'),
	email: z.string().trim().email('Format email tidak valid'),
	role: z.enum(['admin', 'operator', 'viewer']),
	isActive: z.boolean()
});

/** Admin menetapkan password user lain; aturan panjang sama dengan Swagger `PasswordReset`. */
export const resetPasswordSchema = z
	.object({
		newPassword: z
			.string()
			.min(8, 'Password minimal 8 karakter')
			.max(128, 'Password maksimal 128 karakter'),
		confirmPassword: z.string().min(1, 'Ulangi password baru')
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		path: ['confirmPassword'],
		message: 'Konfirmasi tidak sama dengan password baru'
	});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type EditUserFormValues = z.infer<typeof editUserSchema>;
