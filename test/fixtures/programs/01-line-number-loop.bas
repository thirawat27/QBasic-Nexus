10 REM Classic line-numbered counting loop
20 I = 1
30 PRINT "Count"; I
40 I = I + 1
50 IF I <= 3 THEN 30
60 PRINT "Done"
70 END

' ---- expected output (checked by hand) ----
' EXPECT: Count1
' EXPECT: Count2
' EXPECT: Count3
' EXPECT: Done
