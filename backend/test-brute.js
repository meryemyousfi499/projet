const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testBruteForce() {
  for (let i = 1; i <= 600; i++) {
    try {
      const response = await fetch('https://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'meryemyousfi339@gmail.com',
          motDePasse: 'wrongpassword123'
        }),
        agent: agent
      });
      console.log(`Requête ${i} : ${response.status}`);
      if (response.status === 429) {
        console.log('✅ RATE LIMITING FONCTIONNE ! Bloqué à la requête ' + i);
        break;
      }
    } catch (err) {
      console.log(`Requête ${i} : Erreur - ${err.message}`);
      break;
    }
  }
}

testBruteForce();