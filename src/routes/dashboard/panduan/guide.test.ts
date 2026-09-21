import { describe, expect, it, vi } from 'vitest';

// Barrel `features/auth` ikut memuat store sesi yang butuh `window`; yang dipakai
// panduan hanya aturan role, jadi aturan aslinya saja yang diteruskan.
vi.mock('$features/auth', async () => await import('../../../features/auth/permissions'));

const { GUIDE_CHAPTERS, filterGuideByAccess, parseEmphasis, searchGuide } = await import('./guide');

type Role = 'Super Admin' | 'Operator PLTA' | 'Viewer';

function userWithRole(role: Role) {
	return { id: 'u', name: 'Uji', username: 'uji', email: 'uji@contoh.id', role } as never;
}

function chapterIds(role: Role) {
	return filterGuideByAccess(GUIDE_CHAPTERS, userWithRole(role)).map((chapter) => chapter.id);
}

function blockTitles(role: Role) {
	return filterGuideByAccess(GUIDE_CHAPTERS, userWithRole(role)).flatMap((chapter) =>
		chapter.blocks.map((block) => block.title)
	);
}

describe('panduan per role', () => {
	it('tidak menjelaskan menu yang tidak bisa dibuka Viewer', () => {
		const ids = chapterIds('Viewer');

		expect(ids).not.toContain('upload');
		expect(ids).not.toContain('katalog');
		expect(ids).not.toContain('user-management');
		expect(ids).toContain('tren');
	});

	it('menyembunyikan langkah input data dari Viewer tanpa membuang babnya', () => {
		expect(chapterIds('Viewer')).toContain('telemetering');
		expect(blockTitles('Viewer')).not.toContain('Mengisi data harian');
		expect(blockTitles('Operator PLTA')).toContain('Mengisi data harian');
	});

	it('memberi Operator Upload dan Katalog, tapi bukan User Management', () => {
		const ids = chapterIds('Operator PLTA');

		expect(ids).toContain('upload');
		expect(ids).toContain('katalog');
		expect(ids).not.toContain('user-management');
	});

	it('menampilkan seluruh bab untuk Super Admin', () => {
		expect(chapterIds('Super Admin')).toEqual(GUIDE_CHAPTERS.map((chapter) => chapter.id));
	});
});

describe('pencarian panduan', () => {
	it('mengembalikan semua bab bila kata kunci kosong', () => {
		expect(searchGuide(GUIDE_CHAPTERS, '   ')).toBe(GUIDE_CHAPTERS);
	});

	it('menampilkan bab utuh bila judulnya cocok', () => {
		const [chapter] = searchGuide(GUIDE_CHAPTERS, 'laporan time series');
		const original = GUIDE_CHAPTERS.find((item) => item.id === 'laporan');

		expect(chapter?.id).toBe('laporan');
		expect(chapter?.blocks).toHaveLength(original?.blocks.length ?? -1);
	});

	it('mencocokkan setiap kata tanpa memedulikan urutan dan penanda tebal', () => {
		const titles = searchGuide(GUIDE_CHAPTERS, 'eva upload').flatMap((chapter) =>
			chapter.blocks.map((block) => block.title)
		);

		expect(titles).toContain('Input EVA');
	});

	it('tidak mengembalikan apa pun untuk kata yang tidak ada', () => {
		expect(searchGuide(GUIDE_CHAPTERS, 'xyzzy')).toEqual([]);
	});
});

describe('penanda tebal', () => {
	it('memecah teks menjadi potongan biasa dan tebal', () => {
		expect(parseEmphasis('Tekan **Simpan Data** lalu tunggu.')).toEqual([
			{ text: 'Tekan ', strong: false },
			{ text: 'Simpan Data', strong: true },
			{ text: ' lalu tunggu.', strong: false }
		]);
	});

	it('menjaga posisi tebal saat teks diawali penanda', () => {
		expect(parseEmphasis('**Viewer** — melihat')).toEqual([
			{ text: 'Viewer', strong: true },
			{ text: ' — melihat', strong: false }
		]);
	});
});

describe('isi panduan', () => {
	it('tidak punya penanda tebal yang tidak ditutup', () => {
		const texts = GUIDE_CHAPTERS.flatMap((chapter) =>
			chapter.blocks.flatMap((block) => [...(block.steps ?? []), ...(block.notes ?? [])])
		);

		for (const text of texts) {
			expect(text.split('**').length % 2, text).toBe(1);
		}
	});

	it('tidak punya judul bagian ganda dalam satu bab', () => {
		for (const chapter of GUIDE_CHAPTERS) {
			const titles = chapter.blocks.map((block) => block.title);
			expect(new Set(titles).size, chapter.id).toBe(titles.length);
		}
	});
});
