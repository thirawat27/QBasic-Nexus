const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

let statusBarItem;
let _outputChannel; // ใช้ _ เพื่อบ่งบอกว่าเป็นตัวแปรภายใน
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
        _outputChannel = vscode.window.createOutputChannel("QBasic Nexus Compiler");
    }
    return _outputChannel;
}

function getTerminal() {
    if (!_terminal || _terminal.exitStatus !== undefined) {
        _terminal = vscode.window.createTerminal({ name: "QBasic Nexus: Run Output" });
    }
    return _terminal;
}


/**
 * ฟังก์ชันหลักที่ถูกเรียกเมื่อ Extension ถูกเปิดใช้งาน
 * @param {vscode.ExtensionContext} context - บริบทของ Extension
 */
async function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = "qbasic-nexus.compile";

    await initializeCompilerPath();

    const compileCommand = vscode.commands.registerCommand("qbasic-nexus.compile", () => {
        compileAndRun(false);
    });

    const compileAndRunCommand = vscode.commands.registerCommand("qbasic-nexus.compileAndRun", () => {
        compileAndRun(true);
    });

    // Debounce การอัปเดต Status Bar จากการเปลี่ยน Editor
    const debouncedUpdateStatusBarItem = debounce(updateStatusBarItem, 250);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(debouncedUpdateStatusBarItem),
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (e.affectsConfiguration('qbasic-nexus.compilerPath') || e.affectsConfiguration('qbasic-nexus.compilerArgs')) {
                if (e.affectsConfiguration('qbasic-nexus.compilerPath')) {
                    await initializeCompilerPath();
                }
                updateStatusBarItem(); // อัปเดตทันทีหลัง Setting เปลี่ยน
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
    const configuration = vscode.workspace.getConfiguration('qbasic-nexus');
    let userCompilerPath = configuration.get('compilerPath');

    if (!userCompilerPath) {
        outputChannel.appendLine("Compiler path not set by user. Attempting auto-detection...");
        const detectedPath = await tryAutoDetectCompilerPath(process.platform, outputChannel);
        if (detectedPath) {
            userCompilerPath = vscode.workspace.getConfiguration('qbasic-nexus').get('compilerPath');
        }
    } else {
        outputChannel.appendLine(`User-defined compiler path: ${userCompilerPath}`);
    }
}

/**
 * พยายามค้นหา QB64 ที่ติดตั้งในตำแหน่งมาตรฐาน
 * @param {string} platform
 * @param {vscode.OutputChannel} outputChannel
 * @returns {Promise<string|null>} Path ที่เจอ หรือ null ถ้าไม่เจอ/ผู้ใช้ปฏิเสธ
 */
