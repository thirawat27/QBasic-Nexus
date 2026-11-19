' Line numbers and labels in one program, with a forward GOTO
x = 0
10 x = x + 1
IF x < 3 THEN GOTO 10
GOTO finish
PRINT "skipped"
finish:
PRINT "x ="; x

' ---- expected output (checked by hand) ----
' EXPECT: x =3
