package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.EmpreintesLectureDTO;

/**
 * Demandes serveur des applications mobiles (43) : empreintes des employes partagees entre terminaux de pointage.
 * Gabarits chiffres (AES-GCM), cle en base (decision du pharmacien) ; fonction desactivee par defaut.
 */
@Local
public interface EmpreinteService {

    /** Enrole un ou plusieurs gabarits (base64) d'un employe actif, avec consentement. */
    JSONObject enroler(String employeId, JSONObject corps, TUser auteur);

    /** Gabarits des employes actifs crees depuis « depuis » (ISO, facultatif) pour ce format, et suppressions. */
    EmpreintesLectureDTO lire(String depuis, String format, TUser lecteur);

    /** Demande mobile 57 : lecture par une borne de pointage (journal « LIRE_BORNE »). */
    EmpreintesLectureDTO lireBorne(String depuis, String format, String borneId);

    /** Partage des empreintes actif (KEY_EMPREINTES_PARTAGEES = 1). */
    boolean partageActif();

    /** Efface les gabarits d'un employe (droit d'effacement) ; possible meme fonction desactivee. */
    JSONObject supprimer(String employeId, TUser auteur);
}
