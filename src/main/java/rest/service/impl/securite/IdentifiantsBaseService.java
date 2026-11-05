package rest.service.impl.securite;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Base64;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.naming.InitialContext;
import javax.sql.DataSource;
import org.apache.commons.lang3.StringUtils;
import com.sun.jna.platform.win32.Crypt32Util;
import com.sun.jna.platform.win32.WinCrypt;
import rest.service.impl.sauvegarde.PoolMariaDb;

/**
 * SECURITE DU STOCKAGE DU MOT DE PASSE DE LA BASE (cas 4, lot 4.A), derriere le parametre {@link #CLE_ACTIF}
 * (KEY_SECURITE_BASE, 0 par defaut : rien ne change).
 * <p>
 * A 1 :
 * <ul>
 * <li>la sauvegarde Java et la valorisation ne lisent plus domain.xml : elles lisent le compte dedie
 * prestige_sauvegarde dans le fichier d'identifiants ({@link #fichier(String)}), ecrit par
 * outils/officine/2-configurer-mariadb.ps1 -CreerCompte et chiffre par DPAPI (Windows, portee machine : seul un
 * programme de ce poste, qui a le droit de lire le fichier, peut le dechiffrer ; une copie emportee est illisible). Le
 * clair n'existe qu'en memoire, puis dans un fichier d'options prive ({@link FichierPrive}) le temps de l'outil ;</li>
 * <li>les anciens ecrans (dal.JdbConnexion) se connectent par le pool JNDI {@link PoolMariaDb#JNDI} : plus d'URL JDBC
 * avec le mot de passe, donc plus de mot de passe dans server.log.</li>
 * </ul>
 * Hors Windows (banc), le fichier peut etre en clair ([client]) s'il n'est lisible que par le compte du serveur. Aucun
 * secret ne sort d'ici : ni dans les messages, ni dans les journaux.
 */
public final class IdentifiantsBaseService {

    private static final Logger LOG = Logger.getLogger(IdentifiantsBaseService.class.getName());
    public static final String CLE_ACTIF = "KEY_SECURITE_BASE";
    public static final String CLE_FICHIER = "KEY_SECURITE_FICHIER_IDENTIFIANTS";
    /** Premiere ligne du fichier chiffre (les lignes « # » sont ignorees, le reste est le bloc DPAPI en base64). */
    public static final String ENTETE = "# Prestige : identifiants de sauvegarde chiffres (DPAPI)";
    static final String DESCRIPTION_DPAPI = "Prestige";
    /** Les anciens ecrans relisent le parametre au plus toutes les 15 s. */
    static final long CACHE_MS = 15_000L;
    private static final boolean WINDOWS = File.separatorChar == '\\';

    private static volatile long actifLuA;
    private static volatile boolean actifCache;

    private IdentifiantsBaseService() {
    }

    /* ============================================================================================ parametre */

    public static boolean actif(DataSource ds) {
        return "1".equals(parametre(ds, CLE_ACTIF));
    }

    /**
     * Pour les anciens ecrans : le parametre lu par le pool JNDI, garde {@link #CACHE_MS} ; false hors Payara ou si la
     * base ne repond pas (l'ecran garde alors son ancien chemin).
     */
    public static boolean actifDepuisPool() {
        long maintenant = System.currentTimeMillis();
        if (maintenant - actifLuA < CACHE_MS) {
            return actifCache;
        }
        DataSource ds = pool();
        boolean actif = ds != null && actif(ds);
        actifCache = actif;
        actifLuA = maintenant;
        return actif;
    }

    /** Oublie la valeur gardee (tests). */
    public static void oublier() {
        actifLuA = 0;
    }

    /** Le pool de Prestige par JNDI ; null hors Payara. */
    public static DataSource pool() {
        try {
            Object o = new InitialContext().lookup(PoolMariaDb.JNDI);
            return o instanceof DataSource ? (DataSource) o : null;
        } catch (Exception e) {
            LOG.log(Level.FINE, "pool JNDI indisponible", e);
            return null;
        }
    }

