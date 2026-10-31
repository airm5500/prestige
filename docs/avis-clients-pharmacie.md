# Menu « Avis clients » — spécification fonctionnelle et UX

> **Statut :** proposition fonctionnelle à valider  
> **Périmètre :** collecte privée d'avis par QR code dans la pharmacie, traitement interne, analyse et pilotage de la qualité.  
> **Principe :** le formulaire public est une page web autonome. Il ne doit apparaître ni dans les menus ni dans les écrans de l'application Prestige accessibles au client.

## 1. Reformulation du besoin

Prestige doit proposer aux utilisateurs autorisés un menu interne **Avis clients**. La pharmacie imprime et expose dans ses locaux une affiche comportant son nom, son adresse et un QR code sécurisé.

Le client scanne le QR code avec son téléphone. Il accède à une page publique, moderne et adaptée au mobile, qui lui permet :

- d'évaluer son expérience ;
- de décrire librement son ressenti ;
- de signaler un problème ;
- de préciser le service ou le contexte concerné ;
- de citer un employé s'il peut réellement l'identifier ;
- de laisser ses coordonnées s'il souhaite une réponse ;
- ou de rester entièrement anonyme.

Après validation, l'avis est enregistré dans Prestige et devient visible uniquement dans le menu interne **Avis clients**. Il n'est pas publié sur un site, sur le formulaire public ou dans une liste consultable par les clients.

Le menu interne permet de lire, qualifier, rechercher, trier, traiter, imprimer et exporter les avis. Un onglet **Analyse** recoupe les dates, thèmes, mots-clés, services et employés cités afin de produire des tendances réellement exploitables, sans transformer une simple citation en preuve automatique contre un employé.

---

## 2. Point important : l'adresse IP publique ne suffit pas

Une adresse IP publique rend techniquement un service joignable depuis Internet, mais elle ne constitue ni une protection ni une architecture de publication suffisante. Il ne faut pas exposer directement le serveur Prestige ou sa base de données.

### Publication recommandée

```text
Téléphone du client
        │
        │ HTTPS
        ▼
Nom public stable (ex. avis.pharmacie.example)
        │
        ▼
Pare-feu / reverse proxy / limitation de débit
        │
        ▼
API publique minimale « Déposer un avis »
        │
        ▼
Zone d'entrée contrôlée
        │
        ▼
Service interne Prestige « Avis clients »
```

### Conditions d'activation

Le menu de configuration peut vérifier :

- qu'un nom de domaine ou sous-domaine public est renseigné ;
- qu'un certificat HTTPS valide est actif ;
- que l'URL publique répond correctement ;
- que le jeton du point de collecte est actif ;
- que l'accès public ne donne accès qu'au formulaire et à son API dédiée ;
- que la politique de confidentialité et les durées de conservation sont configurées.

Si la pharmacie ne dispose que d'une IP dynamique ou si l'exposition locale n'est pas suffisamment sécurisée, la solution recommandée est une passerelle hébergée ou SaaS. Une IP publique ne doit donc pas être la seule condition métier utilisée pour exposer la fonctionnalité.

---

## 3. QR code sécurisé et affiche imprimable

### Contenu du QR code

Le QR code encode uniquement une URL HTTPS de ce type :

```text
https://avis.pharmacie.example/a/7Kp9mQ2xN4
```

Le segment final est un identifiant public aléatoire et non prédictible. Le QR code ne doit contenir :

- ni mot de passe ;
- ni identifiant d'administrateur ;
- ni adresse de base de données ;
- ni jeton donnant accès au menu interne ;
- ni information personnelle d'un employé.

Le nom et l'adresse de la pharmacie sont imprimés **sur l'affiche**, mais ne sont pas utilisés comme secret. Ils apparaissent aussi sur la page après que le serveur a reconnu le jeton public.

### Génération

Depuis `Avis clients > Configuration > QR code`, un responsable peut :

1. choisir le point de collecte : entrée, sortie, caisse, espace conseil ou autre ;
2. prévisualiser le nom et l'adresse de la pharmacie ;
3. générer un identifiant public aléatoire ;
4. tester le lien ;
5. télécharger l'affiche en PDF ;
6. imprimer l'affiche ;
7. révoquer et régénérer le QR code en cas d'abus.

