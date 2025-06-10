const vscode = require("vscode");
const path = require("path");
const fs = require("fs").promises; 
const { spawn } = require("child_process");

const Constants = {
    CONFIG_SECTION: 'qbasic-nexus',
    COMPILER_PATH_KEY: 'compilerPath',
    COMPILER_ARGS_KEY: 'compilerArgs',
    COMMAND_COMPILE: 'qbasic-nexus.compile',
    COMMAND_COMPILE_AND_RUN: 'qbasic-nexus.compileAndRun',
    OUTPUT_CHANNEL_NAME: 'QBasic Nexus Compiler',
    TERMINAL_NAME: 'QBasic Nexus: Run Output',
    LANGUAGE_ID: 'qbasic'
};

let statusBarItem;
let _outputChannel; 
let _terminal;
let isCompiling = false;

// --- ฟังก์ชัน Debounce ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Getters สำหรับ OutputChannel และ Terminal (Lazy Initialization) ---
function getOutputChannel() {
    if (!_outputChannel) {
        _outputChannel = vscode.window.createOutputChannel(Constants.OUTPUT_CHANNEL_NAME);
    }
    return _outputChannel;
}

function getTerminal() {
    if (!_terminal || _terminal.exitStatus !== undefined) {
        _terminal = vscode.window.createTerminal({ name: Constants.TERMINAL_NAME });
    }
    return _terminal;
}

/**
 * ฟังก์ชันหลักที่ถูกเรียกเมื่อ Extension ถูกเปิดใช้งาน
 * @param {vscode.ExtensionContext} context - บริบทของ Extension
 */
async function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = Constants.COMMAND_COMPILE_AND_RUN;

    await initializeCompilerPath();

    const compileCommand = vscode.commands.registerCommand(Constants.COMMAND_COMPILE, () => {
        compileAndRun(false);
    });

    const compileAndRunCommand = vscode.commands.registerCommand(Constants.COMMAND_COMPILE_AND_RUN, () => {
        compileAndRun(true);
    });

    const debouncedUpdateStatusBarItem = debounce(updateStatusBarItem, 250);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(debouncedUpdateStatusBarItem),
        vscode.workspace.onDidChangeConfiguration(async e => {
            const configSection = Constants.CONFIG_SECTION;
            if (e.affectsConfiguration(configSection)) {
                if (e.affectsConfiguration(`${configSection}.${Constants.COMPILER_PATH_KEY}`)) {
                    await initializeCompilerPath();
                }
                updateStatusBarItem(); 
            }
        }),
        // [IMPROVEMENT] จัดการเมื่อผู้ใช้ปิด Terminal ด้วยตนเองเพื่อเพิ่มความเสถียร
        vscode.window.onDidCloseTerminal(closedTerminal => {
            if (_terminal && closedTerminal === _terminal) {
                _terminal = undefined;
            }
        }),
        statusBarItem,
        compileCommand,
        compileAndRunCommand
    );
    
    updateStatusBarItem();
}

/**
 * ฟังก์ชันสำหรับเริ่มต้นและตรวจสอบ Compiler Path
 */
async function initializeCompilerPath() {
    const outputChannel = getOutputChannel();
    const configuration = vscode.workspace.getConfiguration(Constants.CONFIG_SECTION);
    let userCompilerPath = configuration.get(Constants.COMPILER_PATH_KEY);

    if (!userCompilerPath) {
        outputChannel.appendLine("Compiler path not set. Attempting auto-detection...");
        await tryAutoDetectCompilerPath(outputChannel);
    } else {
        outputChannel.appendLine(`Using user-defined compiler path: ${userCompilerPath}`);
    }
    updateStatusBarItem();
}

/**
 * พยายามค้นหา QB64 ที่ติดตั้งในตำแหน่งมาตรฐาน
 * @param {vscode.OutputChannel} outputChannel
 * @returns {Promise<void>}
 */
