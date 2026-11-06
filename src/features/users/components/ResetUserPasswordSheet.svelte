<script lang="ts">
	import IconKey from '~icons/ph/key';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { Form } from '$shared/lib/form.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createResetUserPasswordMutation } from '../api/queries';
	import { getUserManagementErrorMessage } from '../error';
	import { resetPasswordSchema } from '../form-schemas';
	import { getUserDisplayName, type UserAccount } from '../model';

	/**
	 * Admin menetapkan password baru untuk user yang lupa password
	 * (`POST /users/{id}/password`, Swagger 6 Nov 2026). Server ikut mencabut
	 * seluruh sesi user itu, jadi ia harus login ulang dengan password baru.
	 */
	let { isOpen, user, onClose }: { isOpen: boolean; user: UserAccount; onClose: () => void } =
		$props();

	const resetMutation = createResetUserPasswordMutation();

	const form = new Form({
		initial: { newPassword: '', confirmPassword: '' },
		schema: resetPasswordSchema,
		onSubmit: async ({ newPassword }) => {
			try {
				await resetMutation.mutateAsync({ userId: user.id, newPassword });
				notificationStore.addToast({
					type: 'success',
					message: `Password ${user.username} telah diganti dan semua sesinya dicabut`
				});
				onClose();
			} catch (error) {
				notificationStore.addToast({
					type: 'error',
					message: getUserManagementErrorMessage(error)
				});
			}
		}
	});

	// Isian dikosongkan setiap kali panel dibuka, juga untuk user yang berbeda:
	// password yang pernah diketik tidak boleh tertinggal untuk akun berikutnya.
	$effect(() => {
		if (isOpen) form.setInitial({ newPassword: '', confirmPassword: '' });
	});

	const isPending = $derived(resetMutation.isPending);
</script>

<Sheet {isOpen} title="Reset Password" isDismissible={!isPending} isDirty={form.isDirty} {onClose}>
	{#snippet description()}
		Tetapkan password baru untuk @{user.username} tanpa password lamanya.
	{/snippet}

	<form
		id="reset-password-sheet-form"
		onsubmit={(event) => form.submit(event)}
		class="flex flex-col gap-5"
		novalidate
	>
		<div class="rounded-lg border border-brand-tint-border bg-brand-tint px-4 py-3">
			<p class="text-xs font-medium text-brand-primary-pressed">Pengguna</p>
			<p class="mt-1 text-sm font-semibold text-text-strong">{getUserDisplayName(user)}</p>
		</div>

		<Banner tone="warning">
			Semua sesi {user.username} langsung berakhir dan ia harus masuk lagi dengan password baru. Sampaikan
			password lewat jalur aman, lalu minta ia menggantinya sendiri di Profil Saya.
		</Banner>

		<Input
			label="Password Baru"
			type="password"
			autocomplete="new-password"
			bind:value={form.values.newPassword}
			error={form.errors.newPassword}
			helperText="8–128 karakter."
			disabled={isPending}
		/>
		<Input
			label="Ulangi Password Baru"
			type="password"
			autocomplete="new-password"
			bind:value={form.values.confirmPassword}
			error={form.errors.confirmPassword}
			disabled={isPending}
		/>
	</form>

	{#snippet footer()}
		<div class="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
			<Button
				type="button"
				variant="ghost"
				disabled={isPending}
				onclick={onClose}
				class="w-full sm:w-auto"
			>
				Batal
			</Button>
			<Button
				type="submit"
				form="reset-password-sheet-form"
				isLoading={isPending}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconKey class="size-4" />{/snippet}
				{isPending ? 'Menyimpan…' : 'Reset Password'}
			</Button>
		</div>
	{/snippet}
</Sheet>
