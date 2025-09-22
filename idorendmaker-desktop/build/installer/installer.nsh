; ====================================================================
; Custom NSIS installer script for Időrend Készítő
; Handles prerequisites (Microsoft Visual C++ Redistributable 2015-2022)
; Copies bundled preloaded database to %APPDATA%\idorendmaker on first install
; ====================================================================

!include "LogicLib.nsh"
!include "x64.nsh"

; ---------------------------
; Constants / URLs
; ---------------------------
!define VCREDIST_2015_2022_X64_URL "https://aka.ms/vs/17/release/vc_redist.x64.exe"
!define VCREDIST_2015_2022_X86_URL "https://aka.ms/vs/17/release/vc_redist.x86.exe"

!define VCREDIST_2015_2022_X64_KEY "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X64"
!define VCREDIST_2015_2022_X86_KEY "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X86"
!define VCREDIST_WOW64_X64_KEY    "SOFTWARE\Wow6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64"
!define VCREDIST_WOW64_X86_KEY    "SOFTWARE\Wow6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x86"
!define VCREDIST_SERVICING_KEY    "SOFTWARE\Microsoft\DevDiv\VC\Servicing\14.0\RuntimeMinimum"

; ---------------------------
; Function: Check if VC++ Runtime installed
; ---------------------------
Function CheckVCRedist
    Push $0
    Push $1
    Push $2
    Push $3

    StrCpy $0 "0"

    ${If} ${RunningX64}
        ; --- Check x64 registry keys ---
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

        ; Check DLLs
        ${If} ${FileExists} "$WINDIR\System32\vcruntime140_1.dll"
        ${AndIf} ${FileExists} "$WINDIR\System32\vcruntime140.dll"
        ${AndIf} ${FileExists} "$WINDIR\System32\msvcp140.dll"
            StrCpy $0 "1"
        ${EndIf}
    ${Else}
        ; --- Check x86 registry keys ---
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X86_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                StrCpy $0 "1"
                Goto detection_done
            ${EndIf}
        ${EndIf}

        ; Check DLLs in SysWOW64 (32-bit)
        ${If} ${FileExists} "$WINDIR\SysWOW64\vcruntime140_1.dll"
        ${AndIf} ${FileExists} "$WINDIR\SysWOW64\vcruntime140.dll"
            StrCpy $0 "1"
        ${EndIf}
    ${EndIf}

detection_done:
    Pop $3
    Pop $2
    Pop $1
    Exch $0
FunctionEnd

; ---------------------------
; Function: Install VC++ Redistributable
; ---------------------------
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

    ; Choose proper installer
    ${If} ${RunningX64}
        StrCpy $1 "${VCREDIST_2015_2022_X64_URL}"
        StrCpy $2 "vc_redist.x64.exe"
    ${Else}
        StrCpy $1 "${VCREDIST_2015_2022_X86_URL}"
        StrCpy $2 "vc_redist.x86.exe"
    ${EndIf}

    StrCpy $3 "$PLUGINSDIR\$2"

    DetailPrint "Downloading VC++ Redistributable..."
    inetc::get /WEAKSECURITY "$1" "$3" /END
    Pop $0

    ${If} $0 != "OK"
        MessageBox MB_OK|MB_ICONSTOP "Failed to download Visual C++ Redistributable. Please install manually from $1"
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

; ---------------------------
; Function: Copy Preloaded Database
; ---------------------------
Function CopyDatabase
    StrCpy $0 "$APPDATA\idorendmaker\idorendmaker.db"
    ${IfNot} ${FileExists} "$0"
        DetailPrint "Copying preloaded DB..."
        CreateDirectory "$APPDATA\idorendmaker"
        CopyFiles "$INSTDIR\resources\idorendmaker-production.db" "$0"
    ${Else}
        DetailPrint "Database already exists – keeping user data"
    ${EndIf}
FunctionEnd

; ---------------------------
; electron-builder integration macros
; ---------------------------
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
