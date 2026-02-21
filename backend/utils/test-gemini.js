require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { moderateText, moderateImage, moderateUrl } = require('../services/gemini.service');

async function run() {
  console.log('PhishGuard Sentinel - Gemini moderation smoke test');

  const safeText = await moderateText(
    'This is a school project page about mathematics, planets, and nature.',
    'moderate'
  );
  console.log('Text safe:', safeText);

  const suspiciousUrl = await moderateUrl('https://secure-paypa1-login.example');
  console.log('URL scan:', suspiciousUrl);

  const sampleImage = await moderateImage(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Example.svg/1200px-Example.svg.png',
    'moderate'
  );
  console.log('Image scan:', sampleImage);
}

run().catch((err) => {
  console.error('Gemini test failed:', err.message);
  process.exit(1);
});

