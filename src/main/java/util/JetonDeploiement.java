package util;

/**
 * Jeton du deploiement en cours (retour du 03/11 : un poste gardait l'ancien rappel de l'horloge). Les scripts sont
 * gardes 24 h par le navigateur (StaticResourceCacheFilter) : sous la meme adresse, un correctif n'atteignait un poste
 * qu'au bout d'un jour ou apres Ctrl+F5. index.jsp ajoute ce jeton a l'adresse des scripts et des feuilles de style de
 * Prestige (?v=...) : la classe est rechargee a chaque deploiement (et a chaque demarrage de Payara), le jeton change,
 * le navigateur relit donc chaque fichier une fois, puis le garde en cache comme avant.
 */
public final class JetonDeploiement {

    public static final String JETON = Long.toString(System.currentTimeMillis(), 36);

    private JetonDeploiement() {
    }
}
