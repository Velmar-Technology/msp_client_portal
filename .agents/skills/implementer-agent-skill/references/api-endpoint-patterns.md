# API Endpoint Patterns (Next.js App Router)

Complete guide to implementing Next.js API Route handlers as thin controllers, based on Context7 best practices.

---

## Core Principles

1. **Thin controllers** - NO business logic in API endpoints
2. **Orchestrate use cases** - Delegate all logic to use cases
3. **Authentication first** - Check auth before any processing
4. **Consistent errors** - Map business errors to HTTP status codes
5. **Standard format** - Use consistent request/response structure

---

## Basic Route Structure

### File: `app/api/{feature}/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createEntity } from '@/features/{feature}/use-cases/createEntity'
import { listEntities } from '@/features/{feature}/use-cases/listEntities'
import { createClient } from '@/lib/supabase-server'
import { entityService } from '@/features/{feature}/services/entity.service'

// POST /api/{feature}
export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      )
    }

    // 2. PARSE REQUEST
    const body = await request.json()

    // 3. CALL USE CASE (all business logic here)
    const result = await createEntity(body, user.id, entityService)

    // 4. RETURN SUCCESS
    return NextResponse.json(
      { data: result },
      { status: 201 }
    )

  } catch (error) {
    // 5. MAP ERRORS TO HTTP
    return handleError(error)
  }
}

// GET /api/{feature}
export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // 2. PARSE QUERY PARAMS
    const { searchParams } = new URL(request.url)
    const query = {
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      status: searchParams.get('status') || undefined,
    }

    // 3. CALL USE CASE
    const results = await listEntities(query, user.id, entityService)

    // 4. RETURN SUCCESS
    return NextResponse.json(
      { data: results },
      { status: 200 }
    )

  } catch (error) {
    return handleError(error)
  }
}
```

---

## Dynamic Route Structure

### File: `app/api/{feature}/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getEntity } from '@/features/{feature}/use-cases/getEntity'
import { updateEntity } from '@/features/{feature}/use-cases/updateEntity'
import { deleteEntity } from '@/features/{feature}/use-cases/deleteEntity'
import { createClient } from '@/lib/supabase-server'
import { entityService } from '@/features/{feature}/services/entity.service'

// GET /api/{feature}/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const result = await getEntity(params.id, user.id, entityService)

    return NextResponse.json(
      { data: result },
      { status: 200 }
    )

  } catch (error) {
    return handleError(error)
  }
}

// PATCH /api/{feature}/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()

    const result = await updateEntity(params.id, body, user.id, entityService)

    return NextResponse.json(
      { data: result },
      { status: 200 }
    )

  } catch (error) {
    return handleError(error)
  }
}

// DELETE /api/{feature}/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    await deleteEntity(params.id, user.id, entityService)

    return NextResponse.json(
      { data: { success: true } },
      { status: 200 }
    )

  } catch (error) {
    return handleError(error)
  }
}
```

---

## Error Handling Pattern

### Centralized Error Handler

```typescript
import { ValidationError, AuthorizationError, NotFoundError, BusinessRuleError } from '@/features/{feature}/use-cases/errors'

/**
 * Map business errors to HTTP responses
 */
function handleError(error: unknown): NextResponse {
  // Log error for debugging (remove sensitive data in production)
  console.error('API Error:', error)

  // Validation errors (400 Bad Request)
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details // ZodFormattedError
        }
      },
      { status: 400 }
    )
  }

  // Authorization errors (403 Forbidden)
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

  // Not found errors (404)
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

  // Business rule errors (422 Unprocessable Entity)
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

  // Generic server error (500)
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

---

## Authentication Pattern

### Extract User from Supabase

```typescript
/**
 * Get authenticated user or return 401 response
 */
async function getAuthenticatedUser(request: NextRequest): Promise<
  { user: User } | NextResponse
> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      },
      { status: 401 }
    )
  }

  return { user }
}

// Usage
export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request)

  // Check if error response
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  // Proceed with authenticated user
  const body = await request.json()
  const result = await createEntity(body, user.id, entityService)

  return NextResponse.json({ data: result }, { status: 201 })
}
```

---

## Request Parsing Patterns

### Parse JSON Body

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // body is unknown, validate in use case

  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON'
        }
      },
      { status: 400 }
    )
  }
}
```

### Parse Query Parameters

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const query = {
    // String params
    status: searchParams.get('status'),
    search: searchParams.get('search'),

    // Number params (with defaults)
    page: Number(searchParams.get('page')) || 1,
    limit: Math.min(Number(searchParams.get('limit')) || 20, 100),

    // Boolean params
    includeArchived: searchParams.get('includeArchived') === 'true',

    // Array params (comma-separated)
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
  }

  // Validate query in use case
  const results = await listEntities(query, user.id, entityService)

  return NextResponse.json({ data: results })
}
```

### Parse Headers

