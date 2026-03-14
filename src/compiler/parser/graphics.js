// Auto-extracted Mixin
'use strict';
module.exports = {
_parseLocate() {
    const row = this._parseExpr();
    let col = '1';
    if (this._matchPunc(',')) {
      col = this._parseExpr();
    }
    this._emit(`_locate(${row}, ${col});`);
  },

_parseColor() {
    const fg = this._parseExpr();
    let bg = '-1'; // -1 means no change
    if (this._matchPunc(',')) {
      if (!this._isStmtEnd()) {
        bg = this._parseExpr();
      }
    }
    this._emit(`_color(${fg}, ${bg});`);
  },

_parseScreen() {
    const mode = this._parseExpr();
    this._emit(`_screen(${mode});`);
  },

_parseWidth() {
    const cols = this._parseExpr();
    let rows = '25';
    if (this._matchPunc(',')) {
      rows = this._parseExpr();
    }
    this._emit(`_width(${cols}, ${rows});`);
  },

_parsePset() {
    // PSET (x, y), color or PSET STEP (x, y), color
    const isStep = this._matchKw('STEP');

    this._matchPunc('(');
    const x = this._parseExpr();
    this._matchPunc(',');
    const y = this._parseExpr();
    this._matchPunc(')');

    let color = 'undefined';
    if (this._matchPunc(',')) {
      color = this._parseExpr();
    }

    this._emit(`await _pset(${x}, ${y}, ${color}, ${isStep});`);
  },

_parsePreset() {
    // PRESET (x, y), color or PRESET STEP (x, y), color
    const isStep = this._matchKw('STEP');

    this._matchPunc('(');
    const x = this._parseExpr();
    this._matchPunc(',');
    const y = this._parseExpr();
    this._matchPunc(')');

    let color = 'undefined'; // Runtime handles default
    if (this._matchPunc(',')) {
      color = this._parseExpr();
    }

    this._emit(`await _preset(${x}, ${y}, ${color}, ${isStep});`);
  },

_parseCircle() {
    // CIRCLE (x,y), radius, color or CIRCLE STEP (x,y), radius, color
    const isStep = this._matchKw('STEP');

    this._matchPunc('(');
    const x = this._parseExpr();
    this._matchPunc(',');
    const y = this._parseExpr();
    this._matchPunc(')');

    this._matchPunc(',');
    const r = this._parseExpr();

    let color = 'undefined';
    if (this._matchPunc(',')) {
      color = this._parseExpr();
    }

    // Handle arc angles if present (start, end, aspect)
    // Note: These are parsed for syntax compatibility but not yet implemented in runtime
    let _startAngle = 'undefined';
    let _endAngle = 'undefined';
    let _aspect = 'undefined';

    if (this._matchPunc(',')) {
      _startAngle = this._parseExpr();
      if (this._matchPunc(',')) {
        _endAngle = this._parseExpr();
        if (this._matchPunc(',')) {
          _aspect = this._parseExpr();
        }
      }
    }

    // Pass all parameters including arc angles for full CIRCLE support
    this._emit(
      `await _circle(${x}, ${y}, ${r}, ${color}, ${isStep}, ${_startAngle}, ${_endAngle}, ${_aspect});`,
    );
  },

_parseGet() {
    // GET (x1,y1)-(x2,y2), arrayname
    this._matchPunc('(');
    const x1 = this._parseExpr();
    this._matchPunc(',');
    const y1 = this._parseExpr();
    this._matchPunc(')');

    this._matchOp('-');

    this._matchPunc('(');
    const x2 = this._parseExpr();
    this._matchPunc(',');
    const y2 = this._parseExpr();
    this._matchPunc(')');

    this._matchPunc(',');

    // Array or variable name. For now assume simpe variable name as buffer ID
    const id = this._consumeToken().value;

    this._emit(`await _get(${x1}, ${y1}, ${x2}, ${y2}, '${id}');`);
  },

_parsePut() {
    // PUT (x,y), arrayname, action
    this._matchPunc('(');
    const x = this._parseExpr();
    this._matchPunc(',');
    const y = this._parseExpr();
    this._matchPunc(')');

    this._matchPunc(',');

    const id = this._consumeToken().value;

    let action = 'undefined';
    if (this._matchPunc(',')) {
      action = `"${this._consumeToken().value}"`;
    }

    this._emit(`await _put(${x}, ${y}, '${id}', ${action});`);
  },

_parsePutImage() {
    // _PUTIMAGE (dx1, dy1)-(dx2, dy2), srcId, dstId, (sx1, sy1)-(sx2, sy2)
    // Simplified version: _PUTIMAGE (x, y), srcId
    let dx1 = 0,
      dy1 = 0,
      dx2 = 'undefined',
      dy2 = 'undefined';
    let srcId = 'undefined',
      dstId = 'undefined';
    let sx1 = 'undefined',
      sy1 = 'undefined',
      sx2 = 'undefined',
      sy2 = 'undefined';

    if (this._matchPunc('(')) {
      dx1 = this._parseExpr();
      this._matchPunc(',');
      dy1 = this._parseExpr();
      this._matchPunc(')');

      if (this._matchOp('-')) {
        this._matchPunc('(');
        dx2 = this._parseExpr();
        this._matchPunc(',');
        dy2 = this._parseExpr();
        this._matchPunc(')');
      }
    }

    if (this._matchPunc(',')) {
      srcId = this._parseExpr();
    }

    if (this._matchPunc(',')) {
      dstId = this._parseExpr();
    }

    // Optional source coordinates
    if (this._matchPunc(',') && this._matchPunc('(')) {
      sx1 = this._parseExpr();
      this._matchPunc(',');
      sy1 = this._parseExpr();
      this._matchPunc(')');

      if (this._matchOp('-')) {
        this._matchPunc('(');
        sx2 = this._parseExpr();
        this._matchPunc(',');
        sy2 = this._parseExpr();
        this._matchPunc(')');
      }
    }

    this._emit(
      `_runtime.putimage?.(${dx1}, ${dy1}, ${dx2}, ${dy2}, ${srcId}, ${dstId}, ${sx1}, ${sy1}, ${sx2}, ${sy2});`,
    );
  },

_parsePaint() {
    // PAINT (x, y), fillColor, borderColor [, pattern$]
    const featureToken = this._prev();
    const isStep = this._matchKw('STEP');

    this._matchPunc('(');
    const x = this._parseExpr();
    this._matchPunc(',');
    const y = this._parseExpr();
    this._matchPunc(')');

    let fillColor = 'undefined';
    let borderColor = 'undefined';
    let pattern = 'undefined';

    if (this._matchPunc(',')) {
      if (!this._isStmtEnd() && this._peek()?.value !== ',') {
        fillColor = this._parseExpr();
      }

      if (this._matchPunc(',')) {
        if (!this._isStmtEnd() && this._peek()?.value !== ',') {
          borderColor = this._parseExpr();
        }

        if (this._matchPunc(',')) {
          pattern = this._parseExpr();
        }
      }
    }

    const paintX = isStep ? `(_point(0) + (${x}))` : x;
    const paintY = isStep ? `(_point(1) + (${y}))` : y;

    if (pattern !== 'undefined' && this._isInternalRuntimeMode()) {
      this._recordWarning(
        'PAINT pattern arguments are ignored in the QBasic Nexus runtime.',
        featureToken,
      );
    }
    if (pattern !== 'undefined') {
      this._emit(`// PAINT pattern ${pattern} is ignored in the QBasic Nexus runtime`);
    }

    this._emit(`_paint(${paintX}, ${paintY}, ${fillColor}, ${borderColor});`);
  },

_parseDraw() {
    // DRAW "command string"
    const cmds = this._parseExpr();
    this._emit(`await _draw(${cmds});`);
  },

_parseView() {
    // VIEW (x1,y1)-(x2,y2), [color], [border]
    // VIEW PRINT [toprow TO bottomrow]
    if (this._matchKw('PRINT')) {
      if (!this._isStmtEnd()) {
        const top = this._parseExpr();
        this._matchKw('TO');
        const bottom = this._parseExpr();
        this._emit(`_viewPrint(${top}, ${bottom});`);
      } else {
        this._emit('_viewPrint();');
      }
      return;
    }

    if (this._matchPunc('(')) {
      const x1 = this._parseExpr();
      this._matchPunc(',');
      const y1 = this._parseExpr();
      this._matchPunc(')');
      this._matchOp('-');
      this._matchPunc('(');
      const x2 = this._parseExpr();
      this._matchPunc(',');
      const y2 = this._parseExpr();
      this._matchPunc(')');

      let fill = 'undefined',
        border = 'undefined';
      if (this._matchPunc(',')) {
        if (!this._isStmtEnd()) fill = this._parseExpr();
        if (this._matchPunc(',')) border = this._parseExpr();
      }
      this._emit(`_view(${x1}, ${y1}, ${x2}, ${y2}, ${fill}, ${border});`);
    } else {
      this._emit('_view();');
    }
  },

_parseWindow() {
    // WINDOW (x1,y1)-(x2,y2) or WINDOW SCREEN (x1,y1)-(x2,y2)
    const screen = this._matchKw('SCREEN');
    if (this._matchPunc('(')) {
      const x1 = this._parseExpr();
      this._matchPunc(',');
      const y1 = this._parseExpr();
      this._matchPunc(')');
      this._matchOp('-');
      this._matchPunc('(');
      const x2 = this._parseExpr();
      this._matchPunc(',');
      const y2 = this._parseExpr();
      this._matchPunc(')');
      this._emit(`_window(${x1}, ${y1}, ${x2}, ${y2}, ${screen});`);
    } else {
      this._emit('_window();');
    }
  },

_parsePalette() {
    // PALETTE [attrib, color] or PALETTE USING array
    if (this._matchKw('USING')) {
      const arr = this._parseExpr();
      this._emit(`_paletteUsing(${arr});`);
    } else if (!this._isStmtEnd()) {
      const attr = this._parseExpr();
      this._matchPunc(',');
      const color = this._parseExpr();
      this._emit(`_palette(${attr}, ${color});`);
    } else {
      this._emit('_palette();');
    }
  },

_parsePcopy() {
    // PCOPY src, dst
    const src = this._parseExpr();
    this._matchPunc(',');
    const dst = this._parseExpr();
    this._emit(`_pcopy(${src}, ${dst});`);
  },

  _parseScreenMove() {
    const featureToken = this._prev();
    // _SCREENMOVE x, y or _SCREENMOVE _MIDDLE
    if (this._matchKw('_MIDDLE')) {
      if (this._isInternalRuntimeMode()) {
        this._recordWarning(
          '_SCREENMOVE is not supported in the QBasic Nexus runtime and will be ignored.',
          featureToken,
        );
      }
      this._emit('// _SCREENMOVE _MIDDLE - not supported in QBasic Nexus runtime');
    } else {
      const x = this._parseExpr();
      this._matchPunc(',');
      const y = this._parseExpr();
      if (this._isInternalRuntimeMode()) {
        this._recordWarning(
          '_SCREENMOVE is not supported in the QBasic Nexus runtime and will be ignored.',
          featureToken,
        );
      }
      this._emit(`// _SCREENMOVE ${x}, ${y} - not supported in QBasic Nexus runtime`);
    }
  },

  _parseScreenIcon() {
    const featureToken = this._prev();
    this._skipToEndOfLine();
    if (this._isInternalRuntimeMode()) {
      this._recordWarning(
        '_SCREENICON is not supported in the QBasic Nexus runtime and will be ignored.',
        featureToken,
      );
    }
    this._emit('// _SCREENICON - not supported in QBasic Nexus runtime');
  },

  _parseScreenHide() {
    const featureToken = this._prev();
    this._skipToEndOfLine();
    if (this._isInternalRuntimeMode()) {
      this._recordWarning(
        '_SCREENHIDE is not supported in the QBasic Nexus runtime and will be ignored.',
        featureToken,
      );
    }
    this._emit('// _SCREENHIDE - not supported in QBasic Nexus runtime');
  },

  _parseScreenShow() {
    const featureToken = this._prev();
    this._skipToEndOfLine();
    if (this._isInternalRuntimeMode()) {
      this._recordWarning(
        '_SCREENSHOW is not supported in the QBasic Nexus runtime and will be ignored.',
        featureToken,
      );
    }
    this._emit('// _SCREENSHOW - not supported in QBasic Nexus runtime');
  },

  _parseAutoDisplay() {
    const featureToken = this._prev();
    this._skipToEndOfLine();
    if (this._isInternalRuntimeMode()) {
      this._recordWarning(
        '_AUTODISPLAY has no effect in the QBasic Nexus runtime because frames display automatically.',
        featureToken,
      );
    }
    this._emit('// _AUTODISPLAY - default in QBasic Nexus runtime');
  },
};
