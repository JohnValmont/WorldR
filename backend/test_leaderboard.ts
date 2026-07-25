import { db } from './src/config/database';
import { WorldController } from './src/api/controllers/world.controller';
import express from 'express';

async function testLeaderboard() {
  const req = {};
  
  const res = {
    json: (data: any) => {
      console.log('Success, response length:', JSON.stringify(data).length);
      process.exit(0);
    },
    status: (code: number) => {
      console.log('Status set to:', code);
      return res;
    }
  };

  const next = (err: any) => {
    console.error('API Error:', err);
    process.exit(1);
  };

  console.log(`Running getMarketLeaderboard...`);
  await WorldController.getMarketLeaderboard(req as any, res as any, next);
}

testLeaderboard().catch(console.error);
