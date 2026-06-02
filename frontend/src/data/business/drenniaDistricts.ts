// ─── WORLDr Drennia Business Districts Data Model ──────────────────────────────
// This represents the new business-first hierarchy:
// State -> District -> Place -> BusinessAction

export type BusinessResultType = 'filing' | 'company' | 'contract' | 'finance' | 'registry';
export type BusinessVisibility = 'public' | 'private';

export interface BusinessAction {
  id: string;
  placeId: string;
  name: string;
  description: string;
  requirements: string[];
  costLabel: string;
  visibility: BusinessVisibility;
  resultType: BusinessResultType;
  effects: Record<string, any>;
}

export interface Place {
  id: string;
  districtId: string;
  name: string;
  type: string;
  description: string;
  actions: BusinessAction[];
}

export interface District {
  id: string;
  stateId: string;
  name: string;
  description: string;
  function: string;
  places: Place[];
}

export interface State {
  id: string;
  name: string;
  description: string;
  businessFocus: string;
  districts: District[];
}

export const DRENNIA_STATES: State[] = [
  {
    id: 'Drennport State',
    name: 'Drennport State',
    description: 'The capital of commerce, law, and national finance.',
    businessFocus: 'Administration & Finance',
    districts: [
      {
        id: 'drennport-admin-block',
        stateId: 'Drennport State',
        name: 'Administration Block',
        description: 'Government counters, registry desks, tax offices, licensing windows, and public records halls.',
        function: 'Registry and Legal',
        places: [
          {
            id: 'drennport-company-registry',
            districtId: 'drennport-admin-block',
            name: 'Company Registry Office',
            type: 'Government Office',
            description: 'Where companies are born and public records are filed.',
            actions: [
              {
                id: 'check-registration-reqs',
                placeId: 'drennport-company-registry',
                name: 'Check Registration Requirements',
                description: 'Understand the costs and requirements to form a legal company in Drennia.',
                requirements: [],
                costLabel: 'Free',
                visibility: 'private',
                resultType: 'registry',
                effects: { type: 'view_requirements' }
              },
              {
                id: 'reserve-company-name',
                placeId: 'drennport-company-registry',
                name: 'Reserve Company Name',
                description: 'File paperwork to lock a business name for your future use.',
                requirements: ['Cash >= ₯10'],
                costLabel: '₯10',
                visibility: 'private',
                resultType: 'registry',
                effects: { type: 'reserve_name', cost: 10 }
              },
              {
                id: 'register-sole-trader',
                placeId: 'drennport-company-registry',
                name: 'Register Sole Trader',
                description: 'Incorporate a new Sole Trader company and enter the public registry.',
                requirements: ['Reserved Name', 'Cash >= ₯525'],
                costLabel: '₯525 (₯25 fee + ₯500 capital)',
                visibility: 'public',
                resultType: 'company',
                effects: { type: 'register_company', cost: 525, capital: 500 }
              },
              {
                id: 'view-public-registry',
                placeId: 'drennport-company-registry',
                name: 'View Public Company Registry',
                description: 'Access the official ledger of registered companies operating in Drennia.',
                requirements: [],
                costLabel: 'Free',
                visibility: 'private',
                resultType: 'registry',
                effects: { type: 'view_registry' }
              }
            ]
          },
          {
            id: 'drennport-tax-revenue',
            districtId: 'drennport-admin-block',
            name: 'Tax & Revenue Office',
            type: 'Government Office',
            description: 'Where quarterly filings are made and audits are endured.',
            actions: []
          },
          {
            id: 'drennport-licensing',
            districtId: 'drennport-admin-block',
            name: 'Licensing Counter',
            type: 'Government Office',
            description: 'Permits for trade, import/export, and industrial works.',
            actions: []
          },
          {
            id: 'drennport-public-records',
            districtId: 'drennport-admin-block',
            name: 'Public Records Hall',
            type: 'Government Office',
            description: 'Archives of old filings, contracts, and judgements.',
            actions: []
          },
          {
            id: 'drennport-procurement-board',
            districtId: 'drennport-admin-block',
            name: 'Procurement Notice Board',
            type: 'Marketplace',
            description: 'State and large corporate tenders posted for public bidding.',
            actions: []
          }
        ]
      },
      {
        id: 'drennport-finance-district',
        stateId: 'Drennport State',
        name: 'Finance District',
        description: 'Banks, accountants, insurers, merchant lenders, and conservative investors.',
        function: 'Banking & Investment',
        places: [
          {
            id: 'drennport-commercial-bank',
            districtId: 'drennport-finance-district',
            name: 'Drennport Commercial Bank',
            type: 'Bank',
            description: 'The primary financial institution for business capital and loans.',
            actions: []
          },
          {
            id: 'merchant-credit-office',
            districtId: 'drennport-finance-district',
            name: 'Merchant Credit Office',
            type: 'Financial Services',
            description: 'Short-term ledger financing for active trade.',
            actions: []
          },
          {
            id: 'insurance-house',
            districtId: 'drennport-finance-district',
            name: 'Insurance House',
            type: 'Financial Services',
            description: 'Risk mitigation for shipping and industrial operations.',
            actions: []
          },
          {
            id: 'accountants-row',
            districtId: 'drennport-finance-district',
            name: 'Accountants’ Row',
            type: 'Professional Services',
            description: 'Clerks for hire to keep your books in order.',
            actions: []
          }
        ]
      },
      {
        id: 'drennport-commercial-district',
        stateId: 'Drennport State',
        name: 'Commercial District',
        description: 'Retail streets, small service offices, suppliers, and local demand.',
        function: 'Retail & Commerce',
        places: [
          {
            id: 'small-shop-market',
            districtId: 'drennport-commercial-district',
            name: 'Small Shop Market',
            type: 'Marketplace',
            description: 'Daily commerce and consumer goods.',
            actions: []
          },
          {
            id: 'wholesale-counter',
            districtId: 'drennport-commercial-district',
            name: 'Wholesale Counter',
            type: 'Marketplace',
            description: 'Bulk goods and trade supply.',
            actions: []
          },
          {
            id: 'service-street',
            districtId: 'drennport-commercial-district',
            name: 'Service Street',
            type: 'Professional Services',
            description: 'Independent operators, fixers, and middle-men.',
            actions: []
          },
          {
            id: 'local-advertising-board',
            districtId: 'drennport-commercial-district',
            name: 'Local Advertising Board',
            type: 'Marketplace',
            description: 'Where small contracts and services are posted.',
            actions: []
          }
        ]
      },
      {
        id: 'drennport-industrial-estate',
        stateId: 'Drennport State',
        name: 'Industrial Estate',
        description: 'Small workshops, equipment yards, material depots, and labour hiring gates.',
        function: 'Manufacturing & Labor',
        places: [
          {
            id: 'workshop-lots',
            districtId: 'drennport-industrial-estate',
            name: 'Workshop Lots',
            type: 'Industrial',
            description: 'Leasable space for small manufacturing.',
            actions: []
          },
          {
            id: 'equipment-yard',
            districtId: 'drennport-industrial-estate',
            name: 'Equipment Yard',
            type: 'Industrial',
            description: 'Heavy machinery storage and sales.',
            actions: []
          },
          {
            id: 'materials-depot',
            districtId: 'drennport-industrial-estate',
            name: 'Materials Depot',
            type: 'Industrial',
            description: 'Raw materials for production.',
            actions: []
          },
          {
            id: 'labour-hiring-gate',
            districtId: 'drennport-industrial-estate',
            name: 'Labour Hiring Gate',
            type: 'Industrial',
            description: 'Where daily workers gather for shifts.',
            actions: []
          }
        ]
      },
      {
        id: 'drennport-residential-district',
        stateId: 'Drennport State',
        name: 'Residential District',
        description: 'Housing, local workers, consumer demand, and ordinary citizen life.',
        function: 'Housing & Living',
        places: [
          {
            id: 'housing-board',
            districtId: 'drennport-residential-district',
            name: 'Housing Board',
            type: 'Residential',
            description: 'Listings for apartments and properties.',
            actions: []
          },
          {
            id: 'local-market',
            districtId: 'drennport-residential-district',
            name: 'Local Market',
            type: 'Marketplace',
            description: 'Neighborhood commerce.',
            actions: []
          },
          {
            id: 'worker-neighbourhood',
            districtId: 'drennport-residential-district',
            name: 'Worker Neighbourhood',
            type: 'Residential',
            description: 'Where the labor force lives.',
            actions: []
          },
          {
            id: 'community-notice-wall',
            districtId: 'drennport-residential-district',
            name: 'Community Notice Wall',
            type: 'Marketplace',
            description: 'Local news and small tasks.',
            actions: []
          }
        ]
      }
    ]
  },
  {
    id: 'Westport State',
    name: 'Westport State',
    description: 'The pulsing heart of maritime shipping, trade, and logistics.',
    businessFocus: 'Shipping & Logistics',
    districts: [
      {
        id: 'westport-port-district',
        stateId: 'Westport State',
        name: 'Port District',
        description: 'Docks, stevedores, and immediate vessel loading.',
        function: 'Maritime Operations',
        places: []
      },
      {
        id: 'westport-trade-quarter',
        stateId: 'Westport State',
        name: 'Trade Quarter',
        description: 'Brokers, shipping agents, and import-export offices.',
        function: 'Trade & Dealing',
        places: []
      },
      {
        id: 'westport-warehouse-belt',
        stateId: 'Westport State',
        name: 'Warehouse Belt',
        description: 'Massive storage facilities for passing cargo.',
        function: 'Storage & Logistics',
        places: []
      },
      {
        id: 'westport-merchant-street',
        stateId: 'Westport State',
        name: 'Merchant Street',
        description: 'The high-end side of the port, dealing in luxury goods.',
        function: 'Retail & Commerce',
        places: []
      },
      {
        id: 'westport-bourse-locked',
        stateId: 'Westport State',
        name: 'Westport Bourse (Locked)',
        description: 'The national exchange for commodities and major equity. Closed to small traders.',
        function: 'High Finance',
        places: []
      }
    ]
  },
  {
    id: 'Ironvale State',
    name: 'Ironvale State',
    description: 'The industrial furnace where raw materials become goods.',
    businessFocus: 'Manufacturing',
    districts: [
      {
        id: 'ironvale-factory-belt',
        stateId: 'Ironvale State',
        name: 'Factory Belt',
        description: 'Heavy industry, mass production, and smokestacks.',
        function: 'Heavy Manufacturing',
        places: []
      },
      {
        id: 'ironvale-union-quarter',
        stateId: 'Ironvale State',
        name: 'Union Quarter',
        description: 'Organized labor halls and worker administration.',
        function: 'Labor Organization',
        places: []
      },
      {
        id: 'ironvale-materials-yard',
        stateId: 'Ironvale State',
        name: 'Materials Yard',
        description: 'Where coal, steel, and stone are bought and sold.',
        function: 'Raw Materials',
        places: []
      },
      {
        id: 'ironvale-rail-depot',
        stateId: 'Ironvale State',
        name: 'Rail Freight Depot',
        description: 'The inland alternative to Westport shipping.',
        function: 'Logistics',
        places: []
      },
      {
        id: 'ironvale-licensing',
        stateId: 'Ironvale State',
        name: 'Industrial Licensing Office',
        description: 'Permits for heavy machinery and hazardous operations.',
        function: 'Government Administration',
        places: []
      }
    ]
  },
  {
    id: 'Greenmere State',
    name: 'Greenmere State',
    description: 'The agricultural backbone, supplying the nation with food.',
    businessFocus: 'Agriculture & Food',
    districts: [
      {
        id: 'greenmere-market-square',
        stateId: 'Greenmere State',
        name: 'Market Square',
        description: 'Where local produce meets commercial buyers.',
        function: 'Agricultural Commerce',
        places: []
      },
      {
        id: 'greenmere-farm-belt',
        stateId: 'Greenmere State',
        name: 'Farm Belt',
        description: 'Massive agricultural operations and land holdings.',
        function: 'Farming',
        places: []
      },
      {
        id: 'greenmere-coop-hall',
        stateId: 'Greenmere State',
        name: 'Co-op Hall',
        description: 'Where farmers collectively bargain and sell.',
        function: 'Collective Bargaining',
        places: []
      },
      {
        id: 'greenmere-land-office',
        stateId: 'Greenmere State',
        name: 'Land Office',
        description: 'Deeds, agricultural grants, and zoning disputes.',
        function: 'Government Administration',
        places: []
      },
      {
        id: 'greenmere-harvest-depot',
        stateId: 'Greenmere State',
        name: 'Harvest Depot',
        description: 'Storage for grain and perishables before shipping.',
        function: 'Storage & Logistics',
        places: []
      }
    ]
  }
];

export function getDistrictsForState(stateId: string): District[] {
  return DRENNIA_STATES.find(s => s.id === stateId)?.districts || [];
}

export function getStateById(stateId: string): State | undefined {
  return DRENNIA_STATES.find(s => s.id === stateId);
}
