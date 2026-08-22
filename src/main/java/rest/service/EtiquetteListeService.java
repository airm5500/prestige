package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Ecran « Gestion des etiquettes » : la liste, son filtre de type, et la suppression d'une ligne.
 *
 * <p>
 * Remplace, POUR CET ECRAN SEULEMENT, les trois pages JSP {@code stockmanagement/etiquette/ws_data.jsp},
 * {@code ws_data_type_etiquette.jsp} et le mode {@code delete} de {@code ws_transaction.jsp}. Verifie avant reprise :
 * aucun autre ecran ne les appelle.
 *
 * <p>
 * Les noms de champs rendus sont ceux qu'attend le modele ExtJS existant, y compris {@code lg_FAMILLE_ID} qui porte la
 * DESIGNATION de l'article et non son identifiant, et {@code lg_TYPEETIQUETTE_ID} qui porte le LIBELLE du type. Les
 * changer aurait demande de toucher au modele, partage avec la vue de creation groupee.
 *
 * @author koben
 */
@Local
public interface EtiquetteListeService {

    /**
     * Lignes de la liste, par page.
     *
     * <p>
     * L'utilisateur ne voit que son emplacement, sauf s'il porte le privilege qui donne acces a toute l'activite :
     * c'est la regle que portait deja la couche metier appelee par la page JSP, et elle est reprise telle quelle.
     *
     * @param user
     *            utilisateur connecte, dont depend l'emplacement retenu
     * @param touteActivite
     *            vrai si l'utilisateur porte le privilege qui donne acces a tous les emplacements
     * @param recherche
     *            fragment de CIP, de code, de designation ou d'EAN13
     * @param dateDebut
     *            date de creation minimale, au format {@code yyyy-MM-dd}, ou vide
     * @param dateFin
     *            date de creation maximale, au format {@code yyyy-MM-dd}, ou vide ; la journee entiere est prise
     * @param typeEtiquetteId
     *            type d'etiquette, ou vide pour tous
     */
    JSONObject liste(TUser user, boolean touteActivite, String recherche, String dateDebut, String dateFin,
            String typeEtiquetteId, int start, int limit);

    /** Types d'etiquette proposes dans le filtre. */
    JSONObject types(String recherche, int start, int limit);

    /** Retire une ligne de la liste. La ligne n'est pas effacee : elle passe au statut supprime, comme auparavant. */
    JSONObject supprimer(String etiquetteId);
}
