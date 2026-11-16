/**
 * Situations — the monthly hand of decision cards (docs/POLITICS_FLOOR.md).
 *
 * Every month each player is dealt HAND_SIZE cards chosen from this library by
 * who they are (citizen, MP, minister, Premier...) and what is happening in the
 * country (prices, approval, the election calendar, bills before Parliament).
 * Every option shows its odds and effects up front; only the story of what
 * happened is a surprise. This is DATA: add a card by adding an entry.
 *
 * Text placeholders: {district} {party} {rival} {premier} {bill} {me}
 */
import type { NationalStat } from './macroEconomy';
import type { SegmentKey } from './floor';

export type Role = 'citizen' | 'member' | 'mp' | 'leader' | 'minister' | 'premier';

export interface CardWhen {
  /** Player must hold at least one of these roles. Omitted = anyone in a party. */
  roles?: Role[];
  inGovernment?: boolean;
  inOpposition?: boolean;
  phase?: string[];
  stat?: { key: NationalStat; above?: number; below?: number };
  approvalAbove?: number;
  approvalBelow?: number;
  /** Needs a bill currently before Parliament (fills {bill}). */
  hasOpenBill?: boolean;
  monthsToElectionMax?: number;
}

export interface Effects {
  /** Your reputation with voters (characters.credibility). */
  trust?: number;
  /** Your weight among politicians (characters.influence). */
  clout?: number;
  /** Your own money. */
  cash?: number;
  /** Your party's funds. */
  funds?: number;
  /** Your party's support with voter groups ('all' = every group). */
  support?: Partial<Record<SegmentKey | 'all', number>>;
  /** Support change for your main rival party, in every group. */
  rival?: number;
  /** National stat nudges (Premier / ministers only). Lasts SHOCK_MONTHS. */
  stat?: Partial<Record<NationalStat, number>>;
}

export type Tone = 'good' | 'mixed' | 'bad';
export interface CardOutcome { weight: number; tone: Tone; text: string; effects: Effects }
export interface CardCost { ap?: number; cash?: number; funds?: number }
export interface CardOption { label: string; outcomes: CardOutcome[]; cost?: CardCost }
export interface SituationCard {
  key: string;
  /** Small label above the title, e.g. "Your district". */
  kicker: string;
  title: string;
  body: string;
  when: CardWhen;
  /** Relative chance of being dealt (default 1). */
  weight?: number;
  options: CardOption[];
}

const W: SegmentKey = 'industrial_workers';
const T: SegmentKey = 'logistics_trade_workers';
const O: SegmentKey = 'factory_business_owners';
const P: SegmentKey = 'civic_professionals';
const F: SegmentKey = 'suburban_families';

const out = (weight: number, tone: Tone, text: string, effects: Effects): CardOutcome => ({ weight, tone, text, effects });
const opt = (label: string, outcomes: CardOutcome[], cost?: CardCost): CardOption => ({ label, outcomes, cost });
const PARTY: Role[] = ['member', 'mp', 'leader', 'minister', 'premier'];
const SEATED: Role[] = ['mp', 'minister', 'premier'];

