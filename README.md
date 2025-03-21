# Keep Alive Protocol

A sleek URI health monitoring tool that keeps servers awake by periodically pinging endpoints.

## Features

- Monitor health status of multiple URLs to prevent cold starts
- Configurable ping intervals (1, 5, or 10 minutes)
- Per-endpoint customizable ping intervals
- Easy-to-use interface for managing endpoints
- Real-time status updates with visual indicators
- Background PM2 logs display
- Modern, responsive design with Keep Alive protocol theme
- Live reload during development for easy interface testing

## Security Considerations

This application has been designed with the following security considerations:

- Input validation for all URLs
- Rate limiting and timeouts for URI health checks
- Error handling to prevent information leakage

## Installation

1. Ensure you have [Bun](https://bun.sh/) installed
2. Clone this repository
3. Run the following commands:

```bash
# Install dependencies
bun install

# Start the application in development mode with auto-reload
bun run dev

# Start the application in production mode
bun run start
```

## Usage

1. Access the web interface at http://localhost:3001
2. Add URLs you want to monitor
3. The application will ping each URL at the selected interval to keep them awake
4. Configure the ping interval for each endpoint using its settings button

## Development

```bash
# Run in development mode (with auto-reload)
bun dev

# Run tests
bun test

# Run specific test file
bun test test.ts
```

The development mode includes live reload functionality that automatically refreshes the browser when you make changes to the source files.

## Testing

The application includes two types of tests:

1. **Unit Tests**: Test individual components and functions
2. **End-to-End Tests**: Test the complete application by starting the server and making real HTTP requests

To run the tests:

```bash
# Run all tests
bun test

# Run specific test file
bun test test.ts
```

## Future Enhancements

- User authentication for premium features
- Advanced reporting and analytics
- Multiple URIs for registered users
- Notification system for status changes

## License

MIT