async function tryAutoDetectCompilerPath(platform, outputChannel) {
    outputChannel.appendLine("Attempting to auto-detect QB64 compiler path...");
    let detectedPath = null;
    const commonPaths = [];

    if (platform === "win32") {
        commonPaths.push(
            path.join(process.env.ProgramFiles || "C:\\Program Files", "QB64", "qb64.exe"),
            path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "QB64", "qb64.exe"),
            "C:\\QB64\\qb64.exe"
        );
    } else if (platform === "darwin") {
        commonPaths.push(
            "/Applications/qb64/qb64",
            path.join(process.env.HOME || "~", "qb64", "qb64"),
            "/usr/local/bin/qb64"
        );
    } else if (platform === "linux") {
        commonPaths.push(
            path.join(process.env.HOME || "~", "qb64", "qb64"),
            "/usr/local/bin/qb64",
            "/opt/qb64/qb64"
        );
    }

    for (const p of commonPaths) {
        try {
            if (fs.existsSync(p)) {
                outputChannel.appendLine(`QB64 candidate found at: ${p}`);
                detectedPath = p;
                break;
            }
        } catch (err) {
            outputChannel.appendLine(`Error checking path ${p}: ${err.message}`);
        }
    }

    if (detectedPath) {
        const choice = await vscode.window.showInformationMessage(
            `QB64 seems to be installed at: '${detectedPath}'. Do you want to use this path for QBasic Nexus?`,
            { modal: true },
            "Yes, use this path", "No, I'll set it manually"
        );
        if (choice === "Yes, use this path") {
            try {
                await vscode.workspace.getConfiguration('qbasic-nexus').update('compilerPath', detectedPath, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`QB64 compiler path has been set to: ${detectedPath}`);
                return detectedPath;
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to save compiler path setting: ${err.message}`);
                return null;
            }
        }
    } else {
        outputChannel.appendLine("QB64 auto-detection failed. Please set the path manually in VS Code settings.");
        vscode.window.showInformationMessage("QB64 auto-detection failed. Please set the 'QBasic Nexus: Compiler Path' in settings if QB64 is installed in a non-standard location.");
    }
    return null;
}

/**
 * ฟังก์ชันควบคุมหลักสำหรับการ Compile และ Run
 * @param {boolean} shouldRunAfterCompile
 */
async function compileAndRun(shouldRunAfterCompile) {
    const outputChannel = getOutputChannel(); // เรียกใช้ Getter
    if (isCompiling) {
        vscode.window.showInformationMessage("A compilation is already in progress.");
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "qbasic") {
        vscode.window.showWarningMessage("Please open a QBasic (.bas or .bi) file to use this command.");
        return;
    }
    
    const document = editor.document;
    const fileName = document.fileName.toLowerCase();
    if (!fileName.endsWith(".bas") && !fileName.endsWith(".bi")) {
        vscode.window.showWarningMessage(`Cannot compile this file type. Only .bas and .bi files are compilable.`);
        return;
    }

    if (document.isDirty) {
        const choice = await vscode.window.showInformationMessage(
            "The file has unsaved changes. Please save it before compiling.", { modal: true }, "Save and Compile"
        );
        if (choice === "Save and Compile") { await document.save(); } 
        else { return; }
    }

    const configuration = vscode.workspace.getConfiguration('qbasic-nexus');
    const userCompilerPath = configuration.get('compilerPath');

    if (!userCompilerPath) {
        vscode.window.showErrorMessage(
            "QB64 compiler path is not set. Please set 'QBasic Nexus: Compiler Path' in your settings, or allow auto-detection on startup.", "Open Settings"
        ).then(selection => {
            if (selection === "Open Settings") {
                vscode.commands.executeCommand('workbench.action.openSettings', 'qbasic-nexus.compilerPath');
            }
        });
        return;
    }

    if (!fs.existsSync(userCompilerPath)) {
        vscode.window.showErrorMessage(
            `QB64 compiler not found at the specified path: ${userCompilerPath}. Please check your settings.`, "Open Settings"
        ).then(selection => {
            if (selection === "Open Settings") {
                vscode.commands.executeCommand('workbench.action.openSettings', 'qbasic-nexus.compilerPath');
            }
        });
        return;
    }

    isCompiling = true;
    updateStatusBarItem();

    try {
        const outputPath = await compileFileWithExternalCompiler(document, userCompilerPath, outputChannel);
        if (shouldRunAfterCompile && outputPath) {
            runInTerminal(outputPath);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Compilation failed: ${error.message}`);
        outputChannel.appendLine(`\n--- COMPILATION ERROR DETAILS 🌋 ---`);
        outputChannel.appendLine(error.stack || error.message);
        outputChannel.show(true);
    } finally {
        isCompiling = false;
        updateStatusBarItem();
    }
}

/**
 * ฟังก์ชันสำหรับคอมไพล์ไฟล์โดยใช้ Compiler ที่ผู้ใช้กำหนด Path
 * @param {import("vscode").TextDocument} document
 * @param {string} compilerExecutablePath
 * @param {vscode.OutputChannel} outputChannel
 * @returns {Promise<string>}
 */