Une pharmacie peut disposer de plusieurs QR codes afin de mesurer le contexte sans demander au client où il se trouvait. Par exemple, les affiches `CAISSE-1`, `SORTIE` et `ESPACE-CONSEIL` utilisent des jetons différents, mais ouvrent le même formulaire.

### Contenu recommandé de l'affiche

```text
┌───────────────────────────────────────────┐
│              VOTRE AVIS COMPTE            │
│                                           │
│            PHARMACIE DU CENTRE            │
│       10 avenue de la République          │
│                                           │
│               [ QR CODE ]                 │
│                                           │
│  Scannez et partagez votre expérience.    │
│  Vous pouvez répondre anonymement.        │
│                                           │
│  Formulaire privé — 2 minutes environ     │
└───────────────────────────────────────────┘
```

L'affiche ne doit pas promettre un anonymat absolu si des données techniques légalement nécessaires sont conservées. La formulation doit expliquer précisément ce qui est collecté et pendant combien de temps.

---

## 4. Parcours public du client

### Étape 1 — Accueil

La page affiche :

- le nom et l'adresse de la pharmacie ;
- un message de bienvenue ;
- la durée estimée ;
- l'indication que l'avis est privé et transmis à la pharmacie ;
- le choix de répondre anonymement ou de pouvoir être recontacté ;
- le lien vers les informations de confidentialité ;
- le bouton **Donner mon avis**.

### Étape 2 — Satisfaction générale

Proposition de question principale :

> Comment évaluez-vous votre expérience aujourd'hui ?

Le client choisit une valeur de 1 à 5 à l'aide de boutons explicites :

| Note | Libellé accessible |
|---:|---|
| 1 | Très insatisfait |
| 2 | Insatisfait |
| 3 | Moyen |
| 4 | Satisfait |
| 5 | Très satisfait |

Les couleurs ne doivent jamais être le seul moyen de comprendre la note.

### Étape 3 — Type de retour

Le client peut sélectionner une ou plusieurs catégories :

- accueil ;
- temps d'attente ;
- disponibilité des produits ;
- conseil reçu ;
- confidentialité ;
- prix ou facturation ;
- livraison ;
- propreté et confort ;
- comportement d'un membre de l'équipe ;
- autre.

Le formulaire adapte ensuite ses questions. Une excellente note ne doit pas obliger le client à décrire un problème.

### Étape 4 — Ressenti et problème rencontré

Champs proposés :

- **Ce que vous avez apprécié** — facultatif ;
- **Ce qui pourrait être amélioré** — facultatif ;
- **Décrivez le problème rencontré** — affiché si le client indique un problème ;
- date et créneau approximatif de visite — facultatifs ;
- niveau d'importance : faible, gênant, important ou urgent.

Le formulaire rappelle de ne pas saisir d'informations médicales, de diagnostic, d'ordonnance ou de données bancaires.

### Étape 5 — Employé concerné

La question doit rester neutre :

> Un membre de l'équipe est-il directement concerné par votre retour ?

Choix :

- non ;
- oui, je connais son nom ;
- oui, mais je ne connais pas son nom ;
- je ne souhaite pas répondre.

Si le client connaît le nom, Prestige peut proposer une recherche contrôlée. Pour limiter l'exposition du personnel, la page publique ne devrait pas afficher librement la liste complète des employés. Les solutions possibles sont :

1. saisie libre, puis rapprochement interne ;
2. prénom et initiale uniquement ;
3. code figurant sur le badge ou le ticket ;
4. service, description et créneau si le nom est inconnu.

Le texte doit préciser qu'une personne citée ne sera pas automatiquement déclarée responsable.

### Étape 6 — Identité facultative

Le client choisit explicitement :

#### Rester anonyme

Aucun nom, téléphone ou courriel n'est demandé. Il ne pourra pas recevoir de réponse personnelle.

#### Être recontacté

Il peut renseigner :

- nom ou pseudonyme ;
- téléphone ;
- adresse électronique ;
- canal préféré ;
- autorisation explicite d'être recontacté au sujet de cet avis.

Donner ses coordonnées ne doit pas être nécessaire pour enregistrer l'avis.

### Étape 7 — Vérification et envoi

Avant l'envoi, la page affiche un résumé, la politique de traitement et un bouton **Envoyer mon avis**. Le double appui ne doit créer qu'un seul avis.

Après succès :

