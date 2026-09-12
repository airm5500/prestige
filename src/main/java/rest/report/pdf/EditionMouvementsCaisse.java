package rest.report.pdf;

import rest.service.dto.MvtCaisseModeDTO;
import rest.service.dto.MvtCaisseSummaryDTO;

/**
 * Textes de l'edition des mouvements de caisse (retours des tests du 12/09, point 3), hors servlet pour etre testes
 * sans conteneur.
 */
public final class EditionMouvementsCaisse {

    private EditionMouvementsCaisse() {
    }

    /** Les filtres actifs, rappeles sous le titre : l'etat dit ce qu'il contient. */
    public static String filtresLisibles(String userId, String typeMvtId, boolean checked) {
        StringBuilder sb = new StringBuilder();
        sb.append(checked ? "Mouvements contrôlés" : "Mouvements non contrôlés");
        if (userId != null && !userId.isEmpty() && !"null".equals(userId)) {
            sb.append("  -  utilisateur filtré");
        }
        if (typeMvtId != null && !typeMvtId.isEmpty()) {
            sb.append("  -  type de mouvement filtré");
        }
        return sb.toString();
    }

    /** Le recapitulatif par mode de reglement, sur une ligne. */
    public static String modesLisibles(MvtCaisseSummaryDTO resume) {
        if (resume == null || resume.getModes() == null || resume.getModes().isEmpty()) {
            return "";
        }
        java.text.NumberFormat nf = java.text.NumberFormat.getIntegerInstance(java.util.Locale.FRANCE);
        StringBuilder sb = new StringBuilder("Par mode de règlement : ");
        boolean premier = true;
        for (MvtCaisseModeDTO m : resume.getModes()) {
            if (!premier) {
                sb.append("   |   ");
            }
            premier = false;
            sb.append(m.getModeReglement()).append(" : ").append(nf.format(m.getMontant()));
        }
        return sb.toString();
    }
}
