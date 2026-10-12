package rest.service;

/**
 * Controle des cles de preferences utilisateur. Hors de l'interface EJB {@link PreferenceUtilisateurService} : une
 * methode statique dans une interface @Local n'a pas de methode correspondante dans le bean, et Payara refuse alors les
 * appels au service (« Client not authorized for this invocation »).
 */
public final class PreferenceCles {

    private PreferenceCles() {
    }

    public static boolean cleValide(String cle) {
        return cle != null && cle.matches("[A-Za-z0-9_.-]{1,80}");
    }
}
