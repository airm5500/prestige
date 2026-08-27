package rest.service;

import commonTasks.dto.DeconditionnementHistoDTO;
import commonTasks.dto.ProduitDetailleDTO;
import java.util.List;
import javax.ejb.Local;

/**
 * Menu Détails : liste des produits détaillés (couples produit principal / produit détail) et historique des
 * déconditionnements.
 */
@Local
public interface DetailsProduitService {

    /**
     * Couples produit principal / produit détail, tries par nom du principal. Un principal detaillable sans detail
     * ACTIF apparait avec ses colonnes detail vides (detail jamais cree, ou desactive).
     *
     * @param recherche
     *            texte cherche (mode « contient ») dans le CIP ou le nom, du principal OU du detail ; vide = tous
     * @param contenance
     *            contenance exacte, 0 pour toutes
     */
    List<ProduitDetailleDTO> produitsDetailles(String recherche, int contenance);

    /**
     * Mouvements de déconditionnement, du plus recent au plus ancien : une ligne par acte, portee par le mouvement du
     * produit principal (stocks avant/apres), completee du produit detail et de l'operateur.
     *
     * @param dtStart
     *            debut de periode (yyyy-MM-dd), vide = depuis toujours
     * @param dtEnd
     *            fin de periode (yyyy-MM-dd), vide = jusqu'a aujourd'hui
     * @param recherche
     *            texte cherche (mode « contient ») dans le produit chapeau, le detail ou l'operateur ; vide = tous
     */
    List<DeconditionnementHistoDTO> historique(String dtStart, String dtEnd, String recherche);
}
