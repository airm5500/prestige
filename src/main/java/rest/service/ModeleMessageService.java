package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/** Modeles de messages SMS / WhatsApp (point 2). */
@Local
public interface ModeleMessageService {

    /** Liste {success, total, data:[{id, libelle, canal, contenu, actif}]} ; actifs seulement si tous = false. */
    JSONObject lister(String canal, boolean tous);

    /** Creation ou modification (id vide = creation). Reponse {success, msg, id}. */
    JSONObject enregistrer(String id, String libelle, String canal, String contenu);

    /** Active / desactive. */
    JSONObject basculer(String id);
}
