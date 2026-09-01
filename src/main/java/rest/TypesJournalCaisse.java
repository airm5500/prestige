package rest;

/**
 * Natures d'operation que le journal de caisse montre.
 *
 * <p>
 * L'ecran « Mouvements de caisse » ne retient que trois natures : les entrees de caisse, les sorties de caisse et les
 * reglements tiers payant. Tout le reste - fonds de caisse, ventes, acomptes, avoirs, reglements differes - releve
 * d'autres ecrans et encombrait celui-ci.
 *
 * <p>
 * La restriction etait posee par le seul ecran, qui envoyait la liste des trois identifiants. Elle dependait donc du
 * chargement de sa liste deroulante : tant que celle-ci n'etait pas revenue, l'ecran n'envoyait aucun type et le
 * serveur, faute de filtre, rendait TOUTES les natures. Selon la vitesse du reseau, le journal s'ouvrait donc tantot
 * filtre, tantot complet. Le serveur applique desormais lui-meme la restriction quand rien ne lui est demande : la
 * course n'a plus d'objet, et l'ecran garde la main pour n'afficher qu'une seule nature.
 *
 * <p>
 * La reconnaissance se fait sur le LIBELLE, comme cote ecran, et non sur l'identifiant : celui-ci n'est pas garanti
 * d'une officine a l'autre. « 1/3 » distingue les reglements tiers payant des reglements differes, dont le libelle
 * contient aussi le mot « reglement ».
 */
public final class TypesJournalCaisse {

    private TypesJournalCaisse() {
    }

    /**
     * Dit si une nature d'operation a sa place dans le journal de caisse.
     *
     * @param libelle
     *            libelle de la nature, tel qu'il est enregistre
     */
    public static boolean estTypeDuJournal(String libelle) {
        if (libelle == null) {
            return false;
        }
        String l = libelle.toLowerCase();
        return (contient(l, "entree") && l.contains("caisse")) || (contient(l, "sortie") && l.contains("caisse"))
                || l.contains("1/3");
    }

    /** Comparaison indifferente aux accents sur les seules lettres qui nous interessent ici. */
    private static boolean contient(String texte, String mot) {
        return texte.replace('é', 'e').replace('è', 'e').replace('ê', 'e').contains(mot);
    }
}
