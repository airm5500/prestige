package rest.service.ticket;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONObject;

/**
 * Reglages des modeles de ticket et largeur du papier de chaque imprimante (menu « Modeles de ticket », demande du
 * 02/11). Table {@code ticket_modele} : une ligne par ticket et par largeur ; sans ligne, les valeurs par defaut
 * s'appliquent (nouveau modele). Une lecture qui echoue rend aussi les valeurs par defaut : l'impression ne doit jamais
 * tomber a cause des reglages.
 */
@Stateless
public class ModeleTicketService {

    private static final Logger LOG = Logger.getLogger(ModeleTicketService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public static int largeurValide(int mm) {
        return mm <= 58 ? 58 : 80;
    }

    public ReglagesTicket reglages(ModeleTicket t, int largeur) {
        try {
            List<?> l = em.createNativeQuery("SELECT reglages FROM ticket_modele WHERE ticket = ?1 AND largeur = ?2")
                    .setParameter(1, t.name()).setParameter(2, largeurValide(largeur)).getResultList();
            if (!l.isEmpty() && l.get(0) != null) {
                return ReglagesTicket.depuis(t, new JSONObject(l.get(0).toString()));
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Lecture des réglages du ticket " + t + " : valeurs par défaut", e);
        }
        return new ReglagesTicket(t);
    }

    public Map<ModeleTicket, ReglagesTicket> tous(int largeur) {
        Map<ModeleTicket, ReglagesTicket> m = new EnumMap<>(ModeleTicket.class);
        for (ModeleTicket t : ModeleTicket.values()) {
            m.put(t, reglages(t, largeur));
        }
        return m;
    }

    public void enregistrer(ReglagesTicket r, int largeur, String utilisateur) {
        em.createNativeQuery("INSERT INTO ticket_modele (ticket, largeur, reglages, maj, utilisateur)"
                + " VALUES (?1, ?2, ?3, NOW(), ?4) ON DUPLICATE KEY UPDATE reglages = VALUES(reglages),"
                + " maj = VALUES(maj), utilisateur = VALUES(utilisateur)").setParameter(1, r.ticket().name())
                .setParameter(2, largeurValide(largeur)).setParameter(3, r.json().toString())
                .setParameter(4, utilisateur).executeUpdate();
    }

    /** « Revenir à l'ancien modèle pour toutes les caisses » : chaque ticket, dans les deux largeurs. */
    public void ancienPartout(String utilisateur) {
        for (int largeur : new int[] { 80, 58 }) {
            for (ModeleTicket t : ModeleTicket.values()) {
                JSONObject j = reglages(t, largeur).json().put("modele", ReglagesTicket.ANCIEN);
                enregistrer(ReglagesTicket.depuis(t, j), largeur, utilisateur);
            }
        }
    }

    /** Largeur du rouleau de l'imprimante (par son nom Windows) ; 80 mm si inconnue. */
    public int largeurImprimante(String nom) {
        if (nom == null) {
            return 80;
        }
        try {
            List<?> l = em
                    .createNativeQuery("SELECT int_LARGEUR_PAPIER FROM t_imprimante WHERE str_NAME = ?1 LIMIT 1")
                    .setParameter(1, nom).getResultList();
            if (!l.isEmpty() && l.get(0) != null) {
                return largeurValide(((Number) l.get(0)).intValue());
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Largeur du papier de l'imprimante : 80 mm par défaut", e);
        }
        return 80;
    }

    /** Imprimantes enregistrees : identifiant, nom, largeur. */
    public List<Object[]> imprimantes() {
        List<Object[]> res = new ArrayList<>();
        try {
            for (Object o : em.createNativeQuery("SELECT lg_IMPRIMANTE_ID, str_NAME, int_LARGEUR_PAPIER"
                    + " FROM t_imprimante WHERE COALESCE(str_STATUT, '') <> 'delete' ORDER BY str_NAME").getResultList()) {
                Object[] l = (Object[]) o;
                res.add(new Object[] { l[0], l[1], largeurValide(((Number) l[2]).intValue()) });
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Liste des imprimantes", e);
        }
        return res;
    }

    public boolean changerLargeur(String imprimanteId, int largeur) {
        return em.createNativeQuery("UPDATE t_imprimante SET int_LARGEUR_PAPIER = ?1 WHERE lg_IMPRIMANTE_ID = ?2")
                .setParameter(1, largeurValide(largeur)).setParameter(2, imprimanteId).executeUpdate() == 1;
    }
}
