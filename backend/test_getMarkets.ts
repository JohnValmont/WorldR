import { db } from './src/config/database';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';
import express from 'express';

async function test() {
  const req = {
    user: { id: '1' },
    params: { companyId: '' }
  };
  
  const comp = await db('companies').where({ industry_id: 'manufacturing', status: 'active' }).first();
  if (!comp) {
    console.log("No active company found");
    process.exit(0);
  }
  
  const char = await db('characters').where({ id: comp.owner_character_id }).first();
  if (char) {
    req.user.id = String(char.user_id);
  }

  req.params.companyId = comp.id;

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

  console.log(`Running getMarkets for ${comp.name}...`);
  await ManufacturingController.getMarkets(req as any, res as any, next);
}

test().catch(console.error);
