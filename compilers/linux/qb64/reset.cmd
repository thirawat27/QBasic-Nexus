@echo off

echo Remove temp folders.
rmdir /s /q internal\temp,internal\temp2,internal\temp3,internal\temp4,internal\temp5,internal\temp6,internal\temp7,internal\temp8,internal\temp9 2>nul

echo Create temp folder.
md internal\temp

echo Replacing dummy file in temp folder to maintain directory structure.
copy internal\source\temp.bin internal\temp\temp.bin

echo Pruning source folder
del internal\source\undo2.bin 2>nul
del internal\source\recompile.bat 2>nul
del internal\source\debug.bat 2>nul
del internal\source\files.txt 2>nul
del internal\source\paths.txt 2>nul
del internal\source\root.txt 2>nul
del internal\source\bookmarks.bin 2>nul
del internal\source\recent.bin 2>nul

echo Culling precompiled libraries
del /s internal\c\libqb\*.o 2>nul
del /s internal\c\libqb\*.a 2>nul
del /s internal\c\parts\*.o 2>nul
del /s internal\c\parts\*.a 2>nul
del /s internal\c\parts\*.o 2>nul
del /s internal\c\*.o 2>nul

echo Culling temporary copies of qbx.cpp, such as qbx2.cpp
del internal\c\qbx2.cpp,internal\c\qbx3.cpp,internal\c\qbx4.cpp,internal\c\qbx5.cpp,internal\c\qbx6.cpp,internal\c\qbx7.cpp,internal\c\qbx8.cpp,internal\c\qbx9.cpp 2>nul

echo Remove config.ini.
if exist internal\config.ini del internal\config.ini

echo Remove c_compiler.
if exist internal\c\c_compiler rmdir /s /q internal\c\c_compiler

echo Remove compiled libqb.
if exist internal\c\libqb\include rmdir /s /q internal\c\libqb\include
if exist internal\c\libqb\src rmdir /s /q internal\c\libqb\src

echo Remove mingw64.
if exist mingw64 rmdir /s /q mingw64

echo Remove mingw32
if exist mingw32 rmdir /s /q mingw32

echo Remove internal/version.txt
if exist internal\version.txt del internal\version.txt

echo Remove qb64.exe
if exist qb64.exe del qb64.exe

echo Remove qb64-dev.exe
if exist qb64-dev.exe del qb64-dev.exe

pause