    private static String parametre(DataSource ds, String cle) {
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

    /* ============================================================================================ fichier */

    /** Chemin du fichier d'identifiants : le parametre s'il est renseigne, sinon {@link #fichierParDefaut()}. */
    public static Path fichier(String parametre) {
        return StringUtils.isBlank(parametre) ? fichierParDefaut() : Paths.get(parametre.trim());
    }

    public static Path fichierParDefaut() {
        if (WINDOWS) {
            String pd = StringUtils.defaultIfBlank(System.getenv("ProgramData"), "C:\\ProgramData");
            return Paths.get(pd, "Prestige", "sauvegarde.cnf");
        }
        return Paths.get("/etc/prestige/sauvegarde.cnf");
    }

    /**
     * Lit le compte de sauvegarde (utilisateur, mot de passe, hote, port ; la base est a renseigner par l'appelant).
     * IllegalStateException, sans aucun secret dans le message, si le fichier manque, n'est pas chiffre, n'est pas
     * dechiffrable par ce compte sur ce poste, ou est incomplet.
     */
    public static PoolMariaDb lire(Path f) {
        if (f == null || !Files.isRegularFile(f)) {
            throw new IllegalStateException("Fichier des identifiants de sauvegarde introuvable : " + f
                    + " (à créer par outils\\officine\\2-configurer-mariadb.ps1 -CreerCompte).");
        }
        String texte;
        try {
            texte = new String(Files.readAllBytes(f), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Fichier des identifiants de sauvegarde illisible : " + f + " ("
                    + e.getClass().getSimpleName() + ") : le compte du serveur doit pouvoir le lire.");
        }
        String clair;
        if (texte.stripLeading().startsWith("[client]")) {
            if (WINDOWS) {
                throw new IllegalStateException("Le fichier des identifiants de sauvegarde " + f
                        + " n'est pas chiffré : lancez outils\\officine\\2-configurer-mariadb.ps1 -Chiffrer.");
            }
            try {
                if (!FichierPrive.estPrive(f)) {
                    throw new IllegalStateException("Le fichier des identifiants de sauvegarde " + f
                            + " est lisible par d'autres comptes : chmod 600.");
                }
            } catch (java.io.IOException e) {
                throw new IllegalStateException("Droits du fichier des identifiants de sauvegarde illisibles : " + f);
            }
            clair = texte;
        } else {
            clair = dechiffrer(texte, f);
        }
        PoolMariaDb p = PoolMariaDb.depuisOptions(clair);
        if (p == null || StringUtils.isBlank(p.utilisateur) || p.motDePasse.isEmpty()) {
            throw new IllegalStateException("Le fichier des identifiants de sauvegarde " + f
                    + " est incomplet (section [client] : user, password, host, port).");
        }
        return p;
    }

    /** Dechiffre le bloc DPAPI (base64, lignes « # » ignorees) ; message sans secret en cas d'echec. */
    static String dechiffrer(String texte, Path f) {
        StringBuilder b64 = new StringBuilder();
        for (String l : texte.split("\\r?\\n")) {
            String t = l.trim();
            if (!t.isEmpty() && !t.startsWith("#")) {
                b64.append(t);
            }
        }
        byte[] bloc;
        try {
            bloc = Base64.getDecoder().decode(b64.toString());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Le fichier des identifiants de sauvegarde " + f
                    + " n'est ni un fichier d'options ni un bloc chiffré par 2-configurer-mariadb.ps1.");
        }
        if (!WINDOWS) {
            throw new IllegalStateException("Le fichier des identifiants de sauvegarde " + f
                    + " est chiffré pour Windows (DPAPI) : sur ce système, mettez un fichier [client] en clair (chmod 600).");
        }
        try {
            byte[] clair = Crypt32Util.cryptUnprotectData(bloc);
            return new String(clair, StandardCharsets.UTF_8);
        } catch (Throwable e) {
            throw new IllegalStateException("Les identifiants de sauvegarde " + f
                    + " ne sont pas déchiffrables par le compte du serveur sur ce poste ("
                    + e.getClass().getSimpleName()
                    + ") : relancez 2-configurer-mariadb.ps1 -CreerCompte sur ce poste.");
        }
    }

    /** Chiffre un fichier d'options (texte [client]) : en-tete puis bloc DPAPI (portee machine) en base64. Windows. */
    public static String chiffrer(String clair) {
        if (!WINDOWS) {
            throw new IllegalStateException("Chiffrement DPAPI disponible sous Windows seulement.");
        }
        byte[] bloc = Crypt32Util.cryptProtectData(clair.getBytes(StandardCharsets.UTF_8), null,
                WinCrypt.CRYPTPROTECT_LOCAL_MACHINE, DESCRIPTION_DPAPI, null);
        return ENTETE + "\r\n" + Base64.getEncoder().encodeToString(bloc) + "\r\n";
    }
}
