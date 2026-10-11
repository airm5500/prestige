package com.prestige.etiquettage.base;

import ch.vorburger.mariadb4j.DB;
import ch.vorburger.mariadb4j.DBConfigurationBuilder;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

/**
 * MariaDB embarque (MariaDB4j) : rien a installer. Les binaires de MariaDB sont dans l'application ; les donnees vont
 * dans le dossier de l'utilisateur (Windows : %LOCALAPPDATA%\EtiquettagePro\base ; autres : ~/.etiquettage-pro/base) et
 * survivent aux mises a jour. La base n'ecoute que sur le poste, sur un port libre choisi au lancement.
 * <p>
 * Acces protege par mot de passe : au premier lancement (ou sur une base d'avant cette protection), la base demarre une
 * fois sans controle des droits, le temps de creer l'utilisateur {@value #UTILISATEUR} (droits sur {@value #BASE}
 * seulement), de donner un mot de passe tire au hasard a root et de retirer les comptes anonymes ; les mots de passe
 * sont gardes dans {@value #FICHIER_ACCES}, dans le dossier de donnees de l'utilisateur (lisible par lui seul). Ensuite
 * la base demarre toujours avec le controle des droits.
 * <p>
 * Mode choisi par la propriete systeme ou la variable d'environnement {@code ETIQUETTAGE_BASE} : {@code embarquee}
 * (defaut) ou {@code externe} (developpement et tests : spring.datasource.* donnes par la configuration).
 */
public final class BaseEmbarquee {

    public static final String BASE = "bd_etiquette";
    public static final String UTILISATEUR = "etiquettage";
    public static final String FICHIER_ACCES = "acces-base.properties";
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static BaseEmbarquee instance;

    /** Adresse et compte de connexion a la base demarree. */
    public record Acces(String url, String utilisateur, String motDePasse) {
    }

    private final Path dossier;
    private DB db;

    public BaseEmbarquee(Path dossier) {
        this.dossier = dossier;
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
        if (!"embarquee".equals(mode()) || instance != null) {
            return;
        }
        BaseEmbarquee b = new BaseEmbarquee(dossierDonnees());
        try {
            Acces a = b.demarrer();
            instance = b;
            System.setProperty("spring.datasource.url", a.url());
            System.setProperty("spring.datasource.username", a.utilisateur());
            System.setProperty("spring.datasource.password", a.motDePasse());
            Runtime.getRuntime().addShutdownHook(new Thread(b::arreter, "arret-base"));
        } catch (Exception e) {
            b.arreter();
            throw new IllegalStateException("La base embarquée n'a pas pu démarrer : " + e.getMessage(), e);
        }
    }

    /** Demarre la base (protegee par mot de passe ; protection posee au premier lancement) et rend son acces. */
    public synchronized Acces demarrer() throws Exception {
        Path temp = Paths.get(System.getProperty("java.io.tmpdir")).toAbsolutePath().normalize();
        if (dossier.toAbsolutePath().normalize().startsWith(temp)) {
            /* MariaDB4j vide les dossiers places dans le dossier temporaire a l'arret : les donnees seraient perdues */
            throw new IllegalStateException(
                    "Le dossier de données ne doit pas être dans le dossier temporaire (" + temp + ") : " + dossier);
        }
        Files.createDirectories(dossier);
        Properties acces = lireAcces();
        if (acces == null) {
            acces = proteger();
        }
        int port = lancer(false);
        return new Acces(url(port), UTILISATEUR, acces.getProperty("motDePasse"));
    }

    private static String url(int port) {
        return "jdbc:mariadb://127.0.0.1:" + port + "/" + BASE;
    }

    /** Lance MariaDB ; {@code sansDroits} : sans controle des droits (seulement le temps de poser la protection). */
    private int lancer(boolean sansDroits) throws Exception {
        int port = portLibre();
        DBConfigurationBuilder c = DBConfigurationBuilder.newBuilder();
        c.setPort(port);
        c.setDataDir(dossier.resolve("base").toString());
        c.setBaseDir(dossier.resolve("mariadb").toString());
        c.setTmpDir(dossier.resolve("tmp").toString());
        /* donnees de l'utilisateur : jamais effacees a l'arret (MariaDB4j efface par defaut ses dossiers) */
        c.setDeletingTemporaryBaseAndDataDirsOnShutdown(false);
        c.setSecurityDisabled(sansDroits);
        c.addArg("--bind-address=127.0.0.1");
        c.addArg("--character-set-server=utf8mb4");
        c.addArg("--collation-server=utf8mb4_unicode_ci");
        if ("root".equals(System.getProperty("user.name"))) {
            /* poste de developpement Linux lance en root : MariaDB refuse sinon (sans objet sous Windows) */
            c.addArg("--user=root");
        }
        db = DB.newEmbeddedDB(c.build());
        db.start();
        return port;
    }

