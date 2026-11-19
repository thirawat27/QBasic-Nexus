' WHILE...WEND, SELECT CASE on strings, EXIT FOR
words$ = "apple,kiwi,stop,plum"
start = 1
WHILE start <= LEN(words$)
    comma = INSTR(start, words$, ",")
    IF comma = 0 THEN comma = LEN(words$) + 1
    w$ = MID$(words$, start, comma - start)
    SELECT CASE w$
        CASE "stop"
            PRINT "(stop word)"
        CASE "apple", "plum"
            PRINT w$; " is a fruit with a stone or core"
        CASE ELSE
            PRINT w$
    END SELECT
    start = comma + 1
WEND

FOR k = 1 TO 10
    IF k * k > 20 THEN EXIT FOR
NEXT k
PRINT "First square over 20:"; k

' ---- expected output (checked by hand) ----
' EXPECT: apple is a fruit with a stone or core
' EXPECT: kiwi
' EXPECT: (stop word)
' EXPECT: plum is a fruit with a stone or core
' EXPECT: First square over 20:5
