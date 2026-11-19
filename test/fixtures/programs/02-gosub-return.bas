10 REM GOSUB to a numbered subroutine, twice
20 N = 3
30 GOSUB 1000
40 N = 5
50 GOSUB 1000
60 PRINT "Back in main"
70 END
1000 REM square of N
1010 PRINT N; "squared ="; N * N
1020 RETURN

' ---- expected output (checked by hand) ----
' EXPECT: 3squared =9
' EXPECT: 5squared =25
' EXPECT: Back in main
