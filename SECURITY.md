# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

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
- Compiler runs are stopped after `qbasic-nexus.externalBuildTimeoutMs` (default 5 minutes; `0` disables the guard)
- The Retro CRT runs programs on qb-web inside a webview, with no access to files, other programs or the network

### Untrusted Workspaces
- Compiler, language server, debugger and formatter paths and `compilerArgs` are read from user settings only, never from the workspace
- The qb-lsp language server is not started

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
- Review QBNex and QB64 compiler path settings
- Trust a workspace only when you trust its `.vscode/settings.json`
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

### QBNex and QB64 Builds
- The extension runs the compiler you installed (QBNex or QB64) and then the program it built
- Built programs execute natively on your system with full system access (files, network, `SHELL`)
- Only use trusted QBNex and QB64 installations
- Verify compiler paths are correct
- The QBNex tools qb-lsp, qb-dap and qb-fmt run as local processes, found next to the compiler or on `PATH`

### Retro CRT
- Runs the program's QIR on qb-web (the QBNex VM built to WebAssembly) in a webview sandbox
- No file, `SHELL` or network access
- Safe for demonstrations
- Limited to webview capabilities
- Still compiles with your local QBNex first (`qb --emit-ir`)

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
- **vscode-languageclient** (11.0.0): Language Server Protocol client for qb-lsp
- **flru** (1.0.2): Fast LRU cache (no known vulnerabilities)
- **mitt** (3.0.1): Lightweight event emitter (no known vulnerabilities)
- **defu** (6.1.7): Configuration merging (no known vulnerabilities)

### Bundled Components
- **qb-web** (`vendor/qb-web`, GPL-3.0): the QBNex VM built to WebAssembly, used by the Retro CRT; refreshed from QBNex with `npm run sync:qb-web`

### Dev Dependencies
Development dependencies are isolated and not included in production builds:
- **@eslint/js** (10.0.1): Linting rules
- **eslint** (10.15.0): Code quality checker
- **globals** (17.14.0): Global variables definitions
- **@types/node** (26.x): TypeScript definitions
- **@types/vscode** (1.125.0): VS Code API types
- **@vscode/vsce** (4.1.0) and **ovsx** (1.4.0): Packaging and publishing
- **tinybench** (6.2.3): Editor benchmarks

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
- No external network requests (compilers are installed by you; qb-web ships inside the extension)
- All data stays local

### License Compliance
- MIT License for the extension
- `vendor/qb-web` is GPL-3.0, distributed separately from the MIT-licensed extension code
- All dependencies properly licensed
- No license conflicts
- Attribution provided

## Contact

For security concerns, contact:
- GitHub: https://github.com/thirawat27/QBasic-Nexus/security
- Issues: https://github.com/thirawat27/QBasic-Nexus/issues

