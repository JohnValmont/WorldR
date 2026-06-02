import { type DrenniaState } from './drenniaPowerRooms';

export interface Point {
  x: number;
  y: number;
}

export interface StateRegionData {
  id: DrenniaState;
  path: string;
  center: Point;
  fillColor: string;
  hoverColor: string;
}

// Map uses a 1000x800 viewBox for coordinate reference.
export const MAP_VIEWBOX = '0 0 1000 800';

// Stylized placeholder paths for the 4 states of Drennia.
// These combine to form the Drennia country shape (wide, coastline on East/South).
export const DRENNIA_STATE_REGIONS: StateRegionData[] = [
  {
    id: 'Ironvale State',
    // Northwest, industrial, connected to Greyhaven area.
    path: 'M 100 100 L 400 100 L 450 350 L 250 450 L 50 300 Z',
    center: { x: 250, y: 250 },
    fillColor: '#2b2a27', // Muted industrial amber/grey
    hoverColor: '#3a3834'
  },
  {
    id: 'Drennport State',
    // East coast, capital.
    path: 'M 400 100 L 900 150 L 950 500 L 600 600 L 450 350 Z',
    center: { x: 650, y: 350 },
    fillColor: '#1d2f2f', // Blue-green civic tone
    hoverColor: '#253b3b'
  },
  {
    id: 'Westport State',
    // West/Southwest, trade ports.
    path: 'M 50 300 L 250 450 L 300 700 L 100 750 Z',
    center: { x: 180, y: 550 },
    fillColor: '#19332d', // Teal/business green
    hoverColor: '#204038'
  },
  {
    id: 'Greenmere State',
    // South/Southeast, rural.
    path: 'M 250 450 L 600 600 L 800 750 L 300 700 Z',
    center: { x: 500, y: 600 },
    fillColor: '#162e1a', // Deep green
    hoverColor: '#1e3d23'
  }
];

export const CITY_MARKERS = [
  {
    id: 'drennport',
    name: 'Drennport',
    x: 800,
    y: 350,
    isCapital: true
  },
  {
    id: 'greyhaven',
    name: 'Greyhaven',
    x: 150,
    y: 150,
    isCapital: false
  }
];

// Map power rooms to coordinates based on their state.
export const ROOM_PIN_LOCATIONS: Record<string, Point> = {
  // Drennport
  'drennport-youth-debate': { x: 750, y: 300 },
  'civic-order-local-meeting': { x: 600, y: 250 },
  'temporary-clerk-contract': { x: 850, y: 400 },
  'drennport-exchange-reading-room': { x: 700, y: 450 },

  // Ironvale
  'workers-renewal-forum': { x: 200, y: 200 },
  'factory-shift-interview': { x: 300, y: 300 },

  // Greenmere
  'greenmere-water-dispute': { x: 450, y: 650 },
  'rural-service-drive': { x: 650, y: 680 },

  // Westport
  'westport-business-circle': { x: 150, y: 650 },
  'port-ledger-apprenticeship': { x: 250, y: 550 },
};
