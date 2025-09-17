; Custom NSIS script for Időrend Készítő
; Handles Visual C++ Redistributable 2015-2022 installation
; Based on Microsoft best practices and community research

; Include required plugins
!include "LogicLib.nsh"
!include "x64.nsh"

; Visual C++ Redistributable URLs (official Microsoft links)
!define VCREDIST_2015_2022_X64_URL "https://aka.ms/vs/17/release/vc_redist.x64.exe"
!define VCREDIST_2015_2022_X86_URL "https://aka.ms/vs/17/release/vc_redist.x86.exe"

; Registry keys for detection (Microsoft recommended locations)
; Primary registry locations for VC++ 2015-2022 (all use version 14.0)
!define VCREDIST_2015_2022_X64_KEY "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X64"
!define VCREDIST_2015_2022_X86_KEY "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X86"

; Alternative registry locations (32-bit on 64-bit systems)
!define VCREDIST_WOW64_X64_KEY "SOFTWARE\Wow6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64"
!define VCREDIST_WOW64_X86_KEY "SOFTWARE\Wow6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x86"

; Service pack registry location
!define VCREDIST_SERVICING_KEY "SOFTWARE\Microsoft\DevDiv\VC\Servicing\14.0\RuntimeMinimum"

; Enhanced function to check if VC++ Redistributable is installed
; Uses Microsoft recommended detection methods with fallbacks
Function CheckVCRedist
    Push $0  ; Result variable
    Push $1  ; Registry value
    Push $2  ; Version string
    Push $3  ; Temp variable

    ; Initialize result to "not installed"
    StrCpy $0 "0"

    DetailPrint "Checking for Visual C++ Redistributable installation..."

    ; Check 64-bit version first on x64 systems
    ${If} ${RunningX64}
        DetailPrint "Checking x64 version..."

        ; Method 1: Check primary registry location for x64
        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X64_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                DetailPrint "Found VC++ Redistributable in primary x64 registry"
                StrCpy $0 "1"
                Goto detection_done
            ${EndIf}
        ${EndIf}

        ; Method 2: Check WOW64 registry location
        ${If} $0 == "0"
            ClearErrors
            ReadRegDWORD $1 HKLM "${VCREDIST_WOW64_X64_KEY}" "Installed"
            ${IfNot} ${Errors}
                ${If} $1 == "1"
                    DetailPrint "Found VC++ Redistributable in WOW64 registry"
                    StrCpy $0 "1"
                    Goto detection_done
                ${EndIf}
            ${EndIf}
        ${EndIf}

        ; Method 3: Check servicing registry location
        ${If} $0 == "0"
            ClearErrors
            ReadRegStr $2 HKLM "${VCREDIST_SERVICING_KEY}" "Version"
            ${IfNot} ${Errors}
                DetailPrint "Found VC++ Redistributable in servicing registry: $2"
                StrCpy $0 "1"
                Goto detection_done
            ${EndIf}
        ${EndIf}

        ; Method 4: Check for critical DLL files directly
        ${If} $0 == "0"
            ${If} ${FileExists} "$WINDIR\System32\vcruntime140_1.dll"
            ${AndIf} ${FileExists} "$WINDIR\System32\vcruntime140.dll"
            ${AndIf} ${FileExists} "$WINDIR\System32\msvcp140.dll"
                DetailPrint "Found VC++ Redistributable DLL files in System32"
                StrCpy $0 "1"
                Goto detection_done
            ${EndIf}
        ${EndIf}

    ${Else}
        ; Check 32-bit version on x86 systems
        DetailPrint "Checking x86 version..."

        ClearErrors
        ReadRegDWORD $1 HKLM "${VCREDIST_2015_2022_X86_KEY}" "Installed"
        ${IfNot} ${Errors}
            ${If} $1 == "1"
                DetailPrint "Found VC++ Redistributable in x86 registry"
                StrCpy $0 "1"
                Goto detection_done
            ${EndIf}
        ${EndIf}

        ; Check for DLL files in SysWOW64 on 32-bit systems
        ${If} $0 == "0"
            ${If} ${FileExists} "$WINDIR\SysWOW64\vcruntime140_1.dll"
            ${AndIf} ${FileExists} "$WINDIR\SysWOW64\vcruntime140.dll"
                DetailPrint "Found VC++ Redistributable DLL files in SysWOW64"
                StrCpy $0 "1"
            ${EndIf}
        ${EndIf}
    ${EndIf}

    detection_done:
    ${If} $0 == "1"
        DetailPrint "Visual C++ Redistributable detected - installation not required"
    ${Else}
        DetailPrint "Visual C++ Redistributable not detected - installation required"
    ${EndIf}

    Pop $3
    Pop $2
    Pop $1
    Exch $0  ; Return result on stack
FunctionEnd

