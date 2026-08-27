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
     *            {@link #PAR_TIERS_PAYANT} pour rassembler les factures d'un meme organisme sur toute la periode,
     *            {@link #PAR_FACTURE_DE_GROUPE} (defaut) pour un bloc par facture de groupe
     */
    ReleveGroupeFactureDTO releve(String dtStart, String dtEnd, Integer idGroupe, String search, String codeFacture,
            String regroupement);

    /** Un bloc par facture de groupe : c'est le decoupage de la liste a l'ecran. */
    String PAR_FACTURE_DE_GROUPE = "facture";

    /** Un bloc par organisme, toutes ses factures de la periode rassemblees. */
    String PAR_TIERS_PAYANT = "tierspayant";

    /**
     * Ramene ce que demande l'ecran a l'un des deux modes connus.
     *
     * Tout ce qui n'est pas explicitement "par tiers payant" - valeur absente, vide ou inattendue - reste le decoupage
     * de la liste a l'ecran : une edition doit sortir, jamais echouer sur un parametre mal forme.
     */
    static String normaliser(String demande) {
        return demande != null && PAR_TIERS_PAYANT.equalsIgnoreCase(demande.trim()) ? PAR_TIERS_PAYANT
                : PAR_FACTURE_DE_GROUPE;
    }
}
