# DBUS API - Technical Documentation

## Domain Overview

The DBUS API is a RESTful service that provides real-time information about Donostia's public bus system. It acts as a proxy between clients and the official DBUS website, offering a clean JSON API interface for bus lines, stops, and arrival times.

## Architecture

### High-Level Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Clients   │    │  DBUS API   │    │ DBUS Website│
│             │◄──►│             │◄──►│             │
│ Web/Mobile  │    │ (Express.js)│    │ (Scraping)  │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │ File Cache  │
                   │ (JSON Files)│
                   └─────────────┘
```

### Core Components

#### 1. Web Scraping Layer (`scraperService.js`)
- **Purpose**: Extract data from the official DBUS website
- **Technology**: Puppeteer (headless Chrome browser)
- **Responsibilities**:
  - Navigate to DBUS website pages
  - Extract bus lines data from embedded JavaScript
  - Scrape stop information from HTML forms
  - Parse real-time arrival time responses
  - Handle security tokens required by DBUS API

#### 2. Caching Layer (`cacheService.js`)
- **Purpose**: Store scraped data to reduce website load and improve response times
- **Storage**: JSON files in `/cache` directory
- **Strategy**: Time-based expiration with configurable TTL
- **Cache Types**:
  - `bus_lines.json`: All available bus lines
  - `line_stops_[code].json`: Stops for specific lines
  - `security_code.json`: Global security token

#### 3. API Layer (Controllers & Routes)
- **Controllers**: Business logic for handling requests
- **Routes**: Express.js route definitions and middleware
- **Middleware**: Security, logging, error handling, rate limiting

## Data Flow

### 1. Bus Lines Request Flow
```
Client Request → Rate Limit Check → Cache Check → Scraper Service → Response
                      ↓                ↓              ↓
                 429 Error        Cache Hit      DBUS Website
                                     ↓              ↓
                               Cached Response   Fresh Data + Cache
```

### 2. Line Stops Request Flow
```
Client Request → Validate Line Code → Cache Check → Browser Scraping → Security Code Extraction → Response
                      ↓                    ↓              ↓                    ↓
                 404 Error           Cache Hit      Puppeteer Launch    Global Cache Update
```

### 3. Arrival Time Request Flow
```
Client Request → Get Line Stops → Validate Stop → Get Security Code → DBUS API Call → Parse Response
                      ↓               ↓               ↓                  ↓              ↓
                Cache/Fresh      404 Error    Global Cache/Fresh    POST Request    Time Calculation
```

## Data Models

### Bus Line
```javascript
{
  code: "26",           // Line identifier
  name: "Altza",        // Human-readable name
  url: "https://...",   // DBUS website URL
  internal_id: "26"     // Internal DBUS system ID
}
```

### Bus Stop
```javascript
{
  code: "79",           // Stop identifier  
  name: "Boulevard 13", // Stop location name
  internal_id: "2378"   // Internal DBUS system ID
}
```

### Arrival Time
```javascript
{
  line: "26",          // Line code
  stop: "79",          // Stop code
  arrival_time: 17,    // Minutes until arrival
  unit: "minutes"      // Time unit
}
```

## Security Implementation

### Security Token Management
- **Purpose**: DBUS website requires security tokens for API calls
- **Storage**: Single global cache file (`security_code.json`)
- **Lifecycle**: Extracted during line stops scraping, cached globally, expires with cache TTL
- **Usage**: Included in all arrival time API requests

### Web Scraping Security
- **Headless Browser**: Puppeteer with sandboxing enabled
- **Cookie Handling**: Automatic cookie banner acceptance
- **Rate Limiting**: Prevents overwhelming the DBUS website
- **Error Handling**: Graceful degradation when scraping fails

## Caching Strategy

### Cache Architecture
```
Cache Directory Structure:
cache/
├── bus_lines.json          # All bus lines (TTL: 1 hour)
├── security_code.json      # Global security token (TTL: 1 hour)  
├── line_stops_26.json      # Stops for line 26 (TTL: 1 hour)
├── line_stops_05.json      # Stops for line 05 (TTL: 1 hour)
└── ... (one file per line)
```

### Cache Invalidation
- **Time-based**: Automatic expiration based on file modification time
- **Manual**: Cache service provides invalidation methods
- **Cascade**: Security code invalidation triggers line stops refresh

### Cache Benefits
- **Performance**: Sub-10ms response times for cached data
- **Reliability**: Reduces dependency on DBUS website availability
- **Efficiency**: Minimizes web scraping operations

## Error Handling

### Error Categories

#### 1. Client Errors (4xx)
- **400 Bad Request**: Invalid parameters
- **404 Not Found**: Line/stop not found
- **429 Too Many Requests**: Rate limit exceeded

#### 2. Server Errors (5xx)
- **500 Internal Server Error**: Scraping failures, DBUS website issues
- **503 Service Unavailable**: Browser launch failures

### Error Propagation
```
Scraper Error → Service Layer → Controller → Express Error Handler → Client Response
       ↓              ↓             ↓              ↓                    ↓
   Log Error      Add Context   HTTP Status   Standard Format    JSON Response
