const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio'); // For HTML parsing

const deviceIP = '192.168.1.144';
const username = '27202606';
const password = 'wNxzEQhAlCx01UrIFasx';

const agent = new https.Agent({ 
  rejectUnauthorized: false
});

// Create axios instance with authentication
const hikvisionClient = axios.create({
  baseURL: `https://${deviceIP}`,
  httpsAgent: agent,
  auth: { username, password },
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
  }
});

console.log('Starting Hikvision web scraping for attendance data...');

async function scrapeAttendanceData() {
  try {
    console.log('1. Getting main page...');
    const mainPage = await hikvisionClient.get('/');
    const $ = cheerio.load(mainPage.data);
    
    console.log('2. Analyzing navigation...');
    
    // Common Hikvision menu paths that might contain attendance data
    const possiblePaths = [
      '/doc/page/accesscontrol.asp',
      '/doc/page/acs.asp',
      '/doc/page/event.asp',
      '/doc/page/report.asp',
      '/doc/page/log.asp',
      '/doc/page/attendance.asp',
      '/doc/page/card.asp',
      '/doc/page/user.asp',
      '/ISAPI/AccessControl/event',
      '/ISAPI/AccessControl/record',
      '/cgi-bin/record.cgi',
      '/cgi-bin/event.cgi',
      '/cgi-bin/access.cgi'
    ];
    
    console.log('3. Testing attendance-related pages...');
    
    for (const path of possiblePaths) {
      try {
        console.log(`   Testing: ${path}`);
        const response = await hikvisionClient.get(path);
        
        if (response.status === 200) {
          console.log(`   ✅ Found accessible page: ${path}`);
          
          // Analyze the content
          const page$ = cheerio.load(response.data);
          const title = page$('title').text() || page$('h1').text() || 'No title';
          console.log(`   📄 Page title: ${title.trim()}`);
          
          // Look for attendance-related keywords
          const content = response.data.toLowerCase();
          const keywords = ['attendance', 'event', 'record', 'log', 'card', 'access', 'time', 'date', 'user'];
          const foundKeywords = keywords.filter(keyword => content.includes(keyword));
          
          if (foundKeywords.length > 0) {
            console.log(`Found keywords: ${foundKeywords.join(', ')}`);
            
            // Try to extract data from this page
            await extractDataFromPage(path, response.data);
          }
          
          // Look for data tables or lists
          const tables = page$('table');
          const lists = page$('ul, ol');
          console.log(`   📊 Tables: ${tables.length}, Lists: ${lists.length}`);
          
          if (tables.length > 0 || lists.length > 0) {
            console.log(`   🎯 Potential data source found!`);
            
            // Try to get more specific data
            await getSpecificAttendanceData(path);
          }
        }
        
      } catch (error) {
        if (error.response?.status === 404) {
          // Page doesn't exist, continue
        } else if (error.response?.status === 401) {
          console.log(`   ❌ Authentication failed for ${path}`);
        } else {
          console.log(`   ⚠️  Error accessing ${path}: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Failed to scrape main page:', error.message);
  }
}

async function extractDataFromPage(path, html) {
  try {
    const $ = cheerio.load(html);
    
    // Look for data in tables
    const tables = $('table');
    if (tables.length > 0) {
      console.log(`   📋 Found ${tables.length} table(s), extracting data...`);
      
      tables.each((i, table) => {
        const rows = $(table).find('tr');
        console.log(`   Table ${i + 1}: ${rows.length} rows`);
        
        // Extract header
        const headers = [];
        $(table).find('th').each((j, th) => {
          headers.push($(th).text().trim());
        });
        
        if (headers.length > 0) {
          console.log(`   Headers: ${headers.join(', ')}`);
        }
        
        // Extract first few data rows
        const sampleData = [];
        rows.slice(1, 4).each((j, row) => {
          const cells = $(row).find('td');
          const rowData = [];
          cells.each((k, cell) => {
            rowData.push($(cell).text().trim());
          });
          if (rowData.length > 0) {
            sampleData.push(rowData);
          }
        });
        
        if (sampleData.length > 0) {
          console.log(`   Sample data:`);
          sampleData.forEach(row => {
            console.log(`     ${row.join(' | ')}`);
          });
        }
      });
    }
    
    // Look for data in lists
    const lists = $('ul, ol');
    if (lists.length > 0) {
      console.log(`   📋 Found ${lists.length} list(s), extracting data...`);
      
      lists.each((i, list) => {
        const items = $(list).find('li');
        console.log(`   List ${i + 1}: ${items.length} items`);
        
        items.slice(0, 3).each((j, item) => {
          const text = $(item).text().trim();
          if (text) {
            console.log(`     - ${text}`);
          }
        });
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Failed to extract data: ${error.message}`);
  }
}

async function getSpecificAttendanceData(basePath) {
  // Try common attendance data URLs
  const attendanceUrls = [
    '/cgi-bin/record.cgi?action=get&time=2024-11-01&endtime=2024-11-30',
    '/ISAPI/AccessControl/AcsEvent?format=json&startTime=2024-11-01T00:00:00Z&endTime=2024-11-30T23:59:59Z',
    '/doc/page/accesscontrol.asp?action=getevent',
    '/doc/page/report.asp?type=attendance',
    '/data/attendance.json',
    '/export/attendance.csv',
    '/download/record.log'
  ];
  
  for (const url of attendanceUrls) {
    try {
      console.log(`   📡 Trying: ${url}`);
      const response = await hikvisionClient.get(url);
      
      if (response.status === 200) {
        console.log(`   ✅ Got attendance data from: ${url}`);
        console.log(`   📊 Data type: ${typeof response.data}`);
        
        if (typeof response.data === 'object') {
          console.log('   📋 Data:', JSON.stringify(response.data, null, 2).substring(0, 500));
        } else {
          console.log('   📄 Content:', response.data.toString().substring(0, 300));
        }
        
        // Save the successful endpoint
        return {
          success: true,
          endpoint: url,
          data: response.data
        };
      }
      
    } catch (error) {
      if (error.response?.status !== 404) {
        console.log(`   ⚠️  Failed: ${error.response?.status || error.message}`);
      }
    }
  }
  
  return { success: false };
}

// Main execution
async function main() {
  console.log('🚀 Starting Hikvision attendance data extraction...');
  console.log('Device:', deviceIP);
  console.log('Credentials:', username, '***');
  console.log('');
  
  try {
    const result = await scrapeAttendanceData();
    
    if (result && result.success) {
      console.log('\n🎉 SUCCESS! Found attendance data:');
      console.log('Endpoint:', result.endpoint);
      console.log('Records:', result.data.length || 'N/A');
      
      // Save to MongoDB
      await saveToMongoDB(result.data);
    } else {
      console.log('\n🔍 No attendance data found via web scraping.');
      console.log('\n📋 Manual extraction steps:');
      console.log('1. Visit: https://192.168.1.144');
      console.log('2. Login with your credentials');
      console.log('3. Navigate to Access Control or Reports section');
      console.log('4. Look for Event Logs or Attendance Reports');
      console.log('5. Export data to CSV/Excel if available');
      console.log('6. Upload the exported file to import into MongoDB');
    }
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
  }
}

async function saveToMongoDB(data) {
  try {
    console.log('\n💾 Saving attendance data to MongoDB...');
    
    // Import MongoDB connection
    const mongoose = require('mongoose');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employees');
    }
    
    // Create attendance record schema if not exists
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({
      employeeId: String,
      employeeName: String,
      timestamp: Date,
      direction: String,
      source: { type: String, default: 'hikvision' },
      deviceInfo: Object,
      rawData: Object
    }));
    
    // Process and save the data
    if (Array.isArray(data)) {
      const savedRecords = [];
      
      for (const record of data) {
        // Transform Hikvision data format to our schema
        const attendanceRecord = {
          employeeId: record.employeeId || record.userId || record.cardNo || 'Unknown',
          employeeName: record.employeeName || record.userName || 'Unknown',
          timestamp: new Date(record.timestamp || record.time || record.date || Date.now()),
          direction: record.direction || record.type || 'unknown',
          source: 'hikvision',
          deviceInfo: { deviceIP, model: 'Hikvision' },
          rawData: record
        };
        
        const saved = await Attendance.create(attendanceRecord);
        savedRecords.push(saved);
      }
      
      console.log(`✅ Saved ${savedRecords.length} attendance records to MongoDB`);
      return savedRecords;
      
    } else {
      // Handle single record or different format
      console.log('📋 Single record format detected');
      const attendanceRecord = {
        employeeId: 'Unknown',
        employeeName: 'Unknown',
        timestamp: new Date(),
        direction: 'unknown',
        source: 'hikvision',
        deviceInfo: { deviceIP, model: 'Hikvision' },
        rawData: data
      };
      
      const saved = await Attendance.create(attendanceRecord);
      console.log('✅ Saved 1 attendance record to MongoDB');
      return [saved];
    }
    
  } catch (error) {
    console.error('❌ Failed to save to MongoDB:', error.message);
    throw error;
  }
}

main().catch(console.error);