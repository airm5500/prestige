package rest.service.extranet.commun;

/**
 * Extranets grossistes lus par Prestige (plan du 07/11). Lecture seule : aucune commande ni reclamation n'est soumise.
 * L'adresse par defaut est publique (ce n'est pas un secret) ; elle se remplace par la configuration du serveur, ce qui
 * permet aux tests de viser un faux serveur local.
 */
public enum SourceExtranet {

    /*
     * Ubipharm : connexion unique par auth.ubipharm.com (relevee et reussie le 08/11). Le parametre state vaut «
     * /Identification » en base64 : page d'arrivee apres la connexion. Si Ubipharm la change, saisir la nouvelle
     * adresse dans l'onglet Sessions (elle passe avant celle-ci).
     */
    UBIPHARM("https://client-cotedivoire.ubipharm.com", "EXTRANET_UBIPHARM",
            "https://auth.ubipharm.com/realms/TIC-SSO/protocol/openid-connect/auth?scope=openid&response_type=code"
                    + "&client_id=ExtranetClientGrossiste02"
                    + "&redirect_uri=https%3A%2F%2Fclient-cotedivoire.ubipharm.com%2FCallbackSSO"
                    + "&state=L0lkZW50aWZpY2F0aW9u",
            null),
    /*
     * TEDIS (relevee le 08/11) : /login porte un formulaire sans adresse d'envoi ; le site l'envoie en AJAX a la racine
     * « / » et recoit du JSON ({error, msg} / {succes}). Poster sur /login donne 405.
     */
    TEDIS("https://www.tedispharma-ci.com", "EXTRANET_TEDIS", "https://www.tedispharma-ci.com/login", "/");

    private final String adresseParDefaut;
    private final String prefixeCle;
    private final String pageConnexionParDefaut;
    private final String actionConnexionAjax;

    SourceExtranet(String adresseParDefaut, String prefixeCle, String pageConnexionParDefaut,
            String actionConnexionAjax) {
        this.adresseParDefaut = adresseParDefaut;
        this.prefixeCle = prefixeCle;
        this.pageConnexionParDefaut = pageConnexionParDefaut;
        this.actionConnexionAjax = actionConnexionAjax;
    }

    /**
     * Chemin ou le site envoie son formulaire de connexion par AJAX quand le formulaire n'a pas d'adresse d'envoi ; la
     * reponse est alors du JSON. Null : formulaire classique (envoi a son action, reponse HTML).
     */
    public String actionConnexionAjax() {
        return actionConnexionAjax;
    }

    /**
     * Page de connexion utilisee quand aucune n'est saisie. Seulement pour l'extranet reel : un serveur configure
     * ailleurs (faux extranet des tests) garde la page « / ».
     *
     * @param adresseConfiguree
     *            adresse de l'extranet donnee par la configuration du serveur
     *
     * @return null s'il n'y en a pas
     */
    public String pageConnexionParDefaut(String adresseConfiguree) {
        if (pageConnexionParDefaut == null || adresseConfiguree == null) {
            return null;
        }
        String a = adresseConfiguree.trim();
        while (a.endsWith("/")) {
            a = a.substring(0, a.length() - 1);
        }
        return a.equalsIgnoreCase(adresseParDefaut) ? pageConnexionParDefaut : null;
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
