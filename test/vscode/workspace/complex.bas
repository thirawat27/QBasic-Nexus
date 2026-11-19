Decide 1
SUB Decide (n)
    IF n = 1 THEN PRINT "a"
    IF n = 2 THEN PRINT "b"
    IF n = 3 THEN PRINT "c"
    IF n = 4 AND n > 0 THEN PRINT "d"
    FOR i = 1 TO 2
        SELECT CASE i
            CASE 1: PRINT 1
            CASE 2: PRINT 2
        END SELECT
    NEXT
    DO WHILE n > 10
        n = n - 1
    LOOP
END SUB