```typescript
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type')

  if (!contentType?.includes('application/json')) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json'
        }
      },
      { status: 415 }
    )
  }

  // Proceed with JSON parsing
}
```

---

## Response Format Patterns

### Success Response

```typescript
// Standard format
{
  "data": {
    // Entity or array of entities
  }
}

// Implementation
return NextResponse.json(
  { data: result },
  { status: 200 } // or 201 for created
)
```

### Error Response

```typescript
// Standard format
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {} // Optional, for validation errors
  }
}

// Implementation
return NextResponse.json(
  {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: validationErrors
    }
  },
  { status: 400 }
)
```

### Pagination Response

```typescript
// With metadata
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Implementation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page')) || 1
  const limit = Number(searchParams.get('limit')) || 20

  const { items, total } = await listEntities({ page, limit }, user.id, entityService)

  return NextResponse.json({
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
}
```

---

## HTTP Status Codes

Use appropriate status codes:

```typescript
// Success codes
200 // OK - Successful GET, PATCH, DELETE
201 // Created - Successful POST
204 // No Content - Successful DELETE (no body)

// Client error codes
400 // Bad Request - Validation error
401 // Unauthorized - No authentication
403 // Forbidden - No authorization
404 // Not Found - Resource doesn't exist
422 // Unprocessable Entity - Business rule violation

// Server error codes
500 // Internal Server Error - Unexpected error
```

---

## Testing API Endpoints

### Mock Use Cases

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/features/tasks/use-cases/createTask')
vi.mock('@/lib/supabase-server')

import { createTask } from '@/features/tasks/use-cases/createTask'
import { createClient } from '@/lib/supabase-server'

describe('POST /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock authenticated user
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as any)
  })

  it('creates task with valid data', async () => {
    const taskData = { title: 'Test Task', organizationId: 'org-1' }
    const createdTask = { id: 'task-1', ...taskData }

    vi.mocked(createTask).mockResolvedValue(createdTask)

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.data).toEqual(createdTask)
    expect(createTask).toHaveBeenCalledWith(taskData, 'user-123', expect.any(Object))
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error.code).toBe('UNAUTHORIZED')
  })
})
```

---

## Common Patterns

### Rate Limiting (Future)

```typescript
// Placeholder for rate limiting
// TODO: Implement with Redis or similar
async function checkRateLimit(userId: string): Promise<boolean> {
  // Check if user exceeded rate limit
  return true // For now, always allow
}

export async function POST(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request)

  if (!await checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
      { status: 429 }
    )
  }

  // Proceed...
}
```

### CORS Headers

```typescript
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
```

---

## Anti-Patterns to Avoid

### ❌ Business Logic in Endpoint

```typescript
// ❌ WRONG
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Business logic in endpoint!
  if (body.title.length < 3) {
    return NextResponse.json({ error: 'Title too short' }, { status: 400 })
  }

  const result = await service.create(body)
  return NextResponse.json({ data: result })
}
```

```typescript
// ✅ CORRECT
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Delegate ALL logic to use case
  const result = await createEntity(body, user.id, entityService)

  return NextResponse.json({ data: result }, { status: 201 })
}
```

### ❌ Direct Service Access

```typescript
// ❌ WRONG - Calling service directly
export async function POST(request: NextRequest) {
  const body = await request.json()

  const result = await entityService.create(body) // Skip use case!

  return NextResponse.json({ data: result })
}
```

```typescript
// ✅ CORRECT - Call use case
export async function POST(request: NextRequest) {
  const body = await request.json()

  const result = await createEntity(body, user.id, entityService)

  return NextResponse.json({ data: result })
}
```

### ❌ Inconsistent Error Format

```typescript
// ❌ WRONG - Different error formats
return NextResponse.json({ error: 'Something failed' }, { status: 500 })
return NextResponse.json({ message: 'Not found' }, { status: 404 })
return NextResponse.json({ errors: [...] }, { status: 400 })
```

```typescript
// ✅ CORRECT - Consistent format
return NextResponse.json({
  error: {
    code: 'ERROR_CODE',
    message: 'Human message',
    details: {} // Optional
  }
}, { status: statusCode })
```

---

## Best Practices Summary

1. **Keep endpoints thin** - All logic in use cases
2. **Authenticate first** - Check auth before any processing
3. **Validate in use cases** - Not in endpoints
4. **Use consistent format** - Standard request/response structure
5. **Map errors properly** - Business errors → HTTP status codes
6. **Handle edge cases** - Invalid JSON, missing headers, etc.
7. **Return appropriate status codes** - 200, 201, 400, 401, 403, 404, 500
8. **Test thoroughly** - Mock use cases, test all error paths
9. **Log errors** - For debugging (sanitize sensitive data)
10. **Never skip authentication** - Every endpoint must check auth

---

**Remember**: API endpoints are THIN CONTROLLERS. They orchestrate, they don't implement.
