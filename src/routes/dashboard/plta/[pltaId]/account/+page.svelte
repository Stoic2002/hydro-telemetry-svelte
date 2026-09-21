<script lang="ts">
	import { z } from 'zod';
	import { goto } from '$app/navigation';
	import IconKey from '~icons/ph/key';
	import IconSave from '~icons/ph/floppy-disk';
	import IconUser from '~icons/ph/user-circle';

	import { ApiError } from '$api/http';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import {
		createChangeCurrentPasswordMutation,
		createUpdateCurrentUserMutation
	} from '$features/users';
	import RoleBadge from '$features/users/components/RoleBadge.svelte';
	import { Form } from '$shared/lib/form.svelte';
	import { authStore } from '$features/auth';
	import { notificationStore } from '$shared/lib/notification.svelte';

	const profileSchema = z.object({
		fullName: z.string().trim().min(3, 'Nama minimal 3 karakter'),
		email: z.string().trim().email('Format email tidak valid')
	});

	const passwordSchema = z
		.object({
			currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
			newPassword: z
				.string()
				.min(8, 'Password baru minimal 8 karakter')
				.max(128, 'Password baru maksimal 128 karakter'),
			confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi')
		})
		.refine((values) => values.newPassword === values.confirmPassword, {
			path: ['confirmPassword'],
			message: 'Konfirmasi belum sama dengan password baru'
		});

	function getAccountErrorMessage(error: unknown): string {
		if (!ApiError.isApiError(error)) return 'Terjadi kesalahan. Silakan coba kembali';
		if (error.status === 0) return 'Tidak dapat terhubung ke server';
		if (error.status === 400 || error.status === 401) return 'Password saat ini tidak sesuai';
		if (error.status === 409) return 'Email sudah digunakan pengguna lain';
		if (error.status === 422) return 'Data tidak lolos validasi server';
		return error.message;
	}

	const updateProfileMutation = createUpdateCurrentUserMutation();
	const changePasswordMutation = createChangeCurrentPasswordMutation();

	const user = $derived(authStore.user);

	const profileForm = new Form({
		schema: profileSchema,
		initial: { fullName: '', email: '' },
		onSubmit: async (values) => {
			try {
				await updateProfileMutation.mutateAsync({
					fullName: values.fullName,
					email: values.email
				});
				const profileRefreshed = await authStore.refreshProfile();
				notificationStore.addToast({
					type: profileRefreshed ? 'success' : 'info',
					message: profileRefreshed
						? 'Profil berhasil diperbarui'
						: 'Profil tersimpan, tetapi data sesi belum dapat dimuat ulang'
				});
			} catch (error) {
				notificationStore.addToast({ type: 'error', message: getAccountErrorMessage(error) });
			}
		}
	});

	const passwordForm = new Form({
		schema: passwordSchema,
		initial: { currentPassword: '', newPassword: '', confirmPassword: '' },
		onSubmit: async ({ currentPassword, newPassword }) => {
			try {
				await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
				passwordForm.reset();
				notificationStore.addToast({
					type: 'success',
					message: 'Password berhasil diubah. Silakan masuk kembali'
				});
				authStore.logout();
				await goto('/login', { replaceState: true });
			} catch (error) {
				notificationStore.addToast({ type: 'error', message: getAccountErrorMessage(error) });
			}
		}
	});

	// Profil bisa tiba setelah halaman terpasang (mis. saat sesi baru dipulihkan),
	// jadi nilai awal form mengikuti begitu datanya ada.
	$effect(() => {
		if (user) {
			profileForm.setInitial({ fullName: user.name, email: user.email });
		}
	});
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader title="Profil Saya" description="Ubah data diri dan password akun Anda" />

	{#if !user}
		<!--
			Tanpa profil sesi, kedua form hanya akan menampilkan field kosong dan
			menyimpan data ke akun yang tidak diketahui.
		-->
		<div class="rounded-xl border border-border-subtle bg-surface-raised">
			<ErrorState
				title="Data akun belum dapat dimuat"
				description="Data akun Anda belum tersedia di perangkat ini. Muat ulang data akun, atau masuk kembali bila masalahnya berlanjut."
				retryLabel="Muat ulang data akun"
				onRetry={() => void authStore.refreshProfile()}
				class="py-10"
			/>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
			<section
				class="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-raised"
			>
				<div class="flex items-center gap-2.5 border-b border-border-subtle px-[18px] py-3.5">
					<div
						class="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-brand-tint-border bg-brand-tint text-brand-primary-strong"
					>
						<IconUser class="size-4" />
					</div>
					<span class="card-title">Informasi Profil</span>
				</div>

				<form onsubmit={(event) => profileForm.submit(event)} class="flex flex-1 flex-col">
					<div class="flex flex-col gap-4 p-[18px]">
						<div class="flex flex-col gap-2.5 rounded-lg bg-surface-overlay p-3.5">
							<div class="flex items-center justify-between gap-3">
								<span class="text-xs text-text-muted">Username</span>
								<span class="font-mono text-[12.5px] font-medium text-text-primary">
									@{user.username}
								</span>
							</div>
							<div class="flex items-center justify-between gap-3">
								<span class="text-xs text-text-muted">Peran</span>
								<RoleBadge role={user.role} />
							</div>
							<p class="text-[11px] leading-relaxed text-text-muted">
								Keduanya dikelola admin dan tidak bisa diubah dari halaman ini.
							</p>
						</div>

						<Input
							label="Nama Lengkap"
							bind:value={profileForm.values.fullName}
							error={profileForm.errors.fullName}
						/>
						<Input
							label="Email"
							type="email"
							bind:value={profileForm.values.email}
							error={profileForm.errors.email}
						/>
					</div>

					<div
						class="flex justify-end border-t border-border-subtle bg-surface-base px-[18px] py-3.5"
					>
						<Button
							type="submit"
							variant="primary"
							size="sm"
							isLoading={updateProfileMutation.isPending}
						>
							{#snippet leftIcon()}<IconSave class="size-4" />{/snippet}
							{updateProfileMutation.isPending ? 'Menyimpan…' : 'Simpan Profil'}
						</Button>
					</div>
				</form>
			</section>

			<section
				class="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-raised"
			>
				<div class="flex items-center gap-2.5 border-b border-border-subtle px-[18px] py-3.5">
					<div
						class="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600"
					>
						<IconKey class="size-4" />
					</div>
					<span class="card-title">Ganti Password</span>
				</div>

				<form onsubmit={(event) => passwordForm.submit(event)} class="flex flex-1 flex-col">
					<div class="flex flex-col gap-4 p-[18px]">
						<p class="text-xs leading-relaxed text-text-muted">
							Setelah password berubah, Anda akan keluar dari aplikasi dan perlu masuk kembali.
						</p>
						<Input
							label="Password Saat Ini"
							type="password"
							autocomplete="current-password"
							bind:value={passwordForm.values.currentPassword}
							error={passwordForm.errors.currentPassword}
						/>
						<Input
							label="Password Baru"
							type="password"
							autocomplete="new-password"
							bind:value={passwordForm.values.newPassword}
							error={passwordForm.errors.newPassword}
						/>
						<Input
							label="Konfirmasi Password Baru"
							type="password"
							autocomplete="new-password"
							bind:value={passwordForm.values.confirmPassword}
							error={passwordForm.errors.confirmPassword}
						/>
					</div>

					<div
						class="flex justify-end border-t border-border-subtle bg-surface-base px-[18px] py-3.5"
					>
						<Button
							type="submit"
							variant="primary"
							size="sm"
							isLoading={changePasswordMutation.isPending}
							disabled={!passwordForm.isValid}
						>
							{#snippet leftIcon()}<IconKey class="size-4" />{/snippet}
							{changePasswordMutation.isPending ? 'Mengubah…' : 'Ubah Password'}
						</Button>
					</div>
				</form>
			</section>
		</div>
	{/if}
</div>
