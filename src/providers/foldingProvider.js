/**
 * QBasic Nexus - Provider: Folding Range
 * Code folding for SUB/FUNCTION/TYPE/IF/DO/FOR/SELECT/WHILE blocks and comment blocks
 */

"use strict"

const vscode = require("vscode")
const { PATTERNS } = require("./patterns")

class QBasicFoldingRangeProvider {
  provideFoldingRanges(document) {
    const ranges = []
    const stack = []

    const foldPatterns = {
      start:
        /^\s*(?:SUB|FUNCTION|TYPE|IF\b.+\bTHEN\s*$|DO|FOR|SELECT|WHILE)\b/i,
      end: /^\s*(?:END\s+(?:SUB|FUNCTION|TYPE|IF|SELECT)|LOOP|NEXT|WEND)\b/i,
    }

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text

      if (foldPatterns.start.test(line)) {
        stack.push(i)
      } else if (foldPatterns.end.test(line)) {
        if (stack.length > 0) {
          const startLine = stack.pop()
          if (i > startLine) {
            ranges.push(new vscode.FoldingRange(startLine, i))
          }
        }
      }
    }

    // Fold comment blocks
    let commentStart = -1
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text
      const isComment = PATTERNS.COMMENT.test(line)

      if (isComment && commentStart === -1) {
        commentStart = i
      } else if (!isComment && commentStart !== -1) {
        if (i - 1 > commentStart) {
          ranges.push(
            new vscode.FoldingRange(
              commentStart,
              i - 1,
              vscode.FoldingRangeKind.Comment,
            ),
          )
        }
        commentStart = -1
      }
    }

    return ranges
  }
}

module.exports = { QBasicFoldingRangeProvider }
