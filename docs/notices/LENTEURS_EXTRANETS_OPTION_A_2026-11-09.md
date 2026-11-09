# Lenteurs des extranets : option A (09/11)

Question de l'utilisateur : « pourquoi en ligne sur l'extranet c'est rapide et ici c'est aussi lent ? pourquoi ne pas
utiliser la même chose comme en ligne ? et lancer en arrière-plan les mises à jour sans risquer de planter le serveur
ou créer des lenteurs ». Option retenue le 09/11 : **A**, consultation « comme en ligne » et copie complète en
arrière-plan, améliorée.

## Pourquoi c'était lent

L'extranet n'affiche que ce que l'on regarde ; Prestige copiait tout, avec une pause d'une seconde entre deux appels.
Mesures du 08/11 (domain3) :

| Lecture | Appels | Durée | Ce qui coûte |
|---|---|---|---|
| Offres DPCI | 137 détails d'offre | 181 s | la pause (137 s) |
| Promotions Copharmed | ≈ 250 pages de détail | 375 s | la pause (250 s) |
| Catalogue Copharmed | 48 pages de 200 | 636 s | le site (≈ 13 s par page) ; la pause : 48 s |

## Réalisé

1. **Consultation DPCI en direct** (DPCI › Mes offres en cours › Consultation en direct) : la liste des offres de la
   période en un appel, le détail d'une offre au clic en un appel ; rien n'est gardé. Deux clics rapides : seul le
   dernier détail s'affiche. API : `GET v1/extranet/dpci/direct/offres?du=&au=`, `GET v1/extranet/dpci/direct/offre`.
2. **Lectures en étapes courtes** : la lecture sur l'extranet se fait sans transaction ni connexion à la base. Le
   journal de la collecte est écrit tout de suite (visible « en cours » dans Collectes), les lignes par paquets de
   1 000 (INSERT de 100 lignes), puis la fermeture et le remplacement de l'ancien cache ensemble. Un échec retire les
   lignes déjà écrites et garde l'ancien cache. Avant : une seule transaction de plusieurs minutes, un INSERT par
   ligne.
3. **Un seul verrou** pour les lectures lancées à l'écran et le rafraîchissement automatique : jamais deux lectures
   de la même liste ; un clic pendant un rafraîchissement suit la lecture en cours (« Rafraîchissement automatique en
   cours… »).
4. **Avancement** à l'écran : « page n / N » quand le total est connu (pages DataTables Ubipharm, détails des offres
   DPCI, promotions Copharmed), « n pages lues » sinon.

## Restant (sessions DPCI et Copharmed expirées pendant le travail)

- DPCI : ne relire que les offres modifiées depuis la dernière lecture. À vérifier d'abord sur l'extranet connecté :
  où se trouve la date de modification de l'offre dans la liste, et si le détail peut changer sans elle.
- Réduire la pause pour DPCI après essai ; vérifier si Copharmed accepte des pages de plus de 200 produits.
- Commandes et documents DPCI page par page en direct.

## Tests

| Contrôle | Test | Résultat |
|---|---|---|
| Appels comptés sur le fil de la lecture, ni plus ni moins ; total annoncé ; verrou commun écran / tâche planifiée ; erreur : verrou libéré | `AvancementLecturesCoherenceTest` (cohérence, hasard) | 3/3 |
| Consultation en direct = lecture complète, ligne par ligne ; un appel pour la liste, un par détail ; références refusées | `DpciLecteurTest.consultationEnDirect_rapprochement` | vert |
| Journal visible pendant la lecture, avancement « page n / 25 », ancien cache affiché ; base = extranet ligne par ligne sur 2 500 puis 2 437 lignes ; échec : aucune ligne, ancien cache intact ; bilan : exactement 3 collectes | `test-ecran-lecture-etapes-0911.js` | 19/19 (ancien code : échecs sur le journal et l'avancement) |
| Liste et détail en direct par l'écran = source, ligne par ligne ; = liste gardée en base ; rien d'écrit ; clics rapides | `test-ecran-dpci-direct-0911.js` | 29/29 (onglet absent sur l'ancien code) |

Non-régression (domain2, laborex_perf) : unitaires 2 101 / 2 101 ; écran : listes Ubipharm 95/95, rapprochement 43/43,
période-recherche 15/15, BL saisis 16/16, défilement 12/12, grossistes liés 23/23, suggestions 19/19, fichiers 50/50.
Non concluants faute de données dans laborex_perf (aucune liste d'extranet lue, comptes réels présents) :
rafraîchissement (liste TEDIS déjà lue attendue), retours du 08/11 (session réelle attendue), période (listes gardées
attendues), TVA et recherche Copharmed (catalogue gardé attendu), identifiants (base sans compte attendue).
