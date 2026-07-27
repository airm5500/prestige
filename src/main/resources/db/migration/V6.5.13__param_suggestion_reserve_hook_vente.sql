-- Interrupteur du declenchement des suggestions de reserve par la vente.
--
-- A 1 (valeur livree), une vente qui fait passer le stock rayon sous son seuil mini
-- alimente automatiquement la suggestion de reappro du rayon, une fois la vente validee.
--
-- A 0, ce seul declenchement s'arrete : les suggestions issues des ventes ne sont plus
-- generees, tout le reste du module continue de fonctionner normalement, et les
-- suggestions restent creables a la main depuis les onglets REAPPRO et REASSORT.
-- Le retour arriere se fait donc sans redeploiement.
--
-- Le declenchement par la cloture d'un bon de livraison n'est pas concerne par ce
-- parametre : il s'appuie sur un point d'execution posterieur au commit deja present
-- dans le flux, sans mecanisme ajoute.

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUGGESTION_RESERVE_HOOK_VENTE', '1', 'Generer automatiquement les suggestions de reappro du rayon a partir des ventes (1 = actif, 0 = inactif)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
