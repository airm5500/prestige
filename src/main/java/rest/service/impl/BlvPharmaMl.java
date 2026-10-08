package rest.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.persistence.EntityManager;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 08/10 (11) : messages deposes par le grossiste et recuperes au vidage (specification CSRP v4.8).
 * <ul>
 * <li>Bon de livraison valorise (§ 3.2.4) : enregistre, rattache a la commande par Ref_Cde_Client ; il pre-remplit la
 * saisie du bon de livraison (numero, date, montants) et les quantites recues ; ecarts de quantite et de prix
 * signales.</li>
 * <li>Information reglementaire urgente et alerte commerciale (§ 3.2.6, 3.2.7) : enregistrees, affichees jusqu'a prise
 * de connaissance, avec les produits concernes en stock (et les lots recus).</li>
 * </ul>
 */
public final class BlvPharmaMl {

    public static final String STATUT_BLV = "BLV";
    public static final String STATUT_ALERTE = "ALERTE";

    private BlvPharmaMl() {
    }

    /** Le message contient-il un bon de livraison valorise ? (test rapide avant lecture) */
    public static boolean estBlv(String xml) {
        return xml != null && xml.contains("BON_LIVRAISON");
    }

    public static boolean estAlerte(String xml) {
        return xml != null && (xml.contains("ALERTE_REGLEMENTAIRE") || xml.contains("ALERTE_COMMERCIALE"));
    }

    // ------------------------------------------------------------------ BLV

    /** Enregistre le BLV recu ; deja connu (meme grossiste, meme document) : acquitte sans doublon. */
    @SuppressWarnings("unchecked")
    public static JSONObject enregistrerBlv(EntityManager em, String grossisteId, String refMessage, String xml,
            String archive) {
        JSONObject r = new JSONObject().put("refMessage", StringUtils.defaultString(refMessage));
        PharmaMlMessages.Blv b;
        try {
            b = PharmaMlMessages.lireBonLivraison(xml);
        } catch (Exception e) {
            b = null;
        }
        if (b == null) {
            return r.put("statut", PharmaMlServiceImpl.ERREUR).put("resultat",
                    new JSONObject().put("msg", "bon de livraison illisible"));
        }
        String refDoc = StringUtils.defaultIfBlank(b.refLivraison, b.refDocument);
        Number deja = (Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_pharmaml_blv WHERE lg_GROSSISTE_ID = ?1"
                        + " AND IFNULL(str_REF_DOCUMENT, '') = ?2 AND IFNULL(str_REF_LIVRAISON, '') = ?3")
                .setParameter(1, grossisteId).setParameter(2, b.refDocument).setParameter(3, b.refLivraison)
                .getSingleResult();
        if (deja.intValue() > 0) {
            return r.put("statut", "DEJA_TRAITEE").put("resultat", new JSONObject().put("blv", refDoc));
        }
        String refCde = b.refCdeClient;
        if (StringUtils.isBlank(refCde)) {
            for (PharmaMlMessages.LigneBlv l : b.lignes) {
                if (StringUtils.isNotBlank(l.refCdeClient)) {
                    refCde = l.refCdeClient;
                    break;
                }
            }
        }
        String commandeId = commandeDeLaReference(em, grossisteId, refCde);
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO t_pharmaml_blv (lg_ID, lg_GROSSISTE_ID, lg_ORDER_ID, str_REF_MESSAGE,"
                + " str_REF_DOCUMENT, str_REF_LIVRAISON, str_DATE_LIVRAISON, str_REF_FACTURE, str_DATE_FACTURE,"
                + " str_REF_CDE, str_TOURNEE, int_MONTANT_HT, int_MONTANT_TAXES, int_MONTANT_TTC, int_LIGNES, str_ARCHIVE,"
                + " dt_RECU) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, NOW())")
                .setParameter(1, id).setParameter(2, grossisteId).setParameter(3, commandeId)
                .setParameter(4, StringUtils.left(refMessage, 40)).setParameter(5, StringUtils.left(b.refDocument, 40))
                .setParameter(6, StringUtils.left(b.refLivraison, 40))
                .setParameter(7, StringUtils.left(b.dateLivraison, 20))
                .setParameter(8, StringUtils.left(b.refFacture, 40))
                .setParameter(9, StringUtils.left(b.dateFacture, 20)).setParameter(10, StringUtils.left(refCde, 40))
                .setParameter(11, StringUtils.left(b.tournee, 40)).setParameter(12, montantHt(b))
                .setParameter(13, b.montantTaxes).setParameter(14, b.montantTtc).setParameter(15, b.lignes.size())
                .setParameter(16, StringUtils.left(archive, 150)).executeUpdate();
        for (PharmaMlMessages.LigneBlv l : b.lignes) {
            em.createNativeQuery("INSERT INTO t_pharmaml_blv_ligne (lg_ID, lg_BLV_ID, int_NUM, str_CODE_PRODUIT,"
                    + " str_DESIGNATION, lg_FAMILLE_ID, str_REF_CDE, int_QTE_CDE, int_QTE_LIVREE, int_QTE_FACTUREE,"
                    + " int_PRIX, str_NATURE_PRIX, dbl_TAUX_TVA, str_COMMENTAIRE)"
                    + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, id).setParameter(3, l.numLigne)
                    .setParameter(4, StringUtils.left(l.code, 20)).setParameter(5, StringUtils.left(l.designation, 100))
                    .setParameter(6, familleDuCode(em, l.code, grossisteId))
                    .setParameter(7, StringUtils.left(StringUtils.defaultIfBlank(l.refCdeClient, refCde), 40))
                    .setParameter(8, l.quantiteCommandee).setParameter(9, l.quantiteLivree)
                    .setParameter(10, l.quantiteFacturee).setParameter(11, l.prix).setParameter(12, l.naturePrix)
                    .setParameter(13, l.tauxTva).setParameter(14, StringUtils.left(l.commentaire, 255)).executeUpdate();
        }
        String refOrder = "";
        if (commandeId != null) {
            List<Object> o = em.createNativeQuery("SELECT str_REF_ORDER FROM t_order WHERE lg_ORDER_ID = ?1")
                    .setParameter(1, commandeId).getResultList();
            refOrder = o.isEmpty() ? "" : String.valueOf(o.get(0));
        }
        return r.put("statut", PharmaMlServiceImpl.TRAITEE).put("source", STATUT_BLV).put("sourceId", id)
                .put("resultat", new JSONObject().put("blv", refDoc).put("lignes", b.lignes.size())
                        .put("commande", refOrder).put("rattache", commandeId != null));
    }

