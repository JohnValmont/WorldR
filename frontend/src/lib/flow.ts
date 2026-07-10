/**
 * Determines the correct redirect path for the user based on their progress
 * through the pre-alpha flow and citizen file creation.
 */
export const getFlowRedirectPath = (): string => {
  if (typeof window === 'undefined') return '/world-entry';

  const hasMotherland = !!localStorage.getItem('worldr_selected_motherland');
  const hasCitizenFile = !!localStorage.getItem('worldr_citizen_file_v1');

  if (!hasMotherland || !hasCitizenFile) {
    return '/landing/onboarding.html?action=character';
  }

  return '/drennia/chronicle';
};
