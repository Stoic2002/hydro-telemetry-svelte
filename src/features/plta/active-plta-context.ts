import { getContext, setContext } from 'svelte';
import type { Plant } from './model';

export interface ActivePLTA {
	/** ID PLTA pada route, sudah divalidasi bentuknya. */
	pltaId: string;
	/** Data plant dari API. */
	plant: Plant;
	/** Nama tampilan tanpa prefiks "PLTA", dipakai di judul dan deskripsi halaman. */
	displayName: string;
}

/**
 * PLTA aktif diselesaikan sekali di level route, lalu dibagikan ke seluruh
 * halaman di bawahnya.
 *
 * Sebelumnya setiap halaman memanggil hook yang melempar `Error` bila data
 * belum ada, sehingga kondisi data biasa bisa merobohkan render. Sekarang route
 * hanya merender turunannya setelah data tersedia, jadi nilai context ini
 * dijamin ada dan halaman tidak perlu lagi menangani kondisi kosong.
 *
 * Yang disimpan adalah *accessor*, bukan nilai jadi: berpindah PLTA mengganti
 * nilainya tanpa melepas layout, jadi turunan harus membaca nilai terbaru
 * setiap kali, bukan nilai saat context dipasang.
 */
const ACTIVE_PLTA_KEY = Symbol('active-plta');

export function setActivePLTAContext(accessor: () => ActivePLTA): void {
	setContext(ACTIVE_PLTA_KEY, accessor);
}

function readActivePLTAContext(callerName: string): ActivePLTA {
	const accessor = getContext<(() => ActivePLTA) | undefined>(ACTIVE_PLTA_KEY);

	if (!accessor) {
		// Ini kesalahan penempatan komponen, bukan kondisi data: dipakai di luar
		// route `/dashboard/plta/[pltaId]`.
		throw new Error(
			`${callerName} hanya boleh dipakai di dalam route PLTA (/dashboard/plta/[pltaId])`
		);
	}

	return accessor();
}

export function getActivePLTA(): ActivePLTA {
	return readActivePLTAContext('getActivePLTA');
}

export function getActivePLTAId(): string {
	return readActivePLTAContext('getActivePLTAId').pltaId;
}
