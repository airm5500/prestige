package rest.service.impl.valorisation;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.impl.valorisation.SetValorisation.Ligne;
import rest.service.impl.valorisation.SetValorisation.Resultat;
import util.Constant;

/**
 * SET VALORISATION : lecture du stock de l'officine (rayon, emplacement « 1 ») et journal des usages. Aucune ecriture
 * dans le stock ni dans les fiches articles : le seul ecrit est la ligne de journal (qui, quand, quelle cible).
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class SetValorisationService {

    private static final Logger LOG = Logger.getLogger(SetValorisationService.class.getName());
    static final String EMPLACEMENT_OFFICINE = "1";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Produits actifs en stock au rayon de l'officine, par designation. */
    @SuppressWarnings("unchecked")
    public List<Ligne> stockOfficine() {
        List<Object[]> rows = em.createNativeQuery("SELECT f.int_CIP AS cip, f.str_NAME AS designation,"
                + " fs.int_NUMBER_AVAILABLE AS qte, COALESCE(f.int_PAF, 0) AS pa, COALESCE(f.int_PRICE, 0) AS pv"
                + " FROM t_famille f JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                + " WHERE fs.lg_EMPLACEMENT_ID = :e AND f.str_STATUT = 'enable' AND fs.int_NUMBER_AVAILABLE > 0"
                + " ORDER BY f.str_NAME, f.int_CIP").setParameter("e", EMPLACEMENT_OFFICINE).getResultList();
        List<Ligne> l = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            l.add(new Ligne(r[0] == null ? "" : String.valueOf(r[0]), r[1] == null ? "" : String.valueOf(r[1]),
                    nombre(r[2]), nombre(r[3]), nombre(r[4])));
        }
        return l;
    }

    private static long nombre(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0L;
    }

    public String nomOfficine() {
        List<?> r = em.createNativeQuery("SELECT str_NOM_COMPLET FROM t_officine WHERE lg_OFFICINE_ID = :o")
                .setParameter("o", Constant.OFFICINE).getResultList();
        return r.isEmpty() || r.get(0) == null ? "" : String.valueOf(r.get(0));
    }

    /** Journal d'un usage (CALCUL, PDF, EXCEL) : aucune ligne de produit n'y est conservee. Un echec n'arrete rien. */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void journaliser(String userId, String action, String source, Resultat r) {
        try {
            em.createNativeQuery("INSERT INTO t_set_valorisation_journal (created_at, lg_USER_ID, action, source, base,"
                    + " cible, valeur_depart, valeur_obtenue, nb_lignes) VALUES (NOW(), ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
                    .setParameter(1, userId).setParameter(2, action).setParameter(3, source)
                    .setParameter(4, r.base.name()).setParameter(5, r.cible).setParameter(6, r.valeurDepart)
                    .setParameter(7, r.valeurObtenue).setParameter(8, r.lignes.size()).executeUpdate();
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Journal Set valorisation non écrit : {0}", e.getClass().getSimpleName());
        }
    }
}
