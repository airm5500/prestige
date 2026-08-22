package job;

import java.net.InetAddress;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.lang3.StringUtils;

/**
 * Nom du poste sur lequel tourne CETTE instance de l'application.
 *
 * <p>
 * L'installation type d'une officine compte un serveur d'application PAR POSTE - trois caisses et le serveur en font
 * quatre - chacun autonome, tous puisant dans la meme base. Une alerte du support qui ne dit pas de quel poste elle
 * vient est donc inexploitable : on sait qu'un poste va mal, pas lequel. Pire, les evenements du support etant
 * regroupes par signature, le premier poste a signaler masquerait les trois autres.
 *
 * <p>
 * Le nom retenu combine le nom de machine et le role tenu par l'instance (serveur ou caisse). Il entre dans le code de
 * l'evenement, donc dans sa signature : chaque poste a sa propre ligne et son propre compteur.
 *
 * @author koben
 */
public final class PosteLocal {

    private static final Logger LOG = Logger.getLogger(PosteLocal.class.getName());

    /** Resolu une fois : le nom de machine ne change pas en cours d'execution, et sa lecture peut etre lente. */
    private static volatile String nomMachine;

    private PosteLocal() {
    }

    /**
     * Nom de la machine, ou {@code poste-inconnu} quand le systeme ne sait pas le dire. Ne leve jamais : une
     * surveillance ne doit pas tomber parce qu'elle n'a pas su se nommer.
     */
    public static String nomMachine() {
        if (nomMachine == null) {
            synchronized (PosteLocal.class) {
                if (nomMachine == null) {
                    nomMachine = resoudre();
                }
            }
        }
        return nomMachine;
    }

    private static String resoudre() {
        for (String variable : new String[] { "COMPUTERNAME", "HOSTNAME" }) {
            String valeur = StringUtils.trimToEmpty(System.getenv(variable));
            if (!valeur.isEmpty()) {
                return nettoyer(valeur);
            }
        }
        try {
            return nettoyer(InetAddress.getLocalHost().getHostName());
        } catch (Exception e) {
            LOG.log(Level.FINE, "nomMachine", e);
            return "poste-inconnu";
        }
    }

    /**
     * Identifiant du poste, tel qu'il apparait dans les alertes : {@code machine/role}.
     *
     * @param modeServeur
     *            vrai si cette instance est celle du serveur, faux si c'est une caisse
     */
    public static String identifiant(boolean modeServeur) {
        return nomMachine() + "/" + (modeServeur ? "serveur" : "caisse");
    }

    /**
     * Retient de quoi nommer un poste sans casser la signature d'un evenement : lettres, chiffres, point et tiret. Un
     * nom de machine peut porter des espaces ou des accents, qui n'ont rien a faire dans un identifiant.
     */
    static String nettoyer(String brut) {
        String propre = StringUtils.trimToEmpty(brut).replaceAll("[^A-Za-z0-9.-]", "-").replaceAll("-{2,}", "-");
        propre = StringUtils.strip(propre, "-");
        if (propre.isEmpty()) {
            return "poste-inconnu";
        }
        return StringUtils.abbreviate(propre, 60);
    }
}
