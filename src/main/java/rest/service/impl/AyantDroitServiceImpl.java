package rest.service.impl;

import dal.TAyantDroit;
import dal.TUser;
import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.AyantDroitService;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;

/**
 * Consultation des ayants droits en REST. Reprend a l'identique les cles JSON et les filtres de la JSP historique
 * (ayantDroitManagement.getListeAyantDroitByNameClient) avec une vraie pagination SQL au lieu du chargement complet en
 * memoire suivi d'un refresh par ligne.
 */
@Stateless
public class AyantDroitServiceImpl implements AyantDroitService {

    private static final Logger LOG = Logger.getLogger(AyantDroitServiceImpl.class.getName());
    private static final String SUCCESS = commonparameter.PROCESS_SUCCESS;
    private static final String FAILED = commonparameter.PROCESS_FAILED;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject list(TUser user, String search, String clientId, boolean actifs, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            String like = (StringUtils.isBlank(search) ? "" : search.trim()) + "%";
            String client = StringUtils.isBlank(clientId) ? "%%" : clientId;
            String statut = actifs ? commonparameter.statut_enable : commonparameter.statut_disable;
            String where = " FROM TAyantDroit t WHERE t.lgCLIENTID.lgCLIENTID LIKE ?1"
                    + " AND (t.strFIRSTNAME LIKE ?2 OR t.strLASTNAME LIKE ?2 OR t.strNUMEROSECURITESOCIAL LIKE ?2"
                    + " OR t.strCODEINTERNE LIKE ?2) AND t.strSTATUT = ?3";
            long total = em.createQuery("SELECT COUNT(t)" + where, Long.class).setParameter(1, client)
                    .setParameter(2, like).setParameter(3, statut).getSingleResult();
            TypedQuery<TAyantDroit> q = em
                    .createQuery("SELECT t" + where + " ORDER BY t.strFIRSTNAME", TAyantDroit.class)
                    .setParameter(1, client).setParameter(2, like).setParameter(3, statut);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            for (TAyantDroit ad : q.getResultList()) {
                JSONObject row = new JSONObject();
                row.put("lg_AYANTS_DROITS_ID", ad.getLgAYANTSDROITSID());
                row.put("str_CODE_INTERNE", ad.getStrCODEINTERNE());
                row.put("str_FIRST_NAME", ad.getStrFIRSTNAME());
                row.put("str_LAST_NAME", ad.getStrLASTNAME());
                row.put("str_NUMERO_SECURITE_SOCIAL", ad.getStrNUMEROSECURITESOCIAL());
                row.put("str_FIRST_LAST_NAME", ad.getStrFIRSTNAME() + " " + ad.getStrLASTNAME());
                row.put("dt_NAISSANCE", date.DateToString(ad.getDtNAISSANCE(), date.formatterShort));
                row.put("str_SEXE", ad.getStrSEXE());
                if (ad.getLgVILLEID() != null) {
                    row.put("lg_VILLE_ID", ad.getLgVILLEID().getStrName());
                }
                if (ad.getLgRISQUEID() != null) {
                    row.put("lg_RISQUE_ID", ad.getLgRISQUEID().getStrLIBELLERISQUE());
                }
                if (ad.getLgCATEGORIEAYANTDROITID() != null) {
                    row.put("lg_CATEGORIE_AYANTDROIT_ID",
                            ad.getLgCATEGORIEAYANTDROITID().getStrLIBELLECATEGORIEAYANTDROIT());
                }
                if (ad.getLgCLIENTID() != null) {
                    row.put("lg_CLIENT_ID",
                            ad.getLgCLIENTID().getStrFIRSTNAME() + " " + ad.getLgCLIENTID().getStrLASTNAME());
                }
                row.put("str_STATUT", ad.getStrSTATUT());
                row.put("dt_CREATED", date.DateToString(ad.getDtCREATED(), date.formatterShort));
                row.put("dt_UPDATED", date.DateToString(ad.getDtUPDATED(), date.formatterShort));
                results.put(row);
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "list ayants droits", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONObject toggleStatus(TUser user, String ayantDroitId, boolean actif) {
        JSONObject json = new JSONObject();
        try {
            TAyantDroit ayantDroit = em.find(TAyantDroit.class, ayantDroitId);
            if (ayantDroit == null) {
                return json.put("success", FAILED).put("errors", "Ayant droit introuvable");
            }
            ayantDroit.setStrSTATUT(actif ? commonparameter.statut_enable : commonparameter.statut_disable);
            ayantDroit.setDtUPDATED(new Date());
            em.merge(ayantDroit);
            return json.put("success", SUCCESS).put("errors",
                    actif ? "Ayant droit réactivé avec succès" : "Ayant droit désactivé avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleStatus ayant droit", e);
            return json.put("success", FAILED).put("errors", "Impossible de changer le statut de cet ayant droit");
        }
    }
}
