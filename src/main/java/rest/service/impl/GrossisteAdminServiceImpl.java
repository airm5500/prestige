package rest.service.impl;

import dal.TGrossiste;
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
import rest.service.GrossisteAdminService;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;

/**
 * Consultation des grossistes en REST. Reprend a l'identique les cles JSON et les filtres de la JSP historique
 * (grossisteManagement.getListeGrossiste) avec une vraie pagination SQL au lieu du chargement complet en memoire.
 */
@Stateless
public class GrossisteAdminServiceImpl implements GrossisteAdminService {

    private static final Logger LOG = Logger.getLogger(GrossisteAdminServiceImpl.class.getName());
    private static final String SUCCESS = commonparameter.PROCESS_SUCCESS;
    private static final String FAILED = commonparameter.PROCESS_FAILED;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject list(TUser user, String search, boolean actifs, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            String like = (StringUtils.isBlank(search) ? "" : search.trim()) + "%";
            String statut = actifs ? commonparameter.statut_enable : commonparameter.statut_disable;
            String where = " FROM TGrossiste t WHERE (t.strLIBELLE LIKE ?1 OR t.strCODE LIKE ?1)"
                    + " AND t.strSTATUT = ?2";
            long total = em.createQuery("SELECT COUNT(t)" + where, Long.class).setParameter(1, like)
                    .setParameter(2, statut).getSingleResult();
            TypedQuery<TGrossiste> q = em
                    .createQuery("SELECT t" + where + " ORDER BY t.strDESCRIPTION ASC", TGrossiste.class)
                    .setParameter(1, like).setParameter(2, statut);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            for (TGrossiste g : q.getResultList()) {
                JSONObject row = new JSONObject();
                row.put("lg_GROSSISTE_ID", g.getLgGROSSISTEID());
                row.put("str_LIBELLE", g.getStrLIBELLE());
                row.put("str_DESCRIPTION", g.getStrDESCRIPTION());
                row.put("str_ADRESSE_RUE_1", g.getStrADRESSERUE1());
                row.put("str_ADRESSE_RUE_2", g.getStrADRESSERUE2());
                row.put("str_CODE_POSTAL", g.getStrCODEPOSTAL());
                row.put("str_BUREAU_DISTRIBUTEUR", g.getStrBUREAUDISTRIBUTEUR());
                row.put("str_MOBILE", g.getStrMOBILE());
                row.put("str_TELEPHONE", g.getStrTELEPHONE());
                row.put("int_DELAI_REGLEMENT_AUTORISE", g.getIntDELAIREGLEMENTAUTORISE());
                row.put("str_CODE", g.getStrCODE());
                if (g.getGroupeId() != null) {
                    row.put("groupeId", g.getGroupeId().getId() + "");
                }
                row.put("idrepartiteur", g.getIdRepartiteur());
                row.put("str_URL_PHARMAML", g.getStrURLPHARMAML());
                row.put("str_CODE_RECEPTEUR_PHARMA", g.getStrCODERECEPTEURPHARMA());
                row.put("str_ID_RECEPTEUR_PHARMA", g.getStrIDRECEPTEURPHARMA());
                row.put("str_OFFICINE_ID", g.getStrOFFICINEID());
                row.put("dbl_CHIFFRE_DAFFAIRE", g.getDblCHIFFREDAFFAIRE());
                row.put("lg_CUSTOMER_ID", g.getLgGROSSISTEID());
                if (g.getLgTYPEREGLEMENTID() != null) {
                    row.put("lg_TYPE_REGLEMENT_ID", g.getLgTYPEREGLEMENTID().getStrNAME());
                }
                if (g.getLgVILLEID() != null) {
                    row.put("lg_VILLE_ID", g.getLgVILLEID().getStrName());
                }
                row.put("str_STATUT", g.getStrSTATUT());
                row.put("int_DELAI_REAPPROVISIONNEMENT", g.getIntDELAIREAPPROVISIONNEMENT());
                row.put("int_COEF_SECURITY", g.getIntCOEFSECURITY());
                row.put("int_DATE_BUTOIR_ARTICLE", g.getIntDATEBUTOIRARTICLE());
                if (g.getDtCREATED() != null) {
                    row.put("dt_CREATED", date.DateToString(g.getDtCREATED(), date.formatterShort));
                }
                if (g.getDtUPDATED() != null) {
                    row.put("dt_UPDATED", date.DateToString(g.getDtUPDATED(), date.formatterShort));
                }
                results.put(row);
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "list grossistes", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONObject toggleStatus(TUser user, String grossisteId, boolean actif) {
        JSONObject json = new JSONObject();
        try {
            TGrossiste grossiste = em.find(TGrossiste.class, grossisteId);
            if (grossiste == null) {
                return json.put("success", FAILED).put("errors", "Grossiste introuvable");
            }
            grossiste.setStrSTATUT(actif ? commonparameter.statut_enable : commonparameter.statut_disable);
            grossiste.setDtUPDATED(new Date());
            em.merge(grossiste);
            return json.put("success", SUCCESS).put("errors",
                    actif ? "Grossiste réactivé avec succès" : "Grossiste désactivé avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleStatus grossiste", e);
            return json.put("success", FAILED).put("errors", "Impossible de changer le statut de ce grossiste");
        }
    }
}
