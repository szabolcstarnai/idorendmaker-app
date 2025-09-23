; installer.nsh - robust DB copy using Windows copy command (works after unpack)
; Save as UTF-8 (no BOM) to build/installer/installer.nsh

!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"

; ---------------- variables ----------------
Var DB_DEST
Var SRC1
Var SRC2
Var SRC3
Var SRC4
Var vcUrl
Var vcFile
Var LOG_HANDLE

!define VCREDIST_2015_2022_X64_URL "https://aka.ms/vs/17/release/vc_redist.x64.exe"
!define VCREDIST_2015_2022_X86_URL "https://aka.ms/vs/17/release/vc_redist.x86.exe"

!define VCREDIST_2015_2022_X64_KEY "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X64"
!define VCREDIST_2015_2022_X86_KEY "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X86"
!define VCREDIST_WOW64_X64_KEY "SOFTWARE\\Wow6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64"
!define VCREDIST_WOW64_X86_KEY "SOFTWARE\\Wow6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x86"
!define VCREDIST_SERVICING_KEY "SOFTWARE\\Microsoft\\DevDiv\\VC\\Servicing\\14.0\\RuntimeMinimum"

; ---------------- logging helper ----------------
Function LogMessage
  Exch $0
  ; print into installer UI (useful)
  DetailPrint "$0"
  ; append to file
  FileOpen $1 "$TEMP\\idorendmaker-installer.log" a
  ${If} $1 != ""
    FileWrite $1 "$0$\r$\n"
    FileClose $1
  ${Else}
    ; fallback - still print to UI
    DetailPrint "!! Failed to open log file for append"
  ${EndIf}
  Push $0
FunctionEnd

!macro Log message
  Push "${message}"
  Call LogMessage
  Pop $0
!macroend

; ---------------- VC++ detection (non-blocking) ----------------
Function CheckVCRedist
    Push $0
    Push $1
    Push $2
    StrCpy $0 "0"
    ${If} ${RunningX64}
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X64_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                StrCpy $0 "1"
            ${EndIf}
        ${EndIf}
        ClearErrors
        ReadRegStr $2 HKLM "${VCREDIST_SERVICING_KEY}" "Version"
        ${IfNot} ${Errors}
            StrCpy $0 "1"
        ${EndIf}
    ${Else}
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X86_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                StrCpy $0 "1"
            ${EndIf}
        ${EndIf}
    ${EndIf}
    Pop $2
    Pop $1
    Exch $0
FunctionEnd

Function InstallVCRedist
    Push $0
    Call CheckVCRedist
    Pop $0
    ${If} $0 == "1"
        !insertmacro Log "VC++ Redistributable already installed"
        Goto done_vc
    ${EndIf}

    ; If not present, we will attempt to download and install.
    ; NOTE: if you observed that this download blocks your runs, comment out the inetc::get logic
    ; or pre-install the VC++ runtime on target machines.
    ${If} ${RunningX64}
        StrCpy $vcUrl "${VCREDIST_2015_2022_X64_URL}"
        StrCpy $vcFile "vc_redist.x64.exe"
    ${Else}
        StrCpy $vcUrl "${VCREDIST_2015_2022_X86_URL}"
        StrCpy $vcFile "vc_redist.x86.exe"
    ${EndIf}

    StrCpy $R0 "$PLUGINSDIR\\$vcFile"
    !insertmacro Log "Attempting to download VC++ Redistributable to $R0"
    ; only run if inetc plugin exists; otherwise skip with a warning
    ClearErrors
    inetc::get /WEAKSECURITY "$vcUrl" "$R0" /END
    Pop $R1
    ${If} $R1 != "OK"
        !insertmacro Log "VC++ redistributable download failed or inetc plugin missing; skipping automatic install. ($R1)"
        Goto done_vc
    ${EndIf}
    ExecWait '"$R0" /install /quiet /norestart' $R1
    !insertmacro Log "VC++ installer returned exit code: $R1"
done_vc:
    Pop $0
FunctionEnd

