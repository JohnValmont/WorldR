const fs = require('fs');

// Restore original file
// No wait, let's just make a copy of manufacturing.controller.js and modify it there to not mess up the main one
const originalCode = fs.readFileSync('./dist/src/api/controllers/manufacturing.controller.js', 'utf8');
const hackedCode = originalCode.replace(
  'const authResult = await verifyManufacturingCompany(req.user.id, companyId);',
  'const authResult = { company: { id: companyId } };'
);
fs.writeFileSync('./dist/src/api/controllers/manufacturing.controller_hacked.js', hackedCode);

const { ManufacturingController } = require('./dist/src/api/controllers/manufacturing.controller_hacked.js');

const req = {
  params: { companyId: '457c16c6-932d-4be9-9d5a-694bc1721596' },
  user: { id: 'dummy' }
};

const res = {
  status: (code) => {
    console.log("Status:", code);
    return {
      json: (data) => {
        console.log("JSON Success! Data received!");
        process.exit(0);
      }
    };
  }
};

const next = (err) => {
  console.error("Controller threw an error -> next(err):");
  console.error(err);
  process.exit(1);
};

async function test() {
  await ManufacturingController.getCompanyManufacturingData(req, res, next);
}

test();
