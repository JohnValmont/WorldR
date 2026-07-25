export type IdeologyAxis = {
  id: string
  label: string
  left: string
  right: string
  leftDesc: string
  rightDesc: string
  color: string
}

export type CoFounder = {
  id: string
  name: string
  title: string
  age: number
  trait: string
  traitDesc: string
  loyalty: number
  influence: number
  ambition: number
  secret: string
  demand: string
  portrait: string
  accent: string
}

export type Crisis = {
  id: string
  headline: string
  subtext: string
  opportunity: string
  risk: string
  voterGroupBonus: string
  icon: string
}

export type PolicyPillar = {
  id: string
  label: string
  stances: { id: string; label: string; desc: string; tradeoff: string }[]
}

export type PartyColor = {
  id: string
  name: string
  hex: string
  meaning: string
}

export const CRISES: Crisis[] = [
  {
    id: "housing",
    headline: "Housing Crisis Grips Capital",
    subtext: "Rents up 40% in three years. 200,000 families on waiting lists.",
    opportunity: "Working-class & young urban voters desperate for change",
    risk: "Property owners and construction lobbies will oppose you",
    voterGroupBonus: "+18% Youth, +14% Working Class",
    icon: "⚡"
  },
  {
    id: "corruption",
    headline: "Treasury Scandal Exposed",
    subtext: "Senior ministers implicated. Trust in government hits historic low.",
    opportunity: "Anti-establishment wave. Voters want a clean break.",
    risk: "Establishment parties will weaponize any past connection against you",
    voterGroupBonus: "+22% Independent Voters, +10% Moderates",
    icon: "🔥"
  },
  {
    id: "industry",
    headline: "Deindustrialization Reaches Breaking Point",
    subtext: "Three major factories close this quarter. 40,000 jobs lost.",
    opportunity: "Industrial communities abandoned by mainstream parties",
    risk: "Economic nationalists and unions will fight over your base",
    voterGroupBonus: "+20% Industrial Workers, +12% Rural Communities",
    icon: "⚙"
  },
  {
    id: "climate",
    headline: "Catastrophic Floods: Third Year Running",
    subtext: "Entire coastal towns evacuated. Insurance companies pulling out.",
    opportunity: "Climate urgency galvanizes youth and middle-class suburban voters",
    risk: "Agricultural and energy sectors will fund your rivals",
    voterGroupBonus: "+25% Youth, +16% Suburban Families",
    icon: "🌊"
  },
]

export const IDEOLOGY_AXES: IdeologyAxis[] = [
  {
    id: "economy",
    label: "Economic Policy",
    left: "State-Led",
    right: "Free Market",
    leftDesc: "Public ownership, redistribution, worker protections",
    rightDesc: "Deregulation, privatization, market freedom",
    color: "#c8102e"
  },
  {
    id: "authority",
    label: "State & Society",
    left: "Progressive",
    right: "Traditional",
    leftDesc: "Civil liberties, reform, individual freedoms",
    rightDesc: "Social order, institutions, cultural continuity",
    color: "#c9a84c"
  },
  {
    id: "governance",
    label: "Governance Model",
    left: "Decentralized",
    right: "Centralized",
    leftDesc: "Local power, regional autonomy, grassroots",
    rightDesc: "Strong state, national unity, decisive leadership",
    color: "#00a8a8"
  },
]

export const CO_FOUNDERS: CoFounder[] = [
  {
    id: "chen",
    name: "Dr. Mei Chen",
    title: "Former University Rector",
    age: 58,
    trait: "The Intellectual",
    traitDesc: "Brings academic credibility. Writes policy that holds up under scrutiny. Slow to decide but impossible to embarrass.",
    loyalty: 72,
    influence: 88,
    ambition: 45,
    secret: "Resigned over a plagiarism scandal she helped cover up",
    demand: "Chair of Policy Committee",
    portrait: "MC",
    accent: "#00a8a8"
  },
  {
    id: "okafor",
    name: "Samuel Okafor",
    title: "Labor Union Organizer",
    age: 41,
    trait: "The Mobilizer",
    traitDesc: "40,000 union members follow his word. Knows how to put bodies on the street. Impatient with process.",
    loyalty: 85,
    influence: 76,
    ambition: 80,
    secret: "Has approached two other parties this year",
    demand: "Co-leadership if polls hit 12%",
    portrait: "SO",
    accent: "#c8102e"
  },
  {
    id: "vasquez",
    name: "Elena Vasquez",
    title: "Tech Entrepreneur",
    age: 34,
    trait: "The Financier",
    traitDesc: "Brings startup funding networks and media savvy. Positions you as modern. Her donors want deregulation.",
    loyalty: 55,
    influence: 70,
    ambition: 90,
    secret: "Has a pending tax investigation she hasn't disclosed",
    demand: "Economic policy veto power",
    portrait: "EV",
    accent: "#c9a84c"
  },
  {
    id: "morrison",
    name: "Rev. James Morrison",
    title: "Community Pastor & Activist",
    age: 63,
    trait: "The Moral Authority",
    traitDesc: "Thirty years of community organizing. Trusted by demographics no politician reaches. Won\'t compromise on principle.",
    loyalty: 92,
    influence: 65,
    ambition: 30,
    secret: "His church finances have never been audited",
    demand: "Founding manifesto must include social justice clause",
    portrait: "JM",
    accent: "#059669"
  },
  {
    id: "petrov",
    name: "Anya Petrov",
    title: "Investigative Journalist",
    age: 38,
    trait: "The Strategist",
    traitDesc: "Knows where every political body is buried. Brilliant media tactician. Ruthless when crossed.",
    loyalty: 62,
    influence: 82,
    ambition: 88,
    secret: "Has sources inside every rival party",
    demand: "Director of Communications, no oversight",
    portrait: "AP",
    accent: "#7c3aed"
  },
]