- afficher un remerciement neutre ;
- fournir un numéro de suivi uniquement si la pharmacie souhaite proposer ce service ;
- ne pas afficher les autres avis ;
- ne pas afficher les réponses internes ;
- effacer le formulaire de l'appareil ;
- proposer de fermer la page.

---

## 5. Proposition d'interface UX/UI

### Direction recommandée — « Écoute & confiance »

- fond très clair et chaleureux ;
- carte centrale avec étapes courtes ;
- indicateur de progression `1 sur 5` ;
- gros boutons adaptés au tactile ;
- une seule question principale par écran ;
- sauvegarde temporaire uniquement pendant la session ;
- animations sobres ;
- contraste et focus accessibles ;
- langage simple, non défensif et non culpabilisant ;
- bouton précédent conservant les réponses ;
- bouton quitter effaçant la session.

### Schéma des écrans

```text
Accueil
   ↓
Satisfaction 1–5
   ↓
Thèmes concernés
   ↓
Commentaire / problème
   ↓
Employé éventuellement concerné
   ↓
Anonyme ou coordonnées facultatives
   ↓
Vérification
   ↓
Merci — fin de session
```

### Comportement fluide

- charger le minimum de ressources pour fonctionner correctement sur un réseau mobile lent ;
- éviter les fenêtres modales successives ;
- conserver la réponse lors d'un retour à l'étape précédente ;
- afficher les erreurs à proximité immédiate du champ ;
- ne jamais effacer tout le formulaire après une simple erreur réseau ;
- empêcher les soumissions répétées ;
- permettre une nouvelle tentative sûre ;
- fermer automatiquement la session après envoi.

---

## 6. Contrôles de saisie

| Champ | Obligatoire | Contrôles |
|---|---:|---|
| Note générale | Oui | Entier compris entre 1 et 5 |
| Catégories | Non | Valeurs autorisées uniquement, nombre maximal configurable |
| Commentaire | Selon règle métier | Longueur minimale si problème, longueur maximale configurable, texte normalisé |
| Date de visite | Non | Date réelle, pas dans un futur incohérent, plage de conservation admise |
| Heure approximative | Non | Format valide, heure exacte non exigée |
| Importance | Non | Une valeur parmi la liste autorisée |
| Nom d'employé saisi | Non | Longueur limitée, aucun rapprochement automatique définitif |
| Code employé | Non | Format contrôlé, résultat non révélé au client |
| Nom du client | Non | Longueur limitée, caractères usuels autorisés |
| Téléphone | Non | Normalisation par pays, format validé |
| Courriel | Non | Format validé sans vérification intrusive |
| Consentement de contact | Conditionnel | Obligatoire si téléphone ou courriel renseigné |

### Protections supplémentaires

- requêtes paramétrées contre les injections ;
- échappement du contenu à l'affichage contre les scripts injectés ;
- limitation de taille de chaque requête ;
- limitation du nombre d'envois par période ;
- détection des soumissions manifestement automatisées ;
- champ piège invisible pour certains robots ;
- CAPTCHA progressif seulement en cas de suspicion, afin de préserver l'ergonomie ;
- clé d'idempotence par soumission ;
- pièce jointe désactivée dans le MVP ;
- aucune donnée médicale ou bancaire demandée.

### Messages d'erreur

Ils doivent indiquer comment corriger la situation :

- « Choisissez une note entre 1 et 5. »
- « Votre commentaire dépasse la longueur autorisée. »
- « Vérifiez le numéro de téléphone ou choisissez de rester anonyme. »
- « Votre avis n'a pas encore été envoyé. Vérifiez votre connexion puis réessayez. »

---

## 7. Menu interne « Avis clients »

Le menu est visible uniquement aux rôles autorisés. Une proposition de sous-menus :

```text
Avis clients
├── Tableau de bord
├── Tous les avis
├── À traiter
├── Analyse
├── Employés cités
├── Rapports et exports
└── Configuration
    ├── Formulaire
    ├── QR codes et affiches
    ├── Catégories et mots-clés
    ├── Alertes
    ├── Confidentialité
    └── Droits d'accès
```

### Tableau de bord

Le tableau de bord affiche :

