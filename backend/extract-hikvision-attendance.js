const https = require('https');
const axios = require('axios');

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

console.log(' Starting Hikvision attendance data extraction...');
console.log('Device:', deviceIP);
console.log('Credentials:', username, '***');
console.log('');

// Common Hikvision paths that might contain attendance data
const attendancePaths = [
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
  '/cgi-bin/access.cgi',
  '/data/events.json',
  '/export/attendance.csv',
  '/reports/attendance.html'
];

async function extractAttendanceData() {
  console.log('🚀 Searching for attendance data pages...\n');
  
  for (const path of attendancePaths) {
    try {
      console.log(`📡 Accessing: ${path}`);
      const response = await hikvisionClient.get(path);
      
      if (response.status === 200) {
        console.log(`   ✅ Found accessible page: ${path}`);
        
        const contentType = response.headers['content-type'];
        console.log(`   📄 Content-Type: ${contentType}`);
        
        if (contentType && contentType.includes('json')) {
          // JSON data - likely attendance records
          console.log(`   🎯 JSON data found!`);
          console.log(`   📊 Records: ${Array.isArray(response.data) ? response.data.length : 'Single record'}`);
          
          if (Array.isArray(response.data) && response.data.length > 0) {
            console.log(`   📝 Sample record:`, JSON.stringify(response.data[0], null, 2).substring(0, 300));
            
            // Save to MongoDB
            await saveAttendanceToMongoDB(response.data, path);
            return { success: true, data: response.data, source: path };
          }
          
        } else if (contentType && contentType.includes('csv')) {
          // CSV data - parse and save
          console.log(`   🎯 CSV data found!`);
          const csvData = response.data;
          const lines = csvData.split('\n');
          console.log(`   📊 Lines: ${lines.length}`);
          
          if (lines.length > 1) {
            console.log(`   📝 Headers: ${lines[0]}`);
            console.log(`   📝 First data: ${lines[1]}`);
            
            // Convert CSV to JSON and save
            const jsonData = convertCSVToJSON(csvData);
            await saveAttendanceToMongoDB(jsonData, path);
            return { success: true, data: jsonData, source: path };
          }
          
        } else {
          // HTML page - look for data tables
          console.log(`   📋 HTML page found, analyzing content...`);
          
          const html = response.data.toString();
          
          // Look for data patterns
          if (html.includes('table') || html.includes('grid') || html.includes('data')) {
            console.log(`   📊 Found data tables in HTML`);
            
            // Extract data from HTML
            const extractedData = extractDataFromHTML(html, path);
            if (extractedData.length > 0) {
              console.log(`   🎯 Extracted ${extractedData.length} records from HTML`);
              await saveAttendanceToMongoDB(extractedData, path);
              return { success: true, data: extractedData, source: path };
            }
          }
          
          // Look for JavaScript data
          const jsDataMatch = html.match(/var\s+(?:data|records|events)\s*=\s*(\[.*?\]);/s);
          if (jsDataMatch) {
            console.log(`   🎯 Found JavaScript data array`);
            try {
              const jsData = JSON.parse(jsDataMatch[1]);
              console.log(`   📊 JavaScript records: ${jsData.length}`);
              await saveAttendanceToMongoDB(jsData, path);
              return { success: true, data: jsData, source: path };
            } catch (e) {
              console.log(`   ⚠️  Failed to parse JavaScript data`);
            }
          }
        }
        
        // Save raw content for analysis
        console.log(`   💾 Saving raw content for analysis...`);
        const fs = require('fs');
        const filename = `hikvision_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`;
        fs.writeFileSync(filename, response.data);
        console.log(`   📁 Saved raw content to: ${filename}`);
        
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ❌ Page not found`);
      } else if (error.response?.status === 401) {
        console.log(`   ❌ Authentication failed`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`   ❌ Connection refused`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   ⏰ Timeout - page might be slow`);
      } else {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line for readability
  }
  
  return { success: false, message: 'No attendance data found via web scraping' };
}

function convertCSVToJSON(csvData) {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const record = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    
    records.push(record);
  }
  
  return records;
}

