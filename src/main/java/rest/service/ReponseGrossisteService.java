package rest.service;

import org.json.JSONObject;

/**
 * Import de la reponse d'un grossiste a une commande.
 *
 * <p>
 * Le grossiste rend un fichier par ligne commandee, au format convenu :
 *
 * <pre>
 * cip/ean envoye ; quantite commandee ; cip/ean reponse ; quantite recue ; prix achat ; designation
 * </pre>
 *
 * La designation est facultative - le fichier Excel de l'officine n'a que cinq colonnes - et il n'y a pas de ligne
 * d'en-tete. CSV comme Excel sont acceptes.
 *
 * <p>
 * L'import ne modifie RIEN par lui-meme : il rend un compte rendu ligne par ligne, que l'ecran affiche et que
 * l'utilisateur applique s'il le veut. C'est le choix retenu en recette pour les lignes ou le grossiste a substitue un
 * produit : elles sont signalees, jamais appliquees d'office.
 */
public interface ReponseGrossisteService {

    /**
     * Lit un fichier de reponse et le confronte aux lignes de la commande.
     *
     * @param commandeId
     *            commande a laquelle la reponse se rapporte
     * @param nomFichier
     *            nom du fichier envoye, qui sert a reconnaitre un classeur Excel d'un CSV
     * @param contenu
     *            flux du fichier
     *
     * @return compte rendu : lignes reconnues, lignes a arbitrer, lignes rejetees, et le detail de chacune
     */
    JSONObject analyser(String commandeId, String nomFichier, java.io.InputStream contenu);

    /**
     * Reporte les quantites servies sur les lignes de la commande.
     *
     * <p>
     * Second geste, explicite : l'ecran ne renvoie que les lignes que l'officine a retenues. Le serveur relit chaque
     * ligne en base, verifie qu'elle appartient bien a la commande visee et que la commande est encore modifiable, puis
     * met la quantite a jour. Le prix d'achat n'est jamais touche ici - le fichier peut en porter un, c'est une
     * information, pas une decision.
     *
     * @param commandeId
     *            commande visee
     * @param lignes
     *            lignes retenues : identifiant de ligne de commande et quantite servie
     *
     * @return nombre de lignes mises a jour et, le cas echeant, celles qui ont ete ecartees
     */
    JSONObject appliquer(String commandeId, java.util.List<rest.service.dto.ReponseGrossisteLigneDTO> lignes);
}
