' SUB / FUNCTION parameters: typed, BYVAL, and arrays passed whole
DIM scores(1 TO 4) AS INTEGER
scores(1) = 70: scores(2) = 95: scores(3) = 60: scores(4) = 88
SortDescending scores()
FOR i = 1 TO 4
    PRINT scores(i);
NEXT i
PRINT
PRINT "Average:"; Average!(scores())
Describe 2.6, "rounded"

SUB SortDescending (a() AS INTEGER)
    FOR i = 1 TO 3
        FOR j = i + 1 TO 4
            IF a(j) > a(i) THEN SWAP a(i), a(j)
        NEXT j
    NEXT i
END SUB

FUNCTION Average! (a() AS INTEGER)
    total = 0
    FOR i = 1 TO 4
        total = total + a(i)
    NEXT i
    Average! = total / 4
END FUNCTION

SUB Describe (BYVAL n AS INTEGER, label$)
    PRINT n; label$
END SUB

' ---- expected output (checked by hand) ----
' EXPECT: 95887060
' EXPECT: Average:78.25
' EXPECT: 3rounded
