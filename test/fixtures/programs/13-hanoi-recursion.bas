' Tower of Hanoi: recursive SUB called without CALL
DIM SHARED moves AS INTEGER
Hanoi 3, "A", "C", "B"
PRINT "Moves:"; moves

SUB Hanoi (n AS INTEGER, from$, to$, via$)
    IF n = 0 THEN EXIT SUB
    Hanoi n - 1, from$, via$, to$
    moves = moves + 1
    Hanoi n - 1, via$, to$, from$
END SUB

' ---- expected output (checked by hand) ----
' EXPECT: Moves:7