export const SITUATIONS: SituationCard[] = [
  // ───────────────────────────── Citizens ─────────────────────────────
  {
    key: 'town_meeting', kicker: 'Your street', title: 'The bus route',
    body: 'The council has cut the only bus through {district}. The hall is packed and angry, and nobody from Parliament turned up.',
    when: { roles: ['citizen'] },
    options: [
      opt('Stand up and speak', [
        out(70, 'good', 'You say what the room is thinking. People ask your name afterwards.', { trust: 3 }),
        out(30, 'bad', 'You lose your thread halfway through. Someone films it.', { trust: -1 }),
      ]),
      opt('Organise a petition', [out(100, 'good', 'Two thousand signatures in a week. The council blinks, and people remember who carried the clipboard.', { trust: 2, clout: 2 })], { ap: 2 }),
      opt('Listen and take notes', [out(100, 'mixed', 'You learn who really runs this neighbourhood. Useful.', { clout: 1 })]),
    ],
  },
  {
    key: 'recruiter', kicker: 'An offer', title: 'Coffee with an organiser',
    body: 'An organiser from {rival} buys you a coffee. "People listen to you. You should be inside a party, not shouting from the pavement."',
    when: { roles: ['citizen'] },
    options: [
      opt('Hear them out', [out(100, 'good', 'You leave with three phone numbers and a clearer idea of how the machine works.', { clout: 2 })]),
      opt('Ask what is in it for you', [
        out(50, 'good', 'They respect the question. You are told, quietly, which seats are winnable.', { clout: 3 }),
        out(50, 'bad', 'Word gets round that you are in it for yourself.', { trust: -2 }),
      ]),
      opt('Say you might start your own', [out(100, 'mixed', 'They laugh. Then they stop laughing.', { trust: 1, clout: 1 })]),
    ],
  },
  {
    key: 'letter_editor', kicker: 'The press', title: 'A letter to the Courier',
    body: 'The Drennport Courier is running a page of readers\' letters on the state of the country. You have things to say.',
    when: { roles: ['citizen'] },
    options: [
      opt('Write something furious', [
        out(60, 'good', 'It is printed in full, top of the page. Strangers quote it back to you.', { trust: 2, clout: 1 }),
        out(40, 'mixed', 'They cut it to two lines and it reads like a rant.', { trust: -1 }),
      ]),
      opt('Write something careful', [out(100, 'good', 'A minister\'s aide writes back. A thin reply, but your name is on a desk now.', { trust: 1, clout: 1 })]),
      opt('Offer to write a column', [
        out(35, 'good', 'The editor says yes. One column a month, unpaid.', { clout: 3, trust: 1 }),
        out(65, 'mixed', 'A polite no.', {}),
      ]),
    ],
  },
  {
    key: 'flood_volunteer', kicker: 'Your street', title: 'Sandbags',
    body: 'The river is over the road in {district}. The volunteers need hands, vans and money, in that order.',
    when: { roles: ['citizen'] },
    options: [
      opt('Turn up and carry', [out(100, 'good', 'Twelve hours of sandbags. Nobody there will forget who stayed until dark.', { trust: 3 })], { ap: 2 }),
      opt('Pay for the vans', [out(100, 'good', 'The vans arrive with your name on the hire form. Quietly noted.', { trust: 2, clout: 1 })], { cash: 5000 }),
      opt('Share the appeal online', [out(100, 'mixed', 'It helps a little.', { trust: 1 })]),
    ],
  },

  // ───────────────────────── Anyone in a party ─────────────────────────
  {
    key: 'donor_dinner', kicker: 'Money', title: 'No strings attached',
    body: 'A car-parts magnate offers {party} a $40,000 donation. "No strings." He would like one photograph with you.',
    when: { roles: PARTY },
    options: [
      opt('Take the money and the photo', [
        out(65, 'good', 'The cheque clears. The photo ends up on his office wall, not in the papers.', { funds: 40000 }),
        out(35, 'bad', 'The Courier runs the photo under "Who owns {party}?"', { funds: 40000, trust: -2, support: { [W]: -3 } }),
      ]),
      opt('Take a smaller cheque, no photo', [
        out(85, 'good', 'A quieter arrangement. He is a little offended.', { funds: 25000 }),
        out(15, 'bad', 'It leaks anyway, and now it looks hidden.', { funds: 25000, trust: -3 }),
      ]),
      opt('Decline, publicly', [out(100, 'mixed', 'Workers like it. Boardrooms take note.', { trust: 2, support: { [W]: 2, [O]: -2 } })]),
    ],
  },
  {
    key: 'factory_closure', kicker: 'Ironvale', title: 'Six hundred jobs',
    body: 'The Ironvale stamping plant will lay off 600 people at the end of the month. The union and the owners both want to know where {party} stands.',
    when: { roles: PARTY },
    options: [
      opt('Join the picket line', [out(100, 'mixed', 'Your photo at the gates is everywhere by evening.', { support: { [W]: 4, [O]: -3 } })]),
      opt('Broker talks', [
        out(55, 'good', 'Nine hours in a hotel room. Half the jobs are saved and both sides thank you.', { trust: 2, support: { [W]: 3, [O]: 1 } }),
        out(45, 'bad', 'The talks collapse at midnight. You are the one standing in the car park.', { trust: -1 }),
      ], { ap: 2 }),
      opt('Say the market must adjust', [out(100, 'mixed', 'Investors nod. Ironvale does not.', { support: { [O]: 3, [W]: -4 } })]),
    ],
  },
  {
    key: 'journalist_call', kicker: 'The press', title: '"Any comment?"',
    body: 'A Courier reporter has a tip that a colleague in {party} has been padding expenses. She wants your comment before she runs it.',
    when: { roles: PARTY },
    options: [
      opt('Confirm it, off the record', [
        out(50, 'mixed', 'The story runs. Readers like that someone talked.', { trust: 2 }),
        out(50, 'bad', 'The story runs, and your colleagues work out who talked.', { trust: 2, clout: -4 }),
      ]),
      opt('Deny it and warn your colleague', [
        out(70, 'good', 'The story dies. Your colleague owes you.', { clout: 3 }),
        out(30, 'bad', 'She runs it anyway, with your denial in paragraph two.', { trust: -4 }),
      ]),
      opt('"No comment"', [
        out(80, 'mixed', 'She sighs and hangs up.', {}),
        out(20, 'bad', '"{me} declined to comment" does not read well.', { trust: -1 }),
      ]),
    ],
  },
  {
    key: 'port_strike', kicker: 'Westport', title: 'The docks stop',
    body: 'Westport dockers have walked out over automated cranes. Freight is backing up along the coast road.',
    when: { roles: PARTY },
    options: [
      opt('Back the dockers', [out(100, 'mixed', 'You speak at the dock gates in the rain.', { support: { [T]: 4, [O]: -2 } })]),
      opt('Back the port authority', [out(100, 'mixed', '"Progress cannot be picketed," you say. The quote travels.', { support: { [O]: 3, [T]: -4 } })]),
      opt('Call for arbitration', [
        out(50, 'good', 'Both sides accept. You look like the adult in the room.', { trust: 1, support: { [P]: 2 } }),
        out(50, 'bad', 'Both sides accuse you of dodging.', { support: { [T]: -1, [O]: -1 } }),
      ]),
    ],
  },
  {
    key: 'union_endorsement', kicker: 'An offer', title: 'The Metalworkers\' price',
    body: 'The Ironvale Metalworkers will endorse {party} if you call, out loud, for a higher minimum wage.',
    when: { roles: PARTY },
    options: [
      opt('Say it loudly', [out(100, 'mixed', 'The endorsement lands on the front page. So does the Chamber of Industry\'s reply.', { support: { [W]: 5, [O]: -3 } })]),
      opt('Thank them, promise nothing', [out(100, 'mixed', 'A warm handshake and no endorsement.', { support: { [W]: 1 } })]),
      opt('Decline', [out(100, 'mixed', 'Business owners hear about it within the hour.', { support: { [O]: 2, [W]: -2 } })]),
    ],
  },
  {
    key: 'business_breakfast', kicker: 'An invitation', title: 'Breakfast with the Chamber',
    body: 'The Chamber of Industry wants to hear, over eggs, that {party} will never raise corporate tax.',
    when: { roles: PARTY },
    options: [
      opt('Tell them what they want', [out(100, 'mixed', 'Applause, and a recording that will surface in Ironvale later.', { support: { [O]: 4, [W]: -2 } })]),
      opt('Tell them hard truths', [out(100, 'mixed', 'A chilly room. One owner shakes your hand on the way out.', { trust: 2, support: { [O]: -2, [P]: 1 } })]),
      opt('Skip it for a school visit', [out(100, 'good', 'The children ask better questions than the Chamber would have.', { support: { [F]: 2 } })]),
    ],
  },
  {
    key: 'rent_protest', kicker: 'Drennport', title: 'Rents are up again',
    body: 'Tenants are marching on the Capitol. Their banner reads "Half my pay for a damp flat".',
    when: { roles: PARTY, stat: { key: 'cost_of_living', above: 48 } },
    options: [
      opt('March with them', [out(100, 'mixed', 'You walk at the front. Landlords cancel a fundraiser.', { support: { [P]: 2, [W]: 2, [O]: -2 } })]),
      opt('Draft a rent tribunal plan', [out(100, 'good', 'Four pages, properly costed. The march organisers read it out.', { trust: 1, support: { [P]: 3 } })], { ap: 2 }),
      opt('Warn against scaring investors', [out(100, 'mixed', 'Developers send their thanks.', { support: { [O]: 3, [P]: -2, [W]: -2 } })]),
    ],
  },
  {
    key: 'burglary_wave', kicker: 'The suburbs', title: 'Locked doors',
    body: 'A run of burglaries in the suburbs. Neighbourhood groups want to know what {party} will actually do.',
    when: { roles: PARTY },
    options: [
      opt('Demand more police', [out(100, 'mixed', 'It plays well on doorsteps and badly at the university.', { support: { [F]: 4, [P]: -1 } })]),
      opt('Fund youth clubs from party money', [out(100, 'good', 'Two clubs reopen with your party\'s name on the door.', { support: { [P]: 2, [F]: 2 } })], { funds: 10000 }),
      opt('Blame whoever is in charge', [
        out(70, 'good', 'It sticks.', { support: { all: 1 } }),
        out(30, 'bad', 'A columnist calls it opportunism.', { trust: -2 }),
      ]),
    ],
  },
  {
    key: 'tractor_blockade', kicker: 'Greenmere', title: 'Tractors on the highway',
    body: 'Greenmere farmers have parked two hundred tractors across the highway over fuel costs. Lorries are stuck for miles.',
    when: { roles: PARTY },
    options: [
      opt('Climb on a tractor', [out(100, 'mixed', 'The farmers cheer. The lorry drivers behind them do not.', { support: { [F]: 3, [T]: -2 } })]),
      opt('Negotiate one lane open', [out(100, 'good', 'Freight moves by nightfall and the farmers keep their protest.', { support: { [T]: 2, [F]: 1 } })], { ap: 2 }),
      opt('Call them lawbreakers', [out(100, 'bad', 'The countryside will remember that.', { support: { [P]: 1, [F]: -3 } })]),
    ],
  },
  {
    key: 'rival_gaffe', kicker: 'A gift', title: 'Hot microphone',
    body: 'The leader of {rival} has been caught on a live microphone calling voters "sheep".',
    when: { roles: PARTY },
    options: [
      opt('Pile on', [
        out(60, 'good', 'Your line about wolves is on every bulletin.', { support: { all: 1 }, rival: -2 }),
        out(40, 'bad', 'Someone finds an old clip of you saying something worse.', { trust: -3 }),
      ]),
      opt('Rise above it', [out(100, 'good', '"Everyone has bad days." You look generous and they still look awful.', { trust: 2, rival: -1 })]),
      opt('Send private sympathy', [out(100, 'mixed', 'An unusual kindness, and they will remember it.', { clout: 2 })]),
    ],
  },
  {
    key: 'casino_folder', kicker: 'Anonymous', title: 'A folder on your desk',
    body: 'Photographs: a senior {rival} figure at a casino with a road contractor. No note.',
    when: { roles: PARTY },
    options: [
      opt('Leak it', [
        out(55, 'good', 'It leads the news for three days.', { rival: -3 }),
        out(45, 'bad', 'The photos are four years old and the contractor is his brother-in-law. You look grubby.', { trust: -3 }),
      ]),
      opt('Check it first', [out(100, 'good', 'Half of it stands up. You publish only that half.', { rival: -2, trust: 1 })], { ap: 2 }),
      opt('Return it to them', [out(100, 'mixed', 'A stiff phone call of thanks. A debt, of a kind.', { clout: 3 })]),
    ],
  },
  {
    key: 'car_tariff', kicker: 'Industry', title: 'Imported cars',
    body: 'Drennia\'s carmakers want a tariff on imported cars. The port unions say it would empty the docks.',
    when: { roles: PARTY },
    options: [
      opt('Back the tariff', [out(100, 'mixed', 'Ironvale is delighted. Westport is not.', { support: { [W]: 3, [O]: 2, [T]: -4 } })]),
      opt('Back open trade', [out(100, 'mixed', 'The docks cheer; the plants mutter.', { support: { [T]: 4, [P]: 1, [W]: -3 } })]),
      opt('Ask for a study', [out(100, 'mixed', 'Nobody is angry. Nobody is grateful.', {})]),
    ],
  },
  {
    key: 'childcare_promise', kicker: 'Policy', title: 'Free childcare?',
    body: 'A think-tank says free childcare would pay for itself in ten years. Your treasurer says "in ten years" is doing a lot of work.',
    when: { roles: PARTY },
    options: [
      opt('Promise it', [out(100, 'mixed', 'Parents love it. Economists write letters.', { trust: -1, support: { [F]: 4, [P]: -2 } })]),
      opt('Promise a costed pilot', [out(100, 'good', 'Less exciting, harder to attack.', { support: { [P]: 2, [F]: 1 } })]),
      opt('Say the country cannot afford it', [out(100, 'mixed', 'Honest, and unpopular at the school gates.', { trust: 1, support: { [O]: 1, [F]: -2 } })]),
    ],
  },
  {
    key: 'radio_phone_in', kicker: 'The press', title: 'Live on air',
    body: 'A phone-in show wants someone from {party} for an hour of unscreened calls.',
    when: { roles: PARTY },
    options: [
      opt('Do it', [
        out(60, 'good', 'A caller cries describing her rent. You do not look at your notes once.', { trust: 2, support: { all: 1 } }),
        out(40, 'bad', 'A caller asks the price of bread. You guess wrong, on air.', { trust: -2, support: { [W]: -1, [F]: -1 } }),
      ]),
      opt('Send a prepared statement', [out(100, 'mixed', 'It is read out in a flat voice.', {})]),
      opt('Suggest a rival goes on instead', [
        out(50, 'good', 'They take the bait, and it goes badly for them.', { rival: -2 }),
        out(50, 'bad', 'They take the bait, and they are rather good.', { rival: 2 }),
      ]),
    ],
  },
  {
    key: 'old_photo', kicker: 'Trouble', title: 'The student photograph',
    body: 'A photograph of you at twenty, at a party you barely remember, is doing the rounds. It is embarrassing, not criminal.',
    when: { roles: PARTY },
    options: [
      opt('Laugh at it first', [
        out(70, 'good', 'You post it yourself with a caption. The story is over by lunch.', { trust: 2 }),
        out(30, 'mixed', 'The joke lands with everyone except the people you needed.', { support: { [F]: -1 } }),
      ]),
      opt('Threaten to sue', [out(100, 'bad', 'Now everyone has seen it.', { trust: -2 })], { cash: 5000 }),
      opt('Say nothing', [
        out(60, 'mixed', 'It fades.', {}),
        out(40, 'bad', 'Silence reads as shame.', { trust: -1 }),
      ]),
    ],
  },
  {
    key: 'think_tank_report', kicker: 'Policy', title: 'An awkward report',
    body: 'A respected institute finds that one of {party}\'s favourite policies would not work as promised.',
    when: { roles: PARTY },
    options: [
      opt('Accept it and adjust', [out(100, 'good', 'Professionals notice a party that can read.', { trust: 2, support: { [P]: 2, [W]: -1 } })]),
      opt('Attack the institute', [
        out(45, 'good', 'Your supporters enjoy the fight.', { support: { [W]: 2 } }),
        out(55, 'bad', 'The institute publishes its funding. It is cleaner than yours.', { trust: -2, support: { [P]: -2 } }),
      ]),
      opt('Ignore it', [out(100, 'mixed', 'It will come back at election time.', {})]),
    ],
  },

  // ─────────────────────────── Election season ───────────────────────────
  {
    key: 'tv_debate', kicker: 'Election', title: '"The Hour"',
    body: 'You are invited onto "The Hour" opposite a spokesman for {rival}. Two million people watch it.',
    when: { roles: PARTY, monthsToElectionMax: 9 }, weight: 2,
    options: [
      opt('Go on the attack', [
        out(55, 'good', 'You land the line of the night.', { trust: 1, support: { all: 2 }, rival: -1 }),
        out(45, 'bad', 'You talk over the host and misquote a number.', { trust: -2, support: { all: -2 } }),
      ]),
      opt('Stick to the facts', [out(100, 'good', 'Not thrilling. Convincing.', { support: { [P]: 2, [F]: 1 } })]),
      opt('Decline', [out(100, 'bad', 'They put an empty chair in your place.', { clout: -1 })]),
    ],
  },
  {
    key: 'final_push', kicker: 'Election', title: 'One last push',
    body: 'Polling day is close. Your volunteers can do one big thing this week. Where do you send them?',
    when: { roles: PARTY, phase: ['campaign'] }, weight: 2,
    options: [
      opt('Factory gates at dawn', [out(100, 'good', 'Cold hands and warm leaflets.', { support: { [W]: 4 } })]),
      opt('Suburban doorsteps', [out(100, 'good', 'Four thousand doors before dark.', { support: { [F]: 4 } })]),
      opt('Docks and depots', [out(100, 'good', 'The night shift takes every leaflet.', { support: { [T]: 4 } })]),
    ],
  },
  {
    key: 'smear_leaflet', kicker: 'Election', title: 'The hospital lie',
    body: 'A leaflet claims you want to close the {district} hospital. It is false, and it is in every letterbox.',
    when: { roles: PARTY, phase: ['filing', 'campaign'] }, weight: 2,
    options: [
      opt('Sue the printer', [out(100, 'mixed', 'You win, three weeks after it matters.', { trust: 2 })], { cash: 10000 }),
      opt('Print the truth, twice as many', [out(100, 'good', 'Your leaflet has the hospital\'s own nurses on it.', { support: { all: 1 } })], { funds: 8000 }),
      opt('Laugh it off on the radio', [
        out(55, 'good', '"I was born in that hospital." It is the clip of the week.', { trust: 2, support: { [F]: 2 } }),
        out(45, 'bad', 'You sound rattled.', { support: { [F]: -2 } }),
      ]),
    ],
  },
  {
    key: 'courier_endorsement', kicker: 'Election', title: 'The Courier decides',
    body: 'The Drennport Courier will endorse a party on Sunday. The editor will take one call from you.',
    when: { roles: ['leader', 'premier'], monthsToElectionMax: 6 }, weight: 2,
    options: [
      opt('Make the case on policy', [
        out(50, 'good', 'The endorsement is lukewarm, and it is yours.', { support: { [P]: 4 } }),
        out(50, 'mixed', '"A serious party, not yet ready." Could be worse.', { support: { [P]: 1 } }),
      ]),
      opt('Offer an exclusive', [out(100, 'good', 'No endorsement, but a friendly front page.', { support: { all: 1 } })]),
      opt('Tell him you do not need it', [
        out(40, 'good', 'Your base loves the defiance.', { support: { [W]: 3 } }),
        out(60, 'bad', 'Sunday\'s leader column is brutal.', { support: { [P]: -3 } }),
      ]),
    ],
  },

  // ───────────────────────────── Sitting MPs ─────────────────────────────
  {
    key: 'district_flood', kicker: 'Your district', title: 'Water in the streets',
    body: 'Flooding in {district}. Two hundred homes, one school and the road out.',
    when: { roles: SEATED },
    options: [
      opt('Go there with sandbags', [out(100, 'good', 'You are photographed knee-deep and useful.', { trust: 2, support: { [F]: 3 } })], { ap: 2 }),
      opt('Demand emergency funds on television', [
        out(60, 'good', 'The money is released that night.', { clout: 1, support: { all: 1 } }),
        out(40, 'bad', 'The minister says the request never reached his desk.', { clout: -1 }),
      ]),
      opt('Issue a statement', [
        out(80, 'mixed', 'Noted.', {}),
        out(20, 'bad', '"Where was our MP?" asks the local paper.', { trust: -2 }),
      ]),
    ],
  },
  {
    key: 'lobbyist_envelope', kicker: 'Parliament', title: 'An envelope',
    body: 'A lobbyist wants a word about "{bill}". There is an envelope on the table: $15,000 "for your campaign".',
    when: { roles: SEATED, hasOpenBill: true },
    options: [
      opt('Take it', [
        out(70, 'mixed', 'Nobody saw. You think.', { cash: 15000 }),
        out(30, 'bad', 'The lobbyist was wearing a wire for the Courier.', { cash: 15000, trust: -6, support: { all: -2 } }),
      ]),
      opt('Refuse and report it', [out(100, 'good', 'The story runs with you as the one who said no.', { trust: 3, support: { [O]: -2 } })]),
      opt('Hear the argument, leave the envelope', [out(100, 'mixed', 'The argument is better than you expected.', { clout: 1 })]),
    ],
  },
  {
    key: 'whip_corridor', kicker: 'Parliament', title: 'The whip would like a word',
    body: 'Your party whip stops you in the corridor about "{bill}". "We need you on this one. Don\'t make me remember it."',
    when: { roles: ['mp'], hasOpenBill: true },
    options: [
      opt('Promise your vote', [out(100, 'good', 'A hand on your shoulder. You are "sound".', { clout: 2 })]),
      opt('Bargain for a committee seat', [
        out(50, 'good', 'A raised eyebrow, then a nod.', { clout: 4 }),
        out(50, 'bad', 'The whip writes something down.', { clout: -2 }),
      ]),
      opt('Say you will vote your conscience', [out(100, 'mixed', 'Your voters would approve. The whip does not.', { trust: 2, clout: -2 })]),
    ],
  },
  {
    key: 'question_time', kicker: 'Parliament', title: 'One question',
    body: 'Question time. The Speaker calls your name. You have one question for {premier}.',
    when: { roles: SEATED, inOpposition: true },
    options: [
      opt('Go for the jugular', [
        out(55, 'good', 'The government benches go quiet.', { clout: 2, support: { all: 2 } }),
        out(45, 'bad', 'The Premier swats it away and the House laughs.', { clout: -2 }),
      ]),
      opt('Ask about {district}', [out(100, 'good', 'Dull in the chamber, front page at home.', { support: { [F]: 2 } })]),
      opt('Offer cross-party help', [out(100, 'mixed', 'Statesmanlike. Your own side grumbles.', { trust: 2, support: { [P]: 2, [W]: -1 } })]),
    ],
  },
  {
    key: 'defend_the_premier', kicker: 'Your district', title: 'Still backing them?',
    body: 'People in {district} are angry with the government. The local paper asks whether you still back {premier}.',
    when: { roles: SEATED, inGovernment: true, approvalBelow: 50 },
    options: [
      opt('Defend the Premier', [out(100, 'mixed', 'Loyal. The Premier\'s office calls to say thank you.', { clout: 3, trust: -1, support: { all: -1 } })]),
      opt('Put some distance between you', [out(100, 'mixed', '"I answer to {district} first." The whips are furious.', { trust: 2, clout: -3 })]),
      opt('Change the subject', [
        out(60, 'mixed', 'You talk about the bypass for ten minutes.', {}),
        out(40, 'bad', 'The headline: "MP dodges".', { trust: -1 }),
      ]),
    ],
  },
  {
    key: 'committee_seat', kicker: 'Parliament', title: 'A seat on the committee',
    body: 'There is a vacancy on the Public Accounts Committee. Dull, powerful, and it meets on Fridays.',
    when: { roles: ['mp'] },
    options: [
      opt('Take it', [out(100, 'good', 'You learn where the money goes. People start returning your calls.', { clout: 3 })], { ap: 2 }),
      opt('Take it and leak the minutes', [
        out(50, 'good', 'Three good stories with nobody\'s name on them.', { support: { all: 1 }, clout: 1 }),
        out(50, 'bad', 'There were only six people in the room.', { clout: -4, trust: -2 }),
      ], { ap: 2 }),
      opt('Decline', [out(100, 'mixed', 'Fridays stay free for the district.', { support: { [F]: 1 } })]),
    ],
  },

  // ───────────────────────────── Party leaders ─────────────────────────────
  {
    key: 'backbench_grumble', kicker: 'Your party', title: 'Nobody asks us',
    body: 'Three of your own people complain that you decide everything alone.',
    when: { roles: ['leader'] },
    options: [
      opt('Hold an away-day', [out(100, 'good', 'A long day of flip charts. They feel heard.', { clout: 3 })], { ap: 2 }),
      opt('Hand out junior roles', [out(100, 'good', 'Titles are cheap and people love them.', { clout: 2 })], { funds: 10000 }),
      opt('Tell them to get in line', [
        out(60, 'mixed', 'They get in line.', { clout: 1 }),
        out(40, 'bad', 'One of them calls you a tyrant, to a journalist.', { trust: -2, support: { all: -1 } }),
      ]),
    ],
  },
  {
    key: 'defector', kicker: 'Your party', title: 'A defector',
    body: 'A well-known {rival} councillor wants to cross over to {party}. She is popular, and she is trouble.',
    when: { roles: ['leader'] },
    options: [
      opt('Welcome her with a press conference', [
        out(60, 'good', 'The pictures are excellent.', { support: { all: 1 }, rival: -2 }),
        out(40, 'bad', 'Within a month she is briefing against you too.', { clout: -3, rival: -1 }),
      ]),
      opt('Take her quietly', [out(100, 'good', 'A useful addition, no drama.', { rival: -1, clout: 1 })]),
      opt('Turn her down', [out(100, 'mixed', 'Your own people are relieved.', { clout: 2 })]),
    ],
  },
  {
    key: 'party_conference', kicker: 'Your party', title: 'The conference speech',
    body: 'The annual conference. The hall wants red meat; the cameras want a statesman.',
    when: { roles: ['leader'] },
    options: [
      opt('Feed the hall', [out(100, 'mixed', 'A six-minute ovation. The clips look a little wild.', { clout: 3, support: { [W]: 2, [P]: -2 } })]),
      opt('Speak to the country', [
        out(60, 'good', 'Measured, quotable, and the hall forgives you.', { support: { [P]: 2, [F]: 2 } }),
        out(40, 'mixed', 'Polite applause. Somebody mutters "sell-out".', { support: { [P]: 1 }, clout: -2 }),
      ]),
      opt('Announce a surprise policy', [
        out(45, 'good', 'It dominates the week.', { support: { all: 2 } }),
        out(55, 'bad', 'It unravels by Tuesday.', { trust: -2, support: { all: -1 } }),
      ], { ap: 2 }),
    ],
  },

  // ───────────────────────────── Ministers ─────────────────────────────
  {
    key: 'budget_overrun', kicker: 'Your ministry', title: 'Four per cent over',
    body: 'Your department is 4% over budget. Finance wants cuts on their desk by Friday.',
    when: { roles: ['minister'] }, weight: 2,
    options: [
      opt('Cut services', [out(100, 'mixed', 'The books balance. The waiting lists do not.', { stat: { fiscal_health: 2, human_development: -1 }, support: { [F]: -2 } })]),
      opt('Move it into next year', [
        out(60, 'mixed', 'Nobody notices. Yet.', {}),
        out(40, 'bad', 'The auditors notice.', { trust: -5, stat: { fiscal_health: -2 } }),
      ]),
      opt('Fight Finance for the money', [
        out(50, 'good', 'You win in cabinet. Finance will not forget.', { clout: 3, stat: { fiscal_health: -1 } }),
        out(50, 'bad', 'You lose in cabinet, in front of everyone.', { clout: -3 }),
      ], { ap: 2 }),
    ],
  },
  {
    key: 'public_sector_strike', kicker: 'Your ministry', title: 'Strike ballot',
    body: 'Public sector unions have voted to strike over pay. They walk out on Monday unless you move.',
    when: { roles: ['minister', 'premier'] }, weight: 2,
    options: [
      opt('Concede the pay rise', [out(100, 'mixed', 'Services run. The Treasury winces.', { stat: { fiscal_health: -2, human_development: 1 }, support: { [W]: 2, [P]: 2 } })]),
      opt('Hold the line', [
        out(60, 'mixed', 'They blink first.', { support: { [O]: 2, [P]: -2 } }),
        out(40, 'bad', 'A three-week strike. Everyone blames you.', { stat: { human_development: -2 }, support: { [P]: -3, [F]: -2 } }),
      ]),
      opt('Send it to arbitration', [out(100, 'mixed', 'A delay dressed as a decision. It works, this time.', { trust: 1 })], { ap: 2 }),
    ],
  },
  {
    key: 'procurement_window', kicker: 'Your ministry', title: 'A window for reform',
    body: 'Your officials say that, for about a month, you could push through a clean-up of how the ministry buys things.',
    when: { roles: ['minister'] },
    options: [
      opt('Do it properly', [out(100, 'good', 'Slow, thankless, and it will outlast you.', { trust: 2, stat: { bureaucracy: 2 } })], { ap: 3 }),
      opt('Use it to reward friends of the party', [
        out(65, 'mixed', 'Three contracts change hands. The party treasurer is delighted.', { funds: 30000 }),
        out(35, 'bad', 'One of the losing bidders talks.', { funds: 30000, trust: -6, stat: { bureaucracy: -1 } }),
      ]),
      opt('Leave it', [out(100, 'mixed', 'The window closes.', {})]),
    ],
  },
  {
    key: 'bridge_collapse', kicker: 'Your ministry', title: 'The Westport bridge',
    body: 'A span of the Westport road bridge has dropped into the river. Nobody is hurt, and nothing can cross.',
    when: { roles: ['minister', 'premier'] },
    options: [
      opt('Emergency repairs, whatever it costs', [out(100, 'good', 'Army engineers have a temporary span up in nine days.', { stat: { fiscal_health: -1, prosperity: 1 }, support: { [T]: 3 } })]),
      opt('Order an inquiry first', [out(100, 'mixed', 'Proper, and very slow.', { support: { [P]: 1, [T]: -2 } })]),
      opt('Blame the last government', [
        out(50, 'mixed', 'It is even partly true.', { rival: -1 }),
        out(50, 'bad', 'The maintenance cut was signed by your own ministry.', { trust: -3 }),
      ]),
    ],
  },

  // ───────────────────────────── The Premier ─────────────────────────────
  {
    key: 'currency_wobble', kicker: 'The nation', title: 'The dollar slides',
    body: 'The Drennian dollar fell 4% overnight. The central bank governor is on the phone.',
    when: { roles: ['premier'] }, weight: 2,
    options: [
      opt('Calm the markets on television', [
        out(60, 'good', 'Steady voice, steady hands. The slide stops.', { trust: 1, stat: { prosperity: 1 } }),
        out(40, 'bad', 'You say "no need to panic". They panic.', { stat: { prosperity: -2 } }),
      ]),
      opt('Spend reserves to defend it', [out(100, 'mixed', 'It works, and it is expensive.', { stat: { fiscal_health: -2, prosperity: 1 } })]),
      opt('Let it find its level', [
        out(50, 'good', 'Exports jump. You look wise.', { stat: { prosperity: 1, cost_of_living: 1 } }),
        out(50, 'bad', 'Prices in the shops follow it up.', { stat: { cost_of_living: 2 } }),
      ]),
    ],
  },
  {
    key: 'cabinet_feud', kicker: 'The nation', title: 'Ministers at war',
    body: 'Two of your ministers are briefing against each other. The papers call it "the feud".',
    when: { roles: ['premier'] },
    options: [
      opt('Sack one of them', [out(100, 'mixed', 'Decisive. The sacked minister has friends.', { clout: 3, support: { all: -1 } })]),
      opt('Force a public handshake', [
        out(60, 'good', 'Through gritted teeth, it holds.', { clout: 1 }),
        out(40, 'bad', 'The photo makes it worse.', { stat: { bureaucracy: -1 }, clout: -1 }),
      ]),
      opt('Ignore it', [out(100, 'bad', 'Departments stop talking to each other.', { stat: { bureaucracy: -1 } })]),
    ],
  },
  {
    key: 'trade_delegation', kicker: 'The nation', title: 'A deal on the table',
    body: 'A neighbouring republic offers cheaper imports in exchange for access to Westport\'s docks.',
    when: { roles: ['premier'] },
    options: [
      opt('Sign', [out(100, 'mixed', 'Prices ease. Ironvale feels sold out.', { stat: { global_standing: 2, cost_of_living: -1 }, support: { [T]: 3, [W]: -3 } })]),
      opt('Walk away', [out(100, 'mixed', 'Cheered in the factories, noted abroad.', { stat: { global_standing: -1 }, support: { [W]: 2 } })]),
      opt('Renegotiate in person', [
        out(50, 'good', 'Two nights, no sleep, a better deal.', { stat: { global_standing: 2, cost_of_living: -1 } }),
        out(50, 'bad', 'They leave before breakfast.', { stat: { global_standing: -2 } }),
      ], { ap: 3 }),
    ],
  },
  {
    key: 'mine_collapse', kicker: 'The nation', title: 'Ironvale No. 4',
    body: 'A gallery has collapsed in the Ironvale No. 4 mine. Eleven men are trapped and alive.',
    when: { roles: ['premier'] },
    options: [
      opt('Go at once', [out(100, 'good', 'You stay at the pithead for two nights. All eleven come up.', { trust: 3, support: { [W]: 3 } })], { ap: 2 }),
      opt('Send the minister', [out(100, 'bad', '"Where is the Premier?" is the question all week.', { support: { [W]: -2 } })]),
      opt('Announce a mine safety review', [out(100, 'mixed', 'Right, and badly timed.', { support: { [P]: 2, [O]: -2 } })]),
    ],
  },
  {
    key: 'confidence_whispers', kicker: 'The nation', title: 'Whispers of a challenge',
    body: 'The polls are dire and your own MPs are counting names in the tea room.',
    when: { roles: ['premier'], approvalBelow: 42 }, weight: 3,
    options: [
      opt('Relaunch with a big speech', [
        out(50, 'good', 'It is the speech of your life.', { support: { all: 3 } }),
        out(50, 'bad', 'It is called "more of the same".', { support: { all: -1 } }),
      ], { ap: 3 }),
      opt('Buy off the rebels', [out(100, 'mixed', 'Promises and party money. They stop counting, for now.', { clout: -2 })], { funds: 20000 }),
      opt('Dare them to try', [
        out(40, 'good', 'Nobody moves. You are stronger than before.', { clout: 5 }),
        out(60, 'bad', 'Somebody moves. You survive, narrowly.', { clout: -4, trust: -2 }),
      ]),
    ],
  },
  {
    key: 'tax_windfall', kicker: 'The nation', title: 'More money than forecast',
    body: 'Tax receipts have beaten the forecast. Everyone has a view on how to spend it.',
    when: { roles: ['premier'], stat: { key: 'fiscal_health', above: 52 } },
    options: [
      opt('A rebate for every household', [out(100, 'good', 'A cheque in every letterbox.', { stat: { fiscal_health: -2 }, support: { all: 2 } })]),
      opt('Pay down the debt', [out(100, 'mixed', 'Dull and correct.', { stat: { fiscal_health: 2 }, support: { [P]: 2 } })]),
      opt('Build something', [out(100, 'good', 'A rail link, with your name nowhere near it. People notice anyway.', { stat: { fiscal_health: -2, prosperity: 1, human_development: 1 }, support: { [W]: 2 } })]),
    ],
  },
];

export const SITUATION_BY_KEY: Record<string, SituationCard> = Object.fromEntries(SITUATIONS.map(c => [c.key, c]));
