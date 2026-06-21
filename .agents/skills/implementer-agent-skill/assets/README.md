# Implementer Agent Skill Assets

This directory contains templates and examples for the implementer-agent.

## Available Assets

Currently planned assets:
- `use-case-template.ts` - Boilerplate for standard use case
- `api-route-template.ts` - Boilerplate for Next.js API route
- `error-types-template.ts` - Standard error type definitions

## Usage Pattern

Assets are NOT loaded into context. They are:
- Copied by the agent when creating new files
- Modified to fit specific feature requirements
- Reference implementations demonstrating patterns

## Asset Organization

When adding assets:
1. Create minimal, well-commented templates
2. Include TypeScript types
3. Follow project conventions (no hardcoded strings, use safeParse, etc.)
4. Reference from SKILL.md as starting points
