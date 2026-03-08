# 🏗️ Fiche Coût — Gestion de Projet Immobilier

Application de calcul et suivi des fiches coût pour projets immobiliers.

## Fonctionnalités

- Saisie des lots par rubrique (Foncier, Études, Réalisation, Branchements, Prestations)
- Calcul automatique des totaux HT et TTC
- Récapitulatif général avec ratios et écarts
- Sauvegarde locale (localStorage) — plusieurs projets possibles

## Déploiement sur Netlify

### Étape 1 — Mettre le projet sur GitHub

```bash
git init
git add .
git commit -m "Initial commit — Fiche Coût App"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/fiche-cout-app.git
git push -u origin main
```

### Étape 2 — Connecter à Netlify

1. Aller sur [app.netlify.com](https://app.netlify.com)
2. Cliquer **"Add new site" → "Import an existing project"**
3. Choisir **GitHub** et sélectionner le dépôt `fiche-cout-app`
4. Paramètres de build :
   - **Build command** : `npm run build`
   - **Publish directory** : `build`
5. Cliquer **"Deploy site"** ✅

### Étape 3 — Mises à jour

À chaque `git push`, Netlify redéploie automatiquement.

## Lancer en local

```bash
npm install
npm start
```

Ouvre http://localhost:3000