; ---------------- Copy DB using cmd copy ----------------
Function CopyDatabase
  ; operate on interactive user's profile
  SetShellVarContext current

  ; Target path (exact place you verified by hand)
  StrCpy $DB_DEST "$LOCALAPPDATA\\idorendmaker-desktop\\idorendmaker.db"

  !insertmacro Log "=== DATABASE COPY PROCESS START ==="
  !insertmacro Log "Target destination (LOCALAPPDATA): $DB_DEST"
  !insertmacro Log "Installation directory (INSTDIR): $INSTDIR"

  ; List top-level contents for debugging
  !insertmacro Log "=== ACTUAL INSTALLER CONTENTS (top-level) ==="
  FindFirst $0 $1 "$INSTDIR\\*.*"
  loopA:
    StrCmp $1 "" doneA
    StrCpy $R0 "$INSTDIR\\$1"
    !insertmacro Log "Found: $R0"
    FindNext $0 $1
    Goto loopA
  doneA:
  FindClose $0
  !insertmacro Log "=== END INSTALLER CONTENTS ==="

  ; List resources dir for debugging
  ${If} ${FileExists} "$INSTDIR\\resources"
    !insertmacro Log "=== RESOURCES DIRECTORY CONTENTS ==="
    FindFirst $0 $1 "$INSTDIR\\resources\\*.*"
    loopB:
      StrCmp $1 "" doneB
      StrCpy $R0 "$INSTDIR\\resources\\$1"
      !insertmacro Log "Resource: $R0"
      FindNext $0 $1
      Goto loopB
    doneB:
    FindClose $0
    !insertmacro Log "=== END RESOURCES CONTENTS ==="
  ${Else}
    !insertmacro Log "No resources directory found at $INSTDIR\\resources"
  ${EndIf}

  ; If destination exists, keep it (do not overwrite)
  ${If} ${FileExists} "$DB_DEST"
    !insertmacro Log "✅ Database already exists at $DB_DEST — keeping user data"
    !insertmacro Log "=== DATABASE COPY PROCESS END (SKIPPED) ==="
    SetShellVarContext all
    MessageBox MB_OK "Database already present at: $DB_DEST"
    Return
  ${EndIf}

  ; Create directory first
  !insertmacro Log "Creating directory: $LOCALAPPDATA\\idorendmaker-desktop"
  CreateDirectory "$LOCALAPPDATA\\idorendmaker-desktop"
  ${If} ${Errors}
    !insertmacro Log "❌ CreateDirectory reported an error for $LOCALAPPDATA\\idorendmaker-desktop"
  ${Else}
    !insertmacro Log "✅ Target directory exists: $LOCALAPPDATA\\idorendmaker-desktop"
  ${EndIf}

  ; Candidate packaged sources
  StrCpy $SRC1 "$INSTDIR\\resources\\idorendmaker-production.db"
  StrCpy $SRC2 "$INSTDIR\\resources\\app.asar.unpacked\\idorendmaker-production.db"
  StrCpy $SRC3 "$INSTDIR\\idorendmaker-production.db"
  StrCpy $SRC4 "$INSTDIR\\app.asar.unpacked\\idorendmaker-production.db"

  !insertmacro Log "Checking source locations:"
  !insertmacro Log "  1: $SRC1"
  !insertmacro Log "  2: $SRC2"
  !insertmacro Log "  3: $SRC3"
  !insertmacro Log "  4: $SRC4"

  ; Try each source using Windows 'copy' via cmd.exe (more robust in strange environments)
  ; Primary:
  ${If} ${FileExists} "$SRC1"
    !insertmacro Log "✅ Found DB at PRIMARY: $SRC1"
    ; use cmd copy. use /Y to overwrite, though target won't exist here
    StrCpy $R0 'cmd.exe /C copy /Y "$SRC1" "$DB_DEST"'
    !insertmacro Log "Running: $R0"
    ExecWait '$R0' $R1
    !insertmacro Log "cmd copy returned code: $R1"
    ${If} $R1 == 0
      ${If} ${FileExists} "$DB_DEST"
        !insertmacro Log "✅ DATABASE COPIED SUCCESSFULLY from primary source"
        SetShellVarContext all
        MessageBox MB_OK "Database copied to: $DB_DEST"
        !insertmacro Log "=== DATABASE COPY PROCESS END (SUCCESS) ==="
        Return
      ${EndIf}
      !insertmacro Log "❌ After cmd copy, destination not found even though rc=0"
    ${Else}
      !insertmacro Log "❌ cmd copy failed with exit code $R1"
    ${EndIf}
  ${Else}
    !insertmacro Log "❌ Primary source not found: $SRC1"
  ${EndIf}

  ; Fallback 1:
  ${If} ${FileExists} "$SRC2"
    !insertmacro Log "✅ Found DB at FALLBACK1: $SRC2"
    StrCpy $R0 'cmd.exe /C copy /Y "$SRC2" "$DB_DEST"'
    !insertmacro Log "Running: $R0"
    ExecWait '$R0' $R1
    !insertmacro Log "cmd copy returned code: $R1"
    ${If} $R1 == 0
      ${If} ${FileExists} "$DB_DEST"
        !insertmacro Log "✅ DATABASE COPIED SUCCESSFULLY from fallback1"
        SetShellVarContext all
        MessageBox MB_OK "Database copied to: $DB_DEST"
        !insertmacro Log "=== DATABASE COPY PROCESS END (SUCCESS) ==="
        Return
      ${EndIf}
      !insertmacro Log "❌ After cmd copy, destination not found even though rc=0"
    ${Else}
      !insertmacro Log "❌ cmd copy failed with exit code $R1"
    ${EndIf}
  ${Else}
    !insertmacro Log "❌ Fallback1 source not found: $SRC2"
  ${EndIf}

  ; Fallback 2:
  ${If} ${FileExists} "$SRC3"
    !insertmacro Log "✅ Found DB at FALLBACK2: $SRC3"
    StrCpy $R0 'cmd.exe /C copy /Y "$SRC3" "$DB_DEST"'
    !insertmacro Log "Running: $R0"
    ExecWait '$R0' $R1
    !insertmacro Log "cmd copy returned code: $R1"
    ${If} $R1 == 0
      ${If} ${FileExists} "$DB_DEST"
        !insertmacro Log "✅ DATABASE COPIED SUCCESSFULLY from fallback2"
        SetShellVarContext all
        MessageBox MB_OK "Database copied to: $DB_DEST"
        !insertmacro Log "=== DATABASE COPY PROCESS END (SUCCESS) ==="
        Return
      ${EndIf}
      !insertmacro Log "❌ After cmd copy, destination not found even though rc=0"
    ${Else}
      !insertmacro Log "❌ cmd copy failed with exit code $R1"
    ${EndIf}
  ${Else}
    !insertmacro Log "❌ Fallback2 source not found: $SRC3"
  ${EndIf}

  ; Fallback 3:
  ${If} ${FileExists} "$SRC4"
    !insertmacro Log "✅ Found DB at FALLBACK3: $SRC4"
    StrCpy $R0 'cmd.exe /C copy /Y "$SRC4" "$DB_DEST"'
    !insertmacro Log "Running: $R0"
    ExecWait '$R0' $R1
    !insertmacro Log "cmd copy returned code: $R1"
    ${If} $R1 == 0
      ${If} ${FileExists} "$DB_DEST"
        !insertmacro Log "✅ DATABASE COPIED SUCCESSFULLY from fallback3"
        SetShellVarContext all
        MessageBox MB_OK "Database copied to: $DB_DEST"
        !insertmacro Log "=== DATABASE COPY PROCESS END (SUCCESS) ==="
        Return
      ${EndIf}
      !insertmacro Log "❌ After cmd copy, destination not found even though rc=0"
    ${Else}
      !insertmacro Log "❌ cmd copy failed with exit code $R1"
    ${EndIf}
  ${Else}
    !insertmacro Log "❌ Fallback3 source not found: $SRC4"
  ${EndIf}

  !insertmacro Log "❌ DATABASE NOT FOUND IN ANY EXPECTED LOCATION"
  !insertmacro Log "=== DATABASE COPY PROCESS END (FAILED) ==="
  MessageBox MB_OK|MB_ICONEXCLAMATION "Warning: Database file not found in installer package.\n\nCheck $TEMP\\idorendmaker-installer.log for details."
  SetShellVarContext all
