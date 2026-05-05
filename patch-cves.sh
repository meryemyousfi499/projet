#!/bin/bash
# ============================================================
#  patch-cves.sh — Mise à jour des dépendances vulnérables
#  Projet : pfe-management
#  Généré suite au rapport Trivy du 27/04/2026
# ============================================================

set -e

echo "=============================================="
echo "  Patch CVEs — pfe-management"
echo "=============================================="

# ── BACKEND ───────────────────────────────────────────────
echo ""
echo "📦 Patch Backend (8 HIGH, 5 MEDIUM, 1 LOW)..."
cd backend

# multer: 6 CVEs HIGH (DoS, dropped connections)
#   CVE-2025-47935, CVE-2025-47944, CVE-2025-48997
#   CVE-2025-7338, CVE-2026-2359, CVE-2026-3304
#   Fix: >= 2.1.0
echo "  → Mise à jour multer 1.4.5-lts.2 → 2.1.0+"
npm install multer@latest

# axios: SSRF + RCE via prototype pollution
#   CVE-2025-62718 (SSRF), CVE-2026-40175 (RCE)
#   Fix: >= 1.15.0
echo "  → Mise à jour axios 1.13.6 → 1.15.0+"
npm install axios@latest

# follow-redirects: fuite des headers d'auth
#   GHSA-r4q5-vmmm-2653
#   Fix: >= 1.16.0
echo "  → Mise à jour follow-redirects → 1.16.0+"
npm install follow-redirects@latest

cd ..
echo "  ✅ Backend patché"

# ── FRONTEND ──────────────────────────────────────────────
echo ""
echo "📦 Patch Frontend (34 vulnérabilités)..."
cd frontend

# serialize-javascript: RCE via RegExp.flags + DoS
#   GHSA-5c6j-r48x-rmvq (HIGH), CVE-2026-34043 (MEDIUM)
#   Fix: >= 7.0.5
echo "  → Mise à jour serialize-javascript → 7.0.5+"
npm install serialize-javascript@latest --legacy-peer-deps

# svgo: DoS via XML entity expansion
#   CVE-2026-29074 (HIGH)
#   Fix: >= 2.8.1
echo "  → Mise à jour svgo → 2.8.1+"
npm install svgo@latest --legacy-peer-deps

# underscore: DoS via structures récursives
#   CVE-2026-27601 (HIGH)
#   Fix: >= 1.13.8
echo "  → Mise à jour underscore → 1.13.8+"
npm install underscore@latest --legacy-peer-deps

# uuid: buffer bounds check manquant
#   GHSA-w5hq-g745-h8pq (MEDIUM)
#   Fix: >= 14.0.0
echo "  → Mise à jour uuid → 14.0.0+"
npm install uuid@latest --legacy-peer-deps

# webpack-dev-server: information exposure
#   CVE-2025-30359, CVE-2025-30360 (MEDIUM)
#   Fix: >= 5.2.1  (dev uniquement, non présent en prod build)
echo "  → Mise à jour webpack-dev-server → 5.2.1+"
npm install webpack-dev-server@latest --legacy-peer-deps --save-dev

# yaml: DoS via YAML profond
#   CVE-2026-33532 (MEDIUM)
#   Fix: >= 2.8.3
echo "  → Mise à jour yaml → 2.8.3+"
npm install yaml@latest --legacy-peer-deps

cd ..
echo "  ✅ Frontend patché"

# ── RACINE ────────────────────────────────────────────────
echo ""
echo "📦 Patch racine (1 MEDIUM)..."

# follow-redirects racine
npm install follow-redirects@latest

echo "  ✅ Racine patchée"

# ── VÉRIFICATION POST-PATCH ──────────────────────────────
echo ""
echo "=============================================="
echo "  Vérification post-patch avec npm audit"
echo "=============================================="

echo ""
echo "--- Backend ---"
cd backend && npm audit --audit-level=high || true
cd ..

echo ""
echo "--- Frontend ---"
cd frontend && npm audit --audit-level=high || true
cd ..

echo ""
echo "=============================================="
echo "  ✅ Patch terminé !"
echo "  Relancer Trivy pour confirmer :"
echo "  trivy fs . --severity HIGH,CRITICAL"
echo "=============================================="