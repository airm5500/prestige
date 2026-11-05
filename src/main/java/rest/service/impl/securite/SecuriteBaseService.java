package rest.service.impl.securite;

import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.sql.DataSource;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.sauvegarde.PoolMariaDb;
import rest.service.impl.serveur.ApplicationPayara;
import rest.service.impl.serveur.Asadmin;

/**
 * ONGLET « SECURITE » du Centre de support (cas 4, lot 4.B), derriere KEY_SECURITE_BASE = 1 et le super administrateur
 * :
 * <ul>
 * <li>{@link #etat()} : ou vit le mot de passe de la base et sous quelle forme (pool en clair ou alias Payara,
 * sauvegarde sur compte dedie ou par domain.xml), date de la derniere rotation et rappel a 6 mois (Q4.6), copies
 * domain.xml.avant-prestige-* qui contiennent encore un mot de passe en clair, journal des actions ;</li>
 * <li>{@link #rotation} : rotation transactionnelle (S1) avec un compte MariaDB de rotation saisi pour l'occasion et
 * jamais garde (Q4.2) ; mot de passe genere ici ou saisi, jamais journalise ni renvoye ;</li>
 * <li>{@link #alias} : alias Payara {@link #ALIAS} pose sur le pool (S2) ; {@link #purgerCopies} ;</li>
 * <li>apres une rotation ou une pose d'alias reussies, le domaine Payara redemarre (lance detache) : voir
 * {@link #verifierPool} pour la raison ; un retour arriere, lui, n'en a pas besoin ;</li>
 * <li>{@link #verifierMotDePasseSession} : second facteur de Q4.1, avec un frein apres cinq refus.</li>
 * </ul>
 * Les ordres a Payara passent par asadmin ({@link Asadmin}), la seule exception a la liste fermee etant la propriete
 * password du pool ({@link ApplicationPayara#motDePassePool}). Une valeur de mot de passe ne va que dans l'ordre ALTER
 * USER, l'argument d'asadmin set (pool en clair) ou un fichier prive lu par asadmin puis supprime (alias) : jamais dans
 * un journal, une reponse ou une exception.
 */
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.CONTAINER)
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class SecuriteBaseService {

    private static final Logger LOG = Logger.getLogger(SecuriteBaseService.class.getName());
    public static final String ALIAS = "prestige-db";
    public static final String CLE_DERNIERE_ROTATION = "KEY_SECURITE_DERNIERE_ROTATION";
    /** Dossier ou chercher les copies domain.xml.avant-prestige-* (diagnostic, essais) ; absent : config du domaine. */
    public static final String CLE_DOSSIER_COPIES = "KEY_SECURITE_DOSSIER_COPIES";
    public static final String PREFIXE_COPIE = "domain.xml.avant-prestige-";
    public static final int RAPPEL_MOIS = 6;
    static final int REFUS_MAX = 5;
    static final long FREIN_MS = 5 * 60 * 1000L;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    @Resource(mappedName = PoolMariaDb.JNDI)
    private DataSource ds;

    private final SecureRandom alea = new SecureRandom();
    /** login -> {refus, instant du dernier refus} */
    private final ConcurrentHashMap<String, long[]> refus = new ConcurrentHashMap<>();

    /* ============================================================================================ parametres */

    public boolean actif() {
        return IdentifiantsBaseService.actif(ds);
    }

    String parametre(String cle) {
        try (Connection c = ds.getConnection();
                PreparedStatement ps = c.prepareStatement("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?")) {
            ps.setString(1, cle);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? StringUtils.trimToNull(rs.getString(1)) : null;
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, cle, e);
            return null;
        }
    }

    void parametre(String cle, String valeur, String description) {
        try (Connection c = ds.getConnection(); PreparedStatement ps = c
                .prepareStatement("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION,"
                        + " str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES (?, ?, ?, 'SYSTEME', 'enable', NOW(), NOW())"
                        + " ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE), dt_UPDATED = NOW()")) {
            ps.setString(1, cle);
            ps.setString(2, valeur);
            ps.setString(3, description);
            ps.executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "parametre " + cle + " non enregistre", e);
        }
    }

    /* ============================================================================================ journal */

    /** Ligne du journal de securite (jamais une valeur) ; en plus de server.log, sans detail. */
    @Lock(LockType.READ)
    public void journaliser(String login, String action, String resultat, String detail) {
        String d = StringUtils.abbreviate(StringUtils.defaultString(detail), 1000);
        LOG.log(Level.INFO, "Sécurité de la base : {0} par {1} : {2}", new Object[] { action, login, resultat });
        try (Connection c = ds.getConnection();
                PreparedStatement ps = c
                        .prepareStatement("INSERT INTO t_securite_journal (dt_DATE, str_LOGIN, str_ACTION,"
                                + " str_RESULTAT, str_DETAIL) VALUES (NOW(), ?, ?, ?, ?)")) {
            ps.setString(1, StringUtils.abbreviate(StringUtils.defaultString(login), 100));
            ps.setString(2, action);
            ps.setString(3, resultat);
            ps.setString(4, d);
            ps.executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "journal de sécurité indisponible (" + action + ", " + resultat + ")", e);
        }
    }

    JSONArray journal(int n) {
        JSONArray a = new JSONArray();
        try (Connection c = ds.getConnection();
                PreparedStatement ps = c
                        .prepareStatement("SELECT dt_DATE, str_LOGIN, str_ACTION, str_RESULTAT, str_DETAIL"
                                + " FROM t_securite_journal ORDER BY id DESC LIMIT ?")) {
            ps.setInt(1, n);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    a.put(new JSONObject()
                            .put("date", String.valueOf(rs.getTimestamp(1)).replaceFirst("(:\\d\\d)\\.\\d+$", "$1"))
                            .put("login", rs.getString(2)).put("action", rs.getString(3))
                            .put("resultat", rs.getString(4))
                            .put("detail", StringUtils.defaultString(rs.getString(5))));
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "journal", e);
        }
        return a;
    }

    /* ============================================================================================ second facteur */

    /**
     * Q4.1 : le super administrateur re-saisit son mot de passe de session. Compare le condense (meme hachage que la
     * connexion) a temps constant ; apres {@link #REFUS_MAX} refus, toute verification est refusee pendant
     * {@link #FREIN_MS}. Message d'erreur, ou null si le mot de passe est juste.
     */
    @Lock(LockType.READ)
    public String verifierMotDePasseSession(String login, String condenseAttendu, String saisi) {
        String l = StringUtils.defaultString(login);
        long[] r = refus.get(l);
        long maintenant = System.currentTimeMillis();
        if (r != null && r[0] >= REFUS_MAX && maintenant - r[1] < FREIN_MS) {
            return "Trop de refus : réessayez dans " + Math.max(1, (FREIN_MS - (maintenant - r[1])) / 60000 + 1)
                    + " min.";
        }
        boolean juste = false;
        if (StringUtils.isNotEmpty(saisi) && StringUtils.isNotEmpty(condenseAttendu)) {
            String condense = toolkits.security.Md5.encode(saisi);
            juste = condense != null && MessageDigest.isEqual(condense.getBytes(StandardCharsets.UTF_8),
                    condenseAttendu.getBytes(StandardCharsets.UTF_8));
        }
        if (juste) {
            refus.remove(l);
            return null;
        }
        long[] n = r == null || maintenant - r[1] >= FREIN_MS ? new long[] { 0, 0 } : r;
        n[0]++;
        n[1] = maintenant;
        refus.put(l, n);
        return "Votre mot de passe Prestige est incorrect.";
    }

    /* ============================================================================================ etat */

    static Path domaineXml() {
        String r = System.getProperty("com.sun.aas.instanceRoot");
        return r == null ? null : Paths.get(r, "config", "domain.xml");
    }

    Path dossierCopies() {
        String p = parametre(CLE_DOSSIER_COPIES);
        if (StringUtils.isNotBlank(p)) {
            return Paths.get(p.trim());
        }
        Path x = domaineXml();
        return x == null ? null : x.getParent();
    }

    /**
     * Copies domain.xml.avant-prestige-* du dossier, et pour chacune si elle porte un mot de passe de pool en clair.
     */
    List<Object[]> copies() {
        List<Object[]> l = new ArrayList<>();
        Path d = dossierCopies();
        if (d == null || !Files.isDirectory(d)) {
            return l;
        }
        try (DirectoryStream<Path> s = Files.newDirectoryStream(d, PREFIXE_COPIE + "*")) {
            for (Path f : s) {
                if (!Files.isRegularFile(f)) {
                    continue;
                }
                boolean enClair = false;
                try {
                    PoolMariaDb p = PoolMariaDb.lire(new String(Files.readAllBytes(f), StandardCharsets.UTF_8));
                    enClair = p != null && !p.motDePasse.isEmpty() && p.alias() == null;
                } catch (Exception e) {
                    LOG.log(Level.FINE, "copie illisible", e);
                }
                l.add(new Object[] { f, enClair });
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "copies", e);
        }
        l.sort((a, b) -> ((Path) a[0]).getFileName().toString().compareTo(((Path) b[0]).getFileName().toString()));
        return l;
    }

    /**
     * Pool lu dans domain.xml. Payara reecrit le fichier peu apres un « set » : une lecture pendant l'ecriture donne un
     * pool vide ou absent ; trois essais a 400 ms.
     */
    PoolMariaDb pool() {
        Path x = domaineXml();
        if (x == null) {
            return null;
        }
        PoolMariaDb p = null;
        for (int i = 0; i < 3; i++) {
            try {
                p = Files.isRegularFile(x) ? PoolMariaDb.lire(new String(Files.readAllBytes(x), StandardCharsets.UTF_8))
                        : null;
                if (p != null && !p.motDePasse.isEmpty()) {
                    return p;
                }
                Thread.sleep(400);
            } catch (Exception e) {
                LOG.log(Level.FINE, "domain.xml", e);
            }
        }
        return p;
    }

    private String xml() throws java.io.IOException {
        return new String(Files.readAllBytes(domaineXml()), StandardCharsets.UTF_8);
    }

    private int portAdmin(String xml) {
        return ApplicationPayara.domaine(System.getProperty("com.sun.aas.instanceRoot"), xml).portAdmin;
    }

    @Lock(LockType.READ)
    public JSONObject etat() {
        JSONObject o = new JSONObject();
        boolean actif = actif();
        o.put("actif", actif);
        if (!actif) {
            return o;
        }
        PoolMariaDb p = pool();
        JSONObject pool = new JSONObject();
        String nomPool = "laborex_pool";
        try {
            nomPool = PoolMariaDb.nomPool(xml());
        } catch (Exception e) {
            LOG.log(Level.FINE, "domain.xml", e);
        }
        pool.put("nom", nomPool);
        if (p == null) {
            pool.put("forme", "INCONNU");
        } else {
            pool.put("utilisateur", p.utilisateur).put("hote", p.hote).put("port", p.port).put("base", p.base)
                    .put("forme", p.motDePasse.isEmpty() ? "INCONNU" : p.alias() != null ? "ALIAS" : "CLAIR")
                    .put("alias", p.alias() == null ? JSONObject.NULL : p.alias());
        }
        o.put("pool", pool);
        /* sauvegarde : compte dedie (lot 4.A) ou domain.xml */
        Path f = IdentifiantsBaseService.fichier(parametre(IdentifiantsBaseService.CLE_FICHIER));
        boolean present = Files.isRegularFile(f), chiffre = false;
        if (present) {
            try {
                chiffre = !new String(Files.readAllBytes(f), StandardCharsets.UTF_8).stripLeading()
                        .startsWith("[client]");
            } catch (Exception e) {
                LOG.log(Level.FINE, "fichier des identifiants", e);
            }
        }
        o.put("sauvegarde", new JSONObject().put("mode", "COMPTE_DEDIE").put("fichier", f.toString())
                .put("present", present).put("chiffre", chiffre));
        o.put("anciensEcrans", "POOL");
        /* copies de domain.xml */
        JSONArray noms = new JSONArray();
        int enClair = 0;
        List<Object[]> copies = copies();
        for (Object[] c : copies) {
            noms.put(((Path) c[0]).getFileName().toString());
            enClair += (Boolean) c[1] ? 1 : 0;
        }
        Path dossier = dossierCopies();
        o.put("copies", new JSONObject().put("dossier", dossier == null ? "" : dossier.toString())
                .put("nombre", copies.size()).put("enClair", enClair).put("fichiers", noms));
        /* rotation */
        String derniere = parametre(CLE_DERNIERE_ROTATION);
        o.put("derniereRotation", derniere == null ? JSONObject.NULL : derniere);
        boolean rappel = true;
        String prochaine = "";
        if (derniere != null) {
            try {
                LocalDateTime d = LocalDateTime.parse(derniere, DATE);
                prochaine = d.plusMonths(RAPPEL_MOIS).format(DATE).substring(0, 10);
                rappel = d.plusMonths(RAPPEL_MOIS).isBefore(LocalDateTime.now());
            } catch (Exception e) {
                LOG.log(Level.FINE, "date de rotation", e);
            }
        }
        o.put("rappel", rappel).put("prochaine", prochaine).put("rappelMois", RAPPEL_MOIS);
        String par = "";
        JSONArray j = journal(50);
        for (int i = 0; i < j.length(); i++) {
            JSONObject l = j.getJSONObject(i);
            if ("ROTATION".equals(l.getString("action")) && "OK".equals(l.getString("resultat"))) {
                par = l.getString("login");
                break;
            }
        }
        o.put("derniereRotationPar", par);
        o.put("journal", j);
        o.put("asadmin", Asadmin.chemin() != null);
        o.put("alias", ALIAS);
        String domaine = domaineXml() == null ? "domain1"
                : domaineXml().getParent().getParent().getFileName().toString();
        o.put("masterPasswordCommande", "asadmin change-master-password --savemasterpassword=true " + domaine);
        return o;
    }

    /* ============================================================================================ rotation */

    /** Demande de rotation (les valeurs ne vivent que le temps de l'appel). */
    public static final class Demande {
        public String compteRotation, motDePasseRotation, mode, nouveau, confirmation, login;
    }

    /** Etapes reelles de la rotation ou de la pose d'alias sur ce serveur. */
    private final class Reel implements RotationMotDePasse.Etapes {
        final PoolMariaDb p;
        final String nomPool, hoteCompte, compteRotation, motDePasseRotation, ancienPayara;
        final int portAdmin;
        final boolean parAlias;
        /** Derniere valeur posee cote Payara (alias) : verifiee en direct, l'alias n'etant relu qu'au redemarrage. */
        private String valeurPosee;

        Reel(PoolMariaDb p, String nomPool, int portAdmin, String hoteCompte, String compteRotation,
                String motDePasseRotation) {
            this.p = p;
            this.nomPool = nomPool;
            this.portAdmin = portAdmin;
            this.hoteCompte = hoteCompte;
            this.compteRotation = compteRotation;
            this.motDePasseRotation = motDePasseRotation;
            this.parAlias = p.alias() != null;
            this.ancienPayara = p.motDePasse;
        }

        Connection rotation() throws Exception {
            return connexionDirecte(p, compteRotation, motDePasseRotation);
        }

        @Override
        public void alterUser(String motDePasse) throws Exception {
            String ordre = MotDePasseBase.ordreAlterUser(p.utilisateur, hoteCompte, motDePasse);
            try (Connection c = rotation(); Statement s = c.createStatement()) {
                s.execute(ordre);
            } catch (java.sql.SQLException e) {
                throw new IllegalStateException("ALTER USER refusé par MariaDB : " + RotationMotDePasse.cause(e));
            }
        }

        @Override
        public void majPayara(String motDePasse) throws Exception {
            if (parAlias) {
                aliasPayara(portAdmin, "update-password-alias", p.alias(), motDePasse);
            } else {
                set(portAdmin, nomPool, motDePasse);
            }
            valeurPosee = motDePasse;
        }

        /**
         * Pool en clair : ping-connection-pool (Payara ouvre une connexion neuve avec la propriete du moment, voir
         * {@link #verifierPool}). Alias : la valeur de l'alias n'est relue qu'au redemarrage (le ping se connecterait
         * avec l'ancienne valeur), donc connexion directe au serveur MariaDB avec le compte du pool et la valeur posee
         * dans l'alias : MariaDB l'accepte, et asadmin a confirme la mise a jour de l'alias.
         */
        @Override
        public void tester() throws Exception {
            if (parAlias) {
                try (Connection c = connexionDirecte(p, p.utilisateur, valeurPosee)) {
                    c.isValid(5);
                }
            } else {
                verifierPool(portAdmin, nomPool);
            }
        }

        /** Idempotent ; l'etape de test qui suit dira si l'ancien mot de passe repond. */
        @Override
        public void retablirPayara() throws Exception {
            if (parAlias) {
                throw new IllegalStateException("l'ancienne valeur de l'alias n'est pas connue");
            }
            set(portAdmin, nomPool, ancienPayara);
        }
    }

    /** Connexion directe au serveur MariaDB du pool (pas de base), identifiants en proprietes : jamais dans l'URL. */
    static Connection connexionDirecte(PoolMariaDb p, String utilisateur, String motDePasse) throws Exception {
        Properties pr = new Properties();
        pr.setProperty("user", utilisateur);
        pr.setProperty("password", motDePasse);
        pr.setProperty("connectTimeout", "10000");
        pr.setProperty("socketTimeout", "60000");
        String url = "jdbc:mysql://" + p.hote + ":" + p.port + "/";
        try {
            return DriverManager.getConnection(url, pr);
        } catch (java.sql.SQLException e) {
            if (String.valueOf(e.getMessage()).contains("No suitable driver")) {
                Class.forName("com.mysql.jdbc.Driver");
                return DriverManager.getConnection(url, pr);
            }
            throw new IllegalStateException("Connexion au serveur MariaDB refusée : " + RotationMotDePasse.cause(e));
        }
    }

    /** asadmin set de la propriete password du pool (exception controlee a la liste fermee). */
    static void set(int portAdmin, String nomPool, String valeur) throws Exception {
        List<String> a = ApplicationPayara.motDePassePool(nomPool, valeur);
        Asadmin.commande(portAdmin, 120, a.toArray(new String[0]));
    }

    /** create-password-alias ou update-password-alias, valeur dans un fichier prive lu par asadmin puis supprime. */
    static void aliasPayara(int portAdmin, String sousCommande, String alias, String valeur) throws Exception {
        if (!MotDePasseBase.nomAdmis(alias)) {
            throw new IllegalArgumentException("Nom d'alias non admis.");
        }
        Path f = FichierPrive.creer("prestige-alias", ".txt");
        try {
            Files.write(f,
                    ("AS_ADMIN_ALIASPASSWORD=" + valeur.replace("\\", "\\\\") + "\n").getBytes(StandardCharsets.UTF_8));
            /* --passwordfile est une option de l'utilitaire : avant la sous-commande */
            Asadmin.commande(portAdmin, 120, "--passwordfile", f.toAbsolutePath().toString(), sousCommande, alias);
        } finally {
            Files.deleteIfExists(f);
        }
    }

    /**
     * Verification par asadmin ping-connection-pool : Payara ouvre une connexion neuve avec la configuration du moment
     * (propriete du pool, alias relu) ; echoue si MariaDB refuse le compte. C'est la seule verification possible avant
     * le redemarrage : apres un « set » sur une propriete du pool, Payara recree le pool, mais les objets DataSource
     * que l'application tient depuis son demarrage (unites JPA, EJB) gardent l'ancienne fabrique et echouent (RAR7099
     * puis « No password credential found » dans server.log) tant que le domaine n'a pas redemarre. Constate sur Payara
     * 5.2022.5 : ni flush-connection-pool, ni la bascule de la ressource JDBC, ni la propriete
     * dynamic-reconfiguration-wait-timeout-in-seconds n'y changent rien ; seul un retour aux valeurs du demarrage remet
     * l'application en service sans redemarrage, ce qui rend le retour arriere immediat.
     */
    static void verifierPool(int portAdmin, String nomPool) throws Exception {
        Asadmin.commande(portAdmin, 120, "ping-connection-pool", nomPool);
    }

    /**
     * Redemarrage du domaine en cours, lance detache (processus cree par WMI, hors de l'arbre de Payara, comme
     * l'application des reglages) apres 3 s : la reponse HTTP part avant. Windows seulement ; false si le lancement
     * echoue (il faut alors redemarrer Payara a la main : la configuration est deja coherente).
     */
    static boolean redemarrerDomaine(String xml) {
        if (!Asadmin.WINDOWS || Asadmin.chemin() == null) {
            return false;
        }
        try {
            ApplicationPayara.Domaine d = ApplicationPayara.domaine(System.getProperty("com.sun.aas.instanceRoot"),
                    xml);
            String horo = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
            Path dossier = FichierPrive.dossier();
            /* scripts et journaux des redemarrages precedents : gardes sept jours */
            try (DirectoryStream<Path> anciens = Files.newDirectoryStream(dossier, "redemarrer-*")) {
                for (Path a : anciens) {
                    if (Files.getLastModifiedTime(a).toMillis() < System.currentTimeMillis() - 7L * 24 * 3600 * 1000) {
                        Files.deleteIfExists(a);
                    }
                }
            } catch (Exception e) {
                LOG.log(Level.FINE, "anciens scripts de redémarrage", e);
            }
            Path bat = dossier.resolve("redemarrer-" + horo + ".bat"),
                    journal = dossier.resolve("redemarrer-" + horo + ".log");
            String fin = "\r\n", sortie = " >> \"" + journal + "\" 2>&1" + fin;
            String script = "@echo off" + fin + "timeout /t 3 /nobreak > NUL" + fin + "echo DEBUT %date% %time%"
                    + sortie + "call \"" + Asadmin.chemin() + "\" --interactive=false restart-domain --domaindir \""
                    + d.dossierDomaines + "\" " + d.nom + sortie + "echo FIN %errorlevel% %date% %time%" + sortie;
            Files.write(bat, script.getBytes(StandardCharsets.ISO_8859_1));
            String ps = ApplicationPayara.commandeLancement(bat.toAbsolutePath().toString());
            Object[] l = Asadmin.executer(
                    java.util.Arrays.asList("powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand",
                            java.util.Base64.getEncoder().encodeToString(ps.getBytes(StandardCharsets.UTF_16LE))),
                    60);
            boolean ok = ApplicationPayara.lance((Integer) l[0], (String) l[1]);
            LOG.log(ok ? Level.INFO : Level.WARNING, "Sécurité de la base : redémarrage du domaine {0} {1}",
                    new Object[] { d.nom,
                            ok ? "lancé" : "NON lancé : " + StringUtils.abbreviate(String.valueOf(l[1]).trim(), 200) });
            return ok;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "redémarrage du domaine non lancé", e);
            return false;
        }
    }

    /** Apres un succes : le redemarrage est lance, et le resultat le dit. */
    private static void redemarrageApres(RotationMotDePasse.Resultat r, String xml) {
        r.redemarrage = redemarrerDomaine(xml);
        r.etapes.add(r.redemarrage ? "Payara redémarre dans quelques secondes (environ une minute)"
                : "Redémarrage de Payara non lancé : redémarrez-le à la main (la configuration est cohérente)");
        r.message += r.redemarrage
                ? " Payara redémarre (environ une minute) : reconnectez-vous ensuite et rouvrez cet onglet."
                : " Redémarrez Payara à la main pour que l'application reprenne le nouveau mot de passe.";
    }

    /** Hote du compte applicatif : CURRENT_USER() par le pool, sinon mysql.user par le compte de rotation. */
    String hoteCompte(PoolMariaDb p, String compteRotation, String motDePasseRotation) {
        try (Connection c = ds.getConnection(); Statement s = c.createStatement();
                ResultSet rs = s.executeQuery("SELECT CURRENT_USER()")) {
            if (rs.next()) {
                String u = rs.getString(1);
                int i = u.indexOf('@');
                if (i > 0 && u.substring(0, i).equals(p.utilisateur)) {
                    return u.substring(i + 1);
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "CURRENT_USER", e);
        }
        try (Connection c = connexionDirecte(p, compteRotation, motDePasseRotation);
                PreparedStatement ps = c.prepareStatement(
                        "SELECT Host FROM mysql.user WHERE User = ? ORDER BY Host = 'localhost' DESC, Host")) {
            ps.setString(1, p.utilisateur);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString(1);
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "mysql.user", e);
        }
        return null;
    }

    /**
     * Rotation complete en un appel. Resultat : succes ou echec avec les etapes, sans aucune valeur. Les champs de la
     * demande sont effaces a la sortie.
     */
    @Lock(LockType.WRITE)
    public RotationMotDePasse.Resultat rotation(Demande d) {
        RotationMotDePasse.Resultat r = new RotationMotDePasse.Resultat();
        String nouveau = null;
        try {
            if (!actif()) {
                return echec(r, "Sécurité de la base inactive (KEY_SECURITE_BASE).");
            }
            if (!MotDePasseBase.nomAdmis(d.compteRotation) || StringUtils.isEmpty(d.motDePasseRotation)) {
                return echec(r, "Compte MariaDB de rotation et son mot de passe sont obligatoires.");
            }
            if ("SAISIR".equals(d.mode)) {
                String m = MotDePasseBase.valider(d.nouveau, d.confirmation);
                if (m != null) {
                    return echec(r, m);
                }
                nouveau = d.nouveau;
            } else if ("GENERER".equals(d.mode)) {
                nouveau = MotDePasseBase.generer(alea);
            } else {
                return echec(r, "Mode inconnu : GENERER ou SAISIR.");
            }
            if (Asadmin.chemin() == null || domaineXml() == null) {
                return echec(r, "asadmin introuvable : la rotation se fait sur le serveur Payara seulement.");
            }
            String xml = xml();
            PoolMariaDb p = PoolMariaDb.lire(xml);
            if (p == null || StringUtils.isBlank(p.utilisateur)) {
                return echec(r, "Pool de la base introuvable dans la configuration de Payara.");
            }
            String nomPool = PoolMariaDb.nomPool(xml);
            int portAdmin = portAdmin(xml);
            /*
             * avant de toucher a quoi que ce soit : asadmin repond, le compte de rotation se connecte, l'hote est connu
             */
            try {
                Asadmin.commande(portAdmin, 120, "get", "resources.jdbc-connection-pool." + nomPool + ".property.user");
            } catch (Exception e) {
                return echec(r,
                        "asadmin ne répond pas sans mot de passe d'administration : " + RotationMotDePasse.cause(e));
            }
            try (Connection c = connexionDirecte(p, d.compteRotation, d.motDePasseRotation)) {
                c.isValid(5);
            } catch (Exception e) {
                return echec(r, "Le compte de rotation ne se connecte pas : " + RotationMotDePasse.cause(e));
            }
            String hote = hoteCompte(p, d.compteRotation, d.motDePasseRotation);
            if (hote == null) {
                return echec(r,
                        "Hôte du compte applicatif '" + p.utilisateur + "' introuvable (CURRENT_USER, mysql.user).");
            }
            if (nouveau.equals(p.alias() == null ? p.motDePasse : "")) {
                return echec(r, "Le nouveau mot de passe est identique à l'actuel.");
            }
            Reel e = new Reel(p, nomPool, portAdmin, hote, d.compteRotation, d.motDePasseRotation);
            r = RotationMotDePasse.executer(p.alias() == null ? p.motDePasse : null, nouveau, e);
            r.etapes.add(0, "Compte '" + p.utilisateur + "'@'" + hote + "', pool " + nomPool
                    + (e.parAlias ? " (alias " + p.alias() + ")" : " (mot de passe en clair dans domain.xml)"));
            if (r.ok) {
                parametre(CLE_DERNIERE_ROTATION, LocalDateTime.now().format(DATE),
                        "Sécurité de la base : date de la dernière rotation du mot de passe");
                redemarrageApres(r, xml);
            }
            journaliser(d.login, "ROTATION", r.ok ? "OK" : r.retourArriere ? "RETOUR_ARRIERE" : "ECHEC",
                    ("GENERER".equals(d.mode) ? "mot de passe généré" : "mot de passe saisi") + " ; " + r.detail());
            return r;
        } catch (Exception ex) {
            LOG.log(Level.WARNING, "rotation", ex);
            journaliser(d.login, "ROTATION", "ECHEC", RotationMotDePasse.cause(ex));
            return echec(r, "Rotation impossible : " + RotationMotDePasse.cause(ex));
        } finally {
            d.motDePasseRotation = null;
            d.nouveau = null;
            d.confirmation = null;
            nouveau = null;
        }
    }

    private static RotationMotDePasse.Resultat echec(RotationMotDePasse.Resultat r, String m) {
        r.ok = false;
        r.message = m;
        return r;
    }

    /* ============================================================================================ alias */

    /**
     * Pose l'alias {@link #ALIAS} sur le pool (S2) ; retour arriere sur la valeur en clair si le pool ne repond plus.
     */
    @Lock(LockType.WRITE)
    public RotationMotDePasse.Resultat alias(String login) {
        RotationMotDePasse.Resultat r = new RotationMotDePasse.Resultat();
        try {
            if (!actif()) {
                return echec(r, "Sécurité de la base inactive (KEY_SECURITE_BASE).");
            }
            if (Asadmin.chemin() == null || domaineXml() == null) {
                return echec(r, "asadmin introuvable : l'alias se pose sur le serveur Payara seulement.");
            }
            String xml = xml();
            PoolMariaDb p = PoolMariaDb.lire(xml);
            if (p == null || p.motDePasse.isEmpty()) {
                return echec(r, "Pool de la base ou son mot de passe introuvable dans la configuration de Payara.");
            }
            if (p.alias() != null) {
                return echec(r, "Le mot de passe du pool est déjà protégé par l'alias " + p.alias() + ".");
            }
            String nomPool = PoolMariaDb.nomPool(xml);
            int portAdmin = portAdmin(xml);
            String aliases;
            try {
                aliases = Asadmin.commande(portAdmin, 120, "list-password-aliases");
            } catch (Exception e) {
                return echec(r,
                        "asadmin ne répond pas sans mot de passe d'administration : " + RotationMotDePasse.cause(e));
            }
            boolean existe = java.util.regex.Pattern
                    .compile("(?m)^\\s*" + java.util.regex.Pattern.quote(ALIAS) + "\\s*$").matcher(aliases).find();
            aliasPayara(portAdmin, existe ? "update-password-alias" : "create-password-alias", ALIAS, p.motDePasse);
            r.etapes.add("Alias " + ALIAS + (existe ? " mis à jour" : " créé"));
            try {
                set(portAdmin, nomPool, "${ALIAS=" + ALIAS + "}");
                r.etapes.add("Pool " + nomPool + " : mot de passe remplacé par l'alias");
                verifierPool(portAdmin, nomPool);
                r.etapes.add("Connexion par le pool vérifiée (alias relu)");
                r.ok = true;
                r.message = "Le mot de passe du pool n'est plus en clair dans domain.xml (alias " + ALIAS + ").";
                redemarrageApres(r, xml);
            } catch (Exception e) {
                r.etapes.add("Échec : " + RotationMotDePasse.cause(e));
                try {
                    set(portAdmin, nomPool, p.motDePasse);
                    verifierPool(portAdmin, nomPool);
                    r.etapes.add("Pool rétabli avec la valeur en clair, connexion vérifiée");
                    r.retourArriere = true;
                    r.message = "Alias non posé : le pool est revenu à sa valeur en clair.";
                } catch (Exception ex) {
                    r.etapes.add("Pool non rétabli : " + RotationMotDePasse.cause(ex));
                    r.incoherent = true;
                    r.message = "Alias non posé et pool non rétabli : vérifiez domain.xml (une copie précède chaque application de réglages).";
                }
            }
            journaliser(login, "ALIAS", r.ok ? "OK" : r.retourArriere ? "RETOUR_ARRIERE" : "ECHEC", r.detail());
            return r;
        } catch (Exception ex) {
            LOG.log(Level.WARNING, "alias", ex);
            journaliser(login, "ALIAS", "ECHEC", RotationMotDePasse.cause(ex));
            return echec(r, "Pose de l'alias impossible : " + RotationMotDePasse.cause(ex));
        }
    }

    /* ============================================================================================ copies */

    /** Supprime les copies domain.xml.avant-prestige-* ; {supprimees, restantes}. */
    @Lock(LockType.WRITE)
    public int[] purgerCopies(String login) {
        int ok = 0, ko = 0;
        for (Object[] c : copies()) {
            try {
                Files.delete((Path) c[0]);
                ok++;
            } catch (Exception e) {
                LOG.log(Level.WARNING, "copie non supprimée : " + c[0], e);
                ko++;
            }
        }
        Path d = dossierCopies();
        journaliser(login, "PURGE_COPIES", ko == 0 ? "OK" : "ECHEC",
                ok + " copie(s) supprimée(s)" + (ko > 0 ? ", " + ko + " non supprimée(s)" : "") + " dans " + d);
        return new int[] { ok, ko };
    }
}
