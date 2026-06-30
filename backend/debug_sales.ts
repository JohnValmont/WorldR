import { db } from './src/config/database'; 
db('manufacturing_sales_results').where({ world_arc: 0 }).select('company_id', 'units_sold').then(res => { 
  console.log(res); 
  process.exit(0); 
});
