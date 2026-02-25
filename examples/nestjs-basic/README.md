# CourseKit NestJS Basic Example

Minimal NestJS application demonstrating `@hfu.digital/coursekit-nestjs` with in-memory storage adapters.

## Running

```bash
# From the monorepo root
bun install
bun run build

# Run the example
cd examples/nestjs-basic
bun run start
```

## What This Demonstrates

- `CourseKitModule.register()` with in-memory storage adapters
- Creating events and rooms via domain services
- Materializing recurring events
- Running conflict detection
- Finding free slots
