const { db } = require('./dist/config/database');
const { AnalyticsService } = require('./dist/api/services/analytics.service');

async function test() {
  try {
    const data = await AnalyticsService.getMarketStructure('inst_1', 'mark_1', 2026, 7);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
test();
