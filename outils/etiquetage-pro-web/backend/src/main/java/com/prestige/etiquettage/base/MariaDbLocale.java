package com.prestige.etiquettage.base;

import ch.vorburger.exec.ManagedProcessException;
import ch.vorburger.mariadb4j.DB;
import ch.vorburger.mariadb4j.DBConfiguration;
import java.io.File;

/**
 * MariaDB4j sans reinstallation d'une base existante. MariaDB4j relance l'outil d'installation a chaque demarrage ;
 * sous Windows, mariadb-install-db.exe refuse un dossier de donnees non vide : le deuxieme lancement echouait. La base
 * n'est donc installee que si son dossier ne contient pas encore le schema systeme « mysql ».
 */
final class MariaDbLocale extends DB {

    private MariaDbLocale(DBConfiguration configuration) {
        super(configuration);
    }

    static DB ouvrir(DBConfiguration configuration) throws ManagedProcessException {
        MariaDbLocale db = new MariaDbLocale(configuration);
        db.prepareDirectories();
        db.unpackEmbeddedDb();
        db.install();
        return db;
    }

    static boolean installee(String dossierDonnees) {
        return new File(dossierDonnees, "mysql").isDirectory();
    }

    @Override
    protected synchronized void install() throws ManagedProcessException {
        if (!installee(configuration.getDataDir())) {
            super.install();
        }
    }
}
