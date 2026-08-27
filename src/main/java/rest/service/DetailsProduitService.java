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
     * Couples produit principal / produit détail, tries par nom du principal. Un principal detaillable sans detail cree
     * apparait avec ses colonnes detail vides, comme sur l'ecran de reference.
     *
     * @param recherchePP
     *            texte cherche (mode « contient ») dans le CIP ou le nom du principal ; vide = tous
     * @param recherchePD
     *            meme chose sur le produit detail
     * @param contenance
     *            contenance exacte, 0 pour toutes
     */
    List<ProduitDetailleDTO> produitsDetailles(String recherchePP, String recherchePD, int contenance);

    /**
     * Mouvements de déconditionnement, du plus recent au plus ancien : une ligne par acte, portee par le mouvement du
     * produit principal (stocks avant/apres), completee du produit detail et de l'operateur.
     *
     * @param dtStart
     *            debut de periode (yyyy-MM-dd), vide = depuis toujours
     * @param dtEnd
     *            fin de periode (yyyy-MM-dd), vide = jusqu'a aujourd'hui
     */
    List<DeconditionnementHistoDTO> historique(String dtStart, String dtEnd);
}
