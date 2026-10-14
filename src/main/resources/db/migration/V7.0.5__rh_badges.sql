-- =====================================================================
-- Retours du 13/10 (point 3) : RH, onglet « Badges ».
-- t_rh_badge : historique des badges (creation, modification, desactivation, impressions).
--   Un badge ACTIF par employe et un numero ACTIF une seule fois (colonnes calculees uniques : NULL hors actif).
--   Le numero du badge actif reste recopie dans t_employe.badge, que la pointeuse utilise deja.
-- Reprise : chaque employe qui a deja un numero de badge recoit son badge actif.
-- Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS t_rh_badge (
    id                VARCHAR(40)  NOT NULL,
    employe_id        VARCHAR(40)  NOT NULL,
    numero            VARCHAR(40)  NOT NULL,
    statut            VARCHAR(12)  NOT NULL DEFAULT 'ACTIF',
    dt_emission       DATE         NOT NULL,
    dt_expiration     DATE         NULL,
    motif             VARCHAR(200) NULL,
    dt_desactivation  DATETIME     NULL,
    desactive_par     VARCHAR(40)  NULL,
    nb_impressions    INT          NOT NULL DEFAULT 0,
    dt_impression     DATETIME     NULL,
    created_at        DATETIME     NOT NULL,
    created_by        VARCHAR(40)  NULL,
    updated_at        DATETIME     NULL,
    numero_actif      VARCHAR(40)  AS (IF(statut = 'ACTIF', numero, NULL)) PERSISTENT,
    employe_actif     VARCHAR(40)  AS (IF(statut = 'ACTIF', employe_id, NULL)) PERSISTENT,
    PRIMARY KEY (id),
    UNIQUE KEY uk_badge_numero_actif (numero_actif),
    UNIQUE KEY uk_badge_employe_actif (employe_actif),
    KEY ix_badge_employe (employe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO t_rh_badge (id, employe_id, numero, statut, dt_emission, created_at)
SELECT LEFT(UUID(), 40), e.id, e.badge, 'ACTIF', COALESCE(e.dt_entree, DATE(e.created_at)), NOW()
  FROM t_employe e
 WHERE e.badge IS NOT NULL AND TRIM(e.badge) <> ''
   AND NOT EXISTS (SELECT 1 FROM t_rh_badge b WHERE b.employe_id = e.id AND b.statut = 'ACTIF');
