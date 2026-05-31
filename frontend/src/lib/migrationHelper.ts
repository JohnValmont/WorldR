export function migrateLegacyDrenniaLocalStorage() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('worldr_legacy_drennia_quarantine_completed_v1')) return;

  const prefix = 'worldr_';
  const legacyPrefix = 'worldr_legacy_';

  // Do not migrate tokens or character selection
  const skipList = [
    'worldr_access_token',
    'worldr_refresh_token',
    'worldr_character',
    'worldr_selected_path',
    'worldr_selected_country',
  ];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && !key.startsWith(legacyPrefix)) {
      if (!skipList.includes(key)) {
        const data = localStorage.getItem(key);
        if (data) {
          localStorage.setItem(key.replace(prefix, legacyPrefix), data);
        }
      }
    }
  }

  localStorage.setItem('worldr_legacy_drennia_quarantine_completed_v1', 'true');
}

export function resetWorldrLocalData(scope: 'legacy' | 'future' | 'all') {
  if (typeof window === 'undefined') return;

  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    if (scope === 'legacy' || scope === 'all') {
      if (
        key.startsWith('worldr_legacy_') ||
        (key.startsWith('worldr_') && 
         !key.startsWith('worldr_living_world_') &&
         !key.startsWith('worldr_access_') &&
         !key.startsWith('worldr_refresh_'))
      ) {
        toRemove.push(key);
      }
    }

    if (scope === 'future' || scope === 'all') {
      if (
        key.startsWith('worldr_living_world_') ||
        key.startsWith('worldr_drennia_world_v2_') ||
        key.startsWith('worldr_character_origin_v2_') ||
        key.startsWith('worldr_opportunity_board_') ||
        key.startsWith('worldr_npc_world_') ||
        key.startsWith('worldr_institutions_') ||
        key.startsWith('worldr_district_elections_') ||
        key.startsWith('worldr_business_path_') ||
        key.startsWith('worldr_public_records_') ||
        key.startsWith('worldr_relationships_')
      ) {
        toRemove.push(key);
      }
    }
  }

  for (const key of toRemove) {
    // Preserve authentication/onboarding tokens just in case
    if (key === 'worldr_access_token' || key === 'worldr_refresh_token' || key === 'worldr_character' || key === 'worldr_selected_path' || key === 'worldr_selected_country') {
      continue;
    }
    localStorage.removeItem(key);
  }
}
