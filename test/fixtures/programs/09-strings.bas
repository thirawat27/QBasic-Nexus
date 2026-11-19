' String functions
s$ = "QBasic Nexus"
PRINT LEFT$(s$, 6)
PRINT RIGHT$(s$, 5)
PRINT MID$(s$, 3, 4)
PRINT UCASE$(s$)
PRINT LCASE$(s$)
PRINT LEN(s$)
PRINT INSTR(s$, "Nexus")
PRINT LTRIM$("   padded")
PRINT STR$(42) + "!"
PRINT VAL("12.5") * 2
PRINT CHR$(65) + CHR$(66)
PRINT ASC("a")

' ---- expected output (checked by hand) ----
' EXPECT: QBasic
' EXPECT: Nexus
' EXPECT: asic
' EXPECT: QBASIC NEXUS
' EXPECT: qbasic nexus
' EXPECT: 12
' EXPECT: 8
' EXPECT: padded
' EXPECT:  42!
' EXPECT: 25
' EXPECT: AB
' EXPECT: 97
