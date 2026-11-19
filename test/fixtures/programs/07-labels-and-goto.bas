' Named labels with a backward GOTO loop (no DIM)
total = 0
n = 1
again:
total = total + n
n = n + 1
IF n <= 5 THEN GOTO again
PRINT "Sum 1..5 ="; total

' ---- expected output (checked by hand) ----
' EXPECT: Sum 1..5 =15
