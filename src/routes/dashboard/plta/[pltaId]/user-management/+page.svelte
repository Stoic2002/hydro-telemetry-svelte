<script lang="ts">
	import { goto } from '$app/navigation';
	import IconEdit from '~icons/ph/pencil-simple';
	import IconPlus from '~icons/ph/plus';
	import IconSearch from '~icons/ph/magnifying-glass';
	import IconSignOut from '~icons/ph/sign-out';
	import IconTrash from '~icons/ph/trash';

	import Button from '$components/controls/Button.svelte';
	import StatusToggle from '$components/controls/StatusToggle.svelte';
	import UserTableSkeleton from '$components/skeletons/UserTableSkeleton.svelte';
	import ConfirmDialog from '$components/ui/ConfirmDialog.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import ErrorState from '$components/ui/ErrorState.svelte';
	import HorizontalScroll from '$components/ui/HorizontalScroll.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import RefetchBar from '$components/ui/RefetchBar.svelte';
	import TablePagination from '$components/ui/TablePagination.svelte';
	import { getActivePLTAId, getPLTADashboardPath } from '$features/plta';
	import {
		createDeleteUserMutation,
		createRevokeUserSessionsMutation,
		createToggleUserStatusMutation,
		createUsersQuery,
		getUserDisplayName,
		getUserInitials,
		getUserManagementErrorMessage,
		mapApiRoleToUIRole,
		type UserAccount
	} from '$features/users';
	import CreateUserSheet from '$features/users/components/CreateUserSheet.svelte';
	import EditUserSheet from '$features/users/components/EditUserSheet.svelte';
	import RoleBadge from '$features/users/components/RoleBadge.svelte';
	import { authStore } from '$features/auth';
	import { notificationStore } from '$shared/lib/notification.svelte';

	const PAGE_LIMIT = 10;

	// Context menyimpan accessor, jadi pembacaannya harus lewat `$derived`.
	// Berpindah PLTA hanya mengubah param `[pltaId]` — route id-nya tetap sama,
	// jadi SvelteKit tidak me-remount halaman ini dan blok <script> tidak
	// dijalankan ulang. Destructure sekali di sini akan membekukan nilainya pada
	// PLTA yang pertama kali dibuka.
	const activePLTAId = $derived(getActivePLTAId());

	let page = $state(1);
	let searchInput = $state('');
	let search = $state('');
	let userToDelete = $state<UserAccount | null>(null);
	let userToRevoke = $state<UserAccount | null>(null);
	let userToDeactivate = $state<UserAccount | null>(null);
	let isCreateSheetOpen = $state(false);
	let userToEdit = $state<UserAccount | null>(null);

	const usersQuery = createUsersQuery(() => ({
		page,
		limit: PAGE_LIMIT,
		search: search || undefined
	}));
	const toggleStatusMutation = createToggleUserStatusMutation();
	const deleteMutation = createDeleteUserMutation();
	const revokeMutation = createRevokeUserSessionsMutation();

	const users = $derived(usersQuery.data?.items ?? []);
	const total = $derived(usersQuery.data?.total ?? 0);
	const totalPages = $derived(Math.max(usersQuery.data?.pages ?? 1, 1));
	const currentUser = $derived(authStore.user);

	function applySearch(event: SubmitEvent) {
		event.preventDefault();
		search = searchInput.trim();
		page = 1;
	}

	async function openEditSheet(user: UserAccount) {
		// Akun sendiri dikelola lewat Profil Saya, yang juga memuat ganti password.
		if (user.id === currentUser?.id) {
			await goto(getPLTADashboardPath(activePLTAId, 'account'));
			return;
		}

		userToEdit = user;
	}

	/**
	 * Mengaktifkan langsung jalan; menonaktifkan lewat konfirmasi, karena akun
	 * itu seketika tidak bisa masuk. Dulu keduanya satu klik pada teks "Aktif"
	 * yang tidak tampak seperti kontrol.
	 */
	function requestStatusChange(user: UserAccount) {
		if (user.isActive) {
			userToDeactivate = user;
			return;
		}
		void toggleUserStatus(user);
	}

	async function confirmDeactivateUser() {
		if (!userToDeactivate) return;
		await toggleUserStatus(userToDeactivate);
		userToDeactivate = null;
	}

	async function toggleUserStatus(user: UserAccount) {
		if (user.id === currentUser?.id) {
			notificationStore.addToast({
				type: 'info',
				message: 'Status akun sendiri tidak dapat diubah dari daftar pengguna'
			});
			return;
		}

		try {
			await toggleStatusMutation.mutateAsync({ userId: user.id, isActive: !user.isActive });
			notificationStore.addToast({
				type: 'success',
				message: `Akun ${user.username} ${user.isActive ? 'dinonaktifkan' : 'diaktifkan'}`
			});
		} catch (error) {
			notificationStore.addToast({
				type: 'error',
				message: getUserManagementErrorMessage(error)
			});
		}
	}

	/**
	 * Mencabut semua token user ini tanpa menonaktifkan akunnya — untuk token yang
	 * dicurigai bocor. Akun sendiri lewat Profil Saya › Keluar dari semua perangkat.
	 */
	async function confirmRevokeSessions() {
		if (!userToRevoke) return;

		try {
			await revokeMutation.mutateAsync(userToRevoke.id);
			notificationStore.addToast({
				type: 'success',
				message: `Semua sesi ${userToRevoke.username} telah dicabut`
			});
			userToRevoke = null;
		} catch (error) {
			notificationStore.addToast({
				type: 'error',
				message: getUserManagementErrorMessage(error)
			});
		}
	}

	async function confirmDeleteUser() {
		if (!userToDelete) return;

		try {
			await deleteMutation.mutateAsync(userToDelete.id);
			// Menghapus baris terakhir di halaman terakhir akan meninggalkan tabel
			// kosong; mundur satu halaman supaya operator tetap melihat data.
			if (users.length === 1 && page > 1) page -= 1;
			notificationStore.addToast({
				type: 'success',
				message: `Akun ${userToDelete.username} telah dihapus permanen`
			});
			userToDelete = null;
		} catch (error) {
			notificationStore.addToast({
				type: 'error',
				message: getUserManagementErrorMessage(error)
			});
		}
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		title="User Management"
		description="Kelola akun, peran, dan status pengguna aplikasi"
	>
		{#snippet actions()}
			<Button type="button" size="lg" onclick={() => (isCreateSheetOpen = true)}>
				{#snippet leftIcon()}<IconPlus class="size-4" />{/snippet}
				Tambah User
			</Button>
		{/snippet}
	</PageHeader>

	<div class="flex flex-col gap-2.5 border-b border-border-subtle pb-4 sm:flex-row sm:items-center">
		<form onsubmit={applySearch} class="flex min-w-0 items-center gap-2 sm:w-80">
			<div class="relative flex min-w-0 flex-1 items-center">
				<IconSearch class="pointer-events-none absolute left-3 size-4 shrink-0 text-text-muted" />
				<input
					type="search"
					bind:value={searchInput}
					maxlength={100}
					placeholder="Cari nama, username, atau email…"
					class="h-9 w-full min-w-0 rounded-sm border border-border-subtle bg-surface-raised pr-3 pl-8.5 text-[12.5px] text-text-primary transition-[border-color,box-shadow] outline-none placeholder:text-text-placeholder hover:border-border-strong focus:border-brand-primary-strong focus:ring-[3px] focus:ring-brand-primary-strong/15"
				/>
			</div>
			<button
				type="submit"
				class="h-9 shrink-0 cursor-pointer rounded-lg border border-border-subtle bg-surface-raised px-4 text-[12.5px] font-semibold text-text-secondary transition-colors hover:bg-surface-base"
			>
				Cari
			</button>
		</form>
		{#if !usersQuery.isError}
			<span class="shrink-0 text-[11.5px] text-text-muted sm:ml-auto">{total} pengguna</span>
		{/if}
	</div>

	<section
		class="flex flex-col overflow-clip rounded-xl border border-border-subtle bg-surface-raised"
	>
		<RefetchBar isRefetching={usersQuery.isFetching && !usersQuery.isLoading} />

		{#if usersQuery.isError}
			<ErrorState
				title="Daftar pengguna belum bisa dimuat"
				description={getUserManagementErrorMessage(usersQuery.error)}
				isRetrying={usersQuery.isFetching}
				onRetry={() => void usersQuery.refetch()}
				class="py-10"
			/>
		{:else if !usersQuery.isLoading && users.length === 0}
			<EmptyState
				title={search ? 'Pengguna tidak ditemukan' : 'Belum ada pengguna'}
				description={search
					? 'Coba kata kunci lain atau kosongkan pencarian.'
					: 'Pengguna yang ditambahkan akan muncul di daftar ini.'}
				class="m-5"
			/>
		{:else}
			<!--
				Kolom Role/Status/Aksi selebar tetap. Di layar sempit tabelnya
				digulir ke samping — dulu `overflow-clip` pada wadahnya memotong
				kolom Aksi sehingga tombolnya tidak terjangkau.
			-->
			<HorizontalScroll>
				<div class="flex min-w-[720px] flex-col">
					<div
						class="flex h-9 w-full items-center gap-4 border-b border-border-subtle bg-surface-overlay px-5"
					>
						<div class="table-head-cell min-w-[220px] flex-1">User</div>
						<div class="table-head-cell w-[160px] shrink-0">Role</div>
						<div class="table-head-cell w-[140px] shrink-0">Status</div>
						<div class="table-head-cell w-[124px] shrink-0">Aksi</div>
					</div>

					{#if usersQuery.isLoading}
						<UserTableSkeleton rows={PAGE_LIMIT} />
					{:else}
						{#each users as user (user.id)}
							{@const isSelf = user.id === currentUser?.id}
							<div
								class={`flex w-full items-center gap-4 border-b border-b-surface-overlay px-5 py-3.5 transition-colors hover:bg-surface-base/50 ${
									isSelf ? 'bg-surface-base' : ''
								}`}
							>
								<div class="flex min-w-[220px] flex-1 items-center gap-3">
									<div
										class={`flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
											isSelf
												? 'border-brand-tint-border bg-brand-tint text-brand-primary-pressed'
												: 'border-border-subtle bg-surface-overlay text-text-subtle'
										}`}
									>
										{getUserInitials(user)}
									</div>
									<div class="flex min-w-0 flex-col">
										<span class="flex items-center gap-1.5">
											<span class="truncate text-sm font-medium text-text-primary">
												{getUserDisplayName(user)}
											</span>
											{#if isSelf}
												<span
													class="inline-flex h-[19px] shrink-0 items-center rounded-full bg-surface-overlay px-2 text-[10px] font-semibold tracking-[0.04em] text-text-subtle uppercase"
												>
													Akun Anda
												</span>
											{/if}
										</span>
										<span class="truncate font-mono text-[11.5px] text-text-muted">
											@{user.username}{user.email ? ` · ${user.email}` : ''}
										</span>
									</div>
								</div>

								<div class="flex w-[160px] shrink-0">
									<RoleBadge role={mapApiRoleToUIRole(user.role)} />
								</div>

								<div class="flex w-[140px] shrink-0">
									<StatusToggle
										variant="inline"
										label={`Status akun ${user.username}`}
										isActive={user.isActive}
										disabled={toggleStatusMutation.isPending || deleteMutation.isPending || isSelf}
										onChange={() => requestStatusChange(user)}
									/>
								</div>

								<div class="flex w-[124px] shrink-0 items-center gap-1.5">
									{#if isSelf}
										<!--
									Akun sendiri tidak bisa dicabut sesinya, dihapus, atau diubah
									statusnya dari sini. Dulu tiga ikon (dua nonaktif) dengan
									alasannya hanya di tooltip — tak terbaca di layar sentuh.
								-->
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onclick={() => void openEditSheet(user)}
										>
											Profil Saya
										</Button>
									{:else}
										<button
											type="button"
											onclick={() => void openEditSheet(user)}
											aria-label={`Edit pengguna ${user.username}`}
											title="Edit pengguna"
											class="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-brand-primary-strong transition-colors hover:bg-brand-tint"
										>
											<IconEdit class="size-3.5" aria-hidden="true" />
										</button>
										<button
											type="button"
											disabled={revokeMutation.isPending}
											onclick={() => (userToRevoke = user)}
											aria-label={`Cabut semua sesi ${user.username}`}
											title="Cabut semua sesi (keluarkan dari semua perangkat)"
											class="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-status-warning-strong transition-colors hover:bg-status-warning-soft disabled:cursor-not-allowed disabled:bg-surface-base disabled:text-disabled"
										>
											<IconSignOut class="size-3.5" aria-hidden="true" />
										</button>
										<button
											type="button"
											disabled={deleteMutation.isPending}
											onclick={() => (userToDelete = user)}
											aria-label={`Hapus pengguna ${user.username}`}
											title="Hapus pengguna"
											class="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-status-danger-strong transition-colors hover:bg-status-danger-soft disabled:cursor-not-allowed disabled:bg-surface-base disabled:text-disabled"
										>
											<IconTrash class="size-3.5" aria-hidden="true" />
										</button>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</HorizontalScroll>
		{/if}

		<TablePagination
			{page}
			{totalPages}
			{total}
			pageSize={PAGE_LIMIT}
			itemLabel="pengguna"
			isBusy={usersQuery.isFetching}
			onPrevious={() => (page = Math.max(page - 1, 1))}
			onNext={() => (page = Math.min(page + 1, totalPages))}
		/>
	</section>
</div>

<CreateUserSheet isOpen={isCreateSheetOpen} onClose={() => (isCreateSheetOpen = false)} />

{#if userToEdit}
	<EditUserSheet isOpen user={userToEdit} onClose={() => (userToEdit = null)} />
{/if}

<ConfirmDialog
	isOpen={userToDelete !== null}
	title="Hapus pengguna?"
	confirmLabel="Hapus Permanen"
	isConfirming={deleteMutation.isPending}
	onConfirm={() => void confirmDeleteUser()}
	onClose={() => (userToDelete = null)}
>
	{#snippet description()}
		Akun <strong>{userToDelete?.username}</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	isOpen={userToDeactivate !== null}
	variant="warning"
	title="Nonaktifkan pengguna?"
	confirmLabel="Ya, nonaktifkan"
	isConfirming={toggleStatusMutation.isPending}
	onConfirm={() => void confirmDeactivateUser()}
	onClose={() => (userToDeactivate = null)}
>
	{#snippet description()}
		<strong>{userToDeactivate?.username}</strong> tidak bisa masuk sampai akunnya diaktifkan kembali.
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	isOpen={userToRevoke !== null}
	variant="warning"
	title="Cabut semua sesi?"
	confirmLabel={revokeMutation.isPending ? 'Mencabut…' : 'Ya, cabut sesi'}
	cancelLabel="Batal"
	isConfirming={revokeMutation.isPending}
	onConfirm={() => void confirmRevokeSessions()}
	onClose={() => (userToRevoke = null)}
>
	{#snippet description()}
		<strong>{userToRevoke?.username}</strong> dikeluarkan dari semua perangkat. Akunnya tetap aktif dan
		bisa masuk kembali dengan password-nya.
	{/snippet}
</ConfirmDialog>