async function tryAutoDetectCompilerPath(outputChannel) {
    outputChannel.appendLine("Attempting to auto-detect QB64 compiler path...");
    let detectedPath = null;
    const platform = process.platform;
    const commonPaths = [];
    const homeDir = process.env.HOME || "~";

    if (platform === "win32") {
        commonPaths.push(
            path.join(process.env.ProgramFiles || "C:\\Program Files", "QB64", "qb64.exe"),
            path.join(process.env.ProgramFiles || "C:\\Program Files", "QB64PE", "qb64.exe"),
            path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "QB64", "qb64.exe"),
            path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "QB64PE", "qb64.exe"),
            "C:\\QB64\\qb64.exe",
            "C:\\QB64PE\\qb64.exe"
        );
    } else if (platform === "darwin") { // [IMPROVEMENT] เพิ่ม Path สำหรับ macOS
        commonPaths.push(
            "/Applications/QB64/qb64",
            "/Applications/QB64PE/qb64",
            path.join(homeDir, "qb64", "qb64"),
            path.join(homeDir, "QB64PE", "qb64")
        );
    } else if (platform === "linux") { // [IMPROVEMENT] เพิ่ม Path สำหรับ Linux
        commonPaths.push(
            path.join(homeDir, "qb64", "qb64"),
            path.join(homeDir, "QB64PE", "qb64"),
            "/usr/local/bin/qb64",
            "/opt/qb64/qb64",
            "/opt/QB64PE/qb64"
        );
    }

    for (const p of commonPaths) {
        try {
            await fs.stat(p); 
            outputChannel.appendLine(`QB64 candidate found at: ${p}`);
            detectedPath = p;
            break; 
        } catch (err) {
            // Path ไม่มีอยู่จริง, ไม่ต้องทำอะไร
        }
    }

    if (detectedPath) {
        const choice = await vscode.window.showInformationMessage(
            `QB64 seems to be installed at: '${detectedPath}'. Do you want to use this path for QBasic Nexus?`,
            { modal: true }, "Yes, use this path", "No, I'll set it manually"
        );
        if (choice === "Yes, use this path") {
            try {
                const config = vscode.workspace.getConfiguration(Constants.CONFIG_SECTION);
                await config.update(Constants.COMPILER_PATH_KEY, detectedPath, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`QB64 compiler path has been set to: ${detectedPath}`);
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to save compiler path setting: ${err.message}`);
            }
        }
    } else {
        outputChannel.appendLine("QB64 auto-detection failed. Please set the path manually in VS Code settings.");
    }
}


/**
 * ฟังก์ชันควบคุมหลักสำหรับการ Compile และ Run
 * @param {boolean} shouldRunAfterCompile
 */
async function compileAndRun(shouldRunAfterCompile) {
    const outputChannel = getOutputChannel();
    if (isCompiling) {
        vscode.window.showInformationMessage("A compilation is already in progress.");
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== Constants.LANGUAGE_ID) {
        vscode.window.showWarningMessage("Please open a QBasic (.bas or .bi) file to use this command.");
        return;
    }
    
    const document = editor.document;
    if (document.isDirty) {
        if (!await document.save()) {
             vscode.window.showWarningMessage("Compilation cancelled. File must be saved first.");
             return;
        }
    }

    const configuration = vscode.workspace.getConfiguration(Constants.CONFIG_SECTION);
    const userCompilerPath = configuration.get(Constants.COMPILER_PATH_KEY);

    if (!userCompilerPath) {
        vscode.window.showErrorMessage(
            "QB64 compiler path is not set. Please set 'QBasic Nexus: Compiler Path' in your settings.", "Open Settings"
        ).then(selection => {
            if (selection === "Open Settings") {
                vscode.commands.executeCommand('workbench.action.openSettings', `${Constants.CONFIG_SECTION}.${Constants.COMPILER_PATH_KEY}`);
            }
        });
        return;
    }

    try {
        await fs.stat(userCompilerPath);
    } catch (error) {
        vscode.window.showErrorMessage(
            `QB64 compiler not found at the specified path: ${userCompilerPath}. Please check your settings.`, "Open Settings"
        ).then(selection => {
            if (selection === "Open Settings") {
                vscode.commands.executeCommand('workbench.action.openSettings', `${Constants.CONFIG_SECTION}.${Constants.COMPILER_PATH_KEY}`);
            }
        });
        return;
    }

    isCompiling = true;
    updateStatusBarItem();

    try {
        const outputPath = await compileFileWithSpawn(document, userCompilerPath, outputChannel);
        if (shouldRunAfterCompile && outputPath) {
            runInTerminal(outputPath);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Compilation Failed. Check the '${Constants.OUTPUT_CHANNEL_NAME}' output for details.`);
    } finally {
        isCompiling = false;
        updateStatusBarItem();
    }
}

/**
 * ฟังก์ชันสำหรับคอมไพล์ไฟล์โดยใช้ `spawn`
 * @param {import("vscode").TextDocument} document
 * @param {string} compilerExecutablePath
 * @param {vscode.OutputChannel} outputChannel
 * @returns {Promise<string>} Path ของไฟล์ที่คอมไพล์สำเร็จ
 */
