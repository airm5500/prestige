package rest.service.dto;

import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Plan du 19/11, point 3 : une page de l'analyse par produit, avec les totaux de TOUTE la liste (le pied de la grille
 * ne doit pas additionner la seule page affichee).
 * <p>
 * Regles (PageAnalyseCoherenceTest) : la page est la tranche [start, start + limit[ de la liste ; total = taille de la
 * liste ; totaux = somme de toutes les lignes ; la somme des pages = les totaux ; limit absent ou nul = toute la liste
 * (comportement d'avant, exports et anciens appels).
 */
public final class PageAnalyse {

    private PageAnalyse() {
    }

    public static List<AnalyseTiersPayantDTO> tranche(List<AnalyseTiersPayantDTO> lignes, Integer start,
            Integer limit) {
        if (limit == null || limit <= 0) {
            return lignes;
        }
        int debut = Math.max(0, Math.min(start == null ? 0 : start, lignes.size()));
        int fin = Math.min(lignes.size(), debut + limit);
        return lignes.subList(debut, fin);
    }

    public static JSONObject totaux(List<AnalyseTiersPayantDTO> lignes) {
        long quantite = 0, caTtc = 0, caHt = 0, achat = 0, marge = 0;
        for (AnalyseTiersPayantDTO l : lignes) {
            quantite += l.getQuantite();
            caTtc += l.getCaTtc();
            caHt += l.getCaHt();
            achat += l.getMontantAchat();
            marge += l.getMarge();
        }
        double taux = caHt == 0 ? 0d : Math.round(marge * 10000d / caHt) / 100d;
        return new JSONObject().put("quantite", quantite).put("caTtc", caTtc).put("caHt", caHt)
                .put("montantAchat", achat).put("marge", marge).put("tauxMarge", taux);
    }

    public static JSONObject reponse(List<AnalyseTiersPayantDTO> lignes, Integer start, Integer limit) {
        return new JSONObject().put("total", lignes.size()).put("data", new JSONArray(tranche(lignes, start, limit)))
                .put("totaux", totaux(lignes));
    }
}
