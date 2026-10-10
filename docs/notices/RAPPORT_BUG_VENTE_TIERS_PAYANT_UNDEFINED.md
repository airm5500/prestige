# Bug aléatoire à la vente : « tiers payant undefined », « Taux : undefined% », « Cette vente n'a plus de client »

Analyse du 10/10/2026. Pièces analysées :

- la vidéo `bugVente.mp4` (08/10, 15:15) ;
- la capture du 08/10 à 15:33 ;
- le journal du support du 09/10 ;
- les deux événements serveur ;
- `log_cmde.txt` et `log_vu_au_passage.txt`.

## 1. Ce que l'on voit

Dans la **vidéo**, la vente est de type **Carnet** et de nature **Prescription**. Elle a été créée le 08/10 à 14:59. À l'écran :

- client « YEO ALI » ;
- TP1 « CSR YOKOREA » ;
- taux 100 % ;
- bon 545454.

On demande le net à payer. Le serveur répond « **Cette vente n'a plus de client : rattachez le client avant de demander le net à payer** ». Puis vient « Le net à payer sera recalculé », et la caissière tourne en boucle sur ces deux messages. L'écran affiche un client, mais **en base la vente n'en a plus**.

La **capture de 15:33** montre la même vente (créée à 14:59), rappelée. Le bloc « INFOS COMPTE CARNET » affiche :

- `TPundefined:` sans nom ;
- `Taux : undefined%` ;
- l'encours à 0 ;
- aucun client.

## 2. Ce qui se passe (cause démontrée)

### 2.1 Deux ordres contraires envoyés en même temps

Sur une vente déjà commencée, il suffit de taper un nom dans « Rechercher le client » puis d'appuyer sur **Entrée**. L'écran (`VenteCtr.onClientSearchTextField`) envoie alors coup sur coup deux requêtes, **sans attendre la réponse de la première** :

1. `PUT vente/retmoveClient/{vente}` **détache** le client. Il met le client à vide et supprime les lignes de tiers payant de la vente.
2. Dès que la recherche trouve le client (souvent le même), `PUT vente/client/{vente}` le **rattache** et crée la ligne de tiers payant.

Les deux traitements s'exécutent en parallèle sur la même vente, dans deux transactions, sans verrou. Le résultat dépend de celle qui termine la dernière. La réponse du rattachement n'est d'ailleurs jamais lue : un échec passe inaperçu.

**Reproduit sur le banc :** j'ai envoyé les deux requêtes dans l'ordre de l'écran, 30 fois, en conditions normales.

| Résultat final | Fois sur 30 |
|---|---|
| client et ligne de tiers payant corrects | **14** |
| **sans client**, mais une ligne de tiers payant orpheline | **8** |
| **sans client**, et sans ligne de tiers payant | **8** |

Le défaut se produit **une fois sur deux** dès que le serveur met un peu de temps à répondre. Cela explique le caractère « aléatoire » du bug.

Le 08/10, entre 15:20 et 15:47, le journal du support relève justement des **blocages de 24 à 39 s** sur l'impression des tickets (`vente/ticket/vo` et `vente/ticket/vno`). Un serveur ralenti élargit la fenêtre de la course. Ces blocages tombent exactement sur la vidéo (15:15) et la capture (15:33).

### 2.2 Pourquoi « undefined »

On rappelle ensuite une vente Carnet ou Assurance qui a perdu son client. Le serveur renvoie `client = null`, et l'écran construit quand même un client vide.

Dans le modèle `ClientAssurance.js`, le champ des tiers payants de la vente est déclaré `{name: 'preenregistrementstp', auto: 'auto'}`. Il faut lire `type`, pas `auto` : c'est une faute de frappe. Sa valeur par défaut devient donc une chaîne vide.

L'écran parcourt cette « liste » d'un élément vide et dessine un bloc tiers payant sans données. D'où exactement :

- `TP` + numéro d'ordre absent → **`TPundefined:`** ;
- nom vide ;
- **`Taux : undefined%`** ;
- encours 0.

Ce n'est pas une deuxième panne : c'est la **même vente sans client** (2.1), affichée sans garde-fou.

> **Constat en officine (10/10).** Les deux requêtes de contrôle ne renvoient **aucune** vente, et le client YEO ALI est complet en base : fiche, compte, compte tiers payant à 100 %, et ses trois ventes du 08/10 portent bien leur ligne de tiers payant. En officine, la course s'est donc terminée chaque fois dans le bon ordre : le rattachement est passé **après** le détachement. La base n'a gardé aucune trace du défaut.
>
> Ce que la caissière a vu est **l'état intermédiaire** : pendant la fenêtre où le client était détaché (quelques centaines de millisecondes, ou plusieurs secondes quand le serveur était ralenti par l'impression des tickets), l'écran a relu la vente sans client et affiché « TPundefined ». La phrase « client marqué SANS CLIENT en base » décrit les 16 essais sur 30 du banc, pas la base de l'officine.
>
> La correction du lot A couvre les deux cas : il n'y a plus de détachement anticipé, donc plus d'état intermédiaire, et l'écran ne peut plus afficher « undefined ».

### 2.3 Chemin aggravant

À la clôture d'une vente Prescription sans client, le parcours ordonnance (client puis médecin) propose de choisir un client **comptant**. Sur une vente Carnet, cela rattache un client sans compte de tiers payant, et l'écran retombe dans le cas 2.2.

