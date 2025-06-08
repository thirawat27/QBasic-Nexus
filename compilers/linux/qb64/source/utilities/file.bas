''' Duplicates the contents of one file into another.
''' Returns: 0 on success, 1 on error.
FUNCTION CopyFile& (sourceFile$, destFile$)

    DIM sourcefileNo, destFileNo
    DIM fileLength AS _INTEGER64

    result = 0
    sourceFileNo = FREEFILE
    OPEN sourceFile$ FOR BINARY AS #sourceFileNo
    if result = 1 THEN GOTO errorCleanup

    fileLength = LOF(sourceFileNo)

    destFileNo = FREEFILE
    OPEN destFile$ FOR BINARY AS #destFileNo
    if result = 1 THEN GOTO errorCleanup

    ' Read the file in one go
    buffer$ = SPACE$(fileLength)

    GET #sourceFileNo, , buffer$
    PUT #destFileNo, , buffer$

ErrorCleanup:
    IF sourceFileNo <> 0 THEN CLOSE #sourceFileNo
    IF destFileNo <> 0 THEN CLOSE #destFileNo
    CopyFile& = result

END FUNCTION

''' Splits the filename from its path and returns the path.
''' Returns: The path or empty if no path.
FUNCTION GetFilePath$ (f$)
    FOR i = LEN(f$) TO 1 STEP -1
        a$ = MID$(f$, i, 1)
        IF a$ = "/" OR a$ = "\" THEN
            GetFilePath$ = LEFT$(f$, i)
            EXIT FUNCTION
        END IF
    NEXT
    GetFilePath$ = ""
END FUNCTION

''' Checks if a filename has an extension on the end.
''' Returns: True if provided filename has an extension.
FUNCTION FileHasExtension (f$)
    FOR i = LEN(f$) TO 1 STEP -1
        a = ASC(f$, i)
        IF a = 47 OR a = 92 THEN EXIT FOR
        IF a = 46 THEN FileHasExtension = -1: EXIT FUNCTION
    NEXT
END FUNCTION

''' Removes the extension off of a filename.
''' Returns: Provided filename without extension on the end.
FUNCTION RemoveFileExtension$ (f$)
    FOR i = LEN(f$) TO 1 STEP -1
        a = ASC(f$, i)
        IF a = 47 OR a = 92 THEN EXIT FOR
        IF a = 46 THEN RemoveFileExtension$ = LEFT$(f$, i - 1): EXIT FUNCTION
    NEXT
    RemoveFileExtension$ = f$
END FUNCTION

''' Fixes the provided filename and path to use the correct path separator.
SUB PATH_SLASH_CORRECT (a$)
    IF os$ = "WIN" THEN
        FOR x = 1 TO LEN(a$)
            IF ASC(a$, x) = 47 THEN ASC(a$, x) = 92
        NEXT
    ELSE
        FOR x = 1 TO LEN(a$)
            IF ASC(a$, x) = 92 THEN ASC(a$, x) = 47
        NEXT
    END IF
END SUB
