# Books API

A RESTful API for managing books built with NestJS, TypeORM, and PostgreSQL.


## Features

- **RESTful API** with full CRUD operations for books
- **TypeORM** integration with PostgreSQL
- **Base Service Pattern** for consistent CRUD operations
- **Authentication & Authorization** middleware
- **Pagination** and filtering support
- **Docker** containerization with separate compose files
- **Logging** utility for consistent application logging
- **Response helpers** for standardized API responses
- **Environment-based configuration**

### Project Architecture

- **Modular Design**: Each feature (auth, books) is organized as a separate NestJS module
- **Base Service Pattern**: Common CRUD operations are abstracted in `BaseService.ts`
- **Entity-First Approach**: Database schema defined using TypeORM entities
- **Layered Architecture**: Controller → Service → Repository pattern
- **Shared Components**: Common functionality in the `common/` directory
- **Configuration Management**: Environment-based config with validation
- **File Storage**: Integrated MinIO for handling file uploads (book cover images)

```bash
├─ compose/               # docker‑compose files per environment
│  ├─ node/Dockerfile     # Node container
│  └─ postgres/Dockerfile # PostgreSQL container
├─ src/
│  ├─ common/             # shared decorators, filters, interceptors
│  ├─ config/             # env‑based configuration + validation
│  ├─ entities/           # TypeORM entities (DB schema)
│  ├─ modules/            # feature‑oriented Nest modules
│  │   ├─ auth/           # authentication & authorization
│  │   │   ├─ decorators/
│  │   │   ├─ dto/
│  │   │   ├─ guards/
│  │   │   ├─ strategies/
│  │   │   ├─ auth.controller.ts
│  │   │   ├─ auth.service.ts
│  │   │   └─ auth.module.ts
│  │   └─ books/          # book CRUD features
│  │       ├─ dto/
│  │       ├─ BaseService.ts   # generic CRUD abstraction
│  │       ├─ books.controller.ts
│  │       ├─ books.service.ts
│  │       └─ books.module.ts
│  ├─ storage/            # MinIO integration layer
│  ├─ utils/              # helpers (logging, response helpers, …)
│  └─ main.ts             # Nest bootstrap
├─ .env.example
│─ test/               # e2e & unit tests
└─ docker‑compose.yml
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **Controllers** | Handle HTTP requests, validation, and responses |
| **Services** | Contain business logic and data processing |
| **Entities** | Define database schema and relationships |
| **DTOs** | Data validation and transformation objects |
| **Guards** | Handle authentication and authorization |
| **Interceptors** | Cross-cutting concerns (logging, response formatting) |
| **Strategies** | Authentication strategies (JWT) |

##  Tech Stack

- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL with TypeORM
- **Containerization**: Docker & Docker Compose
- **Object Storage**: MinIO (optional)

## Requirements

- Node.js 22+ 
- PostgreSQL 15+ & MinIO ( for production )
- Docker & Docker Compose ( local / development )

## First setup 

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd books_api
   ```

2. **Set up environment variables**
   ```bash
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   # Development 
   docker compose up  && docker compose build
   ```

4. **Access the API**
   - API: http://localhost:3000
   - Health check: http://localhost:3000/health
   - API docs: http://localhost:3000/api-docs



## Basic API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register a new user account | No |
| POST | `/auth/login` | Authenticate user and get JWT token | No |

### Books Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/books` | Get user's books with filtering/pagination | Yes |
| GET | `/api/v1/books/:id` | Get specific book by ID (user's books only) | Yes |
| POST | `/api/v1/books` | Create new book with optional cover image | Yes |
| PUT | `/api/v1/books/:id` | Update book (user's books only) | Yes |
| DELETE | `/api/v1/books/:id` | Delete book (user's books only) | Yes |

### Query Parameters for GET /api/v1/books

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)  
- `sortBy` - Field to sort by (`title`, `author`, `year`, `createdAt`, `updatedAt`)
- `sortOrder` - Sort order (`ASC` or `DESC`)
- `author` - Filter by author name
- `search` - Search in book titles


See more details in postman or api-doc!

## 🔧 Configuration

### Environment Variables

Create environment properly:

```bash
NODE_ENV=development
PORT=3000

DB_HOST=books_api_postgres
DB_PORT=5432
DB_USERNAME=books_user
DB_PASSWORD=securepassword
DB_DATABASE=books_dev

POSTGRES_DB=books_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=securepassword


MINIO_ENDPOINT=localhost:9000
MINIO_ROOT_USER=root
MINIO_ROOT_PASSWORD=rootpassword
MINIO_BUCKET=cantest
MINIO_USE_SSL=false
MINIO_PUBLIC_ENDPOINT=http://localhost:9000
MINIO_INTERNAL_ENDPOINT=books-api-minio:9000
MINIO_USE_PUBLIC_ACCESS=true


JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
```

### Docker Configuration

The project uses separate Dockerfiles:

- `compose/node/Dockerfile` - Node.js application
- `compose/postgres/Dockerfile` - PostgreSQL with initialization

If you change the db name or db user update the SQL commands in this Dockerfile.

## Testing the API

List of example commands below to test our api.

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov

# Run books service tests
npm test -- --testPathPattern=books.service.spec.ts

# Run auth service tests  
npm test -- --testPathPattern=auth.service.spec.ts

# Run all service tests
npm test -- --testPathPattern=service.spec.ts

# Run with coverage
npm test -- --coverage --testPathPattern=service.spec.ts
```

## Migration

```bash
# Generate migration
npm run migration:generate -- --name CreateBookTable

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Security

- JWT-based authentication
- Role-based authorization (admin, librarian, user)
- Input validation and sanitization
- SQL injection prevention via TypeORM
- CORS configuration

## Monitoring

- Basic Health check endpoint: `/api/v1/health`
- Structured logging with configurable levels
- Request/response logging middleware
- Database query logging (debug mode)

## Deployment

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Use below command for prod**
   ```bash
    pm2 start ecosystem.config.js

    pm2 save

    pm2 startup
   ```

