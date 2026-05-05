package rest.service.impl;

import dal.Licence;
import dal.TOfficine;
import dal.enumeration.TypeLience;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.codec.digest.DigestUtils;
import rest.service.LicenceService;
import rest.service.dto.LicenceDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class LicenceServiceImpl implements LicenceService {

    private static final Logger LOG = Logger.getLogger(LicenceServiceImpl.class.getName());
    private static final String KEY = "fabt#e}24=3";
    private static final String SEPARATOR = "#";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public String getLicenceOnly() {
        try {
            TypedQuery<Licence> typedQuery = em.createNamedQuery("Licence.findByTypeLience", Licence.class);
            typedQuery.setMaxResults(1);
            typedQuery.setParameter("typeLicence", TypeLience.MOBILE);
            return typedQuery.getSingleResult().getId();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getMessage());
            return null;
        }
    }

    private TOfficine getOfficine() {
        return em.find(TOfficine.class, Constant.OFFICINE);
    }

    private Licence findLicence() {
        try {
            TypedQuery<Licence> typedQuery = em.createNamedQuery("Licence.findByTypeLience", Licence.class);
            typedQuery.setMaxResults(1);
            typedQuery.setParameter("typeLicence", TypeLience.MOBILE);
            return typedQuery.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getMessage());
            return null;
        }
    }

    @Override
    public Licence getLicence() {
        try {
            TypedQuery<Licence> typedQuery = em.createNamedQuery("Licence.findByTypeLience", Licence.class);
            typedQuery.setMaxResults(1);
            typedQuery.setParameter("typeLicence", TypeLience.MOBILE);
            return typedQuery.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getMessage());
            return null;
        }
    }

    @Override
    public void save(String licence) {
        Licence licenceEntity = findLicence();
        if (licenceEntity != null) {
            em.remove(licenceEntity);
        }
        licenceEntity = new Licence();
        licenceEntity.setId(licence);
        licenceEntity.setTypeLicence(TypeLience.MOBILE);
        em.persist(licenceEntity);
    }

    private String encode(String dataToEncode) {
        return DigestUtils.sha1Hex(dataToEncode);
    }

    @Override
    public String generateLicence(LicenceDTO licence) {
        return encode(licence.getDateFin().concat(SEPARATOR).concat(KEY).concat(licence.getOfficine()));

    }

}
