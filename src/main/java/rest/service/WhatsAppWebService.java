package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Retours du 07/10 : connexion WhatsApp Web par QR code et regles anti-bannissement (service compagnon
 * outils/whatsapp-web), modeles de messages de l'API officielle (saisie, controle, soumission a Meta, statuts).
 */
@Local
public interface WhatsAppWebService {

    /** Etat du service compagnon (connexion, numero, file d'attente). */
    JSONObject etat();

    /** QR code a scanner (image data:...). */
    JSONObject qr();

    JSONObject deconnecter();

    /** Regles d'envoi enregistrees (completees par les valeurs par defaut). */
    JSONObject regles();

    /** Enregistre les regles (bornees) et les transmet au service compagnon. */
    JSONObject enregistrerRegles(JSONObject saisie, TUser operateur);

    JSONObject modeles();

    JSONObject enregistrerModele(JSONObject saisie, TUser operateur);

    JSONObject supprimerModele(String id);

    /** Soumet le modele a Meta (en mode test : simule, sans appel). */
    JSONObject soumettreModele(String id, TUser operateur);

    /** Met a jour les statuts des modeles soumis (approuve, rejete et son motif...). */
    JSONObject synchroniserModeles();

    /**
     * Banniere « session a reconnecter » (demande du 25/10) : alerte si le compte WhatsApp Web est actif et que la
     * reception est degradee (rapport du service ou etat en direct), que la session est deconnectee, ou que le service
     * ne repond pas. Rend {success, alerte, type, message, raison}. L'etat en direct est garde 20 s (un appel au
     * service pour tous les postes).
     */
    JSONObject alerte();

    /**
     * Retour du 25/10 : « Reconnecter » quand le service ne repond pas. Sur CE serveur seulement (adresse du service
     * locale) : le service Windows « prestige-whatsapp » s'il est installe, sinon demarrer.bat (demarrer.sh hors
     * Windows) du dossier du service, en mode automatique (ni pause ni question). Rien d'autre n'est lance. Rend
     * {success, msg}.
     */
    JSONObject demarrer(TUser operateur);

    /** Vrai si le role (identifiant) est un role administrateur (Administrateur ou Super administrateur). */
    boolean administrateur(String roleId);
}
