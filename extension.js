const vscode = require("vscode") // ดึงโมดูลหลักของ VS Code API
const path = require("path") // ใช้สำหรับจัดการ path ของไฟล์
const fs = require("fs") // ใช้สำหรับจัดการระบบไฟล์
const { exec } = require("child_process") // ใช้สำหรับรันคำสั่ง shell/terminal

let statusBarItem // แถบแสดงสถานะสำหรับสั่ง compile
let outputChannel // ช่องสำหรับแสดงผลลัพธ์การ compile
let terminal // Terminal ภายใน VS Code

/**
 * ฟังก์ชันหลักที่ถูกเรียกเมื่อ Extension ถูกเปิดใช้งาน
 * @param {vscode.ExtensionContext} context - บริบทของ Extension
 */
function activate(context) {
  outputChannel = vscode.window.createOutputChannel("QB64 Compiler") // สร้าง Output Panel
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  )
  statusBarItem.command = "QBLegacy.compile" // กำหนดคำสั่งเมื่อคลิก status bar

  const extensionPath = context.extensionPath // เก็บ path ของ Extension

  // ลงทะเบียนคำสั่ง Compile
  const compileCommand = vscode.commands.registerCommand(
    "QBLegacy.compile",
    () => {
      compileAndRun(false, extensionPath)
    }
  )

  // ลงทะเบียนคำสั่ง Compile & Run
  const compileAndRunCommand = vscode.commands.registerCommand(
    "QBLegacy.compileAndRun",
    () => {
      compileAndRun(true, extensionPath)
    }
  )

  // เก็บ subscriptions สำหรับ cleanup และ update status bar
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem),
    statusBarItem,
    compileCommand,
    compileAndRunCommand
  )

  updateStatusBarItem() // เรียกฟังก์ชันอัปเดตแถบสถานะทันที
}

/**
 * ฟังก์ชัน Compile และ Run โปรแกรม QBasic
 * @param {boolean} shouldRunAfterCompile - จะรันไฟล์หลัง compile เสร็จหรือไม่
 * @param {string} extensionPath - path ของ Extension
 */
async function compileAndRun(shouldRunAfterCompile, extensionPath) {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== "qbasic") {
    vscode.window.showWarningMessage(
      "Please open a QBasic (.bas) file to use this command."
    )
    return
  }

  try {
    const outputPath = await compileFile(editor.document, extensionPath)
    if (shouldRunAfterCompile && outputPath) {
      runInTerminal(outputPath) // รันไฟล์หลัง Compile หากระบุ
    }
  } catch (error) {
    vscode.window.showErrorMessage(`An error occurred: ${error.message}`)
    outputChannel.appendLine(`Error: ${error.message}`)
  }
}

/**
 * ฟังก์ชัน Compile ไฟล์ QBasic (.BAS) โดยใช้ QB64
 * @param {TextDocument} document - เอกสารที่เปิดอยู่
 * @param {string} extensionPath - path ของ Extension
 * @returns {Promise<string>} - คืน path ของไฟล์ที่ Compile แล้ว
 */
