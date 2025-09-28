# dbus API

An unofficial REST API to access dbus (Donostia/San Sebastián public transportation system) information using web scraping.

> [!WARNING]
> This project is currently in early development stage. The API may be unstable, endpoints might change, and some features may not work as expected. Use at your own risk in production environments.

## ✨ Features

- 🚌 **Get bus lines**: List all available bus lines
- 🚏 **Query stops**: Get stops for a specific line
- ⏱️ **Real-time schedules**: Check the arrival time of the next bus

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/GlutenFreeSoftware/dbus-api.git
cd dbus-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
```bash
cp .env.example .env
# Edit the .env file if necessary
```
- `PORT`: Port on which the server will run (default: 80)

## 🏃‍♂️ Usage

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

The server will run on port 80 by default, or on the port specified in the `PORT` environment variable.

## 📚 API Endpoints

### GET `/lines`
Gets all available bus lines.

**Response:**
```json
[
  {
    "code": "27",
    "name": "Altza-Intxaurrondo-Antiguo-Gros",
    "url": "https://dbus.eus/27-altza-intxaurrondo-antiguo-gros/",
    "internal_id": "24"
  }
]
```

### GET `/stops/:lineCode`
Gets all stops for a specific line.

**Parameters:**
- `lineCode`: Line code (e.g., "05", "27", "B1")

**Response:**
```json
{
  "security": "87c4dfb1f7",
  "stops": [
    {
      "code": "395",
      "name": "Larratxo III",
      "internal_id": "3178"
    }
  ]
}
```

### GET `/arrival/:lineNumber/:stopCode`
Gets the arrival time of the next bus at a specific stop.

**Parameters:**
- `lineNumber`: Line number
- `stopCode`: Stop code

**Response:**
```json
{
  "time": 5
}
```
*Time is returned in minutes.*

## 🔧 Development

### Main function structure

- `getBusLines()`: Gets all bus lines
- `getLineStops(lineCode)`: Gets stops for a specific line
- `getBusTimeAtStop(lineNumber, stopCode)`: Gets bus arrival time

### Available scripts

- `npm run dev`: Runs the server in development mode with nodemon
- `npm run postinstall`: Installs necessary browsers for Puppeteer

## ⚠️ Limitations and considerations

- This is an **unofficial** API that depends on web scraping the dbus site
- Changes to the official website structure may affect functionality
- A caching system is included to avoid overloading the original server
- Puppeteer requires additional system resources to run Chrome

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is under the ISC License.

## ⚖️ Disclaimer

This API is not affiliated with dbus or the Donostia/San Sebastián City Council. It is an independent project created to facilitate access to public transportation information.