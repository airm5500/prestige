package rest.service;

import dal.TUser;
import java.io.InputStream;
import javax.ejb.Local;
import org.json.JSONObject;

/** Images produit (plan d'octobre, section 6). */
@Local
public interface ImagesProduitService {

    JSONObject lister(String familleId);

    /** Ajout ; principale = true remplace l'image principale actuelle (qui est retiree). */
    JSONObject ajouter(String familleId, InputStream flux, boolean principale, TUser user);

    JSONObject definirPrincipale(String familleId, String imageId);

    JSONObject supprimer(String familleId, String imageId);

    /** Fichier a servir (vignette ou image) ; null si absent. [0] = chemin, [1] = type MIME. */
    Object[] fichier(String imageId, boolean vignette);
}