- nombre d'avis sur la période ;
- note moyenne avec volume associé ;
- évolution par rapport à la période comparable ;
- répartition des notes ;
- principaux thèmes positifs ;
- principaux irritants ;
- avis urgents non traités ;
- délai médian de première prise en charge ;
- taux de traitement ;
- tendance, sans masquer un faible volume de réponses.

### Liste des avis

Colonnes proposées :

- date et heure ;
- note ;
- résumé ;
- thèmes ;
- niveau d'importance ;
- employé cité ou rapprochement à confirmer ;
- anonyme ou contact autorisé ;
- statut ;
- responsable du traitement ;
- délai de traitement.

Un clic ouvre le détail. Les coordonnées du client sont masquées par défaut et visibles uniquement avec le droit approprié.

### Cycle de traitement

États recommandés :

```text
NOUVEAU
  ├── À_QUALIFIER
  ├── À_TRAITER
  ├── URGENT
  ├── EN_COURS
  ├── TRAITÉ
  ├── CLASSÉ_SANS_SUITE
  ├── INDÉSIRABLE
  └── ARCHIVÉ
```

Chaque changement conserve l'auteur, la date, l'ancien état, le nouvel état et un commentaire interne éventuel.

---

## 8. Recherche, filtres et tri

### Filtres combinables

- date exacte ou période ;
- note ;
- type de retour ;
- statut ;
- niveau d'importance ;
- catégorie ;
- mot-clé ;
- employé cité ;
- service ou point de collecte ;
- anonyme ou identifiable ;
- avec ou sans coordonnées ;
- traité ou non traité.

### Recherche avec opérateur « contient »

Le constructeur de filtre peut proposer :

```text
Champ       Opérateur                  Valeur
Commentaire contient                   attente
Employé     contient                   Awa
Catégorie   est égale à                Accueil
Date        est comprise entre         01/10 et 31/10
Note        est inférieure ou égale à  2
```

Pour les textes, prévoir au minimum :

- contient ;
- ne contient pas ;
- commence par ;
- expression exacte ;
- un des mots ;
- tous les mots.

La recherche doit pouvoir ignorer la casse et, si techniquement possible, les accents, tout en indiquant clairement les filtres actifs.

### Vues enregistrées

Un utilisateur peut enregistrer des recherches utiles :

- avis négatifs des sept derniers jours ;
- temps d'attente contenant « long » ou « lenteur » ;
- avis citant un employé et non encore qualifiés ;
- commentaires positifs à partager en réunion ;
- problèmes récurrents sur un point de collecte.

---

## 9. Onglet « Analyse »

L'analyse doit aider à décider, et pas seulement produire un nuage de mots.

### 9.1 Analyse quantitative

- volume d'avis par jour, semaine et mois ;
- note moyenne et médiane ;
- distribution complète des notes ;
- évolution temporelle ;
- comparaison entre périodes comparables ;
- répartition par point de collecte ;
- proportion d'avis anonymes ;
- délais de qualification et de traitement ;
- thèmes par niveau de satisfaction.

Chaque score doit toujours être accompagné du nombre d'avis. Une moyenne fondée sur deux avis ne doit pas être présentée comme équivalente à une moyenne fondée sur deux cents avis.

### 9.2 Analyse des mots et expressions

- normalisation de la casse et des accents ;
- exclusion des mots sans valeur analytique ;
- regroupement des variantes et synonymes configurés ;
- fréquence des mots et expressions ;
- expressions émergentes ;
- cooccurrences, par exemple `attente + caisse` ;
- distinction entre contexte positif, négatif et neutre ;
- accès aux avis sources depuis chaque résultat.

Les mots-clés peuvent être classés dans un dictionnaire métier :

| Famille | Exemples configurables |
|---|---|
| Attente | attente, lent, file, retard |
| Accueil | accueil, sourire, écoute, impoli |
| Produit | rupture, indisponible, manquant |
| Conseil | explication, conseil, posologie |
| Prix | cher, remise, facture, monnaie |
| Confidentialité | discret, entendu, exposé |

### 9.3 Thèmes et tendances

L'outil regroupe les avis par thèmes configurés et détecte :

- une hausse anormale d'un irritant ;
- un nouveau sujet apparaissant sur une période ;
- un thème lié à un créneau ou un point de collecte ;
- les motifs positifs les plus fréquents ;
- les problèmes récurrents non résolus ;
- l'évolution après une action corrective.

Une alerte doit expliquer sa cause, par exemple :

