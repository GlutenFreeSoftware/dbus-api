# Documentation

This directory contains comprehensive documentation for the DBUS API.

## Available Documentation

### 📖 [API.md](./API.md)
Complete API documentation covering:
- All endpoints and their usage
- Request/response formats
- Authentication and rate limiting
- Usage examples in multiple languages
- Error handling and status codes
- Performance considerations
- Best practices for API consumers

### 🔧 [TECHNICAL.md](./TECHNICAL.md) 
Technical implementation documentation including:
- System architecture and components
- Data flow diagrams
- Caching strategy and implementation
- Security considerations
- Performance optimization
- Monitoring and observability
- Deployment guidelines
- Development workflow

### 📋 [openapi.yaml](./openapi.yaml)
OpenAPI 3.1 specification file that can be used with:
- Swagger UI for interactive API exploration
- Code generation tools
- API testing tools
- Documentation generators

## Quick Start

### View API Documentation
- Open `API.md` for complete user-facing documentation
- Use any Markdown viewer or GitHub to read the formatted docs

### Interactive API Explorer
To view the OpenAPI specification with Swagger UI:

```bash
# Install swagger-ui-serve globally
npm install -g swagger-ui-serve

# Serve the OpenAPI spec
swagger-ui-serve docs/openapi.yaml
```

Then open http://localhost:3000 to explore the API interactively.

### API Testing
Use the OpenAPI spec with tools like:
- **Postman**: Import the OpenAPI file
- **Insomnia**: Import as OpenAPI 3.1
- **curl**: Use examples from API.md
- **HTTPie**: Use examples from API.md

## Documentation Structure

```
docs/
├── README.md          # This file
├── API.md             # User-facing API documentation
├── TECHNICAL.md       # Technical implementation docs  
└── openapi.yaml       # OpenAPI 3.1 specification
```

## Contributing to Documentation

When updating the API:
1. Update the OpenAPI spec in `openapi.yaml`
2. Update user examples in `API.md`
3. Update technical details in `TECHNICAL.md`
4. Test documentation with real API calls

## Documentation Tools

### Recommended Markdown Viewers
- **VS Code**: Built-in Markdown preview
- **GitHub**: Automatic rendering of .md files
- **Typora**: Desktop Markdown editor
- **Mark Text**: Cross-platform Markdown editor

### OpenAPI Tools
- **Swagger Editor**: Online OpenAPI editor
- **Swagger UI**: Interactive API documentation
- **Redoc**: Alternative API documentation generator
- **OpenAPI Generator**: Code generation from specs