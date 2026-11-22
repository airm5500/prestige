package rest.service.dto;

/**
 * Plan du 21/11, point 4.5 : lettre de la classe ABC d'un produit, lue dans sa fiche (t_famille.lg_CLASSE_ABC_ID). Les
 * identifiants de t_classe_abc sont de la forme « ABC_CLASSE_A » et leur code est la partie qui suit le dernier tiret
 * bas (A, B, C), comme dans la fiche article. Un produit sans classe donne une chaine vide : l'ecran n'affiche alors
 * rien apres le nom.
 */
public final class ClasseAbc {

    private ClasseAbc() {
    }

    /**
     * @param lgClasseAbcId
     *            identifiant de la classe de la fiche (peut etre null)
     *
     * @return la lettre de la classe, ou "" si le produit n'est pas classe
     */
    public static String lettre(String lgClasseAbcId) {
        if (lgClasseAbcId == null) {
            return "";
        }
        String id = lgClasseAbcId.trim();
        if (id.isEmpty()) {
            return "";
        }
        String code = id.substring(id.lastIndexOf('_') + 1).trim();
        /* une valeur inattendue (identifiant sans code court) n'est pas affichee */
        return code.length() >= 1 && code.length() <= 3 && code.chars().allMatch(Character::isLetterOrDigit)
                ? code.toUpperCase() : "";
    }
}
