<script lang="ts">
	import { getActivePLTA, getActivePLTAId } from './active-plta-context';

	/**
	 * Meniru persis pola yang dipakai halaman dashboard: context dibaca lewat
	 * `$derived`, lalu nilainya diteruskan ke accessor query.
	 */
	const activePLTA = $derived(getActivePLTA());
	const pltaId = $derived(activePLTA.pltaId);
	const displayName = $derived(activePLTA.displayName);

	// Bentuk yang dipakai PlantSwitcher.
	const activePlantId = $derived(getActivePLTAId());

	// Bentuk yang sama dengan `createPLTATagsQuery(() => pltaId, ...)`.
	const queryAccessor = () => pltaId;
</script>

<p data-testid="plta-id">{pltaId}</p>
<p data-testid="plta-name">{displayName}</p>
<p data-testid="query-accessor">{queryAccessor()}</p>
<p data-testid="plta-id-only">{activePlantId}</p>
