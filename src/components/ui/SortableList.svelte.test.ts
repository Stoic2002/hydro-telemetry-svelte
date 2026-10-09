import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import SortableList from './SortableList.svelte';

/**
 * Seret dengan pointer (mouse dan sentuh lewat jalur yang sama). jsdom tidak
 * menghitung tata letak, jadi setiap baris dipalsukan setinggi 40px dan
 * ditumpuk menurut posisinya di DOM — cukup untuk menguji "tukar begitu
 * penunjuk melewati tengah baris tetangga".
 */

interface Item {
	key: string;
	label: string;
}

const ROW_HEIGHT = 40;
const items: Item[] = [
	{ key: 'a', label: 'Satu' },
	{ key: 'b', label: 'Dua' },
	{ key: 'c', label: 'Tiga' }
];

const row = createRawSnippet((item: () => Item) => ({
	render: () =>
		`<span><span>${item().label}</span><button type="button" role="switch" aria-checked="false" aria-label="Sakelar ${item().label}"></button></span>`
}));

function renderList(onReorder = vi.fn(), disabled = false) {
	render(SortableList<Item>, {
		props: {
			items,
			getKey: (item: Item) => item.key,
			getLabel: (item: Item) => item.label,
			onReorder,
			ariaLabel: 'Daftar uji',
			disabled,
			row
		}
	});
	return onReorder;
}

function rowCenter(index: number) {
	return index * ROW_HEIGHT + ROW_HEIGHT / 2;
}

// jsdom 26 belum punya `PointerEvent`; tanpa ini fireEvent jatuh ke `Event`
// biasa yang tidak membawa `button` maupun `clientY`.
beforeAll(() => {
	if (typeof window.PointerEvent === 'function') return;

	class TestPointerEvent extends MouseEvent {
		pointerId: number;
		pointerType: string;
		constructor(type: string, init: PointerEventInit = {}) {
			super(type, init);
			this.pointerId = init.pointerId ?? 0;
			this.pointerType = init.pointerType ?? 'mouse';
		}
	}
	window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
});

