import { getUserAppUrl } from './appUrls';

/**
 * Génère et déclenche le téléchargement du script d'installation Windows (.bat)
 * Ce script crée un raccourci autonome sur le Bureau Windows ouvrant l'application
 * en mode bureau plein écran avec Microsoft Edge ou Google Chrome.
 */
export function downloadWindowsBatchInstaller(): void {
  const appUrl = getUserAppUrl();
  const scriptContent = `@echo off
chcp 65001 >nul
title Installation de HippoAnalyse Pro sur Windows

echo ====================================================================
echo        INSTALLATION DE HIPPOANALYSE PRO - TURF PMU (WINDOWS)
echo ====================================================================
echo.
echo Concepteur   : Ghislain BONI
echo Application  : HippoAnalyse Pro - Turf PMU & Quinte+
echo URL Active   : ${appUrl}
echo.
echo [1/3] Creation du raccourci officiel sur votre Bureau Windows...

set SHORTCUT_PATH="%USERPROFILE%\\Desktop\\HippoAnalyse Pro.url"

(
echo [InternetShortcut]
echo URL=${appUrl}
echo IconIndex=0
echo HotKey=0
) > %SHORTCUT_PATH%

echo   - Raccourci cree avec succes : %SHORTCUT_PATH%

echo.
echo [2/3] Verification des navigateurs compatibles (Edge / Chrome)...

set BROWSER_PATH=""
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set BROWSER_PATH="%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
    echo   - Microsoft Edge detecte.
) else if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set BROWSER_PATH="%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
    echo   - Microsoft Edge detecte.
) else if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    set BROWSER_PATH="%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
    echo   - Google Chrome detecte.
) else if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    set BROWSER_PATH="%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
    echo   - Google Chrome detecte.
) else (
    echo   - Navigateur standard utilise.
)

echo.
echo [3/3] Lancement de l'application HippoAnalyse Pro...
if not %BROWSER_PATH%=="" (
    start "" %BROWSER_PATH% --app="${appUrl}" --window-size=1366,820
) else (
    start "" "${appUrl}"
)

echo.
echo ====================================================================
echo   SUCCES : L'installation sur Windows est terminee !
echo   Vous pouvez desormais lancer 'HippoAnalyse Pro' depuis votre Bureau.
echo ====================================================================
echo.
pause
`;

  const blob = new Blob([scriptContent], { type: 'application/x-bat;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Installer_HippoAnalyse_Windows.bat';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Génère et télécharge un raccourci Bureau Windows (.url)
 */
export function downloadWindowsDesktopShortcut(): void {
  const appUrl = getUserAppUrl();
  const shortcutContent = `[InternetShortcut]
URL=${appUrl}
IconIndex=0
HotKey=0
IDList=
[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,11
`;

  const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HippoAnalyse_Pro.url';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Génère le package téléchargeable Android APK / Manifest & Lanceur WebAPK
 */
export function downloadAndroidApkPackage(): void {
  const appUrl = getUserAppUrl();
  
  // Fichier HTML / APK Launcher d'installation directe pour Android
  const apkLauncherHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Installation HippoAnalyse Pro APK</title>
  <link rel="manifest" href="${appUrl}manifest.json">
  <style>
    body {
      background-color: #020617;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
      padding: 30px 20px;
      margin: 0;
    }
    .card {
      background: #0f172a;
      border: 2px solid #f59e0b;
      border-radius: 24px;
      padding: 24px;
      max-width: 400px;
      margin: 0 auto;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .logo {
      width: 90px;
      height: 90px;
      border-radius: 20px;
      border: 2px solid #f59e0b;
      margin: 0 auto 15px auto;
      display: block;
    }
    h1 { font-size: 20px; margin: 10px 0 5px 0; font-weight: 900; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; }
    .btn {
      display: block;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #020617;
      text-decoration: none;
      font-weight: 900;
      font-size: 15px;
      padding: 14px 20px;
      border-radius: 16px;
      margin: 20px 0 10px 0;
      border: none;
      cursor: pointer;
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">APK Android / WebAPK Verifie</span>
    <img src="${appUrl}horse-logo.jpg" alt="HippoAnalyse" class="logo">
    <h1>HippoAnalyse Pro</h1>
    <p>Application officielle d'analyse Quinte+ PMU et intelligence artificielle.</p>
    
    <button class="btn" id="installBtn" onclick="launchApp()">OUVRIR ET INSTALLER SUR ANDROID</button>
    
    <p style="font-size: 11px; margin-top: 15px;">
      1. Cliquez sur le bouton ci-dessus.<br>
      2. Touchez <strong>Installer</strong> ou <strong>Ajouter a l'ecran d'accueil</strong>.<br>
      3. L'application est prete sur votre telephone !
    </p>
  </div>

  <script>
    function launchApp() {
      window.location.href = "${appUrl}?source=android_apk_download";
    }
    
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('installBtn');
      if (btn) {
        btn.innerText = "INSTALLER L'APK DIRECTEMENT";
        btn.onclick = () => {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(() => {
            window.location.href = "${appUrl}";
          });
        };
      }
    });
  </script>
</body>
</html>
`;

  const blob = new Blob([apkLauncherHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HippoAnalyse_Pro_Android_APK.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
