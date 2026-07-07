import { runWorldTick } from './src/api/services/worldTick.service';

async function main() {
  try {
    const res = await runWorldTick({ force: true });
    console.log("RESULT:", JSON.stringify(res, null, 2));
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    process.exit(0);
  }
}
main();
