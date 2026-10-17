<script lang="ts">
	import { z } from 'zod';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import IconUser from '~icons/ph/user';
	import IconLock from '~icons/ph/lock-simple';
	import IconEye from '~icons/ph/eye';
	import IconEyeSlash from '~icons/ph/eye-slash';
	import Button from '$components/controls/Button.svelte';
	import Input from '$components/controls/Input.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import { Form } from '$shared/lib/form.svelte';
	import {
		RETURN_PATH_PARAM,
		SESSION_EXPIRED_PARAM,
		SESSION_EXPIRED_VALUE,
		authStore,
		safeReturnPath
	} from '$features/auth';

	const loginSchema = z.object({
		username: z.string().trim().min(1, 'Username wajib diisi'),
		password: z.string().min(1, 'Password wajib diisi')
	});

	let showPassword = $state(false);

	const isSessionExpired = $derived(
		page.url.searchParams.get(SESSION_EXPIRED_PARAM) === SESSION_EXPIRED_VALUE
	);

	const form = new Form({
		schema: loginSchema,
		initial: { username: '', password: '' },
		onSubmit: async ({ username, password }) => {
			authStore.clearError();
			const success = await authStore.login(username, password);
			// Kembali ke halaman yang dibuka sebelum sesi habis, bukan ke Overview.
			if (success) {
				await goto(safeReturnPath(page.url.searchParams.get(RETURN_PATH_PARAM)), {
					replaceState: true
				});
			}
		}
	});
</script>

<div
	class="flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-surface-base p-6 font-sans"
>
	<!-- Kisi latar tipis; murni dekoratif, kontrasnya sengaja hampir tak terlihat. -->
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 opacity-[0.02]"
		style="background-image: linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px); background-size: 40px 40px"
	></div>

	<div class="relative z-10 flex h-fit w-fit flex-col items-center gap-6">
		<div class="flex flex-col items-center gap-3">
			<div class="flex size-14 shrink-0 items-center justify-center">
				<img src="/logo.png" alt="Logo PLN Indonesia Power" class="size-14 object-contain" />
			</div>
			<div class="flex flex-col items-center gap-0.5">
				<h1
					class="text-center font-display text-xl leading-normal font-bold tracking-[-0.5px] text-text-primary"
				>
					PLTA Monitoring
				</h1>
				<p class="text-center font-sans text-[13px] leading-normal text-text-muted">
					Telemetering · Forecasting · Reporting
				</p>
			</div>
		</div>

		<form
			onsubmit={(event) => form.submit(event)}
			class="flex h-fit w-full flex-col gap-5 rounded-xl border border-border-subtle bg-surface-raised p-8 sm:w-[400px]"
		>
			<div class="flex flex-col gap-1.5">
				<h2
					class="font-display text-xl leading-normal font-semibold tracking-[-0.5px] text-text-primary"
				>
					Masuk ke akun Anda
				</h2>
				<p class="font-sans text-sm leading-normal text-text-muted">
					Gunakan kredensial operator yang terdaftar.
				</p>
			</div>

			{#if authStore.error}
				<Banner tone="danger">{authStore.error}</Banner>
			{:else if isSessionExpired}
				<Banner tone="warning">Sesi Anda sudah berakhir. Masuk lagi untuk melanjutkan.</Banner>
			{/if}

			<!--
				Field memakai `Input` (kelas `.field`) seperti seluruh aplikasi — dulu
				ditulis tangan dengan radius penampung 20px. Pesan galat terhubung ke
				isiannya lewat `aria-describedby` di dalam `Input`.
			-->
			<Input
				id="username"
				label="Username"
				placeholder="contoh: budi.santoso"
				autocomplete="username"
				bind:value={form.values.username}
				error={form.errors.username}
				oninput={() => {
					form.clearError('username');
					authStore.clearError();
				}}
			>
				{#snippet leftIcon()}<IconUser class="size-4" aria-hidden="true" />{/snippet}
			</Input>

			<!-- Tanpa placeholder "••••": titik-titik terbaca seperti password yang sudah terisi. -->
			<Input
				id="password"
				label="Password"
				type={showPassword ? 'text' : 'password'}
				autocomplete="current-password"
				bind:value={form.values.password}
				error={form.errors.password}
				oninput={() => {
					form.clearError('password');
					authStore.clearError();
				}}
			>
				{#snippet leftIcon()}<IconLock class="size-4" aria-hidden="true" />{/snippet}
				{#snippet rightIcon()}
					<button
						type="button"
						aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
						onclick={() => (showPassword = !showPassword)}
						class="flex cursor-pointer rounded-sm text-text-muted transition-colors hover:text-text-secondary"
					>
						{#if showPassword}
							<IconEyeSlash class="size-4" aria-hidden="true" />
						{:else}
							<IconEye class="size-4" aria-hidden="true" />
						{/if}
					</button>
				{/snippet}
			</Input>

			<Button
				type="submit"
				variant="primary"
				isLoading={authStore.isLoading}
				size="lg"
				class="w-full"
			>
				{authStore.isLoading ? 'Memproses…' : 'Masuk'}
			</Button>
		</form>

		<footer class="mt-4 text-[11px] font-medium tracking-[0.14em] text-text-muted uppercase">
			PLN Indonesia Power © 2026
		</footer>
	</div>
</div>
