package rest.service.impl;

import java.util.Date;
import java.util.List;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

/**
 * Ecriture de la classe ABC sur t_famille, PAR PAQUET, chaque paquet dans sa
 * PROPRE transaction (REQUIRES_NEW). Permet a la reclassification automatique de
 * liberer les verrous au fur et a mesure (pas une seule transaction geante).
 */
@Stateless
public class AbcReclassWriter {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public int applyChunk(String classeId, List<String> ids, Date now) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        return em.createQuery(
                "UPDATE TFamille f SET f.lgCLASSEABCID = :cid, f.dtUPDATEDCLASSEABC = :now WHERE f.lgFAMILLEID IN :ids")
                .setParameter("cid", classeId).setParameter("now", now).setParameter("ids", ids).executeUpdate();
    }
}