export const POLICY_PILLARS: PolicyPillar[] = [
  {
    id: "economy",
    label: "Economic Vision",
    stances: [
      { id: "e1", label: "Universal Basic Services", desc: "Housing, healthcare, transport as public rights", tradeoff: "+Working Class +Youth −Businesses −Fiscal Hawks" },
      { id: "e2", label: "Green Industrial Policy", desc: "State-led transition to sustainable economy", tradeoff: "+Environmentalists +Engineers −Traditional Industry" },
      { id: "e3", label: "Small Business Economy", desc: "Cut bureaucracy, empower local entrepreneurs", tradeoff: "+SMEs +Rural −Labor Unions −Public Sector" },
      { id: "e4", label: "Open Market Reform", desc: "Deregulate, attract foreign investment, grow GDP", tradeoff: "+Investors +Urban Professional −Workers −Rural" },
    ]
  },
  {
    id: "society",
    label: "Social Contract",
    stances: [
      { id: "s1", label: "Progressive Rights Agenda", desc: "Civil liberties, diversity, individual freedom", tradeoff: "+Youth +Urban +Minorities −Traditional Voters" },
      { id: "s2", label: "Community & Family Values", desc: "Support institutions, strengthen social fabric", tradeoff: "+Suburban +Religious −Secular +Rural" },
      { id: "s3", label: "Meritocracy & Opportunity", desc: "Equal access, not equal outcomes", tradeoff: "+Middle Class +Professionals −Activists" },
      { id: "s4", label: "Radical Accountability", desc: "End corruption, open all institutions", tradeoff: "+Independent Voters +Youth −Establishment" },
    ]
  },
  {
    id: "power",
    label: "Vision of Power",
    stances: [
      { id: "p1", label: "Electoral Revolution", desc: "Win office, reform from inside government", tradeoff: "+Moderates +Pragmatists −Radicals" },
      { id: "p2", label: "Movement First", desc: "Build mass power outside parliament", tradeoff: "+Activists +Youth −Electoral Strategists" },
      { id: "p3", label: "Coalition Builder", desc: "Govern through alliances and negotiation", tradeoff: "+Political Class +Media −Purists" },
      { id: "p4", label: "Opposition Force", desc: "Hold power accountable indefinitely if needed", tradeoff: "+Civil Society +Press −Impatient Supporters" },
    ]
  },
]

export const PARTY_COLORS: PartyColor[] = [
  { id: "crimson", name: "Crimson", hex: "#c8102e", meaning: "Passion, sacrifice, revolution" },
  { id: "cobalt", name: "Cobalt", hex: "#1e3a8a", meaning: "Trust, stability, tradition" },
  { id: "emerald", name: "Emerald", hex: "#059669", meaning: "Growth, hope, environment" },
  { id: "gold", name: "Gold", hex: "#c9a84c", meaning: "Prosperity, nation, legacy" },
  { id: "violet", name: "Violet", hex: "#7c3aed", meaning: "Reform, imagination, independence" },
  { id: "slate", name: "Slate", hex: "#475569", meaning: "Pragmatism, competence, order" },
  { id: "amber", name: "Amber", hex: "#d97706", meaning: "Industry, community, resilience" },
  { id: "teal", name: "Teal", hex: "#0891b2", meaning: "Progress, clarity, modernity" },
]

export const MEDIA_REACTIONS = [
  { outlet: "The National Tribune", bias: "Centrist", reaction: "A new force enters the arena — but will it last past the first election?" },
  { outlet: "Workers' Dispatch", bias: "Left-leaning", reaction: "Finally, a movement that speaks the language of ordinary people." },
  { outlet: "Capital Markets Review", bias: "Business", reaction: "Investors watching cautiously. Policy details needed before any judgment." },
  { outlet: "The Evening Standard", bias: "Conservative", reaction: "Another protest movement dressed as a political party. We've seen this before." },
  { outlet: "Forward Magazine", bias: "Progressive", reaction: "Bold founding manifesto. Now comes the hard part: governing ambition." },
]
