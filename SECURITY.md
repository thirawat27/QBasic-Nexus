# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.5.x   | :white_check_mark: |
| < 1.5   | :x:                |

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

### Last Audit: March 10, 2026
- **Vulnerabilities Found**: 0
- **Status**: ✅ PASS

### Checks Performed
- ✅ No command injection
- ✅ No code injection
- ✅ No path traversal
- ✅ No resource exhaustion
- ✅ No memory leaks
- ✅ Input validation everywhere
- ✅ Proper error handling
- ✅ Safe file operations

## Dependencies Security

### Production Dependencies
All production dependencies are actively maintained and regularly updated:
- moo: Lexer (no known vulnerabilities)
- flru: Cache (no known vulnerabilities)
- magic-string: Code manipulation (no known vulnerabilities)
- mitt: Event emitter (no known vulnerabilities)
- defu: Config merging (no known vulnerabilities)
- @yao-pkg/pkg: Cross-platform executable packaging for the internal compiler

### Dev Dependencies
Development dependencies are isolated and not included in production builds.

### Vulnerability Monitoring
- Regular `npm audit` checks
- Automated dependency updates
- Security advisories monitoring
- Prompt patching of issues

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

---

**Last Updated**: March 10, 2026
