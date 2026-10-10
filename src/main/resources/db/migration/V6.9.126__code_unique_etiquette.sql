-- Retours du 10/10 (etiquettes QR / DataMatrix) : chaque etiquette porte un code de 5 caracteres qui n'est jamais
-- reproduit. Le registre garde tous les codes emis (cle primaire : un code ne peut pas etre donne deux fois).
CREATE TABLE IF NOT EXISTS t_etiquette_code (
    code CHAR(5) NOT NULL PRIMARY KEY,
    lg_FAMILLE_ID VARCHAR(40) NULL,
    dt_CREATED DATETIME NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
