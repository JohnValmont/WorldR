import { WORLD_TIME_CONFIG, type WorldTimeConfig } from '../config/worldTimeConfig';

export type WorldDate = {
  orbit: number;
  arc: number;
  mark: number;
  span?: number;
  watch?: number;
  pulse?: number;
};

const CLOCK_KEY = 'worldr_world_clock_v1';

export function getWorldDate(): WorldDate {
  if (typeof window === 'undefined') {
    return {
      orbit: WORLD_TIME_CONFIG.startingOrbit,
      arc: WORLD_TIME_CONFIG.startingArc,
      mark: WORLD_TIME_CONFIG.startingMark,
    };
  }
  
  const stored = localStorage.getItem(CLOCK_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse world clock', e);
    }
  }
  
  const initialDate: WorldDate = {
    orbit: WORLD_TIME_CONFIG.startingOrbit,
    arc: WORLD_TIME_CONFIG.startingArc,
    mark: WORLD_TIME_CONFIG.startingMark,
  };
  localStorage.setItem(CLOCK_KEY, JSON.stringify(initialDate));
  return initialDate;
}

export function saveWorldDate(date: WorldDate): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLOCK_KEY, JSON.stringify(date));
}

export function resetWorldDate(): void {
  const initialDate: WorldDate = {
    orbit: WORLD_TIME_CONFIG.startingOrbit,
    arc: WORLD_TIME_CONFIG.startingArc,
    mark: WORLD_TIME_CONFIG.startingMark,
  };
  saveWorldDate(initialDate);
}

export function advanceWorldArc(): void {
  const date = getWorldDate();
  date.arc += 1;
  date.mark = 1;
  
  if (date.arc > WORLD_TIME_CONFIG.arcsPerOrbit) {
    date.arc = 1;
    date.orbit += 1;
  }
  
  saveWorldDate(date);
}

export function formatWorldDate(date: WorldDate = getWorldDate()): string {
  return `Mark ${date.mark} · Arc ${date.arc} · Orbit ${date.orbit} M.E.`;
}

export function formatWorldArc(date: WorldDate = getWorldDate()): string {
  return `Arc ${date.arc} · Orbit ${date.orbit} M.E.`;
}

export function formatCompactWorldDate(date: WorldDate = getWorldDate()): string {
  return `A${date.arc} · O${date.orbit} M.E.`;
}