    /** Montant HT : cumul de valorisation, sinon somme des lignes facturees. */
    static Long montantHt(PharmaMlMessages.Blv b) {
        if (b.montantHt != null) {
            return b.montantHt;
        }
        Long t = null;
        for (PharmaMlMessages.LigneBlv l : b.lignes) {
            if (l.prix != null) {
                t = (t == null ? 0 : t) + l.prix * l.quantiteFacturee;
            }
        }
        return t;
    }

    @SuppressWarnings("unchecked")
    static String commandeDeLaReference(EntityManager em, String grossisteId, String refCde) {
        if (StringUtils.isBlank(refCde)) {
            return null;
        }
        List<Object> l = em.createNativeQuery("SELECT lg_SOURCE_ID FROM t_pharmaml_attente WHERE lg_GROSSISTE_ID = ?1"
                + " AND str_REF_CDE = ?2 AND str_SOURCE = ?3 AND lg_SOURCE_ID IS NOT NULL ORDER BY dt_ENVOI DESC")
                .setParameter(1, grossisteId).setParameter(2, refCde)
                .setParameter(3, PharmaMlServiceImpl.SOURCE_COMMANDE).setMaxResults(1).getResultList();
        return l.isEmpty() ? null : String.valueOf(l.get(0));
    }

    @SuppressWarnings("unchecked")
    static String familleDuCode(EntityManager em, String code, String grossisteId) {
        if (StringUtils.isBlank(code)) {
            return null;
        }
        List<Object> l = em
                .createNativeQuery("SELECT lg_FAMILLE_ID FROM t_famille_grossiste WHERE lg_GROSSISTE_ID = ?1"
                        + " AND str_CODE_ARTICLE = ?2 AND str_STATUT = 'enable'")
                .setParameter(1, grossisteId).setParameter(2, code).setMaxResults(1).getResultList();
        if (l.isEmpty()) {
            l = em.createNativeQuery("SELECT lg_FAMILLE_ID FROM t_famille WHERE (int_CIP = ?1 OR int_EAN13 = ?1)"
                    + " AND str_STATUT = 'enable'").setParameter(1, code).setMaxResults(1).getResultList();
        }
        return l.isEmpty() ? null : String.valueOf(l.get(0));
    }

