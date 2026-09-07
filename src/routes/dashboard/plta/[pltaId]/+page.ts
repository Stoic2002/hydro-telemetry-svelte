import { redirect } from '@sveltejs/kit';

export const load = ({ params }) => {
	redirect(307, `/dashboard/plta/${params.pltaId}/telemetering`);
};
