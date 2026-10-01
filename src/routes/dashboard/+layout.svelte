<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';

	import IconLayoutDashboard from '~icons/ph/squares-four';
	import IconActivity from '~icons/ph/activity';
	import IconTrendingUp from '~icons/ph/trend-up';
	import IconChart from '~icons/ph/chart-bar';
	import IconFileText from '~icons/ph/file-text';
	import IconUpload from '~icons/ph/cloud-arrow-up';
	import IconDatabase from '~icons/ph/database';
	import IconUsers from '~icons/ph/users';
	import IconLogout from '~icons/ph/sign-out';
	import IconSidebar from '~icons/ph/sidebar-simple';
	import IconMenu from '~icons/ph/list';
	import IconX from '~icons/ph/x';

	import {
		UPLOAD_PATH,
		createPlantCatalogQuery,
		getPLTADashboardPath,
		getUnscopedDashboardPath,
		isValidPLTAId,
		type PLTADashboardPage
	} from '../../features/plta';
	import { findForecastingPlant } from '../../features/forecasting';
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
	import ProfileMenu from './ProfileMenu.svelte';

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

	/**
	 * Skeleton hanya untuk perpindahan ke halaman LAIN.
	 *
	 * Mengubah filter memakai `goto` juga menyalakan `navigating`, dan dulu itu
	 * menukar isi `<main>` dengan skeleton — yang berarti halamannya di-mount
	 * ulang dan seluruh state lokalnya hilang. Gejalanya: memilih unit DMN di
	 * Hidrologi Harian membuat kartu zona yang sudah dibuka kembali ringkas.
	 * Berpindah PLTA pun tidak lagi menukar layar: rute-nya sama, hanya
	 * parameternya berubah, dan tiap query sudah menangani keadaan memuatnya
	 * sendiri.
	 */
	const isLeavingPage = $derived(
		Boolean(navigating.to) && navigating.to?.route.id !== page.route.id
	);

	const selectedPLTAId = $derived.by(() => {
		const routePLTAId = page.params.pltaId;
		if (isValidPLTAId(routePLTAId)) return routePLTAId;

		const plants = plantsQuery.data ?? [];
		return (plants.find((plant) => plant.isActive) ?? plants[0])?.id;
	});

	/**
	 * Langsung ke halaman PLTA Soedirman begitu katalog dimuat, supaya penanda
	 * menu aktif cocok dengan alamatnya. Sebelum itu, alamat tanpa `pltaId` yang
	 * mengalihkan ke PLTA yang sama.
	 */
	const forecastingPath = $derived.by(() => {
		const plant = findForecastingPlant(plantsQuery.data ?? []);
		return plant
			? getPLTADashboardPath(plant.id, 'forecasting')
			: getUnscopedDashboardPath('forecasting');
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
		<!--
			Tombol ciut/perluas memakai ikon panel sisi yang lazim, di kiri logo —
			dulu panah kecil yang menempel di tepi sidebar dan mudah terlewat. Saat
			ciut, rail 72px tidak cukup untuk tombol dan logo berdampingan, jadi yang
			tersisa hanya tombolnya: fungsi lebih penting daripada merek di rail.
		-->
		<div
			class={`flex h-[72px] shrink-0 items-center gap-2 border-b border-border-subtle transition-all duration-300 ${
				collapsed ? 'lg:justify-center lg:px-0' : ''
			} px-4`}
		>
			<button
				type="button"
				aria-label={collapsed ? 'Perluas menu navigasi' : 'Ciutkan menu navigasi'}
				aria-expanded={!collapsed}
				title={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
				class="-ml-1.5 hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary lg:flex"
				onclick={() => (collapsed = !collapsed)}
			>
				<IconSidebar class="size-5" />
			</button>

			<div
				class={`flex min-w-0 items-center gap-2.5 overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}
			>
				<img src="/logo.png" alt="Logo" class="size-9 shrink-0 rounded-md object-contain" />
				<div class="flex flex-col whitespace-nowrap">
					<span class="font-sans text-[15px] leading-tight font-bold text-text-primary">
						PLTA Monitoring
					</span>
					<span class="font-sans text-[11px] leading-normal text-text-muted">Jawa Tengah</span>
				</div>
			</div>

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
				href={dashboardPath('telemetering/harian')}
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
			</NavGroup>

			<NavItem href={forecastingPath} {collapsed} label="Forecasting">
				{#snippet icon()}<IconTrendingUp class="size-[18px]" />{/snippet}
			</NavItem>

			<NavItem href={dashboardPath('trends')} {collapsed} label="Tren & Grafik">
				{#snippet icon()}<IconChart class="size-[18px]" />{/snippet}
			</NavItem>

			<NavItem href={dashboardPath('laporan')} {collapsed} label="Laporan">
				{#snippet icon()}<IconFileText class="size-[18px]" />{/snippet}
			</NavItem>

			{#if showMonthlyUpload}
				<!-- Excel bulanan, prakiraan hujan, dan kurva EVA per PLTA dalam satu menu. -->
				<NavItem href={UPLOAD_PATH} {collapsed} label="Upload">
					{#snippet icon()}<IconUpload class="size-[18px]" />{/snippet}
				</NavItem>
			{/if}

			{#if showDataTools}
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

		<!--
			Satu pemicu untuk semua urusan akun: profil, panduan, dan keluar. Dulu
			nama pengguna langsung membuka Profil dan ada ikon keluar kecil di
			sebelahnya — dua sasaran klik berdempetan, dan satu di antaranya aksi
			yang memutus sesi.
		-->
		{#if user}
			<div
				class={`shrink-0 border-t border-border-subtle p-2 transition-all duration-300 ${
					collapsed ? 'lg:flex lg:justify-center' : ''
				}`}
			>
				<ProfileMenu
					{user}
					{collapsed}
					accountHref={dashboardPath('account')}
					onNavigate={closeMobileSidebar}
					onLogout={() => {
						closeMobileSidebar();
						isLogoutDialogOpen = true;
					}}
				/>
			</div>
		{/if}
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
			{#if isLeavingPage && navigating.to}
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