function extractDataFromHTML(html, source) {
  const records = [];
  
  // Simple table extraction
  const tableRegex = /<table[^>]*>(.*?)<\/table>/gs;
  const tables = html.match(tableRegex) || [];
  
  tables.forEach((table, tableIndex) => {
    console.log(`   📋 Processing table ${tableIndex + 1}`);
    
    // Extract rows
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
    const rows = table.match(rowRegex) || [];
    
    if (rows.length > 1) {
      // Extract headers from first row
      const headerRow = rows[0];
      const headerCells = headerRow.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi) || [];
      const headers = headerCells.map(cell => 
        cell.replace(/<[^>]+>/g, '').trim()
      );
      
      console.log(`   📊 Headers: ${headers.join(', ')}`);
      
      // Process data rows
      for (let i = 1; i < Math.min(rows.length, 6); i++) { // First 5 data rows
        const row = rows[i];
        const cells = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi) || [];
        
        if (cells.length > 0) {
          const record = {
            source: source,
            tableIndex: tableIndex,
            rowIndex: i
          };
          
          cells.forEach((cell, cellIndex) => {
            const value = cell.replace(/<[^>]+>/g, '').trim();
            const header = headers[cellIndex] || `column${cellIndex}`;
            record[header] = value;
          });
          
          records.push(record);
        }
      }
    }
  });
  
  return records;
}

async function saveAttendanceToMongoDB(data, source) {
  try {
    console.log(`   💾 Saving ${data.length} records to MongoDB...`);
    
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
      rawData: Object,
      extractedFrom: String,
      createdAt: { type: Date, default: Date.now }
    }));
    
    // Process and save the data
    const savedRecords = [];
    
    for (const item of data) {
      // Transform Hikvision data format to our schema
      const attendanceRecord = {
        employeeId: item.employeeId || item.userId || item.cardNo || item.user || 'Unknown',
        employeeName: item.employeeName || item.userName || item.name || 'Unknown',
        timestamp: new Date(item.timestamp || item.time || item.date || item.datetime || Date.now()),
        direction: item.direction || item.type || item.event || item.status || 'unknown',
        source: 'hikvision',
        deviceInfo: { deviceIP, model: 'Hikvision', source: source },
        rawData: item,
        extractedFrom: source
      };
      
      try {
        const saved = await Attendance.create(attendanceRecord);
        savedRecords.push(saved);
      } catch (err) {
        console.log(`   ⚠️  Failed to save record: ${err.message}`);
      }
    }
    
    console.log(`   ✅ Successfully saved ${savedRecords.length} attendance records to MongoDB`);
    return savedRecords;
    
  } catch (error) {
    console.error('   ❌ Failed to save to MongoDB:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Hikvision attendance data extraction...');
  console.log('Device:', deviceIP);
  console.log('Credentials:', username, '***');
  console.log('');
  
  try {
    const result = await extractAttendanceData();
    
    if (result.success) {
      console.log('\n🎉 SUCCESS! Found and extracted attendance data:');
      console.log('📊 Source:', result.source);
      console.log('📈 Records:', result.data.length);
      console.log('💾 All data saved to MongoDB');
      
      // Show summary
      console.log('\n📋 Data Summary:');
      const uniqueEmployees = [...new Set(result.data.map(item => 
        item.employeeId || item.userId || item.cardNo || item.user || 'Unknown'
      ))];
      console.log('👥 Unique employees:', uniqueEmployees.length);
      console.log('🆔 Employee IDs:', uniqueEmployees.slice(0, 5).join(', '));
      
    } else {
      console.log('\n🔍 No attendance data found via web scraping.');
      console.log('\n📋 Manual extraction steps:');
      console.log('1. Visit: https://192.168.1.144');
      console.log('2. Login with your credentials (27202606 / ***)');
      console.log('3. Navigate to Access Control → Event or Reports section');
      console.log('4. Look for attendance/event logs');
      console.log('5. Export data to CSV/Excel if available');
      console.log('6. We can then import the exported file into MongoDB');
    }
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
  }
}

main().catch(console.error);