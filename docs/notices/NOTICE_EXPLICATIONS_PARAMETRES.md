# Explications dépliables des paramètres récents (retour du 10/11/2026)

Branche `PRES-/explications-parametres`, partie de `PRES-/prise-en-charge-totale` (elle a besoin du bouton « i » livré
par ce lot). Rien n'est fusionné. Chantier séparé du lot ticket / prise en charge totale.

## Périmètre

Les 36 paramètres de `laborex_v1_db` créés depuis janvier 2026 dont la valeur est 0 ou 1. Migration rejouable
`V7.6.21__explications_parametres.sql` : une ligne par paramètre dans `parametre_explication` (une explication déjà
présente n'est pas écrasée). **35 explications livrées, 1 paramètre signalé.**

Méthode : chaque explication a été écrite d'après le code qui lit le paramètre (recherche de toutes les lectures de la
clé, lecture du code Java et ExtJS), jamais d'après sa seule description. Elle donne la règle, ce que fait le logiciel
à 0 et à 1 (ou l'unité, la valeur par défaut et les bornes pour un nombre), des cas concrets, des rappels, et le moment
où la valeur est relue.

## Paramètre signalé au lieu d'être documenté

| Paramètre | Constat |
|---|---|
| `SEMOIS_ABC_LOG` | **Aucun code ne le lit.** Le journal des calculs SEMOIS est écrit à chaque calcul, quelle que soit sa valeur. Sa description en base (« Journalise les calculs… (0/1) ») est donc trompeuse. À décider : le brancher sur le code, ou le retirer. |

## Constats faits en lisant le code (à connaître, non corrigés ici)

| Paramètre | Constat |
|---|---|
| `KEY_TICKET_LENT_SEUIL_MS` | Créé à 5 000 ms, il vaut **0** sur `laborex_v1_db`. Or une impression est signalée dès que sa durée atteint le seuil : à 0, **chaque impression de ticket** est signalée au Centre de Support. Seule une valeur vide retombe sur 5 000. |
| `KEY_SAUVEGARDE_ACTIVE` | Vaut **0** sur `laborex_v1_db` : la sauvegarde automatique de chaque heure et l'alerte « sauvegarde ancienne » sont coupées sur cette base. Sa description (« Sauvegardes ») ne dit rien de l'effet. |
| `KEY_JOURNAL_CONSERVATION_MOIS` | Le code garde toujours au moins 3 mois, même si la valeur est 1 ou 2 ; la description ne le dit pas. |
| `KEY_VENTE_LECTURE_GS1` | À 0, l'étiquette 2D est quand même lue pour en tirer le code du produit, sans contrôle du lot ; la description dit seulement « 0 = non ». |
| `KEY_LIGNE_COMPTANT_VO` | Il commande aussi les lignes « taux : part » du ticket assurance, ce que sa description ne dit pas. |
| `SUPPORT_WATCHDOG_ENABLED` | Lu seulement au démarrage du serveur : un changement ne prend effet qu'au redémarrage. |
| `SUPPORT_SLOWLOG_ENABLED` | D'après le code, une fois à 0 il n'est plus relu avant le redémarrage (lecture du code, non essayé). |
| Sens de l'interrupteur | Certains ne se coupent qu'à « 0 » exactement (vide = actif) : `KEY_ETIQUETTE_CODE_PAR_PRODUIT`, `KEY_AVIS_ACTIF`, `KEY_CONNEXION_BADGE`, `KEY_BORNE_POINTAGE_RESEAU_LOCAL`, `KEY_SAUVEGARDE_ACTIVE`, `SUPPORT_SLOWLOG_ENABLED`, `SUPPORT_WATCHDOG_ENABLED`, `SUGGESTION_RESERVE_HOOK_VENTE`. Les autres ne s'activent qu'à « 1 » exactement. Chaque explication le précise. |

## Réserves notées par paramètre

- Étiquettes (`KEY_ETIQUETTE_*`) : l'effet a été lu dans le moteur d'étiquettes actuel ; il n'a pas été vérifié quand
  le moteur est réglé sur l'ancien.
- `SEMOIS_ABC`, `SEMOIS_PAR_PRODUIT` : les conditions exactes du passage mensuel au démarrage n'ont pas toutes été lues.
- `KEY_SMS_AVOIR_IMMEDIAT` : à 0, un envoi différé existe mais dépend d'un autre paramètre ; l'explication reste prudente.
- `KEY_CONNEXION_BADGE` : le refus côté serveur est établi ; la disparition de la zone de badge à l'écran ne l'est pas.
- `KEY_CORRESPONDANCE_SEUIL_ECART_PRIX` : les exemples chiffrés sont calculés d'après la règle du code (écart
  strictement supérieur au seuil), pas repris d'un test existant.

## Sécurité

Les explications des paramètres sensibles (`ACCES_DEPANNAGE_ACTIF`, `KEY_ENTETES_X_USER_INFO`, badge, code PIN,
empreintes, bornes de pointage) décrivent l'effet et la précaution, sans marche à suivre. Un paramètre secret n'a
jamais d'explication servie par la liste.

## Tests

| Test | Ce qu'il vérifie |
|---|---|
| `ExplicationsParametresLivreesTest` (unitaire) | chaque explication livrée par une migration est lisible par l'écran, sans balise ni nom de fichier ; **elle est rattachée à un paramètre que le code lit** (le test échoue si on en pose une sur `SEMOIS_ABC_LOG` : vérifié) ; un interrupteur couvre 0 et 1 |
| `retours/test-parametres-explications-36.js` (écran) | base = service = écran pour chacun des paramètres expliqués : bouton « i », dépliage sans fenêtre, règle, tableau et rappels identiques à la base, repli ; `SEMOIS_ABC_LOG` sans bouton |

## Règle pour la suite

Tout nouveau paramètre est livré avec son explication (règle, valeurs possibles, exemples chiffrés ou cas d'usage),
écrite d'après le code qui le lit, par une ligne dans `parametre_explication` dans sa migration. Le test unitaire
ci-dessus relit toutes les migrations : une explication illisible ou orpheline fait échouer la suite.
