package rest;

/**
 * Regles du code EAN d'un article, isolees de la base pour etre verifiables.
 *
 * <p>
 * Un produit et son deconditionne - son « detail » - sont deux articles distincts qui designent la meme boite : ils
 * portent donc le MEME code EAN. Corriger le code de l'un sans corriger celui de l'autre les desaccorde, et la
 * douchette ne retrouve plus qu'un des deux. Toute mise a jour porte donc sur le groupe entier, quel que soit celui des
 * deux sur lequel l'utilisateur a clique.
 */
public final class CodeEanUtil {

    private CodeEanUtil() {
    }

    /**
     * Ramene ce que l'ecran envoie a une valeur exploitable : jamais nul, sans espaces autour.
     */
    public static String normaliser(String code) {
        return code == null ? "" : code.trim();
    }

    /**
     * Un code vide n'est pas une correction, c'est un oubli : on refuse plutot que d'effacer en silence le code
     * existant.
     */
    public static boolean estRenseigne(String code) {
        return !normaliser(code).isEmpty();
    }

    /**
     * Identifiant sous lequel se range le groupe « produit + ses detaillés ».
     *
     * <p>
     * Pour un produit c'est lui-meme ; pour un deconditionne c'est son parent. Le meme groupe est donc trouve, que l'on
     * parte du produit ou de son detail - c'est ce qui rend la mise a jour symetrique. Le parent est stocke a la chaine
     * vide, et non a nul, sur une partie du parc : les deux cas valent « pas de parent ».
     */
    public static String identifiantDeGroupe(String familleId, String parentId) {
        String parent = normaliser(parentId);
        return parent.isEmpty() ? normaliser(familleId) : parent;
    }
}
