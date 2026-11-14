CLS
COLOR 14
PRINT "Hello from QBNex in your browser!"
COLOR 7
PRINT
FOR i = 1 TO 10
    COLOR 9 + i MOD 6
    PRINT "Line"; i; "- squared is"; i * i
NEXT
COLOR 7
PRINT
PRINT "TIMER says"; INT(TIMER); "seconds since midnight (UTC)"
BEEP
