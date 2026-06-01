export type OpportunityType = 'survival' | 'reputation' | 'network' | 'politics' | 'business';
export type OpportunityState = 'Drennport State' | 'Ironvale State' | 'Greenmere State' | 'Westport State' | 'Any State';
export type OpportunityFactor = 'credibility' | 'charisma' | 'influence' | 'resources';

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  state: OpportunityState;
  shortDescription: string;
  story: string;
  mainFactors: OpportunityFactor[];
  requirements?: {
    credibility?: number;
    charisma?: number;
    influence?: number;
    resources?: number;
  };
  rewards: {
    credibility?: number;
    charisma?: number;
    influence?: number;
    resources?: number;
    money?: number;
  };
  risks: {
    credibility?: number;
    charisma?: number;
    influence?: number;
    resources?: number;
    money?: number;
    obligation?: string;
    vulnerability?: string;
  };
  recordTemplates: {
    success: string;
    mixed: string;
    failure: string;
  };
  originWeights?: {
    homeStates?: string[];
    householdBackgrounds?: string[];
    pre18Reputations?: string[];
    firstSupporters?: string[];
    earlyBurdens?: string[];
  };
  tags: string[];
  timeCost: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export const DRENNIA_OPPORTUNITIES: Opportunity[] = [
  // SURVIVAL
  {
    id: 'surv_clerk_01',
    title: 'Part-Time Clerk Work',
    type: 'survival',
    state: 'Any State',
    shortDescription: 'Basic office support to stabilize early finances.',
    story: 'A local office needs temporary help. It is not glamorous, but it pays and teaches how ordinary institutions work.',
    mainFactors: ['credibility', 'resources'],
    rewards: { resources: 3, money: 250 },
    risks: { vulnerability: 'slower public growth' },
    recordTemplates: {
      success: 'Completed part-time clerk work to stabilize early finances.',
      mixed: 'Struggled through basic clerk duties for modest pay.',
      failure: 'Fired from an early clerk job, damaging early resources.'
    },
    tags: ['work', 'money', 'stability'],
    timeCost: '1 Week',
    riskLevel: 'Low'
  },
  {
    id: 'surv_family_01',
    title: 'Family Support Shift',
    type: 'survival',
    state: 'Any State',
    shortDescription: 'Help your family through an immediate financial or logistical squeeze.',
    story: 'Your household is facing pressure. Stepping in helps your credibility at home but takes time away from public ambitions.',
    mainFactors: ['credibility'],
    rewards: { credibility: 2, resources: 1, money: 100 },
    risks: { obligation: 'small stress/family pressure note' },
    recordTemplates: {
      success: 'Helped family through an early financial pressure.',
      mixed: 'Provided some family support despite personal strain.',
      failure: 'Failed to support family obligations when needed most.'
    },
    originWeights: {
      householdBackgrounds: ['Struggling Household', 'Stable Middle-Class Household']
    },
    tags: ['family', 'money', 'loyalty'],
    timeCost: '1 Week',
    riskLevel: 'Low'
  },
  {
    id: 'surv_scholarship_01',
    title: 'Scholarship Application',
    type: 'survival',
    state: 'Drennport State',
    shortDescription: 'Apply for a competitive civic or academic grant.',
    story: 'Securing this grant provides significant early resources, but requires a flawless presentation and credibility.',
    mainFactors: ['credibility'],
    rewards: { credibility: 3, resources: 2, money: 300 },
    risks: { obligation: 'scholarship pressure' },
    recordTemplates: {
      success: 'Secured a competitive early scholarship in Drennport.',
      mixed: 'Received partial scholarship funding with strings attached.',
      failure: 'Rejected from a major early scholarship application.'
    },
    originWeights: {
      pre18Reputations: ['Top Student'],
      earlyBurdens: ['Scholarship Pressure'],
      homeStates: ['Drennport State']
    },
    tags: ['academic', 'money', 'prestige'],
    timeCost: '2 Weeks',
    riskLevel: 'Medium'
  },

  // REPUTATION
  {
    id: 'rep_debate_01',
    title: 'Student Debate Night',
    type: 'reputation',
    state: 'Drennport State',
    shortDescription: 'Speak publicly at a well-attended student and local organizer forum.',
    story: 'A chance to build an early speaking record. Organizers and maybe some journalists will be watching.',
    mainFactors: ['charisma', 'credibility'],
    rewards: { charisma: 3, credibility: 2 },
    risks: { credibility: -1, vulnerability: 'public embarrassment' },
    recordTemplates: {
      success: 'Performed strongly at Drennport Student Debate Night.',
      mixed: 'Gave a forgettable speech at Drennport Debate Night.',
      failure: 'Suffered public embarrassment at a local debate forum.'
    },
    originWeights: {
      homeStates: ['Drennport State'],
      pre18Reputations: ['Debate Winner']
    },
    tags: ['speaking', 'public record', 'youth'],
    timeCost: '1 Week',
    riskLevel: 'Medium'
  },
  {
    id: 'rep_community_01',
    title: 'Community Service Drive',
    type: 'reputation',
    state: 'Greenmere State',
    shortDescription: 'Lead a local agricultural or neighborhood assistance drive.',
    story: 'Grassroots credibility is built through sweat. Helping the community establishes a safe, positive early reputation.',
    mainFactors: ['credibility', 'charisma'],
    rewards: { credibility: 3, charisma: 1 },
    risks: {},
    recordTemplates: {
      success: 'Led a successful community service drive in Greenmere.',
      mixed: 'Participated in a local community service drive.',
      failure: 'Organized a poorly attended community service drive.'
    },
    originWeights: {
      homeStates: ['Greenmere State'],
      pre18Reputations: ['Community Helper'],
      firstSupporters: ['Religious / Community Elder']
    },
    tags: ['community', 'grassroots', 'safe'],
    timeCost: '2 Weeks',
    riskLevel: 'Low'
  },
  {
    id: 'rep_policy_01',
    title: 'Youth Policy Forum',
    type: 'reputation',
    state: 'Drennport State',
    shortDescription: 'Draft and present a mock policy brief to civic leaders.',
    story: 'Showcasing your intelligence to the right people. High stakes for your early credibility in capital circles.',
    mainFactors: ['credibility', 'charisma'],
    rewards: { credibility: 2, charisma: 2, influence: 1 },
    risks: { vulnerability: 'public embarrassment' },
    recordTemplates: {
      success: 'Presented a well-received brief at the Youth Policy Forum.',
      mixed: 'Attended the Youth Policy Forum with minor impact.',
      failure: 'Made significant errors presenting at the Youth Policy Forum.'
    },
    originWeights: {
      homeStates: ['Drennport State']
    },
    tags: ['policy', 'civic', 'speaking'],
    timeCost: '1 Week',
    riskLevel: 'Medium'
  },

  // NETWORK
  {
    id: 'net_councillor_01',
    title: 'Meet Local Councillor',
    type: 'network',
    state: 'Any State',
    shortDescription: 'Secure an introductory meeting with a low-level municipal official.',
    story: 'A quick coffee meeting. They are scouting for useful young talent, but they will expect favors down the line.',
    mainFactors: ['influence', 'credibility'],
    rewards: { influence: 3 },
    risks: { obligation: 'Political favor' },
    recordTemplates: {
      success: 'Met a local councillor and entered a small political network.',
      mixed: 'Had an unremarkable introductory meeting with a local official.',
      failure: 'Alienated a local councillor during an introductory meeting.'
    },
    originWeights: {
      firstSupporters: ['Local Councillor'],
      householdBackgrounds: ['Political Household']
    },
    tags: ['politics', 'contacts', 'favors'],
    timeCost: '1 Week',
    riskLevel: 'Medium'
  },
  {
    id: 'net_dinner_01',
    title: 'Attend Community Dinner',
    type: 'network',
    state: 'Greenmere State',
    shortDescription: 'Show your face at a major regional gathering of elders and farmers.',
    story: 'Rural politics runs on face-to-face trust. Being seen here builds your regional influence network.',
    mainFactors: ['charisma', 'influence'],
    rewards: { influence: 2, charisma: 1 },
    risks: { obligation: 'Community expectations' },
    recordTemplates: {
      success: 'Built strong regional ties at a Greenmere community dinner.',
      mixed: 'Attended a regional dinner, making minor connections.',
      failure: 'Committed a social faux pas at a Greenmere gathering.'
    },
    originWeights: {
      homeStates: ['Greenmere State']
    },
    tags: ['community', 'social', 'rural'],
    timeCost: '1 Week',
    riskLevel: 'Low'
  },
  {
    id: 'net_business_01',
    title: 'Visit Business Circle',
    type: 'network',
    state: 'Westport State',
    shortDescription: 'Attend an open networking event for young Westport exporters.',
    story: 'Money talks. Showing up looking sharp and talking sense might secure a small early patron or business lead.',
    mainFactors: ['influence', 'resources'],
    rewards: { influence: 2, resources: 2 },
    risks: { obligation: 'Business expectations' },
    recordTemplates: {
      success: 'Secured early connections in Westport business circles.',
      mixed: 'Navigated Westport business networking with average success.',
      failure: 'Dismissed by senior exporters at a Westport networking event.'
    },
    originWeights: {
      homeStates: ['Westport State'],
      householdBackgrounds: ['Business Household'],
      firstSupporters: ['Business Patron']
    },
    tags: ['business', 'money', 'networking'],
    timeCost: '1 Week',
    riskLevel: 'Medium'
  },

  // POLITICS
  {
    id: 'pol_observe_01',
    title: 'Observe Civic Order Meeting',
    type: 'politics',
    state: 'Drennport State',
    shortDescription: 'Sit in the gallery during a local party coordination session.',
    story: 'You aren’t joining yet, but you are learning how the party machine functions and letting them see your face.',
    mainFactors: ['credibility', 'influence'],
    rewards: { influence: 3, credibility: 1 },
    risks: { obligation: 'Party organizer favor' },
    recordTemplates: {
      success: 'Observed a Civic Order Party local meeting and made good impressions.',
      mixed: 'Quietly observed a Civic Order Party meeting.',
      failure: 'Appeared out of depth while observing a party meeting.'
    },
    originWeights: {
      homeStates: ['Drennport State']
    },
    tags: ['party', 'civic', 'exposure'],
    timeCost: '2 Weeks',
    riskLevel: 'Low'
  },
  {
    id: 'pol_union_01',
    title: 'Attend Workers’ Renewal Forum',
    type: 'politics',
    state: 'Ironvale State',
    shortDescription: 'Listen to union leaders discuss labor policies and industrial strikes.',
    story: 'Labor power is real power in Ironvale. Showing solidarity here is the first step to industrial influence.',
    mainFactors: ['charisma', 'influence'],
    rewards: { charisma: 2, influence: 2 },
    risks: { obligation: 'Labour network favor' },
    recordTemplates: {
      success: 'Built solidarity at an Ironvale Workers’ Renewal Forum.',
      mixed: 'Attended an Ironvale labor forum without taking a strong stance.',
      failure: 'Clashed with organizers at an Ironvale labor forum.'
    },
    originWeights: {
      homeStates: ['Ironvale State'],
      firstSupporters: ['Union Organizer']
    },
    tags: ['labour', 'unions', 'industrial'],
    timeCost: '1 Week',
    riskLevel: 'Medium'
  },
  {
    id: 'pol_campaign_01',
    title: 'Volunteer for Local Campaign Office',
    type: 'politics',
    state: 'Any State',
    shortDescription: 'Hand out flyers and do basic canvassing for a municipal candidate.',
    story: 'Grunt work builds character—and gets you noticed by the campaign managers who run the real shows.',
    mainFactors: ['credibility', 'influence'],
    rewards: { influence: 3, credibility: 1 },
    risks: { obligation: 'Campaign network favor' },
    recordTemplates: {
      success: 'Volunteered effectively in a local municipal campaign office.',
      mixed: 'Did basic canvassing work for a local campaign.',
      failure: 'Quit early while volunteering for a local campaign.'
    },
    originWeights: {},
    tags: ['campaign', 'grassroots', 'exposure'],
    timeCost: '3 Weeks',
    riskLevel: 'Low'
  },

  // BUSINESS
  {
    id: 'bus_resale_01',
    title: 'Small Trade Resale',
    type: 'business',
    state: 'Any State',
    shortDescription: 'Buy a small batch of goods at the port and resell locally.',
    story: 'A quick hustle. Requires some starting resources and enough charisma to move the product fast.',
    mainFactors: ['resources', 'charisma'],
    rewards: { resources: 3, money: 200 },
    risks: { resources: -1, money: -50 },
    recordTemplates: {
      success: 'Turned a quick profit on a small trade resale.',
      mixed: 'Broke even on a small local trade venture.',
      failure: 'Lost money on a botched small trade resale.'
    },
    originWeights: {
      homeStates: ['Westport State'],
      householdBackgrounds: ['Business Household'],
      pre18Reputations: ['Young Hustler']
    },
    tags: ['trade', 'money', 'hustle'],
    timeCost: '1 Week',
    riskLevel: 'High'
  },
  {
    id: 'bus_exchange_01',
    title: 'Research Drennport Exchange',
    type: 'business',
    state: 'Drennport State',
    shortDescription: 'Study early market movements and corporate filings.',
    story: 'Before you can play the market, you must understand it. Requires credibility to access the right reading rooms.',
    mainFactors: ['credibility'],
    rewards: { credibility: 1, resources: 2 },
    risks: {},
    recordTemplates: {
      success: 'Studied early market movement on the Drennport Exchange.',
      mixed: 'Skimmed financial filings at the Drennport Exchange.',
      failure: 'Failed to comprehend complex filings at the Drennport Exchange.'
    },
    originWeights: {
      homeStates: ['Drennport State']
    },
    tags: ['finance', 'research', 'safe'],
    timeCost: '2 Weeks',
    riskLevel: 'Low'
  },
  {
    id: 'bus_family_01',
    title: 'Help Family Shop',
    type: 'business',
    state: 'Any State',
    shortDescription: 'Work the counter and manage local suppliers for a relative.',
    story: 'It is not a global conglomerate, but balancing the books and keeping customers happy builds real-world skills.',
    mainFactors: ['resources', 'credibility'],
    rewards: { resources: 2, credibility: 1, money: 150 },
    risks: { obligation: 'family business obligation' },
    recordTemplates: {
      success: 'Successfully managed operations at the family shop.',
      mixed: 'Worked a standard stint at the family business.',
      failure: 'Caused a minor loss while helping at the family shop.'
    },
    originWeights: {
      householdBackgrounds: ['Business Household', 'Struggling Household'],
      earlyBurdens: ['Family Debt']
    },
    tags: ['family', 'retail', 'money'],
    timeCost: '2 Weeks',
    riskLevel: 'Low'
  }
];