## 3. Autres constats des journaux (sans lien avec ce bug)

| # | Constat | Où | Gravité |
|---|---|---|---|
| a | Liste des commandes : `NullPointerException` répétée dans `OrderServiceImpl.buildFromTuple`. La liste ne s'affiche pas quand une commande a une donnée vide (grossiste ou date). | `log_cmde.txt` (une dizaine de fois) | moyenne |
| b | Ouverture d'une commande « commandée » : `NullPointerException` dans `CommandeEncourDetailDTO` (produit, grossiste ou détail absent). | `log_vu_au_passage` 2 | moyenne |
| c | Fiche grossiste (ancienne page JSP `ws_data_order_passed_grossiste.jsp`) : la colonne `lots`, désormais écrite en JSON (`[]`), est lue par l'ancienne couche comme un objet sérialisé, d'où une `ConversionException`. Cette page doit passer par l'API REST (règle « plus de JSP »). | `log_vu_au_passage` 1 | moyenne |
| d | Envoi PharmaML (`PUT pharma/{id}`) et suggestion PharmaML : requêtes de 21 à 39 s. L'appel au grossiste DPCI se fait pendant la requête de l'utilisateur et bloque son écran (4 fois). | journal du support | moyenne |
| e | Impression des tickets `vente/ticket/vo` et `vente/ticket/vno` : 24 à 39 s le 08/10, de 15:20 à 15:47. Les captures de threads sont **tronquées** dans le fichier Excel (limite des cellules), donc la cause exacte n'est pas lisible. | journal du support | haute (elle aggrave le bug) |
| f | Serveur arrêté brutalement le 09/10 à 01:54, redémarré à 11:33 (≈ 9 h 40 d'arrêt). La mémoire était saine (18 %) : coupure de courant ou arrêt du poste probable. Le job « Archivage PDF de la valorisation » n'a jamais tourné, conséquence de l'arrêt et du premier passage. | événements serveur | à surveiller |
| g | `Duplicate entry … uk_application_event_signature` : deux enregistrements simultanés du même événement du support. Sans conséquence, mais le message pollue le journal. | `log_cmde.txt` | faible |

## 4. Plan de correction

### Lot A — le bug de la vente (prioritaire)

1. **Plus de détachement anticipé.** La recherche client ne détache plus le client côté serveur. On garde le client en place jusqu'à ce qu'un autre soit **effectivement choisi**. Si la recherche est abandonnée, rien ne change, ni en base ni à l'écran.
2. **Un rattachement qui remplace en une seule opération.** `vente/client/{id}` pose le nouveau client et **remplace** les lignes de tiers payant dans la même transaction, sous **verrou de la vente**. Aucun doublon, aucune ligne orpheline.
3. **Verrou commun.** Le détachement (`retmoveClient`), le changement de tiers payant, le rattachement et le calcul du net verrouillent la vente : deux opérations sur une même vente passent l'une après l'autre, jamais mélangées.
4. **L'écran lit les réponses.** En cas d'échec du rattachement, un message clair s'affiche et l'écran revient à l'état réel de la vente. Le net à payer attend la fin d'un rattachement en cours.
5. **Plus jamais « undefined ».**
   - Corriger le modèle (`type: 'auto'`, liste vide par défaut).
   - N'afficher un bloc tiers payant que s'il est complet.
   - Une vente Carnet ou Assurance rappelée **sans client** affiche « Client absent de cette vente : recherchez-le » au lieu d'un bloc vide.
6. **Parcours ordonnance.** Sur une vente Assurance ou Carnet, il propose la recherche du client assuré au lieu d'un client comptant.
7. **Contrôle des ventes déjà touchées.** Une requête en lecture seule liste, en officine, les ventes en cours ou en attente de type Carnet ou Assurance qui n'ont pas de client ou ont des lignes de tiers payant orphelines. On les rouvre et on rattache le client. Je n'écris rien en production.
8. **Tests.**
   - Le scénario de la vidéo est joué par l'écran : vente Carnet, recherche du client puis Entrée, à répéter avec un serveur ralenti. Il doit échouer avant la correction et passer après.
   - Rappel d'une vente sans client : plus d'« undefined ».
   - Puis toute la suite de la vente.

### Lot B — commandes et PharmaML

- (a) et (b) : listes et détail des commandes tolérants aux données incomplètes, avec un test qui reproduit chaque cas.
- (c) : la page de la fiche grossiste passe par l'API REST ; l'ancienne lecture JSP n'est plus appelée.
- (d) : l'envoi PharmaML devient asynchrone. L'écran reçoit tout de suite « envoi en cours », puis le résultat, avec un délai maximum vers le grossiste.

### Lot C — surveillance

- (e) : la capture des threads d'un blocage est conservée **entière** dans un fichier joint, au lieu d'être coupée dans la cellule Excel. Je mesure aussi l'impression des tickets pour trouver ce qui la bloque.
- (f) : vérifier sur le poste de l'officine la cause de l'arrêt brutal (journal Windows, onduleur). Le job de valorisation se rattrapera au prochain passage.
- (g) : l'enregistrement d'un événement déjà connu incrémente le compteur, sans message d'erreur.

**Ordre proposé : A (1 → 8), puis B, puis C.**
