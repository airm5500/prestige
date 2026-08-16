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
     */
    ReleveGroupeFactureDTO releve(String dtStart, String dtEnd, Integer idGroupe, String search, String codeFacture);
}
