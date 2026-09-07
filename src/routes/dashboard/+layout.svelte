<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';

	import IconLayoutDashboard from '~icons/ph/squares-four';
	import IconActivity from '~icons/ph/activity';
	import IconTrendingUp from '~icons/ph/trend-up';
	import IconChart from '~icons/ph/chart-bar';
	import IconFileText from '~icons/ph/file-text';
	import IconEdit from '~icons/ph/pencil-simple-line';
	import IconDatabase from '~icons/ph/database';
	import IconUsers from '~icons/ph/users';
	import IconLogout from '~icons/ph/sign-out';
	import IconCaretLeft from '~icons/ph/caret-left';
	import IconCaretRight from '~icons/ph/caret-right';
	import IconMenu from '~icons/ph/list';
	import IconX from '~icons/ph/x';

	import {
		TELEMETERING_UPLOAD_PATH,
		createPlantCatalogQuery,
		getPLTADashboardPath,
		getUnscopedDashboardPath,
		isValidPLTAId,
		type PLTADashboardPage
	} from '../../features/plta';
	import { FORECASTING_PLTA_ID } from '../../features/forecasting';
	import {
		authStore,
		canAccessDataTools,
		canManageUsers,
		canUploadMonthlyHydrology
	} from '../../features/auth';
	import { queryClient } from '$core/query-client';
	import AppErrorBoundary from '../../components/ui/AppErrorBoundary.svelte';
	import ConfirmDialog from '../../components/ui/ConfirmDialog.svelte';
	import DashboardPageSkeleton from '../../components/skeletons/DashboardPageSkeleton.svelte';
	import { getDashboardSkeletonVariant } from '../../components/skeletons/dashboardSkeletonVariant';
	import NavGroup from './NavGroup.svelte';
	import NavItem from './NavItem.svelte';
	import NavSubItem from './NavSubItem.svelte';

	let { children } = $props();

	let collapsed = $state(false);
	let isMobileSidebarOpen = $state(false);
	let isLogoutDialogOpen = $state(false);

	const plantsQuery = createPlantCatalogQuery();

	const user = $derived(authStore.user);
	const showDataTools = $derived(canAccessDataTools(user));
	const showUserManagement = $derived(canManageUsers(user));
	const showMonthlyUpload = $derived(canUploadMonthlyHydrology(user));
	const isTelemeteringActive = $derived(page.url.pathname.includes('/telemetering'));

	const selectedPLTAId = $derived.by(() => {
		const routePLTAId = page.params.pltaId;
		if (isValidPLTAId(routePLTAId)) return routePLTAId;

		const plants = plantsQuery.data ?? [];
		return (plants.find((plant) => plant.isActive) ?? plants[0])?.id;
	});

	function dashboardPath(target: PLTADashboardPage): string {
		return selectedPLTAId
			? getPLTADashboardPath(selectedPLTAId, target)
			: getUnscopedDashboardPath(target);
	}

	function closeMobileSidebar() {
		isMobileSidebarOpen = false;
	}

	async function handleLogout() {
		isLogoutDialogOpen = false;
		authStore.logout();
		await goto('/login', { replaceState: true });
	}

	/** Inisial untuk avatar pengguna. */
	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}
</script>

