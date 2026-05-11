const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testBruteForce() {
  const response = await fetch('https://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: 'meryemyousfi339@gmail.com',
      motDePasse: 'wrongpassword123'
    }),
    agent: agent
  });
  
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Message:', JSON.stringify(data));
}

testBruteForce();