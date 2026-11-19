' Structured program: SUB, FUNCTION, DO, SELECT CASE
DECLARE SUB ShowGrade (score AS INTEGER)
DECLARE FUNCTION Factorial& (n AS INTEGER)

DIM i AS INTEGER
FOR i = 1 TO 5
    PRINT i; "! ="; Factorial&(i)
NEXT i

ShowGrade 95
ShowGrade 72
ShowGrade 40

count = 0
DO WHILE count < 3
    count = count + 1
LOOP
PRINT "Loop ran"; count; "times"

SUB ShowGrade (score AS INTEGER)
    SELECT CASE score
        CASE IS >= 90
            PRINT score; "-> A"
        CASE 70 TO 89
            PRINT score; "-> B"
        CASE ELSE
            PRINT score; "-> F"
    END SELECT
END SUB

FUNCTION Factorial& (n AS INTEGER)
    IF n <= 1 THEN
        Factorial& = 1
    ELSE
        Factorial& = n * Factorial&(n - 1)
    END IF
END FUNCTION

' ---- expected output (checked by hand) ----
' EXPECT: 1! =1
' EXPECT: 2! =2
' EXPECT: 3! =6
' EXPECT: 4! =24
' EXPECT: 5! =120
' EXPECT: 95-> A
' EXPECT: 72-> B
' EXPECT: 40-> F
' EXPECT: Loop ran3times
