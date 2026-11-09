# Transmission du 07/11 : retours fournisseurs en attente

**Pour** : la session qui a pris le relais (PRESTIGE V3 LOCAL CLAUDE).
**Contexte** : la mise en attente des retours fournisseurs est faite depuis le 14/10 (commit `9eae2eaa`, migration
`V7.0.4__retour_fournisseur_validation.sql`, test `src/test/e2e/retours/test-retour-fournisseur-attente.js`, 17/17).
Points décidés avec l'utilisateur le 07/11.

## 1. Vérifier le droit sur la base de l'officine

L'utilisateur ne trouve pas le droit de validation. Ce n'est pas un paramètre, c'est le privilège
`P_VALIDER_RETOUR_FRS`, décrit « COMMANDE - Valider un retour fournisseur (sortie du stock) ; sans ce droit, le retour
est mis en attente », dans l'écran des rôles.
- Contrôler que `V7.0.4` est passée (`flyway_schema_history`) et que le privilège apparaît dans l'écran des rôles.
- Ne rien écrire sur une base de production.

## 2. Refuser un retour en attente

- Seul un profil qui a `P_VALIDER_RETOUR_FRS` peut refuser.
- Le motif est obligatoire.
- Le retour passe à l'état « Refusé », avec la date, l'auteur et le motif.
- Aucune sortie de stock.
- La liste montre l'état « Refusé » et le motif dans une infobulle.
- La confirmation se fait dans le bouton, sans fenêtre.
- Côté serveur, on ne peut refuser qu'un retour en attente, jamais un retour validé, avec un verrou sur la ligne comme
  pour la validation.
- **Après un refus, l'auteur peut corriger le retour et le remettre en attente** (décision du 07/11) :
  - lignes, quantités, motifs et lots modifiables ;
  - le motif du dernier refus reste visible pendant la correction ;
  - la remise en attente efface l'état « Refusé » et garde l'historique (refus et remises en attente : qui, quand,
    motif) ;
  - le compteur du valideur (point 3) le compte de nouveau.

## 3. Signaler les retours en attente au valideur

Seuls les profils qui ont `P_VALIDER_RETOUR_FRS` voient le signal. Il donne le nombre de retours en attente :
- à la connexion ;
- sur le menu Retours fournisseurs : pastille avec le nombre, à déclarer dans `correctifs-affichage.js` ;
- un clic ouvre la liste filtrée sur « En attente de validation » ;
- le compteur se met à jour après chaque validation, refus ou remise en attente.

## 4. Mise en attente pour tous, et sur le mobile

- **Web** : aujourd'hui, un profil qui a le droit ne voit que « Valider le retour ». Il doit pouvoir aussi mettre en
  attente : deux boutons, « Valider le retour » et « Mettre en attente ». Un profil sans le droit garde seulement la
  mise en attente.
- **Mobile** : la route `POST v1/retourfournisseur/mettre-en-attente` n'a jamais été communiquée à l'équipe mobile.
  Un utilisateur mobile sans le droit reçoit aujourd'hui un refus en validant, sans pouvoir mettre en attente.
  - Communiquer cette route, `GET v1/retourfournisseur/droits` (`peutValider`), le refus (point 2), la correction et la
    remise en attente, et le nombre en attente (point 3).
  - Rédiger la réponse dans `docs/notices/REPONSE_SERVEUR_<date>.md`.

## Tests attendus (CLAUDE.md)

Chaque test échoue d'abord sur l'ancien code, puis passe. Il passe par le vrai chemin de l'écran et retire ses données.
Ne pas casser `test-retour-fournisseur-attente.js` (17/17).

- **Rapprochement** : l'état, le motif et l'auteur sont identiques dans la liste, l'infobulle, le tableau de bord,
  l'export Excel, la réponse mobile et la base. Le compteur du valideur est égal au nombre de retours en attente en
  base.
- **Bilan avant / après** :
  - mise en attente, refus et remise en attente : stock et mouvements inchangés ;
  - validation : une seule sortie de stock par ligne, sur le bon emplacement et le bon lot ; une seconde validation ne
    change rien ;
  - refus d'un retour validé : refusé, rien ne change.
- **Cohérence** : sur des enchaînements tirés au hasard avec une graine fixe (attente, refus, correction, remise en
  attente, validation), on vérifie à chaque étape que :
  - le stock ne bouge qu'à la validation ;
  - il ne devient jamais négatif ;
  - un retour n'est jamais validé deux fois.
- **Cas variés** :
  - plusieurs lignes, quantités supérieures à 1, plusieurs lots et motifs ;
  - profil avec et sans le droit ;
  - web et mobile ;
  - deux refus de suite avant validation.
