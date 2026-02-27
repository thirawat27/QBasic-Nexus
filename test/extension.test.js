const assert = require('assert');
const vscode = require('vscode');

// Extension activation and basic functionality tests
suite('QBasic Nexus Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		const extension = vscode.extensions.getExtension('Thirawat27.qbasic-nexus');
		assert.ok(extension, 'Extension should be installed');
	});

	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('Thirawat27.qbasic-nexus');
		if (!extension.isActive) {
			await extension.activate();
		}
		assert.ok(extension.isActive, 'Extension should be activated');
	});

	test('Language support should be registered', async () => {
		// Check that the QBasic language is available
		const languages = await vscode.languages.getLanguages();
		assert.ok(languages.includes('qbasic'), 'QBasic language should be registered');
	});

	test('Commands should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		const qbasicCommands = commands.filter(cmd => cmd.startsWith('qbasic-nexus.'));
		
		assert.ok(qbasicCommands.length > 0, 'QBasic Nexus commands should be registered');
		assert.ok(qbasicCommands.includes('qbasic-nexus.compile'), 'Compile command should exist');
		assert.ok(qbasicCommands.includes('qbasic-nexus.compileAndRun'), 'Compile & Run command should exist');
	});
});

// Compiler module tests
suite('Compiler Module Tests', () => {
	const Transpiler = require('../src/compiler/transpiler');

	test('Transpiler should transpile simple PRINT statement', () => {
		const transpiler = new Transpiler();
		const code = 'PRINT "Hello World"';
		const result = transpiler.transpile(code, 'node');
		
		assert.ok(result.includes('Hello World'), 'Transpiled code should contain the string');
		assert.ok(result.includes('_print'), 'Transpiled code should use _print function');
	});

	test('Transpiler should handle variable assignment', () => {
		const transpiler = new Transpiler();
		const code = 'x = 10\nPRINT x';
		const result = transpiler.transpile(code, 'node');
		
		assert.ok(result.includes('let x'), 'Variable should be auto-declared');
		assert.ok(result.includes('x = 10'), 'Assignment should be preserved');
	});

	test('Transpiler should handle FOR loops', () => {
		const transpiler = new Transpiler();
		const code = 'FOR i = 1 TO 5\n  PRINT i\nNEXT i';
		const result = transpiler.transpile(code, 'node');
		
		assert.ok(result.includes('for'), 'Should generate for loop');
		assert.ok(result.includes('i'), 'Loop variable should be present');
	});

	test('Transpiler should handle IF statements', () => {
		const transpiler = new Transpiler();
		const code = 'IF x > 5 THEN\n  PRINT "Big"\nELSE\n  PRINT "Small"\nEND IF';
		const result = transpiler.transpile(code, 'node');
		
		assert.ok(result.includes('if'), 'Should generate if statement');
		assert.ok(result.includes('else'), 'Should generate else clause');
	});

	test('Transpiler should handle SUB definitions', () => {
		const transpiler = new Transpiler();
		const code = 'SUB MySub\n  PRINT "Hello"\nEND SUB';
		const result = transpiler.transpile(code, 'node');
		
		assert.ok(result.includes('async function MySub'), 'Should generate async function');
	});

	test('Transpiler should handle FUNCTION definitions', () => {
		const transpiler = new Transpiler();
		const code = 'FUNCTION Add(a, b)\n  Add = a + b\nEND FUNCTION';
		const result = transpiler.transpile(code, 'node');
		
		assert.ok(result.includes('async function Add'), 'Should generate async function');
		assert.ok(result.includes('return Add'), 'Should return function value');
	});
});

// Platform utilities tests
suite('Platform Utilities Tests', () => {
	const { IS_WIN, IS_MAC, IS_LINUX, getExecutableExtension, normalizePath } = require('../src/utils/pathUtils');

	test('Platform detection should work', () => {
		const platform = require('process').platform;
		
		if (platform === 'win32') {
			assert.strictEqual(IS_WIN, true, 'Should detect Windows');
		} else if (platform === 'darwin') {
			assert.strictEqual(IS_MAC, true, 'Should detect macOS');
		} else {
			assert.strictEqual(IS_LINUX, true, 'Should detect Linux');
		}
	});

	test('getExecutableExtension should return correct extension', () => {
		const ext = getExecutableExtension();
		if (IS_WIN) {
			assert.strictEqual(ext, '.exe', 'Windows should return .exe');
		} else {
			assert.strictEqual(ext, '', 'Unix should return empty string');
		}
	});

	test('normalizePath should normalize separators', () => {
		const path1 = normalizePath('C:/Users/test/file.txt');
		const path2 = normalizePath('C:\\Users\\test\\file.txt');
		
		// Both should result in the same normalized path
		assert.ok(path1.includes('Users'), 'Should preserve path components');
		assert.ok(path2.includes('Users'), 'Should preserve path components');
	});
});

// Language provider tests
suite('Language Provider Tests', () => {
	const { KEYWORDS, FUNCTIONS } = require('../languageData');

	test('KEYWORDS should contain essential keywords', () => {
		assert.ok(KEYWORDS.PRINT, 'Should have PRINT keyword');
		assert.ok(KEYWORDS.IF, 'Should have IF keyword');
		assert.ok(KEYWORDS.FOR, 'Should have FOR keyword');
		assert.ok(KEYWORDS.SUB, 'Should have SUB keyword');
		assert.ok(KEYWORDS.FUNCTION, 'Should have FUNCTION keyword');
	});

	test('FUNCTIONS should contain essential functions', () => {
		assert.ok(FUNCTIONS['MID$'], 'Should have MID$ function');
		assert.ok(FUNCTIONS['LEFT$'], 'Should have LEFT$ function');
		assert.ok(FUNCTIONS['LEN'], 'Should have LEN function');
		assert.ok(FUNCTIONS.ABS, 'Should have ABS function');
	});
});
