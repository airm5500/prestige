package rest.service;

import commonTasks.dto.ArticleAnalyseDTO;
import commonTasks.dto.PaireArticleDTO;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;

/** Analyse article : matrice marge x rotation et produits achetes ensemble, sur le perimetre de l'ABC et des gardes. */
@Local
public interface AnalyseArticleService {

    /**
     * Les produits vendus entre les deux dates (incluses), avec leurs ventes, leur stock actuel et leur classe ABC.
     * Aucun quadrant n'est encore affecte : les seuils sont choisis ensuite.
     */
    List<ArticleAnalyseDTO> articles(LocalDate debut, LocalDate fin);

    /**
     * Les paires de produits presents sur les memes tickets de la periode, les plus frequentes d'abord.
     *
     * @param minimum
     *            nombre minimum de tickets en commun pour retenir une paire
     * @param limite
     *            nombre maximum de paires rendues
     */
    List<PaireArticleDTO> paires(LocalDate debut, LocalDate fin, int minimum, int limite);

    /**
     * AUTOUR D'UN PRODUIT (21/09) : les produits les plus souvent achetes avec celui-ci, du plus frequent au moins
     * frequent. Le produit choisi est toujours le produit 1 de chaque paire.
     *
     * @param produitId
     *            l'article autour duquel on regarde
     * @param limite
     *            le nombre de produits voulus - « les 3 produits les plus souvent achetes avec lui »
     */
    List<PaireArticleDTO> pairesAutour(LocalDate debut, LocalDate fin, String produitId, int minimum, int limite);
}
