; installer.nsh - online-only installer
; Save as UTF-8 (no BOM) to build/installer/installer.nsh

!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"

; show the Details pane by default (must be at top-level, NOT inside a Function)
; ShowInstDetails show

; ---------------- variables ----------------
Var DB_DEST
Var SRC1
Var SRC2
Var SRC3
Var SRC4
Var vcUrl
Var vcFile

!define VCREDIST_2015_2022_X64_URL "https://aka.ms/vs/17/release/vc_redist.x64.exe"
!define VCREDIST_2015_2022_X86_URL "https://aka.ms/vs/17/release/vc_redist.x86.exe"

!define VCREDIST_2015_2022_X64_KEY "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X64"
!define VCREDIST_2015_2022_X86_KEY "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X86"
!define VCREDIST_WOW64_X64_KEY "SOFTWARE\\Wow6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64"
!define VCREDIST_WOW64_X86_KEY "SOFTWARE\\Wow6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x86"
!define VCREDIST_SERVICING_KEY "SOFTWARE\\Microsoft\\DevDiv\\VC\\Servicing\\14.0\\RuntimeMinimum"

; ---------------- JRE download/install configuration ----------------
!define REQUIRED_JAVA_MAJOR "23"
!define JRE_DOWNLOAD_URL "https://github.com/adoptium/temurin23-binaries/releases/download/jdk-23.0.2%2B7/OpenJDK23U-jre_x64_windows_hotspot_23.0.2_7.zip"
!define JRE_FILENAME "OpenJDK23U-jre_x64_windows_hotspot_23.0.2_7.zip"

; check-java.ps1 must be included in the installer build (File ... check-java.ps1)

!macro customHeader
  ShowInstDetails show
  ShowUninstDetails show
!macroend

; ---------------- Fatal abort helper (Hungarian) ----------------
; Usage: Push "részletek..." ; Call FatalAbort
Function FatalAbort
  SetDetailsPrint both
  Exch $0
  ; print a final detail line so the user can see the reason
  DetailPrint "$0"
  ; show a Hungarian message box explaining install aborted
  MessageBox MB_OK|MB_ICONEXCLAMATION "Hiba: a telepítés megszakadt. Részletek a telepítő ablakában találhatók."
  Abort
FunctionEnd

; ---------------- VC++ detection (non-blocking) ----------------
Function CheckVCRedist
    SetDetailsPrint both
    Push $0
    Push $1
    Push $2
    StrCpy $0 "0"

    ClearErrors
    ${If} ${RunningX64}
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
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_WOW64_X64_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                StrCpy $0 "1"
            ${EndIf}
        ${EndIf}
    ${Else}
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X86_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                StrCpy $0 "1"
            ${EndIf}
        ${EndIf}
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_WOW64_X86_KEY}" "Installed"
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
    SetDetailsPrint both
    Push $0
    ; check presence
    Call CheckVCRedist
    Pop $0
    ${If} $0 == "1"
        DetailPrint "VC++ futtatókörnyezet már telepítve, telepítés kihagyva."
        Pop $0
        Return
    ${EndIf}

    ${If} ${RunningX64}
        StrCpy $vcUrl "${VCREDIST_2015_2022_X64_URL}"
        StrCpy $vcFile "vc_redist.x64.exe"
    ${Else}
        StrCpy $vcUrl "${VCREDIST_2015_2022_X86_URL}"
        StrCpy $vcFile "vc_redist.x86.exe"
    ${EndIf}

    StrCpy $R0 "$PLUGINSDIR\\$vcFile"
    DetailPrint "VC++ futtatókörnyezet telepítő letöltése: $vcUrl"

    ClearErrors
    inetc::get "$vcUrl" "$R0" /END
    Pop $R1
    ${If} $R1 != "OK"
        ; fatal: no internet or download failed
        Push "VC++ futtatókörnyezet telepítő letöltése sikertelen. Ellenőrizze az internetkapcsolatot: $vcUrl"
        Call FatalAbort
    ${EndIf}

    DetailPrint "VC++ telepítő futtatása..."
    ExecWait '"$R0" /install /quiet /norestart' $R1
    ${If} $R1 != 0
        Push "VC++ futtatókörnyezet telepítő hibakóddal tért vissza: $R1"
        Call FatalAbort
    ${EndIf}

    DetailPrint "VC++ futtatókörnyezet telepítés befejeződött."
    Pop $0
