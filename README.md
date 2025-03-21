# WakeUp

A minimal URI health monitoring tool that periodically checks the status of your important URLs.

## Features

- Monitor health status of multiple URLs
- Easy-to-use interface for managing URIs
- Real-time status updates
- Background PM2 logs display

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

# Start the application
bun run index.ts
```

For production deployment:

```bash
# Install PM2 if not already installed
npm install -g pm2

# Start with PM2
pm2 start index.ts --interpreter bun
```

## Development

```bash
# Run in development mode (with auto-reload)
bun dev

# Run tests
bun test

# Run specific test file
bun test test.ts
```

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
