<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Fundraising Backend - Salesforce Integration

A progressive [Node.js](http://nodejs.org) backend application built with [NestJS](https://github.com/nestjs/nest) for managing fundraising operations with seamless Salesforce integration.

## Overview

This project is a comprehensive fundraising backend system that integrates with Salesforce to manage donations, recurring contributions, sponsorships, and related financial transactions. It provides secure authentication, role-based access control, and real-time event handling.

## Key Features

- **Salesforce Integration**: Direct integration with Salesforce CRM for data synchronization
- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Multi-Module Architecture**: Modular design with dedicated modules for different domains
- **MongoDB Database**: Document-based storage for flexible data modeling
- **Real-Time Events**: Event-driven architecture using NestJS Event Emitter
- **Cron Jobs**: Scheduled tasks for recurring operations
- **Stripe Integration**: Payment processing support
- **Comprehensive Validation**: Data validation using class-validator and DTOs
- **API Documentation**: Swagger integration for API documentation
- **Docker Support**: Containerized deployment with Docker Compose

## Project Structure

```
src/
├── config/                 # Application configuration
│   ├── database.config.ts
│   ├── salesforce.config.ts
│   ├── server.config.ts
│   └── types.ts
├── modules/               # Feature modules
│   ├── app/              # Root application module
│   ├── auth/             # Authentication & Authorization
│   │   ├── controllers/
│   │   ├── guards/
│   │   ├── services/
│   │   └── strategies/
│   ├── user/             # User management
│   ├── contact/          # Contact information
│   ├── donation/         # Donation management
│   ├── recurring/        # Recurring donations
│   ├── sponsorship/      # Sponsorship program
│   ├── transaction/      # Transaction tracking
│   ├── child/            # Child/beneficiary management
│   ├── orders/           # Order management
│   ├── errors/           # Error handling
│   └── salesforce/       # Salesforce integration
├── main.ts              # Application entry point
└── test/                # End-to-end tests
```

## Module Descriptions

### Auth Module
Handles authentication and authorization with JWT tokens and multiple authentication strategies.
- **Guards**: JWT, Local, and Role-based authentication guards
- **Strategies**: JWT and Local authentication strategies
- **Features**: Token generation, validation, and user authentication

### User Module
Manages user profiles and account information.

### Contact Module
Manages contact information for donors and sponsors.

### Donation Module
Handles individual donation records and donation management.
- Events-based architecture for donation tracking
- Integration with recurring donations and sponsorships

### Recurring Module
Manages recurring donation subscriptions and schedules.
- Cron-based job scheduling for recurring transactions
- Automatic payment processing
- Subscription lifecycle management

### Sponsorship Module
Manages sponsorship programs and beneficiary relationships.
- Event listeners for sponsorship lifecycle
- Integration with child module for beneficiary tracking
- Link to recurring donations and transactions

### Transaction Module
Tracks all financial transactions and payment records.
- Integration with Stripe for payment processing
- Transaction history and reporting

### Child Module
Manages child/beneficiary records associated with sponsorships.
- Demographic information
- Sponsorship tracking

### Salesforce Module
Direct integration with Salesforce CRM.
- Data synchronization
- Record management
- API communication

## Prerequisites

- **Node.js**: v18+ 
- **npm** or **yarn**: Latest version
- **MongoDB**: v5.0+ (or MongoDB Atlas)
- **Docker** & **Docker Compose**: For containerized deployment
- **Salesforce Account**: For CRM integration
- **Stripe Account**: For payment processing (optional)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Salesforce-integratio-nestjs
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/fundraising

# Salesforce
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_USERNAME=your_username
SALESFORCE_PASSWORD=your_password
SALESFORCE_SECURITY_TOKEN=your_security_token

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=7d

# Stripe
STRIPE_API_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

## Getting Started

### Development Mode

```bash
# Start with watch mode
npm run start:dev

# Application will be available at http://localhost:3000
```

### Using Docker Compose

```bash
# Start all services (API + MongoDB)
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f nest-api
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run end-to-end tests
npm run test:e2e
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

## API Documentation

Once the application is running, access the Swagger API documentation at:

```
http://localhost:3000/api
```

This provides interactive API exploration and testing capabilities.

## Database Schema

The application uses MongoDB with the following main collections:

- **users**: User account information
- **contacts**: Contact details for donors
- **donations**: Individual donation records
- **recurrings**: Recurring donation subscriptions
- **sponsorships**: Sponsorship program records
- **transactions**: All financial transactions
- **children**: Child/beneficiary records

## Authentication

The application uses JWT (JSON Web Tokens) for API authentication.

### Getting an Auth Token

1. Register a new user or login with existing credentials
2. The API returns a JWT token in the response
3. Include the token in all subsequent requests:

```bash
Authorization: Bearer <your_jwt_token>
```

## Key Technologies

- **Framework**: NestJS 11.x
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, Passport.js
- **CRM Integration**: Salesforce (jsforce)
- **Payments**: Stripe
- **Task Scheduling**: @nestjs/schedule
- **Event Handling**: @nestjs/event-emitter
- **Validation**: class-validator, class-transformer
- **API Docs**: Swagger/OpenAPI
- **Testing**: Jest

## Error Handling

The application includes comprehensive error handling with custom error module:
- Validation errors with detailed messages
- Circular dependency resolution
- Proper HTTP status codes
- Error logging and tracking

## Deployment

### Deploy to Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set production environment variables**

3. **Run the application**:
   ```bash
   npm run start:prod
   ```

### Docker Deployment

```bash
docker build -t fundraising-backend .
docker run -d \
  -e MONGODB_URI=<mongo-uri> \
  -e JWT_SECRET=<secret> \
  -p 3000:3000 \
  fundraising-backend
```

## Contributing

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Commit your changes: `git commit -am 'Add feature'`
3. Push to the branch: `git push origin feature/feature-name`
4. Submit a pull request

## Code Style

The project uses ESLint and Prettier for code consistency.

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Common Issues

**Circular Dependency Error**: The application uses `forwardRef()` to handle circular dependencies between modules. If you encounter circular dependency issues, ensure modules are properly decorated with `forwardRef()`.

**MongoDB Connection**: Ensure MongoDB is running and the connection string in `.env` is correct.

**Salesforce Integration**: Verify that Salesforce credentials are correctly configured and the security token is current.

## License

UNLICENSED

## Support & Contact

For issues, questions, or contributions, please refer to the project repository or contact the development team.
