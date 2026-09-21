import { redirect } from '@sveltejs/kit';
import { getEvaUploadPath } from '$features/plta';

/** Input GHW sekarang tab "Input EVA" di menu Upload. Bookmark lama tetap membuka PLTA yang sama. */
export const load = ({ params }) => {
	redirect(307, getEvaUploadPath(params.pltaId));
};
