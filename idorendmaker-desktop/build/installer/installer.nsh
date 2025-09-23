; Custom NSIS installer snippet for Időrend Készítő
!include "LogicLib.nsh"
!include "x64.nsh"

; declare user variables used later
Var DB_DEST
Var SRC1
Var SRC2
Var SRC3
Var SRC4
Var vcUrl
Var vcFile
Var LogFile

!define VCREDIST_2015_2022_X64_URL "https://aka.ms/vs/17/release/vc_redist.x64.exe"
!define VCREDIST_2015_2022_X86_URL "https://aka.ms/vs/17/release/vc_redist.x86.exe"

!define VCREDIST_2015_2022_X64_KEY "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X64"
!define VCREDIST_2015_2022_X86_KEY "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X86"
!define VCREDIST_WOW64_X64_KEY "SOFTWARE\\Wow6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64"
!define VCREDIST_WOW64_X86_KEY "SOFTWARE\\Wow6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x86"
!define VCREDIST_SERVICING_KEY "SOFTWARE\\Microsoft\\DevDiv\\VC\\Servicing\\14.0\\RuntimeMinimum"

; ---------------- Logging helper ----------------
; usage: Push "message"  Call LogMessage  (the original macro in your file used a push/call/pop pattern,
; this function restores the pushed message so existing macro/pop still works)
Function LogMessage
  Exch $0            ; pop the message into $0
  DetailPrint "$0"
  ; open log file for append
  FileOpen $1 "$TEMP\\idorendmaker-installer.log" a
  ${If} $1 != ""
    FileWrite $1 "$0$\r$\n"
    FileClose $1
  ${EndIf}
  Push $0            ; push message back so caller who does Pop will still work
FunctionEnd

!macro Log message
  Push "${message}"
  Call LogMessage
  Pop $0
!macroend

; ------- VC++ check & install -------
Function CheckVCRedist
    Push $0
    Push $1
    Push $2
    Push $3
    StrCpy $0 "0"
    ${If} ${RunningX64}
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X64_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                StrCpy $0 "1"
                Goto detection_done
            ${EndIf}
        ${EndIf}
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_WOW64_X64_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                StrCpy $0 "1"
                Goto detection_done
            ${EndIf}
        ${EndIf}
        ClearErrors
        ReadRegStr $2 HKLM "${VCREDIST_SERVICING_KEY}" "Version"
        ${IfNot} ${Errors}
            StrCpy $0 "1"
            Goto detection_done
        ${EndIf}
        ${If} ${FileExists} "$WINDIR\\System32\\vcruntime140_1.dll"
        ${AndIf} ${FileExists} "$WINDIR\\System32\\vcruntime140.dll"
        ${AndIf} ${FileExists} "$WINDIR\\System32\\msvcp140.dll"
            StrCpy $0 "1"
        ${EndIf}
    ${Else}
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X86_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                StrCpy $0 "1"
                Goto detection_done
            ${EndIf}
        ${EndIf}
        ${If} ${FileExists} "$WINDIR\\SysWOW64\\vcruntime140_1.dll"
        ${AndIf} ${FileExists} "$WINDIR\\SysWOW64\\vcruntime140.dll"
            StrCpy $0 "1"
        ${EndIf}
    ${EndIf}
detection_done:
    Pop $3
    Pop $2
    Pop $1
    Exch $0
FunctionEnd

Function InstallVCRedist
    Push $0
    Push $1
    Push $2
    Push $3
    Call CheckVCRedist
    Pop $0
    ${If} $0 == "1"
        DetailPrint "Visual C++ Redistributable already installed"
        Goto done
    ${EndIf}

    ${If} ${RunningX64}
        StrCpy $vcUrl "${VCREDIST_2015_2022_X64_URL}"
        StrCpy $vcFile "vc_redist.x64.exe"
    ${Else}
        StrCpy $vcUrl "${VCREDIST_2015_2022_X86_URL}"
        StrCpy $vcFile "vc_redist.x86.exe"
    ${EndIf}

    StrCpy $3 "$PLUGINSDIR\\$vcFile"
    DetailPrint "Downloading VC++ Redistributable..."
    inetc::get /WEAKSECURITY "$vcUrl" "$3" /END
    Pop $0
    ${If} $0 != "OK"
        MessageBox MB_OK|MB_ICONSTOP "Failed to download Visual C++ Redistributable. Please install manually from $vcUrl"
        Abort
    ${EndIf}
    ExecWait '"$3" /install /quiet /norestart' $0
    ${If} $0 == "0"
        DetailPrint "VC++ Redistributable installed successfully"
    ${ElseIf} $0 == "1638"
        DetailPrint "VC++ already installed (newer version)"
    ${ElseIf} $0 == "3010"
        DetailPrint "VC++ installed, restart required"
    ${Else}
        MessageBox MB_OK|MB_ICONSTOP "VC++ Redistributable installation failed (code $0). Please install manually."
        Abort
    ${EndIf}
