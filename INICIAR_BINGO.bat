@echo off
chcp 65001 >nul
title Bolillero Digital Pro - Servidor y Mesa de Control
cls
echo ========================================================
echo   🎱 BOLILLERO DIGITAL PRO - SISTEMA OFICIAL DE BINGO
echo ========================================================
echo.
echo  Iniciando servidor local en segundo plano...
echo.

cd /d "%~dp0\nuevo_sistema"

start "" http://localhost:3000/index.html
node server.js

pause
