<script lang="ts">
	import type { Component } from 'svelte';
	import IconActivity from '~icons/ph/activity';
	import IconArrowRight from '~icons/ph/arrow-right';
	import IconChart from '~icons/ph/chart-bar';
	import IconDatabase from '~icons/ph/database';
	import IconFileText from '~icons/ph/file-text';
	import IconInfo from '~icons/ph/info';
	import IconLayoutDashboard from '~icons/ph/squares-four';
	import IconQuestion from '~icons/ph/question';
	import IconRocket from '~icons/ph/rocket-launch';
	import IconSearch from '~icons/ph/magnifying-glass';
	import IconTrendingUp from '~icons/ph/trend-up';
	import IconUpload from '~icons/ph/cloud-arrow-up';
	import IconUser from '~icons/ph/user-circle';
	import IconUsers from '~icons/ph/users';

	import Input from '$components/controls/Input.svelte';
	import EmptyState from '$components/ui/EmptyState.svelte';
	import PageHeader from '$components/ui/PageHeader.svelte';
	import { authStore } from '$features/auth';
	import { FORECASTING_PLTA_ID } from '$features/forecasting';
	import { UPLOAD_PATH, getPLTADashboardPath, getUnscopedDashboardPath } from '$features/plta';
	import GuideExample from './GuideExample.svelte';
	import GuideText from './GuideText.svelte';
	import { GUIDE_CHAPTERS, filterGuideByAccess, searchGuide, type GuideChapterId } from './guide';

	/** Ikon mengikuti ikon menu di sidebar, supaya bab mudah dikenali. */
	const CHAPTER_ICONS: Record<GuideChapterId, Component> = {
		memulai: IconRocket,
		overview: IconLayoutDashboard,
		telemetering: IconActivity,
		forecasting: IconTrendingUp,
		tren: IconChart,
		laporan: IconFileText,
		upload: IconUpload,
		katalog: IconDatabase,
		'user-management': IconUsers,
		profil: IconUser,
		faq: IconQuestion
	};

	/**
	 * Tautan ke menu yang dibahas. Rute tanpa `pltaId` dialihkan sendiri ke PLTA
	 * bawaan, jadi halaman ini tidak perlu memuat katalog PLTA.
	 */
	const CHAPTER_LINKS: Partial<Record<GuideChapterId, string>> = {
		overview: getUnscopedDashboardPath('overview'),
		telemetering: getUnscopedDashboardPath('telemetering'),
		forecasting: getPLTADashboardPath(FORECASTING_PLTA_ID, 'forecasting'),
		tren: getUnscopedDashboardPath('trends'),
		laporan: getUnscopedDashboardPath('laporan'),
		upload: UPLOAD_PATH,
		katalog: '/dashboard/catalog',
		'user-management': getUnscopedDashboardPath('user-management'),
		profil: getUnscopedDashboardPath('account')
	};

	let query = $state('');

	const readableChapters = $derived(filterGuideByAccess(GUIDE_CHAPTERS, authStore.user));
	const visibleChapters = $derived(searchGuide(readableChapters, query));
	const isSearching = $derived(query.trim().length > 0);
	const matchedBlockCount = $derived(
		visibleChapters.reduce((total, chapter) => total + chapter.blocks.length, 0)
	);

	function anchorId(id: GuideChapterId): string {
		return `bab-${id}`;
	}
</script>

<div class="flex flex-1 flex-col gap-6">
	<PageHeader
		title="Panduan Penggunaan"
		description="Cara memakai setiap menu, disesuaikan dengan peran akun Anda"
	/>

	<div class="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
		<aside class="flex flex-col gap-4 lg:sticky lg:top-6">
			<Input
				type="search"
				size="sm"
				bind:value={query}
				placeholder="Cari di panduan…"
				aria-label="Cari di panduan"
				maxlength={100}
			>
				{#snippet leftIcon()}<IconSearch class="size-4" />{/snippet}
			</Input>

			<nav aria-label="Daftar isi panduan" class="hidden lg:block">
				<p class="table-head-cell px-3">Daftar isi</p>
				<ul class="mt-2 flex flex-col gap-0.5">
					{#each visibleChapters as chapter (chapter.id)}
						{@const Icon = CHAPTER_ICONS[chapter.id]}
						<li>
							<a
								href={`#${anchorId(chapter.id)}`}
								class="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
							>
								<Icon class="size-4 shrink-0 text-text-muted" aria-hidden="true" />
								{chapter.title}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</aside>

		<div class="flex min-w-0 flex-col">
			{#if isSearching && visibleChapters.length > 0}
				<p class="mb-4 text-xs text-text-muted" role="status">
					{matchedBlockCount} bagian cocok dengan “{query.trim()}”
				</p>
			{/if}

			{#if visibleChapters.length === 0}
				<EmptyState
					title="Panduan tidak ditemukan"
					description="Coba kata lain, misalnya nama menu seperti “upload” atau “laporan”."
				/>
			{:else}
				{#each visibleChapters as chapter, chapterIndex (chapter.id)}
					{@const Icon = CHAPTER_ICONS[chapter.id]}
					{@const link = CHAPTER_LINKS[chapter.id]}
					<section
						id={anchorId(chapter.id)}
						aria-labelledby={`${anchorId(chapter.id)}-judul`}
						class={`scroll-mt-6 ${chapterIndex > 0 ? 'mt-8 border-t border-border-subtle pt-8' : ''}`}
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="flex min-w-0 items-start gap-3">
								<span
									class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-text-muted"
								>
									<Icon class="size-[18px]" aria-hidden="true" />
								</span>
								<div class="min-w-0">
									<h2 id={`${anchorId(chapter.id)}-judul`} class="section-title">
										{chapter.title}
									</h2>
									<p class="mt-0.5 text-sm text-text-muted">{chapter.summary}</p>
								</div>
							</div>

							{#if link}
								<a
									href={link}
									class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-primary-strong hover:text-brand-primary-pressed"
								>
									Buka {chapter.title}
									<IconArrowRight class="size-3" aria-hidden="true" />
								</a>
							{/if}
						</div>

						<div class="mt-5 grid gap-x-8 gap-y-6 xl:grid-cols-2">
							{#each chapter.blocks as block (block.title)}
								<div class="min-w-0">
									<h3 class="card-title">{block.title}</h3>

									{#if block.steps}
										<ol class="mt-2.5 flex flex-col gap-2">
											{#each block.steps as step, stepIndex (stepIndex)}
												<li class="flex gap-2.5 text-sm leading-relaxed text-text-secondary">
													<span
														aria-hidden="true"
														class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-overlay font-mono text-[11px] font-medium text-text-subtle"
													>
														{stepIndex + 1}
													</span>
													<span class="min-w-0"><GuideText text={step} /></span>
												</li>
											{/each}
										</ol>
									{/if}

									{#if block.notes}
										<ul class={`flex flex-col gap-2 ${block.steps ? 'mt-3' : 'mt-2.5'}`}>
											{#each block.notes as note, noteIndex (noteIndex)}
												<li class="flex gap-2.5 text-sm leading-relaxed text-text-secondary">
													<IconInfo
														class="mt-1 size-3.5 shrink-0 text-text-muted"
														aria-hidden="true"
													/>
													<span class="min-w-0"><GuideText text={note} /></span>
												</li>
											{/each}
										</ul>
									{/if}

									{#if block.example}
										<GuideExample id={block.example} />
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/each}
			{/if}
		</div>
	</div>
</div>
