const { ManufacturingController } = require('./dist/src/api/controllers/manufacturing.controller.js');
const { db } = require('./dist/src/config/database');

const req = {
  params: { companyId: '0c564fdf-ee01-4ad2-b123-50df61e73093' },
  user: { id: '2607002' }
};

const res = {
  status: (code) => {
    console.log("Status:", code);
    return {
      json: (data) => {
        console.log("JSON Success!");
        console.log("Data keys:", Object.keys(data));
        process.exit(0);
      }
    };
  }
};

const next = (err) => {
  console.error("Next called with error:");
  console.error(err);
  process.exit(1);
};

async function test() {
  await ManufacturingController.getCompanyManufacturingData(req, res, next);
}

test();
