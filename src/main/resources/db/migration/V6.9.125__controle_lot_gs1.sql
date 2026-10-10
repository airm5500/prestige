-- Retours du 10/10 : lecture GS1 a la vente, que faire quand la boite scannee n'est pas du lot que Prestige sort ?
--   A = avertir seulement (la vente continue, Prestige sort son lot) ; B = avertir et sortir le lot scanne ;
--   C = bloquer l'ajout tant que la bonne boite n'est pas scannee. Defaut A.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED) VALUES
 ('KEY_VENTE_CONTROLE_LOT_GS1', 'A', 'Lecture GS1 a la vente, lot different de celui que Prestige sort : A = avertir seulement, B = avertir et sortir le lot scanne, C = bloquer l''ajout', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

-- Lots scannes sur une ligne de vente (mode B) : un numero de lot par boite scannee, separes par « | ».
ALTER TABLE t_preenregistrement_detail ADD COLUMN IF NOT EXISTS str_LOTS_SCANNES VARCHAR(500) NULL;
