package rest.service;

import dal.SmsFournisseur;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Gestion des fournisseurs d'envoi de SMS (écran "Fournisseurs SMS") : CRUD, activation/désactivation et choix du
 * fournisseur en vigueur pour les envois.
 *
 * Les réponses JSON suivent le format attendu par les stores ExtJS : {@code {success, data, total, msg}}. Les
 * paramètres secrets (clé API, client secret) ne sont jamais renvoyés au front.
 *
 * @author koben
 */
@Local
public interface SmsFournisseurService {

    /** Liste des fournisseurs avec leurs paramètres (secrets masqués). */
    JSONObject findAll();

    /**
     * Crée ou met à jour un fournisseur.
     *
     * @param payload
     *            {@code {id?, code, libelle, dlrMode, dlrCallbackUrl, params: {cle: valeur}}} ; pour un paramètre
     *            secret, une valeur vide signifie "inchangé".
     */
    JSONObject save(JSONObject payload);

    /** Active/désactive un fournisseur. Le fournisseur en vigueur ne peut pas être désactivé. */
    JSONObject toggle(String id);

    /** Définit le fournisseur en vigueur (actif et paramètres obligatoires renseignés uniquement). */
    JSONObject definirEnVigueur(String id);

    /** Supprime un fournisseur jamais utilisé ; sinon invite à le désactiver. */
    JSONObject delete(String id);

    /** Teste l'authentification du fournisseur (consultation du solde, sans consommer de crédit). */
    JSONObject tester(String id);

    /** Fournisseur en vigueur pour les envois, ou {@code null} si aucun. */
    SmsFournisseur getEnVigueur();

    /** Fournisseur par code (ORANGE, LETEXTO...), ou {@code null}. */
    SmsFournisseur findByCode(String code);

}
