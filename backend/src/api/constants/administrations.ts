/**
 * Administrations (docs/NATIONS_SIMULATION.md, "Administrations"): the named
 * governments of each nation and their record. Display and history only;
 * elections, votes, deals and support never read them.
 */

/** Suffix for a government led by an elected head of government: "Dumb Administration". */
export const ELECTED_SUFFIX = 'Administration';
/** Suffix for the head of state's interim government while none commands Parliament. */
export const CARETAKER_SUFFIX = 'Caretaker Government';
/** Words for a head's second, third... separate term: "Second Dumb Administration". */
export const TERM_ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
/** Months of nation history the chronicle sends to the screens (charts). */
export const CHRONICLE_MONTHS = 120;
/** Administrations listed per nation in the chronicle (newest first). */
export const CHRONICLE_ADMINISTRATIONS = 24;
/** Laws listed under each administration (the count is always complete). */
export const ADMINISTRATION_LAWS_SHOWN = 8;
