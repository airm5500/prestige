# Réponse : faille de droits (profils, utilisateurs, paramètres)

**Date** : 31/10/2026
**Pour** : l'équipe serveur de Prestige.
**En réponse à** : `FAILLE_DROITS_PRESTIGE.md` (31/10/2026).

C'est corrigé sur la branche `claude/new-session-xm8ptu`, fusionnée dans `integration/recette-2026-10-29`. Les seize
tests de non-régression demandés (NR-01 à NR-16) passent, avec des cas de régression en plus :
`src/test/e2e/securite/test-faille-droits.js`. Ce test donnait 12/31 avant le correctif et donne 31/31 après.

## 1. Droit exigé côté serveur sur chaque route (§5.1)

| Routes | Droit exigé | Sans le droit |
|---|---|---|
| `v1/roles/*` (sauf `est-admin`) | menu « Profils » (`P_SM_ROLE`) | 403 `{success:false, interdit:true, msg}` |
| `v1/utilisateurs/*` | menu « Utilisateurs » (`P_SM_UTILISATEUR`) | 403 |
| `v1/utilisateurs/update-password` | en plus, `P_BT_MODIFICATION_USER` | 403 |
| `v1/app-params` : écriture | `P_SM_PARAMETER_MANAGER` ; administrateur pour une clé non `CUSTOMER` | 403 |
| toutes ces routes, sans session | — | 401 (retour à la connexion) |

Trois routes restent ouvertes à tout compte connecté, car l'écran de vente en dépend :

- `v1/app-params/key/...` ;
- `value/` d'une clé ordinaire ;
- `couleurs-lignes`.

### Règles d'attribution

- Un compte qui gère les profils ou les utilisateurs ne peut accorder **que des droits qu'il détient lui-même**.
- Il ne peut ni créer ni gérer un compte dont le profil va au-delà de ses propres droits. Cela vaut à la création, au
  changement de profil et à la réinitialisation du mot de passe.
- Les règles existantes sont conservées :
  - seul le super administrateur gère les comptes super administrateur ;
  - les profils super administrateur n'apparaissent pas dans les listes des autres comptes.
- Le profil passé en duplication ne recopie pas les droits que l'appelant n'a pas.
- Les noms « Super Administrateur… » et « Administrateur… » sont réservés au super administrateur, mais ce nom n'a plus
  aucun effet sur les droits (voir §3).

### Droits des menus

`P_SM_ROLE`, `P_SM_UTILISATEUR`, `P_SM_PARAMETER_MANAGER` et `P_BT_MODIFICATION_USER` passent du type `CUSTOMER` au
type `ADMIN`. Seuls l'administrateur, le pharmacien et le super administrateur peuvent les accorder. Aucune
attribution existante n'est retirée.

### Anciennes JSP (§2.6)

| JSP | Correctif |
|---|---|
| `utilisateur/ws_transaction.jsp` | mêmes règles que `v1/utilisateurs` |
| `parameter/ws_transaction.jsp` | mêmes règles que `v1/app-params`, avec deux exceptions (ci-dessous) |
| `role/ws_transaction.jsp` | réservée au super administrateur, car plus aucun écran ne l'appelle |

Les deux exceptions de `parameter/ws_transaction.jsp` sont `KEY_DAY_STOCK` et `KEY_MONTH_PERIME`. Les écrans de stock
les enregistrent par cette page ; elles restent donc ouvertes à qui ouvre ces écrans. Sans cette exception, ces
écrans auraient régressé.

## 2. Secrets et accès de dépannage

### Secrets

- Une clé est secrète si elle est dans la liste explicite ou si son nom correspond au motif :
  - liste : `KEY_SMS_DR_CALLBACK_SECRET`, `SUPPORT_VEILLE_JETON`, `KEY_AVIS_JETON` ;
  - motif : `SECRET`, `TOKEN`, `PASSWORD`, `MOT_DE_PASSE`, `API_KEY`, `CLE_API`, ou un nom finissant par `_JETON`.
- La valeur d'une clé secrète ne sort plus jamais par l'API :
  - `value/` et `detail` refusent ;
  - la liste affiche un masque.
- Enregistrer la fiche avec le masque garde le secret tel quel. On peut donc changer la description sans retaper le
  secret.

### Accès de dépannage