beforeEach(() => {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: HTMLElement
	) {
		const rowElement = this.closest('[data-sortable-key]');
		const index = rowElement
			? Array.from(rowElement.parentElement!.children).indexOf(rowElement)
			: 0;
		const top = index * ROW_HEIGHT;
		return {
			top,
			bottom: top + ROW_HEIGHT,
			height: ROW_HEIGHT,
			left: 0,
			right: 0,
			width: 0,
			x: 0,
			y: top,
			toJSON: () => ({})
		};
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('SortableList', () => {
	it('memindahkan baris yang diseret melewati tengah baris tetangga', async () => {
		const onReorder = renderList();
		const handle = screen.getByRole('button', { name: /Urutkan Satu/ });

		await fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: rowCenter(0) });
		await fireEvent.pointerMove(handle, { pointerId: 1, clientY: rowCenter(1) + 1 });
		await fireEvent.pointerMove(handle, { pointerId: 1, clientY: rowCenter(2) + 1 });
		await fireEvent.pointerUp(handle, { pointerId: 1, clientY: rowCenter(2) + 1 });

		expect(onReorder).toHaveBeenCalledTimes(1);
		expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
	});

	it('seretan cepat (satu event gerak) langsung sampai ke posisi tujuan', async () => {
		const onReorder = renderList();
		const handle = screen.getByRole('button', { name: /Urutkan Tiga/ });

		await fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: rowCenter(2) });
		await fireEvent.pointerMove(handle, { pointerId: 1, clientY: 2 });
		await fireEvent.pointerUp(handle, { pointerId: 1, clientY: 2 });

		expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);
	});

	it('tidak memanggil onReorder bila baris dilepas di tempat semula', async () => {
		const onReorder = renderList();
		const handle = screen.getByRole('button', { name: /Urutkan Dua/ });

		await fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: rowCenter(1) });
		await fireEvent.pointerMove(handle, { pointerId: 1, clientY: rowCenter(1) + 5 });
		await fireEvent.pointerUp(handle, { pointerId: 1, clientY: rowCenter(1) + 5 });

		expect(onReorder).not.toHaveBeenCalled();
	});

	it('membatalkan seretan yang diambil alih browser (pointercancel)', async () => {
		const onReorder = renderList();
		const handle = screen.getByRole('button', { name: /Urutkan Satu/ });

		await fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: rowCenter(0) });
		await fireEvent.pointerMove(handle, { pointerId: 1, clientY: rowCenter(2) + 1 });
		await fireEvent.pointerCancel(handle, { pointerId: 1 });

		expect(onReorder).not.toHaveBeenCalled();
		expect(screen.getAllByRole('listitem').map((element) => element.textContent?.trim())).toEqual([
			'Satu',
			'Dua',
			'Tiga'
		]);
	});

	it('tidak bisa diseret saat dinonaktifkan', async () => {
		const onReorder = renderList(vi.fn(), true);
		const handle = screen.getByRole('button', { name: /Urutkan Satu/ });

		expect(handle).toBeDisabled();
		await fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: rowCenter(0) });
		await fireEvent.pointerMove(handle, { pointerId: 1, clientY: rowCenter(2) + 1 });
		await fireEvent.pointerUp(handle, { pointerId: 1 });

		expect(onReorder).not.toHaveBeenCalled();
	});

	it('mouse bisa menyeret dari badan baris, bukan hanya pegangannya', async () => {
		const onReorder = renderList();
		const label = screen.getByText('Satu');

		await fireEvent.pointerDown(label, {
			button: 0,
			pointerId: 1,
			pointerType: 'mouse',
			clientY: rowCenter(0)
		});
		await fireEvent.pointerMove(window, { pointerId: 1, clientY: rowCenter(2) + 1 });
		await fireEvent.pointerUp(window, { pointerId: 1 });

		expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
	});

	it('menekan sakelar di dalam baris tidak memulai seretan', async () => {
		const onReorder = renderList();
		const toggle = screen.getByRole('switch', { name: 'Sakelar Satu' });

		await fireEvent.pointerDown(toggle, {
			button: 0,
			pointerId: 1,
			pointerType: 'mouse',
			clientY: rowCenter(0)
		});
		await fireEvent.pointerMove(window, { pointerId: 1, clientY: rowCenter(2) + 1 });
		await fireEvent.pointerUp(window, { pointerId: 1 });

		expect(onReorder).not.toHaveBeenCalled();
	});

	it('sentuhan di badan baris tetap menggulir, hanya pegangan yang menyeret', async () => {
		const onReorder = renderList();

		await fireEvent.pointerDown(screen.getByText('Satu'), {
			button: 0,
			pointerId: 1,
			pointerType: 'touch',
			clientY: rowCenter(0)
		});
		await fireEvent.pointerMove(window, { pointerId: 1, clientY: rowCenter(2) + 1 });
		await fireEvent.pointerUp(window, { pointerId: 1 });
		expect(onReorder).not.toHaveBeenCalled();

		const handle = screen.getByRole('button', { name: /Urutkan Satu/ });
		await fireEvent.pointerDown(handle, {
			button: 0,
			pointerId: 2,
			pointerType: 'touch',
			clientY: rowCenter(0)
		});
		await fireEvent.pointerMove(window, { pointerId: 2, clientY: rowCenter(2) + 1 });
		await fireEvent.pointerUp(window, { pointerId: 2 });
		expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
	});

	it('gerakan sesudah baris berpindah tempat tetap terbaca (tidak tersangkut)', async () => {
		const onReorder = renderList();
		const handle = screen.getByRole('button', { name: /Urutkan Satu/ });

		await fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: rowCenter(0) });
		// Langkah pertama memindah baris di DOM; langkah berikutnya dikirim ke
		// window, seperti browser sesudah pointer capture pegangan lepas.
		await fireEvent.pointerMove(handle, { pointerId: 1, clientY: rowCenter(1) + 1 });
		await fireEvent.pointerMove(window, { pointerId: 1, clientY: rowCenter(2) + 1 });
		await fireEvent.pointerUp(window, { pointerId: 1 });

		expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
	});
});
