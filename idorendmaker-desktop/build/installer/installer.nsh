; Custom NSIS installer snippet for Időrend Készítő
!include "LogicLib.nsh"
!include "x64.nsh"

; declare user variables used later
Var DB_DEST
Var SRC1
Var SRC2
Var vcUrl
Var vcFile

!define VCREDIST_2015_2022_X64_URL "https://aka.ms/vs/17/release/vc_redist.x64.exe"
!define VCREDIST_2015_2022_X86_URL "https://aka.ms/vs/17/release/vc_redist.x86.exe"

!define VCREDIST_2015_2022_X64_KEY "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X64"
!define VCREDIST_2015_2022_X86_KEY "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X86"
!define VCREDIST_WOW64_X64_KEY "SOFTWARE\\Wow6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64"
!define VCREDIST_WOW64_X86_KEY "SOFTWARE\\Wow6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x86"
!define VCREDIST_SERVICING_KEY "SOFTWARE\\Microsoft\\DevDiv\\VC\\Servicing\\14.0\\RuntimeMinimum"

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

; ------- Copy DB (robust) -------
Function CopyDatabase
    ; destination path in %APPDATA% - matches backend expectation
    StrCpy $DB_DEST "$APPDATA\\idorendmaker\\idorendmaker.db"

    ; If destination exists, keep it (do not overwrite)
    ${If} ${FileExists} "$DB_DEST"
        DetailPrint "Database already exists at $DB_DEST — keeping user data"
        Return
    ${EndIf}

    ; Primary expected source (correct packaging)
    StrCpy $SRC1 "$INSTDIR\\resources\\idorendmaker-production.db"
    ; Fallback (in case the packer created resources/resources)
    StrCpy $SRC2 "$INSTDIR\\resources\\resources\\idorendmaker-production.db"

    ; Try primary
    ${If} ${FileExists} "$SRC1"
        DetailPrint "Found DB at $SRC1 — copying to $DB_DEST"
        CreateDirectory "$APPDATA\\idorendmaker"
        CopyFiles "$SRC1" "$DB_DEST"
        ${If} ${FileExists} "$DB_DEST"
            DetailPrint "DB copied successfully."
            Return
        ${EndIf}
    ${EndIf}

    ; Try fallback
    ${If} ${FileExists} "$SRC2"
        DetailPrint "Found DB at fallback $SRC2 — copying to $DB_DEST"
        CreateDirectory "$APPDATA\\idorendmaker"
        CopyFiles "$SRC2" "$DB_DEST"
        ${If} ${FileExists} "$DB_DEST"
            DetailPrint "DB copied successfully from fallback."
            Return
        ${EndIf}
    ${EndIf}

    ; Not found
    MessageBox MB_OK|MB_ICONEXCLAMATION "Warning: packaged database file not found. The app may create a fresh DB on first run."
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
!macroend

Section "Prerequisites" SEC_PREREQ
    Call InstallVCRedist
    Call CopyDatabase
SectionEnd
