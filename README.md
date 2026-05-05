# 🎓 PFE Management System

Application MERN complète pour la gestion des Projets de Fin d'Année.

## ⚡ Démarrage rapide

### Prérequis
- Node.js >= 16
- MongoDB (local ou Atlas)

### Installation

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env   # Modifiez MONGO_URI si besoin

# 2. Alimenter la base de données (UNE SEULE FOIS)
npm run seed

# 3. Démarrer le serveur backend
npm run dev   # → http://localhost:5000

# 4. Frontend (dans un autre terminal)
cd ../frontend
npm install
npm start     # → http://localhost:3000
```

### ⚠️ Important
- **Arrêtez et redémarrez le backend** après avoir remplacé les fichiers
- Lancez `npm run seed` pour recréer les données de démo

---

## 🔐 Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@pfe.com | Admin@123 |
| Encadrant | supervisor@pfe.com | Super@123 |
| Étudiant 1 (chef de groupe) | student@pfe.com | Student@123 |
| Étudiant 2 (membre du groupe) | student2@pfe.com | Student@123 |
| Étudiant 3 (groupe solo) | student3@pfe.com | Student@123 |

---

## 👥 Fonctionnement des Groupes

### Étudiant – Créer un groupe
1. Aller dans **Mon groupe**
2. Cliquer **Créer un groupe**
3. Donner un nom → vous devenez automatiquement chef

### Étudiant – Inviter des membres
1. Dans **Mon groupe** → cliquer **Inviter**
2. Entrer l'email d'un autre étudiant
3. Il reçoit une notification → accepte ou refuse

### Étudiant – Postuler à un sujet
1. Aller dans **Sujets**
2. Choisir un sujet → **Postuler**
3. ⚠️ Seul le **chef** peut postuler, au nom de tout le groupe

### Encadrant – Valider une candidature
1. **Candidatures** → voir le groupe complet
2. Accepter → un projet est créé pour **tous les membres**

### Communication
- Tous les membres + l'encadrant partagent la **même messagerie** du projet
- Les messages sont visibles par tout le groupe

---

## 🏗️ Architecture

```
Frontend (React :3000)
       ↕ API REST
Backend (Express :5000)
       ↕
  MongoDB (Atlas ou local)
```

### Collections MongoDB
- `users` — étudiants, encadrants, admin
- `groups` — groupes avec chef + membres + invitations
- `subjects` — sujets PFE proposés par encadrants
- `applications` — candidatures (par groupe → sujet)
- `projects` — projets actifs (liés au groupe)
- `messages` — messagerie interne par projet
- `milestones` — étapes du projet
- `deliverables` — livrables uploadés
- `evaluations` — notes finales
- `notifications` — alertes en temps réel