function compileFile(document, extensionPath) {
  return new Promise(async (resolve, reject) => {
    outputChannel.clear()
    outputChannel.show(true)

    const sourcePath = document.uri.fsPath // Path ของไฟล์ต้นฉบับ
    const dirPath = path.dirname(sourcePath) // โฟลเดอร์ของไฟล์
    const baseName = path.basename(sourcePath, path.extname(sourcePath)) // ชื่อไฟล์ไม่รวม .bas
    const platform = process.platform // ตรวจระบบปฏิบัติการ

    let compilerDir = ""
    let outputPath = ""

    // กำหนด path ของ QB64 ตามระบบปฏิบัติการ
    if (platform === "win32") {
      compilerDir = path.join(extensionPath, "compilers", "win", "qb64")
      outputPath = path.join(dirPath, `${baseName}.exe`)
    } else if (platform === "linux") {
      compilerDir = path.join(extensionPath, "compilers", "linux", "qb64")
      outputPath = path.join(dirPath, baseName)
      try {
        await checkPrerequisites(
          "g++ --version",
          "g++ is not found. Please install build-essential: sudo apt-get install build-essential"
        )
      } catch (e) {
        return reject(e)
      }
    } else if (platform === "darwin") {
      compilerDir = path.join(extensionPath, "compilers", "macos", "qb64")
      outputPath = path.join(dirPath, baseName)
      try {
        await checkPrerequisites(
          "xcode-select -p",
          "Xcode Command Line Tools not found. Please run: xcode-select --install"
        )
      } catch (e) {
        return reject(e)
      }
    } else {
      return reject(new Error(`Unsupported platform: ${platform}.`))
    }

    const compilerExecutable = path.join(
      compilerDir,
      platform === "win32" ? "qb64.exe" : "qb64"
    )

    // ให้สิทธิ์ execute บน Linux/Mac
    if (platform !== "win32") {
      try {
        fs.chmodSync(compilerExecutable, 0o755)
      } catch (err) {
        return reject(
          new Error(`Failed to set execute permission on QB64: ${err.message}`)
        )
      }
    }

    // สร้างคำสั่ง Compile
    const command = `"${compilerExecutable}" -x -c "${sourcePath}" -o "${outputPath}"`

    // แสดง Progress ใน VS Code
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Compiling with QB64...",
        cancellable: false,
      },
      (progress) => {
        return new Promise((resolveProgress) => {
          outputChannel.appendLine(`> Executing: ${command}\n`)
          const compileProcess = exec(
            command,
            { cwd: compilerDir },
            (error, stdout, stderr) => {
              if (error) {
                outputChannel.appendLine("--- COMPILE FAILED ❌ ---")
                outputChannel.appendLine(error.message)
                if (stderr) outputChannel.appendLine(`\n[stderr]:\n${stderr}`)
                if (stdout) outputChannel.appendLine(`\n[stdout]:\n${stdout}`)
                reject(
                  new Error("Compilation failed. Check output for details.")
                )
              } else {
                outputChannel.appendLine("\n--- COMPILE SUCCESSFUL ✅ ---")
                outputChannel.appendLine(
                  `\nOutput file created at: ${outputPath}`
                )
                resolve(outputPath)
              }
              resolveProgress()
            }
          )
        })
      }
    )
  })
}

/**
 * ฟังก์ชันรันไฟล์ .exe หรือ output ใน Terminal
 * @param {string} executablePath - path ของไฟล์ที่ Compile แล้ว
 */
function runInTerminal(executablePath) {
  if (!terminal || terminal.exitStatus !== undefined) {
    terminal = vscode.window.createTerminal("QB64 Run")
  }
  terminal.show()

  const dirName = path.dirname(executablePath)
  const baseName = path.basename(executablePath)

  // สร้างคำสั่งให้รันในแต่ละระบบปฏิบัติการ
  const commandToRun =
    process.platform === "win32"
      ? `cd "${dirName}" && .\\${baseName}`
      : `cd "${dirName}" && ./${baseName}`

  terminal.sendText(commandToRun)
}

/**
 * แสดง/ซ่อน Status Bar Item ตามประเภทไฟล์ที่เปิด
 */
function updateStatusBarItem() {
  const editor = vscode.window.activeTextEditor
  if (editor && editor.document.languageId === "qbasic") {
    statusBarItem.text = `$(flame) Compile .BAS (QBasic)`
    statusBarItem.tooltip = "Click to compile the current QBasic file"
    statusBarItem.show()
  } else {
    statusBarItem.hide()
  }
}

/**
 * ตรวจสอบว่าคำสั่งพื้นฐานในระบบมีอยู่หรือไม่ เช่น g++ หรือ xcode-select
 * @param {string} command - คำสั่งที่ใช้ตรวจสอบ
 * @param {string} errorMessage - ข้อความแจ้งเตือนหากไม่พบ
 */
function checkPrerequisites(command, errorMessage) {
  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        reject(new Error(errorMessage))
      } else {
        resolve()
      }
    })
  })
}

/**
 * ฟังก์ชันเมื่อ Extension ถูกปิด
 */
function deactivate() {
  if (statusBarItem) statusBarItem.dispose()
  if (outputChannel) outputChannel.dispose()
  if (terminal) terminal.dispose()
}

module.exports = {
  activate,
  deactivate,
}
