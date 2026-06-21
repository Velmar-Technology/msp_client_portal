# Use Case Implementation Patterns

Complete templates and patterns for implementing business logic use cases following Clean Architecture and TDD principles.

---

## Core Principles

1. **Pure business logic** - No database access, no UI concerns
2. **Dependency injection** - Services passed as parameters for testability
3. **Validation first** - Always use Zod safeParse
4. **Business rules** - Enforce domain constraints
5. **Authorization** - Check permissions before operations
6. **Error context** - Wrap service errors with business meaning

---

## Standard CRUD Templates

### CREATE Use Case

```typescript
import { z } from 'zod'
import { EntityCreateSchema, type Entity, type EntityCreate } from '../entities'
import type { EntityService } from '../services/entity.service'

// Custom error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: z.ZodFormattedError<any>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BusinessRuleError'
  }
}

/**
 * Create a new entity with validation and authorization
 *
 * @param input - Raw input data (unvalidated)
 * @param userId - Authenticated user ID
 * @param service - Data service (injected for testing)
 * @returns Created entity
 * @throws ValidationError - Input validation failed
 * @throws AuthorizationError - User not authorized
 * @throws BusinessRuleError - Business rule violation
 */
export async function createEntity(
  input: unknown,
  userId: string,
  service: EntityService
): Promise<Entity> {
  // 1. VALIDATE input with safeParse
  const result = EntityCreateSchema.safeParse(input)

  if (!result.success) {
    throw new ValidationError(
      'Invalid entity data',
      result.error.flatten()
    )
  }

  const validated = result.data

  // 2. APPLY BUSINESS RULES
  // Example: Due date cannot be in the past
  if (validated.dueDate && validated.dueDate < new Date()) {
    throw new BusinessRuleError('Due date cannot be in the past')
  }

  // Example: Name must not contain prohibited words
  const prohibitedWords = ['spam', 'test', 'delete']
  if (prohibitedWords.some(word => validated.name.toLowerCase().includes(word))) {
    throw new BusinessRuleError('Name contains prohibited words')
  }

  // 3. AUTHORIZATION
  // Example: User must belong to the organization
  if (!validated.organizationId) {
    throw new AuthorizationError('Organization ID required')
  }

  // Note: Organization membership check will be added when auth context is available
  // For now, trust that the organizationId is valid

  // 4. ORCHESTRATE service call
  try {
    const entity = await service.create({
      ...validated,
      userId, // Add user context
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return entity
  } catch (error) {
    // Wrap service errors with business context
    throw new Error(`Failed to create entity: ${error.message}`)
  }
}
```

---

### READ (Get by ID) Use Case

```typescript
import type { Entity } from '../entities'
import type { EntityService } from '../services/entity.service'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * Get entity by ID with authorization
 *
 * @param id - Entity ID
 * @param userId - Authenticated user ID
 * @param service - Data service
 * @returns Entity if found and authorized
 * @throws NotFoundError - Entity not found
 * @throws AuthorizationError - User not authorized to view
 */
export async function getEntity(
  id: string,
  userId: string,
  service: EntityService
): Promise<Entity> {
  // 1. FETCH entity
  const entity = await service.getById(id)

  // 2. CHECK existence
  if (!entity) {
    throw new NotFoundError(`Entity with ID ${id} not found`)
  }

  // 3. AUTHORIZATION
  // Example: User must be owner or in same organization
  const isOwner = entity.userId === userId
  // const isOrgMember = await checkOrgMembership(userId, entity.organizationId)

  if (!isOwner /* && !isOrgMember */) {
    throw new AuthorizationError(
      'You do not have permission to view this entity'
    )
  }

  return entity
}
```

---

### UPDATE Use Case

