const { parentPort } = require("worker_threads")
const InternalTranspiler = require("./transpiler")

// Pre-instantiate to save time, though state must be clean per compilation
parentPort.on("message", (message) => {
  try {
    const { id, type, source, target } = message
    // Instantiating a new parser/lexer for each request ensures safety
    const transpiler = new InternalTranspiler()
    let result

    if (type === "transpile") {
      result = transpiler.transpile(source, target)
      parentPort.postMessage({ id, success: true, result })
    } else if (type === "lint") {
      result = transpiler.lint(source)
      parentPort.postMessage({ id, success: true, result })
    } else {
      parentPort.postMessage({
        id,
        success: false,
        error: "Unknown message type",
      })
    }
  } catch (error) {
    parentPort.postMessage({
      id: message.id,
      success: false,
      error: error.message,
    })
  }
})
