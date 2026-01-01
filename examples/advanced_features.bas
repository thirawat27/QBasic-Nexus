' ============================================================================
' QBasic Nexus - Advanced Features Test
' ============================================================================
' This file demonstrates the advanced features supported by the Internal Transpiler (JS)
' - SUB and FUNCTION
' - DATA and READ
' - Global vs Local Scope
' ============================================================================

CLS
PRINT "=== Advanced Features Test ==="
PRINT

' --- 1. DATA / READ Test ---
PRINT "[1] Testing DATA and READ..."
RESTORE MyData
FOR i = 1 TO 3
    READ n$, a, b
    PRINT "  Item: "; n$; ", Sum: "; a + b
NEXT i
PRINT "  Done."
PRINT

' --- 2. SUB Test ---
PRINT "[2] Testing SUB..."
CALL PrintBox("Hello World")
PRINT

' --- 3. FUNCTION Test ---
PRINT "[3] Testing FUNCTION (Factorial)..."
n = 5
f = Factorial(n)
PRINT "  Factorial of "; n; " is "; f
PRINT

' --- 4. DATA Block ---
' Can be placed anywhere
MyData:
DATA "Apple", 5, 2
DATA "Banana", 10, 5
DATA "Cherry", 20, 30

PRINT "=== Test Complete ==="
END

' --- Subroutine Definition ---
SUB PrintBox (text$)
    l = LEN(text$)
    border$ = STRING$(l + 4, "=")
    PRINT "  "; border$
    PRINT "  | "; text$; " |"
    PRINT "  "; border$
END SUB

' --- Function Definition (Recursive) ---
FUNCTION Factorial (n)
    IF n <= 1 THEN
        Factorial = 1
    ELSE
        Factorial = n * Factorial(n - 1)
    END IF
END FUNCTION
