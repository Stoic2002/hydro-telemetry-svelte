import { requireMonthlyUpload } from '$core/guards';

export const load = ({ url }) => requireMonthlyUpload(url);