; Function to download and install VC++ Redistributable
Function InstallVCRedist
    Push $0
    Push $1
    Push $2
    Push $3

    DetailPrint "Checking Visual C++ Redistributable requirements..."

    ; Check if already installed
    Call CheckVCRedist
    Pop $0

    ${If} $0 == "1"
        DetailPrint "Visual C++ Redistributable is already installed"
        Goto vcredist_done
    ${EndIf}

    DetailPrint "Visual C++ Redistributable not found - downloading and installing..."

    ; Determine which version to download based on architecture
    ${If} ${RunningX64}
        StrCpy $1 "${VCREDIST_2015_2022_X64_URL}"
        StrCpy $2 "vc_redist.x64.exe"
    ${Else}
        StrCpy $1 "${VCREDIST_2015_2022_X86_URL}"
        StrCpy $2 "vc_redist.x86.exe"
    ${EndIf}

    ; Download to temporary directory
    StrCpy $3 "$PLUGINSDIR\$2"

    DetailPrint "Downloading Visual C++ Redistributable..."
    DetailPrint "URL: $1"
    DetailPrint "Target: $3"

    ; Use inetc plugin for HTTPS support
    inetc::get /WEAKSECURITY "$1" "$3" /END
    Pop $0

    ${If} $0 != "OK"
        DetailPrint "Failed to download Visual C++ Redistributable: $0"
        MessageBox MB_OK|MB_ICONSTOP "Failed to download required Visual C++ Redistributable.$\r$\nError: $0$\r$\n$\r$\nPlease install it manually from:$\r$\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe"
        Abort "Installation failed - Visual C++ Redistributable required"
    ${EndIf}

    ; Verify file was downloaded
    ${IfNot} ${FileExists} "$3"
        DetailPrint "Download completed but file not found: $3"
        MessageBox MB_OK|MB_ICONSTOP "Failed to download Visual C++ Redistributable.$\r$\nPlease install it manually from:$\r$\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe"
        Abort "Installation failed - Visual C++ Redistributable required"
    ${EndIf}

    DetailPrint "Installing Visual C++ Redistributable (this may take a few minutes)..."

    ; Use the updated silent install parameters based on Microsoft documentation
    ; /install = install mode, /quiet = no UI, /norestart = suppress reboot
    ClearErrors
    ExecWait '"$3" /install /quiet /norestart' $0

    ${If} ${Errors}
        DetailPrint "Failed to execute Visual C++ Redistributable installer"
        MessageBox MB_OK|MB_ICONSTOP "Failed to install Visual C++ Redistributable.$\r$\nPlease install it manually from:$\r$\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe"
        Abort "Installation failed - Visual C++ Redistributable required"
    ${EndIf}

    ; Check return codes based on Microsoft documentation
    ${If} $0 == "0"
        DetailPrint "Visual C++ Redistributable installed successfully"
    ${ElseIf} $0 == "1638"
        DetailPrint "Visual C++ Redistributable is already installed (newer or same version)"
    ${ElseIf} $0 == "3010"
        DetailPrint "Visual C++ Redistributable installed successfully (system restart recommended)"
        ; Note: We use /norestart so this shouldn't happen, but just in case
    ${ElseIf} $0 == "5100"
        DetailPrint "Visual C++ Redistributable installation failed - unsupported system"
        MessageBox MB_OK|MB_ICONSTOP "This system does not meet the minimum requirements for Visual C++ Redistributable.$\r$\nPlease ensure you have Windows 7 SP1 or later."
        Abort "Installation failed - System requirements not met"
    ${Else}
        DetailPrint "Visual C++ Redistributable installation completed with code: $0"
        ; For unknown return codes, log but continue (might be success)
        ${If} $0 > "0"
        ${AndIf} $0 < "1000"
            DetailPrint "Warning: Unexpected return code, but continuing installation"
        ${EndIf}
    ${EndIf}

    ; Clean up downloaded file
    Delete "$3"

    ; Verify installation worked
    Call CheckVCRedist
    Pop $0
    ${If} $0 != "1"
        DetailPrint "Warning: Visual C++ Redistributable may not have installed correctly"
        MessageBox MB_OK|MB_ICONEXCLAMATION "Visual C++ Redistributable installation may not have completed successfully.$\r$\nIf the application fails to start, please install it manually from:$\r$\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe"
        ; Don't abort - let user try to run the app anyway
    ${EndIf}

    vcredist_done:
    Pop $3
    Pop $2
    Pop $1
    Pop $0
FunctionEnd

; Custom page for VC++ Redistributable installation
Function VCRedistPage
    ; This runs before the main installation
    Call InstallVCRedist
FunctionEnd

; Custom macros for electron-builder integration
; These macros are called automatically by the electron-builder NSIS template

; Custom installation macro - called during installation
!macro customInstall
    DetailPrint "Checking and installing prerequisites..."
    Call InstallVCRedist
!macroend

; Custom welcome page macro - called at installer start
!macro preWelcome
    ; Reserved for future welcome page customizations
!macroend

; Custom finish page macro - called at installer completion
!macro customFinish
    DetailPrint "Installation completed. All prerequisites have been installed."
!macroend

; Legacy hook for compatibility (if not using electron-builder macros)
Function .onInit
    ; This will run if the macros aren't called by electron-builder
    DetailPrint "Initializing installer..."

    ; Note: The actual VC++ installation will be handled by customInstall macro
    ; This is just a fallback for non-electron-builder NSIS compilations
FunctionEnd

; Section for manual NSIS compilation (outside electron-builder)
Section "Prerequisites" SEC_PREREQ
    Call InstallVCRedist
SectionEnd