function compileFileWithExternalCompiler(document, compilerExecutablePath, outputChannel) {
    return new Promise(async (resolve, reject) => {
        const sourcePath = document.uri.fsPath;
        const dirPath = path.dirname(sourcePath);
        const baseName = path.basename(sourcePath, path.extname(sourcePath));
        const platform = process.platform;
        
        const compilerDir = path.dirname(compilerExecutablePath);
        let outputPath = '';
        if (platform === "win32") {
            outputPath = path.join(dirPath, `${baseName}.exe`);
        } else {
            outputPath = path.join(dirPath, baseName);
        }

        const additionalArgs = vscode.workspace.getConfiguration('qbasic-nexus').get('compilerArgs') || "";
        const command = `"${compilerExecutablePath}" -x -c "${sourcePath}" -o "${outputPath}" ${additionalArgs}`;

        outputChannel.clear();
        outputChannel.show(true);
        outputChannel.appendLine(`> Using QB64 Compiler ⚙️: ${compilerExecutablePath}`);
        outputChannel.appendLine(`> Executing 🏃 : ${command}\n`);

        const options = { cwd: compilerDir, shell: platform === 'win32' ? false : true };

        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                outputChannel.appendLine("--- COMPILE FAILED ❌ ---");
                outputChannel.appendLine(`Error details: ${error.message}`);
                if (stderr) outputChannel.appendLine(`\n[Compiler Standard Error]:\n${stderr}`);
                if (stdout) outputChannel.appendLine(`\n[Compiler Standard Output]:\n${stdout}`);
                return reject(new Error("Compilation process failed. Check the 'QB64 Compiler' output for details."));
            }
            
            outputChannel.appendLine("\n--- COMPILE SUCCESSFUL ✅ ---");
            outputChannel.appendLine(`\nOutput file created at: ${outputPath}`);
            resolve(outputPath);
        });
    });
}

/**
 * ฟังก์ชันอัปเดตการแสดงผลของ Status Bar Item
 */
function updateStatusBarItem() {
    const configuration = vscode.workspace.getConfiguration('qbasic-nexus');
    const userCompilerPath = configuration.get('compilerPath');
    const editor = vscode.window.activeTextEditor;

    if (!userCompilerPath) {
        statusBarItem.text = `$(warning) Set QB64 Path`;
        statusBarItem.tooltip = "QB64 compiler path is not set. Click to open settings or allow auto-detection on startup.";
        statusBarItem.command = 'workbench.action.openSettings';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.show();
    } else if (isCompiling) {
        statusBarItem.text = `$(sync~spin) Compiling...`;
        statusBarItem.tooltip = "Compilation in progress...";
        statusBarItem.command = undefined;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.show();
    } else if (editor && editor.document.languageId === "qbasic") {
        statusBarItem.text = `$(flame) Compile .BAS `;
        statusBarItem.tooltip = "Click to compile with external QB64";
        statusBarItem.command = "qbasic-nexus.compile";
        statusBarItem.backgroundColor = undefined;
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}

/**
 * ฟังก์ชันรันไฟล์ Output ใน Terminal
 * @param {string} executablePath
 */
function runInTerminal(executablePath) {
    const terminal = getTerminal(); // เรียกใช้ Getter
    terminal.show();
    
    const dirName = path.dirname(executablePath);
    const baseName = path.basename(executablePath);

    const commandToRun = process.platform === 'win32' 
        ? `cd "${dirName}" ; .\\${baseName}`
        : `cd "${dirName}" && ./${baseName}`;
        
    terminal.sendText(commandToRun);
}

/**
 * ฟังก์ชันที่ถูกเรียกเมื่อ Extension ถูกปิดการใช้งาน
 */
function deactivate() {
    if (statusBarItem) statusBarItem.dispose();
    if (_outputChannel) _outputChannel.dispose(); // ใช้ _outputChannel
    if (_terminal) _terminal.dispose(); // ใช้ _terminal
}

module.exports = {
    activate,
    deactivate,
};