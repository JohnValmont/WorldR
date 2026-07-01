import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await axios.get('http://localhost:3000/politics/state', {
      headers: {
        Authorization: 'Bearer test'
      }
    });
    console.log(res.data);
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}
run();
