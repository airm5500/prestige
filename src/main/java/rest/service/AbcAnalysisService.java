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

    /** Liste les classes ABC parametrables (A/B/C) pour l'ecran de configuration. */
    JSONObject listClasses();

    /**
     * Met a jour les parametres d'une classe ABC (Q1, Q2, Q3, unite, bornes de
     * cumul, statut). Les valeurs nulles ne sont pas modifiees.
     */
    JSONObject updateClasse(String id, Integer q1, Integer q2, Integer q3, String unite, Double seuilMin,
            Double seuilMax, String statut);

    /** Export Excel du resultat filtre courant (memes filtres que la grille, sans pagination). */
    byte[] buildExcel(String dtStart, String dtEnd, String type, String classe, String search, String codeFamille,
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax);

    /** Export CSV du resultat filtre courant. */
    byte[] buildCsv(String dtStart, String dtEnd, String type, String classe, String search, String codeFamille,
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax);

    /** Impression PDF (tableau) du resultat filtre courant. */
    byte[] buildPdf(String dtStart, String dtEnd, String type, String classe, String search, String codeFamille,
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax);

    /** Cree un inventaire a partir de TOUT le resultat filtre courant. */
    JSONObject createInventaire(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax);

    /** Cree des suggestions de commande (groupees par grossiste) a partir du resultat filtre. */
    JSONObject createSuggestion(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax);

    /**
     * Detail de consommation mensuelle d'un produit (equivalent boite) : mois
     * courant + N-1 mois precedents, consolide detail -> parent.
     */
    JSONObject produitConso(String produitId, int months);

    /**
     * Evolution mensuelle des classes (mode FIXED) sur la periode : classes
     * figees sur toute la periode, puis indicateur (CA/QTY/MARGE/COUNT) agrege
     * par mois et par classe.
     */
    JSONObject evolution(String dtStart, String dtEnd, String type, String indicator, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax);

    /**
     * Reclassification automatique mensuelle : si activee (ABC_AUTO_RECLASS=1) et
     * non deja faite ce mois (parametre ABC_LAST_RECLASS_DATE), classe la pharmacie
     * entiere sur les N derniers mois (ABC_RECLASS_NB_MOIS) puis applique aux fiches.
     * Idempotent : ne fait rien si deja execute le mois courant.
     */
    JSONObject autoReclassifyIfDue();
}
