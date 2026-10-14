package rest.service.impl;

import commonTasks.dto.ProduitExtraInfoDTO;
import dal.TClasseAbc;
import dal.TFamille;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TemporalType;
import rest.service.ProduitExtraInfoCles;
import rest.service.ProduitExtraInfoService;
import util.DateUtil;

/**
 * Infos complementaires d'un produit : derniere vente (date + qte totale vendue ce jour), dernier achat (date + qte
 * totale entree ce jour), dernier inventaire clot (date + qte comptee), code geo, classe ABC et, si le produit gere un
 * stock reserve, le stock reserve avec ses seuils. La derniere vente, le dernier inventaire et le stock reserve sont
 * calcules sur l'emplacement fourni.
 */
@Stateless
public class ProduitExtraInfoServiceImpl implements ProduitExtraInfoService {

    private static final Logger LOG = Logger.getLogger(ProduitExtraInfoServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public ProduitExtraInfoDTO getExtraInfo(String familleId, String emplacementId) {
        ProduitExtraInfoDTO extra = new ProduitExtraInfoDTO();
        TFamille famille = em.find(TFamille.class, familleId);
        if (famille == null) {
            return extra;
        }
        extra.setCodeGeoArticle(famille.getStrCODEGEOARTICLE());

        // Classe ABC du produit
        if (famille.getLgCLASSEABCID() != null) {
            TClasseAbc classeAbc = em.find(TClasseAbc.class, famille.getLgCLASSEABCID());
            if (classeAbc != null) {
                extra.setClasse(classeAbc.getStrCODE());
            }
        }

        // Derniere vente : date + quantite totale vendue a cette date
        try {
            List<Date> lastVente = em
                    .createQuery("SELECT o.lgPREENREGISTREMENTID.dtUPDATED FROM TPreenregistrementDetail o "
                            + "WHERE o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' "
                            + "AND o.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?1 "
                            + "AND o.lgFAMILLEID.lgFAMILLEID=?2 ORDER BY o.lgPREENREGISTREMENTID.dtUPDATED DESC",
                            Date.class)
                    .setParameter(1, emplacementId).setParameter(2, familleId).setMaxResults(1).getResultList();
            if (!lastVente.isEmpty()) {
                Date dateVente = lastVente.get(0);
                extra.setDateDerniereVente(DateUtil.convertDateToDD_MM_YYYY(dateVente));
                Number qteVente = (Number) em
                        .createQuery("SELECT COALESCE(SUM(o.intQUANTITY),0) FROM TPreenregistrementDetail o "
                                + "WHERE o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' "
                                + "AND o.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?1 "
                                + "AND o.lgFAMILLEID.lgFAMILLEID=?2 "
                                + "AND FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtUPDATED)=?3")
                        .setParameter(1, emplacementId).setParameter(2, familleId)
                        .setParameter(3, new java.sql.Date(dateVente.getTime()), TemporalType.DATE).getSingleResult();
                extra.setQteDerniereVente(qteVente != null ? qteVente.intValue() : 0);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "extraInfo derniere vente {0} : {1}", new Object[] { familleId, e.toString() });
        }

        // Dernier achat : date + quantite totale entree a cette date
        try {
            List<Date> lastAchat = em.createQuery(
                    "SELECT o.lgBONLIVRAISONID.dtUPDATED FROM TBonLivraisonDetail o "
                            + "WHERE o.lgFAMILLEID.lgFAMILLEID=?1 ORDER BY o.lgBONLIVRAISONID.dtUPDATED DESC",
                    Date.class).setParameter(1, familleId).setMaxResults(1).getResultList();
            if (!lastAchat.isEmpty()) {
                Date dateAchat = lastAchat.get(0);
                extra.setDateDernierAchat(DateUtil.convertDateToDD_MM_YYYY(dateAchat));
                Number qteAchat = (Number) em
                        .createQuery("SELECT COALESCE(SUM(o.intQTERECUE),0) FROM TBonLivraisonDetail o "
                                + "WHERE o.lgFAMILLEID.lgFAMILLEID=?1 "
                                + "AND FUNCTION('DATE',o.lgBONLIVRAISONID.dtUPDATED)=?2")
                        .setParameter(1, familleId)
                        .setParameter(2, new java.sql.Date(dateAchat.getTime()), TemporalType.DATE).getSingleResult();
                extra.setQteDernierAchat(qteAchat != null ? qteAchat.intValue() : 0);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "extraInfo dernier achat {0} : {1}", new Object[] { familleId, e.toString() });
        }

        // Dernier inventaire clot : date + quantite comptee
        try {
            List<Object[]> lastInv = em
                    .createQuery("SELECT o.dtUPDATED, o.intNUMBER FROM TInventaireFamille o "
                            + "WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.boolINVENTAIRE=true "
                            + "AND o.lgINVENTAIREID.strSTATUT='is_Closed' "
                            + "AND o.lgINVENTAIREID.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 ORDER BY o.dtUPDATED DESC",
                            Object[].class)
                    .setParameter(1, familleId).setParameter(2, emplacementId).setMaxResults(1).getResultList();
            if (!lastInv.isEmpty()) {
                Object[] inv = lastInv.get(0);
                if (inv[0] != null) {
                    extra.setDateDernierInventaire(DateUtil.convertDateToDD_MM_YYYY((Date) inv[0]));
                }
                extra.setQteDernierInventaire(inv[1] != null ? ((Number) inv[1]).intValue() : 0);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "extraInfo dernier inventaire {0} : {1}", new Object[] { familleId, e.toString() });
        }

        // Stock reserve (t_type_stock_famille type 2) + seuils, uniquement si le produit est en reserve
        if (Boolean.TRUE.equals(famille.getBoolRESERVE())) {
            extra.setSeuilReserve(famille.getIntSEUILRESERVE());
            extra.setSeuilMiniRayon(famille.getIntSEUILMINIRAYON());
            try {
                Object reserve = em.createNativeQuery("SELECT tsf.int_NUMBER FROM t_type_stock_famille tsf "
                        + "WHERE tsf.lg_TYPE_STOCK_ID='2' AND tsf.lg_FAMILLE_ID=?1 AND tsf.lg_EMPLACEMENT_ID=?2")
                        .setParameter(1, familleId).setParameter(2, emplacementId != null ? emplacementId : "")
                        .setMaxResults(1).getSingleResult();
                extra.setStockReserve(reserve != null ? ((Number) reserve).intValue() : 0);
            } catch (Exception e) {
                extra.setStockReserve(0);
            }
        }
        return extra;
    }

    /** Nombre d'identifiants par requete groupee (clause IN). */
    private static final int TRANCHE = 500;

    @Override
    public Map<String, ProduitExtraInfoDTO> getExtraInfos(Collection<String[]> cles) {
        Map<String, ProduitExtraInfoDTO> resultat = new HashMap<>();
        Set<String> ids = new LinkedHashSet<>();
        cles.forEach(c -> ids.add(c[0]));
        List<String> liste = new ArrayList<>(ids);
        Map<String, Object[]> familles = new HashMap<>();
        Map<String, Object[]> ventes = new HashMap<>();
        Map<String, Object[]> achats = new HashMap<>();
        Map<String, Object[]> inventaires = new HashMap<>();
        Map<String, Number> reserves = new HashMap<>();
        for (int i = 0; i < liste.size(); i += TRANCHE) {
            List<String> tranche = liste.subList(i, Math.min(i + TRANCHE, liste.size()));
            lignes(REQ_FAMILLES, tranche).forEach(r -> familles.put((String) r[0], r));
            lignes(REQ_VENTES, tranche)
                    .forEach(r -> ventes.put(ProduitExtraInfoCles.cle((String) r[0], (String) r[1]), r));
            lignes(REQ_ACHATS, tranche).forEach(r -> achats.put((String) r[0], r));
            lignes(REQ_INVENTAIRES, tranche)
                    .forEach(r -> inventaires.put(ProduitExtraInfoCles.cle((String) r[0], (String) r[1]), r));
            lignes(REQ_RESERVES, tranche).forEach(
                    r -> reserves.putIfAbsent(ProduitExtraInfoCles.cle((String) r[0], (String) r[1]), (Number) r[2]));
        }
        for (String[] c : cles) {
            String familleId = c[0];
            String emplacementId = c[1];
            String cle = ProduitExtraInfoCles.cle(familleId, emplacementId);
            ProduitExtraInfoDTO extra = new ProduitExtraInfoDTO();
            resultat.put(cle, extra);
            Object[] f = familles.get(familleId);
            if (f == null) {
                continue;
            }
            extra.setCodeGeoArticle((String) f[1]);
            extra.setClasse((String) f[2]);
            Object[] v = ventes.get(cle);
            if (v != null) {
                extra.setDateDerniereVente(DateUtil.convertDateToDD_MM_YYYY(date(v[2])));
                extra.setQteDerniereVente(entier(v[3]));
            }
            Object[] a = achats.get(familleId);
            if (a != null) {
                extra.setDateDernierAchat(DateUtil.convertDateToDD_MM_YYYY(date(a[1])));
                extra.setQteDernierAchat(entier(a[2]));
            }
            Object[] inv = inventaires.get(cle);
            if (inv != null) {
                if (inv[2] != null) {
                    extra.setDateDernierInventaire(DateUtil.convertDateToDD_MM_YYYY(date(inv[2])));
                }
                extra.setQteDernierInventaire(entier(inv[3]));
            }
            if (vrai(f[3])) {
                extra.setSeuilReserve(f[4] != null ? ((Number) f[4]).intValue() : null);
                extra.setSeuilMiniRayon(f[5] != null ? ((Number) f[5]).intValue() : null);
                Number reserve = reserves
                        .get(ProduitExtraInfoCles.cle(familleId, emplacementId != null ? emplacementId : ""));
                extra.setStockReserve(reserve != null ? reserve.intValue() : 0);
            }
        }
        return resultat;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, List<String> ids) {
        return em.createNativeQuery(sql).setParameter("ids", ids).getResultList();
    }

    private static Date date(Object o) {
        if (o instanceof java.time.LocalDateTime) {
            return java.sql.Timestamp.valueOf((java.time.LocalDateTime) o);
        }
        return (Date) o;
    }

    /** bool_RESERVE : BIT(1) lu en Boolean, ou nombre selon le pilote. */
    private static boolean vrai(Object o) {
        return o instanceof Boolean ? (Boolean) o : o instanceof Number && ((Number) o).intValue() != 0;
    }

    private static int entier(Object o) {
        return o != null ? ((Number) o).intValue() : 0;
    }

    private static final String REQ_FAMILLES = "SELECT f.lg_FAMILLE_ID, f.str_CODE_GEO_ARTICLE, c.str_CODE, "
            + "f.bool_RESERVE, f.int_SEUIL_RESERVE, f.int_SEUIL_MINI_RAYON FROM t_famille f "
            + "LEFT JOIN t_classe_abc c ON c.lg_CLASSE_ABC_ID = f.lg_CLASSE_ABC_ID WHERE f.lg_FAMILLE_ID IN (:ids)";

    /**
     * Derniere vente cloturee par produit et emplacement du vendeur, et quantite totale vendue ce jour-la.
     * <p>
     * Retour du 14/10 (3 ans de donnees : v1/info 57 s) : un seul passage sur les lignes de vente, regroupees par
     * produit, emplacement et jour, puis le jour le plus recent. Avant, chaque produit relisait toutes ses lignes une
     * seconde fois pour la quantite du dernier jour (DATE(...) = DATE(...), sans index). Memes lignes, memes valeurs.
     */
    private static final String REQ_VENTES = "SELECT x.f, x.e, x.dmax, x.qte FROM (SELECT j.f, j.e, MAX(j.dt) dmax, "
            + "SUM(j.q) qte, ROW_NUMBER() OVER (PARTITION BY j.f, j.e ORDER BY MAX(j.dt) DESC) rn FROM ("
            + "SELECT d.lg_FAMILLE_ID f, u.lg_EMPLACEMENT_ID e, v.dt_UPDATED dt, d.int_QUANTITY q "
            + "FROM t_preenregistrement_detail d "
            + "JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID "
            + "JOIN t_user u ON u.lg_USER_ID = v.lg_USER_ID "
            + "WHERE v.str_STATUT = 'is_Closed' AND d.lg_FAMILLE_ID IN (:ids) AND u.lg_EMPLACEMENT_ID IS NOT NULL) j "
            + "GROUP BY j.f, j.e, DATE(j.dt)) x WHERE x.rn = 1";

    /** Dernier bon de livraison par produit, et quantite totale recue ce jour-la. */
    private static final String REQ_ACHATS = "SELECT m.f, m.dmax, (SELECT COALESCE(SUM(d.int_QTE_RECUE), 0) "
            + "FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID "
            + "WHERE d.lg_FAMILLE_ID = m.f AND DATE(b.dt_UPDATED) = DATE(m.dmax)) FROM ("
            + "SELECT d.lg_FAMILLE_ID f, MAX(b.dt_UPDATED) dmax FROM t_bon_livraison_detail d "
            + "JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID "
            + "WHERE d.lg_FAMILLE_ID IN (:ids) GROUP BY d.lg_FAMILLE_ID) m";

    /** Dernier comptage d'un inventaire clos, par produit et emplacement de l'inventaire. */
    private static final String REQ_INVENTAIRES = "SELECT m.f, m.e, m.dmax, (SELECT o.int_NUMBER "
            + "FROM t_inventaire_famille o JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = o.lg_INVENTAIRE_ID "
            + "WHERE o.lg_FAMILLE_ID = m.f AND i.lg_EMPLACEMENT_ID = m.e AND o.bool_INVENTAIRE = 1 "
            + "AND i.str_STATUT = 'is_Closed' ORDER BY o.dt_UPDATED DESC LIMIT 1) FROM ("
            + "SELECT o.lg_FAMILLE_ID f, i.lg_EMPLACEMENT_ID e, MAX(o.dt_UPDATED) dmax "
            + "FROM t_inventaire_famille o JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = o.lg_INVENTAIRE_ID "
            + "WHERE o.lg_FAMILLE_ID IN (:ids) AND o.bool_INVENTAIRE = 1 AND i.str_STATUT = 'is_Closed' "
            + "AND i.lg_EMPLACEMENT_ID IS NOT NULL GROUP BY o.lg_FAMILLE_ID, i.lg_EMPLACEMENT_ID) m";

    private static final String REQ_RESERVES = "SELECT tsf.lg_FAMILLE_ID, tsf.lg_EMPLACEMENT_ID, tsf.int_NUMBER "
            + "FROM t_type_stock_famille tsf WHERE tsf.lg_TYPE_STOCK_ID = '2' AND tsf.lg_FAMILLE_ID IN (:ids)";
}
