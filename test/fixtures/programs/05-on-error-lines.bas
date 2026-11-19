10 REM ON ERROR GOTO a line number, then RESUME NEXT
20 ON ERROR GOTO 900
30 PRINT "Before"
40 ERROR 5
50 PRINT "After"
60 END
900 PRINT "Trapped error"; ERR
910 RESUME NEXT

' ---- expected output (checked by hand) ----
' EXPECT: Before
' EXPECT: Trapped error5
' EXPECT: After
