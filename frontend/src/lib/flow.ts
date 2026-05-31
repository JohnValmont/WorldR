/**
 * Determines the correct redirect path for the user based on their progress
 * through the pre-alpha flow and citizen file creation.
 */
export const getFlowRedirectPath = (): string => {
  if (typeof window === 'undefined') return '/pre-alpha-access';

  const hasAccess = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
  const hasMotherland = !!localStorage.getItem('worldr_selected_motherland');
  const hasCitizenFile = !!localStorage.getItem('worldr_citizen_file_v1');

  if (!hasAccess) {
    return '/pre-alpha-access';
  }

  if (!hasMotherland) {
    return '/world-entry';
  }

  if (!hasCitizenFile) {
    return '/start/citizen-file';
  }

  return '/drennia/home';
};
