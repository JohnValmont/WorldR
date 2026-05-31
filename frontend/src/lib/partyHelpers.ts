export function roundMoney(value: number): number {
  return Math.round(value);
}

export function roundActionMoney(value: number): number {
  return Math.round(value / 100) * 100;
}

export function formatNumberUS(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatPercent(value: number, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return value.toFixed(decimals) + '%';
}

export function formatMoneyUS(value: number, compact = false): string {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  const rounded = Math.round(value);
  if (compact) {
    const millions = rounded / 1000000;
    return '$' + millions.toFixed(1) + 'M';
  }
  return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(rounded);
}

export function formatMoney(value: number): string {
  const rounded = Math.round(value);
  if (rounded >= 1000000) {
    return formatMoneyUS(rounded, true);
  }
  return formatMoneyUS(rounded, false);
}


export function getLiveMemberCountForParty(party: any): number {
  if (typeof window === 'undefined') return party.members || party.memberCount || 1;

  try {
    const cpRaw = localStorage.getItem('worldr_current_party');
    const psRaw = localStorage.getItem('worldr_party_stats');
    
    if (cpRaw && psRaw) {
      const currentParty = JSON.parse(cpRaw);
      const stats = JSON.parse(psRaw);
      
      const isMatch = 
        party.partyId === currentParty.partyId ||
        party.partyAbbreviation === currentParty.partyAbbreviation ||
        party.abbreviation === currentParty.partyAbbreviation ||
        (party.partyName === currentParty.partyName && party.countryName === currentParty.countryName);

      if (isMatch && stats.members != null) {
        return Math.round(stats.members);
      }
    }
  } catch (e) {}

  return Math.round(party.members || party.memberCount || 1);
}

export function getLivePartyRegistryData() {
  if (typeof window === 'undefined') return [];

  let currentParty: any = null;
  let registeredParties: any[] = [];
  let partyStats: any = null;
  let partyBudget: any = null;
  let electionRegistrations: any[] = [];
  let electionCampaigns: any[] = [];
  let character: any = null;

  try {
    const cpRaw = localStorage.getItem('worldr_current_party');
    if (cpRaw) currentParty = JSON.parse(cpRaw);
    
    const rpRaw = localStorage.getItem('worldr_registered_parties');
    if (rpRaw) registeredParties = JSON.parse(rpRaw);
    
    const psRaw = localStorage.getItem('worldr_party_stats');
    if (psRaw) partyStats = JSON.parse(psRaw);
    
    const pbRaw = localStorage.getItem('worldr_party_budget');
    if (pbRaw) partyBudget = JSON.parse(pbRaw);

    const erRaw = localStorage.getItem('worldr_election_registrations');
    if (erRaw) electionRegistrations = JSON.parse(erRaw);

    const ecRaw = localStorage.getItem('worldr_election_campaigns');
    if (ecRaw) electionCampaigns = JSON.parse(ecRaw);

    const chRaw = localStorage.getItem('worldr_character');
    if (chRaw) character = JSON.parse(chRaw);
  } catch (e) {}

  const resultParties = registeredParties.map((rp: any) => {
    let isMatch = false;
    if (currentParty) {
      isMatch = 
        rp.partyId === currentParty.partyId ||
        rp.partyAbbreviation === currentParty.partyAbbreviation ||
        rp.abbreviation === currentParty.partyAbbreviation ||
        (rp.partyName === currentParty.partyName && rp.countryName === currentParty.countryName);
    }

    if (!isMatch) {
      const isRegistered = electionRegistrations.some((r: any) => r.partyId === rp.partyId);
      const camp = electionCampaigns.find((c: any) => c.partyId === rp.partyId);
      return {
        ...rp,
        leaderName: rp.leaderName || 'Unknown',
        registeredForElection: isRegistered,
        electionFundsAllocated: camp?.allocatedFunds || 0,
      };
    }

    let leaderName = currentParty.leaderName;
    if (!leaderName && character) {
      leaderName = [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ');
    }
    if (!leaderName) leaderName = 'Unknown';

    const pStats = partyStats || {};
    const pBudget = partyBudget || {};

    const isRegistered = electionRegistrations.some((r: any) => r.partyId === currentParty.partyId);
    const camp = electionCampaigns.find((c: any) => c.partyId === currentParty.partyId);

    return {
      ...rp,
      partyId: currentParty.partyId,
      partyName: currentParty.partyName,
      partyAbbreviation: currentParty.partyAbbreviation,
      abbreviation: currentParty.partyAbbreviation,
      leaderName,
      countryName: currentParty.countryName,
      continentName: currentParty.continentName,
      members: pStats.members != null ? Math.round(pStats.members) : (currentParty.members ?? currentParty.memberCount ?? 1),
      recognition: pStats.recognition ?? currentParty.recognition ?? 0,
      support: pStats.support ?? currentParty.support ?? 0.1,
      publicTrust: pStats.publicTrust ?? 0,
      mediaPresence: pStats.mediaPresence ?? 0,
      campaignStrength: pStats.campaignStrength ?? 0,
      controversy: pStats.controversy ?? 0,
      mainPromise: pStats.mainPromise || '',
      funds: pBudget.partyFunds != null ? Math.round(pBudget.partyFunds) : 0,
      registeredForElection: isRegistered,
      electionFundsAllocated: camp?.allocatedFunds || 0,
      color: currentParty.color || '#D4A91F',
      createdAt: rp.createdAt || currentParty.createdAt
    };
  });

  return resultParties;
}

export function syncCurrentPartyStatsToRegisteredParties() {
  if (typeof window === 'undefined') return;

  try {
    const cpRaw = localStorage.getItem('worldr_current_party');
    if (!cpRaw) return;
    const currentParty = JSON.parse(cpRaw);

    const rpRaw = localStorage.getItem('worldr_registered_parties');
    if (!rpRaw) return;
    let registeredParties = JSON.parse(rpRaw);

    const psRaw = localStorage.getItem('worldr_party_stats');
    const partyStats = psRaw ? JSON.parse(psRaw) : {};

    const pbRaw = localStorage.getItem('worldr_party_budget');
    const partyBudget = pbRaw ? JSON.parse(pbRaw) : {};

    const chRaw = localStorage.getItem('worldr_character');
    const character = chRaw ? JSON.parse(chRaw) : null;

    let leaderName = currentParty.leaderName;
    if (!leaderName && character) {
      leaderName = [character.firstName, character.middleName, character.lastName].filter(Boolean).join(' ');
    }
    if (!leaderName) leaderName = 'Unknown';

    let idx = registeredParties.findIndex((rp: any) => rp.partyId === currentParty.partyId);
    
    // Fallbacks
    if (idx === -1) {
      idx = registeredParties.findIndex((rp: any) => rp.partyAbbreviation === currentParty.partyAbbreviation);
    }
    if (idx === -1) {
      idx = registeredParties.findIndex((rp: any) => rp.abbreviation === currentParty.partyAbbreviation);
    }
    if (idx === -1) {
      idx = registeredParties.findIndex((rp: any) => rp.partyName === currentParty.partyName && rp.countryName === currentParty.countryName);
    }

    if (idx !== -1) {
      registeredParties[idx] = {
        ...registeredParties[idx],
        members: partyStats.members != null ? Math.round(partyStats.members) : registeredParties[idx].members,
        memberCount: partyStats.members != null ? Math.round(partyStats.members) : registeredParties[idx].memberCount,
        recognition: partyStats.recognition ?? registeredParties[idx].recognition,
        support: partyStats.support ?? registeredParties[idx].support,
        publicTrust: partyStats.publicTrust ?? registeredParties[idx].publicTrust,
        mediaPresence: partyStats.mediaPresence ?? registeredParties[idx].mediaPresence,
        campaignStrength: partyStats.campaignStrength ?? registeredParties[idx].campaignStrength,
        controversy: partyStats.controversy ?? registeredParties[idx].controversy,
        funds: partyBudget.partyFunds != null ? Math.round(partyBudget.partyFunds) : registeredParties[idx].funds,
        leaderName,
        mainPromise: partyStats.mainPromise ?? registeredParties[idx].mainPromise,
      };

      localStorage.setItem('worldr_registered_parties', JSON.stringify(registeredParties));
    }
  } catch (e) {}
}

export function initializeCurrentPartyStatsIfNeeded() {
  if (typeof window === 'undefined') return;
  try {
    const psRaw = localStorage.getItem('worldr_party_stats');
    if (psRaw) return; // Already exists, do not reset valid stats

    const cpRaw = localStorage.getItem('worldr_current_party');
    if (!cpRaw) return;
    const currentParty = JSON.parse(cpRaw);

    const initialStats = {
      partyId: currentParty.partyId,
      members: currentParty.members || currentParty.memberCount || 1,
      volunteers: 0,
      recognition: currentParty.recognition || 0,
      support: currentParty.support || 0.1,
      internalUnity: 100,
      controversy: 0,
      publicTrust: 0,
      mainPromise: "",
      campaignStrength: 0,
      mediaPresence: 0,
      regionalReach: 0,
      businessFavorability: 0,
      ruralFavorability: 0,
      youthFavorability: 0,
      workerFavorability: 0,
      traditionalFavorability: 0
    };

    localStorage.setItem('worldr_party_stats', JSON.stringify(initialStats));
  } catch (e) {}
}
