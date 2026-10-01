@echo off
rem Work-side deploy: pull, render the entry file, copy the files into the
rem synced library folder. A shortcut only; tools/deploy.mjs does the work.
cd /d "%~dp0.."
git pull || exit /b 1
node tools\deploy.mjs prod --no-config
