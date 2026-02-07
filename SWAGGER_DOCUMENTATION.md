# Swagger/OpenAPI Documentation Guide

This project uses **Swagger/OpenAPI 3.0** for interactive API documentation. The Swagger UI is automatically generated from decorators placed on controllers and DTOs.

## Accessing the Documentation

Once the server is running, you can access the Swagger UI at:

```
http://localhost:3000/api/docs
```

This provides an interactive interface where you can:
- View all available endpoints
- Read detailed descriptions of each endpoint
- See request/response schemas
- Test endpoints directly from the UI
- Generate client code in multiple languages

## Documentation Updates

The following enhancements have been made to the API documentation:

### 1. **Enhanced Main Configuration** (`src/main.ts`)
- Improved API title and description
- Added contact information
- Added Bearer token authentication support
- Added endpoint tags for better organization
- Enabled persistent authorization in Swagger UI

### 2. **Controllers with Swagger Decorators**

#### Authentication Module (`src/modules/auth/controllers/auth.controller.ts`)
- `/auth/login` - User login endpoint
- `/auth/signup` - User registration endpoint
- Both include request body schemas and response descriptions

#### Child Module (`src/modules/child/controller/child.controller.ts`)
- 16 endpoints for managing child sponsorships
- Includes:
  - Child creation and updates
  - Salesforce synchronization
  - Availability checking
  - Attachment management
  - Sponsorship status tracking

#### Contact Module (`src/modules/contact/controller/contact.controller.ts`)
- 14 endpoints for contact management
- Includes:
  - CRUD operations
  - Email and phone lookups
  - WordPress integration
  - Salesforce sync
  - Email cleanup and assignment

#### Donation Module (`src/modules/donation/controller/donation.controller.ts`)
- Donation management endpoints
- Includes:
  - Donation creation (regular and web)
  - Updates and retrievals
  - Salesforce synchronization
  - Status tracking

#### Sponsorship Module (`src/modules/sponsorship/controller/sponsorship.controller.ts`)
- 11 endpoints for sponsorship relationships
- Includes:
  - Sponsorship creation and activation
  - Expiration handling
  - Status synchronization
  - Salesforce integration

#### User Module (`src/modules/user/controllers/user.controller.ts`)
- User management endpoints (Admin only)
- Includes:
  - Get all users
  - Get user by ID
  - Update user
  - Delete user
  - Bearer token authorization

#### App Module (`src/modules/app/app.controller.ts`)
- Health check endpoint for verifying API is running

### 3. **DTO Documentation**

All DTOs include `@ApiProperty` and `@ApiPropertyOptional` decorators:
- Clear descriptions for each field
- Example values
- Enum options where applicable
- Required/optional field indicators

## Swagger Decorator Reference

### Common Decorators Used

```typescript
// Controller-level tags for grouping endpoints
@ApiTags('Child')

// Bearer authentication support
@ApiBearerAuth()

// Operation descriptions
@ApiOperation({ 
  summary: 'Brief description',
  description: 'Detailed description'
})

// Response specifications
@ApiResponse({ 
  status: 200, 
  description: 'Success message'
})

// Parameter documentation
@ApiParam({ 
  name: 'id',
  description: 'The unique identifier',
  example: '123456'
})

// Request body documentation
@ApiBody({ 
  type: CreateChildDto,
  description: 'Child data'
})

// DTO field documentation
@ApiProperty({ 
  description: 'Field description',
  example: 'Example value'
})

@ApiPropertyOptional({ 
  description: 'Optional field',
  example: 'Example value'
})
```

## Authentication in Swagger UI

1. Click the **"Authorize"** button at the top right of Swagger UI
2. Enter your JWT token in the format: `Bearer <your_token>`
3. Click **"Authorize"** to apply the token
4. All subsequent requests will include the authorization header
5. Click **"Logout"** to clear the token

## Testing Endpoints

1. Navigate to the endpoint you want to test
2. Click **"Try it out"**
3. Enter required parameters and request body
4. Click **"Execute"**
5. View the response, status code, and response headers

## API Tags

The API is organized into the following tags:

- **Authentication** - Login and signup endpoints
- **Child** - Child sponsorship management
- **Contact** - Contact management
- **Donation** - Donation processing
- **Sponsorship** - Sponsorship relationships
- **User** - User management (Admin)

## Best Practices

1. **Always document your endpoints** - Use `@ApiOperation` to describe what the endpoint does
2. **Provide examples** - Use the `example` property in decorators
3. **Document error responses** - Add `@ApiResponse` for different status codes
4. **Use consistent naming** - Keep endpoint names descriptive and RESTful
5. **Document required fields** - Clearly mark required vs optional properties

## Generating API Clients

You can use the Swagger UI to generate client code:

1. Go to `http://localhost:3000/api/docs`
2. Look for the "Generate Client" option or use external tools like:
   - [Swagger Codegen](https://swagger.io/tools/swagger-codegen/)
   - [OpenAPI Generator](https://openapi-generator.tech/)

Example command:
```bash
openapi-generator-cli generate -i http://localhost:3000/api/json -g typescript-axios -o ./generated-client
```

## Related Files

- Main configuration: `src/main.ts`
- Child DTO: `src/modules/child/dto/create-child.dto.ts`
- Contact DTO: `src/modules/contact/dto/create-contact.dto.ts`
- Child Controller: `src/modules/child/controller/child.controller.ts`
- Contact Controller: `src/modules/contact/controller/contact.controller.ts`

## OpenAPI JSON Schema

The complete OpenAPI specification can be accessed at:
```
http://localhost:3000/api/docs-json
```

This can be imported into tools like Postman, Insomnia, or used for code generation.

## Troubleshooting

**Issue**: Swagger UI is not showing at `/api/docs`
- **Solution**: Make sure the server is running and check `src/main.ts` for the correct path setup

**Issue**: Missing authorization header in requests
- **Solution**: Click "Authorize" in Swagger UI and enter a valid JWT token

**Issue**: Some endpoints not appearing in Swagger
- **Solution**: Ensure the controller has `@ApiTags()` and endpoints have `@ApiOperation()` decorators

## Next Steps

For further customization:
1. Add response schema examples in `@ApiResponse`
2. Document more complex types and nested objects
3. Add security schemes for different authentication methods
4. Create API groups with `@ApiExtraModels()` for complex schemas
5. Set up API versioning with different Swagger docs endpoints
