package rest.service;

import javax.ejb.Local;
import rest.service.dto.ReleveGroupeFactureDTO;

/**
 * Releve des factures de groupe (menu Facture de groupe).
 *
 * @author koben
 */
@Local
public interface ReleveGroupeFactureService {

    /**
     * Factures de groupe de la periode, regroupees par groupe de tiers payants.
     *
     * @param dtStart
     *            date de debut au format yyyy-MM-dd (bornes incluses)
     * @param dtEnd
     *            date de fin au format yyyy-MM-dd (bornes incluses)
     * @param idGroupe
     *            groupe selectionne a l'ecran, null ou &lt;= 0 pour tous
     * @param search
     *            texte de recherche saisi a l'ecran (nom du groupe ou numero de facture)
     * @param codeFacture
     *            numero de facture de groupe precis, quand l'ecran est ouvert sur une facture
     * @param regroupement
     *            {@link ModeRegroupement#PAR_TIERS_PAYANT} pour rassembler les factures d'un meme organisme sur toute
     *            la periode, {@link ModeRegroupement#PAR_FACTURE_DE_GROUPE} (defaut) pour un bloc par facture de groupe
     *            ; passer la valeur de l'ecran par {@link ModeRegroupement#normaliser(String)}
     */
    ReleveGroupeFactureDTO releve(String dtStart, String dtEnd, Integer idGroupe, String search, String codeFacture,
            String regroupement);
}