    /**
     * BLV proposes pour la saisie du bon de livraison d'une commande : ceux rattaches a la commande, puis ceux du meme
     * grossiste non rattaches et non utilises (60 derniers jours).
     */
    @SuppressWarnings("unchecked")
    public static JSONObject blvsCommande(EntityManager em, String commandeId) {
        JSONArray data = new JSONArray();
        List<Object> g = em.createNativeQuery("SELECT lg_GROSSISTE_ID FROM t_order WHERE lg_ORDER_ID = ?1")
                .setParameter(1, commandeId).getResultList();
        if (g.isEmpty()) {
            return new JSONObject().put("success", false).put("data", data);
        }
        List<Object[]> l = em
                .createNativeQuery("SELECT lg_ID, (lg_ORDER_ID = ?1) AS rattache, IFNULL(str_REF_LIVRAISON, ''),"
                        + " IFNULL(str_REF_DOCUMENT, ''), IFNULL(str_DATE_LIVRAISON, ''), IFNULL(str_REF_FACTURE, ''),"
                        + " int_MONTANT_HT, int_MONTANT_TAXES, int_LIGNES, DATE_FORMAT(dt_RECU, '%d/%m/%Y %H:%i'),"
                        + " lg_BON_LIVRAISON_ID IS NOT NULL FROM t_pharmaml_blv WHERE (lg_ORDER_ID = ?1)"
                        + " OR (lg_GROSSISTE_ID = ?2 AND lg_ORDER_ID IS NULL AND lg_BON_LIVRAISON_ID IS NULL"
                        + " AND dt_RECU >= NOW() - INTERVAL 60 DAY) ORDER BY rattache DESC, dt_RECU DESC")
                .setParameter(1, commandeId).setParameter(2, g.get(0)).getResultList();
        for (Object[] x : l) {
            data.put(new JSONObject().put("id", x[0]).put("rattache", entier(x[1]) == 1)
                    .put("refLivraison", StringUtils.defaultIfBlank((String) x[2], (String) x[3]))
                    .put("refDocument", x[3]).put("date", x[4]).put("refFacture", x[5])
                    .put("montantHt", x[6] == null ? JSONObject.NULL : ((Number) x[6]).longValue())
                    .put("montantTaxes", x[7] == null ? JSONObject.NULL : ((Number) x[7]).longValue())
                    .put("lignes", x[8]).put("recu", x[9]).put("utilise", entier(x[10]) == 1));
        }
        return new JSONObject().put("success", true).put("data", data);
    }

