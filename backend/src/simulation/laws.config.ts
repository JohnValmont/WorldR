export interface LawEffect {
  target_type: 'sector' | 'population_group' | 'tax' | 'budget_item' | 'nation';
  target_name: string;
  parameter_name: string;
  modifier_type: 'multiplier' | 'additive';
  modifier_value: number;
}

export interface PolicyOption {
  key: string;
  name: string;
  description: string;
  effects: LawEffect[];
  voterBlocStanding: Record<string, number>; // direct change to equilibrium approval
  voterBlocWeightModifiers?: Record<string, number>; // change to population share multiplier
  voterTurnoutModifiers?: Record<string, number>; // change to turnout rate addition
  pros: string[];
  cons: string[];
}

export interface Policy {
  key: string;
  name: string;
  description: string;
  options: PolicyOption[];
}

export interface Sector {
  key: string;
  name: string;
  icon: string;
  policies: Policy[];
}

export const LAWS_CONFIG: Sector[] = [
  {
    key: 'economics',
    name: 'Economics',
    icon: '📊',
    policies: [
      {
        key: 'corporate_taxation',
        name: 'Corporate Taxation',
        description: 'The state\'s stance on taxing corporate profits. Corporate tax directly affects business profitability, foreign investment, and state revenues.',
        options: [
          {
            key: 'tax_haven',
            name: 'Tax Haven',
            description: 'The state imposes minimal corporate tax, positioning itself as a destination for foreign capital with special economic zones and exemptions.',
            effects: [
              { target_type: 'tax', target_name: 'Corporate Tax', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 0.1 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.03 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.015 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.15,
              industrial_conglomerates: 0.20,
              small_business_owners: 0.05,
              industrial_workers: -0.08,
              union_members: -0.10,
              unemployed_precariat: -0.05
            },
            voterBlocWeightModifiers: { large_business_executives: 0.08 },
            pros: ['Attracts massive foreign direct investment', 'Boots financial and tech services sectors'],
            cons: ['Severely drains government revenue', 'Increases wealth inequality']
          },
          {
            key: 'pro_business_low',
            name: 'Pro-Business Low Tax',
            description: 'Low tax rates designed to incentivize local businesses and encourage job growth while maintaining a moderate flow of corporate tax revenue.',
            effects: [
              { target_type: 'tax', target_name: 'Corporate Tax', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 0.6 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.015 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.01 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.08,
              industrial_conglomerates: 0.08,
              small_business_owners: 0.06,
              industrial_workers: -0.02,
              union_members: -0.04
            },
            pros: ['Encourages investment and expansions', 'Increases domestic business competitiveness'],
            cons: ['Reduces revenue available for public infrastructure', 'Mildly favors wealthy shareholders']
          },
          {
            key: 'standard_rate',
            name: 'Standard Rate',
            description: 'A balanced corporate tax rate (around 25-30%) that secures critical funding for public infrastructure while leaving firms with sufficient capital.',
            effects: [
              { target_type: 'tax', target_name: 'Corporate Tax', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 1.0 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.04,
              pensioners_elderly: 0.02,
              large_business_executives: 0.0
            },
            pros: ['Provides reliable funding for public utilities', 'Creates a stable economic consensus'],
            cons: ['Standard competitiveness with neighbors', 'No special investment incentives']
          },
          {
            key: 'heavy_taxation',
            name: 'Heavy Corporate Taxation',
            description: 'High corporate tax rates (40%+) to fund extensive social safety nets, redistribute wealth, and curtail excess corporate power.',
            effects: [
              { target_type: 'tax', target_name: 'Corporate Tax', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 1.6 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.015 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.01 }
            ],
            voterBlocStanding: {
              union_members: 0.12,
              industrial_workers: 0.08,
              unemployed_precariat: 0.10,
              large_business_executives: -0.15,
              industrial_conglomerates: -0.22,
              small_business_owners: -0.08
            },
            pros: ['Generates substantial funding for social welfare', 'Reduces corporate wealth concentration'],
            cons: ['Triggers capital flight and slows growth', 'Drives down stock market evaluations']
          }
        ]
      },
      {
        key: 'income_taxation',
        name: 'Income Taxation',
        description: 'Determines the tax burden placed on individuals based on their earnings. Highly influential for social mobility and public budget.',
        options: [
          {
            key: 'flat_tax',
            name: 'Flat Tax',
            description: 'Everyone pays the same fixed percentage of income, simplifying the tax code and incentivizing high-income earners to work and invest.',
            effects: [
              { target_type: 'tax', target_name: 'Income Tax', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 0.7 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.12,
              middle_class_professionals: 0.06,
              unemployed_precariat: -0.10,
              industrial_workers: -0.06
            },
            pros: ['Extremely simple administration', 'Highly popular with high-income professionals'],
            cons: ['Regressive impact on lower-income classes', 'Reduces public redistribution capacity']
          },
          {
            key: 'progressive_tax',
            name: 'Progressive Taxation',
            description: 'Tax rates scale with income, ensuring the wealthy pay a higher percentage. Standard policy for balancing inequality.',
            effects: [
              { target_type: 'tax', target_name: 'Income Tax', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 1.0 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.04,
              industrial_workers: 0.03,
              large_business_executives: -0.02
            },
            pros: ['Reduces post-tax income inequality', 'Relieves pressure on lower-income earners'],
            cons: ['Moderately complex tax filing code', 'High marginal rates may disincentivize high earners']
          },
          {
            key: 'high_wealth_tax',
            name: 'High Wealth & Income Tax',
            description: 'Imposes extremely steep marginal rates (up to 60%+) and wealth taxes on the highest bracket to fund public services and stop oligarchic accumulation.',
            effects: [
              { target_type: 'tax', target_name: 'Income Tax', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 1.4 }
            ],
            voterBlocStanding: {
              unemployed_precariat: 0.15,
              union_members: 0.10,
              industrial_workers: 0.08,
              large_business_executives: -0.25,
              small_business_owners: -0.10,
              middle_class_professionals: -0.06
            },
            pros: ['Generates major funds for welfare and education', 'Sharply reduces Gini coefficient / inequality'],
            cons: ['Risk of brain drain and tax evasion', 'Disincentivizes local venture capital']
          },
          {
            key: 'minimal_income_tax',
            name: 'Minimal Income Tax',
            description: 'Drastically cuts income tax for all citizens, shifting the tax burden to sales/tariffs to maximize personal take-home pay.',
            effects: [
              { target_type: 'tax', target_name: 'Income Tax', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 0.3 }
            ],
            voterBlocStanding: {
              small_business_owners: 0.15,
              middle_class_professionals: 0.12,
              large_business_executives: 0.10,
              pensioners_elderly: -0.08,
              unemployed_precariat: -0.05
            },
            pros: ['Massive increase in consumer spending power', 'Strong incentive to work and live in the country'],
            cons: ['Forces deep cuts to government services', 'Vulnerable to deficits during recessions']
          }
        ]
      },
      {
        key: 'trade_policy',
        name: 'Trade Policy',
        description: 'Sets tariffs and rules for international commerce. Determines whether the nation has open global trade or protected local sectors.',
        options: [
          {
            key: 'autarky',
            name: 'Autarky (Self-Reliance)',
            description: 'Imposes severe tariffs to cut dependence on foreign goods, aiming for total economic self-sufficiency and national security.',
            effects: [
              { target_type: 'tax', target_name: 'Tariffs', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 3.0 },
              { target_type: 'sector', target_name: 'Agriculture', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.02 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.01 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.03 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.15,
              industrial_workers: 0.08,
              urban_knowledge_workers: -0.15,
              large_business_executives: -0.12
            },
            pros: ['Total insulation from global supply shocks', 'Protects local agricultural and factories'],
            cons: ['Slows overall GDP growth and efficiency', 'Increases prices of tech and raw imports']
          },
          {
            key: 'protectionist',
            name: 'Protectionist Tariffs',
            description: 'Modest tariffs on manufactured goods and agricultural products to shield domestic industries from low-cost foreign dumpers.',
            effects: [
              { target_type: 'tax', target_name: 'Tariffs', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 1.8 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.008 }
            ],
            voterBlocStanding: {
              industrial_workers: 0.06,
              rural_conservatives: 0.06,
              urban_knowledge_workers: -0.04
            },
            pros: ['Secures factory jobs from offshoring', 'Raises additional tariff revenues'],
            cons: ['Mild friction in global trade relations', 'Increases assembly costs for builders']
          },
          {
            key: 'free_trade',
            name: 'Free Trade Agreements',
            description: 'Eliminates tariffs and quotas with major trading blocks, maximizing export potential and cheaper consumer options.',
            effects: [
              { target_type: 'tax', target_name: 'Tariffs', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 0.3 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.015 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.005 },
              { target_type: 'sector', target_name: 'Agriculture', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.01 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.10,
              urban_knowledge_workers: 0.08,
              rural_conservatives: -0.08,
              industrial_workers: -0.05
            },
            pros: ['Lowers prices of electronic and consumer imports', 'Stimulates international business hubs'],
            cons: ['Exposes local farms and factories to foreign glut', 'Increases vulnerability to supply shocks']
          },
          {
            key: 'globalist_integration',
            name: 'Globalist Integration',
            description: 'Aligns regulatory standards internationally and subsidizes export firms to deeply integrate into the global supply chain.',
            effects: [
              { target_type: 'tax', target_name: 'Tariffs', parameter_name: 'rate', modifier_type: 'multiplier', modifier_value: 0.1 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.02 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.06 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.14,
              urban_knowledge_workers: 0.10,
              industrial_conglomerates: 0.12,
              rural_conservatives: -0.12,
              union_members: -0.06
            },
            pros: ['Boosts national productivity and trade volume', 'Attracts international corporate headquarters'],
            cons: ['Fails to protect traditional local sectors', 'Increases wealth disparities between sectors']
          }
        ]
      }
    ]
  },
  {
    key: 'labor',
    name: 'Labor',
    icon: '⚒️',
    policies: [
      {
        key: 'minimum_wage',
        name: 'Minimum Wage',
        description: 'Regulations on the legal minimum hourly rate workers can be paid. Sets the baseline for lower-class income.',
        options: [
          {
            key: 'wage_abolished',
            name: 'Abolished (Market Rate)',
            description: 'Removes the minimum wage entirely, letting supply and demand determine pay. Aims to achieve zero structural unemployment.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.015 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.01 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.12,
              small_business_owners: 0.10,
              unemployed_precariat: -0.15,
              industrial_workers: -0.12,
              union_members: -0.15
            },
            pros: ['Maximizes hiring flexibility during downturns', 'Encourages startups and low-margin services'],
            cons: ['Can lead to extreme working poverty', 'Severely lowers working-class approval']
          },
          {
            key: 'wage_low',
            name: 'Low Minimum Wage',
            description: 'Maintains a minimal wage rate to protect against exploitation without hindering entry-level job creation.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.005 }
            ],
            voterBlocStanding: {
              small_business_owners: 0.05,
              unemployed_precariat: -0.05,
              union_members: -0.08
            },
            pros: ['Minimizes wage-push inflation pressure', 'Keeps youth employment high'],
            cons: ['Wage does not keep up with inflation', 'Slightly dampens consumer purchasing power']
          },
          {
            key: 'living_wage',
            name: 'Living Wage Standard',
            description: 'Index the minimum wage to the cost of basic housing and food, ensuring all full-time workers can live with dignity.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.03 }
            ],
            voterBlocStanding: {
              industrial_workers: 0.08,
              unemployed_precariat: 0.08,
              union_members: 0.08,
              small_business_owners: -0.06,
              large_business_executives: -0.04
            },
            pros: ['Increases consumer demand and worker health', 'Reduces public dependency on food stamps'],
            cons: ['Raises operational costs for small businesses', 'May result in mild wage-push inflation']
          },
          {
            key: 'high_wage',
            name: 'Aggressive Minimum Wage',
            description: 'Sets a high minimum wage to force companies to invest in automation and share corporate gains with the bottom tier.',
            effects: [
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.08 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.015 }
            ],
            voterBlocStanding: {
              unemployed_precariat: 0.16,
              industrial_workers: 0.14,
              union_members: 0.18,
              small_business_owners: -0.16,
              large_business_executives: -0.10
            },
            pros: ['Forces economy-wide productivity and automation', 'Drastically elevates lower-income earnings'],
            cons: ['Hurts margins of labor-heavy retail and restaurants', 'Disincentivizes hiring unskilled young workers']
          }
        ]
      },
      {
        key: 'work_week',
        name: 'Work Week Regulations',
        description: 'Limits on standard working hours before overtime kicks in, determining work-life balance and worker fatigue.',
        options: [
          {
            key: 'week_deregulated',
            name: 'Deregulated Working Hours',
            description: 'Repeals weekly hourly limits and overtime laws, letting workers and employers decide schedules individually.',
            effects: [
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.05 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.10,
              industrial_conglomerates: 0.12,
              union_members: -0.14,
              industrial_workers: -0.08
            },
            pros: ['Allows maximum seasonal factory operations', 'Increases peak industrial output'],
            cons: ['Substantially increases worker fatigue and injuries', 'Destroys family and social life satisfaction']
          },
          {
            key: 'week_standard_40',
            name: 'Standard 40-Hour Week',
            description: 'Enforces the classic 8-hour workday, five days a week, with standard 1.5x pay for overtime.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04,
              industrial_workers: 0.03
            },
            pros: ['Proven compromise between output and health', 'Predictable shift scheduling for logistics'],
            cons: ['Standard performance without competitive advantage', 'Does not reflect modern remote working patterns']
          },
          {
            key: 'week_35',
            name: '35-Hour Work Week',
            description: 'Shortens the legal work week to 35 hours to redistribute jobs, reduce burnout, and increase leisure spending.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.005 }
            ],
            voterBlocStanding: {
              union_members: 0.10,
              urban_knowledge_workers: 0.08,
              industrial_workers: 0.06,
              large_business_executives: -0.08
            },
            pros: ['Boosts tourism, culture, and service sectors', 'Improves physical health and mental focus'],
            cons: ['Increases hourly labor costs for factories', 'Can reduce total weekly manufacturing output']
          },
          {
            key: 'week_4day',
            name: '4-Day Work Week (32 Hours)',
            description: 'Mandates a 32-hour standard week with no loss of pay, hoping to match productivity through efficiency and happiness.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.06 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.015 }
            ],
            voterBlocStanding: {
              urban_knowledge_workers: 0.18,
              university_students: 0.10,
              union_members: 0.14,
              large_business_executives: -0.14,
              industrial_conglomerates: -0.18
            },
            pros: ['Massive boost to cognitive focus and retention', 'Attracts top-tier international digital talent'],
            cons: ['Impractical for continuous chemical/metal plants', 'Raises labor cost structure for industrial exporters']
          }
        ]
      },
      {
        key: 'union_protections',
        name: 'Union Protections',
        description: 'The legal rights of trade unions to organize, strike, and bargain collectively with corporations.',
        options: [
          {
            key: 'right_to_work',
            name: 'Right-to-Work (Weak Unions)',
            description: 'Limits strike actions, bans closed shops, and curbs union organizing inside private businesses to attract companies.',
            effects: [
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.015 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.14,
              small_business_owners: 0.08,
              union_members: -0.25,
              industrial_workers: -0.12
            },
            pros: ['Eliminates costly work stoppages and strikes', 'Attracts heavy manufacturing plants'],
            cons: ['Stagnates working-class wage growth', 'Drives massive anger among organized labor']
          },
          {
            key: 'balanced_bargaining',
            name: 'Balanced Collective Bargaining',
            description: 'Maintains institutionalized mediation boards, protecting the right to strike while enforcing arbitration.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04,
              union_members: 0.02
            },
            pros: ['Ensures labor peace through structured consensus', 'Prevents extreme labor-employer disputes'],
            cons: ['Arbitration can take months of gridlock', 'Dissatisfies both radical wings']
          },
          {
            key: 'mandatory_union',
            name: 'Mandatory Sector Bargaining',
            description: 'Requires all firms in an industry to follow sector-wide union contracts, preventing low-cost non-union competition.',
            effects: [
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.03 }
            ],
            voterBlocStanding: {
              union_members: 0.15,
              industrial_workers: 0.10,
              small_business_owners: -0.12,
              large_business_executives: -0.08
            },
            pros: ['Eliminates race-to-the-bottom wage dumping', 'Ensures high quality safety standards'],
            cons: ['Limits flexibility for small business operations', 'Increases domestic prices for services']
          },
          {
            key: 'syndicalist_councils',
            name: 'Syndicalist Worker Councils',
            description: 'Mandates that workers elect representatives to codetermine company boards and direct local economic planning.',
            effects: [
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.02 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.015 }
            ],
            voterBlocStanding: {
              union_members: 0.22,
              industrial_workers: 0.16,
              unemployed_precariat: 0.10,
              large_business_executives: -0.30,
              small_business_owners: -0.18
            },
            pros: ['Democratic control over production and safety', 'Virtually eliminates labor alienation'],
            cons: ['Disincentivizes any private venture investment', 'Slows down corporate speed to pivot and adapt']
          }
        ]
      }
    ]
  },
  {
    key: 'education',
    name: 'Education',
    icon: '🎓',
    policies: [
      {
        key: 'university_tuition',
        name: 'University Tuition',
        description: 'Funding models for higher education. Balances state expenses against student debt and research quality.',
        options: [
          {
            key: 'tuition_private',
            name: 'Fully Private & Market-Rate',
            description: 'Universities charge market rates for tuition. Students fund education via private loans or family capital.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.6 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.06,
              university_students: -0.18,
              middle_class_professionals: -0.05
            },
            pros: ['Saves massive amounts of public funds', 'Universities compete on quality to attract wealth'],
            cons: ['Creates huge student debt burdens', 'Barriers to higher education for poorer classes']
          },
          {
            key: 'tuition_subsidized',
            name: 'Subsidized Public Tuition',
            description: 'The state covers 50-70% of tuition costs, with students paying a moderate fee that is refundable via low-interest loans.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.9 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.05,
              university_students: -0.02
            },
            pros: ['Balances budget pressures with access', 'Keeps university administration accountable'],
            cons: ['Graduates still start careers with minor debt', 'Requires ongoing administrative funding audits']
          },
          {
            key: 'tuition_free',
            name: 'Free Higher Education',
            description: 'Abolishes all public tuition fees, funding university courses entirely through the national education budget.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.25 }
            ],
            voterBlocStanding: {
              university_students: 0.16,
              industrial_workers: 0.05,
              unemployed_precariat: 0.06,
              large_business_executives: -0.03
            },
            pros: ['Equal educational opportunities for all classes', 'Produces a highly skilled domestic workforce'],
            cons: ['Substantial increase in education budget costs', 'Can lead to crowded university lecture halls']
          },
          {
            key: 'tuition_stipend',
            name: 'Universal Student Stipend',
            description: 'Provides free tuition AND a monthly living stipend to all university students in good standing to focus on studies.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.5 }
            ],
            voterBlocStanding: {
              university_students: 0.25,
              immigrant_communities: 0.10,
              large_business_executives: -0.08,
              middle_class_professionals: -0.04
            },
            pros: ['Highest degree of social mobility and research', 'Enables poor students to study full-time'],
            cons: ['Extremely expensive public budget item', 'Risk of students remaining in university long-term']
          }
        ]
      },
      {
        key: 'curriculum_focus',
        name: 'Curriculum Focus',
        description: 'Determines the national educational curriculum priorities: STEM, nationalist traditions, or liberal arts.',
        options: [
          {
            key: 'curr_nationalist',
            name: 'Traditionalist & Patriotism',
            description: 'Focuses curriculum on national history, civic duties, moral values, and patriotic pride to build social cohesion.',
            effects: [
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.02 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.12,
              pensioners_elderly: 0.08,
              university_students: -0.10,
              urban_knowledge_workers: -0.08
            },
            pros: ['Strengthens cultural identity and unity', 'Boots civic alignment and military enlistment'],
            cons: ['Can alienate minority/immigrant communities', 'Less emphasis on modern technical training']
          },
          {
            key: 'curr_balanced',
            name: 'Standard Comprehensive',
            description: 'A balanced split between historical humanities, mathematics, natural sciences, and physical training.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04
            },
            pros: ['Broad foundation for various careers', 'Broad social consensus, minimal controversy'],
            cons: ['No specialized edge in global technical race', 'Rigid structure slower to update for digital skills']
          },
          {
            key: 'curr_stem',
            name: 'STEM & Coding Focus',
            description: 'Prioritizes mathematics, software engineering, physics, and robotics starting from primary school.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.05 },
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.05 }
            ],
            voterBlocStanding: {
              urban_knowledge_workers: 0.12,
              large_business_executives: 0.08,
              small_business_owners: 0.05
            },
            pros: ['Generates world-class engineering talent', 'Attracts multinational research labs'],
            cons: ['Reduces creative art and critical media focus', 'May create stress and high dropout rates in school']
          },
          {
            key: 'curr_progressive',
            name: 'Progressive & Critical Civic',
            description: 'Focuses on critical thinking, climate science, social justice, and international collaboration.',
            effects: [],
            voterBlocStanding: {
              university_students: 0.12,
              urban_knowledge_workers: 0.08,
              immigrant_communities: 0.06,
              rural_conservatives: -0.10
            },
            pros: ['Builds a socially conscious, inclusive society', 'Fosters high tolerance and environmental awareness'],
            cons: ['Prone to political culture wars in school boards', 'Highly controversial in conservative regions']
          }
        ]
      },
      {
        key: 'education_funding',
        name: 'School Funding Model',
        description: 'How elementary and secondary public schools are funded: locally or centrally.',
        options: [
          {
            key: 'funding_private_voucher',
            name: 'Private Voucher System',
            description: 'The state issues vouchers to families, who can spend them at private, charter, or public schools of their choice.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.7 }
            ],
            voterBlocStanding: {
              small_business_owners: 0.08,
              rural_conservatives: 0.06,
              union_members: -0.12,
              industrial_workers: -0.06
            },
            pros: ['Fosters school competition and innovation', 'Allows parents maximum choice in schooling style'],
            cons: ['Undermines public school budgets in poor areas', 'Can lead to ideological or religious segregation']
          },
          {
            key: 'funding_decentralized',
            name: 'Decentralized Municipal Funding',
            description: 'Schools are funded primarily through local property taxes, keeping decisions and standards community-focused.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.05,
              unemployed_precariat: -0.05
            },
            pros: ['Local accountability and parental controls', 'Fits community needs and local budget caps'],
            cons: ['Wealthy districts have highly superior schools', 'Systemic inequality in educational results']
          },
          {
            key: 'funding_centralized',
            name: 'Centralized National Funding',
            description: 'All public school funding is pooled and distributed equally per student from the national budget.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.1 }
            ],
            voterBlocStanding: {
              industrial_workers: 0.08,
              immigrant_communities: 0.06,
              unemployed_precariat: 0.06,
              middle_class_professionals: -0.02
            },
            pros: ['Ensures equal facilities and materials nationwide', 'Reduces geography-based educational inequality'],
            cons: ['Inflexible standard rules for rural schools', 'Higher cost for central administrative oversight']
          },
          {
            key: 'funding_equity',
            name: 'Equity Equalization Funding',
            description: 'Directs extra national funds specifically to schools in low-income, industrial, and minority districts.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.25 }
            ],
            voterBlocStanding: {
              unemployed_precariat: 0.14,
              immigrant_communities: 0.12,
              industrial_workers: 0.08,
              middle_class_professionals: -0.04
            },
            pros: ['Actively lifts up disadvantaged youth', 'Fosters high upward social mobility'],
            cons: ['Expensive budget requirements', 'Can cause resentment in middle-class districts']
          }
        ]
      }
    ]
  },
  {
    key: 'healthcare',
    name: 'Healthcare',
    icon: '🏥',
    policies: [
      {
        key: 'healthcare_system',
        name: 'Healthcare System',
        description: 'The structural funding model for hospitals and general practitioners. Highly critical for public health.',
        options: [
          {
            key: 'health_private',
            name: 'Private Insurance System',
            description: 'Healthcare is fully privatized, structured around competing commercial insurers and corporate hospital chains.',
            effects: [
              { target_type: 'budget_item', target_name: 'Healthcare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.5 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.10,
              small_business_owners: 0.04,
              unemployed_precariat: -0.20,
              industrial_workers: -0.12,
              pensioners_elderly: -0.15
            },
            pros: ['Extremely low public healthcare spending', 'Rapid access and luxury services for the wealthy'],
            cons: ['Excludes poorest citizens from life-saving care', 'Medical bankruptcies can destabilize families']
          },
          {
            key: 'health_multi_payer',
            name: 'Multi-Payer Subsidized',
            description: 'Universal insurance mandated by law. Citizens choose private or non-profit funds, with state subsidies for the poor.',
            effects: [
              { target_type: 'budget_item', target_name: 'Healthcare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.95 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.06,
              pensioners_elderly: 0.04
            },
            pros: ['Maintains consumer choice while covering everyone', 'Balanced cost-sharing between state and citizen'],
            cons: ['Highly complex administrative insurance bills', 'Out-of-pocket co-pays still affect lower classes']
          },
          {
            key: 'health_universal_public',
            name: 'Universal Public Healthcare',
            description: 'A single-payer public fund covers all medical procedures, funded entirely through corporate and income taxes.',
            effects: [
              { target_type: 'budget_item', target_name: 'Healthcare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.3 },
              { target_type: 'population_group', target_name: 'Poor', parameter_name: 'approval', modifier_type: 'additive', modifier_value: 0.05 }
            ],
            voterBlocStanding: {
              pensioners_elderly: 0.12,
              industrial_workers: 0.08,
              unemployed_precariat: 0.10,
              large_business_executives: -0.06
            },
            pros: ['Eliminates financial fear of illness', 'Huge collective bargaining power for medical supplies'],
            cons: ['Significant increase in public spending', 'Can result in longer queues for elective surgeries']
          },
          {
            key: 'health_socialized',
            name: 'Socialized Medicine',
            description: 'The state owns and runs all hospitals and clinics directly, employing doctors as salaried public servants.',
            effects: [
              { target_type: 'budget_item', target_name: 'Healthcare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.55 }
            ],
            voterBlocStanding: {
              union_members: 0.14,
              unemployed_precariat: 0.12,
              pensioners_elderly: 0.10,
              large_business_executives: -0.15,
              middle_class_professionals: -0.08
            },
            pros: ['Complete integration of national healthcare strategy', 'Zero private healthcare profit leakages'],
            cons: ['Stops investment in private clinical innovation', 'Huge government administrative burden']
          }
        ]
      },
      {
        key: 'pharma_pricing',
        name: 'Pharmaceutical Pricing',
        description: 'Sets rules on drug pricing and patents, balancing pharmaceutical corporate profits against public access to medicine.',
        options: [
          {
            key: 'pharma_unregulated',
            name: 'Unregulated Free Pricing',
            description: 'Pharma firms set prices freely based on patents. Intended to maximize R&D investment and attract research.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.01 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.08,
              pensioners_elderly: -0.12,
              unemployed_precariat: -0.08
            },
            pros: ['Attracts high-tech pharmaceutical firms', 'Promotes domestic patent ownership'],
            cons: ['Skyrocketing costs for essential drugs', 'Hurts public healthcare budget efficiency']
          },
          {
            key: 'pharma_reference',
            name: 'Reference Price Limits',
            description: 'Caps drug prices based on averages of neighboring countries, preventing price gouging on standard patents.',
            effects: [],
            voterBlocStanding: {
              pensioners_elderly: 0.04,
              middle_class_professionals: 0.02
            },
            pros: ['Moderates drug budget growth', 'Keeps price gouging in check'],
            cons: ['Firms may delay launching newer drugs locally', 'Minor friction with global pharmaceutical lobbies']
          },
          {
            key: 'pharma_negotiation',
            name: 'Direct Price Negotiation',
            description: 'The state healthcare fund negotiates prices directly using its monopsony power, capping maximum profit margins.',
            effects: [
              { target_type: 'budget_item', target_name: 'Healthcare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.9 }
            ],
            voterBlocStanding: {
              pensioners_elderly: 0.08,
              industrial_workers: 0.04,
              large_business_executives: -0.04
            },
            pros: ['Saves substantial budget on prescription drugs', 'Lowers co-pays for sick patients'],
            cons: ['Pharma firms may limit local clinical trials', 'Dampens local bio-tech venture capital']
          },
          {
            key: 'pharma_manufacture',
            name: 'State Generic Manufacture',
            description: 'The state builds public labs to manufacture generic, off-patent essential drugs directly to bypass commercial markups.',
            effects: [
              { target_type: 'budget_item', target_name: 'Healthcare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.1 }
            ],
            voterBlocStanding: {
              union_members: 0.10,
              unemployed_precariat: 0.08,
              pensioners_elderly: 0.08,
              large_business_executives: -0.12
            },
            pros: ['Guarantees cheap supply of life-saving drugs', 'Immunity to global shipping drug shortages'],
            cons: ['High capital cost to build manufacturing labs', 'Stops foreign private medicine partnerships']
          }
        ]
      },
      {
        key: 'medical_research',
        name: 'Medical Research & Dev',
        description: 'Determines the funding model for developing new vaccines, drugs, and treatment technologies.',
        options: [
          {
            key: 'research_private_only',
            name: 'Private R&D (Corporate)',
            description: 'Relies entirely on private pharmaceutical and biotechnology corporations to fund and conduct medical research.',
            effects: [],
            voterBlocStanding: {
              large_business_executives: 0.06,
              university_students: -0.04
            },
            pros: ['Zero state expenditure on risky research projects', 'Highly efficient commercialization of successful drugs'],
            cons: ['Neglects rare diseases with low profit potential', 'Research remains behind proprietary walls']
          },
          {
            key: 'research_partnership',
            name: 'Public-Private Partnerships',
            description: 'The state co-invests in medical research with private companies, sharing both research risks and future profits.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04,
              urban_knowledge_workers: 0.04
            },
            pros: ['Leverages private efficiency with public goals', 'Accelerates translation from lab to hospital'],
            cons: ['Negotiations on profit shares can be complex', 'Public funds occasionally subsidize corporate losses']
          },
          {
            key: 'research_state_funded',
            name: 'State-Funded Medical Research',
            description: 'Directs massive public grants to university medical centers to research therapies and cures for major diseases.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.15 }
            ],
            voterBlocStanding: {
              university_students: 0.08,
              urban_knowledge_workers: 0.06,
              pensioners_elderly: 0.05
            },
            pros: ['Focuses research on public health, not profit', 'Attracts top-tier international scientists'],
            cons: ['Highly expensive up-front budget burden', 'No guarantee of commercial drug viability']
          },
          {
            key: 'research_open_source',
            name: 'Open-Source Patent-Free',
            description: 'Publicly funded medical research must release all patents to the global commons, allowing any factory to copy drugs.',
            effects: [
              { target_type: 'budget_item', target_name: 'Education', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.3 }
            ],
            voterBlocStanding: {
              university_students: 0.14,
              unemployed_precariat: 0.08,
              large_business_executives: -0.16
            },
            pros: ['Allows immediate cheap global generic copying', 'Highest ethical standard of scientific sharing'],
            cons: ['Private venture funding for local biotech collapses', 'Banned by trade treaties of some neighbors']
          }
        ]
      }
    ]
  },
  {
    key: 'social',
    name: 'Social',
    icon: '🤝',
    policies: [
      {
        key: 'pensions',
        name: 'Pensions & Retirement Age',
        description: 'Sets retirement age and funding, directly impacting elderly welfare and state pension liabilities.',
        options: [
          {
            key: 'pension_late_68',
            name: 'Late Retirement (68+, Private)',
            description: 'Raises the pension retirement age to 68 and shifts the system toward private retirement savings accounts.',
            effects: [
              { target_type: 'budget_item', target_name: 'Welfare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.7 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.10,
              pensioners_elderly: -0.22,
              industrial_workers: -0.10,
              union_members: -0.14
            },
            pros: ['Significantly reduces long-term welfare deficits', 'Keeps experienced workers in the labor pool longer'],
            cons: ['Extremely unpopular with elder demographic', 'Physical toll on factory and manual workers']
          },
          {
            key: 'pension_standard_65',
            name: 'Standard Retirement (65)',
            description: 'Maintains the retirement age at 65 with a state-backed pay-as-you-go system funded by social security levies.',
            effects: [],
            voterBlocStanding: {
              pensioners_elderly: 0.04
            },
            pros: ['Stable consensus, standard across most nations', 'Allows predictable retirement planning for families'],
            cons: ['Strained as demographic aging increases', 'Provides only moderate income replacement']
          },
          {
            key: 'pension_early_60',
            name: 'Early Retirement (60, High)',
            description: 'Lowers the retirement age to 60 to free up jobs for youth and ensure retirees enjoy active leisure.',
            effects: [
              { target_type: 'budget_item', target_name: 'Welfare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.35 }
            ],
            voterBlocStanding: {
              pensioners_elderly: 0.18,
              industrial_workers: 0.10,
              union_members: 0.12,
              large_business_executives: -0.10
            },
            pros: ['Highly popular, reduces youth unemployment', 'Improves physical health of older workers'],
            cons: ['Major budgetary pressure on national welfare', 'Reduces available labor force in key industries']
          },
          {
            key: 'pension_universal_basic',
            name: 'Universal Basic Pension',
            description: 'Every senior citizen receives a flat basic retirement income regardless of their work history to end old-age poverty.',
            effects: [
              { target_type: 'budget_item', target_name: 'Welfare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.6 }
            ],
            voterBlocStanding: {
              pensioners_elderly: 0.22,
              unemployed_precariat: 0.12,
              immigrant_communities: 0.10,
              large_business_executives: -0.15
            },
            pros: ['Completely eradicates elderly poverty', 'Simple administration, no means-testing'],
            cons: ['Extremely expensive public budget obligation', 'Can decrease private savings rate incentives']
          }
        ]
      },
      {
        key: 'housing_policy',
        name: 'Housing & Rent Policy',
        description: 'Regulates rental housing and state construction to ensure shelter is affordable.',
        options: [
          {
            key: 'housing_unregulated',
            name: 'Unregulated Rental Market',
            description: 'No rent caps or eviction limits, letting development firms price and build freely to match supply.',
            effects: [
              { target_type: 'sector', target_name: 'Construction', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.02 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.08,
              small_business_owners: 0.04,
              unemployed_precariat: -0.18,
              university_students: -0.14,
              immigrant_communities: -0.10
            },
            pros: ['Spurs high construction output and new apartments', 'Attracts private housing investment capital'],
            cons: ['Causes rapid gentrification and evictions', 'Drives up working-class rent burdens']
          },
          {
            key: 'housing_stabilization',
            name: 'Tenant Protection Act',
            description: 'Enforces rent stabilization capped at inflation and prevents arbitrary evictions for long-term tenants.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.05,
              industrial_workers: 0.04,
              university_students: 0.04
            },
            pros: ['Improves housing stability for families', 'Keeps communities intact, reduces displacement'],
            cons: ['Mild reduction in rental profit margins', 'Increases civil court backlog on disputes']
          },
          {
            key: 'housing_rent_control',
            name: 'Hard Rent Control Caps',
            description: 'Imposes strict price caps per square meter on all rental apartments to roll back housing inflation.',
            effects: [
              { target_type: 'sector', target_name: 'Construction', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.015 }
            ],
            voterBlocStanding: {
              unemployed_precariat: 0.15,
              university_students: 0.14,
              industrial_workers: 0.08,
              large_business_executives: -0.15,
              small_business_owners: -0.06
            },
            pros: ['Drastically lowers cost of living in urban cores', 'Protects lower-income groups from landlord pricing'],
            cons: ['Stops new private rental constructions', 'Can lead to housing shortages and black markets']
          },
          {
            key: 'housing_social',
            name: 'Universal Social Housing',
            description: 'The state builds and runs high-quality public housing complexes, renting them at cost to any citizen.',
            effects: [
              { target_type: 'budget_item', target_name: 'Infrastructure', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.4 },
              { target_type: 'sector', target_name: 'Construction', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.025 }
            ],
            voterBlocStanding: {
              unemployed_precariat: 0.18,
              industrial_workers: 0.12,
              university_students: 0.12,
              large_business_executives: -0.10
            },
            pros: ['Directly expands affordable housing stock', 'Creates construction jobs and limits speculative bubbles'],
            cons: ['Major capital expenditures from the treasury', 'Requires large public management bureaucracy']
          }
        ]
      },
      {
        key: 'childcare',
        name: 'Childcare Support',
        description: 'State support for early childhood care, impacting female labor force participation and birth rates.',
        options: [
          {
            key: 'childcare_private',
            name: 'Private Childcare (No Subsidies)',
            description: 'Childcare is fully private. Parents cover costs out of pocket, with zero state daycare funding.',
            effects: [],
            voterBlocStanding: {
              large_business_executives: 0.04,
              unemployed_precariat: -0.08,
              middle_class_professionals: -0.05
            },
            pros: ['Zero administrative and budget expenses', 'Vibrant market of boutique private daycare options'],
            cons: ['Keeps many mothers out of the active workforce', 'Lowers birth rates due to financial pressure']
          },
          {
            key: 'childcare_vouchers',
            name: 'Means-Tested Daycare Vouchers',
            description: 'Provides daycare subsidies specifically targeted at low-income and working-class families.',
            effects: [
              { target_type: 'budget_item', target_name: 'Welfare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.05 }
            ],
            voterBlocStanding: {
              unemployed_precariat: 0.06,
              industrial_workers: 0.04,
              middle_class_professionals: -0.02
            },
            pros: ['Concentrates budget help where most needed', 'Increases lower-class employment rates'],
            cons: ['Complex means-testing administrative audits', 'Leaves middle-class parents with high fees']
          },
          {
            key: 'childcare_subsidized',
            name: 'Subsidized Public Daycare',
            description: 'The state funds a network of public daycares, capping parental fees at a low nominal daily rate.',
            effects: [
              { target_type: 'budget_item', target_name: 'Welfare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.2 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.08,
              industrial_workers: 0.06,
              urban_knowledge_workers: 0.06
            },
            pros: ['Significantly increases female labor participation', 'Relieves financial strain on young families'],
            cons: ['Requires ongoing budget allocations', 'Shortages in popular metropolitan neighborhoods']
          },
          {
            key: 'childcare_universal',
            name: 'Universal Free Childcare',
            description: 'Provides free public daycare and pre-school from age 1, funded fully by the state as an educational right.',
            effects: [
              { target_type: 'budget_item', target_name: 'Welfare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.35 }
            ],
            voterBlocStanding: {
              urban_knowledge_workers: 0.14,
              middle_class_professionals: 0.12,
              industrial_workers: 0.10,
              large_business_executives: 0.04
            },
            pros: ['Maximizes labor force participation', 'Increases birth rates and childhood socialization'],
            cons: ['Very high administrative and budget cost', 'Requires training thousands of public employees']
          }
        ]
      }
    ]
  },
  {
    key: 'justice',
    name: 'Justice',
    icon: '⚖️',
    policies: [
      {
        key: 'police_funding',
        name: 'Police Funding & Equipment',
        description: 'Sets the budget priority and equipment rules for national law enforcement.',
        options: [
          {
            key: 'police_demilitarized',
            name: 'Demilitarized Community Policing',
            description: 'Refocuses police budget on unarmed street patrols, social mediation training, and community boards.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.85 }
            ],
            voterBlocStanding: {
              university_students: 0.14,
              immigrant_communities: 0.10,
              rural_conservatives: -0.12,
              pensioners_elderly: -0.10
            },
            pros: ['Drastically lowers incidents of police brutality', 'Improves community relations and trust'],
            cons: ['Slower response to armed criminal threats', 'Increases public safety anxiety in elders']
          },
          {
            key: 'police_standard',
            name: 'Standard Municipal Policing',
            description: 'Standard municipal police forces with standard gear, prioritizing patrol coverage and criminal investigation.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04
            },
            pros: ['Familiar standard system, predictable results', 'Maintains general public safety and order'],
            cons: ['Struggles with organized drug syndicates', 'Standard bureaucracy, slower response times']
          },
          {
            key: 'police_specialized',
            name: 'Well-Funded Specialized Units',
            description: 'Invests heavily in cybercrime, anti-terror SWAT teams, and rapid-response tactical units.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.15 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.06,
              pensioners_elderly: 0.06,
              university_students: -0.04
            },
            pros: ['Highly effective against major criminal enterprises', 'Guarantees rapid response during national crises'],
            cons: ['Increases central police budget significantly', 'Neglects everyday community preventative patrol']
          },
          {
            key: 'police_militarized',
            name: 'Militarized Law Enforcement',
            description: 'Equips police forces with military-grade armor, surveillance tools, and armored vehicles to crush riots.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.3 },
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.03 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.10,
              pensioners_elderly: 0.08,
              university_students: -0.18,
              immigrant_communities: -0.15,
              unemployed_precariat: -0.12
            },
            pros: ['Extremely rapid suppression of civic unrest', 'Deterrent against violent urban gangs'],
            cons: ['Drastically increases police brutality risk', 'Alienates young and minority communities']
          }
        ]
      },
      {
        key: 'drug_policy',
        name: 'Drug Policy',
        description: 'Regulations on soft and hard drugs, impacting cartel profits, health, and prison populations.',
        options: [
          {
            key: 'drug_zero_tolerance',
            name: 'Zero Tolerance Criminalization',
            description: 'Enforces harsh prison sentences for possession of any illicit drugs, aiming for a completely drug-free society.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.1 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.12,
              pensioners_elderly: 0.08,
              university_students: -0.15,
              urban_knowledge_workers: -0.06
            },
            pros: ['Clear moral message, discourages experimentation', 'Popular with traditional voter bases'],
            cons: ['Fills prisons with non-violent drug users', 'Funds massive black-market drug cartels']
          },
          {
            key: 'drug_decriminalize',
            name: 'Decriminalization of Soft Drugs',
            description: 'Possession of soft drugs (like cannabis) is treated as a civil infraction rather than a criminal record.',
            effects: [],
            voterBlocStanding: {
              university_students: 0.06,
              middle_class_professionals: 0.02
            },
            pros: ['Reduces police and court backlogs on possession', 'Allows treating drug use as a public health issue'],
            cons: ['Fails to cut off cartel distribution profits', 'Lacks clean legal structure for local dispensaries']
          },
          {
            key: 'drug_legalize_soft',
            name: 'Legalize & Tax Soft Drugs',
            description: 'Legalizes cannabis sales through licensed stores. Imposes sales tax to generate government revenue.',
            effects: [
              { target_type: 'tax', target_name: 'Sales Tax', parameter_name: 'revenue', modifier_type: 'multiplier', modifier_value: 1.05 }
            ],
            voterBlocStanding: {
              university_students: 0.14,
              urban_knowledge_workers: 0.08,
              small_business_owners: 0.05,
              rural_conservatives: -0.10
            },
            pros: ['Eliminates cannabis black market entirely', 'Generates reliable new excise tax revenue'],
            cons: ['Can lead to higher youth consumption rates', 'Strong opposition from religious/elder lobbies']
          },
          {
            key: 'drug_legalize_all',
            name: 'Complete Legalization & Regulation',
            description: 'Legalizes and regulates all drugs. Treats severe addiction purely through public clinics and prescriptions.',
            effects: [
              { target_type: 'budget_item', target_name: 'Healthcare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.1 }
            ],
            voterBlocStanding: {
              university_students: 0.18,
              unemployed_precariat: 0.06,
              rural_conservatives: -0.22,
              pensioners_elderly: -0.18
            },
            pros: ['Destroys underground drug cartels completely', 'Drastically cuts crime associated with acquiring drugs'],
            cons: ['Risk of increased hard drug usage rates', 'Highly controversial internationally']
          }
        ]
      },
      {
        key: 'prisons',
        name: 'Prisons & Rehabilitation',
        description: 'Determines prison focus: punishment and isolation versus retraining and social rehabilitation.',
        options: [
          {
            key: 'prisons_private',
            name: 'Private Punitive Prisons',
            description: 'Contracts detention facilities to private corporations, focusing on containment and punitive labor.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.75 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.06,
              union_members: -0.08,
              university_students: -0.10
            },
            pros: ['Saves substantial state budget resources', 'Enables companies to utilize cheap inmate labor'],
            cons: ['Creates profit incentives to lock up citizens', 'Extremely high criminal recidivism (reoffending) rates']
          },
          {
            key: 'prisons_state_punitive',
            name: 'State Punitive Prisons',
            description: 'State-run prisons that focus on strict punishment, long sentences, and work details to deter crime.',
            effects: [],
            voterBlocStanding: {
              rural_conservatives: 0.06,
              pensioners_elderly: 0.05
            },
            pros: ['Strong deterrence signal to potential criminals', 'Satisfies public demand for justice and punishment'],
            cons: ['Expensive state running costs', 'Does little to retrain inmates for life post-release']
          },
          {
            key: 'prisons_rehab',
            name: 'Rehabilitation-Focused Detention',
            description: 'Refocuses prisons on psychiatric care, therapy, job training, and preparation for re-entering society.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.15 }
            ],
            voterBlocStanding: {
              university_students: 0.12,
              immigrant_communities: 0.06,
              rural_conservatives: -0.08
            },
            pros: ['Drastically lowers reoffending rates long term', 'Helps former convicts get jobs and pay taxes'],
            cons: ['High up-front budget cost for psychologists', 'Can be viewed by critics as too soft on crime']
          },
          {
            key: 'prisons_restorative',
            name: 'Restorative Justice Councils',
            description: 'Shifts non-violent offenses to victim-offender mediation councils, avoiding incarceration entirely.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.9 }
            ],
            voterBlocStanding: {
              university_students: 0.16,
              immigrant_communities: 0.08,
              rural_conservatives: -0.16,
              pensioners_elderly: -0.12
            },
            pros: ['Reduces prison population and court backlogs', 'Focuses on healing communities and compensating victims'],
            cons: ['Inappropriate for violent serial offenders', 'Fails to deter ideological or profit-driven criminals']
          }
        ]
      }
    ]
  },
  {
    key: 'military_security',
    name: 'Military & Security',
    icon: '🪖',
    policies: [
      {
        key: 'conscription',
        name: 'Military Conscription',
        description: 'Mandatory military service draft versus a professional volunteer army model.',
        options: [
          {
            key: 'conscript_volunteer',
            name: 'Professional Volunteer Army',
            description: 'Relies entirely on voluntary enlistment, attracting recruits with competitive salary and tuition help.',
            effects: [
              { target_type: 'budget_item', target_name: 'Defense', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.85 }
            ],
            voterBlocStanding: {
              university_students: 0.14,
              middle_class_professionals: 0.04,
              rural_conservatives: -0.06
            },
            pros: ['Highly trained, specialized professional force', 'Popular with youth who do not wish to draft'],
            cons: ['Struggles to recruit enough personnel in booms', 'Risk of civilian disconnect from the military']
          },
          {
            key: 'conscript_selective',
            name: 'Selective Service Draft',
            description: 'Maintains registries of all eligible youth, triggering a draft lottery only during geopolitical crises.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.03
            },
            pros: ['Maintains crisis scalability at low peace cost', 'Minimal disruption to college/labor markets'],
            cons: ['Requires continuous registration tracking', 'Geopolitical scares cause immediate youth panic']
          },
          {
            key: 'conscript_mandatory_1y',
            name: 'Mandatory 1-Year Conscription',
            description: 'Every 18-year-old citizen must complete one year of military service, building defense readiness and unity.',
            effects: [
              { target_type: 'budget_item', target_name: 'Defense', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.25 },
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.015 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.10,
              pensioners_elderly: 0.08,
              university_students: -0.22,
              urban_knowledge_workers: -0.10
            },
            pros: ['Guarantees a massive pool of reservist soldiers', 'Teaches teamwork and self-discipline to youth'],
            cons: ['Diverts youth from starting work/college', 'High cost to feed, house, and train conscripts']
          },
          {
            key: 'conscript_militia',
            name: 'Universal Citizen Militia',
            description: 'Short initial training, then citizens keep gear at home and undergo annual refresher drills (Swiss model).',
            effects: [
              { target_type: 'budget_item', target_name: 'Defense', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.1 },
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.02 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.12,
              small_business_owners: 0.04,
              university_students: -0.12
            },
            pros: ['Strong deterrent against invasion', 'Highly cost-efficient reserve scale'],
            cons: ['High density of military weapons in households', 'Requires mandatory scheduling absences for drills']
          }
        ]
      },
      {
        key: 'defense_budget',
        name: 'Defense Budget',
        description: 'Priorities for military spending, balancing sovereign security against welfare/education funding.',
        options: [
          {
            key: 'defense_pacifist',
            name: 'Pacifist Minimal Defense',
            description: 'Cuts military spending to the bone (under 0.5% GDP), relying on alliances and diplomacy.',
            effects: [
              { target_type: 'budget_item', target_name: 'Defense', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.3 }
            ],
            voterBlocStanding: {
              university_students: 0.14,
              urban_knowledge_workers: 0.08,
              rural_conservatives: -0.15,
              pensioners_elderly: -0.10
            },
            pros: ['Frees up massive budget for healthcare/welfare', 'Promotes peace image internationally'],
            cons: ['Defenseless in a geopolitical crisis', 'Alienates military personnel and veterans']
          },
          {
            key: 'defense_regional',
            name: 'Regional Security defense',
            description: 'Maintains a defensive focus tailored to securing borders and honoring regional treaties.',
            effects: [
              { target_type: 'budget_item', target_name: 'Defense', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 0.85 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.04
            },
            pros: ['Cost-efficient defense model', 'Avoids regional arms races'],
            cons: ['Struggles to deter global nuclear/superpower threats', 'Less leverage in international trade talks']
          },
          {
            key: 'defense_preparedness',
            name: 'Strong Defensive Preparedness',
            description: 'Funds high-tech anti-air, armor, and artillery grids to make the nation an fortress (2%+ GDP).',
            effects: [
              { target_type: 'budget_item', target_name: 'Defense', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.25 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.08,
              pensioners_elderly: 0.06,
              industrial_workers: 0.04,
              university_students: -0.06
            },
            pros: ['Strong deterrent against expansionist neighbors', 'Spurs local defense manufacturing and tech'],
            cons: ['Drains money from social programs', 'Highly controversial in student boards']
          },
          {
            key: 'defense_power_projection',
            name: 'Global Power Projection',
            description: 'Funds aircraft carriers, overseas bases, and nuclear programs to project power globally.',
            effects: [
              { target_type: 'budget_item', target_name: 'Defense', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.6 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.10,
              large_business_executives: 0.08,
              university_students: -0.22,
              unemployed_precariat: -0.10
            },
            pros: ['Ensures massive geopolitical and trade leverage', 'Fosters high patriotic alignment'],
            cons: ['Extremely expensive, can trigger deficits', 'Causes negative diplomatic reactions from rivals']
          }
        ]
      },
      {
        key: 'border_enforcement',
        name: 'Border Enforcement',
        description: 'Physical controls at the border to monitor immigration and custom duties.',
        options: [
          {
            key: 'border_open',
            name: 'Open Borders (No barriers)',
            description: 'Removes border checks and physical fences, aiming for frictionless flow of people and products.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.015 }
            ],
            voterBlocStanding: {
              immigrant_communities: 0.14,
              university_students: 0.10,
              rural_conservatives: -0.20,
              pensioners_elderly: -0.15
            },
            pros: ['Encourages regional economic integration', 'Simplifies international logistics and tourism'],
            cons: ['Exposes country to illegal trafficking', 'Can lead to unrest among nationalist voters']
          },
          {
            key: 'border_standard',
            name: 'Standard Customs & Patrol',
            description: 'Standard customs checkpoints at airports, ports, and highways, with standard border police patrols.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04
            },
            pros: ['Ensures basic sovereignty, stable security', 'Standard international trade processing'],
            cons: ['Queue times during holiday travel seasons', 'Struggles to control large-scale wilderness crossings']
          },
          {
            key: 'border_wall',
            name: 'High-Tech Border Wall',
            description: 'Builds physical barriers, drone detection grids, and seismic sensors to secure land boundaries.',
            effects: [
              { target_type: 'budget_item', target_name: 'Infrastructure', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.15 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.12,
              pensioners_elderly: 0.08,
              immigrant_communities: -0.12,
              university_students: -0.10
            },
            pros: ['Drastically curtails illegal land border crossings', 'Fosters safety perception in conservative regions'],
            cons: ['Very high capital cost to build and maintain', 'Harmful to local wildlife migration routes']
          },
          {
            key: 'border_militarized',
            name: 'Militarized Border Zones',
            description: 'Deploys army troops, razor wire, and permanent outpost towers along all boundaries.',
            effects: [
              { target_type: 'budget_item', target_name: 'Defense', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.1 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.15,
              pensioners_elderly: 0.10,
              immigrant_communities: -0.18,
              university_students: -0.18
            },
            pros: ['Guarantees absolute control over borders', 'Stops any illegal entry during crises'],
            cons: ['Dampens international tourism and image', 'Expensive continuous military deployment']
          }
        ]
      }
    ]
  },
  {
    key: 'governance',
    name: 'Governance',
    icon: '🏛️',
    policies: [
      {
        key: 'campaign_finance',
        name: 'Campaign Finance Laws',
        description: 'Regulations on how political campaigns are funded, directly impacting party power and corruption.',
        options: [
          {
            key: 'finance_unregulated',
            name: 'Unregulated Private Donations',
            description: 'Allows corporations, unions, and wealthy individuals to donate unlimited amounts to parties.',
            effects: [
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: -0.01 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.10,
              industrial_conglomerates: 0.12,
              university_students: -0.12,
              union_members: -0.08
            },
            pros: ['Allows parties to accumulate huge resources for campaigns', 'Strong support from financial elites'],
            cons: ['Drives public perception of corruption and bribery', 'Allows rich candidates to dominate elections']
          },
          {
            key: 'finance_capped',
            name: 'Capped Private Donations',
            description: 'Imposes strict donation caps per individual per year, requiring full public disclosure.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.05,
              university_students: 0.04
            },
            pros: ['Limits overt buying of political favors', 'Ensures transparency in party funding sources'],
            cons: ['Parties bypass rules via complex advocacy groups', 'Favors established parties with mass members']
          },
          {
            key: 'finance_matching',
            name: 'Matching Public Funds',
            description: 'The state matches small private donations 4-to-1 to amplify the voice of regular citizens.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.05 }
            ],
            voterBlocStanding: {
              university_students: 0.10,
              urban_knowledge_workers: 0.06,
              large_business_executives: -0.04
            },
            pros: ['Encourages parties to seek broad grassroots support', 'Significantly levels the political playing field'],
            cons: ['Allocates public budget to political advertising', 'Minor fringe parties get public subsidies']
          },
          {
            key: 'finance_state_only',
            name: 'Strict State-Only Funding',
            description: 'Bans all private political donations. The state funds campaigns based on past seat ratios.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.1 }
            ],
            voterBlocStanding: {
              university_students: 0.16,
              middle_class_professionals: 0.08,
              large_business_executives: -0.12,
              industrial_conglomerates: -0.12
            },
            pros: ['Completely breaks connection between wealth and power', 'Fosters high public trust in elections'],
            cons: ['Saves existing party seat structures from challengers', 'Restricts personal freedom of political expression']
          }
        ]
      },
      {
        key: 'corruption_transparency',
        name: 'Corruption & Transparency',
        description: 'Rules regarding government audits, lobby registrations, and prosecution of public bribery.',
        options: [
          {
            key: 'corp_discretionary',
            name: 'Discretionary Operations',
            description: 'Limits government transparency to protect national security and speed up administrative contracts.',
            effects: [
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: -0.015 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.05,
              middle_class_professionals: -0.10,
              university_students: -0.12
            },
            pros: ['Allows extremely rapid state infrastructure procurement', 'Protects intelligence services from prying'],
            cons: ['Substantially increases bureaucratic corruption risk', 'Decays public trust in government institutions']
          },
          {
            key: 'corp_standard_foia',
            name: 'Standard FOIA Laws',
            description: 'Enacts standard Freedom of Information processes and basic registers for corporate lobbyists.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04
            },
            pros: ['Enables journalists to audit basic state budgets', 'Balances security with public oversight'],
            cons: ['FOIA requests can take months of red tape', 'Lobbyists easily bypass loose registration checks']
          },
          {
            key: 'corp_public_registry',
            name: 'Public Assets & Lobby Registry',
            description: 'Mandates that all politicians publish asset portfolios annually and bans all closed-door lobby meetings.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.08,
              university_students: 0.08,
              large_business_executives: -0.05
            },
            pros: ['Allows immediate public auditing of politician wealth', 'Impedes corporate backroom bribe negotiations'],
            cons: ['Increases administrative tracking requirements', 'Some complain of privacy overreach for public workers']
          },
          {
            key: 'corp_independent_prosecutor',
            name: 'Independent Anticorruption Bureau',
            description: 'Creates a fully independent state prosecutor with unilateral powers to tap, investigate, and arrest corrupt officials.',
            effects: [
              { target_type: 'budget_item', target_name: 'Administration', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.05 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.12,
              university_students: 0.12,
              unemployed_precariat: 0.08,
              large_business_executives: -0.04
            },
            pros: ['Drastically cleans up municipal and federal corruption', 'Highest degree of public trust and rule of law'],
            cons: ['Can be weaponized politically if bureau loses oversight', 'Requires permanent high-integrity staff budgets']
          }
        ]
      },
      {
        key: 'voting_system',
        name: 'Voting & Representation',
        description: 'The electoral mechanics of parliament, determining party representation and coalition dynamics.',
        options: [
          {
            key: 'vote_fptp',
            name: 'First-Past-The-Post (FPTP)',
            description: 'Single-member districts where the candidate with the most votes wins. Favors a stable two-party system.',
            effects: [
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.02 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.06,
              university_students: -0.08,
              immigrant_communities: -0.06
            },
            pros: ['Produces strong, stable single-party governments', 'Clear accountability for local district MPs'],
            cons: ['Disproportionate seat results vs actual vote totals', 'Effectively shuts out smaller or green parties']
          },
          {
            key: 'vote_ranked',
            name: 'Ranked-Choice Voting',
            description: 'Voters rank candidates. Prevents spoiler candidates and encourages moderate, consensus campaigning.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.06,
              urban_knowledge_workers: 0.06
            },
            pros: ['Ensures winning candidates have majority support', 'Allows voting for small parties without wasting vote'],
            cons: ['Significantly slower vote tally processes', 'Can confuse older or less educated voters']
          },
          {
            key: 'vote_prop',
            name: 'Proportional Representation',
            description: 'Seats are allocated purely based on national popular vote, producing a diverse multi-party coalition parliament.',
            effects: [],
            voterBlocStanding: {
              university_students: 0.08,
              union_members: 0.06,
              immigrant_communities: 0.06
            },
            pros: ['Most democratic representation of national support', 'Ensures minor and specialized issues get seats'],
            cons: ['Frequent coalition disputes and election stalemates', 'Empowers radical or single-issue factions']
          },
          {
            key: 'vote_direct',
            name: 'Direct Citizen Assemblies',
            description: 'Integrates citizen assemblies selected by lot (sortition) to vote on constitutional legislation.',
            effects: [
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.02 }
            ],
            voterBlocStanding: {
              university_students: 0.14,
              unemployed_precariat: 0.08,
              large_business_executives: -0.10,
              middle_class_professionals: -0.04
            },
            pros: ['Pure democratic participation, stops lobbyist control', 'Bypasses party political deadlock'],
            cons: ['Ordinary citizens can lack technical expertise', 'Slow, expensive logistical assembly setups']
          }
        ]
      }
    ]
  },
  {
    key: 'immigration',
    name: 'Immigration',
    icon: '🛂',
    policies: [
      {
        key: 'work_visas',
        name: 'Work Visas & Immigration',
        description: 'Controls on foreign workers, affecting labor supply, wages, and cultural demographics.',
        options: [
          {
            key: 'visa_restrictive',
            name: 'Highly Restrictive Borders',
            description: 'Bans low-skilled immigration and freezes work visas, aiming to protect domestic wage growth.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.01 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.14,
              pensioners_elderly: 0.10,
              industrial_workers: 0.08,
              large_business_executives: -0.12,
              immigrant_communities: -0.14
            },
            pros: ['Shields domestic entry-level wages from competition', 'High social cohesion in traditional communities'],
            cons: ['Severe labor shortages in agriculture and nursing', 'Slows service sector growth and expansion'],
            voterBlocWeightModifiers: { immigrant_communities: -0.05 }
          },
          {
            key: 'visa_points',
            name: 'Points-Based Skilled System',
            description: 'Accepts immigrants based on age, education, and language, prioritizing high-tech and scientific sectors.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 1.03 }
            ],
            voterBlocStanding: {
              middle_class_professionals: 0.05,
              large_business_executives: 0.06,
              rural_conservatives: -0.02
            },
            pros: ['Attracts skilled engineers, doctors, and builders', 'Minimal drag on social services budgets'],
            cons: ['Excludes manual agricultural workers', 'High processing administration costs']
          },
          {
            key: 'visa_open',
            name: 'Open Labor Visas',
            description: 'Issues labor visas freely based on corporate demand, filling gaps in manufacturing, hospitality, and agriculture.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.015 },
              { target_type: 'sector', target_name: 'Agriculture', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.01 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.10,
              immigrant_communities: 0.08,
              industrial_workers: -0.05,
              rural_conservatives: -0.10
            },
            pros: ['Solves labor shortage in manual sectors', 'Drives overall business expansion speeds'],
            cons: ['Can suppress lower-class wage growth', 'Puts high demand pressure on public transit/housing'],
            voterBlocWeightModifiers: { immigrant_communities: 0.05 }
          },
          {
            key: 'visa_freedom',
            name: 'Freedom of Movement Agreement',
            description: 'Full integration with regional trade block, allowing any regional citizen to live and work without visa.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.02 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.12,
              urban_knowledge_workers: 0.08,
              immigrant_communities: 0.10,
              rural_conservatives: -0.16,
              industrial_workers: -0.06
            },
            pros: ['Access to massive international talent pool', 'Boosts trade integration and tourism'],
            cons: ['No sovereign control over net immigration', 'High pressure on urban rental markets'],
            voterBlocWeightModifiers: { immigrant_communities: 0.08 }
          }
        ]
      },
      {
        key: 'citizenship_path',
        name: 'Citizenship Pathway',
        description: 'Rules for naturalization, determining whether immigrants can vote and integrate.',
        options: [
          {
            key: 'citizen_assimilationist',
            name: 'Assimilationist (10-Year, Strict)',
            description: 'Requires 10 years of continuous residency, strict language tests, and renouncing dual citizenship.',
            effects: [],
            voterBlocStanding: {
              rural_conservatives: 0.12,
              pensioners_elderly: 0.08,
              immigrant_communities: -0.15,
              university_students: -0.08
            },
            pros: ['Ensures deep cultural integration prior to voting', 'Highly popular with conservative voters'],
            cons: ['Leaves long-term tax-paying residents without vote', 'Discourages high-skilled immigrants from settling']
          },
          {
            key: 'citizen_standard',
            name: 'Standard Civic (5-Year)',
            description: 'Standard 5-year residency requirement with basic civic and language knowledge. Dual citizenship allowed.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04
            },
            pros: ['Predictable civic standard, moderate integration', 'Fair balance between residency and rights'],
            cons: ['Stuck in administrative processing delays', 'Does not address undocumented residents']
          },
          {
            key: 'citizen_multicultural',
            name: 'Multicultural Path (3-Year)',
            description: 'Shortens residency to 3 years and provides extensive multilingual integration courses to aid speed.',
            effects: [],
            voterBlocStanding: {
              immigrant_communities: 0.12,
              university_students: 0.06,
              rural_conservatives: -0.08
            },
            pros: ['Accelerates integration into civic life and voting', 'Highly welcoming to foreign talent'],
            cons: ['Can cause pushback from traditional groups', 'High integration course funding demands']
          },
          {
            key: 'citizen_jus_soli',
            name: 'Universal Birthright (Jus Soli)',
            description: 'Grants automatic citizenship to any child born on national territory, regardless of parent status.',
            effects: [],
            voterBlocStanding: {
              immigrant_communities: 0.16,
              university_students: 0.10,
              rural_conservatives: -0.15,
              pensioners_elderly: -0.10
            },
            pros: ['Protects children of immigrants from statelessness', 'Fosters early patriotic civic attachment'],
            cons: ['Highly controversial with border-control lobbies', 'Can encourage birth tourism arrivals']
          }
        ]
      },
      {
        key: 'refugee_policy',
        name: 'Refugee & Asylum Policy',
        description: 'How the nation handles refugees seeking asylum from conflicts or climate crises.',
        options: [
          {
            key: 'refugee_ban',
            name: 'Complete Asylum Ban',
            description: 'Bans accepting asylum seekers, immediately deporting border crossings to safe third countries.',
            effects: [],
            voterBlocStanding: {
              rural_conservatives: 0.16,
              pensioners_elderly: 0.12,
              immigrant_communities: -0.18,
              university_students: -0.18
            },
            pros: ['Eliminates public refugee integration expenses', 'Guarantees zero security risks from unvetted crossings'],
            cons: ['Severe violation of international human rights law', 'Drives major diplomatic boycotts from allies']
          },
          {
            key: 'refugee_quota',
            name: 'Strict Annual Quotas',
            description: 'Accepts a capped, modest number of vetted refugees annually through official resettlement programs.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.05,
              rural_conservatives: 0.02
            },
            pros: ['Predictable cost control for welfare', 'Ensures thorough background vet processing'],
            cons: ['Inflexible during sudden foreign emergencies', 'Dissatisfies humanitarian activist groups']
          },
          {
            key: 'refugee_safe_havens',
            name: 'Humanitarian Safe Havens',
            description: 'Accepts refugees temporarily during crises, providing shelter and work permits but no automatic residency.',
            effects: [
              { target_type: 'budget_item', target_name: 'Welfare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.1 }
            ],
            voterBlocStanding: {
              immigrant_communities: 0.08,
              university_students: 0.06,
              rural_conservatives: -0.06
            },
            pros: ['Meets moral humanitarian obligations', 'Provides temporary labor for low-margin service work'],
            cons: ['Requires substantial temporary housing budgets', 'Uncertainty for families if conflicts persist']
          },
          {
            key: 'refugee_open_door',
            name: 'Open Door Asylum Policy',
            description: 'Welcomes asylum seekers, providing immediate housing, language training, and full work authorization.',
            effects: [
              { target_type: 'budget_item', target_name: 'Welfare', parameter_name: 'allocation', modifier_type: 'multiplier', modifier_value: 1.35 }
            ],
            voterBlocStanding: {
              immigrant_communities: 0.15,
              university_students: 0.15,
              rural_conservatives: -0.22,
              pensioners_elderly: -0.16
            },
            pros: ['Saves lives, high international moral stature', 'Quick integration of younger demographics into labor force'],
            cons: ['Massive strain on municipal welfare budgets', 'Triggers severe political polarization']
          }
        ]
      }
    ]
  },
  {
    key: 'foundational',
    name: 'Foundational',
    icon: '📜',
    policies: [
      {
        key: 'state_ideology',
        name: 'State Ideology',
        description: 'The core constitutional philosophy of the nation. Shapes long-term politics and political stability.',
        options: [
          {
            key: 'const_monarchy',
            name: 'Constitutional Monarchy',
            description: 'Retains a traditional monarch as a unifying, apolitical head of state, with a prime minister running government.',
            effects: [
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.03 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.10,
              pensioners_elderly: 0.08,
              university_students: -0.08,
              union_members: -0.04
            },
            pros: ['High institutional stability, traditional continuity', 'Acts as a check against radical populism'],
            cons: ['Perpetuates non-democratic hereditary privilege', 'Monarch maintenance budgets draw minor public criticism']
          },
          {
            key: 'const_republic',
            name: 'Liberal Representative Democracy',
            description: 'Constitutional republic with separated powers, protecting individual liberties and free market systems.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.06,
              small_business_owners: 0.04,
              large_business_executives: 0.04
            },
            pros: ['Guarantees broad personal rights and free speech', 'Enables predictable changes of administration'],
            cons: ['Susceptible to gridlock and media polarization', 'Can favor corporate lobbies over direct voters']
          },
          {
            key: 'const_direct',
            name: 'Direct Democracy Charter',
            description: 'Enacts binding national citizen initiatives for major laws, ensuring the public is the final sovereign.',
            effects: [
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.02 }
            ],
            voterBlocStanding: {
              university_students: 0.12,
              unemployed_precariat: 0.08,
              large_business_executives: -0.08,
              middle_class_professionals: -0.02
            },
            pros: ['Highest degree of democratic legitimacy', 'Weakens backroom corporate lobbying networks'],
            cons: ['Slows long-term legislative decision speeds', 'Complex issues boiled down to yes/no campaigns']
          },
          {
            key: 'const_socialist',
            name: 'Socialist Workers\' Republic',
            description: 'Declares the state represents the working class, prioritizing public ownership and economic planning.',
            effects: [
              { target_type: 'sector', target_name: 'Industry', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.02 },
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: -0.015 }
            ],
            voterBlocStanding: {
              union_members: 0.20,
              industrial_workers: 0.15,
              unemployed_precariat: 0.12,
              large_business_executives: -0.35,
              small_business_owners: -0.20,
              middle_class_professionals: -0.08
            },
            pros: ['Eliminates corporate dominance over society', 'Guarantees jobs and shelter for all classes'],
            cons: ['Triggers heavy international trade boycotts', 'Incentives for private venture capital disappear']
          }
        ]
      },
      {
        key: 'property_rights',
        name: 'Property Ownership Rights',
        description: 'Defines the legal rights to own land, real estate, natural resources, and corporations.',
        options: [
          {
            key: 'prop_unrestricted',
            name: 'Unrestricted Capitalism',
            description: 'Absolute property protections. Natural resources, land, and companies can be privately owned with zero restrictions.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'growth', modifier_type: 'additive', modifier_value: 0.01 }
            ],
            voterBlocStanding: {
              large_business_executives: 0.15,
              industrial_conglomerates: 0.15,
              small_business_owners: 0.08,
              union_members: -0.14,
              unemployed_precariat: -0.10
            },
            pros: ['Strongest possible protection for foreign investments', 'Incentivizes private venture capital creation'],
            cons: ['Can lead to monopolistic control over land/resources', 'Restricts state recovery of public goods']
          },
          {
            key: 'prop_regulated',
            name: 'Regulated Private Property',
            description: 'Protects private property, but allows state eminent domain for infrastructure projects with fair compensation.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.05,
              small_business_owners: 0.04
            },
            pros: ['Balances individual security with public construction', 'Clear legal arbitration standards'],
            cons: ['Arbitration processes can delay infrastructure by years', 'Frictions when value assessments are contested']
          },
          {
            key: 'prop_land_tax',
            name: 'Land Value Taxation (Georgism)',
            description: 'Individuals can own buildings, but the underlying land value is taxed at 100% to fund society and prevent land speculation.',
            effects: [
              { target_type: 'tax', target_name: 'Property Tax', parameter_name: 'revenue', modifier_type: 'multiplier', modifier_value: 2.2 }
            ],
            voterBlocStanding: {
              university_students: 0.12,
              unemployed_precariat: 0.08,
              rural_conservatives: -0.10,
              large_business_executives: -0.12,
              small_business_owners: -0.05
            },
            pros: ['Eradicates land speculation, lowers housing cost', 'Generates massive public revenue without taxing labor'],
            cons: ['Triggers drop in commercial property assets', 'Opposition from rural and wealthy landowners']
          },
          {
            key: 'prop_socialized',
            name: 'Socialized/Cooperative Ownership',
            description: 'Bans private ownership of large companies and natural resources, transferring them to worker cooperatives.',
            effects: [
              { target_type: 'sector', target_name: 'Services', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: 0.95 }
            ],
            voterBlocStanding: {
              union_members: 0.18,
              industrial_workers: 0.12,
              large_business_executives: -0.30,
              small_business_owners: -0.15
            },
            pros: ['Workers directly share in firm profits', 'Stops outsourcing of jobs to low-wage countries'],
            cons: ['Stops private venture capital growth', 'Chafes with international commercial partners']
          }
        ]
      },
      {
        key: 'press_freedom',
        name: 'Press & Information Freedom',
        description: 'Sets rules on media licensing and state broadcasting, directly impacting media sentiment and public mood.',
        options: [
          {
            key: 'press_state',
            name: 'State-Controlled Media',
            description: 'Requires state licenses for all press outlets, with government censorship on sensitive topics.',
            effects: [
              { target_type: 'nation', target_name: 'stability', parameter_name: 'stability', modifier_type: 'additive', modifier_value: 0.015 }
            ],
            voterBlocStanding: {
              rural_conservatives: 0.05,
              urban_knowledge_workers: -0.18,
              university_students: -0.22,
              middle_class_professionals: -0.10
            },
            pros: ['Eliminates misinformation campaigns during crises', 'Ensures high narrative alignment with gov policy'],
            cons: ['Destroys press freedom and international reputation', 'High risk of public resentment bubbling underground']
          },
          {
            key: 'press_regulated_public',
            name: 'Regulated Public Broadcasting',
            description: 'Ensures standard press freedom alongside a state-funded public broadcaster that is managed by parliament.',
            effects: [],
            voterBlocStanding: {
              middle_class_professionals: 0.04
            },
            pros: ['Provides reliable non-commercial local news', 'Maintains general press freedom standards'],
            cons: ['Broadcaster budget subject to political fights', 'Can suffer from minor governing-party bias']
          },
          {
            key: 'press_independent_board',
            name: 'Independent Board Broadcasting',
            description: 'The public broadcaster is managed by an independent trust of academics and unions, free of government control.',
            effects: [],
            voterBlocStanding: {
              urban_knowledge_workers: 0.06,
              university_students: 0.06,
              middle_class_professionals: 0.04
            },
            pros: ['Extremely objective news, high media trust', 'Insulated from direct ruling coalition pressure'],
            cons: ['Lacks direct voter accountability on budget', 'Can alienate conservative rural demographics']
          },
          {
            key: 'press_free_market',
            name: 'Complete Free Market Press',
            description: 'Abolishes public broadcasting, letting commercial networks and digital channels compete with zero regulations.',
            effects: [],
            voterBlocStanding: {
              small_business_owners: 0.08,
              large_business_executives: 0.06,
              pensioners_elderly: -0.06,
              middle_class_professionals: -0.04
            },
            pros: ['Zero state funds spent on media creation', 'Vibrant range of commercial and digital platforms'],
            cons: ['Vulnerable to corporate lobby bias and fake news', 'Polarization decays general civic discourse']
          }
        ]
      }
    ]
  }
];
