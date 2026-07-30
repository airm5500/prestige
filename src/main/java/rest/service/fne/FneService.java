package rest.service.fne;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.exception.FneExeception;

/**
 *
 * @author koben
 */
@Local
public interface FneService {

    void createInvoice(String idFacture, TypeInvoice typeInvoice) throws FneExeception;

    void createGroupeInvoice(String idFactures, TypeInvoice typeInvoice);

    /**
     * Certification d'un avoir total (API FNE #2 /refund) : toutes les lignes de la facture certifiee sont retournees
     * avec leurs quantites completes.
     */
    JSONObject createAvoirTotal(String idFacture) throws FneExeception;

    /**
     * Certification d'un avoir partiel : seules les lignes fournies sont retournees. Prevu pour la future gestion des
     * avoirs unitaires ; aucun ecran ne l'utilise pour le moment.
     */
    JSONObject createAvoirPartiel(String idFacture, List<FneAvoirItem> items) throws FneExeception;

    /**
     * Rattachement manuel d'une facture certifiee avant la persistance des identifiants FNE : le JSON de la reponse de
     * certification (ou de la facture FNE avec id + items) est enregistre pour permettre l'avoir.
     */
    JSONObject rattacherFacture(String idFacture, String signResponseJson) throws FneExeception;

    /**
     * Tentative de recuperation automatique des identifiants FNE d'une ancienne facture a partir du token contenu dans
     * son URL de verification (fne_url).
     */
    JSONObject recupererDepuisToken(String idFacture) throws FneExeception;

    /**
     * Releve FNE d'un tiers payant sur une periode : factures certifiees en positif, avoirs certifies en negatif,
     * totaux et solde net. Consultation seule, ne modifie rien.
     */
    JSONObject releveFne(String tiersPayantId, String dtStart, String dtEnd) throws FneExeception;
}
