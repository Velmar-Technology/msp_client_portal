# Error Handling Guide

Comprehensive guide to error handling across use cases, API endpoints, and service orchestration.

---

## Core Principles

1. **Type-safe errors** - Use custom error classes
2. **Error context** - Always include meaningful messages
3. **Layer separation** - Different error types for different layers
4. **HTTP mapping** - Business errors → HTTP status codes
5. **User-friendly messages** - Clear, actionable error messages

---

## Custom Error Types

### Base Error Types

```typescript
/**
 * Validation error - Input doesn't match schema
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: z.ZodFormattedError<any>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Authorization error - User lacks permissions
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found error - Resource doesn't exist
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * Business rule error - Domain constraint violation
 */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BusinessRuleError'
  }
}

/**
 * Conflict error - Resource state conflict
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
```

### Extended Error Types

```typescript
/**
 * Database error - Service layer issues
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

/**
 * External API error - Third-party service issues
 */
export class ExternalAPIError extends Error {
  constructor(
    message: string,
    public service: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ExternalAPIError'
  }
}
```

---

## Error Handling in Use Cases

### Validation Errors

```typescript
import { ValidationError } from './errors'
import { EntityCreateSchema } from '../entities'

export async function createEntity(input: unknown, ...) {
  // Validate input
  const result = EntityCreateSchema.safeParse(input)

  if (!result.success) {
    throw new ValidationError(
      'Invalid entity data',
      result.error.flatten()
    )
  }

  const validated = result.data
  // Proceed...
}
```

### Business Rule Errors

```typescript
import { BusinessRuleError } from './errors'

export async function createTask(input: TaskCreate, ...) {
  const validated = validateInput(TaskCreateSchema, input)

  // Business rule: Due date cannot be in the past
  if (validated.dueDate && validated.dueDate < new Date()) {
    throw new BusinessRuleError('Due date cannot be in the past')
  }

  // Business rule: High priority tasks must have estimates
  if (validated.priority === 'high' && !validated.estimatedHours) {
    throw new BusinessRuleError(
      'High priority tasks must have time estimates'
    )
  }

  // Proceed...
}
```

### Authorization Errors

```typescript
import { AuthorizationError, NotFoundError } from './errors'

export async function updateEntity(id: string, input: unknown, userId: string, ...) {
  // Fetch existing entity
  const existing = await service.getById(id)

  if (!existing) {
    throw new NotFoundError(`Entity with ID ${id} not found`)
  }

  // Check ownership
  if (existing.userId !== userId) {
    throw new AuthorizationError(
      'You do not have permission to update this entity'
    )
  }

  // Proceed with update...
}
```

### Service Error Wrapping

```typescript
export async function createEntity(input: EntityCreate, userId: string, service: EntityService) {
  const validated = validateInput(EntityCreateSchema, input)

  try {
    const entity = await service.create(validated)
    return entity
  } catch (error) {
    // Wrap service errors with business context
    if (error.code === '23505') {
      // Unique constraint violation
      throw new ConflictError('An entity with this name already exists')
    }

    throw new Error(`Failed to create entity: ${error.message}`)
  }
}
```

---

## Error Handling in API Endpoints

### Error Mapping Function

```typescript
import { NextResponse } from 'next/server'
import {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  BusinessRuleError,
  ConflictError,
} from '@/features/{feature}/use-cases/errors'

/**
 * Map business errors to HTTP responses
 */
export function handleError(error: unknown): NextResponse {
  // Log for debugging (sanitize in production)
  console.error('API Error:', error)

  // Validation errors → 400 Bad Request
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details
        }
      },
      { status: 400 }
    )
  }

  // Authorization errors → 403 Forbidden
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: error.message
        }
      },
      { status: 403 }
    )
  }

  // Not found errors → 404 Not Found
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      },
      { status: 404 }
    )
  }

  // Business rule errors → 422 Unprocessable Entity
  if (error instanceof BusinessRuleError) {
    return NextResponse.json(
      {
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: error.message
        }
      },
      { status: 422 }
    )
  }

  // Conflict errors → 409 Conflict
  if (error instanceof ConflictError) {
    return NextResponse.json(
      {
        error: {
          code: 'CONFLICT',
          message: error.message
        }
      },
      { status: 409 }
    )
  }

  // Generic server error → 500 Internal Server Error
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    },
    { status: 500 }
  )
}
```

