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

    /** Meme liste, filtree par statut de controle et presence d'ecarts (point 17). */
    JSONObject list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId, int start,
            int limit, String dateType, String statutControle, String ecart);

    /** Nombre de BL de la liste avec les memes criteres. */
    long nombre(String search, String dtStart, String dtEnd, String grossisteId, String dateType, String statutControle,
            String ecart, String userId);

    /** Meme liste, limitee aux BL saisis par un utilisateur ({@code userId} vide ou ALL : tous). */
    JSONObject list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId, int start,
            int limit, String dateType, String statutControle, String ecart, String userId);

    /** Toutes les lignes retenues par les criteres, sans pagination : impression et export. */
    List<EtatControlBon> tous(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId,
            String dateType, String statutControle, String ecart);

    EtatControlAnnuelWrapperDTO listBonAnnuel(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId);

    JSONObject listBonAnnuelView(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId);

    JSONObject etatLastThreeYears();

    List<AchatGrossisteMensuelDTO> listAchatsMensuels(String dtStart, String dtEnd, String type);

    JSONObject achatsMensuelsView(String dtStart, String dtEnd, String type);

    JSONObject updateBon(EtatControlBonEditDto bonEdit);

    /** Plan du 19/11, point 12 : modification tracee au journal (un champ par information changee, avant / apres). */
    JSONObject updateBon(EtatControlBonEditDto bonEdit, dal.TUser user);

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

    /** Reference du bon (numero du grossiste), ou son identifiant s'il est introuvable. */
    String referenceDuBon(String bonId);

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

    /** Plan du 19/11, point 12 : reglement trace au journal. */
    JSONObject reglerBons(List<String> bonIds, String statut, String dateReglement, Integer montantRegle,
            dal.TUser user);

    /**
     * Plan du 19/11, point 12 : onglet « Modifications des BL » : modifications et reglements de BL de la periode (date
     * de l'operation), une ligne par champ change, relus du journal.
     */
    JSONObject modificationsBl(String search, String dtStart, String dtEnd);

    byte[] generate(String search, String dtStart, String dtEnd, String grossisteId, String dateType)
            throws IOException;

    byte[] generate(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId)
            throws IOException;

    /** Retour du 31/10 : BL annules (retour complet du BL) de la periode, par date d'annulation. */
    JSONObject blAnnules(String search, String dtStart, String dtEnd, String grossisteId);

    /** Retours du 10/10 : grossistes d'un groupe (filtre « groupe de grossistes »). */
    String grossistesDuGroupe(String groupeId);

    /** Seuil du delai de saisie des BL, en jours (defaut 1). */
    int delaiSaisie();

    JSONObject enregistrerDelaiSaisie(int jours);

    /** Tableau de bord du controle des achats (Q7). */
    JSONObject tableauBord(boolean fullAuth, String dtStart, String dtEnd, String grossisteId, String dateType);

    /**
     * Demande du 14/11 : avecLignes=false ne renvoie que les en-tetes des bons (statut, avoir, ecart et nombre de
     * lignes calcules en base) ; les lignes se lisent par {@link #lignesDuBon}.
     */
    JSONObject list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId, int start,
            int limit, String dateType, String statutControle, String ecart, String userId, boolean avecLignes);

    /** Lignes d'un bon, a la demande : {success, total, data:[ligne avec son produit]}. */
    JSONObject lignesDuBon(String bonId);
}