function compileFileWithSpawn(document, compilerExecutablePath, outputChannel) {
    return new Promise((resolve, reject) => {
        const sourcePath = document.uri.fsPath;
        const dirPath = path.dirname(sourcePath);
        const baseName = path.basename(sourcePath, path.extname(sourcePath));
        
        const outputPath = process.platform === "win32"
            ? path.join(dirPath, `${baseName}.exe`)
            : path.join(dirPath, baseName);

        const config = vscode.workspace.getConfiguration(Constants.CONFIG_SECTION);
        const additionalArgsRaw = config.get(Constants.COMPILER_ARGS_KEY, "");
        // หมายเหตุ: การแยก args แบบนี้อาจไม่รองรับ path ที่มีช่องว่างในตัวมันเอง
        // แต่เพียงพอสำหรับการใช้งานทั่วไปของ QB64 (เช่น flags -w, -g)
        const additionalArgs = additionalArgsRaw.split(' ').filter(arg => arg.length > 0);

        const args = [
            "-x", "-c", sourcePath,
            "-o", outputPath,
            ...additionalArgs
        ];

        outputChannel.clear();
        outputChannel.show(true);
        outputChannel.appendLine(`> Using QBasic Nexus Compiler ⚙️ : ${compilerExecutablePath}`);
        outputChannel.appendLine(`> Executing 🏃 : ${compilerExecutablePath} ${args.join(' ')}\n`);

        const compilerDir = path.dirname(compilerExecutablePath);
        const options = { cwd: compilerDir, shell: false }; 
        
        const compilerProcess = spawn(compilerExecutablePath, args, options);

        compilerProcess.stdout.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        compilerProcess.stderr.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        compilerProcess.on('error', (err) => {
             outputChannel.appendLine("\n--- PROCESS SPAWN FAILED ❌ ---");
             outputChannel.appendLine(`Failed to start compiler process: ${err.message}`);
             reject(err);
        });

        compilerProcess.on('close', (code) => {
            if (code === 0) {
                outputChannel.appendLine("\n--- COMPILE SUCCESSFUL ✅ ---");
                outputChannel.appendLine(`Output file created at: ${outputPath}`);
                resolve(outputPath);
            } else {
                outputChannel.appendLine(`\n--- COMPILE FAILED ❌ (Exit Code: ${code}) ---`);
                outputChannel.appendLine("Check the output above for error messages from the compiler.");
                reject(new Error(`Compiler process exited with code ${code}.`));
            }
        });
    });
}


/**
 * ฟังก์ชันอัปเดตการแสดงผลของ Status Bar Item
 */
function updateStatusBarItem() {
    const configuration = vscode.workspace.getConfiguration(Constants.CONFIG_SECTION);
    const userCompilerPath = configuration.get(Constants.COMPILER_PATH_KEY);
    const editor = vscode.window.activeTextEditor;

    if (!userCompilerPath) {
        statusBarItem.text = `$(warning) Set QB64 Path`;
        statusBarItem.tooltip = "QB64 compiler path is not set. Click to open settings.";
        statusBarItem.command = 'workbench.action.openSettings';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.show();
    } else if (isCompiling) {
        statusBarItem.text = `$(sync~spin) Compiling...`;
        statusBarItem.tooltip = "Compilation in progress...";
        statusBarItem.command = undefined; 
        statusBarItem.backgroundColor = undefined;
        statusBarItem.show();
    } else if (editor && editor.document.languageId === Constants.LANGUAGE_ID) {
        statusBarItem.text = `$(flame) Compile .BAS`;
        statusBarItem.tooltip = `Click to Compile AND RUN the current QBasic file`; 
        statusBarItem.command = Constants.COMMAND_COMPILE_AND_RUN;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}

/**
 * ฟังก์ชันรันไฟล์ Output ใน Terminal (ปรับปรุงให้เข้ากับ PowerShell)
 * @param {string} executablePath
 */
function runInTerminal(executablePath) {
    const terminal = getTerminal();
    terminal.show();
    
    const dirName = path.dirname(executablePath);
    const baseName = path.basename(executablePath);

    const commandToRun = process.platform === 'win32' 
        ? `cd "${dirName}"; .\\"${baseName}"` 
        : `cd "${dirName}" && ./"${baseName}"`;
        
    terminal.sendText(commandToRun);
}

/**
 * ฟังก์ชันที่ถูกเรียกเมื่อ Extension ถูกปิดการใช้งาน
 */
function deactivate() {
    if (statusBarItem) statusBarItem.dispose();
    if (_outputChannel) _outputChannel.dispose();
    if (_terminal) _terminal.dispose();
}

module.exports = {
    activate,
    deactivate,
};