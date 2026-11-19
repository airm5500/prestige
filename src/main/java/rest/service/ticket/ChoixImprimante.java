package rest.service.ticket;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.print.PrintService;

/**
 * Imprimante des tickets (CAISSE11, 16/11) : depuis que Payara tourne en service Windows (rapport d'exploitation du
 * 13/11, point 4), il tourne sous le compte systeme, qui n'a pas d'imprimante par defaut : chaque ticket s'arretait sur
 * « Imprimante inconnue ».
 *
 * <p>
 * Regle : l'imprimante par defaut du serveur si elle existe (comme avant, rien ne change pour un serveur lance a la
 * main) ; sinon la premiere imprimante declaree dans Prestige (table {@code t_imprimante}, dans l'ordre des noms) qui
 * est installee sur le poste ; sinon aucune (le ticket n'est pas imprime, l'ecran le dit).
 * </p>
 */
public final class ChoixImprimante {

    private static final Logger LOG = Logger.getLogger(ChoixImprimante.class.getName());

    private ChoixImprimante() {
    }

    public static PrintService choisir(PrintService parDefaut, PrintService[] installees, List<String> declarees) {
        if (parDefaut != null) {
            return parDefaut;
        }
        if (installees == null || declarees == null) {
            return null;
        }
        for (String nom : declarees) {
            if (nom == null || nom.trim().isEmpty()) {
                continue;
            }
            for (PrintService s : installees) {
                if (s != null && s.getName() != null && s.getName().trim().equalsIgnoreCase(nom.trim())) {
                    return s;
                }
            }
        }
        return null;
    }

    /** Noms des imprimantes declarees dans Prestige (non supprimees), dans l'ordre des noms ; vide si illisible. */
    public static List<String> declarees(EntityManager em) {
        try {
            List<?> l = em
                    .createNativeQuery("SELECT str_NAME FROM t_imprimante WHERE COALESCE(str_STATUT, '') <> 'delete'"
                            + " AND str_NAME IS NOT NULL ORDER BY str_NAME")
                    .getResultList();
            List<String> noms = new ArrayList<>();
            for (Object o : l) {
                noms.add(String.valueOf(o));
            }
            return noms;
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Imprimantes déclarées illisibles", e);
            return Collections.emptyList();
        }
    }
}
