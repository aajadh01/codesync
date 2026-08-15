<<<<<<< HEAD
@echo off
setlocal enabledelayedexpansion
set DIR=%~dp0
set JAVA_EXE=java
if defined JAVA_HOME set JAVA_EXE=%JAVA_HOME%\bin\java
%JAVA_EXE% -classpath "%DIR%\gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
=======
@echo off
setlocal enabledelayedexpansion
set DIR=%~dp0
set JAVA_EXE=java
if defined JAVA_HOME set JAVA_EXE=%JAVA_HOME%\bin\java
%JAVA_EXE% -classpath "%DIR%\gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
>>>>>>> 6e80ed9 (Add .gitattributes to enforce consistent line‑ending handling)
