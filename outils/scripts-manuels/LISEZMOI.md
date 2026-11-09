# Scripts à lancer à la main

Ces scripts ne font plus partie des mises à jour automatiques (Flyway) : ils sont trop longs sur les grosses bases
et bloquaient le démarrage de Prestige. Ils se lancent à la main, en dehors des heures d'ouverture.

## rattrapage_cloture_inventaire_rest.sql (ancienne migration V6.9.36)

Rétablit les quatre écritures perdues par les clôtures d'inventaire REST avant le 13/09/2026 : mouvement du jour,
instantané, date du dernier inventaire et stock par type. Détail en tête du script.

- **Quand le lancer** : une seule fois par officine, si elle a clôturé des inventaires entre le 01/08/2026 et le
  13/09/2026. Une base qui l'a déjà reçu par Flyway (ligne `6.9.36` dans `flyway_schema_history`) n'a rien à faire.
- **Avant** : sauvegarde de la base, puis voir ce qui sera rattrapé avec
  `src/main/resources/db/rattrapage/audit_cloture_inventaire_rest.sql`.
- **Lancer** : `mariadb <base> < rattrapage_cloture_inventaire_rest.sql`, Prestige arrêté ou hors ventes.
- **Rejouable** : une deuxième exécution ne réécrit rien.
- **Vérifier** : `SELECT * FROM rattrapage_cloture_inventaire ORDER BY dt_RATTRAPAGE DESC;` — une ligne par
  inventaire rattrapé, avec le nombre de mouvements, d'instantanés, de dates produit et de stocks par type écrits.

## Autres scripts lourds encore dans Flyway

Gardés dans les mises à jour automatiques (choix du 08/11) ; à sortir de la même façon si un poste bloque :

| Script | Ce qu'il fait | Poids |
|---|---|---|
| V6.9.101 | met à jour `t_order_detail` et `t_famille` (prix de vente absents des commandes) | lourd |
| V6.9.132.2, V6.9.151 | index sur `hmvtproduit` | moyen |
| V6.9.23, V6.9.43, V6.9.56, V7.0.8, V7.2.35 | index sur `t_preenregistrement` | moyen |

## Réglage Flyway

`cleanOnValidationError` est désormais à `false` (`FlywayStartupBean`) : une erreur de validation ne doit jamais
pouvoir vider la base.
