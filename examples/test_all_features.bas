' ============================================================================
' QBasic Nexus - Test File
' ============================================================================
' Use this file to test the extension features
' ============================================================================

CLS
PRINT "============================================"
PRINT "   QBasic Nexus Test v1.0"
PRINT "============================================"
PRINT

' --- Variables ---
x = 10
y = 20
total = x + y
PRINT "x = "; x
PRINT "y = "; y
PRINT "x + y = "; total
PRINT

' --- Input ---
INPUT "Enter your name: ", name$
PRINT "Hello, "; name$; "!"
PRINT

' --- String Functions ---
test$ = "QBasic"
PRINT "String: "; test$
PRINT "Length: "; LEN(test$)
PRINT "Upper: "; UCASE$(test$)
PRINT "Lower: "; LCASE$(test$)
PRINT

' --- Math ---
PRINT "5 + 3 = "; 5 + 3
PRINT "10 - 4 = "; 10 - 4
PRINT "6 * 7 = "; 6 * 7
PRINT "SQR(16) = "; SQR(16)
PRINT

' --- FOR Loop ---
PRINT "Counting: ";
FOR i = 1 TO 5
    PRINT i; " ";
NEXT i
PRINT
PRINT

' --- IF Statement ---
score = 85
IF score >= 80 THEN
    PRINT "Grade: Pass"
ELSE
    PRINT "Grade: Fail"
END IF
PRINT


' --- SWAP ---
a = 1: b = 2
PRINT "Before SWAP: a="; a; ", b="; b
SWAP a, b
PRINT "After SWAP:  a="; a; ", b="; b
PRINT

' --- SELECT CASE ---
num = 2
PRINT "SELECT CASE Test (Num="; num; "):"
SELECT CASE num
    CASE 1
        PRINT "  One"
    CASE 2
        PRINT "  Two (Correct)"
    CASE 3
        PRINT "  Three"
    CASE ELSE
        PRINT "  Other"
END SELECT
PRINT

' --- Done ---
PRINT "============================================"
PRINT "   Test Complete!"
PRINT "============================================"

END
