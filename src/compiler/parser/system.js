// Auto-extracted Mixin
'use strict';
const { TokenType, BUILTIN_FUNCS } = require("../constants");
module.exports = {
_parseSleep() {
    let sec = "1"
    if (!this._isStmtEnd()) sec = this._parseExpr()
    this._emit(`await _sleep(${sec} * 1000);`)
  },

_parseSound() {
    const freq = this._parseExpr()
    this._matchPunc(",")
    const duration = this._parseExpr()
    this._emit(`await _sound(${freq}, ${duration});`)
  },

_parsePlay() {
    // PLAY "MML string"
    const commands = this._parseExpr()
    this._emit(`await _play(${commands});`)
  },

_parseName() {
    // NAME oldname AS newname
    const oldName = this._parseExpr()
    this._matchKw("AS")
    const newName = this._parseExpr()
    this._emit(`await _rename(${oldName}, ${newName});`)
  },

_parseKill() {
    // KILL filename
    const filename = this._parseExpr()
    this._emit(`await _kill(${filename});`)
  },

_parseMkdir() {
    // MKDIR dirname
    const dir = this._parseExpr()
    this._emit(`await _mkdir(${dir});`)
  },

_parseRmdir() {
    // RMDIR dirname
    const dir = this._parseExpr()
    this._emit(`await _rmdir(${dir});`)
  },

_parseChdir() {
    // CHDIR dirname
    const dir = this._parseExpr()
    this._emit(`await _chdir(${dir});`)
  },

_parseSeek() {
    // SEEK #filenum, position
    this._matchPunc("#")
    const fileNum = this._parseExpr()
    this._matchPunc(",")
    const pos = this._parseExpr()
    this._emit(`_seek(${fileNum}, ${pos});`)
  },

_parseLock() {
    // LOCK #filenum, [record] or [start] TO [end]
    this._matchPunc("#")
    const fileNum = this._parseExpr()
    if (!this._isStmtEnd()) {
      this._matchPunc(",")
      const start = this._parseExpr()
      if (this._matchKw("TO")) {
        const end = this._parseExpr()
        this._emit(`_lock(${fileNum}, ${start}, ${end});`)
      } else {
        this._emit(`_lock(${fileNum}, ${start});`)
      }
    } else {
      this._emit(`_lock(${fileNum});`)
    }
  },

_parseUnlock() {
    // UNLOCK #filenum, [record] or [start] TO [end]
    this._matchPunc("#")
    const fileNum = this._parseExpr()
    if (!this._isStmtEnd()) {
      this._matchPunc(",")
      const start = this._parseExpr()
      if (this._matchKw("TO")) {
        const end = this._parseExpr()
        this._emit(`_unlock(${fileNum}, ${start}, ${end});`)
      } else {
        this._emit(`_unlock(${fileNum}, ${start});`)
      }
    } else {
      this._emit(`_unlock(${fileNum});`)
    }
  }
};
