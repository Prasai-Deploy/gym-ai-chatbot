
import axios from 'axios';

async function test() {
  try {
    console.log("Testing /api/me...");
    const res = await axios.get('http://localhost:3000/api/me');
    console.log("Status:", res.status);
    console.log("Data:", res.data);
  } catch (err) {
    console.error("Error testing /api/me:", err.message);
  }
}

test();
