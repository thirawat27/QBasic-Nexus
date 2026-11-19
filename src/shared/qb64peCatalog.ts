/**
 * QB64 Phoenix Edition (QB64-PE) additions that the core QBasic/QB64 tables do
 * not list. They feed completion, hover, signature help and semantic
 * highlighting only; the CRT runtime does not implement them.
 *
 * Source of truth: the QB64-PE wiki (https://qb64phoenix.com/qb64wiki/).
 */

function fn(detail, params, syntax) {
  return {
    detail: `${detail} (QB64-PE)`,
    documentation: `**${syntax}**\n\n${detail}.\n\n_QB64 Phoenix Edition._`,
    params,
  };
}

function kw(label, detail, syntax = label) {
  return {
    label,
    detail: `${detail} (QB64-PE)`,
    documentation: `**${syntax}**\n\n${detail}.\n\n_QB64 Phoenix Edition._`,
  };
}

const QB64PE_FUNCTIONS = Object.freeze({
  _IIF: fn('Return one of two values depending on a condition', ['condition', 'truePart', 'falsePart'], '_IIF(condition, truePart, falsePart)'),
  _MIN: fn('Return the smaller of two values', ['value1', 'value2'], '_MIN(value1, value2)'),
  _MAX: fn('Return the larger of two values', ['value1', 'value2'], '_MAX(value1, value2)'),
  _CLAMP: fn('Limit a value to a range', ['value', 'minimum', 'maximum'], '_CLAMP(value, minimum, maximum)'),
  _ROL: fn('Rotate the bits of a value left', ['value', 'count'], '_ROL(value, count)'),
  _ROR: fn('Rotate the bits of a value right', ['value', 'count'], '_ROR(value, count)'),
  '_TOSTR$': fn('Convert a number to a string without a leading space', ['number', 'digits'], '_TOSTR$(number[, digits&])'),
  '_READFILE$': fn('Read a whole file into a string', ['fileName$'], '_READFILE$(fileName$)'),
  '_INPUTBOX$': fn('Show a native input dialog', ['title$', 'message$', 'defaultInput$'], '_INPUTBOX$(title$, message$[, defaultInput$])'),
  _MESSAGEBOX: fn('Show a native message box and return the button pressed', ['title$', 'message$', 'dialogType$', 'iconType$', 'defaultButton&'], '_MESSAGEBOX(title$, message$[, dialogType$[, iconType$[, defaultButton&]]])'),
  '_OPENFILEDIALOG$': fn('Show a native open-file dialog', ['title$', 'defaultPathAndFile$', 'filterPatterns$', 'singleFilterDescription$', 'allowMultipleSelects&'], '_OPENFILEDIALOG$(title$[, defaultPathAndFile$[, filterPatterns$[, singleFilterDescription$[, allowMultipleSelects&]]]])'),
  '_SAVEFILEDIALOG$': fn('Show a native save-file dialog', ['title$', 'defaultPathAndFile$', 'filterPatterns$', 'singleFilterDescription$'], '_SAVEFILEDIALOG$(title$[, defaultPathAndFile$[, filterPatterns$[, singleFilterDescription$]]])'),
  _UPRINTWIDTH: fn('Width in pixels of text printed with _UPRINTSTRING', ['text$', 'utfEncoding&', 'fontHandle&'], '_UPRINTWIDTH(text$[, utfEncoding&[, fontHandle&]])'),
  _ULINESPACING: fn('Line spacing in pixels of a font', ['fontHandle&'], '_ULINESPACING[(fontHandle&)]'),
  _UFONTHEIGHT: fn('Global glyph height in pixels of a font', ['fontHandle&'], '_UFONTHEIGHT[(fontHandle&)]'),
  _UCHARPOS: fn('Fill an array with the pixel position of each character', ['text$', 'posArray&()', 'utfEncoding&', 'fontHandle&'], '_UCHARPOS(text$[, posArray&()[, utfEncoding&[, fontHandle&]]])'),
  _SNDNEW: fn('Create a new empty sound buffer', ['frames&', 'channels&', 'bits&'], '_SNDNEW(frames&, channels&, bits&)'),
  _CRC32: fn('CRC-32 checksum of a string', ['data$', 'crc~&'], '_CRC32(data$[, crc~&])'),
  _ADLER32: fn('Adler-32 checksum of a string', ['data$', 'adler~&'], '_ADLER32(data$[, adler~&])'),
  '_MD5$': fn('MD5 hash of a string as hex text', ['data$'], '_MD5$(data$)'),
  '_DEFLATE$': fn('Compress a string', ['data$', 'compressionLevel&'], '_DEFLATE$(data$[, compressionLevel&])'),
  '_INFLATE$': fn('Decompress a string made by _DEFLATE$', ['data$', 'originalSize&'], '_INFLATE$(data$[, originalSize&])'),
  '_BASE64ENCODE$': fn('Encode a string as Base64', ['data$'], '_BASE64ENCODE$(data$)'),
  '_BASE64DECODE$': fn('Decode a Base64 string', ['data$'], '_BASE64DECODE$(data$)'),
  '_ENCODEURL$': fn('Percent-encode text for a URL', ['text$'], '_ENCODEURL$(text$)'),
  '_DECODEURL$': fn('Decode percent-encoded URL text', ['text$'], '_DECODEURL$(text$)'),
  _STATUSCODE: fn('HTTP status code of a connection opened with _OPENCLIENT', ['handle&'], '_STATUSCODE(handle&)'),
  _LOGMINLEVEL: fn('Minimum logging level that is currently recorded', [], '_LOGMINLEVEL'),
});

