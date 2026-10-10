-- H4 (Prestige Mobile) : cle client anti-doublon des creations faites depuis le telephone.
-- Une ligne par creation (vente ou retour fournisseur) envoyee avec l'en-tete HTTP X-Client-Ref.
-- La cle primaire sur ref garantit, meme en cas d'envois simultanes, qu'une meme cle ne cree qu'une fois.
-- Script rejouable (CREATE TABLE IF NOT EXISTS) ; aucune table existante n'est modifiee.
CREATE TABLE IF NOT EXISTS mobile_client_ref (
    ref        VARCHAR(64)  NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    entity_id  VARCHAR(40)  NULL,
    reference  VARCHAR(40)  NULL,
    reponse    MEDIUMTEXT   NULL,
    created_at DATETIME     NOT NULL,
    PRIMARY KEY (ref),
    KEY idx_mobile_client_ref_entity (type, entity_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;
