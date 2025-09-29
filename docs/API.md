# DBUS API Documentation

## Overview

The DBUS API provides real-time information about Donostia's public bus system. It offers endpoints to retrieve bus lines, stops, and arrival times through web scraping of the official DBUS website.

## Base Information

- **Base URL**: `http://localhost:80` (configurable via PORT environment variable)
- **API Version**: v1
- **Content Type**: `application/json`
- **Rate Limiting**: 100 requests per 15 minutes (configurable)

## Authentication

This API does not require authentication. All endpoints are publicly accessible.

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Window**: 15 minutes (900,000ms)
- **Max Requests**: 100 per window
- **Headers**: Rate limit information is included in response headers
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit window resets

When the rate limit is exceeded, the API returns a `429 Too Many Requests` status.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {}, // Response data
  "count": 10, // Optional: number of items returned
  "meta": {} // Optional: additional metadata
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE", // Optional: specific error code
    "details": {} // Optional: additional error details
  }
}
```

## Endpoints

### Health Check

#### GET /health

Check if the API is running and responsive.

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2025-09-29T10:30:00.000Z"
}
```

**Status Codes:**
- `200 OK` - API is healthy

---

### Bus Lines

#### GET /api/v1/lines

Retrieve all available bus lines in the Donostia bus system.

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "05",
      "name": "Benta Berri",
      "url": "https://dbus.eus/05-benta-berri/",
      "internal_id": "1"
    },
    {
      "code": "26", 
      "name": "Altza",
      "url": "https://dbus.eus/26-altza/",
      "internal_id": "26"
    }
  ],
  "count": 42
}
```

**Response Fields:**
- `code` (string): Bus line code/number
- `name` (string): Human-readable line name
- `url` (string): Official DBUS website URL for this line
- `internal_id` (string): Internal identifier used by DBUS system
- `count` (number): Total number of bus lines returned

**Status Codes:**
- `200 OK` - Lines retrieved successfully
- `500 Internal Server Error` - Failed to fetch lines from DBUS website
- `429 Too Many Requests` - Rate limit exceeded

**Caching:** Results are cached for 1 hour by default.

---

### Line Stops

#### GET /api/v1/lines/:lineCode

Retrieve all stops for a specific bus line.

**Path Parameters:**
- `lineCode` (string, required): The bus line code (e.g., "26", "05", "41")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "79",
      "name": "Boulevard 13",
      "internal_id": "2378"
    },
    {
      "code": "208",
      "name": "Urbieta 6", 
      "internal_id": "2877"
    }
  ],
  "count": 25
}
```

**Response Fields:**
- `code` (string): Stop code/number
- `name` (string): Stop name/location
- `internal_id` (string): Internal stop identifier used by DBUS system
- `count` (number): Total number of stops for this line

**Status Codes:**
- `200 OK` - Stops retrieved successfully
- `404 Not Found` - Line code not found
- `500 Internal Server Error` - Failed to scrape stop data
- `429 Too Many Requests` - Rate limit exceeded

**Example Requests:**
```bash
# Get stops for line 26
curl http://localhost:80/api/v1/lines/26

# Get stops for line 05
curl http://localhost:80/api/v1/lines/05
```

**Caching:** Results are cached for 1 hour by default.

---

### Bus Arrival Times

#### GET /api/v1/lines/:lineCode/:stopCode

Get the estimated arrival time for a specific bus line at a specific stop.

**Path Parameters:**
- `lineCode` (string, required): The bus line code (e.g., "26", "05", "41")
- `stopCode` (string, required): The stop code (e.g., "79", "208")

**Response:**
```json
{
  "success": true,
  "data": {
    "line": "26",
    "stop": "79",
    "arrival_time": 17,
    "unit": "minutes"
  }
}
```

**Response Fields:**
- `line` (string): The requested bus line code
- `stop` (string): The requested stop code  
- `arrival_time` (number): Minutes until bus arrival (0 means arriving now)
- `unit` (string): Always "minutes"

**Status Codes:**
- `200 OK` - Arrival time retrieved successfully
- `404 Not Found` - Line code or stop code not found
- `500 Internal Server Error` - Failed to get arrival time data
- `429 Too Many Requests` - Rate limit exceeded