> 8 avis mentionnent l'attente cette semaine, contre une moyenne de 2 sur les quatre semaines précédentes.

### 9.4 Récapitulatif par employé identifié

Pour chaque employé correctement rapproché :

- nombre total de citations ;
- citations positives, négatives et neutres ;
- thèmes associés ;
- évolution dans le temps ;
- avis à qualifier ;
- actions internes ouvertes ;
- liens vers les avis sources accessibles selon les droits.

Le rapprochement possède un niveau de fiabilité :

- **confirmé**, si un responsable a validé l'identité ;
- **probable**, si plusieurs indices concordent ;
- **ambigu**, si plusieurs employés peuvent correspondre ;
- **non identifié**.

### Règle essentielle

Une citation n'est pas une preuve. Les analyses automatisées, le sentiment et les rapprochements de noms sont des **indicateurs de tri**, jamais une décision disciplinaire automatique. Un responsable doit examiner le contexte, le volume, les avis contradictoires et les faits vérifiables avant toute conclusion.

### 9.5 Résumé de direction

Sur une période choisie, Prestige peut produire :

1. trois points forts ;
2. trois irritants prioritaires ;
3. sujets nouveaux ou en forte hausse ;
4. employés fréquemment félicités ;
5. citations négatives nécessitant une qualification humaine ;
6. actions décidées et état d'avancement ;
7. comparaison avant/après action.

Le résumé doit permettre de remonter à chaque avis source et distinguer clairement les faits, les calculs et les interprétations automatiques.

---

## 10. Impression et export Excel

### Impression

Le menu permet d'imprimer :

- un avis individuel ;
- une liste filtrée ;
- un rapport d'analyse ;
- un récapitulatif par thème ;
- un récapitulatif par employé selon les droits.

Les coordonnées du client sont masquées par défaut. L'impression comporte la période, les filtres actifs, la date de génération et l'utilisateur ayant demandé le document.

### Export Excel

Deux exports distincts sont recommandés :

1. **Export opérationnel** : avis, état, catégorie, responsable et délais ;
2. **Export analytique** : données agrégées par période, thème, point de collecte ou employé.

Options :

- exporter les résultats filtrés ou toute la période autorisée ;
- choisir les colonnes ;
- anonymiser les coordonnées ;
- inclure ou exclure les commentaires libres ;
- protéger le fichier par une politique interne adaptée ;
- inscrire la date, l'auteur et les filtres dans une feuille `Informations`.

Pour éviter l'injection de formules, toute valeur exportée commençant par `=`, `+`, `-` ou `@` doit être neutralisée comme texte. Les exports sont journalisés et limités aux rôles autorisés.

---

## 11. Alertes utiles

Les alertes doivent être configurables pour éviter la fatigue :

- avis noté 1 ou 2 ;
- niveau déclaré urgent ;
- mot-clé sensible configuré ;
- plusieurs avis similaires dans une période courte ;
- hausse significative d'un thème ;
- avis non traité après un délai ;
- problème de sécurité ou de confidentialité ;
- QR code recevant un volume anormal de soumissions.

Une alerte indique le motif, le niveau, l'avis source et l'action attendue. Elle ne diffuse pas les coordonnées ou le commentaire complet dans un canal non sécurisé.

En présence d'un message évoquant une urgence médicale, la page doit rappeler que ce canal n'est pas surveillé en temps réel et orienter vers les services appropriés définis localement.

---

## 12. Droits et confidentialité

### Rôles proposés

| Action | Agent | Responsable qualité | Pharmacien responsable | Administrateur |
|---|---:|---:|---:|---:|
| Voir les avis non nominatifs | Selon configuration | Oui | Oui | Oui |
| Voir les coordonnées client | Non | Selon droit | Oui | Selon droit |
| Qualifier un avis | Limité | Oui | Oui | Oui |
| Confirmer un employé cité | Non | Oui | Oui | Oui |
| Voir l'analyse par employé | Non | Selon droit | Oui | Selon droit |
| Exporter | Non | Selon droit | Oui | Selon droit |
| Configurer les QR codes | Non | Non | Selon droit | Oui |
| Modifier la conservation | Non | Non | Oui | Oui |

### Principes

