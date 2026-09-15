package rest.service.impl;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Singleton;

/**
 * Depot temporaire du fichier d'import de clients, entre l'analyse de ses colonnes et l'ecriture.
 *
 * <p>
 * L'import se fait en trois etapes : lire les colonnes, designer lesquelles portent quoi et controler, puis ecrire.
 * Faire renvoyer le fichier a chaque etape obligerait l'operateur a le choisir trois fois - le navigateur vide le champ
 * apres chaque envoi - et ferait relire le meme contenu trois fois. Le fichier est donc lu UNE fois, garde ici quelques
 * minutes sous un jeton, et les deux etapes suivantes ne transportent plus que ce jeton.
 * </p>
 *
 * <p>
 * Le depot est lie a l'operateur qui l'a cree : un jeton ne sert a personne d'autre. Il est borne en nombre et en
 * duree, de sorte qu'un import abandonne en cours de route ne laisse rien derriere lui.
 * </p>
 */
@Singleton
public class ImportClientDepot {

    private static final Logger LOG = Logger.getLogger(ImportClientDepot.class.getName());

    /** Un import se mene en quelques minutes ; au-dela le fichier est oublie. */
    static final long DUREE_VIE_MS = 30L * 60L * 1000L;

    /** Garde-fou memoire : au-dela, les depots les plus anciens sont oublies d'abord. */
    static final int MAXIMUM = 20;

    /** Contenu lu d'un fichier, tel qu'il a ete depose. */
    public static final class Depot {

        private final String utilisateurId;
        private final String nomFichier;
        private final char separateur;
        private final List<List<String>> lignes;
        private final long depose;

        Depot(String utilisateurId, String nomFichier, char separateur, List<List<String>> lignes, long depose) {
            this.utilisateurId = utilisateurId;
            this.nomFichier = nomFichier;
            this.separateur = separateur;
            this.lignes = lignes;
            this.depose = depose;
        }

        public String getNomFichier() {
            return nomFichier;
        }

        public char getSeparateur() {
            return separateur;
        }

        public List<List<String>> getLignes() {
            return lignes;
        }

        boolean appartientA(String autreUtilisateur) {
            return utilisateurId != null && utilisateurId.equals(autreUtilisateur);
        }

        boolean perime(long maintenant) {
            return maintenant - depose > DUREE_VIE_MS;
        }
    }

    private final Map<String, Depot> depots = new ConcurrentHashMap<>();

    public String deposer(String utilisateurId, String nomFichier, char separateur, List<List<String>> lignes) {
        purger();
        String jeton = UUID.randomUUID().toString();
        depots.put(jeton,
                new Depot(utilisateurId, nomFichier, separateur, new ArrayList<>(lignes), System.currentTimeMillis()));
        return jeton;
    }

    /**
     * Contenu depose sous ce jeton, ou {@code null} si le jeton est inconnu, perime, ou appartient a un autre
     * operateur.
     */
    public Depot lire(String jeton, String utilisateurId) {
        purger();
        if (jeton == null || jeton.isEmpty()) {
            return null;
        }
        Depot depot = depots.get(jeton);
        if (depot == null) {
            return null;
        }
        if (!depot.appartientA(utilisateurId)) {
            LOG.log(Level.WARNING, "import de clients : jeton {0} demande par un autre operateur", jeton);
            return null;
        }
        return depot;
    }

    /** Oublie le depot une fois l'import fait : le fichier n'a plus de raison d'etre garde. */
    public void oublier(String jeton) {
        if (jeton != null) {
            depots.remove(jeton);
        }
    }

    public int nombreDepots() {
        return depots.size();
    }

    private void purger() {
        long maintenant = System.currentTimeMillis();
        Iterator<Map.Entry<String, Depot>> it = depots.entrySet().iterator();
        while (it.hasNext()) {
            if (it.next().getValue().perime(maintenant)) {
                it.remove();
            }
        }
        while (depots.size() >= MAXIMUM) {
            String plusAncien = null;
            long date = Long.MAX_VALUE;
            for (Map.Entry<String, Depot> e : depots.entrySet()) {
                if (e.getValue().depose < date) {
                    date = e.getValue().depose;
                    plusAncien = e.getKey();
                }
            }
            if (plusAncien == null) {
                return;
            }
            depots.remove(plusAncien);
        }
    }
}
