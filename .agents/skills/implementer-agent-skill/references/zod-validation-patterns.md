# Zod Validation Patterns

Complete guide to Zod validation patterns for use cases, based on latest Context7 best practices.

---

## Core Principle: ALWAYS Use safeParse

**NEVER use `.parse()` in use cases** - it throws errors that are harder to handle.

**ALWAYS use `.safeParse()`** - it returns a discriminated union for clean error handling.

---

## Basic safeParse Pattern

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

// ❌ WRONG - throws, requires try-catch
try {
  const data = schema.parse(input)
} catch (error) {
  // Hard to extract structured errors
}

// ✅ CORRECT - returns result object
const result = schema.safeParse(input)

if (!result.success) {
  // result.error is ZodError with structured issues
  console.log(result.error.issues)
} else {
  // result.data is fully typed
  const data = result.data
}
```

---

## Discriminated Union Pattern

safeParse returns a discriminated union based on `success` property:

```typescript
const result = schema.safeParse(input)

// TypeScript knows the type based on success
if (!result.success) {
  // result.error: ZodError
  result.error.issues.forEach(issue => {
    console.log(`${issue.path}: ${issue.message}`)
  })
} else {
  // result.data: Inferred type
  const validated = result.data
  // TypeScript knows all properties exist
}
```

---

## Error Handling Patterns

### Pattern 1: Throw Custom Error

```typescript
import { z } from 'zod'

class ValidationError extends Error {
  constructor(
    message: string,
    public details: z.ZodFormattedError<any>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): T {
  const result = schema.safeParse(input)

  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.flatten()
    )
  }

  return result.data
}

// Usage
try {
  const data = validateInput(MySchema, rawInput)
  // Use validated data
} catch (error) {
  if (error instanceof ValidationError) {
    // Access structured errors
    console.log(error.details)
  }
}
```

### Pattern 2: Return Result Object

```typescript
type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodFormattedError<T> }

export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input)

  if (!result.success) {
    return {
      success: false,
      error: result.error.flatten(),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

// Usage
const result = validateSafe(MySchema, rawInput)

if (!result.success) {
  // Handle errors
  console.log(result.error.fieldErrors)
} else {
  // Use data
  console.log(result.data)
}
```

---

## Error Flattening

`.flatten()` creates a more usable error structure:

```typescript
const schema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().positive(),
})

const result = schema.safeParse({
  name: 'ab', // Too short
  email: 'invalid', // Not an email
  age: -5, // Not positive
})

if (!result.success) {
  const flattened = result.error.flatten()

  console.log(flattened)
  /*
  {
    formErrors: [],
    fieldErrors: {
      name: ['String must contain at least 3 character(s)'],
      email: ['Invalid email'],
      age: ['Number must be greater than 0']
    }
  }
  */
}
```

### Using Flattened Errors

```typescript
if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flatten()

  // Field-level errors
  if (fieldErrors.email) {
    console.log('Email errors:', fieldErrors.email.join(', '))
  }

  // Form-level errors (from refinements)
  if (formErrors.length > 0) {
    console.log('Form errors:', formErrors.join(', '))
  }
}
```

---

## Custom Error Messages

### Method 1: Message in Validator

```typescript
const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().positive('Age must be positive'),
})
```

### Method 2: Custom Error Map

```typescript
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === 'string') {
      return { message: 'Expected text, got something else' }
    }
  }

  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      return { message: `Text must be at least ${issue.minimum} characters` }
    }
  }

  return { message: ctx.defaultError }
}

const schema = z.object({
  name: z.string().min(3),
}).setErrorMap(customErrorMap)
```

---

## Refinements and Custom Validation

### Simple Refinement

```typescript
const schema = z.string().refine(
  (val) => val.length > 10,
  (val) => ({ message: `"${val}" is not more than 10 characters` })
)

const result = schema.safeParse('short')

if (!result.success) {
  console.log(result.error.issues[0].message)
  // "short" is not more than 10 characters
}
```

### Multiple Validations with superRefine

```typescript
const schema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  // Check password strength
  if (data.password.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 8,
      type: 'string',
      inclusive: true,
      message: 'Password must be at least 8 characters',
      path: ['password'],
    })
  }

  // Check password match
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
  }
})
```

### Complex Business Rule Refinement

```typescript
const TaskCreateSchema = z.object({
  title: z.string().min(1),
  dueDate: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  estimatedHours: z.number().positive().optional(),
}).superRefine((data, ctx) => {
  // Business rule: High priority tasks must have due date
  if (data.priority === 'high' && !data.dueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'High priority tasks must have a due date',
      path: ['dueDate'],
    })
  }

  // Business rule: Due date cannot be in the past
  if (data.dueDate && data.dueDate < new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Due date cannot be in the past',
      path: ['dueDate'],
    })
  }

  // Business rule: Tasks with estimates must be medium or high priority
  if (data.estimatedHours && data.priority === 'low') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Low priority tasks cannot have time estimates',
      path: ['estimatedHours'],
    })
  }
})
```

---

## Catch Pattern (Fallback Values)

### Static Fallback

```typescript
const numberWithCatch = z.number().catch(42)

