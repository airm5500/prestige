package rest.service.impl;

import dal.TAyantDroit;
import dal.TClient;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ClientAdminService;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;

/**
 * Consultation des clients en REST. Reprend a l'identique les cles JSON et les regles de
 * bll.configManagement.clientManagement.getClients, mais remplace les ~5 requetes PAR LIGNE du flux historique (compte,
 * differe, encours tiers payant, tiers payant principal, ayant droit) par une requete groupee PAR PAGE : l'affichage
 * est nettement plus rapide, sans changement de comportement.
 */
@Stateless
public class ClientAdminServiceImpl implements ClientAdminService {

    private static final Logger LOG = Logger.getLogger(ClientAdminServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private String clause(String search, String typeClientId) {
        StringBuilder where = new StringBuilder(" FROM TClient t WHERE t.strSTATUT = ?2");
        if (StringUtils.isNotBlank(search)) {
            where.append(" AND (t.strFIRSTNAME LIKE ?1 OR t.strLASTNAME LIKE ?1")
                    .append(" OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1")
                    .append(" OR CONCAT(t.strLASTNAME,' ',t.strFIRSTNAME) LIKE ?1")
                    .append(" OR t.strNUMEROSECURITESOCIAL LIKE ?1 OR t.strCODEINTERNE LIKE ?1)");
        }
        if (StringUtils.isNotBlank(typeClientId)) {
            where.append(" AND t.lgTYPECLIENTID.lgTYPECLIENTID = ?3");
        }
        return where.toString();
    }

    private void bindClause(TypedQuery<?> query, String search, String typeClientId, String statut) {
        query.setParameter(2, statut);
        if (StringUtils.isNotBlank(search)) {
            query.setParameter(1, search.trim() + "%");
        }
        if (StringUtils.isNotBlank(typeClientId)) {
            query.setParameter(3, typeClientId);
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject listClients(String search, String typeClientId, boolean actifs, boolean btnDelete,
            boolean btnDesactiver, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            String statut = actifs ? commonparameter.statut_enable : commonparameter.statut_disable;
            String where = clause(search, typeClientId);

            TypedQuery<Long> qc = em.createQuery("SELECT COUNT(t)" + where, Long.class);
            bindClause(qc, search, typeClientId, statut);
            long total = qc.getSingleResult();

            TypedQuery<TClient> q = em.createQuery(
                    "SELECT t" + where + " ORDER BY t.lgTYPECLIENTID.strDESCRIPTION ASC, t.strFIRSTNAME ASC",
                    TClient.class);
            bindClause(q, search, typeClientId, statut);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            List<TClient> clients = q.getResultList();

            // ---- Chargements groupes pour la page (au lieu d'une requete par ligne) ----
            List<String> clientIds = new ArrayList<>();
            for (TClient c : clients) {
                clientIds.add(c.getLgCLIENTID());
            }
            Map<String, TCompteClient> compteParClient = new HashMap<>();
            Map<String, Long> differeParCompte = new HashMap<>();
            Map<String, Long> encoursTpParCompte = new HashMap<>();
            Map<String, TCompteClientTiersPayant> tpPrincipalParCompte = new HashMap<>();
            Map<String, TAyantDroit> ayantDroitParClient = new HashMap<>();
            if (!clientIds.isEmpty()) {
                for (TCompteClient compte : em
                        .createQuery("SELECT o FROM TCompteClient o WHERE o.lgCLIENTID.lgCLIENTID IN ?1",
                                TCompteClient.class)
                        .setParameter(1, clientIds).getResultList()) {
                    compteParClient.putIfAbsent(compte.getLgCLIENTID().getLgCLIENTID(), compte);
                }
                List<String> compteIds = new ArrayList<>();
                for (TCompteClient compte : compteParClient.values()) {
                    compteIds.add(compte.getLgCOMPTECLIENTID());
                }
                if (!compteIds.isEmpty()) {
                    for (Object[] r : (List<Object[]>) em
                            .createQuery("SELECT o.lgCOMPTECLIENTID.lgCOMPTECLIENTID, SUM(o.intPRICERESTE)"
                                    + " FROM TPreenregistrementCompteClient o"
                                    + " WHERE o.lgCOMPTECLIENTID.lgCOMPTECLIENTID IN ?1"
                                    + " GROUP BY o.lgCOMPTECLIENTID.lgCOMPTECLIENTID")
                            .setParameter(1, compteIds).getResultList()) {
                        differeParCompte.put(String.valueOf(r[0]), r[1] != null ? ((Number) r[1]).longValue() : 0L);
                    }
                    for (Object[] r : (List<Object[]>) em
                            .createQuery("SELECT p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID,"
                                    + " SUM(p.intPRICERESTE) FROM TPreenregistrementCompteClientTiersPayent p"
                                    + " WHERE p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID IN ?1"
                                    + " AND p.strSTATUTFACTURE <> ?2 AND p.lgPREENREGISTREMENTID.strSTATUT = ?3"
                                    + " AND p.lgPREENREGISTREMENTID.bISCANCEL = false"
                                    + " AND p.lgPREENREGISTREMENTID.intPRICE > 0"
                                    + " GROUP BY p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID")
                            .setParameter(1, compteIds).setParameter(2, commonparameter.statut_paid)
                            .setParameter(3, commonparameter.statut_is_Closed).getResultList()) {
                        encoursTpParCompte.put(String.valueOf(r[0]), r[1] != null ? ((Number) r[1]).longValue() : 0L);
                    }
                    for (TCompteClientTiersPayant tp : em.createQuery(
                            "SELECT o FROM TCompteClientTiersPayant o"
                                    + " WHERE o.lgCOMPTECLIENTID.lgCOMPTECLIENTID IN ?1 AND o.intPRIORITY = 1",
                            TCompteClientTiersPayant.class).setParameter(1, compteIds).getResultList()) {
                        tpPrincipalParCompte.putIfAbsent(tp.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID(), tp);
                    }
                }
                for (TAyantDroit ad : em
                        .createQuery("SELECT o FROM TAyantDroit o WHERE o.lgCLIENTID.lgCLIENTID IN ?1"
                                + " ORDER BY o.dtCREATED ASC", TAyantDroit.class)
                        .setParameter(1, clientIds).getResultList()) {
                    ayantDroitParClient.putIfAbsent(ad.getLgCLIENTID().getLgCLIENTID(), ad);
                }
            }

            // ---- Construction des lignes : memes cles que la JSP historique ----
            for (TClient c : clients) {
                JSONObject row = new JSONObject();
                row.put("BTNDELETE", btnDelete);
                row.put("P_BTN_DESACTIVER_CLIENT", btnDesactiver);

                TCompteClient compte = compteParClient.get(c.getLgCLIENTID());
                String compteId = "";
                if (compte != null) {
                    compteId = compte.getLgCOMPTECLIENTID();
                    int solde = compte.getDecBalance() != null ? compte.getDecBalance().intValue() : 0;
                    row.put("dbl_SOLDE", conversion.AmountFormat(solde, '.'));
                    row.put("dbl_SOLDE_BIS", solde);
                    row.put("dbl_CAUTION", compte.getDblCAUTION());
                    row.put("lg_COMPTE_CLIENT_ID", compteId);
                    long differe = differeParCompte.getOrDefault(compteId, 0L)
                            + encoursTpParCompte.getOrDefault(compteId, 0L);
                    row.put("dbl_total_differe", differe);
                }
                if (c.getRemise() != null) {
                    row.put("remiseId", c.getRemise().getLgREMISEID());
                }

                TCompteClientTiersPayant tp = tpPrincipalParCompte.get(compteId);
                if (tp != null) {
                    row.put("lg_TYPE_TIERS_PAYANT_ID",
                            tp.getLgTIERSPAYANTID().getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT());
                    row.put("lg_TIERS_PAYANT_ID", tp.getLgTIERSPAYANTID().getStrFULLNAME());
                    row.put("int_POURCENTAGE", tp.getIntPOURCENTAGE());
                    row.put("int_PRIORITY", tp.getIntPRIORITY());
                    row.put("dbl_QUOTA_CONSO_MENSUELLE",
                            tp.getDblQUOTACONSOMENSUELLE() != null ? tp.getDblQUOTACONSOMENSUELLE() : 0);
                    row.put("dbl_QUOTA_CONSO_VENTE",
                            tp.getDblQUOTACONSOVENTE() != null ? tp.getDblQUOTACONSOVENTE() : 0);
                    row.put("dbl_PLAFOND", tp.getDblPLAFOND() != null ? tp.getDblPLAFOND() : 0);
                    row.put("db_PLAFOND_ENCOURS", tp.getDbPLAFONDENCOURS() != null ? tp.getDbPLAFONDENCOURS() : 0);
                    row.put("b_IsAbsolute", tp.getBIsAbsolute());
                }

                String categorieAyantDroit = "", risque = "";
                if ("1".equals(c.getLgTYPECLIENTID().getLgTYPECLIENTID())) {
                    TAyantDroit ad = ayantDroitParClient.get(c.getLgCLIENTID());
                    if (ad != null) {
                        categorieAyantDroit = ad.getLgCATEGORIEAYANTDROITID() != null
                                ? ad.getLgCATEGORIEAYANTDROITID().getStrLIBELLECATEGORIEAYANTDROIT() : "";
                        risque = ad.getLgRISQUEID() != null ? ad.getLgRISQUEID().getStrLIBELLERISQUE() : "";
                    }
                }

                row.put("lg_CLIENT_ID", c.getLgCLIENTID());
                row.put("str_CODE_INTERNE", c.getStrCODEINTERNE());
                row.put("str_FIRST_NAME", c.getStrFIRSTNAME());
                row.put("lg_CATEGORY_CLIENT_ID",
                        c.getLgCATEGORYCLIENTID() != null ? c.getLgCATEGORYCLIENTID().getStrLIBELLE() : "");
                row.put("lg_COMPANY_ID", c.getLgCOMPANYID() != null ? c.getLgCOMPANYID().getStrRAISONSOCIALE() : "");
                row.put("str_LAST_NAME", c.getStrLASTNAME());
                row.put("str_FIRST_LAST_NAME", c.getStrFIRSTNAME() + " " + c.getStrLASTNAME());
                row.put("str_NUMERO_SECURITE_SOCIAL", c.getStrNUMEROSECURITESOCIAL());
                row.put("dt_NAISSANCE", date.DateToString(c.getDtNAISSANCE(), date.formatterShort));
                row.put("str_SEXE", c.getStrSEXE());
                row.put("str_ADRESSE", c.getStrADRESSE());
                row.put("str_DOMICILE", c.getStrDOMICILE());
                row.put("str_AUTRE_ADRESSE", c.getStrAUTREADRESSE());
                row.put("str_CODE_POSTAL", c.getStrCODEPOSTAL());
                row.put("str_COMMENTAIRE", c.getStrCOMMENTAIRE());
                row.put("lg_RISQUE_ID", risque);
                if (c.getLgVILLEID() != null) {
                    row.put("lg_VILLE_ID", c.getLgVILLEID().getStrName());
                }
                row.put("lg_CATEGORIE_AYANTDROIT_ID", categorieAyantDroit);
                row.put("lg_TYPE_CLIENT_ID", c.getLgTYPECLIENTID().getStrNAME());
                row.put("str_STATUT", c.getStrSTATUT());
                if (c.getDtCREATED() != null) {
                    row.put("dt_CREATED", date.DateToString(c.getDtCREATED(), date.formatterShort));
                }
                results.put(row);
            }
            return json.put("total", total).put("total_differe", 0).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listClients", e);
            return json.put("total", 0).put("total_differe", 0).put("results", results);
        }
    }
}
