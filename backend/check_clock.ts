import { db } from './src/config/db';

async function checkClock() {
  const clock = await db('world_clock').first();
  console.log("WORLD CLOCK:", clock);
  const now = new Date();
  console.log("CURRENT SERVER TIME:", now);
  console.log("NEXT ARC CLOSE AT:", clock.next_arc_close_at);
  console.log("IS IT DUE?", now >= new Date(clock.next_arc_close_at));
  process.exit(0);
}

checkClock();
