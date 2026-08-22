package rest.service;

import java.io.IOException;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.AchatGrossisteMensuelDTO;
import rest.service.dto.EtatControlAnnuelWrapperDTO;
import rest.service.dto.EtatControlBon;
import rest.service.dto.EtatControlBonEditDto;

/**
 *
 * @author koben
 */
@Local
public interface EtatControlBonService {

    List<EtatControlBon> list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId,
            int start, int limit, boolean all, String dateType);

    JSONObject list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId, int start,
            int limit, String dateType);

    EtatControlAnnuelWrapperDTO listBonAnnuel(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId);

    JSONObject listBonAnnuelView(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId);

    JSONObject etatLastThreeYears();

    List<AchatGrossisteMensuelDTO> listAchatsMensuels(String dtStart, String dtEnd, String type);

    JSONObject achatsMensuelsView(String dtStart, String dtEnd, String type);

    JSONObject updateBon(EtatControlBonEditDto bonEdit);

    /**
     * Identifiants des produits portes par les bons de livraison donnes, sans doublon.
     *
     * <p>
     * Un produit livre sur deux bons ne donnera donc qu'une ligne d'inventaire : c'est bien le meme article que l'on
     * recompte une fois.
     *
     * @param bonIds
     *            identifiants des bons de livraison
     *
     * @return les identifiants d'article, ou un ensemble vide si les bons sont introuvables ou sans ligne
     */
    java.util.Set<String> produitsDesBons(List<String> bonIds);

    /**
     * Marque le reglement d'un ou plusieurs bons de livraison.
     *
     * <p>
     * Remplace la page {@code ws_transaction2.jsp} que l'ecran appelait : cette page n'a JAMAIS existe dans le projet,
     * si bien que le reglement n'a jamais rien enregistre. Les quatre colonnes ecrites ici sont celles que la table
     * porte deja pour cet usage : STATUS, date de reglement, montant regle et montant restant.
     *
     * @param bonIds
     *            identifiants des bons a marquer
     * @param statut
     *            {@code NON REGLE}, {@code REGLE EN PARTIE} ou {@code REGLE}
     * @param dateReglement
     *            date au format {@code yyyy-MM-dd} ; ignoree pour un bon remis a « non regle »
     * @param montantRegle
     *            montant deja verse ; n'a de sens que pour un reglement partiel
     */
    JSONObject reglerBons(List<String> bonIds, String statut, String dateReglement, Integer montantRegle);

    byte[] generate(String search, String dtStart, String dtEnd, String grossisteId, String dateType)
            throws IOException;

    byte[] generate(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId)
            throws IOException;

}
