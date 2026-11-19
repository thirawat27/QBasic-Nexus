10 REM RESUME to a specific line number
20 ON ERROR GOTO 500
30 ERROR 11
40 PRINT "not reached"
100 PRINT "Resumed at 100"
110 END
500 PRINT "Handler"
510 RESUME 100

' ---- expected output (checked by hand) ----
' EXPECT: Handler
' EXPECT: Resumed at 100
