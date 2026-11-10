package rest.service.vente;

import dal.TCompteClientTiersPayant;
import dal.TParameters;
import dal.TPreenregistrementCompteClientTiersPayent;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.EntityManager;

/**
 * Retour du 10/11/2026 : « prise en charge totale » d'une ligne de vente assurance. A la caisse, quand le taux d'une
 * assurance est mis a 100 % sur une ligne et que la question est confirmee, cette assurance PASSE EN PREMIER sur la
 * ligne et prend 100 % de sa propre base (son prix de reference si elle en a un, sinon le prix de vente). Les autres
 * suivent dans leur ordre habituel, chacune avec sa part normale bornee a ce qui reste de la ligne ; le client ne paie
 * que ce que personne n'a couvert.
 *
 * <p>
 * Regles pures, sans acces a la base en dehors de {@link #actif(EntityManager)}. Tout passe par le parametre
 * {@code KEY_PRISE_EN_CHARGE_TOTALE} : a 0, la question n'est jamais posee et la marque de la ligne n'est jamais lue
 * par le calcul. La marque (colonne {@code tp_premier_id} de la ligne de vente) vaut pour cette vente seulement : rien
 * n'est ecrit dans les prix de reference de la fiche article. Sans marque, un taux a 100 % garde son sens d'avant
 * (l'assurance complete ce que les precedentes ont laisse) : la marque n'est jamais deduite du taux.
 */
public final class PriseEnChargeTotale {

    public static final String PARAMETRE = "KEY_PRISE_EN_CHARGE_TOTALE";
    public static final String MSG_INACTIF = "La prise en charge totale d'une ligne n'est pas activée (paramètre "
            + PARAMETRE + ").";
    public static final String MSG_DEJA = "%s passe déjà en premier sur cette ligne : une seule assurance par ligne.";

    private PriseEnChargeTotale() {
    }

    /** Le parametre vaut-il 1 ? Toute erreur de lecture vaut 0 : le calcul d'avant s'applique. */
    public static boolean actif(EntityManager em) {
        try {
            TParameters p = em.find(TParameters.class, PARAMETRE);
            return p != null && valeurActive(p.getStrVALUE());
        } catch (RuntimeException e) {
            return false;
        }
    }

    static boolean valeurActive(String valeur) {
        return valeur != null && "1".equals(valeur.trim());
    }

    /**
     * Ordre de passage des organismes d'une vente sur une ligne : indices dans {@code tps} (deja tries par priorite),
     * l'organisme marque en tete s'il est sur la vente. Sans marque : l'ordre de la liste.
     *
     * @param premierCompteId
     *            identifiant du compte client tiers-payant marque sur la ligne, ou null
     */
    public static List<Integer> ordreDePassage(List<TPreenregistrementCompteClientTiersPayent> tps,
            String premierCompteId) {
        List<Integer> ordre = new ArrayList<>();
        int premier = -1;
        for (int t = 0; tps != null && t < tps.size(); t++) {
            TCompteClientTiersPayant c = tps.get(t) == null ? null : tps.get(t).getLgCOMPTECLIENTTIERSPAYANTID();
            if (premier < 0 && premierCompteId != null && c != null
                    && premierCompteId.equals(c.getLgCOMPTECLIENTTIERSPAYANTID())) {
                premier = t;
            } else {
                ordre.add(t);
            }
        }
        if (premier >= 0) {
            ordre.add(0, premier);
        }
        return ordre;
    }

    /**
     * Motif de refus de la marque, ou null si elle peut etre posee.
     *
     * @param dejaMarque
     *            nom de l'assurance deja marquee sur la ligne (null si aucune ou si c'est la meme)
     */
    public static String refus(boolean actif, boolean venteAssurance, boolean cloturee, boolean organismeDeLaVente,
            String dejaMarque) {
        if (!actif) {
            return MSG_INACTIF;
        }
        if (cloturee) {
            return "La vente est déjà clôturée.";
        }
        if (!venteAssurance) {
            return "La prise en charge totale d'une ligne n'existe qu'en vente assurance.";
        }
        if (!organismeDeLaVente) {
            return "Ce tiers-payant n'est pas sur la vente.";
        }
        if (dejaMarque != null) {
            return String.format(MSG_DEJA, dejaMarque);
        }
        return null;
    }
}
