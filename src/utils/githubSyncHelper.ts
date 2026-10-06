/**
 * Module de Gestion des Modifications & Exportation vers GitHub
 * Utilise l'API GitHub pour pousser les changements de code depuis l'interface administrateur
 */

export interface GitHubSyncConfig {
  repoUrl: string;
  branch: string;
  commitMessage: string;
  lastSyncDate?: string;
}

export interface GitHubSyncResult {
  success: boolean;
  filesCount?: number;
  commitSha?: string;
  commitUrl?: string;
  repoUrl?: string;
  branch?: string;
  message: string;
  requiresToken?: boolean;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  cleanUrl: string;
}

export const DEFAULT_GITHUB_REPO = 'https://github.com/bkboni35/PMU-STUDIO-2.0';
export const DEFAULT_BRANCH = 'main';

/**
 * Extrait le propriétaire et le nom du dépôt à partir d'une URL GitHub
 */
export function parseGitHubRepoInfo(repoUrl: string = DEFAULT_GITHUB_REPO): GitHubRepoInfo {
  const clean = repoUrl.trim();
  const match = clean.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(\.git)?$/i);
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      cleanUrl: `https://github.com/${match[1]}/${match[2]}`,
    };
  }
  return {
    owner: 'bkboni35',
    repo: 'PMU-STUDIO-2.0',
    cleanUrl: DEFAULT_GITHUB_REPO,
  };
}

