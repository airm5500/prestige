package rest.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import util.TelephoneCi;

/**
 * Controle de la saisie d'un client standard (evolution 5, point 3) : nom, prenoms et numero de telephone.
 *
 * <p>
 * Classe sans dependance, volontairement separee de l'enregistrement : c'est elle qui dit ce qui est acceptable, et
 * elle se teste sans base ni serveur. Le numero est rendu normalise au format local a dix chiffres, de sorte que « 07
 * 08 47 37 50 » et « +225 0708473750 » designent bien le meme client et ne puissent pas etre enregistres deux fois.
 * </p>
 */
public final class ClientStandardSaisie {

    /** Type de client « Standard » dans t_type_client. */
    public static final String TYPE_CLIENT_STANDARD = "6";

    private final List<String> erreurs;
    private final String nom;
    private final String prenoms;
    private final String telephone;

    private ClientStandardSaisie(List<String> erreurs, String nom, String prenoms, String telephone) {
        this.erreurs = erreurs;
        this.nom = nom;
        this.prenoms = prenoms;
        this.telephone = telephone;
    }

    /**
     * Controle la saisie. Toutes les erreurs sont rendues d'un coup : l'operateur ne doit pas decouvrir la deuxieme
     * apres avoir corrige la premiere.
     */
    public static ClientStandardSaisie controler(String nomSaisi, String prenomsSaisis, String telephoneSaisi) {
        List<String> erreurs = new ArrayList<>();
        String nom = StringUtils.trimToEmpty(nomSaisi);
        String prenoms = StringUtils.trimToEmpty(prenomsSaisis);
        if (nom.isEmpty()) {
            erreurs.add("Le nom est obligatoire.");
        }
        if (prenoms.isEmpty()) {
            erreurs.add("Les prénoms sont obligatoires.");
        }
        TelephoneCi.Resultat numero = TelephoneCi.controler(telephoneSaisi);
        if (!numero.isValide()) {
            erreurs.add("Numéro de téléphone invalide : " + numero.getMotif()
                    + ". Un numéro ivoirien compte dix chiffres et commence par 01, 05 ou 07.");
        }
        return new ClientStandardSaisie(erreurs, nom, prenoms, numero.isValide() ? numero.getLocal() : "");
    }

    public boolean estValide() {
        return erreurs.isEmpty();
    }

    public List<String> getErreurs() {
        return Collections.unmodifiableList(erreurs);
    }

    /** Les erreurs sur une seule ligne, pour l'affichage a l'ecran. */
    public String message() {
        return String.join(" ", erreurs);
    }

    public String getNom() {
        return nom;
    }

    public String getPrenoms() {
        return prenoms;
    }

    /** Numero normalise au format local a dix chiffres, vide si la saisie a ete refusee. */
    public String getTelephone() {
        return telephone;
    }
}
