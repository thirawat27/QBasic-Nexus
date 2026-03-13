# Contributing to QBasic Nexus

Thank you for your interest in contributing to QBasic Nexus! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- VS Code 1.107.0 or higher
- Git 2.x or higher
- Basic knowledge of JavaScript and QBasic
- ESLint 10.x (installed via npm)

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
   npm run lint           # Should pass with 0 errors
   npm run test:compiler  # Should pass 10/10 tests
   npm run test:variables # Should pass 52/52 tests
   npm run test:features  # Should pass 21/21 tests
   npm test              # Should pass all 134 tests
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
   npm run lint              # Check code style (0 errors expected)
   npm run test:compiler     # Run transpiler tests (10/10)
   npm run test:variables    # Run variable tests (52/52)
   npm run test:features     # Run feature tests (21/21)
   npm run test:integration  # Run integration tests (47/47)
   npm run test:autodetect   # Run autodetect tests (4/4)
   npm test                  # Run all tests (134/134)
   npm run benchmark         # Run performance benchmarks (optional)
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
├── compiler/       # Compilation engine
├── providers/      # Language providers
├── managers/       # State managers
├── extension/      # Extension features
└── webview/        # CRT runtime
```

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
function testTranspiler() {
  const source = 'PRINT "Hello"';
  const result = transpile(source);

  if (!result.includes('console.log')) {
    throw new Error('PRINT not transpiled correctly');
  }

  console.log('✅ Test passed');
}
```

### Running Tests
```bash
npm test                    # All tests (134 total)
npm run test:compiler       # Transpiler tests (10 tests)
npm run test:variables      # Variable tests (52 tests)
npm run test:features       # Feature tests (21 tests)
npm run test:integration    # Integration tests (47 tests)
npm run test:autodetect     # Autodetect tests (4 tests)
npm run benchmark           # Performance benchmarks
npm run test:all            # All tests + benchmarks
```

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
- [ ] Increase test coverage (currently 134 tests)
- [ ] Add more interactive tutorials (currently 150 lessons)
- [ ] Improve error messages and diagnostics
- [ ] Performance optimizations (cache, linting)
- [ ] Documentation improvements and translations
- [ ] Add more code snippets
- [ ] Improve QB64 auto-detection

### Feature Requests
- [ ] Additional QB64 compatibility features
- [ ] More graphics modes support
- [ ] Debugging support with breakpoints
- [ ] Source maps for better error tracking
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
4. Create git tag
5. Build package: `npm run package`
6. Test package locally
7. Publish: `npm run publish`

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

---

**Thank you for contributing to QBasic Nexus!** 🚀

Your contributions help make this the best QBasic/QB64 development environment for VS Code.
