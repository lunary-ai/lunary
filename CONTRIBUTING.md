## Development environment setup

1. Fork and clone the repository
2. Setup a PostgreSQL instance (version 15 minimum)
3. Copy the content of `packages/backend/.env.example` to `packages/backend/.env` and fill the missing values
4. Copy the content of `packages/frontend/.env.example` to `packages/backend/.env`
5. Run `bun install`
6. Run `bun run migrate:db`
7. Run `bun run dev`

You can now open the dashboard at `http://localhost:8080`. When using our JS or Python SDK, you need to set the environment variable `LUNARY_API_URL` to `http://localhost:3333`. You can use `LUNARY_VERBOSE=True` to see all the event sent by the SDK

## Contributing Guidelines

We welcome contributions to this project!

When contributing, please follow these guidelines:

- Before starting work on a new feature or bug fix, open an issue to discuss the proposed changes. This allows for coordination and avoids duplication of effort.
- Fork the repository and create a new branch for your changes. Use a descriptive branch name that reflects the purpose of your changes.
- Write clear, concise commit messages that describe the purpose of each commit.
- Make sure to update any relevant documentation, including README files and code comments.
- Make sure all tests pass before submitting a pull request.
- When submitting a pull request, provide a detailed description of your changes and reference any related issues.
- Be responsive to feedback and be willing to make changes to your pull request if requested.

Thank you for your contributions!
