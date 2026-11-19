' Arrays and TYPE records
TYPE Player
    name AS STRING * 8
    score AS INTEGER
END TYPE

DIM team(1 TO 3) AS Player
team(1).name = "Ann"
team(1).score = 30
team(2).name = "Bo"
team(2).score = 50
team(3).name = "Cy"
team(3).score = 20

best = 1
FOR i = 2 TO 3
    IF team(i).score > team(best).score THEN best = i
NEXT i
PRINT "Best: "; RTRIM$(team(best).name); team(best).score

DIM grid(2, 2)
FOR r = 0 TO 2
    FOR c = 0 TO 2
        grid(r, c) = r * 3 + c
    NEXT c
NEXT r
PRINT grid(2, 1)

' ---- expected output (checked by hand) ----
' EXPECT: Best: Bo50
' EXPECT: 7
