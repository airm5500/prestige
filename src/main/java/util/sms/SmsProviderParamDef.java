package util.sms;

/**
 * Définition d'un paramètre attendu par un fournisseur SMS : clé technique, libellé affiché dans l'écran de
 * configuration, caractère secret (masqué à l'affichage, jamais renvoyé au front) et caractère obligatoire (bloque la
 * mise "en vigueur" s'il est vide).
 *
 * @author koben
 */
public final class SmsProviderParamDef {

    private final String cle;
    private final String libelle;
    private final boolean secret;
    private final boolean obligatoire;
    /** Indication affichee dans le champ vide : valeur par defaut a reprendre, ou origine d'un identifiant. */
    private final String exemple;

    public SmsProviderParamDef(String cle, String libelle, boolean secret, boolean obligatoire) {
        this(cle, libelle, secret, obligatoire, "");
    }

    public SmsProviderParamDef(String cle, String libelle, boolean secret, boolean obligatoire, String exemple) {
        this.cle = cle;
        this.libelle = libelle;
        this.secret = secret;
        this.obligatoire = obligatoire;
        this.exemple = exemple == null ? "" : exemple;
    }

    public String getExemple() {
        return exemple;
    }

    public String getCle() {
        return cle;
    }

    public String getLibelle() {
        return libelle;
    }

    public boolean isSecret() {
        return secret;
    }

    public boolean isObligatoire() {
        return obligatoire;
    }

}
