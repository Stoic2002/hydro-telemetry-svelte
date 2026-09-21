<script lang="ts">
	import IconPlus from '~icons/ph/plus';
	import { ApiError } from '$api/http';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Select from '$components/controls/Select.svelte';
	import StatusToggle from '$components/controls/StatusToggle.svelte';
	import Sheet from '$components/ui/Sheet.svelte';
	import { Form } from '$shared/lib/form.svelte';
	import { notificationStore } from '$shared/lib/notification.svelte';
	import { createCreateUserMutation } from '../api/queries';
	import { getUserManagementErrorMessage } from '../error';
	import { createUserSchema, type CreateUserFormValues } from '../form-schemas';
	import { getUserDisplayName } from '../model';
	import { ROLE_OPTIONS } from './role-options';

	let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();

	const createMutation = createCreateUserMutation();

	const DEFAULT_VALUES: CreateUserFormValues = {
		fullName: '',
		email: '',
		username: '',
		password: '',
		role: 'operator',
		isActive: true
	};

	const form = new Form({
		schema: createUserSchema,
		initial: { ...DEFAULT_VALUES },
		onSubmit: async (values) => {
			try {
				const createdUser = await createMutation.mutateAsync(values);
				notificationStore.addToast({
					type: 'success',
					message: `Pengguna ${getUserDisplayName(createdUser)} berhasil dibuat`
				});
				onClose();
			} catch (error) {
				if (ApiError.isApiError(error) && error.status === 409) {
					form.errors = { ...form.errors, username: 'Username atau email sudah digunakan' };
				}
				notificationStore.addToast({
					type: 'error',
					message: getUserManagementErrorMessage(error)
				});
			}
		}
	});

	// Sheet yang sama dipakai berulang kali; isian sebelumnya tidak boleh
	// tertinggal saat panel dibuka lagi.
	$effect(() => {
		if (isOpen) form.reset();
	});

	const isPending = $derived(createMutation.isPending);
</script>

<Sheet {isOpen} title="Tambah Pengguna" isDismissible={!isPending} {onClose}>
	{#snippet description()}
		Buat akun baru dan tentukan hak akses awal.
	{/snippet}

	<form
		id="create-user-sheet-form"
		onsubmit={(event) => form.submit(event)}
		class="flex flex-col gap-5"
	>
		<Input
			label="Nama Lengkap"
			placeholder="Masukkan nama lengkap..."
			bind:value={form.values.fullName}
			error={form.errors.fullName}
			disabled={isPending}
		/>
		<Input
			label="Email"
			type="email"
			placeholder="nama@perusahaan.co.id"
			bind:value={form.values.email}
			error={form.errors.email}
			disabled={isPending}
		/>
		<Input
			label="Username"
			autocomplete="off"
			placeholder="contoh: budi.santoso"
			bind:value={form.values.username}
			error={form.errors.username}
			disabled={isPending}
		/>
		<Input
			label="Password Awal"
			type="password"
			autocomplete="new-password"
			placeholder="Minimal 8 karakter"
			bind:value={form.values.password}
			error={form.errors.password}
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
				form="create-user-sheet-form"
				isLoading={isPending}
				class="w-full sm:w-auto"
			>
				{#snippet leftIcon()}<IconPlus class="size-4" />{/snippet}
				{isPending ? 'Menyimpan...' : 'Simpan Pengguna'}
			</Button>
		</div>
	{/snippet}
</Sheet>