done:
    Pop $3
    Pop $2
    Pop $1
    Pop $0
FunctionEnd

; ---------------- Copy DB with robust checks ----------------
Function CopyDatabase
  ; ensure we operate in the interactive user's shell context for APPDATA
  ; (when installer runs elevated this makes shell variables resolve for the user who launched the installer)
  SetShellVarContext current

  StrCpy $DB_DEST "$APPDATA\\idorendmaker\\idorendmaker.db"
  !insertmacro Log "=== DATABASE COPY PROCESS START ==="
  !insertmacro Log "Target destination: $DB_DEST"
  !insertmacro Log "Installation directory (INSTDIR): $INSTDIR"

  ; List installer top-level contents for debugging (full paths)
  !insertmacro Log "=== ACTUAL INSTALLER CONTENTS (top-level) ==="
  FindFirst $0 $1 "$INSTDIR\\*.*"
  loop:
    StrCmp $1 "" done
    ; $1 is filename only - create full path for logging
    StrCpy $R0 "$INSTDIR\\$1"
    !insertmacro Log "Found: $R0"
    FindNext $0 $1
    Goto loop
  done:
  FindClose $0
  !insertmacro Log "=== END INSTALLER CONTENTS ==="

  ; Also list $INSTDIR\resources
  ${If} ${FileExists} "$INSTDIR\\resources"
    !insertmacro Log "=== RESOURCES DIRECTORY CONTENTS ==="
    FindFirst $0 $1 "$INSTDIR\\resources\\*.*"
    loop2:
      StrCmp $1 "" done2
      StrCpy $R0 "$INSTDIR\\resources\\$1"
      !insertmacro Log "Resource: $R0"
      FindNext $0 $1
      Goto loop2
    done2:
    FindClose $0
    !insertmacro Log "=== END RESOURCES CONTENTS ==="
  ${Else}
    !insertmacro Log "No resources directory found in installer"
  ${EndIf}

  ; If destination exists, keep it (do not overwrite)
  ${If} ${FileExists} "$DB_DEST"
    !insertmacro Log "✅ Database already exists at $DB_DEST — keeping user data"
    !insertmacro Log "=== DATABASE COPY PROCESS END (SKIPPED) ==="
    ; restore shell context to 'all' before returning (good hygiene)
    SetShellVarContext all
    Return
  ${EndIf}

  ; Create AppData directory first (for interactive user)
  !insertmacro Log "Creating target directory: $APPDATA\\idorendmaker"
  CreateDirectory "$APPDATA\\idorendmaker"
  ${If} ${Errors}
    !insertmacro Log "❌ Failed to create $APPDATA\\idorendmaker (CreateDirectory returned error)"
  ${Else}
    !insertmacro Log "✅ Target directory exists: $APPDATA\\idorendmaker"
  ${EndIf}

  ; Candidate source locations (common pack layouts)
  StrCpy $SRC1 "$INSTDIR\\resources\\idorendmaker-production.db"
  StrCpy $SRC2 "$INSTDIR\\resources\\app.asar.unpacked\\idorendmaker-production.db"
  StrCpy $SRC3 "$INSTDIR\\idorendmaker-production.db"
  StrCpy $SRC4 "$INSTDIR\\app.asar.unpacked\\idorendmaker-production.db"

  !insertmacro Log "Checking source locations:"
  !insertmacro Log "  1: $SRC1"
  !insertmacro Log "  2: $SRC2"
  !insertmacro Log "  3: $SRC3"
  !insertmacro Log "  4: $SRC4"

  ; Try each source in turn using ${FileExists}
  ${If} ${FileExists} "$SRC1"
    !insertmacro Log "✅ Found DB at PRIMARY: $SRC1"
    CopyFiles "$SRC1" "$DB_DEST"
    ${If} ${FileExists} "$DB_DEST"
      !insertmacro Log "✅ DATABASE COPIED SUCCESSFULLY from primary source"
      SetShellVarContext all
      !insertmacro Log "=== DATABASE COPY PROCESS END (SUCCESS) ==="
      Return
    ${Else}
      !insertmacro Log "❌ Copy failed from primary source: $SRC1"
    ${EndIf}
  ${Else}
    !insertmacro Log "❌ Primary source not found: $SRC1"
  ${EndIf}

  ${If} ${FileExists} "$SRC2"
    !insertmacro Log "✅ Found DB at FALLBACK1: $SRC2"
    CopyFiles "$SRC2" "$DB_DEST"
    ${If} ${FileExists} "$DB_DEST"
      !insertmacro Log "✅ DATABASE COPIED SUCCESSFULLY from fallback1"
      SetShellVarContext all
      !insertmacro Log "=== DATABASE COPY PROCESS END (SUCCESS) ==="
      Return
    ${Else}
      !insertmacro Log "❌ Copy failed from fallback1"
    ${EndIf}
  ${Else}
    !insertmacro Log "❌ Fallback1 source not found: $SRC2"
  ${EndIf}

  ${If} ${FileExists} "$SRC3"
    !insertmacro Log "✅ Found DB at FALLBACK2: $SRC3"
    CopyFiles "$SRC3" "$DB_DEST"
    ${If} ${FileExists} "$DB_DEST"
      !insertmacro Log "✅ DATABASE COPIED SUCCESSFULLY from fallback2"
      SetShellVarContext all
      !insertmacro Log "=== DATABASE COPY PROCESS END (SUCCESS) ==="
      Return
    ${Else}
      !insertmacro Log "❌ Copy failed from fallback2"
    ${EndIf}
  ${Else}
    !insertmacro Log "❌ Fallback2 source not found: $SRC3"
  ${EndIf}

  ${If} ${FileExists} "$SRC4"
    !insertmacro Log "✅ Found DB at FALLBACK3: $SRC4"
    CopyFiles "$SRC4" "$DB_DEST"
    ${If} ${FileExists} "$DB_DEST"
      !insertmacro Log "✅ DATABASE COPIED SUCCESSFULLY from fallback3"
      SetShellVarContext all
      !insertmacro Log "=== DATABASE COPY PROCESS END (SUCCESS) ==="
      Return
    ${Else}
      !insertmacro Log "❌ Copy failed from fallback3"
    ${EndIf}
  ${Else}
    !insertmacro Log "❌ Fallback3 source not found: $SRC4"
  ${EndIf}

  !insertmacro Log "❌ DATABASE NOT FOUND IN ANY EXPECTED LOCATION"
  !insertmacro Log "=== DATABASE COPY PROCESS END (FAILED) ==="
  MessageBox MB_OK|MB_ICONEXCLAMATION "Warning: Database file not found in installer package.\n\nThe application will attempt to create a fresh database on first run.\n\nIf this persists, please reinstall the application."
  SetShellVarContext all
