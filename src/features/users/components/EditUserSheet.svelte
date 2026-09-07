<script lang="ts">
	import IconSave from '~icons/ph/floppy-disk';
	import Button from '$components/atoms/Button.svelte';
	import Input from '$components/atoms/Input.svelte';
	import Select from '$components/atoms/Select.svelte';
	import StatusToggle from '$components/atoms/StatusToggle.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { Form } from '$shared/lib/form.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createUpdateUserMutation } from '../api/queries';
	import { getUserManagementErrorMessage } from '../error';
	import { editUserSchema } from '../form-schemas';
	import { getUserDisplayName, type UserAccount, type UserApiRole } from '../model';
	import { ROLE_OPTIONS } from './role-options';

	let { isOpen, user, onClose }: { isOpen: boolean; user: UserAccount; onClose: () => void } =
		$props();

	const updateMutation = createUpdateUserMutation();

	function valuesFor(target: UserAccount) {
		return {
			fullName: getUserDisplayName(target),
			email: target.email ?? '',
			role: target.role,
			isActive: target.isActive
		};
	}

	const form = new Form({
		// Nilai sebenarnya dipasang oleh efek di bawah, yang juga menanganinya saat
		// pengguna yang dipilih berganti. Membaca `user` di sini hanya akan
		// menangkap nilai saat komponen dibuat.
		initial: { fullName: '', email: '', role: 'operator' as UserApiRole, isActive: true },
		schema: editUserSchema,
		onSubmit: async (values) => {
			try {
				const updatedUser = await updateMutation.mutateAsync({ userId: user.id, input: values });
				notificationStore.addToast({
					type: 'success',
					message: `Pengguna ${getUserDisplayName(updatedUser)} berhasil diperbarui`
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

	// Panel yang sama dipakai untuk pengguna mana pun yang dipilih di daftar, jadi
	// isian disetel ulang setiap kali dibuka atau targetnya berganti.
	$effect(() => {
		if (isOpen) form.setInitial(valuesFor(user));
	});

	const isPending = $derived(updateMutation.isPending);
</script>

<Sheet {isOpen} title="Edit Pengguna" isDismissible={!isPending} {onClose}>
	{#snippet description()}
		Perbarui akun @{user.username}. Username tidak dapat diubah.
	{/snippet}

	<form
		id="edit-user-sheet-form"
		onsubmit={(event) => form.submit(event)}
		class="flex flex-col gap-5"
	>
		<div class="rounded-lg border border-brand-tint-border bg-brand-tint px-4 py-3">
			<p class="text-xs font-medium text-brand-primary-pressed">Pengguna</p>
			<p class="mt-1 text-sm font-semibold text-text-strong">{getUserDisplayName(user)}</p>
		</div>

		<Input
			label="Nama Lengkap"
			bind:value={form.values.fullName}
			error={form.errors.fullName}
			disabled={isPending}
		/>
		<Input
			label="Email"
			type="email"
			bind:value={form.values.email}
			error={form.errors.email}
			disabled={isPending}
		/>
		<Select
			label="Peran"
			options={ROLE_OPTIONS}
			disabled={isPending}
			bind:value={form.values.role}
		/>
		<StatusToggle
			label="Status akun"
			isActive={form.values.isActive}
			disabled={isPending}
			onChange={(next) => (form.values.isActive = next)}
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
				form="edit-user-sheet-form"
				isLoading={isPending}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconSave class="size-4" />{/snippet}
				{isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
			</Button>
		</div>
	{/snippet}
</Sheet>
