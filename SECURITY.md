# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.5.x   | :white_check_mark: |
| 1.4.x   | :white_check_mark: |
| < 1.4   | :x:                |

## Security Features

### Input Validation
- All user inputs are validated before processing
- Type checking and conversion
- Null/undefined guards
- Empty input handling

### Shell Command Safety
- Platform-specific escaping (Windows/POSIX)
- No command injection vulnerabilities
- Proper quote handling
- Safe path construction

### Resource Limits
- VFS size limit: 10MB
- Image buffer limits: 50 buffers, 500K pixels
- Audio oscillator limits: 8 concurrent
- Span pool limits: 500 total
- Iteration limits in graphics operations

### Memory Management
- Automatic cleanup on document close
- Proper disposal of VS Code resources
- Object pooling to reduce GC pressure
- No memory leaks

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. **DO NOT** open a public GitHub issue
2. Email the maintainer directly (see package.json for contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline
- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity
  - Critical: Within 24-48 hours
  - High: Within 7 days
  - Medium: Within 30 days
  - Low: Next release cycle

## Security Best Practices

### For Users
- Keep the extension updated
- Use latest VS Code version
- Review QB64 compiler path settings
- Don't run untrusted QBasic code
- Check file permissions

### For Contributors
- Follow secure coding guidelines
- Validate all inputs
- Use parameterized commands
- Avoid eval() and similar functions
- Test security implications
- Document security considerations

## Known Security Considerations

### QB64 Mode
- Executes native code on your system
- Has full system access
- Only use trusted QB64 installations
- Verify compiler path is correct

### Internal Transpiler Mode
- Sandboxed JavaScript execution
- Limited system access
- Virtual file system only
- Safe for untrusted code

### CRT Viewer Mode
- Runs in webview sandbox
- No system access
- Safe for demonstrations
- Limited to browser capabilities

## Security Audit Results

### Last Audit: March 13, 2026
- **Version Audited**: 1.5.3
- **Vulnerabilities Found**: 0
- **Critical Bugs Fixed**: 4
- **Status**: ✅ PASS

### Recent Security Fixes (v1.5.3)
- ✅ Fixed regex escape bug that could cause incorrect symbol matching
- ✅ Fixed stateful regex issue preventing proper Unicode normalization
- ✅ Added race condition protection in compilation process
- ✅ Fixed all ESLint warnings

### Checks Performed
- ✅ No command injection
- ✅ No code injection
- ✅ No path traversal
- ✅ No resource exhaustion
- ✅ No memory leaks
- ✅ Input validation everywhere
- ✅ Proper error handling
- ✅ Safe file operations
- ✅ No regex vulnerabilities
- ✅ Thread-safe compilation

## Dependencies Security

### Production Dependencies
All production dependencies are actively maintained and regularly updated:
- **@yao-pkg/pkg** (6.14.1): Cross-platform executable packaging
- **moo** (0.5.3): High-performance lexer (no known vulnerabilities)
- **flru** (1.0.2): Fast LRU cache (no known vulnerabilities)
- **magic-string** (0.30.21): Source code manipulation (no known vulnerabilities)
- **mitt** (3.0.1): Lightweight event emitter (no known vulnerabilities)
- **defu** (6.1.4): Configuration merging (no known vulnerabilities)

### Dev Dependencies
Development dependencies are isolated and not included in production builds:
- **@eslint/js** (10.0.1): Linting rules
- **eslint** (10.0.3): Code quality checker
- **globals** (17.4.0): Global variables definitions
- **@types/node** (25.x): TypeScript definitions
- **@types/vscode** (1.107.0): VS Code API types
- **@types/mocha** (10.0.10): Testing framework types

### Vulnerability Monitoring
- Regular `npm audit` checks (currently: 0 vulnerabilities)
- Automated dependency updates via Dependabot
- Security advisories monitoring
- Prompt patching of issues (within 24-48 hours for critical)
- GitHub Actions CI/CD with security scanning
- Continuous integration testing on every commit

## Compliance

### Data Privacy
- No telemetry or tracking
- No data collection
- No external network requests (except QB64 downloads)
- All data stays local

### License Compliance
- MIT License
- All dependencies properly licensed
- No license conflicts
- Attribution provided

## Contact

For security concerns, contact:
- GitHub: https://github.com/thirawat27/QBasic-Nexus/security
- Issues: https://github.com/thirawat27/QBasic-Nexus/issues