### Usage in API Route

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createEntity } from '@/features/{feature}/use-cases/createEntity'
import { handleError } from './errors'

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { user } = await getAuthenticatedUser(request)

    // Parse request
    const body = await request.json()

    // Call use case
    const result = await createEntity(body, user.id, entityService)

    // Return success
    return NextResponse.json({ data: result }, { status: 201 })

  } catch (error) {
    // Map error to HTTP response
    return handleError(error)
  }
}
```

---

## Error Response Format

### Standard Format

```typescript
{
  "error": {
    "code": "ERROR_CODE",        // Machine-readable code
    "message": "Human message",   // User-facing message
    "details": {}                 // Optional structured details
  }
}
```

### Examples

**Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid task data",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "title": ["String must contain at least 1 character(s)"],
        "dueDate": ["Invalid date"]
      }
    }
  }
}
```

**Authorization Error:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to update this task"
  }
}
```

**Not Found Error:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task with ID task-123 not found"
  }
}
```

**Business Rule Error:**
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Due date cannot be in the past"
  }
}
```

---

## HTTP Status Codes

### Success (2xx)

```typescript
200 // OK - Successful GET, PATCH, DELETE
201 // Created - Successful POST
204 // No Content - Successful DELETE (no body)
```

### Client Errors (4xx)

```typescript
400 // Bad Request - Validation error
401 // Unauthorized - No authentication
403 // Forbidden - No authorization
404 // Not Found - Resource doesn't exist
409 // Conflict - Resource state conflict
422 // Unprocessable Entity - Business rule violation
429 // Too Many Requests - Rate limit exceeded
```

### Server Errors (5xx)

```typescript
500 // Internal Server Error - Unexpected error
502 // Bad Gateway - External service error
503 // Service Unavailable - Temporary unavailability
```

---

## Async Error Handling

### Try-Catch Pattern

```typescript
export async function createEntity(
  input: EntityCreate,
  userId: string,
  service: EntityService
): Promise<Entity> {
  try {
    const entity = await service.create(input)
    return entity
  } catch (error) {
    // Handle specific error types
    if (error.code === '23505') {
      throw new ConflictError('Entity already exists')
    }

    if (error.code === '23503') {
      throw new BusinessRuleError('Referenced resource not found')
    }

    // Re-throw with context
    throw new Error(`Failed to create entity: ${error.message}`)
  }
}
```

### Error Wrapper Utility

```typescript
/**
 * Execute async operation with error context
 */
async function withErrorContext<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    throw new Error(`${operation} failed: ${error.message}`)
  }
}

// Usage
export async function createEntity(...) {
  return withErrorContext(
    'Create entity',
    () => service.create(validated)
  )
}
```

---

## Error Propagation

### From Service to Use Case

```typescript
// Service layer (throws raw errors)
export class TaskService {
  async create(data: TaskCreate): Promise<Task> {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Insert failed', error.code, error)
    }

    return task
  }
}

// Use case (wraps with business context)
export async function createTask(input: TaskCreate, ...) {
  try {
    return await taskService.create(input)
  } catch (error) {
    if (error instanceof DatabaseError && error.code === '23505') {
      throw new ConflictError('A task with this name already exists')
    }

    throw new Error(`Failed to create task: ${error.message}`)
  }
}
```

### From Use Case to API

```typescript
// Use case (throws business errors)
export async function createTask(...) {
  if (validated.dueDate < new Date()) {
    throw new BusinessRuleError('Due date cannot be in the past')
  }

  return await taskService.create(validated)
}

// API endpoint (maps to HTTP)
export async function POST(request: NextRequest) {
  try {
    const result = await createTask(body, user.id, taskService)
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    if (error instanceof BusinessRuleError) {
      return NextResponse.json(
        { error: { code: 'BUSINESS_RULE_VIOLATION', message: error.message } },
        { status: 422 }
      )
    }

    return handleError(error)
  }
}
```

---

## Testing Error Handling

### Test Use Case Errors

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createTask } from './createTask'
import { ValidationError, BusinessRuleError } from './errors'

describe('createTask errors', () => {
  it('throws ValidationError for invalid input', async () => {
    const invalidInput = { title: '' } // Empty title

    await expect(
      createTask(invalidInput, 'user-1', mockService)
    ).rejects.toThrow(ValidationError)
  })

  it('throws BusinessRuleError for past due date', async () => {
    const input = {
      title: 'Task',
      dueDate: new Date('2020-01-01') // Past date
    }

    await expect(
      createTask(input, 'user-1', mockService)
    ).rejects.toThrow(BusinessRuleError)

    await expect(
      createTask(input, 'user-1', mockService)
    ).rejects.toThrow('Due date cannot be in the past')
  })
})
```

