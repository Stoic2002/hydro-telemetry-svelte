import { redirect } from '@sveltejs/kit';

export const load = ({ params, url }) => {
	redirect(307, `/dashboard/plta/${params.pltaId}/telemetering/bulanan${url.search}`);
};
