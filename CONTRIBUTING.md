# Contributing to QBasic Nexus

Thank you for your interest in contributing to QBasic Nexus! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## Getting Started

### Prerequisites
- Node.js 22.x or higher
- npm 9.x or higher
- VS Code 1.125.0 or higher
- Git 2.x or higher
- Basic knowledge of JavaScript and QBasic
- ESLint 10.x (installed via npm)
- For manual testing: QBNex 2.x (https://github.com/thirawat27/QBNex) and/or QB64-PE (https://qb64phoenix.com/). The extension builds, runs and checks programs only with these real compilers

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/QBasic-Nexus.git
   cd QBasic-Nexus
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Verify Setup**
   ```bash
   npm run lint           # Lint the project
   npm test               # Full CI-equivalent suite (includes pretest lint)
   ```

4. **Open in VS Code**
   ```bash
   code .
   ```

5. **Start Debugging**
   - Press `F5` to launch Extension Development Host
   - Test your changes in the new VS Code window

## Development Workflow

### Branch Strategy
- `main` - Stable, production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow coding standards (see below)
   - Write clear, descriptive commit messages
   - Add tests for new features
   - Update documentation

3. **Test Your Changes**
   ```bash
   npm run lint              # Check code style
   npm test                  # Run full suite (same command used in CI)
   npm run test:vscode       # End-to-end tests in a real VS Code (needs QBNEX_TEST_COMPILER)
   node test/test-toolchain.js  # Run one suite on its own (any test/test-*.js file)
   npm run benchmark         # Run editor performance benchmarks (optional)
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

## Coding Standards

### JavaScript Style
- Use ES6+ features
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Max line length: 100 characters
- Use JSDoc comments for functions

### Example
```javascript
/**
 * Compile QBasic source code
 * @param {string} source - QBasic source code
 * @returns {CompilationResult}
 */
function compile(source) {
  if (!source) {
    throw new Error('Source code is required');
  }
  // Implementation
}
```

### File Organization
```
src/
├── toolchain/      # QBNex/QB64 detection, builds, diagnostics, qb-lsp, qb-dap, qb-fmt
├── runner/         # Retro CRT panel and the qb-web loader
├── providers/      # Language providers
├── managers/       # State managers (tutorial, TODOs, ...)
├── extension/      # Extension features, commands, settings migration from 1.x
├── shared/         # Shared helpers (keyword catalog, document analysis)
├── tutorials/      # The 150 lessons
└── webview/        # Retro CRT and ASCII chart webviews
vendor/
└── qb-web/         # QBNex VM built to WebAssembly (GPL-3.0, refreshed with npm run sync:qb-web)
```

The extension never interprets BASIC itself: anything that compiles, runs or checks a program goes through `src/toolchain/` and a real compiler.

### Naming Conventions
- Files: `kebab-case.js`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: `_prefixWithUnderscore`

## Testing

### Writing Tests
- Place tests in `test/` directory
- Name test files: `test-*.js`
- Use descriptive test names
- Test both success and failure cases

### Example Test
```javascript
const { parseCompilerOutput } = require('../src/toolchain/diagnostics');

function testQb64Warning() {
  const [d] = parseCompilerOutput('game.bas:12:5: warning: unused variable (x)', {
    sourcePath: SRC,
    compiler: 'qb64',
  });

  if (d.line !== 11 || d.severity !== 'warning') {
    throw new Error('QB64 warning not parsed correctly');
  }

  console.log('✅ Test passed');
}
```

### Running Tests
```bash
npm test                    # Full suite (includes lint via pretest)
npm run test:vscode         # End-to-end tests in a real VS Code (needs QBNEX_TEST_COMPILER)
npm run benchmark           # Editor performance benchmarks
npm run sync:qb-web <path>  # Refresh vendor/qb-web from a QBNex checkout
```

`npm test` runs these suites in order: `test-toolchain`, `test-editor-features`, `test-deep`, `test-qb64-autodetect`, `test-workspace-multi`, `test-tutorial-manager`, `test-todo-provider`, `test-executable-utils`, `test-system-settings`, `test-hot-path-caches`, `test-config-cache` and `test-process-timeout` (all in `test/`).

Set `QBNEX_TEST_COMPILER` to the path of a QBNex `qb` to also run a test against the real compiler:

```bash
QBNEX_TEST_COMPILER=/path/to/qb npm test          # Linux/macOS
$env:QBNEX_TEST_COMPILER = "C:\path\to\qb.exe"; npm test   # PowerShell
```

`npm run test:vscode` runs end-to-end tests inside a real VS Code. It needs `QBNEX_TEST_COMPILER`; set `QBNEX_TEST_LSP` and `QBNEX_TEST_DAP` (paths to `qb-lsp` and `qb-dap`) to cover the language server and the debugger too, and `VSCODE_TEST_EXECUTABLE` to use an installed VS Code instead of downloading one.

## Documentation

### Code Documentation
- Add JSDoc comments to all public functions
- Explain complex algorithms
- Document parameters and return values
- Include usage examples

### User Documentation
- Update README.md for user-facing changes
- Add examples for new features
- Update configuration guide
- Keep troubleshooting section current

## Pull Request Process

### Before Submitting
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] Branch is up to date with main

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process
1. Automated checks run (linting, tests)
2. Code review by maintainer
3. Requested changes (if any)
4. Approval and merge

## Areas for Contribution

### High Priority
- [ ] Increase test coverage across toolchain/editor suites
- [ ] Add more interactive tutorials (currently 150 lessons)
- [ ] Improve how compiler errors and warnings are mapped into the Problems view
- [ ] Performance optimizations (editor providers, caches)
- [ ] Documentation improvements and translations
- [ ] Add more code snippets
- [ ] Improve QBNex and QB64 auto-detection

### Feature Requests
- [ ] More Retro CRT capabilities (qb-web), such as live keyboard input
- [ ] Better QB64 support in the editor features
- [ ] TypeScript migration (gradual)
- [ ] Multi-file project support
- [ ] Refactoring tools

### Bug Fixes
- Check GitHub Issues for open bugs
- Reproduce the issue locally
- Write a test that fails
- Fix the bug
- Verify test passes
- Submit PR with fix

## Performance Guidelines

### Optimization Priorities
1. **Correctness** - Code must work correctly
2. **Readability** - Code must be maintainable
3. **Performance** - Optimize hot paths only

### Performance Tips
- Use caching for expensive operations
- Lazy load heavy modules
- Batch DOM operations
- Use object pooling for frequently created objects
- Profile before optimizing

## Security Guidelines

### Security Checklist
- [ ] Validate all user inputs
- [ ] Escape shell commands properly
- [ ] Limit resource usage
- [ ] Handle errors gracefully
- [ ] No eval() or similar functions
- [ ] Safe file operations only

### Reporting Security Issues
- **DO NOT** open public issues for security vulnerabilities
- Email maintainer directly
- See SECURITY.md for details

## Release Process

### Version Numbering
- Major: Breaking changes (2.0.0)
- Minor: New features (1.6.0)
- Patch: Bug fixes (1.5.1)

### Release Checklist
1. Update version in package.json
2. Update CHANGELOG.md
3. Run all tests
4. Build package: `npm run package`
5. Test package locally (install the `.vsix` in VS Code)
6. Commit, then create and push a `v*` git tag matching the version (for example `v2.0.0`)
7. CI publishes the release to the VS Code Marketplace and Open VSX and attaches the `.vsix` to a GitHub release

### Releasing
The one-time setup (the `VSCE_PAT` and `OVSX_PAT` tokens) and the full release steps are in [docs/PUBLISHING.md](./docs/PUBLISHING.md). `npm run publish:vsce` and `npm run publish:ovsx` publish by hand when CI cannot.

## Getting Help

### Resources
- **Documentation**: README.md
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

### Questions
- Check existing issues first
- Search documentation
- Ask in GitHub Discussions
- Be specific and provide examples

## Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Credited in release notes
- Mentioned in README.md (for significant contributions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

`vendor/qb-web` is not part of that: it is the QBNex VM built to WebAssembly, licensed under GPL-3.0. Change it in the [QBNex repository](https://github.com/thirawat27/QBNex) and refresh the copy with `npm run sync:qb-web <QBNex checkout>`.

---

**Thank you for contributing to QBasic Nexus!** 🚀

Your contributions help make this the best QBasic/QB64 development environment for VS Code.
