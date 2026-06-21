# Implementer Agent Skill References

References are loaded **on demand** when specific technical guidance is needed.

## Available References

1. **use-case-patterns.md** - Complete use case implementation templates
   - When to consult: Creating or refactoring use cases
   - Contains: CRUD templates, validation helpers, authorization patterns

2. **zod-validation-patterns.md** - Zod safeParse best practices
   - When to consult: Implementing input validation
   - Contains: safeParse patterns, error flattening, custom refinements

3. **api-endpoint-patterns.md** - Next.js API Route templates
   - When to consult: Creating API route handlers
   - Contains: NextRequest/NextResponse, authentication, error mapping

4. **error-handling-guide.md** - Error handling strategies
   - When to consult: Implementing error propagation
   - Contains: Custom error types, HTTP status mapping, error context

## Update Policy

References should be refreshed when:
- Context7 documentation changes (Zod, Next.js, TypeScript)
- New best practices emerge
- Technology versions change (Next.js 14+, Zod 3+)
- Common mistakes are identified in agent usage
