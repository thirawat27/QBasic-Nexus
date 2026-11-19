10 REM DATA, READ and RESTORE to a line number
20 FOR I = 1 TO 3
30 READ A$
40 PRINT A$
50 NEXT I
60 RESTORE 200
70 READ B$
80 PRINT "Again: "; B$
90 END
100 DATA "red", "green"
200 DATA "blue"

' ---- expected output (checked by hand) ----
' EXPECT: red
' EXPECT: green
' EXPECT: blue
' EXPECT: Again: blue
