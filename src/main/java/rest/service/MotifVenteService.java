package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Plan du 08/11, point 18 : motif obligatoire sur l'annulation et la modification d'une vente, et recapitulatif par
 * motif et par auteur de la vente d'origine.
 */
@Local
public interface MotifVenteService {

    String ANNULATION = "ANNULATION";
    String MODIFICATION = "MODIFICATION";
    String EN_COURS = "EN_COURS";
    String VALIDEE = "VALIDEE";

    /** Motifs actifs, dans l'ordre : id, libelle, texteLibre (« Autre » demande un texte). */
    JSONArray motifs();

    /** Refus (message) si le motif est absent, inconnu, ou « Autre » sans texte ; null si le motif est valable. */
    String refus(String motifId, String commentaire);

    /** Origine de la vente (vendeur, caissier, reference, montant, date) lue AVANT l'annulation. */
    JSONObject origine(String venteId);

    /** Annulation reussie : un motif, avec l'auteur d'origine lu avant l'annulation. */
    void enregistrerAnnulation(JSONObject origine, String motifId, String commentaire, TUser operateur);

    /** Ouverture de la modification d'une vente : motif EN_COURS (remplace un motif EN_COURS de la meme vente). */
    JSONObject ouvrirModification(String venteId, String motifId, String commentaire, TUser operateur);

    /** Cloture de la copie : le motif EN_COURS de la vente d'origine passe VALIDEE, avec la nouvelle vente. */
    void validerModification(String venteOrigineId, String nouvelleVenteId);

    /** Copie abandonnee : le motif EN_COURS de la vente d'origine est retire. */
    void abandonnerModification(String venteOrigineId);

    /** Recapitulatif sur la periode : par motif, par auteur de la vente d'origine, et le detail. */
    JSONObject recap(String dtStart, String dtEnd, String type, String vendeurId);
}
