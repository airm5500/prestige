package rest.service;

import javax.ejb.Local;
import javax.servlet.http.Part;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface ImportationInventaire {

    JSONObject bulkUpdate(Part part, String idInventaire) throws Exception;

    JSONObject bulkUpdateWithExcel(Part part, String id) throws Exception;

    /**
     * Importation d'un fichier CSV de comptage.
     *
     * @param ecraser
     *            true pour remplacer la quantite saisie par celle du fichier, false pour l'ajouter a la quantite
     *            existante (comportement historique).
     */
    JSONObject bulkUpdate(Part part, String idInventaire, boolean ecraser) throws Exception;

    /**
     * Importation d'un fichier Excel de comptage.
     *
     * @param ecraser
     *            true pour remplacer la quantite saisie par celle du fichier, false pour l'ajouter a la quantite
     *            existante (comportement historique).
     */
    JSONObject bulkUpdateWithExcel(Part part, String id, boolean ecraser) throws Exception;
}
