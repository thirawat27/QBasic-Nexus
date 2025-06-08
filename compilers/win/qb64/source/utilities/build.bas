''' Removes all the temporary build files.
''' (Various .o, .a, and ./internal/temp, etc.)
SUB PurgeTemporaryBuildFiles (os AS STRING, mac AS LONG)
    ' Legacy style...
    IF os = "WIN" THEN
        CHDIR "internal\c"
        SHELL _HIDE "cmd /c purge_all_precompiled_content_win.bat"
        CHDIR "..\.."
    ELSEIF os = "LNX" THEN
        CHDIR "./internal/c"
        IF mac THEN
            SHELL _HIDE "./purge_all_precompiled_content_osx.command"
        ELSE
            SHELL _HIDE "./purge_all_precompiled_content_lnx.sh"
        END IF
        CHDIR "../.."
    END IF
    ' Make style...
    ' make$ = GetMakeExecutable$
    ' IF os = "WIN" THEN
    '     SHELL _HIDE "cmd /c " + make$ + " OS=win clean"
    ' ELSEIF os = "LNX" THEN
    '     IF mac THEN
    '         SHELL _HIDE make$ + " OS=osx clean"
    '     ELSE
    '         SHELL _HIDE make$ + " OS=lnx clean"
    '     END IF
    ' END IF
END SUB

''' Returns the make executable to use, with path if necessary.
FUNCTION GetMakeExecutable$ ()
    IF os$ = "WIN" THEN
        GetMakeExecutable$ = "internal\c\c_compiler\bin\mingw32-make.exe"
    ELSE
        GetMakeExecutable$ = "make"
    END IF
END FUNCTION