**Example Requests:**
```bash
# Get arrival time for line 26 at stop 79
curl http://localhost:80/api/v1/lines/26/79

# Get arrival time for line 05 at stop 208  
curl http://localhost:80/api/v1/lines/05/208
```

**Notes:**
- Arrival times are real-time and not cached
- Times are calculated from the current moment
- If a bus shows a specific time (e.g., "10:20"), the API calculates remaining minutes
- If the displayed time has already passed today, it assumes the bus comes tomorrow

---

## Error Handling

The API provides detailed error information to help with debugging and integration.

### Common Error Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| `400 Bad Request` | Invalid request parameters | Missing or malformed lineCode/stopCode |
| `404 Not Found` | Resource not found | Invalid line code or stop code |
| `429 Too Many Requests` | Rate limit exceeded | Too many requests in time window |
| `500 Internal Server Error` | Server error | DBUS website unavailable, scraping failed |

### Error Response Examples

**Line not found:**
```json
{
  "success": false,
  "error": {
    "message": "Line with code 99 not found"
  }
}
```

**Stop not found:**
```json
{
  "success": false,
  "error": {
    "message": "Stop with ID 999 not found"  
  }
}
```

**Rate limit exceeded:**
```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later"
  }
}
```

**Server error:**
```json
{
  "success": false,
  "error": {
    "message": "Failed to fetch bus lines",
    "details": {
      "cause": "Network timeout"
    }
  }
}
```

---

## Usage Examples

### JavaScript/Node.js

```javascript
// Get all bus lines
const response = await fetch('http://localhost:80/api/v1/lines');
const { success, data, count } = await response.json();

if (success) {
  console.log(`Found ${count} bus lines:`);
  data.forEach(line => {
    console.log(`${line.code}: ${line.name}`);
  });
}

// Get stops for line 26
const stopsResponse = await fetch('http://localhost:80/api/v1/lines/26');
const { data: stops } = await stopsResponse.json();

// Get arrival time
const arrivalResponse = await fetch('http://localhost:80/api/v1/lines/26/79');
const { data: arrival } = await arrivalResponse.json();
console.log(`Bus ${arrival.line} arrives in ${arrival.arrival_time} ${arrival.unit}`);
```

### curl

```bash
# Get all lines
curl -H "Accept: application/json" http://localhost:80/api/v1/lines

# Get stops for line 26 with pretty output
curl -H "Accept: application/json" http://localhost:80/api/v1/lines/26 | jq

# Check API health
curl http://localhost:80/health

# Get arrival time with error handling
curl -f http://localhost:80/api/v1/lines/26/79 || echo "Request failed"
```

### Python

```python
import requests

# Get all bus lines
response = requests.get('http://localhost:80/api/v1/lines')
data = response.json()

if data['success']:
    lines = data['data']
    print(f"Found {data['count']} bus lines")
    
    # Get arrival time for first line and first stop
    if lines:
        line_code = lines[0]['code']
        
        # Get stops for this line
        stops_response = requests.get(f'http://localhost:80/api/v1/lines/{line_code}')
        stops_data = stops_response.json()
        
        if stops_data['success'] and stops_data['data']:
            stop_code = stops_data['data'][0]['code']
            
            # Get arrival time
            arrival_response = requests.get(f'http://localhost:80/api/v1/lines/{line_code}/{stop_code}')
            arrival_data = arrival_response.json()
            
            if arrival_data['success']:
                arrival = arrival_data['data']
                print(f"Bus {arrival['line']} arrives at stop {arrival['stop']} in {arrival['arrival_time']} {arrival['unit']}")
```

---

## Caching

The API implements intelligent caching to improve performance and reduce load on the DBUS website:

