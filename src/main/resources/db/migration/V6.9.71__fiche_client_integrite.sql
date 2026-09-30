-- =====================================================================
-- Fiche client (30/09) : INTEGRITE du dossier.
--
-- Le dossier, les terrains et les mesures d'un client disparaissent
-- avec lui (un client supprime ne laisse pas de dossier orphelin, qu'un
-- autre client reprendrait s'il recevait le meme identifiant). Une
-- mesure disparait avec son parametre, et le poids verse par une
-- ordonnance avec cette ordonnance.
-- =====================================================================
DELETE FROM t_client_terrain WHERE lg_CLIENT_ID NOT IN (SELECT lg_CLIENT_ID FROM t_client);
DELETE FROM t_client_dossier WHERE lg_CLIENT_ID NOT IN (SELECT lg_CLIENT_ID FROM t_client);
DELETE FROM t_client_mesure WHERE lg_CLIENT_ID NOT IN (SELECT lg_CLIENT_ID FROM t_client)
    OR lg_PARAMETRE_ID NOT IN (SELECT lg_PARAMETRE_ID FROM t_parametre_clinique)
    OR (lg_ORDONNANCE_ID IS NOT NULL AND lg_ORDONNANCE_ID NOT IN (SELECT lg_ORDONNANCE_ID FROM t_ordonnance_client));
DELETE FROM t_client_terrain WHERE lg_TERRAIN_ID NOT IN (SELECT lg_TERRAIN_ID FROM t_terrain_clinique);

ALTER TABLE t_client_terrain
    ADD CONSTRAINT t_client_terrain_fk_client FOREIGN KEY (lg_CLIENT_ID) REFERENCES t_client (lg_CLIENT_ID) ON DELETE CASCADE,
    ADD CONSTRAINT t_client_terrain_fk_terrain FOREIGN KEY (lg_TERRAIN_ID) REFERENCES t_terrain_clinique (lg_TERRAIN_ID) ON DELETE CASCADE;
ALTER TABLE t_client_dossier
    ADD CONSTRAINT t_client_dossier_fk_client FOREIGN KEY (lg_CLIENT_ID) REFERENCES t_client (lg_CLIENT_ID) ON DELETE CASCADE;
ALTER TABLE t_client_mesure
    ADD CONSTRAINT t_client_mesure_fk_client FOREIGN KEY (lg_CLIENT_ID) REFERENCES t_client (lg_CLIENT_ID) ON DELETE CASCADE,
    ADD CONSTRAINT t_client_mesure_fk_parametre FOREIGN KEY (lg_PARAMETRE_ID) REFERENCES t_parametre_clinique (lg_PARAMETRE_ID) ON DELETE CASCADE,
    ADD CONSTRAINT t_client_mesure_fk_ordonnance FOREIGN KEY (lg_ORDONNANCE_ID) REFERENCES t_ordonnance_client (lg_ORDONNANCE_ID) ON DELETE CASCADE;
