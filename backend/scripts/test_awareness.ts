import { ManufacturingController } from '../src/api/controllers/manufacturing.controller';

async function runRegressionTest() {
  console.log('--- STARTING REGRESSION TEST ---');
  
  // Create a mock trx
  const mockTrx: any = (tableName: string) => {
    return {
      where: (conditions: any) => {
        if (tableName === 'manufacturing_region_markets') {
          if (conditions.country_id === 'test-country') {
            return Promise.resolve([
              { id: 'm1', population: 100000 },
              { id: 'm2', population: 200000 },
              { id: 'm3', population: 300000 }
            ]);
          }
        }
        if (tableName === 'manufacturing_brand_awareness') {
          if (conditions.company_id === 'test-company') {
            return Promise.resolve([
              { region_market_id: 'm1', awareness: 60, reputation: 80 },
              { region_market_id: 'foreign', awareness: 100, reputation: 100 }
            ]);
          }
        }
        return Promise.resolve([]);
      }
    };
  };

  const { companyAwareness, companyReputation } = await ManufacturingController.getCompanyAwarenessAndTrust(mockTrx, 'test-company', 'test-country');
  
  console.log(`Result: Awareness = ${companyAwareness}, Trust = ${companyReputation}`);
  
  console.log(`Expected: Awareness = 10, Trust = 13.333333333333334`);
  
  if (companyAwareness === 10 && Math.abs(companyReputation - 13.333333333333334) < 0.0001) {
      console.log('SUCCESS: Regression test passed!');
  } else {
      console.error('FAILURE: Regression test failed!');
  }
}

runRegressionTest();
