import { db } from './src/config/database'; 
db('company_staff').select('company_id', 'role', 'quantity').then(res => { 
  console.log(res); 
  process.exit(0); 
});
