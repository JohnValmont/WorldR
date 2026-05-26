import { create } from 'zustand';
import { Party, PartyMembership } from '../types/game';

interface PartyState {
  myParty: Party | null;
  membership: PartyMembership | null;
  allParties: Party[];
  setMyParty: (party: Party | null, membership: PartyMembership | null) => void;
  setAllParties: (parties: Party[]) => void;
  clearParty: () => void;
}

export const usePartyStore = create<PartyState>((set) => ({
  myParty: null,
  membership: null,
  allParties: [],
  setMyParty: (party, membership) => set({ myParty: party, membership }),
  setAllParties: (parties) => set({ allParties: parties }),
  clearParty: () => set({ myParty: null, membership: null })
}));
