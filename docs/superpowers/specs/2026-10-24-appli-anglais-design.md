# Appli d'apprentissage de l'anglais — Design

Date : 2026-10-24
Statut : en revue

## 1. Intention

**Utilisateur unique :** l'auteur, diplômé du supérieur en informatique, avec de fortes lacunes en anglais depuis toujours.

**But :** apprendre l'anglais le plus efficacement possible. L'appli est un moyen, pas une fin : on minimise le temps de développement et on vise un MVP utilisable en quelques jours.

**Objectifs :**
- 2 semaines : tenir une conversation de survie sur des sujets connus (soi, son métier, son projet).
- 6 mois : présenter un projet sur slides en anglais et répondre aux questions.

**Contraintes :**
- Environ 1h par jour : une séance principale sur PC et des révisions courtes (10–15 min) sur téléphone.
- L'accès à un LLM n'est pas garanti (charte IA à vérifier). L'appli doit être pleinement utilisable sans LLM ; le LLM est un module optionnel.

**Hypothèses :**
- Un seul utilisateur (connexion GitHub perso), pas de gestion multi-utilisateurs ni d'inscription publique.
- Tout l'hébergement et le code vivent sur le compte GitHub perso `hacen44800` ; coût d'exploitation nul (GitHub Pages et Firebase Spark).
- L'appli doit fonctionner sur Android et sur iPhone. La reconnaissance vocale est fiable sur Chrome/Edge (PC, Android) mais limitée sur iOS Safari : l'oral est garanti sur PC et Android ; sur iPhone, on l'active si le navigateur le permet, sinon repli sur l'auto-évaluation. Le téléphone sert d'abord aux révisions et à l'écoute.

## 2. Parcours pédagogique

### Principes
- Production avant reconnaissance : parler et écrire, puis être corrigé.
- Contenu issu du domaine de l'utilisateur (informatique, travail : stand-ups, démos, docs).
- Apprentissage par blocs lexicaux (chunks) plutôt que par grammaire théorique.
- Ce qui est raté devient une carte de révision espacée.
- Niveau CECRL mesuré par compétence, pas en note globale.

### Level 1 — Diagnostic (jour 1, ~45 min, à refaire en fin de chaque level)

