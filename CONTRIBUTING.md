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
- VS Code 1.107.0 or higher
- Git
- Basic knowledge of JavaScript and QBasic

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
   npm run lint        # Should pass
   npm run test:compiler  # Should pass all tests
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
   npm run lint           # Check code style
   npm run test:compiler  # Run transpiler tests
   npm run test:features  # Run feature tests
   npm test              # Run all tests
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
npm test                 # All tests
npm run test:compiler    # Transpiler only
npm run test:features    # Features only
npm run benchmark        # Performance tests
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
- [ ] Increase test coverage
- [ ] Add more interactive tutorials
- [ ] Improve error messages
- [ ] Performance optimizations
- [ ] Documentation improvements

### Feature Requests
- [ ] Additional QB64 compatibility
- [ ] More graphics modes
- [ ] Debugging support
- [ ] Source maps
- [ ] TypeScript migration

### Bug Fixes
- Check GitHub Issues for open bugs
- Reproduce the issue
- Write a test that fails
- Fix the bug
- Verify test passes

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
