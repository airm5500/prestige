package rest.service.extranet;

import java.util.List;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONObject;
import rest.service.extranet.commun.DepotListes;
import rest.service.extranet.commun.JournalCollecte;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Ecritures d'une lecture de liste en transactions courtes (option A du 09/11). La lecture sur l'extranet (plusieurs
 * minutes) se fait hors transaction : aucune connexion a la base n'est tenue pendant les appels. Chaque etape a sa
 * propre transaction : ouverture du journal (visible tout de suite dans « Collectes »), lignes par paquets, puis
 * fermeture COMPLETE et retrait de l'ancien cache ensemble. Un echec retire les lignes deja ecrites de la collecte et
 * garde l'ancien cache.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
public class CollectesListes {

    /** Lignes ecrites par transaction. */
    public static final int PAQUET = 1000;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public long ouvrir(SourceExtranet s, String module, String parametres, String utilisateur) {
        return new JournalCollecte(em).ouvrir(s, module, parametres, utilisateur);
    }

    /** Un paquet de lignes (au plus {@link #PAQUET}). */
    public void enregistrer(long collecteId, String liste, List<Ligne> paquet) {
        new DepotListes(em).enregistrer(collecteId, liste, paquet);
    }

    /**
     * Fermeture COMPLETE puis retrait des lignes des collectes precedentes, dans la meme transaction : l'ecran passe de
     * l'ancien cache au nouveau d'un coup. Rend la liste gardee.
     */
    public JSONObject terminer(SourceExtranet s, String liste, String module, JSONObject description, long collecteId,
            Integer annoncees, int recues) {
        DepotListes d = new DepotListes(em);
        new JournalCollecte(em).fermer(collecteId, JournalCollecte.COMPLETE, annoncees, recues, null);
        d.garderSeulement(liste, module, collecteId);
        return d.lire(s, liste, module, description);
    }

    /** Fermeture ECHEC : les lignes deja ecrites par cette collecte sont retirees ; l'ancien cache reste. */
    public JSONObject echec(long collecteId, String liste, String message) {
        new DepotListes(em).retirerCollecte(liste, collecteId);
        JournalCollecte j = new JournalCollecte(em);
        j.fermer(collecteId, JournalCollecte.ECHEC, null, 0, message);
        return j.une(collecteId);
    }
}
