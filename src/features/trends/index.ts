export { createTrendQuery } from './api/queries';
// Dipakai monitoring untuk hujan terukur: jendela bergulir per stasiun yang
// diringkas dengan maksimum, bukan satu grafik — jadi bukan lewat query tren.
export { trendsRepository } from './api/repository';
export { alignTrendRange } from './model';
export type { TrendResolution, TrendSeries } from './model';
