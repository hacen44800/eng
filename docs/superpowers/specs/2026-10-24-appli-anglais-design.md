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
- Pas de comptes ni de multi-utilisateurs.
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
- IndexedDB via Dexie : toutes les données restent en local, pas de backend.
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
  storage/    dépôts Dexie : progression, cartes, historique, résultats
  ui/         écrans : Test de niveau, Aujourd'hui, Révision, Leçon, Shadowing, Progrès, Réglages
```

Règle de dépendance : `ui` → `core`, `grader`, `speech`, `storage`. `core` ne dépend de rien d'autre que `content` (types). Brancher un LLM revient à ajouter une implémentation de `Grader`.

### Contenu
Généré en JSON dans le repo (questions du test, ~300 cartes du Level 2, leçons du Level 2), puis relu par l'utilisateur. Les contenus des levels 3 à 6 sont produits au fil de l'avancement, pas dans le MVP.

### Synchronisation PC ↔ téléphone
MVP : export et import d'un fichier JSON de l'état complet (Réglages). Une sync automatique (par exemple Supabase) n'est envisagée que si l'export/import devient un frein.

### Gestion des erreurs
- Reconnaissance vocale non supportée ou refusée : repli sur l'auto-évaluation « réussi / raté ».
- Hors ligne : tout fonctionne (sauf le futur LLM).
- Import d'un fichier invalide : validation du schéma, refus avec un message, état actuel conservé.

### Tests
- Unitaires (Vitest) sur `core/` : moteur adaptatif, calcul du niveau, planification des révisions, composition de séance, conditions de passage.
- Validation des fichiers `content/` contre leur schéma.
- Test de fumée des écrans principaux.

## 4. Périmètre du MVP

1. Level 1 complet (4 blocs, résultat par compétence).
2. Séance quotidienne du Level 2 (révision, input, leçon, production, bilan).
3. Contenu du Level 2 (14 jours).
4. Épreuve de fin du Level 2 (auto-évaluation par grille).
5. Export/import, PWA installable, déploiement statique.

Hors MVP : LlmGrader, contenus et épreuves des levels 3 à 6, sync automatique.
