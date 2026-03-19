const axios = require('axios');
const cheerio = require('cheerio');

async function testScraping() {
  try {
    console.log('Testing connection to Hikvision device...');
    const auth = Buffer.from('admin:cdhrhsd12345').toString('base64');
    
    const response = await axios.get('https://192.168.1.144', {
      headers: {
        'Authorization': 'Basic ' + auth,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
      httpsAgent: new require('https').Agent({ rejectUnauthorized: false })
    });
    
    console.log('Successfully connected!');
    console.log('Response status:', response.status);
    console.log('Content length:', response.data.length);
    
    // Parse and show first 500 characters of HTML
    const $ = cheerio.load(response.data);
    const title = $('title').text();
    console.log('Page title:', title);
    
    // Look for navigation menus
    const menus = $('a, menu, nav, .menu, .navigation').map((i, el) => $(el).text().trim()).get().filter(text => text.length > 0);
    console.log('Found menu items:', menus.slice(0, 10));
    
    // Save the full HTML for inspection
    require('fs').writeFileSync('hikvision-page.html', response.data);
    console.log('Saved full HTML to hikvision-page.html for inspection');
    
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testScraping();