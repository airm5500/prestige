-- Reference Ubipharm (PSCODE) sur la fiche article, comme le code EAN 13 (reponse de l'utilisateur du 07/11) :
-- elle est rangee dans t_famille, pas dans t_famille_grossiste. Vide par defaut ; saisie sur la fiche article.
-- Sert au rapprochement des produits lus sur l'extranet Ubipharm (lecture seule, rest.service.extranet).
ALTER TABLE t_famille ADD COLUMN IF NOT EXISTS code_ubipharm VARCHAR(40) NULL DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_t_famille_code_ubipharm ON t_famille (code_ubipharm);
