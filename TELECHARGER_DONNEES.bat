@echo off
title Grey Corner - Telecharger Donnees Flash
echo ========================================================
echo   GREY CORNER - TELECHARGEMENT DES DONNEES FLASH
echo ========================================================
python "%~dp0scripts\download_all.py"
echo.
echo ========================================================
echo Synchronisation terminee ! Vous pouvez ouvrir l'application.
echo ========================================================
pause