const QB64PE_KEYWORDS = Object.freeze({
  _ANDALSO: kw('_ANDALSO', 'Short-circuit logical AND', 'condition1 _ANDALSO condition2'),
  _ORELSE: kw('_ORELSE', 'Short-circuit logical OR', 'condition1 _ORELSE condition2'),
  _NEGATE: kw('_NEGATE', 'Logical NOT that returns -1 or 0', '_NEGATE expression'),
  _UPRINTSTRING: kw('_UPRINTSTRING', 'Print Unicode text at a pixel position', '_UPRINTSTRING (x, y), text$[, maxWidth&[, utfEncoding&[, fontHandle&]]]'),
  _WRITEFILE: kw('_WRITEFILE', 'Write a string to a file, replacing its contents', '_WRITEFILE fileName$, data$'),
  _SAVEIMAGE: kw('_SAVEIMAGE', 'Save an image or the screen to a PNG, BMP, JPG, TGA, QOI or other file', '_SAVEIMAGE fileName$[, imageHandle&[, requirements$]]'),
  _NOTIFYPOPUP: kw('_NOTIFYPOPUP', 'Show a desktop notification', '_NOTIFYPOPUP title$, message$[, iconType$]'),
  _MIDISOUNDBANK: kw('_MIDISOUNDBANK', 'Load a sound bank for MIDI playback', '_MIDISOUNDBANK fileName$[, method$]'),
  _LOGTRACE: kw('_LOGTRACE', 'Write a trace-level log message', '_LOGTRACE message$'),
  _LOGINFO: kw('_LOGINFO', 'Write an info-level log message', '_LOGINFO message$'),
  _LOGWARN: kw('_LOGWARN', 'Write a warning-level log message', '_LOGWARN message$'),
  _LOGERROR: kw('_LOGERROR', 'Write an error-level log message', '_LOGERROR message$'),
  _ASSERT: kw('_ASSERT', 'Stop with a message when a condition is false ($ASSERTS must be on)', '_ASSERT condition[, message$]'),
  $NOPREFIX: kw('$NOPREFIX', 'Allow QB64 keywords without the leading underscore', '$NOPREFIX'),
  $EMBED: kw('$EMBED', 'Embed a file in the executable, read back with _EMBEDDED$', "$EMBED:'fileName','handle'"),
  $UNSTABLE: kw('$UNSTABLE', 'Enable an unstable feature such as MIDI or HTTP', '$UNSTABLE:MIDI'),
  $EXEICON: kw('$EXEICON', 'Set the icon of the compiled executable', "$EXEICON:'iconFile.ico'"),
  $VERSIONINFO: kw('$VERSIONINFO', 'Set version metadata of the compiled executable', '$VERSIONINFO:key=value'),
  $INCLUDEONCE: kw('$INCLUDEONCE', 'Include this file only once even if it is $INCLUDEd again', '$INCLUDEONCE'),
  $RESIZE: kw('$RESIZE', 'Allow or configure resizing of the program window', '$RESIZE:ON|OFF|STRETCH|SMOOTH'),
  $SCREENHIDE: kw('$SCREENHIDE', 'Start the program with its window hidden', '$SCREENHIDE'),
  $SCREENSHOW: kw('$SCREENSHOW', 'Show the program window again after $SCREENHIDE', '$SCREENSHOW'),
  $LET: kw('$LET', 'Define a precompiler variable for $IF', '$LET name = value'),
  $ERROR: kw('$ERROR', 'Stop compilation with a message', '$ERROR message'),
});

export {
  QB64PE_FUNCTIONS,
  QB64PE_KEYWORDS,
};
