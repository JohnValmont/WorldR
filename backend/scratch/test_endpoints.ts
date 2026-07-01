// @ts-nocheck
import { db } from '../src/config/database';
import { getStateOverview, getParties } from '../src/api/controllers/politics.controller';
import { Request, Response } from 'express';

async function mockReqRes(controllerFn: Function, reqObj = {}) {
  const req = reqObj as any as Request;
  const res = {
    json: (data: any) => { console.log('SUCCESS:', data); },
    status: (code: number) => ({ json: (data: any) => console.log(`STATUS ${code}:`, data) })
  } as any as Response;
  let errorCaught = null;
  const next = (err: any) => { errorCaught = err; console.error('NEXT ERROR:', err); };

  await controllerFn(req, res, next);
  if (errorCaught) {
    console.error('ERROR THROWN:', errorCaught);
  }
}

async function run() {
  console.log('--- Testing getStateOverview ---');
  await mockReqRes(getStateOverview);

  console.log('--- Testing getParties ---');
  await mockReqRes(getParties);

  await db.destroy();
}

run().catch(console.error);
