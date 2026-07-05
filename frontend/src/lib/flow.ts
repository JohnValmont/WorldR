/**
 * Determines the correct redirect path for the user based on their progress
 * through the pre-alpha flow and citizen file creation.
 */
export const getFlowRedirectPath = (): string => {
  if (typeof window === 'undefined') return '/world-entry';

  const hasMotherland = !!localStorage.getItem('worldr_selected_motherland');
  const hasCitizenFile = !!localStorage.getItem('worldr_citizen_file_v1');

  if (!hasMotherland) {
    return '/world-entry';
  }

  if (!hasCitizenFile) {
    return '/start/citizen-file';
  }

  return '/drennia/home';
};
