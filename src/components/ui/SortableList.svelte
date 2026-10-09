<script lang="ts" generics="T">
	import { tick, type Snippet } from 'svelte';
	import IconGrip from '~icons/ph/dots-six-vertical';
	import { moveItem } from '$shared/utils/array';

	interface Props {
		items: T[];
		getKey: (item: T) => string;
		/** Nama baris untuk pembaca layar, mis. "TMA Waduk". */
		getLabel: (item: T) => string;
		/** Urutan kunci baru, dipanggil sekali per pemindahan selesai. */
		onReorder: (keys: string[]) => void;
		ariaLabel: string;
		disabled?: boolean;
		row: Snippet<[T]>;
	}

	/**
	 * Daftar yang diurutkan dengan menyeret barisnya.
	 *
	 * Sengaja memakai pointer events, bukan drag-and-drop HTML5: yang terakhir
	 * tidak berjalan di layar sentuh tanpa pustaka tambahan, padahal layar ini
	 * juga dibuka dari tablet. Dengan mouse seluruh baris bisa diseret (kecuali
	 * kontrol di dalamnya); dengan sentuhan hanya pegangannya, supaya daftar
	 * tetap bisa digulir dengan jari. Pegangannya tombol sungguhan, jadi juga
	 * bisa digerakkan lewat keyboard (panah atas/bawah) dan diumumkan ke
	 * pembaca layar.
	 *
	 * Baris yang diseret mengikuti penunjuk, sedangkan baris lain langsung
	 * bergeser begitu penunjuk melewati tengahnya — posisi yang terlihat selalu
	 * posisi yang akan tersimpan.
	 *
	 * Gerak dan lepas didengar di `window`, bukan di pegangan: baris berkunci
	 * dipindah di DOM saat urutannya berubah, dan elemen yang dipindah
	 * kehilangan pointer capture-nya. Dulu itulah yang membuat seretan tersangkut
	 * setelah satu-dua baris.
	 */
	let { items, getKey, getLabel, onReorder, ariaLabel, disabled = false, row }: Props = $props();

	const EDGE_PX = 56;
	const MAX_SCROLL_STEP = 14;

	let listElement = $state<HTMLUListElement | null>(null);
	let draggingKey = $state<string | null>(null);
	let dragKeys = $state<string[]>([]);
	let announcement = $state('');

	/** Geser vertikal baris yang diseret dari posisi alaminya, agar ia menempel di penunjuk. */
	let dragOffset = $state(0);

	let pointerY = 0;
	/** Jarak penunjuk dari tepi atas baris saat mulai diseret. */
	let grabOffset = 0;
	let frame = 0;
	let scrollParent: HTMLElement | null = null;
	let stopListening: (() => void) | null = null;

	const itemKeys = $derived(items.map(getKey));
	const itemByKey = $derived(new Map(items.map((item) => [getKey(item), item])));
	const orderedItems = $derived(
		(draggingKey ? dragKeys : itemKeys)
			.map((key) => itemByKey.get(key))
			.filter((item): item is T => item !== undefined)
	);

	function findScrollParent(element: HTMLElement | null): HTMLElement | null {
		for (let node = element?.parentElement; node; node = node.parentElement) {
			const { overflowY } = getComputedStyle(node);
			if (overflowY === 'auto' || overflowY === 'scroll') return node;
		}
		return null;
	}

	function announce(key: string, keys: string[]) {
		const item = itemByKey.get(key);
		if (!item) return;
		announcement = `${getLabel(item)} dipindah ke posisi ${keys.indexOf(key) + 1} dari ${keys.length}`;
	}

	/**
	 * Posisi tujuan = banyaknya baris LAIN yang titik tengahnya di atas
	 * penunjuk — dihitung langsung, bukan satu tukar per event. Seretan cepat
	 * hanya menghasilkan sedikit event gerak, dan dengan tukar bertahap baris
	 * yang diseret ke paling atas berhenti satu-dua tingkat saja.
	 *
	 * Baris dicari lewat kuncinya, bukan urutan DOM: dua event bisa datang
	 * sebelum DOM diperbarui. Urutan relatif baris lain tidak pernah berubah
	 * selama menyeret, jadi hitungannya tetap sah.
	 */
	function moveToPointer() {
		if (!draggingKey || !listElement) return;

		const rowByKey = new Map(
			Array.from(listElement.querySelectorAll<HTMLElement>('[data-sortable-key]')).map(
				(element) => [element.dataset.sortableKey, element]
			)
		);
		const others = dragKeys.filter((key) => key !== draggingKey);
		const target = others.filter((key) => {
			const bounds = rowByKey.get(key)?.getBoundingClientRect();
			return bounds !== undefined && bounds.top + bounds.height / 2 < pointerY;
		}).length;

		const index = dragKeys.indexOf(draggingKey);
		if (target !== index) dragKeys = moveItem(dragKeys, index, target);
	}

	function rowElement(key: string): HTMLElement | undefined {
		return Array.from(listElement?.querySelectorAll<HTMLElement>('[data-sortable-key]') ?? []).find(
			(element) => element.dataset.sortableKey === key
		);
	}

	/** Posisi alami = posisi tampak dikurangi geser yang sedang dipasang. */
	function followPointer() {
		if (!draggingKey) return;
		const element = rowElement(draggingKey);
		if (!element) return;
		const naturalTop = element.getBoundingClientRect().top - dragOffset;
		dragOffset = pointerY - grabOffset - naturalTop;
	}

	/** Urutan berubah = baris dipindah di DOM; geser dihitung ulang sesudahnya. */
	async function trackPointer() {
		const before = dragKeys;
		moveToPointer();
		followPointer();
		if (dragKeys !== before) {
			await tick();
			followPointer();
		}
	}

	/** Menggulir wadahnya selagi penunjuk ditahan di dekat tepi atas/bawah. */
	function autoScroll() {
		if (!draggingKey) return;

		if (scrollParent) {
			const bounds = scrollParent.getBoundingClientRect();
			const above = bounds.top + EDGE_PX - pointerY;
			const below = pointerY - (bounds.bottom - EDGE_PX);
			const step =
				above > 0
					? -Math.min(MAX_SCROLL_STEP, above / 3)
					: below > 0
						? Math.min(MAX_SCROLL_STEP, below / 3)
						: 0;

			if (step !== 0) {
				scrollParent.scrollTop += step;
				void trackPointer();
			}
		}

		frame = requestAnimationFrame(autoScroll);
	}

	/**
	 * Mouse boleh mulai dari mana saja di baris kecuali kontrol di dalamnya
	 * (sakelar, tombol); sentuhan dan pena hanya dari pegangan.
	 */
	function canStartFrom(event: PointerEvent, fromHandle: boolean): boolean {
		if (disabled || event.button !== 0) return false;
		if (fromHandle) return true;
		if (event.pointerType !== 'mouse') return false;
		const target = event.target as HTMLElement | null;
		return !target?.closest('button, a, input, select, textarea, [role="switch"]');
	}

	function startDrag(event: PointerEvent, key: string, fromHandle: boolean) {
		if (!canStartFrom(event, fromHandle)) return;

		event.preventDefault();
		const element = rowElement(key);
		dragKeys = [...itemKeys];
		draggingKey = key;
		dragOffset = 0;
		pointerY = event.clientY;
		grabOffset = element ? event.clientY - element.getBoundingClientRect().top : 0;
		scrollParent = findScrollParent(listElement);

		const onMove = (moveEvent: PointerEvent) => {
			pointerY = moveEvent.clientY;
			void trackPointer();
		};
		const onUp = () => finishDrag(true);
		const onCancel = () => finishDrag(false);
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onCancel);
		document.body.style.cursor = 'grabbing';
		document.body.style.userSelect = 'none';
		stopListening = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onCancel);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};

		frame = requestAnimationFrame(autoScroll);
	}

	function finishDrag(commit: boolean) {
		if (!draggingKey) return;

		cancelAnimationFrame(frame);
		stopListening?.();
		stopListening = null;
		const key = draggingKey;
		const keys = dragKeys;
		draggingKey = null;
		dragOffset = 0;

		if (commit && keys.join('\n') !== itemKeys.join('\n')) {
			onReorder(keys);
			announce(key, keys);
		}
	}

	// Komponen dilepas di tengah seretan (sheet ditutup): pendengar di `window`
	// dan gaya kursor tidak boleh tertinggal.
	$effect(() => () => finishDrag(false));

	async function moveWithKeyboard(event: KeyboardEvent, key: string) {
		if (disabled) return;

		const offset = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
		if (offset === 0) return;

		event.preventDefault();
		const index = itemKeys.indexOf(key);
		const target = index + offset;
		if (target < 0 || target >= itemKeys.length) return;

		const keys = moveItem(itemKeys, index, target);
		onReorder(keys);
		announce(key, keys);

		// Baris berkunci dipindah di DOM, dan elemen yang dipindah kehilangan
		// fokus di sebagian browser. Pegangannya difokuskan ulang.
		await tick();
		const handles = listElement?.querySelectorAll<HTMLElement>('[data-sortable-handle]') ?? [];
		Array.from(handles)
			.find((handle) => handle.dataset.sortableHandle === key)
			?.focus();
	}