### Test API Error Mapping

```typescript
import { POST } from './route'
import { ValidationError } from '@/features/tasks/use-cases/errors'

vi.mock('@/features/tasks/use-cases/createTask')

describe('POST /api/tasks error handling', () => {
  it('returns 400 for validation errors', async () => {
    vi.mocked(createTask).mockRejectedValue(
      new ValidationError('Invalid data', {
        formErrors: [],
        fieldErrors: { title: ['Required'] }
      })
    )

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details.fieldErrors.title).toBeDefined()
  })
})
```

---

## Best Practices

### 1. Use Specific Error Types

```typescript
// ❌ WRONG - Generic error
throw new Error('Operation failed')

// ✅ CORRECT - Specific error type
throw new ValidationError('Invalid input', validationDetails)
throw new AuthorizationError('Permission denied')
throw new NotFoundError('Resource not found')
```

### 2. Include Context in Messages

```typescript
// ❌ WRONG - Vague message
throw new NotFoundError('Not found')

// ✅ CORRECT - Specific context
throw new NotFoundError(`Task with ID ${id} not found`)
```

### 3. Preserve Error Chain

```typescript
// ❌ WRONG - Lose original error
try {
  await service.create(data)
} catch (error) {
  throw new Error('Failed')
}

// ✅ CORRECT - Include original message
try {
  await service.create(data)
} catch (error) {
  throw new Error(`Failed to create: ${error.message}`)
}
```

### 4. Don't Leak Sensitive Information

```typescript
// ❌ WRONG - Expose internal details
throw new Error(`Database error: ${dbError.query}`)

// ✅ CORRECT - Generic public message
throw new Error('Failed to process request')
// Log detailed error server-side only
```

### 5. Handle All Error Paths

```typescript
// ✅ Test all error scenarios
it('handles validation errors', ...)
it('handles not found errors', ...)
it('handles authorization errors', ...)
it('handles service errors', ...)
it('handles unexpected errors', ...)
```

---

## Error Logging

### Development

```typescript
export function handleError(error: unknown): NextResponse {
  // Detailed logging in development
  console.error('API Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    details: error.details,
  })

  // Return appropriate response...
}
```

### Production

```typescript
export function handleError(error: unknown): NextResponse {
  // Sanitized logging in production
  console.error('API Error:', {
    type: error.name,
    message: error.message,
    // Omit stack trace and sensitive data
  })

  // Generic error message to user
  if (!(error instanceof ValidationError) &&
      !(error instanceof AuthorizationError) &&
      !(error instanceof NotFoundError)) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }

  // Return specific errors as-is
}
```

---

## Common Mistakes to Avoid

### ❌ Silent Failures

```typescript
// ❌ WRONG - Swallow errors
try {
  await service.create(data)
} catch (error) {
  // Do nothing
}
```

### ❌ Generic Error Messages

```typescript
// ❌ WRONG
throw new Error('Error')
throw new Error('Something went wrong')
```

### ❌ Exposing Stack Traces to Users

```typescript
// ❌ WRONG - Leak internal details
return NextResponse.json({ error: error.stack }, { status: 500 })
```

### ❌ Inconsistent Error Format

```typescript
// ❌ WRONG - Different formats
return NextResponse.json({ error: 'Message' })
return NextResponse.json({ message: 'Message' })
return NextResponse.json({ errors: ['Message'] })
```

---

## Summary

1. **Use custom error classes** for type safety
2. **Include meaningful context** in error messages
3. **Map business errors to HTTP status codes** consistently
4. **Preserve error chains** when wrapping errors
5. **Test all error paths** thoroughly
6. **Log errors appropriately** (detailed in dev, sanitized in prod)
7. **Never expose sensitive data** in error responses
8. **Use consistent error format** across all endpoints

---

**Remember**: Good error handling makes debugging easier and provides better user experience.
