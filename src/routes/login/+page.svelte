<script lang="ts">
	import { z } from 'zod';
	import { goto } from '$app/navigation';
	import IconUser from '~icons/ph/user';
	import IconLock from '~icons/ph/lock-simple';
	import IconEye from '~icons/ph/eye';
	import IconEyeSlash from '~icons/ph/eye-slash';
	import Button from '$components/atoms/Button.svelte';
	import Banner from '$components/ui/Banner.svelte';
	import { Form } from '$shared/lib/form.svelte';
	import { authStore } from '$features/auth';

	const loginSchema = z.object({
		username: z.string().trim().min(1, 'Username wajib diisi'),
		password: z.string().min(1, 'Password wajib diisi')
	});

	let showPassword = $state(false);

	const form = new Form({
		schema: loginSchema,
		initial: { username: '', password: '' },
		onSubmit: async ({ username, password }) => {
			authStore.clearError();
			const success = await authStore.login(username, password);
			if (success) await goto('/dashboard', { replaceState: true });
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
				<img src="/logo.png" alt="Logo PLN" class="size-14 object-contain" />
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
			{/if}

			<div class="flex h-fit w-full flex-col gap-2">
				<label
					for="username"
					class="font-sans text-[13px] leading-normal font-medium text-text-secondary"
				>
					Username
				</label>
				<div
					class="flex h-12 w-full items-center gap-3 rounded-xl border border-border-subtle bg-surface-base px-4 py-0 transition-all duration-200 focus-within:border-brand-primary-strong focus-within:ring-[3px] focus-within:ring-brand-primary-strong/15"
				>
					<IconUser class="size-4 shrink-0 text-text-muted" />
					<input
						id="username"
						type="text"
						placeholder="contoh: budi.santoso"
						autocomplete="username"
						bind:value={form.values.username}
						oninput={() => {
							form.clearError('username');
							authStore.clearError();
						}}
						aria-invalid={form.errors.username ? 'true' : undefined}
						class="w-full border-none bg-transparent font-sans text-sm leading-normal text-text-primary outline-none placeholder:text-text-muted"
					/>
				</div>
				{#if form.errors.username}
					<span class="text-xs font-medium text-status-danger-strong">{form.errors.username}</span>
				{/if}
			</div>

			<div class="flex h-fit w-full flex-col gap-2">
				<label
					for="password"
					class="font-sans text-[13px] leading-normal font-medium text-text-secondary"
				>
					Password
				</label>
				<div
					class="flex h-12 w-full items-center gap-3 rounded-xl border border-border-subtle bg-surface-base px-4 py-0 transition-all duration-200 focus-within:border-brand-primary-strong focus-within:ring-[3px] focus-within:ring-brand-primary-strong/15"
				>
					<IconLock class="size-4 shrink-0 text-text-muted" />
					<input
						id="password"
						type={showPassword ? 'text' : 'password'}
						placeholder="••••••••"
						autocomplete="current-password"
						bind:value={form.values.password}
						oninput={() => {
							form.clearError('password');
							authStore.clearError();
						}}
						aria-invalid={form.errors.password ? 'true' : undefined}
						class="w-full border-none bg-transparent font-sans text-sm leading-normal tracking-[1.4px] text-text-primary outline-none placeholder:text-text-muted"
					/>
					<button
						type="button"
						aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
						onclick={() => (showPassword = !showPassword)}
						class="cursor-pointer text-text-muted transition-colors hover:text-text-secondary focus:outline-none"
					>
						{#if showPassword}
							<IconEyeSlash class="size-4" />
						{:else}
							<IconEye class="size-4" />
						{/if}
					</button>
				</div>
				{#if form.errors.password}
					<span class="text-xs font-medium text-status-danger-strong">{form.errors.password}</span>
				{/if}
			</div>

			<Button
				type="submit"
				variant="primary"
				isLoading={authStore.isLoading}
				disabled={!form.isValid}
				class="h-12 w-full"
			>
				{authStore.isLoading ? 'Memproses…' : 'Masuk'}
			</Button>
		</form>

		<footer class="mt-4 text-[11px] font-medium tracking-[0.14em] text-text-muted uppercase">
			PLN Indonesia Power © 2026
		</footer>
	</div>
</div>
