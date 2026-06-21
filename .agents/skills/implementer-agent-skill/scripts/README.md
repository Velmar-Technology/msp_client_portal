# Implementer Agent Skill Scripts

This directory contains automation scripts for the implementer-agent.

## Available Scripts

Currently, no automation scripts are needed for the implementer-agent as:
- Use case implementation is highly contextual (business logic varies by feature)
- API endpoints follow patterns but require feature-specific logic
- Tests already provide the specification

## Future Script Candidates

If repetitive patterns emerge, consider adding:
- Code generation for standard CRUD use cases (once patterns stabilize)
- Validation helper boilerplate generator
- Error type definition generator

## Usage Pattern

When scripts are added:
1. Create executable script (Python/Bash/TypeScript)
2. Test thoroughly before bundling
3. Reference from SKILL.md with clear usage instructions
4. Include error handling and help text
