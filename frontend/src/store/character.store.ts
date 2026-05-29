import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Gender = 'male' | 'female' | 'other' | '';

export interface CharacterData {
  firstName: string;
  middleName: string;
  lastName: string;
  familyName: string;
  age: number | '';
  gender: Gender;
}

interface CharacterState {
  character: CharacterData;
  setCharacter: (data: Partial<CharacterData>) => void;
  resetCharacter: () => void;
}

const defaultCharacter: CharacterData = {
  firstName: '',
  middleName: '',
  lastName: '',
  familyName: '',
  age: 18,
  gender: '',
};

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      character: defaultCharacter,
      setCharacter: (data) =>
        set((state) => ({ character: { ...state.character, ...data } })),
      resetCharacter: () => set({ character: defaultCharacter }),
    }),
    {
      name: 'worldr-character',
    }
  )
);
