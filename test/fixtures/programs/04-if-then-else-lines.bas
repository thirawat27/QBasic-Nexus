10 REM IF ... THEN line ELSE line
20 FOR X = 1 TO 4
30 IF X MOD 2 = 0 THEN 60 ELSE 80
40 NEXT X
50 END
60 PRINT X; "is even"
70 GOTO 40
80 PRINT X; "is odd"
90 GOTO 40

' ---- expected output (checked by hand) ----
' EXPECT: 1is odd
' EXPECT: 2is even
' EXPECT: 3is odd
' EXPECT: 4is even
