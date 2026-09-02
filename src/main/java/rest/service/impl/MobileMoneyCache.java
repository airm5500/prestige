package rest.service.impl;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.annotation.PostConstruct;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import util.MobileMoney;

/**
 * Charge, au demarrage et a chaque creation de type de reglement, les types classes MOBILE_MONEY en base, et les confie
 * a {@link MobileMoney} qui repond ensuite sans acces a la base - les rapports de caisse et les DTO l'appellent depuis
 * du code statique.
 *
 * <p>
 * Lecture en SQL natif : le cache partage d'entites garderait la premiere valeur lue et un type cree apres le demarrage
 * n'y apparaitrait pas. Une base pas encore migree (colonne absente) laisse simplement les operateurs historiques, qui
 * sont codes dans {@link MobileMoney} : rien ne change pour l'officine.
 */
@Singleton
@Startup
@Lock(LockType.READ)
public class MobileMoneyCache {

    private static final Logger LOG = Logger.getLogger(MobileMoneyCache.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @PostConstruct
    public void auDemarrage() {
        rafraichir();
    }

    /** Relit la base et remplace la liste des types mobile money. */
    @Lock(LockType.WRITE)
    public void rafraichir() {
        try {
            @SuppressWarnings("unchecked")
            List<Object> ids = em
                    .createNativeQuery(
                            "SELECT lg_TYPE_REGLEMENT_ID FROM t_type_reglement WHERE str_CATEGORIE = 'MOBILE_MONEY'")
                    .getResultList();
            Set<String> identifiants = new HashSet<>();
            for (Object id : ids) {
                if (id != null) {
                    identifiants.add(id.toString());
                }
            }
            MobileMoney.definirDepuisLaBase(identifiants);
            LOG.log(Level.INFO, "Types de reglement mobile money charges : {0}", identifiants);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Categorie des types de reglement illisible (base non migree ?) :"
                    + " seuls les operateurs historiques sont reconnus. {0}", e.getMessage());
        }
    }
}
