package util;

import dal.TClient;

/**
 * Le numero de telephone d'un client, lu de la meme facon partout ou l'on ecrit au client (plan avoir du 08/11, point
 * 4) : campagnes, rappels des traitements, envoi par SMS et par WhatsApp.
 * <p>
 * Depuis la colonne {@code str_TELEPHONE} (Evolution 5, point 3), le numero est range la ; l'ancien champ
 * {@code str_ADRESSE} le portait avant, et le porte encore pour les fiches non reprises. Regle :
 * <ol>
 * <li>{@code str_TELEPHONE}, s'il porte un numero mobile valide ;</li>
 * <li>sinon {@code str_ADRESSE}, s'il porte un numero mobile valide ;</li>
 * <li>sinon aucun numero : le client n'est pas joignable.</li>
 * </ol>
 * Une vraie adresse postale n'est jamais prise ni montree pour un numero. Classe sans base, testee a part.
 */
public final class TelephoneClient {

    private TelephoneClient() {
    }

    /** Controle du numero du client selon la regle ; en cas d'echec, le motif porte sur le champ telephone. */
    public static TelephoneCi.Resultat controler(String telephone, String adresse) {
        TelephoneCi.Resultat t = TelephoneCi.controler(telephone);
        if (t.isValide()) {
            return t;
        }
        TelephoneCi.Resultat a = TelephoneCi.controler(adresse);
        return a.isValide() ? a : t;
    }

    public static TelephoneCi.Resultat controler(TClient c) {
        return c == null ? TelephoneCi.controler(null) : controler(c.getStrTELEPHONE(), c.getStrADRESSE());
    }

    /**
     * Le numero a afficher : le numero retenu (format local a 10 chiffres) ; a defaut, le telephone saisi tel quel,
     * pour que l'equipe voie pourquoi il est refuse ; jamais l'adresse si elle n'a pas la forme d'un numero.
     */
    public static String affiche(String telephone, String adresse) {
        TelephoneCi.Resultat r = controler(telephone, adresse);
        if (r.isValide()) {
            return r.getLocal();
        }
        String t = telephone == null ? "" : telephone.trim();
        if (!t.isEmpty()) {
            return t;
        }
        String a = adresse == null ? "" : adresse.trim();
        return a.matches("[0-9+ ().-]+") && a.replaceAll("\\D", "").length() >= 8 ? a : "";
    }
}
