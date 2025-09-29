# DBUS API

A RESTful API for accessing Donostia bus information using web scraping.

## Features

- 🚌 Get all available bus lines
- � Get stops for specific bus lines
- ⏰ Get real-time bus arrival times
- � Built-in caching for better performance
- 🔒 Security middleware (Helmet, CORS, Rate limiting)
- 🏗️ Clean, maintainable architecture

## API Endpoints

### Base URL
```
http://localhost:80
```

### Health Check
```http
GET /health
```

Returns the API status and timestamp.

### Get All Bus Lines
```http
GET /api/v1/lines
```

Returns all available bus lines with their codes, names, and internal IDs.

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
    ...
  ],
  "count": 42
}
```

### Get Line Stops
```http
GET /api/v1/lines/:lineCode
```

Returns all stops for a specific bus line.

**Parameters:**
- `lineCode` - The bus line code (e.g., "27", "28")

**Response:**
```json
{
  "success": true,
  "data": {
    "security": "87c4dfb1f7",
    "stops": [
      {
        "code": "79",
        "name": "Boulevard 13",
        "internal_id": "2378"
      },
      ...
    ]
  }
}
```

### Get Bus Arrival Time
```http
GET /api/v1/lines/:lineCode/:stopCode
```

Returns the estimated arrival time for a specific bus at a specific stop.

**Parameters:**
- `lineCode` - The bus line code (e.g., "27", "28")
- `stopCode` - The stop code

### Get Bus Arrival Time
```http
GET /api/v1/lines/:lineCode/stops/:stopCode/arrival
```

Returns the estimated arrival time for a specific bus at a specific stop.

**Parameters:**
- `lineCode` - The bus line code (e.g., "27", "28")
- `stopCode` - The stop code

**Response:**
```json
{
  "success": true,
  "data": {
    "line": "26",
    "stop": "08",
    "arrival_time": 17,
    "unit": "minutes"
  }
}
```

## Project Structure

```
src/
├── config/
│   └── environment.js          # Environment configuration
├── controllers/
│   ├── lineController.js       # Bus line endpoints logic
│   └── stopController.js       # Bus stop endpoints logic
├── middleware/
│   ├── errorHandler.js         # Error handling middleware
│   └── logging.js              # Request logging middleware
├── routes/
│   ├── api/
│   │   └── v1/
│   │       ├── index.js        # API v1 routes
│   │       └── lines.js        # Lines routes
│   └── index.js                # Main routes
├── services/
│   ├── cacheService.js         # Caching functionality
│   └── scraperService.js       # Web scraping logic
├── utils/
│   └── logger.js               # Logging utilities
└── app.js                      # Express app configuration
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=80
NODE_ENV=development
CACHE_EXPIRY=3600000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## Dependencies

- **express** - Web framework
- **puppeteer** - Web scraping
- **jsdom** - HTML parsing
- **cors** - Cross-origin resource sharing
- **helmet** - Security middleware
- **express-rate-limit** - Rate limiting
- **dotenv** - Environment variables

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description"
  }
}
```

## Rate Limiting

- Window: 15 minutes (default)
- Max requests: 100 per window (default)

## Caching

- Cache expiry: 1 hour (default)
- Cached data stored in `cache/` directory
- Automatic cache invalidation

## License

ISC