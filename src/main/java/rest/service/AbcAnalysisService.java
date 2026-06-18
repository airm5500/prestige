package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import commonTasks.dto.AbcProduitDTO;

/**
 * Service de classification ABC des produits (Lot 1).
 *
 * Independant du 20/80 : il s'appuie sur les procedures analyse_abc_par_*
 * (toutes les classes A/B/C, sans coupe a 80%) et applique cote Java les
 * filtres souples (classe, stock, recherche), le tri et la pagination.
 */
@Local
public interface AbcAnalysisService {

    /**
     * Classification brute (toutes lignes A/B/C) pour la periode et les filtres
     * de niveau procedure (famille / rayon / grossiste).
     */
    List<AbcProduitDTO> classify(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste);

    /**
     * Grille paginee : classification + filtres Java (classe, stock, recherche),
     * tri, pagination et resume par classe.
     */
    JSONObject grid(String dtStart, String dtEnd, String type, String classe, String search, String codeFamille,
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax, int start,
            int limit, String sort, String dir);

    /**
     * Recalcule la classification et renvoie uniquement le resume par classe
     * (sans ecriture sur les fiches articles).
     */
    JSONObject recalculate(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste);

    /**
     * Applique officiellement les classes calculees sur t_famille
     * (lg_CLASSE_ABC_ID + dt_UPDATED_CLASSE_ABC). Renvoie le nombre de produits
     * mis a jour.
     */
    JSONObject apply(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste);
}
