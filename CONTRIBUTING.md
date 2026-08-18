# Contributing

Thank you for helping improve DeepSeek Time.

## Development Setup

Use Node.js 20 or newer:

```powershell
npm run build
npm run verify
```

The shared behavior belongs in `packages/core/`. Host-specific integration belongs in the matching adapter directory. After changing shared logic or the SVG source, regenerate all adapter output with `npm run build` and include the generated files in the change.

## Pull Requests

- Explain the host product and version affected by the change.
- Include focused tests for pricing-boundary or countdown behavior changes.
- Do not commit credentials, local profile paths, installed product directories, or generated machine state.
- Keep Hermes, DSH, and Codex behavior isolated to their adapters.
- Confirm `npm run verify` passes before opening a pull request.

## License

By contributing, you agree that your contribution is provided under the repository's MIT License.
