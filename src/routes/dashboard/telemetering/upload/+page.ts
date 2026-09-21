import { redirect } from '@sveltejs/kit';
import { UPLOAD_PATH } from '$features/plta';

/** Upload dulu sub-menu Telemetering. Dipertahankan supaya bookmark operator tidak mati. */
export const load = ({ url }) => {
	redirect(307, `${UPLOAD_PATH}${url.search}`);
};
