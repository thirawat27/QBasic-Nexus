10 REM ON ... GOTO dispatch with line numbers
20 FOR K = 1 TO 3
30 ON K GOTO 100, 200, 300
40 NEXT K
50 PRINT "End"
60 END
100 PRINT "one"
110 GOTO 40
200 PRINT "two"
210 GOTO 40
300 PRINT "three"
310 GOTO 40

' ---- expected output (checked by hand) ----
' EXPECT: one
' EXPECT: two
' EXPECT: three
' EXPECT: End
