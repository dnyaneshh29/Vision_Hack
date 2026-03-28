@echo off
cd /d "c:\HACKATHON_PROJECTS\DYP\NeuroFlow-os\frontend"
echo Running npm install...
npm install --legacy-peer-deps > install_log.txt 2>&1
echo Exit code: %ERRORLEVEL% >> install_log.txt
echo Done. Check install_log.txt for output.
