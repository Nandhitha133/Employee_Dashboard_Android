# Hikvision Attendance API Integration Guide

## Overview
Your Hikvision device provides an attendance API endpoint at `https://192.168.1.144/artemis/api/attendance/v1/report`. This guide helps you integrate it with your employee management system.

## Configuration

### Environment Variables
Add these to your `.env` file:

```env
# Hikvision API Configuration
HIK_HOST=https://192.168.1.144
HIK_KEY=27202606
HIK_SECRET=wNxzEQhAlCx01UrIFasx

# Attendance API Version (v1 or v2)
HIK_ATTENDANCE_API_VERSION=v1
```

## API Endpoints

### 1. Sync Attendance Data
**Endpoint:** `GET /api/hik-sync/sync`
**Description:** Syncs attendance records from Hikvision device to MongoDB
**Authentication:** Bearer token required

**Response:**
```json
{
  "success": true,
  "message": "HikCentral Sync Completed (API V1)",
  "inserted": 0,
  "total": 0,
  "apiVersion": "v1",
  "endpoint": "/artemis/api/attendance/v1/report"
}
```

### 2. Test Attendance API
**Endpoint:** `GET /api/hik-sync/test-attendance-api`
**Description:** Tests different parameter formats for the attendance API
**Authentication:** Bearer token required

**Response:**
```json
{
  "success": true,
  "apiVersion": "v1",
  "endpoint": "/artemis/api/attendance/v1/report",
  "testResults": [
    {
      "parameters": {},
      "success": true,
      "responseCode": "2",
      "responseMessage": "Incorrect request parameter. [pageNo parameter error]",
      "hasData": false
    }
  ],
  "recommendation": "No working parameters found. Try adjusting the API version or check device configuration."
}
```

## Troubleshooting

### V1 Endpoint Parameter Issues

**Problem:** The v1 endpoint consistently returns "Incorrect request parameter. [pageNo parameter error]" regardless of parameters sent.

**Possible Causes:**
1. **Wrong endpoint path**: The v1 endpoint might use a different path structure
2. **Missing required parameters**: V1 might require specific parameters like device ID, date range, etc.
3. **Parameter format differences**: V1 might expect different parameter names or formats
4. **Authentication scope**: The API key might not have access to the v1 attendance endpoint

**Solutions to Try:**

#### 1. Check Hikvision Documentation
- Verify the exact endpoint path for v1 attendance reports
- Check what parameters are required for v1
- Confirm your API key has the necessary permissions

#### 2. Try Alternative Endpoints
Based on Hikvision Artemis API patterns, try these variations:

```javascript
// Option 1: Different path structure
/artemis/api/attendance/v1/record
/artemis/api/attendance/v1/event
/artemis/api/attendance/v1/daily

// Option 2: With device ID
/artemis/api/attendance/v1/report?deviceId=YOUR_DEVICE_ID

// Option 3: With date range
/artemis/api/attendance/v1/report?startTime=2025-01-01&endTime=2025-01-31
```

#### 3. Check Device Configuration
- Log into your Hikvision device web interface
- Navigate to: Configuration > System > Security > API
- Verify that attendance API access is enabled
- Check if there are specific user permissions required

#### 4. Use V2 as Fallback
If v1 continues to have issues, you can switch to v2:

```env
HIK_ATTENDANCE_API_VERSION=v2
```

**Note:** V2 might return 404 if the endpoint doesn't exist on your device, but it's worth trying.

## Testing Different Parameters

The system automatically tests these parameter combinations for v1:

1. **Empty parameters** - `{}`
2. **Standard pagination** - `{ pageNo: 1, pageSize: 10 }`
3. **Zero-based pagination** - `{ pageNo: 0, pageSize: 10 }`
4. **Date range** - `{ startTime: "2025-11-25T09:43:23.891Z", endTime: "2025-11-26T09:43:23.891Z" }`

## Manual Testing

Use the test endpoint to quickly try different configurations:

```bash
# Test current configuration
curl -X GET http://localhost:5003/api/hik-sync/test-attendance-api \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test sync with current settings
curl -X GET http://localhost:5003/api/hik-sync/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

1. **Check your Hikvision device documentation** for the exact v1 attendance API specifications
2. **Verify API permissions** in your device configuration
3. **Try the alternative endpoints** listed above
4. **Contact Hikvision support** if the parameter requirements are unclear
5. **Consider using v2** if v1 continues to have issues and v2 is available on your device

## Code Location

The attendance sync logic is located in:
- `backend/routes/hikSync.js` - Main sync route with v1/v2 support
- `backend/utils/hikvision.js` - Hikvision API utility functions
- `backend/models/Attendance.js` - Attendance data model

## Support

If you continue to experience issues:
1. Check the server logs for detailed error messages
2. Use the test endpoint to verify parameter formats
3. Ensure your Hikvision device firmware is up to date
4. Verify network connectivity between your server and the Hikvision device