FunctionEnd

; ---------------- electron-builder hooks ----------------
!macro customInstall
    ; perform prereq checks; we do not let VC install block DB copy later
    Call InstallVCRedist
!macroend

!macro preWelcome
!macroend

!macro customFinish
    DetailPrint "Installation finished (customFinish). Beginning post-unpack tasks..."
    !insertmacro Log "Installation completed successfully. Running CopyDatabase..."
    Call CopyDatabase
    !insertmacro Log "Post-unpack steps complete. Installer log: $TEMP\\idorendmaker-installer.log"
    DetailPrint "📋 Installation log: $TEMP\\idorendmaker-installer.log"
!macroend

; ---------------- optional verify section ----------------
Section "Verify installer package (debug only)" SEC_VERIFY
    !insertmacro Log "=== PACKAGE VERIFICATION ==="
    ${If} ${FileExists} "$INSTDIR\\resources\\idorendmaker-production.db"
        !insertmacro Log "✅ DB present in $INSTDIR\\resources"
    ${Else}
        !insertmacro Log "❌ DB missing from $INSTDIR\\resources"
    ${EndIf}
    ${If} ${FileExists} "$INSTDIR\\resources\\idorendmaker-backend.exe"
        !insertmacro Log "✅ Backend EXE present"
    ${Else}
        !insertmacro Log "❌ Backend EXE missing"
    ${EndIf}
    ${If} ${FileExists} "$INSTDIR\\resources\\idorendmaker-pdfprocessor.exe"
        !insertmacro Log "✅ PDF processor EXE present"
    ${Else}
        !insertmacro Log "❌ PDF processor EXE missing"
    ${EndIf}
    !insertmacro Log "=== PACKAGE VERIFICATION COMPLETE ==="
SectionEnd

Section "Prerequisites" SEC_PREREQ
    Call InstallVCRedist
SectionEnd