| Bloc | Format | Mesure |
|---|---|---|
| Grammaire / vocabulaire | QCM adaptatif, ~30 questions | Reconnaissance |
| Écoute | Phrases en synthèse vocale à vitesse croissante, QCM et dictée | Compréhension orale |
| Production écrite | 3 questions ouvertes | Production (grille d'auto-évaluation, ou LLM) |
| Oral | Lire et répéter (reconnaissance vocale) | Prononciation, fluidité de base |

Sortie : un niveau A1 à B2 par compétence (grammaire-vocabulaire, écoute, écrit, oral). Le parcours démarre sur la compétence la plus faible.

### Level 2 — Sprint conversation (14 jours)

Critères de passage (épreuve de fin de sprint) :
1. Se présenter et parler de son métier ou de son projet pendant 3 min sans bloquer.
2. Utiliser les phrases de survie : faire répéter, reformuler, demander le sens d'un mot, gagner du temps.
3. Comprendre une question simple à vitesse normale.
4. Maîtriser ~300 mots et blocs à haute fréquence, en priorité l'informatique et le travail.

Grammaire couverte : présent, passé, futur, formes interrogatives.

### Levels 3 à 6 (~6 semaines chacun)

| Level | Thème | Épreuve de passage |
|---|---|---|
| 3 | Réunions | Faire un stand-up : fait, à faire, blocages |
| 4 | Expliquer | Expliquer une archi ou un bug à l'oral, 5 min, avec questions et réponses |
| 5 | Présenter | Présentation de 10 min à partir de slides, avec structure et transitions |
| 6 | Défendre | Répondre à des objections, argumenter un choix technique |

Épreuve : enregistrement oral évalué par grille (auto-évaluation) ou par le LLM. On passe au level suivant seulement si l'épreuve est réussie.

### Séance quotidienne (~60 min, PC)

| Bloc | Durée | Contenu |
|---|---|---|
| Révision espacée | 10 min | Cartes dues (faisable aussi sur téléphone) |
| Input | 15 min | Écoute ou lecture d'un contenu tech du niveau, puis dictée |
| Leçon | 15 min | Nouveaux blocs |
| Production | 15 min | Shadowing, puis réponses orales ou écrites |
| Bilan | 5 min | Les erreurs deviennent des cartes |

Session téléphone : révision espacée et écoute uniquement.

### Hors périmètre
Gamification (badges, streaks avancés), cours de grammaire théoriques, orthographe parfaite.

## 3. Architecture technique

### Stack
- Vite, React, TypeScript.
- PWA (installable, hors ligne).
- Firebase (plan gratuit Spark, sans moyen de paiement) :
  - Firestore pour les données, avec persistance hors ligne activée (cache IndexedDB local, synchro automatique au retour du réseau).
  - Firebase Auth, connexion via le compte GitHub perso `hacen44800`.
  - Projet Firebase créé avec un compte Google perso.
- ts-fsrs pour la planification de la répétition espacée.
- Web Speech API : `speechSynthesis` (écoute) et `SpeechRecognition` (oral).
- Hébergement statique sur GitHub Pages (HTTPS, requis pour la PWA et le micro).
- Vitest pour les tests.

### Modules

```
src/
  content/    JSON versionné : questions du test, decks, leçons par level
  core/       logique pure, sans dépendance UI, stockage ou LLM
    placement/  moteur de test adaptatif → niveau CECRL par compétence
    srs/        enveloppe ts-fsrs : planification et notation des cartes
    session/    composition de la séance du jour
    progress/   levels, épreuves de passage, historique
  grader/     interface Grader { grade(tâche, réponse) → { score, feedback } }
    RubricGrader  auto-évaluation guidée par une grille
    LlmGrader     (plus tard, si la charte l'autorise)
  speech/     enveloppe synthèse et reconnaissance vocales, avec détection du support
  storage/    accès Firestore : journal d'événements, lecture de l'état dérivé
  auth/       connexion / déconnexion GitHub (Firebase Auth)
  ui/         écrans : Test de niveau, Aujourd'hui, Révision, Leçon, Shadowing, Progrès, Réglages
```

Règle de dépendance : `ui` → `core`, `grader`, `speech`, `storage`, `auth`. `core` ne dépend de rien d'autre que `content` (types). Ni `core` ni `grader` ne connaissent Firebase.

### Extension LLM (future, hors MVP)
Le branchement d'un LLM est une exigence d'architecture, pas une option à décider plus tard :
- Toute évaluation passe par l'interface `Grader`. Ajouter `LlmGrader` ne modifie ni `core` ni les écrans.
- Le choix du correcteur est un réglage (Réglages → « Correcteur : grille / LLM »).
- Un futur module de conversation suivra le même principe : une interface dans `core`, une implémentation interchangeable.
- Activation conditionnée à la vérification de la charte IA.

### Modèle de données : journal d'événements
Chaque action d'apprentissage est un événement immuable ajouté à `users/{uid}/events/{eventId}` :
`{ id, type, payload, createdAt, deviceId }`, avec `type` parmi `placement_answer`, `card_review`, `lesson_done`, `production_graded`, `gate_attempt`, et `id` un UUID généré côté client.

L'état (planning des cartes, level courant, niveau par compétence) est **recalculé** dans `core` à partir du journal, en rejouant les événements triés par `createdAt`. Conséquences :
- Pas de conflit PC ↔ téléphone : les deux appareils ne font qu'ajouter des événements, la synchro est une union.
- Idempotence : l'`id` client évite les doublons si un envoi est rejoué.
- Historique complet disponible pour les statistiques de progression.

Si le rejeu devient lent (milliers d'événements), on ajoutera un instantané d'état mis en cache ; pas dans le MVP.

### Sécurité
- Règles Firestore : `users/{uid}/**` lisible et inscriptible uniquement si `request.auth.uid == uid` ; tout le reste refusé. Les événements sont en création seule (ni modification ni suppression).
- La configuration Firebase incluse dans l'appli n'est pas un secret ; la sécurité repose sur l'authentification et les règles.
- Aucun secret (token, clé API) dans le dépôt public.
- Domaine autorisé dans Firebase Auth : uniquement `hacen44800.github.io` (et `localhost` en dev).

### Contenu
Généré en JSON dans le repo (questions du test, ~300 cartes du Level 2, leçons du Level 2), puis relu par l'utilisateur. Les contenus des levels 3 à 6 sont produits au fil de l'avancement, pas dans le MVP.

### Synchronisation PC ↔ téléphone
Assurée par Firestore : chaque appareil écrit ses événements dans son cache local, qui se synchronise automatiquement avec le serveur dès qu'il y a du réseau. L'autre appareil reçoit les nouveaux événements et recalcule son état. Aucun export/import manuel.

### Gestion des erreurs
- Reconnaissance vocale non supportée ou refusée : repli sur l'auto-évaluation « réussi / raté ».
- Hors ligne : tout fonctionne, les événements partent à la reconnexion (sauf le futur LLM). Un indicateur discret signale les événements en attente.
- Non connecté : écran de connexion GitHub. Au premier lancement hors ligne sans session, message demandant de se connecter une fois avec du réseau.
- Écriture refusée par les règles : message d'erreur, l'événement est conservé localement et réessayé.

### Tests
- Unitaires (Vitest) sur `core/` : moteur adaptatif, calcul du niveau, planification des révisions, composition de séance, conditions de passage, rejeu du journal (ordre, doublons, journaux fusionnés de deux appareils).
- Règles de sécurité Firestore testées avec l'émulateur Firebase (accès à ses données autorisé, accès aux données d'un autre uid refusé, modification d'événement refusée).
- Validation des fichiers `content/` contre leur schéma.
- Test de fumée des écrans principaux.

## 4. Périmètre du MVP

1. Level 1 complet (4 blocs, résultat par compétence).
2. Séance quotidienne du Level 2 (révision, input, leçon, production, bilan).
3. Contenu du Level 2 (14 jours).
4. Épreuve de fin du Level 2 (auto-évaluation par grille).
5. Connexion GitHub, journal d'événements synchronisé via Firestore, règles de sécurité.
6. PWA installable, déploiement sur GitHub Pages (`hacen44800/eng`).

Hors MVP : LlmGrader et module de conversation, contenus et épreuves des levels 3 à 6, instantanés d'état.
