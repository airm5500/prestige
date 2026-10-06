package rest.service.impl;

import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.PreferenceUtilisateurService;

@Stateless
public class PreferenceUtilisateurServiceImpl implements PreferenceUtilisateurService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public String lire(String userId, String cle) {
        List<?> r = em
                .createNativeQuery("SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID=?1 AND str_CLE=?2")
                .setParameter(1, userId).setParameter(2, cle).getResultList();
        return r.isEmpty() || r.get(0) == null ? null : r.get(0).toString();
    }

    @Override
    public void ecrire(String userId, String cle, String valeur) {
        em.createNativeQuery("INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) "
                + "VALUES (?1, ?2, ?3, NOW()) ON DUPLICATE KEY UPDATE txt_VALEUR=VALUES(txt_VALEUR), dt_UPDATED=NOW()")
                .setParameter(1, userId).setParameter(2, cle).setParameter(3, valeur).executeUpdate();
    }

    @Override
    public void supprimer(String userId, String cle) {
        em.createNativeQuery("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID=?1 AND str_CLE=?2")
                .setParameter(1, userId).setParameter(2, cle).executeUpdate();
    }
}
