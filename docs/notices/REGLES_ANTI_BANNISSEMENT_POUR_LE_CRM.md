# Règles anti-bannissement de Prestige : reprise dans le CRM UBIPHARM

Ce document décrit ce que Prestige applique avant chaque envoi WhatsApp Web, et que le CRM n'applique pas encore.
Il indique aussi où le brancher dans le CRM.

- **Source côté Prestige** : `outils/whatsapp-web/src/regles.js` (règles, sans état ni réseau) et
  `outils/whatsapp-web/src/file.js` (file d'envoi qui les applique). Les tests sont dans `test/regles.test.js`.
- **Point d'entrée côté CRM** : `CadenceWhatsapp` (`peutEnvoyer`, `envoye`), appelé par
  `EnvoiWhatsappServiceImpl.envoyerLot()` et `envoyerMaintenant()`.

## 1. Ce que le CRM fait déjà

| Règle | CRM (`CadenceWhatsapp`) |
|---|---|
| Plage horaire | `whatsapp.envoi.heure_debut` / `heure_fin` (8 h – 18 h), plage séparée pour l'envoi en masse |
| Attente aléatoire entre deux messages d'un numéro | `whatsapp.envoi.delai_min_secondes` / `delai_max_secondes` (20 – 45 s) |
| Plafond par jour, tous envois confondus | `whatsapp.envoi.plafond_jour` (200) |

## 2. Ce que Prestige ajoute

Les valeurs ci-dessous sont celles de Prestige ; toutes sont réglables. Les noms de paramètres proposés pour le CRM
suivent sa convention `whatsapp.envoi.*`.

| # | Règle | Défaut Prestige | Paramètre proposé pour le CRM |
|---|---|---|---|
| 1 | Longue pause toutes les N messages | 5 à 12 min tous les 15 messages | `pause_apres_messages`, `pause_min_minutes`, `pause_max_minutes` |
| 2 | Plafond par heure | 40 / heure | `plafond_heure` |
| 3 | Montée en charge d'un numéro récent | 20 le premier jour, +20 par jour jusqu'au plafond du jour | `montee_en_charge` (0/1), `montee_depart`, `montee_pas` |
| 4 | « En train d'écrire » simulé avant l'envoi | 45 ms par caractère, entre 1,5 et 8 s | `frappe_ms_par_caractere`, `frappe_min_ms`, `frappe_max_ms` |
| 5 | Variation des textes `{Bonjour\|Bonsoir}` | une variante tirée au hasard à chaque envoi | aucun (toujours actif) |
| 6 | Numéro vérifié avant l'envoi | un numéro sans WhatsApp est refusé, pas tenté | `verifier_numero` (0/1) |
| 7 | Doublon du jour refusé | même numéro + même texte le même jour | aucun (toujours actif) |
| 8 | Pause de protection après des échecs | 30 min après 3 échecs techniques de suite | `echecs_avant_pause`, `pause_echec_minutes` |
| 9 | Mots d'arrêt | STOP, ARRÊT, DÉSABONNER, DÉSINSCRIRE, UNSUBSCRIBE : le numéro n'est plus jamais servi | aucun (liste fixe) |
| 10 | Plancher de sécurité | délai minimal jamais sous 5 s ; une valeur absurde reprend le défaut | aucun |

## 3. Comment chaque règle fonctionne

1. **Longue pause.** Après chaque série de N messages envoyés, l'attente suivante n'est plus de 20 à 60 s mais de
   5 à 12 minutes, tirée au hasard. Le compteur de série repart après la pause.
2. **Plafond par heure.** Il s'ajoute au plafond du jour. Quand il est atteint, le message attend l'heure suivante,
   ou l'ouverture de la plage horaire si l'heure suivante en sort.
3. **Montée en charge.** Plafond du jour = min(plafond du jour, départ + pas × jours écoulés depuis le premier envoi
   du numéro). Un numéro neuf qui envoie 200 messages le premier jour est le cas de bannissement le plus fréquent.
   Il faut donc mémoriser, par numéro, la date du premier envoi.
4. **« En train d'écrire ».** Avec Baileys, avant `sendMessage` :
   ```js
   await sock.presenceSubscribe(jid);
   await sock.sendPresenceUpdate('composing', jid);
   await attendre(duree);           // duree = longueur × 45 ms × aléa 0,8 à 1,2, bornée entre 1,5 et 8 s
   await sock.sendPresenceUpdate('paused', jid);
   ```
   Dans le CRM, cela revient à ajouter une durée (ou un indicateur) à `/sessions/:id/send` et `/send-media`, puis à
   la faire appliquer par `server.js` avant l'envoi.
5. **Variation.** `{a|b|c}` est remplacé par une des variantes. Des accolades sans `|` restent telles quelles, ce qui
   ne gêne pas les variables `{{nom}}` du CRM, à condition de faire la variation **après** la substitution des
   variables.
6. **Numéro vérifié.** Appeler `onWhatsApp` avant l'envoi : `/sessions/:id/check-numbers` existe déjà dans
   `server.js`. Le résultat peut être mis en cache par numéro, pour quelques jours, pour ne pas le redemander à
   chaque message.
7. **Doublon du jour.** Avant de mettre un message en attente, refuser s'il existe déjà pour le même destinataire
   un message au texte identique, du même jour, non échoué. Dans le CRM : une requête sur `crm_message_sortant` et
   `crm_campagne_message`, comme celle du plafond du jour.
8. **Pause de protection.** Seuls les échecs **techniques** comptent : exception, session coupée. Un numéro sans
   WhatsApp ne compte pas. Au 3e échec de suite, plus aucun envoi par ce numéro pendant 30 minutes. Un envoi réussi
   remet le compteur à zéro.
9. **Mots d'arrêt.** À la réception d'un message (callback `/message`), si le texte nettoyé (minuscules, sans
   ponctuation finale) est l'un de ces mots, le numéro passe en liste d'arrêt. Ses messages en attente passent en
   échec « Désinscrit (STOP) », et tout nouvel envoi vers lui est refusé. Dans le CRM, c'est aussi un consentement
   retiré, à afficher sur la fiche du client.

## 4. Où le brancher dans le CRM

- **`CadenceWhatsapp.peutEnvoyer(numero)`** : ajouter, dans cet ordre, la pause de protection (8), la plage horaire
  (déjà là), le plafond du jour avec montée en charge (3, à la place du plafond fixe), le plafond par heure (2).
  Rendre la raison et l'heure de reprise plutôt qu'un simple `false` : l'historique peut alors afficher
  « reprise à 14 h ».
- **`CadenceWhatsapp.envoye(numero)`** : tenir le compteur de série pour la longue pause (1) et remettre à zéro les
  échecs consécutifs (8).
- **Nouvelle méthode `CadenceWhatsapp.echec(numero, technique)`** : compter les échecs techniques (8).
- **Avant la mise en file** (envoi immédiat, envoi en masse, campagne, relance) : doublon du jour (7) et liste
  d'arrêt (9).
- **Juste avant l'appel au service** : variation (5), vérification du numéro (6) et durée de frappe (4).
- **Réception** (`EvenementWhatsappServiceImpl`, callback `/message`) : mots d'arrêt (9).

## 5. Tests à reprendre

Les cas de `outils/whatsapp-web/test/regles.test.js` se transposent en tests unitaires JUnit, avec une horloge et un
tirage aléatoire injectés :
- délai jamais fixe et dans ses bornes ;
- longue pause au N-ième message ;
- plafond par heure puis reprise à l'heure suivante ;
- montée en charge au jour 0, 1 et 10 ;
- hors plage puis reprise à l'ouverture ;
- variation sans toucher `{{variable}}` ;
- STOP reconnu avec ponctuation et majuscules ;
- doublon du jour refusé, mais accepté le lendemain ;
- pause après 3 échecs techniques, pas après 3 numéros sans WhatsApp.

## 6. Conseils d'exploitation (identiques pour les deux applications)

- Un numéro ancien et actif, connecté une fois. Éviter les rescans : chaque scan réinitialise le chiffrement avec
  tous les contacts.
- N'écrire qu'aux clients qui ont donné leur numéro et accepté les messages.
- Des textes utiles et personnalisés, jamais le même texte à tout le monde dans la même heure.
- Pour les gros envois marketing, préférer l'API officielle (Meta) quand elle est configurée.
