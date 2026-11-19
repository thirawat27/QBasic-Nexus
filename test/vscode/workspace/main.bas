'$INCLUDE: 'lib.bi'
DECLARE SUB DrawPlayer (x AS INTEGER, y AS INTEGER)
SCREEN 0
CLS
DrawPlayer 3, 4
total = Twice(5)
PRINT "Total"; total
PRINT LEFT$("hello", 2)

SUB DrawPlayer (x AS INTEGER, y AS INTEGER)
    PRINT "Player at"; x; y
END SUB

SUB NeverCalled
    PRINT "unused"
END SUB