- `ACCES_DEPANNAGE_ACTIF` n'est modifiable que par le super administrateur, que ce soit par l'API ou par la JSP.
- Chaque changement est inscrit au journal d'activité sous le nouveau type « Droits et accès sensibles »
  (`TypeLog.SECURITE_DROITS`, ajouté en fin d'énumération).

## 3. Rôle spécial reconnu par un droit, plus par le nom (§5.2)

La migration `V7.2.28__faille_droits_profils.sql` (rejouable) crée trois droits de type `SYSTEME`. Seul le super
administrateur peut les accorder.

| Droit | Remplace le test sur le nom |
|---|---|
| `P_PROFIL_SUPER_ADMIN` | « Super Administrateur… » (libellé ou désignation) |
| `P_PROFIL_ADMIN` | « Administrateur… » |
| `P_PROFIL_PHARMACIEN` | « Pharmacien » |

La migration pose ces droits **une seule fois**, sur les profils que l'ancien code reconnaissait à leur nom. Ensuite :

- un profil renommé n'en reçoit aucun ;
- le compte système « 00 » reste super administrateur.

### Code adapté

- Tous les tests sur le nom sont remplacés :
  - `bll.userManagement.user` ;
  - les services et ressources REST ;
  - `ws_data_all.jsp`, `ws_login.jsp`, `ws_generate_pdf.jsp` ;
  - les `ws_data.jsp` des utilisateurs et des profils.
- La liste des profils marqués est relue au plus toutes les 30 s (`util.RolesSpeciaux`), et aussitôt après toute
  modification des droits d'un profil.
- Le super administrateur ne peut pas retirer son propre droit de super administrateur. Tout changement de ces trois
  droits est journalisé.

## 4. Point d'attention : le profil « Gestionnaire »

Avec la règle « on n'accorde que ce qu'on détient », le profil « Gestionnaire » ne peut plus attribuer le profil
« Caisse/Commande/Stock ». Ce profil contient `P_SHOW_ALL_ACTIVITY`, que le Gestionnaire n'a pas.

- Ce profil n'a aucun compte sur la copie de travail.
- Si une officine l'utilise pour créer des comptes, deux solutions :
  - lui ajouter le droit manquant ;
  - faire créer ces comptes par l'administrateur.

Les autres profils qui gèrent des comptes (« Pharmacien Assistant », « Administrateur », « Pharmacien ») gardent leurs
attributions habituelles.

## 5. Après déploiement, dans chaque officine (§7)

1. **Profils marqués par la migration**

   ```sql
   SELECT p.str_NAME, r.str_NAME, r.str_DESIGNATION
     FROM t_role_privelege rp
     JOIN t_role r ON r.lg_ROLE_ID = rp.lg_ROLE_ID
     JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
    WHERE p.str_NAME LIKE 'P_PROFIL_%'
    ORDER BY 1, 2;
   ```

   - Chaque profil listé doit être légitime.
   - Un profil renommé par malveillance avant la mise à jour aurait reçu le droit : le retirer depuis l'écran
     « Profils », avec le compte super administrateur.

2. **Activité récente** : vérifier les éléments suivants.
   - Les mots de passe réinitialisés.
   - Les paramètres modifiés récemment (`t_parameters.dt_UPDATED`, journal d'activité).
   - Les profils créés ou modifiés récemment.

3. **Secrets** :
   - renouveler `KEY_SMS_DR_CALLBACK_SECRET`, `SUPPORT_VEILLE_JETON` et `KEY_AVIS_JETON`, qui étaient lisibles ;
   - reporter les nouvelles valeurs chez les services qui les utilisent.

4. **Accès de dépannage** : vérifier que `ACCES_DEPANNAGE_ACTIF` vaut 0.

5. **Profil « Gestionnaire »** : voir le §4.

## 6. Non-régression

Les tests d'écran existants concernés par les droits, les profils, les utilisateurs et les paramètres ont été
rejoués un par un sur la copie de travail :

- `securite/test-droits-super-admin.js`, `test-set-valorisation-super-admin.js`,
  `test-liste-utilisateurs-sans-mot-de-passe.js` ;
- `retours/test-utilisateurs-fenetres-droits.js`, `test-profils-fenetres-modales.js`,
  `test-parametres-rubriques.js`, `test-tableau-bord.js`, `test-lot-c-surveillance.js` ;
- `support/test-sms-configuration-sans-secret.js`.
