import { redirect } from '@sveltejs/kit';
import { getEvaUploadPath } from '$features/plta';

/** Input GHW sekarang tab "Input EVA" di menu Upload. */
export const load = () => {
	redirect(307, getEvaUploadPath());
};
