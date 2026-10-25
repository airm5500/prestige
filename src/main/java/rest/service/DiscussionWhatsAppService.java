package rest.service;

import java.util.List;
import javax.ejb.Local;
import rest.service.dto.DiscussionWhatsAppDTO;

/**
 * Fils de discussion WhatsApp (demande du 25/10, repris du CRM UBIPHARM) : les reponses des clients, par numero, et ce
 * que l'officine leur a repondu depuis Prestige. L'envoi d'une reponse passe par {@link WhatsAppService}.
 */
@Local
public interface DiscussionWhatsAppService {

    /** Discussions, la plus recente d'abord ; {@code filtre} sur le nom, le numero ou le texte ; non lues seulement. */
    List<DiscussionWhatsAppDTO.Discussion> discussions(String filtre, boolean nonLues);

    /** Fil d'un numero (les derniers messages, du plus ancien au plus recent) ; les messages recus passent a « lu ». */
    DiscussionWhatsAppDTO fil(String numero);

    /** Nombre de messages recus non lus (toutes discussions). */
    long nonLus();
}