export function getStoredGitHubConfig(): GitHubSyncConfig {
  try {
    const saved = localStorage.getItem('hippo_github_sync_config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erreur lecture config GitHub:', e);
  }
  return {
    repoUrl: DEFAULT_GITHUB_REPO,
    branch: DEFAULT_BRANCH,
    commitMessage: 'Mise à jour PMU Studio 2.0 - Nouvelles fonctionnalités & Optimisations',
    lastSyncDate: new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function saveGitHubConfig(config: GitHubSyncConfig): void {
  try {
    localStorage.setItem('hippo_github_sync_config', JSON.stringify(config));
  } catch (e) {
    console.error('Erreur sauvegarde config GitHub:', e);
  }
}

/**
 * Fonction d'exportation vers l'API GitHub pour pousser les modifications de code
 */
export async function exportCodeChangesToGitHub(params: {
  repoUrl?: string;
  branch?: string;
  commitMessage?: string;
  githubToken?: string;
  renderDeployHookUrl?: string;
  onProgress?: (status: string) => void;
}): Promise<GitHubSyncResult> {
  const targetRepo = params.repoUrl?.trim() || DEFAULT_GITHUB_REPO;
  const targetBranch = params.branch?.trim() || DEFAULT_BRANCH;
  const targetMessage = params.commitMessage?.trim() || 'Mise à jour PMU Studio 2.0';
  const token = params.githubToken?.trim() || localStorage.getItem('hippo_github_pat_token') || undefined;

  // Étape 1 : Analyse et rassemblement
  params.onProgress?.("1/3 : Analyse et rassemblement de l'ensemble des fichiers modifiés...");
  await new Promise((resolve) => setTimeout(resolve, 650));

  // Sauvegarder la configuration
  saveGitHubConfig({
    repoUrl: targetRepo,
    branch: targetBranch,
    commitMessage: targetMessage,
    lastSyncDate: new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  });

  if (token) {
    try {
      localStorage.setItem('hippo_github_pat_token', token);
    } catch {}
  }

  // Étape 2 : Connexion au dépôt GitHub
  const repoInfo = parseGitHubRepoInfo(targetRepo);
  params.onProgress?.(`2/3 : Connexion au dépôt GitHub (${repoInfo.owner}/${repoInfo.repo})...`);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const response = await fetch('/api/github/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repoUrl: targetRepo,
      branch: targetBranch,
      commitMessage: targetMessage,
      githubToken: token || undefined,
      renderDeployHookUrl: params.renderDeployHookUrl,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erreur de communication avec l'API GitHub (Statut ${response.status}).`);
  }

  // Étape 3 : Finalisation et déclenchement du déploiement Render
  params.onProgress?.('3/3 : Finalisation et déclenchement du déploiement Render...');
  await new Promise((resolve) => setTimeout(resolve, 700));

  return {
    success: true,
    filesCount: data.filesCount,
    commitSha: data.commitSha,
    commitUrl: data.commitUrl,
    repoUrl: data.repoUrl || targetRepo,
    branch: data.branch || targetBranch,
    message: data.message,
    requiresToken: data.requiresToken,
  };
}

/**
 * Génère les lignes de commandes Git prêtes à l'exécution
 */
export function generateGitCommands(repoUrl: string = DEFAULT_GITHUB_REPO, branch: string = DEFAULT_BRANCH, commitMsg: string = 'Mise a jour PMU Studio 2.0'): string {
  const cleanRepo = repoUrl.trim().replace(/\.git$/, '') + '.git';
  const cleanMsg = commitMsg.replace(/"/g, '\\"');
  return `# 1. Initialiser le dépôt local (si ce n'est pas déjà fait)
git init

# 2. Configurer la branche principale
git branch -M ${branch}

# 3. Lier votre dépôt GitHub distant
git remote remove origin 2>nul || true
git remote add origin ${cleanRepo}

# 4. Ajouter tous les fichiers modifiés
git add .

# 5. Créer le commit avec la description des changements
git commit -m "${cleanMsg}"

# 6. Envoyer vers GitHub (déclenchera le déploiement automatique Render)
git push -u origin ${branch} --force`;
}

/**
 * Télécharge un script batch Windows (.bat) 1-clic pour envoyer les modifications vers GitHub
 */
export function downloadWindowsGitSyncScript(repoUrl: string = DEFAULT_GITHUB_REPO, branch: string = DEFAULT_BRANCH, commitMsg: string = 'Mise a jour PMU Studio 2.0'): void {
  const cleanRepo = repoUrl.trim().replace(/\.git$/, '') + '.git';
  const scriptContent = `@echo off
chcp 65001 >nul
echo ========================================================
echo   PMU-STUDIO 2.0 - SYNCHRONISATION AUTOMATIQUE GITHUB
echo ========================================================
echo.
echo Depôt cible : ${cleanRepo}
echo Branche     : ${branch}
echo Message     : ${commitMsg}
echo.
echo [1/4] Vérification de Git...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Git n'est pas installé sur votre ordinateur.
    echo Veuillez installer Git depuis https://git-scm.com/downloads
    pause
    exit /b 1
)

echo [2/4] Initialisation et configuration Git...
git init
git branch -M ${branch}
git remote remove origin >nul 2>nul
git remote add origin ${cleanRepo}

echo [3/4] Ajout et enregistrement de toutes les modifications...
git add -A
git commit -m "${commitMsg.replace(/"/g, "'")}"

echo [4/4] Envoi vers GitHub...
git push -u origin ${branch} --force

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   SUCCÈS ! Les modifications ont été envoyées sur GitHub.
    echo   Render va maintenant déployer automatiquement l'application.
    echo ========================================================
) else (
    echo.
    echo [ATTENTION] L'envoi a rencontré une difficulté.
    echo Si GitHub demande vos identifiants, utilisez un Personal Access Token (PAT).
)

echo.
pause
`;

  const blob = new Blob([scriptContent], { type: 'application/x-bat;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'envoyer_vers_github.bat';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Télécharge un script shell (.sh) pour Mac / Linux
 */
export function downloadLinuxGitSyncScript(repoUrl: string = DEFAULT_GITHUB_REPO, branch: string = DEFAULT_BRANCH, commitMsg: string = 'Mise a jour PMU Studio 2.0'): void {
  const cleanRepo = repoUrl.trim().replace(/\.git$/, '') + '.git';
  const scriptContent = `#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  PMU-STUDIO 2.0 - SYNCHRONISATION AUTOMATIQUE GITHUB"
echo "========================================================"
echo ""
echo "Dépôt : ${cleanRepo}"
echo "Branche : ${branch}"
echo ""

git init
git branch -M ${branch}
git remote remove origin 2>/dev/null || true
git remote add origin ${cleanRepo}
git add -A
git commit -m "${commitMsg.replace(/"/g, '\\"')}" || true
git push -u origin ${branch} --force

echo ""
echo "✅ Modifications envoyées avec succès vers GitHub !"
echo "🚀 Render lance automatiquement le nouveau déploiement."
`;

  const blob = new Blob([scriptContent], { type: 'application/x-sh;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'envoyer_vers_github.sh';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Télécharge directement l'archive ZIP complète du projet prête pour GitHub
 */
export function downloadProjectZipArchive(): void {
  const a = document.createElement('a');
  a.href = '/api/project/download-zip';
  a.download = 'PMU-STUDIO-2.0-sources.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Vérifie la validité d'un jeton GitHub PAT auprès de l'API
 */
export async function verifyGitHubTokenApi(token: string, repoUrl: string = DEFAULT_GITHUB_REPO): Promise<{ valid: boolean; username?: string; repoName?: string; error?: string; message?: string }> {
  try {
    const res = await fetch('/api/github/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubToken: token, repoUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { valid: false, error: data.error || 'Jeton non valide ou accès refusé.' };
    }
    return data;
  } catch (e: any) {
    return { valid: false, error: e?.message || 'Erreur lors du test de connexion au serveur.' };
  }
}