- collecter uniquement les données utiles ;
- séparer le commentaire des coordonnées lorsqu'il est possible de le faire ;
- chiffrer les échanges et protéger les données stockées ;
- masquer les coordonnées dans les listes ;
- journaliser les consultations sensibles et les exports ;
- définir une durée de conservation par catégorie de données ;
- prévoir rectification, suppression ou anonymisation selon les obligations applicables ;
- ne jamais utiliser automatiquement les avis pour sanctionner ou noter le personnel.

---

## 13. Sécurité du formulaire public

- HTTPS obligatoire ;
- aucune session d'administration partagée avec la page publique ;
- jeton public limité au dépôt d'avis pour une pharmacie et un point de collecte ;
- identifiants aléatoires non séquentiels ;
- rotation et révocation des QR codes ;
- limitation de débit par jeton et signaux techniques ;
- validation côté serveur de tous les champs ;
- protection contre l'injection et les scripts ;
- politique de sécurité du contenu ;
- taille de requête limitée ;
- journaux techniques sans commentaire complet ni coordonnées en clair ;
- détection et quarantaine des abus ;
- sauvegarde et traçabilité des opérations internes ;
- aucun accès direct à la base Prestige depuis Internet.

Le QR code n'a pas besoin d'expirer chaque jour : il doit rester imprimable et stable. En revanche, son identifiant doit pouvoir être désactivé immédiatement et remplacé sans modifier les autres points de collecte.

---

## 14. Modèle de données proposé

```text
customer_feedback_location
  id, pharmacy_id, label, public_token_hash, status,
  created_at, revoked_at

customer_feedback
  id, location_id, rating, severity, visit_date, visit_time_range,
  positive_comment, improvement_comment, problem_comment,
  anonymous, status, assigned_to, created_at, updated_at

customer_feedback_category
  id, code, label, active

customer_feedback_category_link
  feedback_id, category_id

customer_feedback_contact
  feedback_id, display_name, phone_encrypted, email_encrypted,
  preferred_channel, contact_consent_at

customer_feedback_employee_mention
  id, feedback_id, raw_name, raw_description, employee_id,
  confidence, confirmed_by, confirmed_at

customer_feedback_keyword
  id, feedback_id, keyword_id, source, confidence

customer_feedback_action
  id, feedback_id, action_type, description, owner_id,
  due_at, status, completed_at

customer_feedback_audit
  id, feedback_id, actor_id, event_type, event_at, metadata
```

Le jeton public est stocké sous forme d'empreinte lorsque l'architecture le permet. Les coordonnées sont isolées afin de pouvoir les masquer, les supprimer ou limiter leur accès sans supprimer les statistiques anonymisées.

---

## 15. API fonctionnelle indicative

### Partie publique minimale

```text
GET  /public/feedback/{token}/configuration
POST /public/feedback/{token}/submissions
```

La réponse de configuration ne retourne que le nom public de la pharmacie, l'adresse, les catégories actives, les textes légaux et les réglages utiles au formulaire.

### Partie interne authentifiée

```text
GET  /v1/avis
GET  /v1/avis/{id}
PUT  /v1/avis/{id}/qualification
PUT  /v1/avis/{id}/affectation
POST /v1/avis/{id}/actions
GET  /v1/avis/analyse
POST /v1/avis/exports
POST /v1/avis/points-collecte
POST /v1/avis/points-collecte/{id}/revoquer
```

Les routes publiques et internes doivent être séparées dans le code, dans les autorisations et idéalement dans le déploiement réseau.

---

## 16. Scénarios de test

### QR code et publication

1. Un QR actif ouvre la bonne pharmacie et le bon point de collecte.
2. Un QR révoqué n'accepte plus d'avis et affiche une réponse neutre.
3. Modifier le jeton dans l'URL ne révèle aucune pharmacie voisine.
4. La page reste inutilisable en HTTP non sécurisé.
5. Le formulaire public ne donne accès à aucune route interne.

### Formulaire

1. Un client peut envoyer un avis anonyme sans fournir ses coordonnées.
2. Les coordonnées exigent le consentement de contact.
3. Une note hors de 1 à 5 est rejetée côté serveur.
4. Un commentaire trop long affiche une erreur compréhensible.
5. Un double appui crée un seul avis.
6. Une erreur réseau permet une nouvelle tentative sans duplication.
7. Un script saisi comme commentaire est affiché comme texte inoffensif.
8. Les informations du répondant précédent n'apparaissent jamais.

