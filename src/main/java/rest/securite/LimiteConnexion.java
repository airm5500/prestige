package rest.securite;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * Limite des essais de mot de passe (audit du 12/10, constat E2 ; retour du 25/10). Deux compteurs : par identifiant
 * (10 echecs) et par adresse du poste (50 echecs, plusieurs employes partagent un poste). Au seuil, attente de 30 s.
 * L'attente ecoulee, une nouvelle serie complete d'essais est permise (une faute de frappe ne rebloque plus aussitot) ;
 * chaque nouveau blocage double l'attente, 15 min au plus. Une connexion reussie remet tout a zero ; un compteur sans
 * echec depuis 15 min est oublie. En memoire seulement : un redemarrage du serveur remet tout a zero.
 */
public final class LimiteConnexion {

    static final int SEUIL_IDENTIFIANT = 10;
    static final int SEUIL_ADRESSE = 50;
    static final long ATTENTE_INITIALE_MS = 30_000L;
    static final long ATTENTE_MAX_MS = 15 * 60_000L;
    static final long OUBLI_MS = 15 * 60_000L;

    private static final LimiteConnexion INSTANCE = new LimiteConnexion(System::currentTimeMillis);

    static final class Compteur {
        int echecs;
        /* blocages deja subis : chacun double l'attente du suivant */
        int blocages;
        long dernierEchec;
        long bloqueJusqua;
    }

    private final Map<String, Compteur> compteurs = new ConcurrentHashMap<>();
    private final LongSupplier horloge;

    LimiteConnexion(LongSupplier horloge) {
        this.horloge = horloge;
    }

    public static LimiteConnexion instance() {
        return INSTANCE;
    }

    static String cleIdentifiant(String login) {
        return "L:" + (login == null ? "" : login.trim().toLowerCase(Locale.ROOT));
    }

    static String cleAdresse(String ip) {
        return "A:" + (ip == null ? "" : ip);
    }

    /** Secondes d'attente restantes avant un nouvel essai (0 : essai permis). */
    public long attenteSecondes(String login, String ip) {
        long maintenant = horloge.getAsLong();
        long reste = Math.max(reste(cleIdentifiant(login), maintenant), reste(cleAdresse(ip), maintenant));
        return (reste + 999) / 1000;
    }

    private long reste(String cle, long maintenant) {
        Compteur c = compteurs.get(cle);
        return c == null ? 0 : Math.max(0, c.bloqueJusqua - maintenant);
    }

    /** Un echec : compte, et bloque si le seuil est atteint. Renvoie l'attente imposee en secondes (0 si aucune). */
    public long echec(String login, String ip) {
        long maintenant = horloge.getAsLong();
        compter(cleIdentifiant(login), SEUIL_IDENTIFIANT, maintenant);
        compter(cleAdresse(ip), SEUIL_ADRESSE, maintenant);
        oublierAnciens(maintenant);
        return attenteSecondes(login, ip);
    }

    private void compter(String cle, int seuil, long maintenant) {
        compteurs.compute(cle, (k, c) -> {
            if (c == null || maintenant - c.dernierEchec > OUBLI_MS) {
                c = new Compteur();
            }
            /* blocage termine : nouvelle serie d'essais (le nombre de blocages, lui, est garde) */
            if (c.bloqueJusqua > 0 && c.bloqueJusqua <= maintenant) {
                c.echecs = 0;
                c.bloqueJusqua = 0;
            }
            c.echecs++;
            c.dernierEchec = maintenant;
            if (c.echecs >= seuil) {
                int rang = c.blocages++;
                long attente = rang >= 15 ? ATTENTE_MAX_MS : Math.min(ATTENTE_MAX_MS, ATTENTE_INITIALE_MS << rang);
                c.bloqueJusqua = maintenant + attente;
            }
            return c;
        });
    }

    /** Message montre a l'utilisateur, sans dire si l'identifiant existe. */
    public static String message(long secondes) {
        String duree = secondes >= 120 ? ((secondes + 59) / 60) + " min" : secondes + " s";
        return "Trop d'essais de connexion. Réessayez dans " + duree + ".";
    }

    public void succes(String login, String ip) {
        compteurs.remove(cleIdentifiant(login));
        compteurs.remove(cleAdresse(ip));
    }

    private void oublierAnciens(long maintenant) {
        if (compteurs.size() > 1000) {
            compteurs.entrySet().removeIf(
                    e -> maintenant - e.getValue().dernierEchec > OUBLI_MS && e.getValue().bloqueJusqua < maintenant);
        }
    }
}
