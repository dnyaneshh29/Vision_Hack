@echo off
cd /d %~dp0
echo Starting npm install...
call npm.cmd install
echo Done.
exit