### Cache Strategy
- **Bus Lines**: Cached for 1 hour (lines don't change frequently)
- **Line Stops**: Cached for 1 hour (stops are relatively stable) 
- **Security Codes**: Cached globally, refreshed when expired
- **Arrival Times**: Not cached (real-time data)

### Cache Headers
Responses include cache information in headers:
- `X-Cache-Status`: HIT or MISS
- `Cache-Control`: Caching directives

### Cache Storage
- Cache files are stored in the `cache/` directory
- Files use JSON format for easy inspection
- Automatic cleanup of expired cache files

---

## Security Features

### Implemented Security Measures
- **Helmet.js**: Security headers protection
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Input Validation**: Parameter validation and sanitization
- **Error Handling**: Secure error messages without sensitive information

### Security Headers
The API automatically includes security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`  
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

## Performance

### Response Times
- **Cached responses**: < 10ms
- **Fresh data (bus lines)**: 1-3 seconds
- **Fresh data (line stops)**: 2-5 seconds  
- **Arrival times**: 1-2 seconds

### Optimization Features
- **Puppeteer**: Efficient web scraping with headless Chrome
- **Connection reuse**: Browser instance management
- **Smart caching**: Different strategies for different data types
- **Gzip compression**: Reduced response sizes

---

## Environment Configuration

### Environment Variables

```env
# Server Configuration
PORT=80                    # Server port (default: 80)
NODE_ENV=development       # Environment mode

# Caching
CACHE_EXPIRY=3600000      # Cache expiration in ms (default: 1 hour)

# Rate Limiting  
RATE_LIMIT_WINDOW=900000  # Rate limit window in ms (default: 15 minutes)
RATE_LIMIT_MAX=100        # Max requests per window (default: 100)

# Logging
LOG_LEVEL=info            # Logging level (error, warn, info, debug)
```

### Configuration Options

The API behavior can be customized through environment variables:

- **Caching**: Adjust `CACHE_EXPIRY` to change how long data is cached
- **Rate Limiting**: Modify `RATE_LIMIT_*` variables to change rate limiting behavior  
- **Logging**: Set `LOG_LEVEL` to control logging verbosity
- **Port**: Change `PORT` to run on a different port

---

## Monitoring and Logging

### Request Logging
All requests are logged with:
- Timestamp
- Method and URL
- Response status and time
- Client IP address
- User agent

### Error Logging
Errors are logged with full stack traces and context information for debugging.

### Log Files
- `logs/access-YYYY-MM-DD.log`: HTTP access logs
- `logs/error-YYYY-MM-DD.log`: Error logs only
- `logs/combined-YYYY-MM-DD.log`: All logs combined

### Health Monitoring
Use the `/health` endpoint for:
- Uptime monitoring
- Load balancer health checks
- Application status verification

---

## Best Practices

### For API Consumers

1. **Respect Rate Limits**: Monitor rate limit headers and implement backoff strategies
2. **Cache Responses**: Cache bus lines and stops data on your end to reduce API calls
3. **Handle Errors Gracefully**: Implement proper error handling for all status codes
4. **Use Appropriate Timeouts**: Set reasonable timeouts for HTTP requests (10-15 seconds recommended)

### Example Implementation

```javascript
class DBusAPIClient {
  constructor(baseUrl = 'http://localhost:80') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  async request(endpoint, cacheKey = null, cacheTTL = 300000) {
    // Check cache first
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful responses
      if (cacheKey && data.success) {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${error.message}`);
      throw error;
    }
  }

  async getLines() {
    return this.request('/api/v1/lines', 'lines', 3600000); // Cache for 1 hour
  }

  async getStops(lineCode) {
    return this.request(`/api/v1/lines/${lineCode}`, `stops-${lineCode}`, 3600000);
  }

  async getArrivalTime(lineCode, stopCode) {
    // Don't cache arrival times (real-time data)
    return this.request(`/api/v1/lines/${lineCode}/${stopCode}`);
  }
}
```

---

## Support and Contact

For issues, questions, or feature requests:

- **Repository**: [GlutenFreeSoftware/dbus-api](https://github.com/GlutenFreeSoftware/dbus-api)
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: This documentation covers all current API functionality

---

## Changelog

### v1.0.0
- Initial API release
- Bus lines endpoint
- Line stops endpoint  
- Bus arrival times endpoint
- Caching system
- Rate limiting
- Security features