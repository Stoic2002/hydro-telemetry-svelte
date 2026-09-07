import type { SelectOption } from '$components/atoms/Select.svelte';

/** Peran yang dikenal backend. Label-nya memakai kosakata UI, bukan kode API. */
export const ROLE_OPTIONS: SelectOption[] = [
	{ value: 'admin', label: 'Super Admin' },
	{ value: 'operator', label: 'Operator PLTA' },
	{ value: 'viewer', label: 'Viewer' }
];
