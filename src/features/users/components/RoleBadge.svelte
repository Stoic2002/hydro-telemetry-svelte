<script lang="ts">
	import Badge, { type BadgeTone } from '$components/atoms/Badge.svelte';
	import type { UserRole } from '$features/auth';

	let { role }: { role: UserRole } = $props();

	const ROLE_TONE: Record<UserRole, BadgeTone> = {
		'Super Admin': 'cyan',
		'Admin UBP': 'cyan',
		'Operator PLTA': 'amber',
		Viewer: 'slate'
	};
</script>

<Badge tone={ROLE_TONE[role]}>{role}</Badge>
