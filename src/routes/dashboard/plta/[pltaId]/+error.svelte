<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import ErrorState from '../../../../components/ui/ErrorState.svelte';

	/**
	 * Kegagalan menyiapkan PLTA aktif. Pesan yang tampil berasal dari
	 * `getPLTAErrorMessage`, jadi sudah berupa kalimat untuk operator — bukan
	 * pesan mentah dari server.
	 */
	let isRetrying = $state(false);

	async function retry() {
		isRetrying = true;
		try {
			await invalidateAll();
		} finally {
			isRetrying = false;
		}
	}
</script>

<div class="rounded-xl border border-border-subtle bg-surface-raised">
	<ErrorState
		title="Data PLTA belum dapat dimuat"
		description={page.error?.message ??
			'Terjadi gangguan saat menyiapkan data PLTA. Coba lagi, atau pilih PLTA lain dari sidebar.'}
		onRetry={retry}
		{isRetrying}
		class="py-10"
	/>
</div>
