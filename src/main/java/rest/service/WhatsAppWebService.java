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
}
