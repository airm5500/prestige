-- Prestige Veille : base locale (H2), independante de MariaDB.
CREATE TABLE utilisateur (
    login          VARCHAR(40)  PRIMARY KEY,
    mot_de_passe   VARCHAR(100) NOT NULL,
    actif          BOOLEAN      NOT NULL DEFAULT TRUE,
    mdp_par_defaut BOOLEAN      NOT NULL DEFAULT FALSE
);

-- reglages : les valeurs « secret » ne sont jamais renvoyees au navigateur (ecriture seule)
CREATE TABLE reglage (
    cle     VARCHAR(60)   PRIMARY KEY,
    valeur  VARCHAR(2000) NOT NULL,
    secret  BOOLEAN       NOT NULL DEFAULT FALSE,
    libelle VARCHAR(200)  NOT NULL,
    groupe  VARCHAR(40)   NOT NULL,
    ordre   INT           NOT NULL
);

INSERT INTO reglage (cle, valeur, secret, libelle, groupe, ordre) VALUES
 ('prestige.url', 'http://127.0.0.1:8080/prestige', FALSE, 'Adresse de Prestige sur le serveur', 'Prestige', 10),
 ('prestige.jeton', '', TRUE, 'Jeton de veille (paramètre SUPPORT_VEILLE_JETON de Prestige)', 'Prestige', 11),
 ('postes', '', FALSE, 'Postes de caisse à surveiller : une ligne par poste « NOM=http://IP:8080/prestige »', 'Prestige', 12),
 ('mariadb.url', 'jdbc:mariadb://127.0.0.1:3306/capitale', FALSE, 'Base MariaDB (adresse JDBC)', 'MariaDB', 20),
 ('mariadb.utilisateur', 'root', FALSE, 'Utilisateur MariaDB', 'MariaDB', 21),
 ('mariadb.motdepasse', '', TRUE, 'Mot de passe MariaDB', 'MariaDB', 22),
 ('service.payara', 'domain1', FALSE, 'Nom du service Windows de Payara', 'Windows', 30),
 ('service.mariadb', 'MariaDB', FALSE, 'Nom du service Windows de MariaDB', 'Windows', 31),
 ('payara.asadmin', 'C:/payara5/bin/asadmin.bat', FALSE, 'Chemin de asadmin (vidage du pool)', 'Windows', 32),
 ('payara.pool', 'laborex_pool', FALSE, 'Nom du pool de connexions de Prestige', 'Windows', 33),
 ('disque', 'C:/', FALSE, 'Disque à surveiller (espace libre)', 'Windows', 34),
 ('seuil.echecs', '2', FALSE, 'Échecs de suite avant d''ouvrir un incident (une sonde toutes les 30 s)', 'Seuils', 40),
 ('seuil.memoire.pct', '90', FALSE, 'Alerte si la mémoire du serveur Java dépasse (%)', 'Seuils', 41),
 ('seuil.disque.mo', '2048', FALSE, 'Alerte si l''espace disque libre descend sous (Mo)', 'Seuils', 42),
 ('alerte.ecran', '1', FALSE, 'Alerte affichée sur l''écran du serveur (1 = oui)', 'Alertes', 50),
 ('alerte.email', '0', FALSE, 'Alerte par e-mail (1 = oui)', 'Alertes', 51),
 ('email.destinataires', '', FALSE, 'Destinataires des e-mails (séparés par des virgules)', 'Alertes', 52),
 ('smtp.hote', '', FALSE, 'Serveur SMTP', 'Alertes', 53),
 ('smtp.port', '587', FALSE, 'Port SMTP', 'Alertes', 54),
 ('smtp.utilisateur', '', FALSE, 'Utilisateur SMTP', 'Alertes', 55),
 ('smtp.motdepasse', '', TRUE, 'Mot de passe SMTP', 'Alertes', 56),
 ('smtp.de', '', FALSE, 'Adresse d''expédition', 'Alertes', 57),
 ('redemarrage.auto', '0', FALSE, 'Redémarrer seul le service Payara quand Prestige ne répond plus (1 = oui ; désactivé par défaut)', 'Actions', 60),
 ('redemarrage.minutes', '5', FALSE, 'Délai avant redémarrage automatique (minutes)', 'Actions', 61),
 ('redemarrage.max.heure', '2', FALSE, 'Redémarrages automatiques par heure au plus', 'Actions', 62),
 ('retention.jours', '30', FALSE, 'Durée de conservation des mesures (jours)', 'Actions', 63);

CREATE TABLE mesure (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    quand            TIMESTAMP    NOT NULL,
    cible            VARCHAR(80)  NOT NULL,
    sonde            VARCHAR(20)  NOT NULL,
    ok               BOOLEAN      NOT NULL,
    ms               INT,
    memoire_pct      DOUBLE,
    cpu_serveur      DOUBLE,
    cpu_machine      DOUBLE,
    ram_libre_mo     BIGINT,
    ram_totale_mo    BIGINT,
    disque_libre_mo  BIGINT,
    fils_http        INT,
    pool_ms          INT,
    bdd_connexions   INT,
    bdd_pic          INT,
    appel_moyen_ms   INT,
    ecran_moyen_ms   INT,
    erreurs          INT,
    detail           VARCHAR(500)
);
CREATE INDEX idx_mesure_cible ON mesure (cible, quand);
CREATE INDEX idx_mesure_quand ON mesure (quand);

CREATE TABLE incident (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    cible     VARCHAR(80)  NOT NULL,
    nature    VARCHAR(20)  NOT NULL,
    debut     TIMESTAMP    NOT NULL,
    fin       TIMESTAMP,
    message   VARCHAR(500) NOT NULL,
    gravite   VARCHAR(10)  NOT NULL
);
CREATE INDEX idx_incident_debut ON incident (debut);

CREATE TABLE journal (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    quand       TIMESTAMP    NOT NULL,
    utilisateur VARCHAR(40)  NOT NULL,
    action      VARCHAR(60)  NOT NULL,
    resultat    VARCHAR(500) NOT NULL
);