```

## Performance Considerations

### Bottlenecks
1. **Browser Launch**: Puppeteer initialization (2-3 seconds)
2. **Page Navigation**: DBUS website response times
3. **DOM Parsing**: JavaScript execution and HTML parsing

### Optimizations
1. **Browser Reuse**: Single browser instance per scraping operation
2. **Selective Scraping**: Only scrape when cache is expired
3. **Parallel Processing**: Multiple scraping operations when possible
4. **Compression**: Gzip response compression

## Monitoring and Observability

### Logging Levels
- **Error**: Failures, exceptions, critical issues
- **Warn**: Rate limits, scraping issues, degraded performance  
- **Info**: Successful operations, cache operations
- **Debug**: Detailed execution flow, timing information

### Metrics Collected
- **Response Times**: Per endpoint and operation type
- **Cache Hit Rates**: Efficiency of caching strategy
- **Error Rates**: Failure frequency by type
- **Scraping Success**: DBUS website interaction success

### Log Rotation
- **Daily Rotation**: New log files each day
- **Size Limits**: 20MB per file maximum
- **Retention**: 30 days for combined logs, 14 days for error logs

## Scalability Considerations

### Current Limitations
- **Single Instance**: No horizontal scaling support
- **File-based Cache**: Not shared across instances
- **Browser Process**: Resource-intensive scraping operations

### Scaling Strategies
1. **Distributed Cache**: Redis/Memcached for shared caching
2. **Queue System**: Background job processing for scraping
3. **Load Balancing**: Multiple API instances with sticky sessions
4. **Database**: Persistent storage for scraped data

## Configuration

### Environment Variables
```bash
# Server Configuration
PORT=80                     # HTTP server port
NODE_ENV=production        # Runtime environment

# Caching Configuration  
CACHE_EXPIRY=3600000       # Cache TTL in milliseconds

# Rate Limiting
RATE_LIMIT_WINDOW=900000   # Rate limit window (15 minutes)
RATE_LIMIT_MAX=100         # Max requests per window

# Logging
LOG_LEVEL=info             # Minimum log level
```

### Runtime Configuration
- **Browser Options**: Puppeteer launch configuration
- **Request Timeouts**: HTTP request timeout settings
- **Retry Logic**: Scraping retry attempts and backoff

## Development Workflow

### Local Development
1. **Environment Setup**: Node.js 18+, Chrome/Chromium
2. **Dependencies**: `npm install`
3. **Development Server**: `npm run dev` (with nodemon)
4. **Testing**: Manual testing via HTTP clients

### Debugging
1. **Verbose Logging**: Set `LOG_LEVEL=debug`
2. **Cache Inspection**: Check `/cache` directory contents
3. **Browser Debugging**: Disable headless mode in development
4. **Network Monitoring**: Inspect HTTP requests to DBUS website

## Deployment Considerations

### Production Requirements
- **Node.js Runtime**: Version 18 or higher
- **Chrome/Chromium**: Required for Puppeteer
- **File System Access**: Write permissions for cache directory
- **Memory**: Minimum 512MB for browser processes
- **Network**: Outbound access to dbus.eus domain

### Docker Deployment
```dockerfile
# Example Dockerfile considerations
FROM node:18-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
```

### Health Checks
- **HTTP Endpoint**: `/health` for basic availability
- **Deep Health**: Verify browser launch capability
- **Cache Health**: Check cache directory accessibility
- **DBUS Connectivity**: Validate external website access

## API Evolution

### Versioning Strategy
- **URL Versioning**: `/api/v1/` prefix
- **Backward Compatibility**: Maintain existing endpoints
- **Deprecation**: Gradual phase-out of old versions

### Future Enhancements
1. **WebSocket Support**: Real-time arrival updates
2. **Geolocation**: Nearest stops based on user location  
3. **Route Planning**: Multi-line journey planning
4. **Historical Data**: Arrival time patterns and analytics
5. **Mobile Optimization**: Reduced response payloads
6. **API Keys**: Authentication and usage tracking

## Data Sources

### DBUS Website Structure
- **Lines Page**: JavaScript embedded data (`lineas_front` variable)
- **Line Pages**: HTML forms with stop options
- **AJAX API**: Real-time arrival time endpoint

### Scraping Challenges
1. **Dynamic Content**: JavaScript-generated HTML
2. **Security Tokens**: Time-limited authentication tokens
3. **Cookie Consent**: GDPR compliance banners
4. **Rate Limiting**: Implicit limits on website access

## Compliance and Legal

### Data Usage
- **Public Information**: Only publicly available bus information
- **No Personal Data**: No user tracking or personal information
- **Fair Use**: Reasonable scraping frequency
- **Respect robots.txt**: Compliance with website policies

### Privacy
- **No User Tracking**: API doesn't store user information
- **Request Logging**: Only for operational purposes
- **GDPR Compliance**: No personal data processing