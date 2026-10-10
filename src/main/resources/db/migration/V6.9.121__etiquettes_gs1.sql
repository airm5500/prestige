-- Retours du 10/10 (point 5, Q5 / Q6) : etiquettes 2D GS1 et lecture a la vente.
-- KEY_ETIQUETTE_CODE : code imprime par defaut sur les etiquettes (CODE128 = code-barres du CIP, comme avant ; QR ou
-- DATAMATRIX = code 2D GS1 : (01) EAN, (17) peremption, (10) lot, (240) CIP). L'ecran d'impression peut le changer.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED)
VALUES ('KEY_ETIQUETTE_CODE', 'CODE128', 'Code des etiquettes : CODE128 (code-barres du CIP), QR ou DATAMATRIX (code 2D GS1 : EAN, peremption, lot, CIP)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
-- KEY_VENTE_LECTURE_GS1 : 1 = a la vente, le scan d'une etiquette GS1 (QR ou DataMatrix) trouve le produit (CIP ou EAN)
-- et rappelle lot et peremption ; 0 (defaut) = comportement d'avant, rien ne change.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED)
VALUES ('KEY_VENTE_LECTURE_GS1', '0', 'Vente : lecture des etiquettes GS1 (QR / DataMatrix) au scan : 1 = oui, 0 = non', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
