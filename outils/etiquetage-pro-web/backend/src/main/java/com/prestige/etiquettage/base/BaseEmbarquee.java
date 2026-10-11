package com.prestige.etiquettage.base;

import ch.vorburger.mariadb4j.DB;
import ch.vorburger.mariadb4j.DBConfigurationBuilder;
import java.io.File;
import java.io.IOException;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * MariaDB embarque (MariaDB4j) : rien a installer. Les binaires de MariaDB sont dans l'application ; les donnees vont
 * dans le dossier de l'utilisateur (Windows : %LOCALAPPDATA%\EtiquettagePro\base ; autres : ~/.etiquettage-pro/base) et
 * survivent aux mises a jour. La base n'ecoute que sur le poste, sur un port libre choisi au lancement.
 * <p>
 * Mode choisi par la propriete systeme ou la variable d'environnement {@code ETIQUETTAGE_BASE} : {@code embarquee}
 * (defaut) ou {@code externe} (developpement et tests : spring.datasource.* donnes par la configuration).
 */
public final class BaseEmbarquee {

    public static final String BASE = "bd_etiquette";
    private static DB db;

    private BaseEmbarquee() {
    }

    public static Path dossierDonnees() {
        String surcharge = System.getProperty("etiquettage.donnees", System.getenv("ETIQUETTAGE_DONNEES"));
        if (surcharge != null && !surcharge.isBlank()) {
            return Paths.get(surcharge);
        }
        String local = System.getenv("LOCALAPPDATA");
        if (local != null && !local.isBlank()) {
            return Paths.get(local, "EtiquettagePro");
        }
        return Paths.get(System.getProperty("user.home"), ".etiquettage-pro");
    }

    static String mode() {
        String m = System.getProperty("etiquettage.base", System.getenv("ETIQUETTAGE_BASE"));
        return m == null || m.isBlank() ? "embarquee" : m.trim().toLowerCase();
    }

    /** Demarre la base embarquee (si ce mode est choisi) et donne son adresse a Spring. */
    public static synchronized void demarrerSiDemande() {
        if (!"embarquee".equals(mode()) || db != null) {
            return;
        }
        try {
            Path dossier = dossierDonnees();
            Path temp = Paths.get(System.getProperty("java.io.tmpdir")).toAbsolutePath().normalize();
            if (dossier.toAbsolutePath().normalize().startsWith(temp)) {
                /* MariaDB4j vide les dossiers places dans le dossier temporaire a l'arret : les donnees seraient perdues */
                throw new IllegalStateException("Le dossier de données ne doit pas être dans le dossier temporaire ("
                        + temp + ") : " + dossier);
            }
            Files.createDirectories(dossier);
            int port = portLibre();
            DBConfigurationBuilder c = DBConfigurationBuilder.newBuilder();
            c.setPort(port);
            c.setDataDir(dossier.resolve("base").toString());
            c.setBaseDir(dossier.resolve("mariadb").toString());
            c.setTmpDir(dossier.resolve("tmp").toString());
            /* donnees de l'utilisateur : jamais effacees a l'arret (MariaDB4j efface par defaut ses dossiers) */
            c.setDeletingTemporaryBaseAndDataDirsOnShutdown(false);
            c.addArg("--bind-address=127.0.0.1");
            c.addArg("--character-set-server=utf8mb4");
            c.addArg("--collation-server=utf8mb4_unicode_ci");
            if ("root".equals(System.getProperty("user.name"))) {
                /* poste de developpement Linux lance en root : MariaDB refuse sinon (sans objet sous Windows) */
                c.addArg("--user=root");
            }
            db = DB.newEmbeddedDB(c.build());
            db.start();
            /* base creee par le pilote JDBC (pas par l'outil en ligne de commande de MariaDB) */
            System.setProperty("spring.datasource.url",
                    "jdbc:mariadb://127.0.0.1:" + port + "/" + BASE + "?createDatabaseIfNotExist=true");
            System.setProperty("spring.datasource.username", "root");
            System.setProperty("spring.datasource.password", "");
            Runtime.getRuntime().addShutdownHook(new Thread(BaseEmbarquee::arreter, "arret-base"));
        } catch (Exception e) {
            throw new IllegalStateException("La base embarquée n'a pas pu démarrer : " + e.getMessage(), e);
        }
    }

    public static synchronized void arreter() {
        if (db != null) {
            try {
                db.stop();
            } catch (Exception e) {
                // arret de l'application : rien a faire de plus
            }
            db = null;
        }
    }

    static int portLibre() throws IOException {
        try (ServerSocket s = new ServerSocket(0, 0, java.net.InetAddress.getLoopbackAddress())) {
            return s.getLocalPort();
        }
    }

    /** Pour les tests : le fichier de donnees existe-t-il deja. */
    public static boolean donneesPresentes(File dossier) {
        return new File(dossier, "base").isDirectory();
    }
}