FunctionEnd

; electron-builder macros
!macro customInstall
    Call InstallVCRedist
    Call CopyDatabase
!macroend

!macro preWelcome
!macroend

!macro customFinish
    DetailPrint "Installation completed successfully."
    !insertmacro Log "Installation completed successfully."
    !insertmacro Log "Log file saved to: $TEMP\\idorendmaker-installer.log"
    DetailPrint "📋 Installation log saved to: $TEMP\\idorendmaker-installer.log"
!macroend

; Add a section to verify installer integrity before installation
Section "Verify Installation Package" SEC_VERIFY
    !insertmacro Log "=== INSTALLER PACKAGE VERIFICATION ==="
    !insertmacro Log "Checking installer package integrity..."

    ; Check if database source exists in installer
    ${If} ${FileExists} "$INSTDIR\\idorendmaker-production.db"
        !insertmacro Log "✅ Database found in installer package"
    ${ElseIf} ${FileExists} "$INSTDIR\\resources\\idorendmaker-production.db"
        !insertmacro Log "✅ Database found in resources directory"
    ${Else}
        !insertmacro Log "⚠️  Database not found in expected locations"
        !insertmacro Log "    This may indicate a packaging issue"
    ${EndIf}

    ; Check if executables exist
    ${If} ${FileExists} "$INSTDIR\\idorendmaker-backend.exe"
        !insertmacro Log "✅ Backend executable found"
    ${Else}
        !insertmacro Log "⚠️  Backend executable not found"
    ${EndIf}

    ${If} ${FileExists} "$INSTDIR\\idorendmaker-pdfprocessor.exe"
        !insertmacro Log "✅ PDF processor executable found"
    ${Else}
        !insertmacro Log "⚠️  PDF processor executable not found"
    ${EndIf}

    !insertmacro Log "=== PACKAGE VERIFICATION COMPLETE ==="
SectionEnd

Section "Prerequisites" SEC_PREREQ
    Call InstallVCRedist
    Call CopyDatabase
SectionEnd