<div class="flex min-h-screen min-w-0 bg-surface-base">
	{#if isMobileSidebarOpen}
		<button
			type="button"
			aria-label="Tutup menu navigasi"
			class="fixed inset-0 z-30 cursor-default bg-surface-inverse/35 backdrop-blur-[1px] lg:hidden"
			onclick={closeMobileSidebar}
		></button>
	{/if}

	<aside
		class={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col border-r border-border-subtle bg-surface-raised transition-[width,transform] duration-300 lg:translate-x-0 ${
			isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
		} ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
	>
		<div
			class="relative flex h-[72px] shrink-0 items-center gap-2.5 border-b border-border-subtle px-4 transition-all duration-300"
		>
			<div
				class={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${
					collapsed ? 'w-full justify-center' : 'w-full'
				}`}
			>
				<img src="/logo.png" alt="Logo" class="size-9 shrink-0 rounded-md object-contain" />
				{#if !collapsed}
					<div class="flex flex-col whitespace-nowrap">
						<span class="font-sans text-[15px] leading-tight font-bold text-text-primary">
							PLTA Monitoring
						</span>
						<span class="font-sans text-[11px] leading-normal text-text-muted">Jawa Tengah</span>
					</div>
				{/if}
			</div>

			<button
				type="button"
				aria-label={collapsed ? 'Perluas menu navigasi' : 'Ciutkan menu navigasi'}
				class="absolute top-[88px] -right-3 z-50 hidden size-6 cursor-pointer items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-text-muted transition-colors hover:border-brand-primary-strong hover:text-brand-primary-strong lg:flex"
				onclick={() => (collapsed = !collapsed)}
			>
				{#if collapsed}
					<IconCaretRight class="size-3.5" />
				{:else}
					<IconCaretLeft class="size-3.5" />
				{/if}
			</button>

			<button
				type="button"
				aria-label="Tutup menu navigasi"
				class="ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-surface-overlay lg:hidden"
				onclick={closeMobileSidebar}
			>
				<IconX class="size-5" />
			</button>
		</div>

		<!--
			Klik di mana pun dalam nav menutup sidebar mobile. Tidak perlu penanganan
			keyboard tersendiri: yang bisa diklik di dalamnya hanya tautan, dan Enter
			pada tautan tetap memicu click.
		-->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
		<nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" onclick={closeMobileSidebar}>
			<NavItem href={getUnscopedDashboardPath('overview')} end {collapsed} label="Overview">
				{#snippet icon()}<IconLayoutDashboard class="size-[18px]" />{/snippet}
			</NavItem>

			<NavGroup
				label="Telemetering"
				{collapsed}
				href={dashboardPath('telemetering/bulanan')}
				isActive={isTelemeteringActive}
			>
				{#snippet icon()}<IconActivity class="size-[18px]" />{/snippet}
				<NavSubItem
					inFlyout={collapsed}
					onNavigate={closeMobileSidebar}
					href={dashboardPath('telemetering/bulanan')}
					label="Hidrologi Bulanan"
				/>
				<NavSubItem
					inFlyout={collapsed}
					onNavigate={closeMobileSidebar}
					href={dashboardPath('telemetering/harian')}
					label="Hidrologi Harian"
				/>
				{#if showMonthlyUpload}
					<NavSubItem
						inFlyout={collapsed}
						onNavigate={closeMobileSidebar}
						href={TELEMETERING_UPLOAD_PATH}
						label="Upload"
					/>
				{/if}
			</NavGroup>

			<NavItem
				href={getPLTADashboardPath(FORECASTING_PLTA_ID, 'forecasting')}
				{collapsed}
				label="Forecasting"
			>
				{#snippet icon()}<IconTrendingUp class="size-[18px]" />{/snippet}
			</NavItem>

			<NavItem href={dashboardPath('trends')} {collapsed} label="Tren & Grafik">
				{#snippet icon()}<IconChart class="size-[18px]" />{/snippet}
			</NavItem>

			<NavItem href={dashboardPath('laporan')} {collapsed} label="Laporan">
				{#snippet icon()}<IconFileText class="size-[18px]" />{/snippet}
			</NavItem>

			{#if showDataTools}
				<NavItem href={dashboardPath('input-ghw')} {collapsed} label="Input GHW">
					{#snippet icon()}<IconEdit class="size-[18px]" />{/snippet}
				</NavItem>
				<NavItem href="/dashboard/catalog" end {collapsed} label="Katalog Data">
					{#snippet icon()}<IconDatabase class="size-[18px]" />{/snippet}
				</NavItem>
			{/if}

			{#if showUserManagement}
				<NavItem href={dashboardPath('user-management')} {collapsed} label="User Management">
					{#snippet icon()}<IconUsers class="size-[18px]" />{/snippet}
				</NavItem>
			{/if}
		</nav>

		<div
			class={`flex h-[68px] shrink-0 items-center border-t border-border-subtle transition-all duration-300 ${
				collapsed
					? 'h-auto flex-col justify-center gap-2 px-2 py-2'
					: 'justify-between gap-2.5 px-4'
			}`}
		>
			{#if user}
				<button
					type="button"
					title="Profil Saya"
					onclick={() => {
						closeMobileSidebar();
						void goto(dashboardPath('account'));
					}}
					class={`flex min-w-0 cursor-pointer items-center gap-2.5 overflow-hidden border-0 bg-transparent p-0 text-left ${
						collapsed ? 'w-full justify-center' : 'flex-1'
					}`}
				>
					<div
						class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-overlay font-sans text-xs leading-none font-semibold text-text-subtle"
					>
						{getInitials(user.name)}
					</div>
					{#if !collapsed}
						<div class="flex min-w-0 flex-col">
							<span class="truncate font-sans text-[13px] font-medium text-text-primary">
								{user.name}
							</span>
							<span class="truncate font-sans text-[11px] text-text-muted">{user.role}</span>
						</div>
					{/if}
				</button>
			{/if}
			<button
				type="button"
				aria-label="Keluar dari aplikasi"
				title="Keluar"
				class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-red-50 hover:text-red-600 focus:ring-2 focus:ring-brand-primary-strong/40 focus:outline-none"
				onclick={() => (isLogoutDialogOpen = true)}
			>
				<IconLogout class="size-[17px]" />
			</button>
		</div>
	</aside>

	<div
		class={`flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ${
			collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
		}`}
	>
		<header
			class="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border-subtle bg-surface-raised/95 px-4 backdrop-blur lg:hidden"
		>
			<button
				type="button"
				aria-label="Buka menu navigasi"
				class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border-subtle text-text-subtle hover:bg-surface-base"
				onclick={() => {
					collapsed = false;
					isMobileSidebarOpen = true;
				}}
			>
				<IconMenu class="size-5" />
			</button>
			<img src="/logo.png" alt="" class="size-8 rounded-md object-contain" />
			<span class="min-w-0 truncate text-sm font-semibold text-text-strong">PLTA Monitoring</span>
		</header>

		<main class="mx-auto w-full max-w-[1440px] min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
			{#if navigating.to}
				<!--
					Padanan `<Suspense>` di versi React. Tujuan navigasi sudah diketahui
					sebelum datanya sampai, jadi bentuk shimmer bisa langsung sesuai
					halaman yang dituju — bukan kerangka generik.
				-->
				<DashboardPageSkeleton variant={getDashboardSkeletonVariant(navigating.to.url.pathname)} />
			{:else}
				<AppErrorBoundary
					scope="dashboard-page"
					resetKey={page.url.pathname}
					onReset={() => queryClient.resetQueries()}
				>
					{@render children()}
				</AppErrorBoundary>
			{/if}
		</main>
	</div>
</div>

<ConfirmDialog
	isOpen={isLogoutDialogOpen}
	title="Keluar dari aplikasi?"
	confirmLabel="Ya, Keluar"
	cancelLabel="Tetap Masuk"
	onConfirm={handleLogout}
	onClose={() => (isLogoutDialogOpen = false)}
>
	{#snippet icon()}<IconLogout class="size-5" />{/snippet}
	{#snippet description()}
		Sesi Anda di perangkat ini akan diakhiri. Anda perlu masuk kembali untuk mengakses dashboard.
	{/snippet}
</ConfirmDialog>
