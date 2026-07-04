import { WORLD_TIME_CONFIG, type WorldTimeConfig } from '../config/worldTimeConfig';
import { formatWorldDate as calFmt, formatWorldDateShort as calFmtShort } from './calendar';

export type WorldDate = {
  year: number;
  month: number;
  day: number;
  span?: number;
  watch?: number;
  pulse?: number;
};

const CLOCK_KEY = 'worldr_world_clock_v1';

export function getWorldDate(): WorldDate {
  if (typeof window === 'undefined') {
    return {
      year: WORLD_TIME_CONFIG.startingYear,
      month: WORLD_TIME_CONFIG.startingMonth,
      day: WORLD_TIME_CONFIG.startingDay,
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
    year: WORLD_TIME_CONFIG.startingYear,
    month: WORLD_TIME_CONFIG.startingMonth,
    day: WORLD_TIME_CONFIG.startingDay,
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
    year: WORLD_TIME_CONFIG.startingYear,
    month: WORLD_TIME_CONFIG.startingMonth,
    day: WORLD_TIME_CONFIG.startingDay,
  };
  saveWorldDate(initialDate);
}

export function advanceWorldMonth(): void {
  const date = getWorldDate();
  date.month += 1;
  date.day = 1;
  
  if (date.month > WORLD_TIME_CONFIG.monthsPerYear) {
    date.month = 1;
    date.year += 1;
  }
  
  saveWorldDate(date);
}

export function formatWorldDate(date: WorldDate = getWorldDate()): string {
  return calFmt(date.year, date.month);
}

export function formatWorldArc(date: WorldDate = getWorldDate()): string {
  return calFmt(date.year, date.month);
}

export function formatCompactWorldDate(date: WorldDate = getWorldDate()): string {
  return calFmtShort(date.year, date.month);
}
