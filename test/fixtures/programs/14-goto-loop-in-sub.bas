' A backward GOTO loop inside a SUB and one in the main module
CountDown 3

i = 0
loop1:
i = i + 2
IF i < 6 THEN GOTO loop1
PRINT "i ="; i

SUB CountDown (start AS INTEGER)
    n = start
    tick:
    PRINT "T-"; n
    n = n - 1
    IF n > 0 THEN GOTO tick
    PRINT "Liftoff"
END SUB

' ---- expected output (checked by hand) ----
' EXPECT: T-3
' EXPECT: T-2
' EXPECT: T-1
' EXPECT: Liftoff
' EXPECT: i =6
