; installer.nsh - online-only installer
; Save as UTF-8 (no BOM) to build/installer/installer.nsh

!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"

; show the Details pane by default (must be at top-level, NOT inside a Function)
; ShowInstDetails show

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

; ---------------- electron-builder hook: canonical install entry ----------------
; Note: no database copying needed — the app self-initialises both databases on
; first launch: catalog.db is seeded from the bundled JAR classpath resource by
; CatalogBootstrapService, and user.db is created by Liquibase migrations.
!macro customInstall
    SetDetailsPrint both
    Call InstallJRE
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

Section "Log start" LOG_START
    SetDetailsPrint both
    DetailPrint "Aktív internet kapcsolat van. Amennyiben szükséges, a telepítő fájlokat tölthet le."
    DetailPrint "Telepítés megkezdése..."
    DetailPrint "Fájlok kicsomagolása..."
SectionEnd