    /**
     * Pose la protection : base sans controle des droits le temps de creer l'utilisateur de l'application et de
     * donner un mot de passe a root, puis arret. Le fichier d'acces n'est ecrit qu'une fois tout pose : une coupure
     * avant lui ne laisse aucun fichier, et la protection est refaite au lancement suivant (sans controle des droits,
     * donc meme si root a deja recu un mot de passe).
     */
    private Properties proteger() throws Exception {
        Properties p = new Properties();
        p.setProperty("utilisateur", UTILISATEUR);
        p.setProperty("motDePasse", tirer(24));
        p.setProperty("root", tirer(24));
        int port = lancer(true);
        try (Connection c = DriverManager.getConnection("jdbc:mariadb://127.0.0.1:" + port + "/", "root", "");
                Statement s = c.createStatement()) {
            /* les tables des droits sont chargees : la gestion des comptes redevient possible */
            s.execute("FLUSH PRIVILEGES");
            s.execute("CREATE DATABASE IF NOT EXISTS " + BASE + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            List<String[]> comptes = new ArrayList<>();
            try (ResultSet r = s.executeQuery("SELECT User, Host FROM mysql.user")) {
                while (r.next()) {
                    comptes.add(new String[] { r.getString(1), r.getString(2) });
                }
            }
            for (String[] u : comptes) {
                String compte = "'" + u[0].replace("'", "''") + "'@'" + u[1].replace("'", "''") + "'";
                if (u[0].isEmpty() || UTILISATEUR.equals(u[0])) {
                    s.execute("DROP USER IF EXISTS " + compte);
                } else if ("root".equals(u[0])) {
                    s.execute("ALTER USER " + compte + " IDENTIFIED BY '" + p.getProperty("root") + "'");
                }
            }
            for (String hote : new String[] { "127.0.0.1", "localhost" }) {
                s.execute("CREATE USER '" + UTILISATEUR + "'@'" + hote + "' IDENTIFIED BY '"
                        + p.getProperty("motDePasse") + "'");
                s.execute("GRANT ALL PRIVILEGES ON " + BASE + ".* TO '" + UTILISATEUR + "'@'" + hote + "'");
            }
            s.execute("FLUSH PRIVILEGES");
        } catch (SQLException e) {
            throw new IllegalStateException("protection de la base impossible : " + e.getMessage(), e);
        } finally {
            arreter();
        }
        ecrireAcces(p);
        return p;
    }

    private Path fichierAcces() {
        return dossier.resolve(FICHIER_ACCES);
    }

    private Properties lireAcces() throws IOException {
        Path f = fichierAcces();
        if (!Files.isRegularFile(f)) {
            return null;
        }
        Properties p = new Properties();
        try (InputStream in = Files.newInputStream(f)) {
            p.load(in);
        }
        String m = p.getProperty("motDePasse");
        return m == null || m.isBlank() ? null : p;
    }

    /** Fichier lisible par l'utilisateur seul (Windows : dossier %LOCALAPPDATA%, deja propre a l'utilisateur). */
    private void ecrireAcces(Properties p) throws IOException {
        Path f = fichierAcces();
        Path t = f.resolveSibling(FICHIER_ACCES + ".tmp");
        Files.deleteIfExists(t);
        if (FileSystems.getDefault().supportedFileAttributeViews().contains("posix")) {
            Files.createFile(t, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        } else {
            Files.createFile(t);
        }
        try (OutputStream out = Files.newOutputStream(t)) {
            p.store(out, "Etiquettage Pro : acces a la base embarquee (ne pas diffuser)");
        }
        Files.move(t, f, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    static String tirer(int n) {
        SecureRandom r = new SecureRandom();
        StringBuilder b = new StringBuilder(n);
        for (int i = 0; i < n; i++) {
            b.append(ALPHABET.charAt(r.nextInt(ALPHABET.length())));
        }
        return b.toString();
    }

    public synchronized void arreter() {
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
}
