// ─── Letter System — WORLDr Chronicle ────────────────────────────────────────
// Letters replace generic notifications. NPCs send letters. Player reads them.

const STORAGE_KEY = 'worldr_letters_v1';

export interface Letter {
  id: string;
  fromName: string;
  fromRole: string;
  state: string;
  subject: string;
  body: string;
  createdAt: string;
  read: boolean;
  relatedNpcId?: string;
  relatedRoomId?: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function getLetters(): Letter[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addLetter(letter: Letter): void {
  if (typeof window === 'undefined') return;
  const current = getLetters();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([letter, ...current]));
}

export function markLetterRead(id: string): void {
  if (typeof window === 'undefined') return;
  const current = getLetters().map(l => l.id === id ? { ...l, read: true } : l);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function getUnreadCount(): number {
  return getLetters().filter(l => !l.read).length;
}

// ─── Welcome letter factory ───────────────────────────────────────────────────

export function createWelcomeLetter(citizenFile: {
  name: { first: string; last: string } | string;
  homeState?: string;
  firstNpcContactName?: string;
  firstNpcContact?: string;
  firstAmbition?: string;
}): Letter {
  const firstName = typeof citizenFile.name === 'object'
    ? citizenFile.name.first
    : citizenFile.name.split(' ')[0];

  const homeState = citizenFile.homeState || 'Westport State';

  // Determine NPC sender based on home state or first contact
  let fromName = 'Fen Arras Jr.';
  let fromRole = 'Counting House Operator — Saltgate Docks';
  let state = 'Westport State';
  let relatedRoomId = 'saltgate-trade-morning';
  let body = '';

  if (homeState === 'Westport State' || homeState.includes('Westport')) {
    fromName = 'Fen Arras Jr.';
    fromRole = 'Counting House Operator — Saltgate Docks';
    state = 'Westport State';
    relatedRoomId = 'saltgate-trade-morning';
    body = `${firstName},\n\nYour name reached me through the usual channels — I do not ask who precisely. We open the Saltgate doors at six most mornings, before the tide makes the dock too loud to think in.\n\nCome by. There is usually work for someone who can add numbers, keep quiet, and learn quickly. We do not guarantee much. But we notice those who are worth noticing.\n\nIf your interests run toward trade, shipping, or the counting side of this port, this is where that begins.\n\n— Fen Arras Jr.\nSaltgate Counting House, Westport Docks`;
  } else if (homeState === 'Drennport State' || homeState.includes('Drennport')) {
    fromName = 'Cassiel Vourne';
    fromRole = 'Journalist — Drennian Ledger';
    state = 'Drennport State';
    relatedRoomId = 'drennport-finance-reception';
    body = `${firstName},\n\nI keep a list of names worth watching. Yours was passed to me recently — I won't say by whom.\n\nThe Drennport Finance Exchange holds a junior reception most seasons for those beginning commercial lives in the capital. It is not glamorous. But the right conversation at the right evening has started more than one career in this city.\n\nIf you are serious about Drennia's commercial world, attend. I will be there taking notes.\n\n— Cassiel Vourne\nDrennian Ledger, Drennport`;
  } else if (homeState === 'Ironvale State' || homeState.includes('Ironvale')) {
    fromName = 'Director Kovath';
    fromRole = 'Factory Owner — Ironvale Industrial Plant';
    state = 'Ironvale State';
    relatedRoomId = 'ironvale-supplier-dispute';
    body = `${firstName},\n\nWord travels fast in Ironvale. I have been told you are available and looking for your first serious footing.\n\nThere is a dispute at the plant this week — supplier terms, delayed payments, the usual friction. If you can sit in a room with both sides and keep your head, there may be work here for you. I do not need heroes. I need people who understand what a contract means.\n\nCome to the plant before noon if you are interested.\n\n— Director Kovath\nIronvale Industrial Plant`;
  } else if (homeState === 'Greenmere State' || homeState.includes('Greenmere')) {
    fromName = 'Ysella Murn';
    fromRole = 'Agricultural Co-op Director — Greenmere';
    state = 'Greenmere State';
    relatedRoomId = 'greenmere-market-day';
    body = `${firstName},\n\nWe hold market on the square every fortnight. It is not just produce — it is how Greenmere does its commerce, and how it decides who belongs in its commerce.\n\nI heard a new face is settling into the area. Come by the Co-op table. We can always use someone who understands how to count, carry, and deal fairly. The community notices those who show up.\n\n— Ysella Murn\nGreenmere Agricultural Co-op`;
  }

  return {
    id: `letter_welcome_${Date.now()}`,
    fromName,
    fromRole,
    state,
    subject: 'An Invitation',
    body,
    createdAt: new Date().toISOString(),
    read: false,
    relatedRoomId,
  };
}

// ─── Check if welcome letter has been sent ────────────────────────────────────

export function hasWelcomeLetter(): boolean {
  return getLetters().some(l => l.id.startsWith('letter_welcome_'));
}

// ─── Clear all letters (for restart) ─────────────────────────────────────────

export function clearLetters(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
