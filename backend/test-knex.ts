import { db } from './src/config/database';

async function test() {
  try {
    const activeLines = await db('manufacturing_production_lines')
      .join('manufacturing_factories', 'manufacturing_production_lines.factory_id', 'manufacturing_factories.id')
      .where({
        'manufacturing_factories.company_id': '457c16c6-932d-4be9-9d5a-694bc1721596',
        'manufacturing_production_lines.status': 'active'
      });
    console.log("Success! Found", activeLines.length);
  } catch (e) {
    console.error("Error occurred:");
    console.error(e);
  } finally {
    db.destroy();
  }
}

test();
