const axios = require('axios');
axios.get('http://localhost:10000/api/v1/world/global-leaderboards')
  .then(res => {
    console.log(JSON.stringify(res.data, null, 2));
  })
  .catch(err => {
    console.error(err.message);
  });