    /** Detail d'un BLV rapproche des lignes de la commande : ecarts de quantite et de prix d'achat. */
    @SuppressWarnings("unchecked")
    public static JSONObject detail(EntityManager em, String blvId, String commandeId) {
        List<Object[]> h = em
                .createNativeQuery("SELECT b.lg_ID, IFNULL(b.str_REF_LIVRAISON, ''), IFNULL(b.str_REF_DOCUMENT, ''),"
                        + " IFNULL(b.str_DATE_LIVRAISON, ''), IFNULL(b.str_REF_FACTURE, ''), b.int_MONTANT_HT, b.int_MONTANT_TAXES,"
                        + " b.int_MONTANT_TTC, IFNULL(g.str_LIBELLE, ''), IFNULL(o.str_REF_ORDER, ''), b.lg_ORDER_ID,"
                        + " DATE_FORMAT(b.dt_RECU, '%d/%m/%Y %H:%i'), IFNULL(b.str_TOURNEE, '') FROM t_pharmaml_blv b"
                        + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = b.lg_GROSSISTE_ID"
                        + " LEFT JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE b.lg_ID = ?1")
                .setParameter(1, blvId).getResultList();
        if (h.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Bon de livraison PharmaML introuvable.");
        }
        Object[] e = h.get(0);
        String cde = StringUtils.defaultIfBlank(commandeId, (String) e[10]);
        Map<String, Object[]> commande = new HashMap<>();
        if (cde != null) {
            for (Object[] d : (List<Object[]>) em.createNativeQuery(
                    "SELECT lg_FAMILLE_ID, int_NUMBER, int_PAF_DETAIL FROM t_order_detail" + " WHERE lg_ORDER_ID = ?1")
                    .setParameter(1, cde).getResultList()) {
                commande.put((String) d[0], d);
            }
        }
        JSONArray lignes = new JSONArray();
        int ecartsQte = 0, ecartsPrix = 0, horsCommande = 0;
        for (Object[] x : (List<Object[]>) em.createNativeQuery("SELECT l.int_NUM, IFNULL(l.str_CODE_PRODUIT, ''),"
                + " IFNULL(f.str_NAME, IFNULL(l.str_DESIGNATION, '')), l.lg_FAMILLE_ID, l.int_QTE_CDE, l.int_QTE_LIVREE,"
                + " l.int_QTE_FACTUREE, l.int_PRIX, IFNULL(l.str_NATURE_PRIX, ''), l.dbl_TAUX_TVA,"
                + " IFNULL(l.str_COMMENTAIRE, '') FROM t_pharmaml_blv_ligne l"
                + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID WHERE l.lg_BLV_ID = ?1 ORDER BY l.int_NUM")
                .setParameter(1, blvId).getResultList()) {
            Object[] c = x[3] == null ? null : commande.get((String) x[3]);
            int qteCommandee = c == null ? entier(x[4]) : entier(c[1]);
            int livree = entier(x[5]);
            Long prix = x[7] == null ? null : ((Number) x[7]).longValue();
            Integer paf = c == null || c[2] == null ? null : entier(c[2]);
            boolean ecartQte = livree != qteCommandee;
            boolean ecartPrix = prix != null && paf != null && prix.longValue() != paf.longValue();
            ecartsQte += ecartQte ? 1 : 0;
            ecartsPrix += ecartPrix ? 1 : 0;
            horsCommande += cde != null && c == null ? 1 : 0;
            lignes.put(new JSONObject().put("num", x[0]).put("code", x[1]).put("produit", x[2])
                    .put("connu", x[3] != null).put("qteCommandee", qteCommandee).put("qteLivree", livree)
                    .put("qteFacturee", x[6]).put("prix", prix == null ? JSONObject.NULL : prix).put("naturePrix", x[8])
                    .put("pafCommande", paf == null ? JSONObject.NULL : paf)
                    .put("tva", x[9] == null ? JSONObject.NULL : x[9].toString()).put("commentaire", x[10])
                    .put("ecartQte", ecartQte).put("ecartPrix", ecartPrix)
                    .put("horsCommande", cde != null && c == null));
        }
        return new JSONObject().put("success", true).put("id", e[0])
                .put("refLivraison", StringUtils.defaultIfBlank((String) e[1], (String) e[2])).put("refDocument", e[2])
                .put("date", e[3]).put("refFacture", e[4])
                .put("montantHt", e[5] == null ? JSONObject.NULL : ((Number) e[5]).longValue())
                .put("montantTaxes", e[6] == null ? JSONObject.NULL : ((Number) e[6]).longValue())
                .put("montantTtc", e[7] == null ? JSONObject.NULL : ((Number) e[7]).longValue()).put("grossiste", e[8])
                .put("commande", e[9]).put("recu", e[11]).put("tournee", e[12]).put("lignes", lignes)
                .put("ecartsQte", ecartsQte).put("ecartsPrix", ecartsPrix).put("horsCommande", horsCommande);
    }

    /** Quantites livrees du BLV par produit (somme des lignes, § 3.2.4.4). */
    @SuppressWarnings("unchecked")
    public static Map<String, Integer> quantitesLivrees(EntityManager em, String blvId) {
        Map<String, Integer> m = new HashMap<>();
        if (StringUtils.isBlank(blvId)) {
            return m;
        }
        for (Object[] x : (List<Object[]>) em.createNativeQuery("SELECT lg_FAMILLE_ID, SUM(int_QTE_LIVREE)"
                + " FROM t_pharmaml_blv_ligne WHERE lg_BLV_ID = ?1 AND lg_FAMILLE_ID IS NOT NULL GROUP BY lg_FAMILLE_ID")
                .setParameter(1, blvId).getResultList()) {
            m.put((String) x[0], entier(x[1]));
        }
        return m;
    }

    /** Le BLV a servi a la saisie du bon de livraison : rattache a la commande et au bon. */
    public static void marquerUtilise(EntityManager em, String blvId, String commandeId, String bonId) {
        em.createNativeQuery("UPDATE t_pharmaml_blv SET lg_ORDER_ID = ?2, lg_BON_LIVRAISON_ID = ?3, dt_UTILISE = NOW()"
                + " WHERE lg_ID = ?1").setParameter(1, blvId).setParameter(2, commandeId).setParameter(3, bonId)
                .executeUpdate();
    }

    // ------------------------------------------------------------------ alertes

    /** Enregistre l'alerte recue ; deja connue (meme grossiste, type et numero) : acquittee sans doublon. */
    public static JSONObject enregistrerAlerte(EntityManager em, String grossisteId, String refMessage, String xml,
            String archive) {
        JSONObject r = new JSONObject().put("refMessage", StringUtils.defaultString(refMessage));
        PharmaMlMessages.Alerte a;
        try {
            a = PharmaMlMessages.lireAlerte(xml);
        } catch (Exception e) {
            a = null;
        }
        if (a == null) {
            return r.put("statut", PharmaMlServiceImpl.ERREUR).put("resultat",
                    new JSONObject().put("msg", "alerte illisible"));
        }
        if (StringUtils.isNotBlank(a.numero)) {
            Number deja = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_pharmaml_alerte WHERE lg_GROSSISTE_ID = ?1"
                            + " AND str_TYPE = ?2 AND str_NUMERO = ?3")
                    .setParameter(1, grossisteId).setParameter(2, a.type).setParameter(3, a.numero).getSingleResult();
            if (deja.intValue() > 0) {
                return r.put("statut", "DEJA_TRAITEE").put("resultat", new JSONObject().put("alerte", a.numero));
            }
        }
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO t_pharmaml_alerte (lg_ID, lg_GROSSISTE_ID, str_TYPE, str_NUMERO, str_MOTIF,"
                + " str_DESIGNATION, b_ARRET_IMMEDIAT, b_RENVOI, str_DATE_LIMITE, str_INSTRUCTIONS, str_ANNEXE,"
                + " str_REF_MESSAGE, str_ARCHIVE, dt_RECU) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, NOW())")
                .setParameter(1, id).setParameter(2, grossisteId).setParameter(3, a.type)
                .setParameter(4, StringUtils.left(a.numero, 40)).setParameter(5, StringUtils.left(a.motif, 255))
                .setParameter(6, StringUtils.left(a.designation, 255)).setParameter(7, a.arretImmediat ? 1 : 0)
                .setParameter(8, a.renvoi ? 1 : 0).setParameter(9, StringUtils.left(a.dateLimiteReprise, 20))
                .setParameter(10, StringUtils.left(a.commentaireInstructions, 4000))
                .setParameter(11, StringUtils.left(a.commentaireAnnexe, 4000))
                .setParameter(12, StringUtils.left(refMessage, 40)).setParameter(13, StringUtils.left(archive, 150))
                .executeUpdate();
        for (PharmaMlMessages.ProduitAlerte p : a.produits) {
            em.createNativeQuery("INSERT INTO t_pharmaml_alerte_produit (lg_ID, lg_ALERTE_ID, str_CODE_PRODUIT,"
                    + " str_DESIGNATION, str_FABRICANT, str_LOTS, lg_FAMILLE_ID) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, id)
                    .setParameter(3, StringUtils.left(p.code, 20)).setParameter(4, StringUtils.left(p.designation, 100))
                    .setParameter(5, StringUtils.left(p.fabricant, 100))
                    .setParameter(6, StringUtils.left(String.join(",", p.lots), 1000))
                    .setParameter(7, familleDuCode(em, p.code, grossisteId)).executeUpdate();
        }
        return r.put("statut", PharmaMlServiceImpl.TRAITEE).put("source", STATUT_ALERTE).put("sourceId", id)
                .put("resultat", new JSONObject().put("alerte", StringUtils.defaultIfBlank(a.numero, a.designation))
                        .put("type", a.type).put("produits", a.produits.size()));
    }

    /**
     * Alertes : non lues d'abord. Chaque produit donne son stock (emplacement principal) et, si l'alerte cite des lots,
     * le stock des lots recus correspondants.
     */
    @SuppressWarnings("unchecked")
    public static JSONObject alertes(EntityManager em, boolean nonLuesSeulement) {
        JSONArray data = new JSONArray();
        List<Object[]> l = em
                .createNativeQuery("SELECT a.lg_ID, a.str_TYPE, IFNULL(a.str_NUMERO, ''), IFNULL(a.str_MOTIF, ''),"
                        + " IFNULL(a.str_DESIGNATION, ''), a.b_ARRET_IMMEDIAT, a.b_RENVOI, IFNULL(a.str_DATE_LIMITE, ''),"
                        + " IFNULL(a.str_INSTRUCTIONS, ''), IFNULL(a.str_ANNEXE, ''), DATE_FORMAT(a.dt_RECU, '%d/%m/%Y %H:%i'),"
                        + " IFNULL(DATE_FORMAT(a.dt_LU, '%d/%m/%Y %H:%i'), ''), IFNULL(a.str_LU_PAR, ''), IFNULL(g.str_LIBELLE, '')"
                        + " FROM t_pharmaml_alerte a LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = a.lg_GROSSISTE_ID"
                        + (nonLuesSeulement ? " WHERE a.dt_LU IS NULL" : "")
                        + " ORDER BY (a.dt_LU IS NULL) DESC, a.dt_RECU DESC LIMIT 200")
                .getResultList();
        int nonLues = 0;
        for (Object[] x : l) {
            JSONArray produits = new JSONArray();
            int enStock = 0;
            for (Object[] p : (List<Object[]>) em.createNativeQuery("SELECT IFNULL(p.str_CODE_PRODUIT, ''),"
                    + " IFNULL(f.str_NAME, IFNULL(p.str_DESIGNATION, '')), IFNULL(p.str_LOTS, ''), p.lg_FAMILLE_ID,"
                    + " IFNULL((SELECT SUM(s.int_NUMBER_AVAILABLE) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = p.lg_FAMILLE_ID"
                    + " AND s.lg_EMPLACEMENT_ID = '1'), 0), IFNULL(p.str_FABRICANT, '') FROM t_pharmaml_alerte_produit p"
                    + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID WHERE p.lg_ALERTE_ID = ?1")
                    .setParameter(1, x[0]).getResultList()) {
                int stock = entier(p[4]);
                List<String> lots = StringUtils.isBlank((String) p[2]) ? new ArrayList<>()
                        : Arrays.asList(((String) p[2]).split(","));
                JSONArray lotsRecus = new JSONArray();
                if (p[3] != null && !lots.isEmpty()) {
                    for (Object[] lot : (List<Object[]>) em
                            .createNativeQuery("SELECT int_NUM_LOT, IFNULL(SUM(current_stock), 0)"
                                    + " FROM t_lot WHERE lg_FAMILLE_ID = ?1 AND int_NUM_LOT IN ?2 GROUP BY int_NUM_LOT")
                            .setParameter(1, p[3]).setParameter(2, lots).getResultList()) {
                        lotsRecus.put(new JSONObject().put("lot", lot[0]).put("stock", entier(lot[1])));
                    }
                }
                enStock += stock > 0 ? 1 : 0;
                produits.put(new JSONObject().put("code", p[0]).put("produit", p[1]).put("lots", new JSONArray(lots))
                        .put("connu", p[3] != null).put("stock", stock).put("lotsRecus", lotsRecus)
                        .put("fabricant", p[5]));
            }
            boolean lue = !((String) x[11]).isEmpty();
            nonLues += lue ? 0 : 1;
            data.put(new JSONObject().put("id", x[0]).put("type", x[1]).put("numero", x[2]).put("motif", x[3])
                    .put("designation", x[4]).put("arretImmediat", entier(x[5]) == 1).put("renvoi", entier(x[6]) == 1)
                    .put("dateLimite", x[7]).put("instructions", x[8]).put("annexe", x[9]).put("recu", x[10])
                    .put("lu", x[11]).put("luPar", x[12]).put("grossiste", x[13]).put("produits", produits)
                    .put("produitsEnStock", enStock));
        }
        return new JSONObject().put("success", true).put("data", data).put("nonLues", nonLues);
    }

    /** Prise de connaissance (qui, quand) : l'alerte quitte le bandeau. */
    public static JSONObject marquerLue(EntityManager em, String alerteId, String utilisateur) {
        int n = em
                .createNativeQuery("UPDATE t_pharmaml_alerte SET dt_LU = NOW(), str_LU_PAR = ?2"
                        + " WHERE lg_ID = ?1 AND dt_LU IS NULL")
                .setParameter(1, alerteId).setParameter(2, StringUtils.left(utilisateur, 100)).executeUpdate();
        return new JSONObject().put("success", n > 0).put("msg",
                n > 0 ? "Prise de connaissance enregistrée." : "Alerte déjà lue ou introuvable.");
    }

    private static int entier(Object o) {
        if (o instanceof Boolean) {
            return ((Boolean) o) ? 1 : 0;
        }
        return o == null ? 0 : ((Number) o).intValue();
    }
}
