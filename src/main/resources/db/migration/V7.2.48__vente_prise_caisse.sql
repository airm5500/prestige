-- Plan du 08/11, point 15.3 : prise en caisse d'une prevente. Une ligne par vente et par caissiere qui l'ouvre a
-- l'ecran de vente (premiere ouverture seulement) ; seulement quand la caissiere n'est pas le vendeur. Sert a mesurer
-- le temps de la caissiere : de la prise en caisse a l'encaissement (completion_date de la vente).
CREATE TABLE IF NOT EXISTS vente_prise_caisse (
  vente_id varchar(40) NOT NULL,
  user_id varchar(40) NOT NULL,
  pris_le datetime NOT NULL,
  PRIMARY KEY (vente_id, user_id),
  KEY idx_vente_prise_caisse_pris_le (pris_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