FunctionEnd

; ---------------- Java detection & install ----------------
Function InstallJRE
  SetDetailsPrint both
  Push $0
  Push $1
  Push $2

  DetailPrint "Java futtatókörnyezet ellenőrzése..."

  SetOutPath "$PLUGINSDIR"
  File "${BUILD_RESOURCES_DIR}\\installer\\check-java.ps1"

  nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\\check-java.ps1" -RequiredMajor ${REQUIRED_JAVA_MAJOR}'
  Pop $R0
  Pop $R1

  ${If} $R0 == 0
    DetailPrint "Megfelelő Java (>= ${REQUIRED_JAVA_MAJOR}) futtatókörnyezet megtalálva a PATH-ban, helyi JRE csomagolás kihagyva."
    Pop $2
    Pop $1
    Pop $0
    Return
  ${EndIf}

  DetailPrint "Java futtatókörnyezet hiányzik vagy túl régi (kód: $R0). JRE letöltése és helyi kicsomagolás..."

  StrCpy $R0 "$PLUGINSDIR\\${JRE_FILENAME}"
  ClearErrors
  inetc::get "${JRE_DOWNLOAD_URL}" "$R0" /END
  Pop $R1
  ${If} $R1 != "OK"
    Push "JRE letöltése sikertelen. Ellenőrizze az internetkapcsolatot: ${JRE_DOWNLOAD_URL}"
    Call FatalAbort
  ${EndIf}

  DetailPrint "JRE ZIP fájl kicsomagolása..."
  CreateDirectory "$INSTDIR\\resources"

  ; Extract ZIP using PowerShell - use Expand-Archive with proper variable substitution
  nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path \"$R0\" -DestinationPath \"$INSTDIR\\resources\" -Force"'
  Pop $R1
  Pop $R2
  ${If} $R1 != 0
    Push "ZIP kicsomagolása sikertelen (kód: $R1). Részletek: $R2"
    Call FatalAbort
  ${EndIf}

  ; Verify the extracted directory exists (exact name: jdk-23.0.2+7-jre)
  StrCpy $R3 "$INSTDIR\\resources\\jdk-23.0.2+7-jre"
  ${If} ${FileExists} "$R3"
    DetailPrint "Kicsomagolt JRE könyvtár megtalálva: jdk-23.0.2+7-jre"
  ${Else}
    Push "JRE könyvtár nem található kicsomagolás után: $R3"
    Call FatalAbort
  ${EndIf}

  ; Create target jre directory
  CreateDirectory "$INSTDIR\\resources\\jre"
  ${If} ${Errors}
    Push "JRE célkönyvtár létrehozása sikertelen"
    Call FatalAbort
  ${EndIf}

  ; Move contents of extracted directory to jre folder using robocopy for reliability
  DetailPrint "JRE fájlok áthelyezése a végső helyre..."
  nsExec::ExecToStack 'robocopy "$R3" "$INSTDIR\\resources\\jre" /E /MOVE /R:2 /W:1'
  Pop $R4
  Pop $R5

  ; robocopy exit codes: 0-7 are success, 8+ are errors
  ${If} $R4 > 7
    Push "JRE fájlok áthelyezése sikertelen (robocopy kód: $R4)"
    Call FatalAbort
  ${EndIf}

  ; Clean up empty extracted directory
  RMDir "$R3"

  ; Final verification
  ${If} ${FileExists} "$INSTDIR\\resources\\jre\\bin\\java.exe"
    DetailPrint "JRE sikeresen telepítve és java.exe elérhető."
  ${Else}
    Push "JRE telepítés befejezve, de java.exe nem található: $INSTDIR\\resources\\jre\\bin\\java.exe"
    Call FatalAbort
  ${EndIf}

  DetailPrint "JRE helyi telepítése sikeresen befejezve."
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

