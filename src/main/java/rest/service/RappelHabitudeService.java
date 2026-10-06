package rest.service;

import commonTasks.dto.RappelHabitudeDTO;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Rappels aux patients chroniques par HABITUDE D'ACHAT et liste des piluliers a preparer (plan d'octobre, section 4.1,
 * lot L10).
 */
@Local
public interface RappelHabitudeService {

    String A_PREPARER = "A_PREPARER";
    String PREPARE = "PREPARE";
    String ECARTE = "ECARTE";
    /** Le client a rachete le produit : la ligne sort de la liste d'elle-meme. */
    String ACHETE = "ACHETE";

    /**
     * Calcule les habitudes et inscrit les produits dont le prochain achat tombe d'ici N jours (un cycle n'est inscrit
     * qu'une fois). Les lignes dont le produit a ete rachete passent a ACHETE. Rend {inscrits, achetes, habitudes}.
     */
    JSONObject actualiser(LocalDate jour);

    /** Liste filtree : statut (vide = a preparer et prepares), recherche client / produit, periode du prevu. */
    List<RappelHabitudeDTO> liste(String statut, String recherche, LocalDate du, LocalDate au, String emplacementId);

    /** Nombre de lignes encore a preparer (cloche). */
    int aPreparer();

    /** Change le statut des lignes (PREPARE, ECARTE ou A_PREPARER). */
    JSONObject marquer(List<String> ids, String statut, TUser operateur);

    /**
     * Prepare les SMS des lignes donnees, un par client (consentement et numero controles, medicaments cites ou non
     * selon la fiche). Rend {success, notifications:[id...], envoyes, refus:[{client, motif}]} ; les notifications sont
     * a envoyer APRES validation de la transaction.
     */
    JSONObject preparerSms(List<String> ids, TUser operateur);

    /**
     * Comme {@link #preparerSms}, pour un canal : SMS, WHATSAPP, ou SMS_WHATSAPP (WhatsApp puis SMS en repli). Le
     * consentement controle est celui du canal (WhatsApp puis SMS : l'un des deux suffit).
     */
    JSONObject preparerMessages(List<String> ids, TUser operateur, String canal);

    /** Tache quotidienne : actualise, puis prepare les SMS des nouvelles lignes si l'envoi automatique est actif. */
    List<String> rappelsAutomatiques(LocalDate jour);

    /** Citer les medicaments dans les messages au client (fiche client, coche par defaut). */
    boolean citerMedicaments(String clientId);

    void enregistrerCiterMedicaments(String clientId, boolean citer);

    /** Consentement WhatsApp de la fiche client : null = jamais renseigne. */
    Boolean consentementWhatsApp(String clientId);

    void enregistrerConsentementWhatsApp(String clientId, Boolean consent);
}