### Traitement interne

1. Un nouvel avis apparaît avec le statut correct.
2. Seuls les rôles autorisés voient les coordonnées.
3. Chaque changement d'état est audité.
4. Un nom ambigu reste non confirmé.
5. Un responsable peut confirmer ou détacher une mention d'employé.
6. L'analyse renvoie vers les avis sources.

### Recherche et export

1. `contient` fonctionne sans distinction de casse.
2. Plusieurs filtres se combinent correctement.
3. Les filtres actifs figurent sur l'impression et dans l'export.
4. Les cellules commençant par un caractère de formule sont neutralisées.
5. Les exports respectent les droits et sont journalisés.

### Analyse

1. Les indicateurs affichent toujours leur volume source.
2. Les avis supprimés ou anonymisés sont traités selon la politique retenue.
3. Une citation non confirmée n'est pas attribuée définitivement à un employé.
4. Un thème émergent peut être vérifié dans les avis sources.
5. Aucun score automatique ne déclenche une mesure disciplinaire.

---

## 17. MVP recommandé

### Version 1 — collecte et traitement

- configuration d'un point de collecte ;
- QR code et affiche PDF ;
- formulaire mobile anonyme ou identifiable ;
- note, catégories, commentaire et mention libre d'un employé ;
- liste interne, détail, statut, affectation et notes internes ;
- filtres simples, impression et export Excel sécurisé ;
- alertes sur faible note et urgence ;
- droits, audit et politique de conservation.

### Version 2 — analyse avancée

- dictionnaire de mots-clés ;
- thèmes, cooccurrences et tendances ;
- rapprochement assisté des employés cités ;
- résumé périodique ;
- comparaison avant/après actions ;
- vues et filtres enregistrés.

### Version 3 — pilotage multi-sites

- comparaison entre pharmacies ou points de collecte ;
- modèles d'affiches centralisés ;
- indicateurs consolidés ;
- seuils tenant compte du volume ;
- détection d'anomalies et suivi des plans d'amélioration.

---

## 18. Critères de réussite

- le formulaire s'ouvre rapidement sur un téléphone courant ;
- un avis simple peut être envoyé en moins de deux minutes ;
- l'anonymat est un choix clair et non un obstacle ;
- aucun avis d'un autre client n'est visible publiquement ;
- un responsable identifie en moins d'une minute les avis prioritaires ;
- toute analyse permet de retrouver ses avis sources ;
- les employés ne sont jamais évalués automatiquement sur une citation ambiguë ;
- les exports sont sûrs, filtrés et auditables ;
- le QR code peut être révoqué sans exposer Prestige ;
- les tendances débouchent sur des actions suivies et mesurables.

## 19. Décisions à valider avant développement

1. Le formulaire sera-t-il publié par la pharmacie ou par une passerelle Prestige hébergée ?
2. Quel nom de domaine HTTPS sera utilisé ?
3. Quels rôles peuvent lire les coordonnées et l'analyse par employé ?
4. Quelle durée de conservation appliquer aux commentaires et aux coordonnées ?
5. Quelles catégories et quels niveaux d'urgence utiliser au démarrage ?
6. Souhaite-t-on afficher les prénoms des employés, utiliser un code de badge ou conserver une saisie libre ?
7. Quels événements déclenchent une alerte et à qui ?
8. Le MVP doit-il produire directement une affiche PDF prête à imprimer ?
9. Le module doit-il fonctionner pour une seule officine ou être pensé immédiatement pour plusieurs sites ?

## 20. Recommandation finale

Le meilleur équilibre consiste à :

1. publier une page publique minimale derrière HTTPS, séparée de Prestige ;
2. faire encoder au QR code uniquement une URL et un identifiant aléatoire révocable ;
3. proposer un formulaire très court, progressif et anonyme par défaut ;
4. garder toutes les consultations, qualifications et analyses dans le menu interne **Avis clients** ;
5. commencer par des règles de mots-clés explicables avant d'ajouter des analyses plus avancées ;
6. présenter toute mention d'employé comme une information à confirmer ;
7. relier les tendances à des actions, des responsables et des échéances.

Ainsi, le module ne devient pas une simple « boîte à commentaires », mais un véritable outil privé d'écoute client, de traitement des problèmes et d'amélioration continue.