```typescript
import { z } from 'zod'
import { EntityUpdateSchema, type Entity, type EntityUpdate } from '../entities'
import type { EntityService } from '../services/entity.service'

/**
 * Update an existing entity
 *
 * @param id - Entity ID
 * @param input - Update data (partial)
 * @param userId - Authenticated user ID
 * @param service - Data service
 * @returns Updated entity
 * @throws ValidationError - Input validation failed
 * @throws NotFoundError - Entity not found
 * @throws AuthorizationError - User not authorized
 * @throws BusinessRuleError - Business rule violation
 */
export async function updateEntity(
  id: string,
  input: unknown,
  userId: string,
  service: EntityService
): Promise<Entity> {
  // 1. VALIDATE input
  const result = EntityUpdateSchema.safeParse(input)

  if (!result.success) {
    throw new ValidationError(
      'Invalid update data',
      result.error.flatten()
    )
  }

  const validated = result.data

  // 2. FETCH existing entity (for authorization)
  const existing = await service.getById(id)

  if (!existing) {
    throw new NotFoundError(`Entity with ID ${id} not found`)
  }

  // 3. AUTHORIZATION
  const isOwner = existing.userId === userId

  if (!isOwner) {
    throw new AuthorizationError(
      'You do not have permission to update this entity'
    )
  }

  // 4. APPLY BUSINESS RULES
  // Example: Cannot change status from 'completed' to 'pending'
  if (validated.status && existing.status === 'completed' && validated.status === 'pending') {
    throw new BusinessRuleError('Cannot reopen completed entity')
  }

  // 5. ORCHESTRATE update
  try {
    const updated = await service.update(id, {
      ...validated,
      updatedAt: new Date(),
    })

    return updated
  } catch (error) {
    throw new Error(`Failed to update entity: ${error.message}`)
  }
}
```

---

### DELETE Use Case

```typescript
import type { EntityService } from '../services/entity.service'

/**
 * Delete an entity (soft or hard delete)
 *
 * @param id - Entity ID
 * @param userId - Authenticated user ID
 * @param service - Data service
 * @throws NotFoundError - Entity not found
 * @throws AuthorizationError - User not authorized
 * @throws BusinessRuleError - Cannot delete (has dependencies)
 */
export async function deleteEntity(
  id: string,
  userId: string,
  service: EntityService
): Promise<void> {
  // 1. FETCH entity
  const entity = await service.getById(id)

  if (!entity) {
    throw new NotFoundError(`Entity with ID ${id} not found`)
  }

  // 2. AUTHORIZATION
  const isOwner = entity.userId === userId

  if (!isOwner) {
    throw new AuthorizationError(
      'You do not have permission to delete this entity'
    )
  }

  // 3. BUSINESS RULES
  // Example: Cannot delete if entity has active dependencies
  // const hasDependencies = await checkDependencies(id)
  // if (hasDependencies) {
  //   throw new BusinessRuleError('Cannot delete entity with active dependencies')
  // }

  // 4. ORCHESTRATE delete
  try {
    await service.delete(id)
  } catch (error) {
    throw new Error(`Failed to delete entity: ${error.message}`)
  }
}
```

---

### LIST/QUERY Use Case

```typescript
import { z } from 'zod'
import { EntityQuerySchema, type Entity, type EntityQuery } from '../entities'
import type { EntityService } from '../services/entity.service'

/**
 * List entities with filtering and pagination
 *
 * @param query - Query parameters (filters, pagination)
 * @param userId - Authenticated user ID
 * @param service - Data service
 * @returns List of entities
 * @throws ValidationError - Invalid query parameters
 */
export async function listEntities(
  query: unknown,
  userId: string,
  service: EntityService
): Promise<Entity[]> {
  // 1. VALIDATE query
  const result = EntityQuerySchema.safeParse(query)

  if (!result.success) {
    throw new ValidationError(
      'Invalid query parameters',
      result.error.flatten()
    )
  }

  const validated = result.data

  // 2. APPLY AUTHORIZATION FILTER
  // Automatically filter by user's organizations
  const authorizedQuery = {
    ...validated,
    userId, // Only show user's entities
    // OR: organizationIds: userOrgIds
  }

  // 3. ORCHESTRATE query
  try {
    const entities = await service.list(authorizedQuery)
    return entities
  } catch (error) {
    throw new Error(`Failed to list entities: ${error.message}`)
  }
}
```

