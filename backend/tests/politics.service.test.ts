import assert from 'assert';
import { derivePhase } from '../src/api/services/politics.service';
import {
  POL_FILING_WINDOW_ARCS,
  POL_CAMPAIGN_WINDOW_ARCS,
  POL_FORMATION_WINDOW_ARCS
} from '../src/api/constants/politics';

function runTests() {
  const cycle = {
    polling_arc: 100,
    formation_end_arc: 100 + POL_FORMATION_WINDOW_ARCS // 102
  };
  
  const startCampaign = 100 - POL_CAMPAIGN_WINDOW_ARCS; // 94
  const startFiling = startCampaign - POL_FILING_WINDOW_ARCS; // 91

  console.log('Testing derivePhase boundary: Governing before filing');
  assert(derivePhase(cycle, 90) === 'governing', 'Should be governing before filing starts');
  
  console.log('Testing derivePhase boundary: Filing');
  assert(derivePhase(cycle, 91) === 'filing', 'Should be filing exactly at startFiling');
  assert(derivePhase(cycle, 93) === 'filing', 'Should be filing just before campaign');

  console.log('Testing derivePhase boundary: Campaign');
  assert(derivePhase(cycle, 94) === 'campaign', 'Should be campaign exactly at startCampaign');
  assert(derivePhase(cycle, 99) === 'campaign', 'Should be campaign just before polling');

  console.log('Testing derivePhase boundary: Polling');
  assert(derivePhase(cycle, 100) === 'polling', 'Should be polling exactly on polling_arc');

  console.log('Testing derivePhase boundary: Formation');
  assert(derivePhase(cycle, 101) === 'formation', 'Should be formation immediately after polling');
  assert(derivePhase(cycle, 102) === 'formation', 'Should be formation exactly at formation_end_arc');

  console.log('Testing derivePhase boundary: Governing after term (next cycle prep)');
  assert(derivePhase(cycle, 103) === 'governing', 'Should return governing if past formation window');

  console.log('derivePhase tests passed!');
}

runTests();