; ---------------- Copy DB using cmd copy ----------------
Function CopyDatabase
  SetDetailsPrint both
  SetShellVarContext current

  StrCpy $DB_DEST "$LOCALAPPDATA\\idorendmaker\\idorendmaker.db"
  DetailPrint "Adatbázis cél helye: $DB_DEST"

  ${If} ${FileExists} "$DB_DEST"
    DetailPrint "Adatbázis már létezik, felhasználói adatok megőrizve."
    SetShellVarContext all
    Return
  ${EndIf}

  CreateDirectory "$LOCALAPPDATA\\idorendmaker"
  ; We ignore CreateDirectory errors here; copy will fail if directory creation actually failed.

  StrCpy $SRC1 "$INSTDIR\\resources\\idorendmaker-production.db"
  StrCpy $SRC2 "$INSTDIR\\resources\\app.asar.unpacked\\idorendmaker-production.db"
  StrCpy $SRC3 "$INSTDIR\\idorendmaker-production.db"
  StrCpy $SRC4 "$INSTDIR\\app.asar.unpacked\\idorendmaker-production.db"

  DetailPrint "Adatbázis források ellenőrzése (sorrend):"
  DetailPrint "  1: $SRC1"
  DetailPrint "  2: $SRC2"
  DetailPrint "  3: $SRC3"
  DetailPrint "  4: $SRC4"

  ${If} ${FileExists} "$SRC1"
    DetailPrint "Talált adatbázis: $SRC1"
    StrCpy $R0 'cmd.exe /C copy /Y "$SRC1" "$DB_DEST"'
    ExecWait '$R0' $R1
    ${If} $R1 == 0
      ${If} ${FileExists} "$DB_DEST"
        DetailPrint "Adatbázis sikeresen átmásolva (forrás: 1)."
        SetShellVarContext all
        Return
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ${If} ${FileExists} "$SRC2"
    DetailPrint "Talált adatbázis: $SRC2"
    StrCpy $R0 'cmd.exe /C copy /Y "$SRC2" "$DB_DEST"'
    ExecWait '$R0' $R1
    ${If} $R1 == 0
      ${If} ${FileExists} "$DB_DEST"
        DetailPrint "Adatbázis sikeresen átmásolva (forrás: 2)."
        SetShellVarContext all
        Return
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ${If} ${FileExists} "$SRC3"
    DetailPrint "Talált adatbázis: $SRC3"
    StrCpy $R0 'cmd.exe /C copy /Y "$SRC3" "$DB_DEST"'
    ExecWait '$R0' $R1
    ${If} $R1 == 0
      ${If} ${FileExists} "$DB_DEST"
        DetailPrint "Adatbázis sikeresen átmásolva (forrás: 3)."
        SetShellVarContext all
        Return
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ${If} ${FileExists} "$SRC4"
    DetailPrint "Talált adatbázis: $SRC4"
    StrCpy $R0 'cmd.exe /C copy /Y "$SRC4" "$DB_DEST"'
    ExecWait '$R0' $R1
    ${If} $R1 == 0
      ${If} ${FileExists} "$DB_DEST"
        DetailPrint "Adatbázis sikeresen átmásolva (forrás: 4)."
        SetShellVarContext all
        Return
      ${EndIf}
    ${EndIf}
  ${EndIf}

  DetailPrint "Nem találtam csomagolt adatbázist; folytatom a telepítést anélkül, hogy felülírnám a felhasználói adatokat."
  SetShellVarContext all
FunctionEnd

; ---------------- electron-builder hook: canonical install entry ----------------
!macro customInstall
    SetDetailsPrint both
    DetailPrint "Telepítés megkezdése..."
    Call InstallVCRedist
    Call InstallJRE
    Call CopyDatabase
    DetailPrint "Telepítés befejeződött."
!macroend

; ---------- early init: connectivity check (prevents unpack/install if offline) ----------
!macro preInit
  InitPluginsDir

  ; Run a small PowerShell connectivity test (download google 204 endpoint)
  nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $wc = New-Object System.Net.WebClient; $wc.DownloadString(\"https://www.google.com/generate_204\") | Out-Null; exit 0 } catch { exit 1 }"'
  Pop $R0    ; exit code
  Pop $R1    ; stdout/stderr (ignored)

  ${If} $R0 != 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "Hiba: nincs internetkapcsolat vagy a telepítő nem tud letölteni szükséges fájlokat. Kérjük, ellenőrizze az internetkapcsolatot és futtassa újra a telepítőt."
    Abort
  ${EndIf}
!macroend