---

## Validation Helper Pattern

Extract common validation logic:

```typescript
/**
 * Generic validation helper using safeParse
 */
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

// Usage in use cases
export async function createEntity(input: unknown, ...args) {
  const validated = validateInput(EntityCreateSchema, input)
  // ...
}
```

---

## Authorization Helper Pattern

Extract common authorization logic:

```typescript
/**
 * Check if user belongs to organization
 */
export async function ensureUserInOrganization(
  userId: string,
  organizationId: string,
  orgService: OrganizationService
): Promise<void> {
  const isMember = await orgService.checkMembership(userId, organizationId)

  if (!isMember) {
    throw new AuthorizationError(
      `User ${userId} is not a member of organization ${organizationId}`
    )
  }
}

/**
 * Check if user owns resource
 */
export function ensureOwnership(
  resource: { userId: string },
  userId: string
): void {
  if (resource.userId !== userId) {
    throw new AuthorizationError('You do not own this resource')
  }
}
```

---

## Service Orchestration Pattern

Coordinate multiple service calls:

```typescript
/**
 * Complex use case orchestrating multiple services
 */
export async function createProjectWithTasks(
  projectInput: unknown,
  taskInputs: unknown[],
  userId: string,
  projectService: ProjectService,
  taskService: TaskService
): Promise<{ project: Project; tasks: Task[] }> {
  // 1. Validate all inputs
  const validatedProject = validateInput(ProjectCreateSchema, projectInput)
  const validatedTasks = taskInputs.map(t => validateInput(TaskCreateSchema, t))

  // 2. Create project first
  const project = await projectService.create({
    ...validatedProject,
    userId,
  })

  // 3. Create tasks with project reference
  const tasks = await Promise.all(
    validatedTasks.map(task =>
      taskService.create({
        ...task,
        projectId: project.id,
        userId,
      })
    )
  )

  return { project, tasks }
}
```

---

## Error Handling Pattern

Wrap service errors with business context:

```typescript
/**
 * Standard error wrapper for service calls
 */
async function executeWithErrorContext<T>(
  operation: string,
  serviceCall: () => Promise<T>
): Promise<T> {
  try {
    return await serviceCall()
  } catch (error) {
    throw new Error(`${operation} failed: ${error.message}`)
  }
}

// Usage
export async function createEntity(...) {
  return executeWithErrorContext(
    'Create entity',
    () => service.create(validated)
  )
}
```

---

## Testing Considerations

Use cases are designed for easy testing:

```typescript
// Mock service
const mockService: EntityService = {
  create: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

// Test
it('creates entity with valid data', async () => {
  const input = { name: 'Test', organizationId: 'org-1' }
  const expected = { id: 'uuid', ...input }

  mockService.create.mockResolvedValue(expected)

  const result = await createEntity(input, 'user-1', mockService)

  expect(result).toEqual(expected)
  expect(mockService.create).toHaveBeenCalledWith(
    expect.objectContaining(input)
  )
})
```

---

## Common Patterns Summary

| Pattern | Purpose | Example |
|---------|---------|---------|
| **Validation First** | Ensure input safety | `safeParse()` before logic |
| **Dependency Injection** | Enable testing | Services as parameters |
| **Authorization Checks** | Enforce permissions | Check ownership/membership |
| **Business Rules** | Domain constraints | Validate business logic |
| **Error Wrapping** | Add context | Wrap service errors |
| **Helper Extraction** | DRY principle | Shared validation/auth |

---

**Remember**: Use cases are the HEART of your application. They contain ALL business logic and orchestrate everything else.