numberWithCatch.parse(5) // => 5
numberWithCatch.parse('invalid') // => 42 (fallback)
```

### Dynamic Fallback with Error Context

```typescript
const numberWithRandomCatch = z.number().catch((ctx) => {
  console.log('Caught error:', ctx.error)
  return Math.random()
})

numberWithRandomCatch.parse('invalid') // => 0.123... (random)
```

---

## Validation in Use Cases

### Standard Pattern

```typescript
import { EntityCreateSchema } from '../entities'

export async function createEntity(
  input: unknown,
  userId: string,
  service: EntityService
): Promise<Entity> {
  // 1. Validate with safeParse
  const result = EntityCreateSchema.safeParse(input)

  if (!result.success) {
    throw new ValidationError(
      'Invalid entity data',
      result.error.flatten()
    )
  }

  const validated = result.data

  // 2. Use validated data (fully typed)
  const entity = await service.create(validated)

  return entity
}
```

### Validation + Business Rules

```typescript
export async function createTask(
  input: unknown,
  userId: string,
  service: TaskService
): Promise<Task> {
  // 1. Validate schema
  const result = TaskCreateSchema.safeParse(input)

  if (!result.success) {
    throw new ValidationError(
      'Invalid task data',
      result.error.flatten()
    )
  }

  const validated = result.data

  // 2. Additional business rules (not in schema)
  const prohibitedWords = ['spam', 'test', 'delete']
  if (prohibitedWords.some(word => validated.title.toLowerCase().includes(word))) {
    throw new BusinessRuleError('Title contains prohibited words')
  }

  // 3. Proceed with creation
  return await service.create(validated)
}
```

---

## Partial Schemas for Updates

```typescript
// Full schema
const EntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Create schema (omit auto-generated fields)
const EntityCreateSchema = EntitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Update schema (partial, omit immutable fields)
const EntityUpdateSchema = EntitySchema.omit({
  id: true,
  createdAt: true,
}).partial()

// Usage in update use case
export async function updateEntity(id: string, input: unknown) {
  const result = EntityUpdateSchema.safeParse(input)

  if (!result.success) {
    throw new ValidationError('Invalid update data', result.error.flatten())
  }

  const validated = result.data
  // validated is Partial<Omit<Entity, 'id' | 'createdAt'>>

  return await service.update(id, validated)
}
```

---

## Query Validation

```typescript
const EntityQuerySchema = z.object({
  // Filters
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional(),
  organizationId: z.string().uuid().optional(),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export async function listEntities(query: unknown) {
  const result = EntityQuerySchema.safeParse(query)

  if (!result.success) {
    throw new ValidationError('Invalid query parameters', result.error.flatten())
  }

  const validated = result.data
  // Defaults are applied automatically

  return await service.list(validated)
}
```

---

## Type Inference

```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
})

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>

// User is equivalent to:
// {
//   id: string
//   name: string
//   email: string
//   role: 'admin' | 'user'
// }

// Use in function signatures
export async function getUser(id: string): Promise<User> {
  const result = await service.getById(id)
  const validated = UserSchema.parse(result) // OK to use parse here (trusting service)
  return validated
}
```

---

## Common Mistakes to Avoid

### ❌ Using .parse() in Use Cases

```typescript
// ❌ WRONG - Throws ZodError
export async function createEntity(input: unknown) {
  const validated = EntityCreateSchema.parse(input) // Throws!
  // ...
}
```

```typescript
// ✅ CORRECT - Returns result
export async function createEntity(input: unknown) {
  const result = EntityCreateSchema.safeParse(input)

  if (!result.success) {
    throw new ValidationError('Invalid input', result.error.flatten())
  }

  const validated = result.data
  // ...
}
```

### ❌ Not Flattening Errors

```typescript
// ❌ WRONG - Raw error structure is complex
if (!result.success) {
  throw new ValidationError('Invalid input', result.error) // ZodError
}
```

```typescript
// ✅ CORRECT - Flattened errors are easier to use
if (!result.success) {
  throw new ValidationError('Invalid input', result.error.flatten())
}
```

### ❌ Ignoring Error Details

```typescript
// ❌ WRONG - Loses structured error information
if (!result.success) {
  throw new Error('Validation failed') // No details!
}
```

```typescript
// ✅ CORRECT - Preserves error details
if (!result.success) {
  throw new ValidationError(
    'Validation failed',
    result.error.flatten()
  )
}
```

---

## Best Practices Summary

1. **ALWAYS use safeParse** in use cases (never parse)
2. **Flatten errors** with `.flatten()` for better structure
3. **Create custom error types** to wrap ZodError
4. **Use refinements** for complex business rules
5. **Infer types** from schemas (`z.infer<typeof Schema>`)
6. **Validate early** before any business logic
7. **Provide clear error messages** in validators
8. **Use partial schemas** for updates
9. **Apply defaults** in schemas when appropriate
10. **Test validation** thoroughly in unit tests

---

**Remember**: Zod validation is your first line of defense. Use safeParse for clean, type-safe error handling.
