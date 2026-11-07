package rest.service.extranet.commun;

/**
 * Extranets grossistes lus par Prestige (plan du 07/11). Lecture seule : aucune commande ni reclamation n'est soumise.
 * L'adresse par defaut est publique (ce n'est pas un secret) ; elle se remplace par la configuration du serveur, ce qui
 * permet aux tests de viser un faux serveur local.
 */
public enum SourceExtranet {

    UBIPHARM("https://client-cotedivoire.ubipharm.com", "EXTRANET_UBIPHARM"),
    TEDIS("https://www.tedispharma-ci.com", "EXTRANET_TEDIS");

    private final String adresseParDefaut;
    private final String prefixeCle;

    SourceExtranet(String adresseParDefaut, String prefixeCle) {
        this.adresseParDefaut = adresseParDefaut;
        this.prefixeCle = prefixeCle;
    }

    public String adresseParDefaut() {
        return adresseParDefaut;
    }

    /** Prefixe des cles de configuration : EXTRANET_UBIPHARM_URL, EXTRANET_UBIPHARM_PAUSE_MS... */
    public String prefixeCle() {
        return prefixeCle;
    }

    /** Lecture tolerante (« ubipharm », « TEDIS ») ; null si inconnue. */
    public static SourceExtranet lire(String s) {
        if (s == null) {
            return null;
        }
        for (SourceExtranet x : values()) {
            if (x.name().equalsIgnoreCase(s.trim())) {
                return x;
            }
        }
        return null;
    }
}
