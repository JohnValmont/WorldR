import { create } from 'zustand';

export interface Sector {
  name: string;
  output: number;
  workers: number;
  productivity: number;
  wages: number;
  growth: number;
}

export interface Nation {
  id: string;
  name: string;
  treasury: number;
  debt: number;
  gdp: number;
  inflationCpi: number;
  approval: number;
  stability: number;
  currentTick: number;
  region?: string | null;
  continent?: string | null;
}

interface NationStore {
  nation: Nation | null;
  sectors: Sector[];
  isLoading: boolean;
  setNation: (nation: Nation) => void;
  setSectors: (sectors: Sector[]) => void;
  setLoading: (isLoading: boolean) => void;
  updateTick: (currentTick: number, updates: Partial<Nation>) => void;
}

export const useNationStore = create<NationStore>((set) => ({
  nation: null,
  sectors: [],
  isLoading: false,
  setNation: (nation) => set({ nation }),
  setSectors: (sectors) => set({ sectors }),
  setLoading: (isLoading) => set({ isLoading }),
  updateTick: (currentTick, updates) => set((state) => ({
    nation: state.nation ? { ...state.nation, ...updates, currentTick } : null,
  })),
}));