</script>

<ul bind:this={listElement} aria-label={ariaLabel} class="flex flex-col gap-2">
	{#each orderedItems as item (getKey(item))}
		{@const key = getKey(item)}
		{@const isDragging = draggingKey === key}
		<li
			data-sortable-key={key}
			onpointerdown={(event) => startDrag(event, key, false)}
			style:transform={isDragging ? `translateY(${dragOffset}px)` : undefined}
			class={`flex items-center gap-1.5 rounded-lg select-none ${
				isDragging ? 'relative z-10 bg-surface-raised shadow-panel' : disabled ? '' : 'cursor-grab'
			}`}
		>
			<button
				type="button"
				data-sortable-handle={key}
				{disabled}
				aria-label={`Urutkan ${getLabel(item)}. Seret, atau tekan panah atas/bawah`}
				onpointerdown={(event) => {
					event.stopPropagation();
					startDrag(event, key, true);
				}}
				onkeydown={(event) => void moveWithKeyboard(event, key)}
				class={`flex h-10 w-9 shrink-0 touch-none items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${
					isDragging ? 'cursor-grabbing text-text-primary' : 'cursor-grab'
				}`}
			>
				<IconGrip class="size-5" aria-hidden="true" />
			</button>
			<div class="min-w-0 flex-1">
				{@render row(item)}
			</div>
		</li>
	{/each}
</ul>

<p class="sr-only" aria-live="polite">{announcement}</p>
