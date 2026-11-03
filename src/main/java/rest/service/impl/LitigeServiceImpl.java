package rest.service.impl;

import dal.TCompteClientTiersPayant;
import dal.TFacture;
import dal.TFactureDetail;
import dal.TLitige;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTypelitige;
import dal.TUser;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.LockModeType;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.LitigeService;
import toolkits.parameters.commonparameter;

/**
 * Litiges tiers payant (audit 05 LI-01..08, notice litiges L1..L5). Remplace LitigeManager et PrestigeLitige (les JSP
 * restent dans le depot, hors du circuit de l'ecran).
 * <ul>
 * <li>creation : dossier eligible seulement, litige complet (type, montants, dossier, auteur, date), dossier passe
 * 'is_Litige' en gardant son etat d'avant ; la date du dossier n'est pas touchee (elle place le dossier dans la periode
 * de facturation) ;</li>
 * <li>annulation : litige 'delete', dossier remis dans son etat d'avant ;</li>
 * <li>cloture, une seule fois : dossier non facture = part organisme ramenee au montant accorde et refacturable (ou
 * sortie definitive si rien n'est accorde), encours du compte client diminue de l'ecart ; dossier facture = restant du
 * a recouvrer de la ligne de facture et de la facture diminue de l'ecart.</li>
 * </ul>
 */
@Stateless
public class LitigeServiceImpl implements LitigeService {

    private static final Logger LOG = Logger.getLogger(LitigeServiceImpl.class.getName());
    private static final String SUCCESS = commonparameter.PROCESS_SUCCESS;
    private static final String FAILED = commonparameter.PROCESS_FAILED;
    static final String OUVERT = "enable";
    static final String CLOS = "is_Closed";
    static final String ANNULE = "delete";
    static final String EN_LITIGE = "is_Litige";
    static final String NON_FACTURE = "unpaid";
    static final String FACTURE = "charged";
    /** dossier non facture sorti definitivement de la facturation (rien accorde par l'organisme) */
    static final String ABANDONNE = "is_Closed";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static String fmt(Date d) {
        return d == null ? "" : new SimpleDateFormat("dd/MM/yyyy HH:mm").format(d);
    }

    private static JSONObject echec(String message) {
        return new JSONObject().put("success", FAILED).put("errors", message);
    }

    private static int entier(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    private static String texte(Object o) {
        return o == null ? "" : o.toString();
    }

    @Override
    public JSONObject types() {
        JSONArray data = new JSONArray();
        em.createQuery("SELECT t FROM TTypelitige t WHERE t.strSTATUT = 'enable' ORDER BY t.strNAME", TTypelitige.class)
                .getResultList().forEach(t -> data.put(new JSONObject().put("lg_TYPELITIGE_ID", t.getLgTYPELITIGEID())
                        .put("str_NAME", t.getStrNAME()).put("str_DESCRIPTION", t.getStrDESCRIPTION())));
        return new JSONObject().put("success", SUCCESS).put("data", data).put("total", data.length());
    }

    @Override
    public JSONObject liste(String search, String typeId, String filtre, int start, int limit) {
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        List<Object> params = new ArrayList<>();
        String f = StringUtils.defaultIfBlank(filtre, "ouverts");
        switch (f) {
        case "clos":
            where.append(" AND l.str_STATUT = 'is_Closed'");
            break;
        case "annules":
            where.append(" AND l.str_STATUT = 'delete'");
            break;
        case "tous":
            break;
        default:
            where.append(" AND l.str_STATUT = 'enable'");
        }
        if (StringUtils.isNotBlank(typeId)) {
            params.add(typeId);
            where.append(" AND l.lg_TYPELITIGE_ID = ?").append(params.size());
        }
        if (StringUtils.isNotBlank(search)) {
            params.add("%" + search.trim() + "%");
            int i = params.size();
            where.append(" AND (l.str_REFERENCE_VENTE_LITIGE LIKE ?").append(i).append(" OR l.str_CLIENT_NAME LIKE ?")
                    .append(i).append(" OR l.str_LIBELLE_LITIGE LIKE ?").append(i).append(" OR c.str_REF_BON LIKE ?")
                    .append(i).append(" OR tp.str_FULLNAME LIKE ?").append(i).append(")");
        }
        String from = " FROM t_litige l LEFT JOIN t_typelitige t ON t.lg_TYPELITIGE_ID = l.lg_TYPELITIGE_ID"
                + " LEFT JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID"
                + " LEFT JOIN t_preenregistrement_compte_client_tiers_payent c"
                + " ON c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = l.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID";
        Query total = em.createNativeQuery("SELECT COUNT(*)" + from + where);
        Query q = em.createNativeQuery("SELECT l.lg_LITIGE_ID, l.dt_CREATED_LITIGE, t.str_NAME, tp.str_FULLNAME,"
                + " l.str_CLIENT_NAME, l.str_REFERENCE_VENTE_LITIGE, c.str_REF_BON, l.str_LIBELLE_LITIGE,"
                + " l.str_ETAT_LITIGE, l.str_CONSEQUENCE_LITIGE, l.str_STATUT, l.int_AMOUNT_TOTAL_LITIGE,"
                + " l.int_AMOUNT_DUS_LITIGE, l.int_AMOUNT_PAYE_LITIGE, l.int_ECART, l.dt_CLOTURE, l.str_MOTIF_CLOTURE,"
                + " l.str_STATUT_FACTURE_AVANT, l.lg_TYPELITIGE_ID, l.lg_TIERS_PAYANT_ID, l.str_DESCRIPTION_LITIGE,"
                + " l.str_COMMENTAIRE_LITIGE, l.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID" + from + where
                + " ORDER BY l.dt_CREATED_LITIGE DESC, l.lg_LITIGE_ID DESC");
        for (int i = 0; i < params.size(); i++) {
            total.setParameter(i + 1, params.get(i));
            q.setParameter(i + 1, params.get(i));
        }
        q.setFirstResult(Math.max(0, start)).setMaxResults(limit > 0 ? limit : 20);
        JSONArray data = new JSONArray();
        for (Object o : q.getResultList()) {
            Object[] r = (Object[]) o;
            data.put(new JSONObject().put("lg_LITIGE_ID", r[0]).put("dt_CREATED", fmt((Date) r[1]))
                    .put("str_TYPE", texte(r[2])).put("str_TIERS_PAYANT", texte(r[3])).put("str_CLIENT", texte(r[4]))
                    .put("str_REF_VENTE", texte(r[5])).put("str_REF_BON", texte(r[6])).put("str_LIBELLE", texte(r[7]))
                    .put("str_ETAT", texte(r[8])).put("str_CONSEQUENCE", texte(r[9])).put("str_STATUT", texte(r[10]))
                    .put("int_PART_ORIGINE", r[11] == null ? JSONObject.NULL : r[11])
                    .put("int_MONTANT_CONTESTE", r[12] == null ? JSONObject.NULL : r[12])
                    .put("int_MONTANT_ACCORDE", r[13] == null ? JSONObject.NULL : r[13])
                    .put("int_ECART", r[14] == null ? JSONObject.NULL : r[14]).put("dt_CLOTURE", fmt((Date) r[15]))
                    .put("str_MOTIF_CLOTURE", texte(r[16])).put("b_FACTURE", FACTURE.equals(r[17]))
                    .put("lg_TYPELITIGE_ID", texte(r[18])).put("lg_TIERS_PAYANT_ID", texte(r[19]))
                    .put("str_DESCRIPTION", texte(r[20])).put("str_COMMENTAIRE", texte(r[21]))
                    .put("lg_DOSSIER_ID", texte(r[22])));
        }
        return new JSONObject().put("success", SUCCESS).put("data", data).put("total", entier(total.getSingleResult()));
    }

    /** conditions SQL d'un dossier eligible (alias c dossier, p vente) */
    private static final String ELIGIBLE = " p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + " AND c.int_PRICE > 0 AND ((c.str_STATUT_FACTURE = 'unpaid')" + " OR (c.str_STATUT_FACTURE = 'charged'"
            + " AND EXISTS (SELECT 1 FROM t_facture_detail fd JOIN t_facture f ON f.lg_FACTURE_ID = fd.lg_FACTURE_ID"
            + " WHERE fd.str_REF = c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID AND IFNULL(f.str_STATUT, '') <> 'avoir')"
            + " AND NOT EXISTS (SELECT 1 FROM t_facture_detail fd JOIN t_facture f ON f.lg_FACTURE_ID = fd.lg_FACTURE_ID"
            + " WHERE fd.str_REF = c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID AND IFNULL(f.str_STATUT, '') <> 'avoir'"
            + " AND (IFNULL(fd.dbl_MONTANT_PAYE, 0) > 0 OR EXISTS (SELECT 1 FROM t_dossier_reglement_detail d"
            + " WHERE d.lg_FACTURE_DETAIL_ID = fd.lg_FACTURE_DETAIL_ID)))))";

    @Override
    public JSONObject dossiers(String tiersPayantId, String compteClientTiersPayantId, String search, int start,
            int limit) {
        /*
         * tiers payant obligatoire : sans lui, la recherche parcourt tous les dossiers de l'officine (plus de 45 s sur
         * trois ans de donnees). Deux branches ciblees : dossiers non factures du tiers payant ; lignes sans reglement
         * des factures qui ont encore un restant du (on part des factures, pas des dossiers).
         */
        if (StringUtils.isBlank(tiersPayantId)) {
            return new JSONObject().put("success", SUCCESS).put("data", new JSONArray()).put("total", 0).put("message",
                    "Choisissez d'abord le tiers payant");
        }
        StringBuilder filtre = new StringBuilder(" AND cc.lg_TIERS_PAYANT_ID = ?1");
        List<Object> params = new ArrayList<>();
        params.add(tiersPayantId);
        if (StringUtils.isNotBlank(compteClientTiersPayantId)) {
            params.add(compteClientTiersPayantId);
            filtre.append(" AND cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = ?").append(params.size());
        }
        if (StringUtils.isNotBlank(search)) {
            params.add("%" + search.trim() + "%");
            int i = params.size();
            filtre.append(" AND (p.str_REF LIKE ?").append(i).append(" OR c.str_REF_BON LIKE ?").append(i)
                    .append(" OR CONCAT_WS(' ', cl.str_FIRST_NAME, cl.str_LAST_NAME) LIKE ?").append(i).append(")");
        }
        String colonnes = "SELECT c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID AS id, p.str_REF AS ref, c.str_REF_BON AS bon,"
                + " p.dt_UPDATED AS dt, c.int_PRICE AS part, c.str_STATUT_FACTURE AS statut, tp.str_FULLNAME AS tp,"
                + " cc.lg_TIERS_PAYANT_ID AS tpid, CONCAT_WS(' ', cl.str_FIRST_NAME, cl.str_LAST_NAME) AS client, ";
        String suite = " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID"
                + " JOIN t_compte_client_tiers_payant cc"
                + " ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = cc.lg_TIERS_PAYANT_ID"
                + " LEFT JOIN t_compte_client k ON k.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID"
                + " LEFT JOIN t_client cl ON cl.lg_CLIENT_ID = k.lg_CLIENT_ID"
                + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND c.int_PRICE > 0";
        String nonFactures = colonnes + "'' AS facture FROM t_preenregistrement_compte_client_tiers_payent c" + suite
                + " AND c.str_STATUT_FACTURE = 'unpaid'" + filtre;
        String factures = colonnes + "f.str_CODE_FACTURE AS facture FROM t_facture f"
                + " JOIN t_facture_detail fd ON fd.lg_FACTURE_ID = f.lg_FACTURE_ID"
                + " JOIN t_preenregistrement_compte_client_tiers_payent c"
                + " ON c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = fd.str_REF" + suite
                + " AND c.str_STATUT_FACTURE = 'charged' AND f.dbl_MONTANT_RESTANT > 0"
                + " AND IFNULL(f.str_STATUT, '') <> 'avoir' AND IFNULL(fd.dbl_MONTANT_PAYE, 0) = 0"
                + " AND NOT EXISTS (SELECT 1 FROM t_dossier_reglement_detail d"
                + " WHERE d.lg_FACTURE_DETAIL_ID = fd.lg_FACTURE_DETAIL_ID)" + filtre;
        int taille = limit > 0 ? limit : 20;
        Query q = em.createNativeQuery("SELECT x.* FROM (" + nonFactures + " UNION ALL " + factures
                + ") x ORDER BY x.dt DESC LIMIT " + Math.max(0, start) + ", " + (taille + 1));
        for (int i = 0; i < params.size(); i++) {
            q.setParameter(i + 1, params.get(i));
        }
        List<?> rows = q.getResultList();
        JSONArray data = new JSONArray();
        for (int n = 0; n < Math.min(taille, rows.size()); n++) {
            Object[] r = (Object[]) rows.get(n);
            String facture = texte(r[9]);
            data.put(new JSONObject().put("lg_DOSSIER_ID", r[0]).put("str_REF_VENTE", texte(r[1]))
                    .put("str_REF_BON", texte(r[2])).put("dt_VENTE", fmt((Date) r[3])).put("int_PART", entier(r[4]))
                    .put("b_FACTURE", FACTURE.equals(r[5])).put("str_FACTURE", facture)
                    .put("str_TIERS_PAYANT", texte(r[6])).put("lg_TIERS_PAYANT_ID", texte(r[7]))
                    .put("str_CLIENT", texte(r[8]))
                    .put("str_LIBELLE", texte(r[1]) + " - bon " + texte(r[2]) + " - " + texte(r[8]) + " - "
                            + entier(r[4]) + (facture.isEmpty() ? " (non facturé)" : " (facture " + facture + ")")));
        }
        // pas de comptage complet : une page de plus si la requete en a rendu davantage
        int total = Math.max(0, start) + data.length() + (rows.size() > taille ? 1 : 0);
        return new JSONObject().put("success", SUCCESS).put("data", data).put("total", total);
    }

    private boolean estEligible(String dossierId) {
        Object n = em
                .createNativeQuery("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent c"
                        + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID"
                        + " WHERE c.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = ?1 AND" + ELIGIBLE)
                .setParameter(1, dossierId).getSingleResult();
        return entier(n) > 0;
    }

    /** ligne de facture en cours (hors facture annulee par avoir) d'un dossier facture */
    private TFactureDetail ligneFacture(String dossierId) {
        List<TFactureDetail> l = em
                .createQuery("SELECT d FROM TFactureDetail d WHERE d.strREF = ?1"
                        + " AND (d.lgFACTUREID.strSTATUT IS NULL OR d.lgFACTUREID.strSTATUT <> 'avoir')"
                        + " ORDER BY d.dtCREATED DESC", TFactureDetail.class)
                .setParameter(1, dossierId).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    @Override
    public JSONObject detail(String litigeId) {
        TLitige l = em.find(TLitige.class, litigeId);
        if (l == null) {
            return echec("Litige introuvable");
        }
        JSONObject json = new JSONObject().put("success", SUCCESS).put("lg_LITIGE_ID", l.getLgLITIGEID())
                .put("str_STATUT", texte(l.getStrSTATUT())).put("str_TYPE", l.getLgTYPELITIGEID().getStrNAME())
                .put("str_TIERS_PAYANT", l.getLgTIERSPAYANTID().getStrFULLNAME())
                .put("str_CLIENT", texte(l.getStrCLIENTNAME()))
                .put("str_REF_VENTE", texte(l.getStrREFERENCEVENTELITIGE()))
                .put("str_LIBELLE", texte(l.getStrLIBELLELITIGE())).put("str_ETAT", texte(l.getStrETATLITIGE()))
                .put("str_CONSEQUENCE", texte(l.getStrCONSEQUENCELITIGE()))
                .put("str_DESCRIPTION", texte(l.getStrDESCRIPTIONLITIGE()))
                .put("str_COMMENTAIRE", texte(l.getStrCOMMENTAIRELITIGE()))
                .put("int_PART_ORIGINE", l.getIntAMOUNTTOTALLITIGE() == null ? 0 : l.getIntAMOUNTTOTALLITIGE())
                .put("int_MONTANT_CONTESTE", l.getIntAMOUNTDUSLITIGE() == null ? 0 : l.getIntAMOUNTDUSLITIGE())
                .put("int_MONTANT_ACCORDE",
                        l.getIntAMOUNTPAYELITIGE() == null ? JSONObject.NULL : l.getIntAMOUNTPAYELITIGE())
                .put("int_ECART", l.getIntECART() == null ? JSONObject.NULL : l.getIntECART())
                .put("dt_CREATED", fmt(l.getDtCREATEDLITIGE())).put("dt_CLOTURE", fmt(l.getDtCLOTURE()))
                .put("str_MOTIF_CLOTURE", texte(l.getStrMOTIFCLOTURE()))
                .put("b_FACTURE", FACTURE.equals(l.getStrSTATUTFACTUREAVANT()));
        JSONArray lignes = new JSONArray();
        if (l.getLgDOSSIERID() != null) {
            TPreenregistrementCompteClientTiersPayent dossier = em.find(TPreenregistrementCompteClientTiersPayent.class,
                    l.getLgDOSSIERID());
            if (dossier != null) {
                TPreenregistrement vente = dossier.getLgPREENREGISTREMENTID();
                TFactureDetail lf = ligneFacture(dossier.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
                json.put("str_REF_BON", texte(dossier.getStrREFBON())).put("int_PERCENT", dossier.getIntPERCENT())
                        .put("int_PART_ACTUELLE", dossier.getIntPRICE())
                        .put("str_STATUT_FACTURE", texte(dossier.getStrSTATUTFACTURE()))
                        .put("int_TOTAL_VENTE", vente.getIntPRICE()).put("dt_VENTE", fmt(vente.getDtUPDATED()))
                        .put("str_FACTURE", lf == null ? "" : texte(lf.getLgFACTUREID().getStrCODEFACTURE()));
                List<?> rows = em.createNativeQuery("SELECT f.int_CIP, f.str_NAME, d.int_QUANTITY, d.int_PRICE_UNITAIR,"
                        + " d.int_PRICE FROM t_preenregistrement_detail d JOIN t_famille f"
                        + " ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_PREENREGISTREMENT_ID = ?1 ORDER BY f.str_NAME")
                        .setParameter(1, vente.getLgPREENREGISTREMENTID()).getResultList();
                for (Object o : rows) {
                    Object[] r = (Object[]) o;
                    lignes.put(new JSONObject().put("int_CIP", texte(r[0])).put("str_NAME", texte(r[1]))
                            .put("int_QUANTITY", entier(r[2])).put("int_PRICE_UNITAIR", entier(r[3]))
                            .put("int_PRICE", entier(r[4])));
                }
            }
        }
        return json.put("lignes", lignes);
    }

    @Override
    public JSONObject creer(TUser user, String dossierId, String typeId, String libelle, String etat,
            String consequence, String description, String commentaire, String montantConteste) {
        if (StringUtils.isBlank(dossierId)) {
            return echec("Choisissez le dossier tiers payant contesté");
        }
        TTypelitige type = StringUtils.isBlank(typeId) ? null : em.find(TTypelitige.class, typeId);
        if (type == null || !"enable".equals(type.getStrSTATUT())) {
            return echec("Choisissez un type de litige dans la liste");
        }
        TPreenregistrementCompteClientTiersPayent dossier = em.find(TPreenregistrementCompteClientTiersPayent.class,
                dossierId, LockModeType.PESSIMISTIC_WRITE);
        if (dossier == null) {
            return echec("Dossier tiers payant introuvable");
        }
        if (EN_LITIGE.equals(dossier.getStrSTATUTFACTURE())) {
            return echec("Ce dossier est déjà en litige");
        }
        if (!estEligible(dossierId)) {
            return echec(
                    "Ce dossier ne peut pas être mis en litige : vente annulée ou non clôturée, part organisme nulle,"
                            + " ou facture déjà réglée en tout ou partie");
        }
        int part = dossier.getIntPRICE();
        int conteste = part;
        if (StringUtils.isNotBlank(montantConteste)) {
            try {
                conteste = Integer.parseInt(montantConteste.trim());
            } catch (NumberFormatException e) {
                return echec("Le montant contesté est un nombre entier");
            }
            if (conteste <= 0 || conteste > part) {
                return echec("Le montant contesté doit être compris entre 1 et la part organisme (" + part + ")");
            }
        }
        TPreenregistrement vente = dossier.getLgPREENREGISTREMENTID();
        TCompteClientTiersPayant compte = dossier.getLgCOMPTECLIENTTIERSPAYANTID();
        String client = "";
        if (compte.getLgCOMPTECLIENTID() != null && compte.getLgCOMPTECLIENTID().getLgCLIENTID() != null) {
            client = (StringUtils.defaultString(compte.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()) + " "
                    + StringUtils.defaultString(compte.getLgCOMPTECLIENTID().getLgCLIENTID().getStrLASTNAME())).trim();
        }
        String lib = StringUtils.defaultIfBlank(StringUtils.trimToNull(libelle), type.getStrNAME());
        /* chaque texte borne a sa colonne (V7.2.32.1) : un nom long faisait echouer la creation (erreur 500) */
        TLitige l = new TLitige(StringUtils.left(client, 100), vente.getStrREF(), StringUtils.left(lib, 100),
                StringUtils.left(StringUtils.defaultIfBlank(etat, "Non payé"), 40),
                StringUtils.left(StringUtils.defaultIfBlank(consequence, "Aucune conséquence"), 100),
                StringUtils.left(StringUtils.defaultIfBlank(StringUtils.trimToNull(description), lib), 100));
        l.setStrCOMMENTAIRELITIGE(StringUtils.left(StringUtils.trimToNull(commentaire), 100));
        l.setLgTYPELITIGEID(type);
        l.setLgTIERSPAYANTID(compte.getLgTIERSPAYANTID());
        l.setIntAMOUNTTOTALLITIGE(part);
        l.setIntAMOUNTDUSLITIGE(conteste);
        l.setDtCREATEDLITIGE(new Date());
        l.setDtUPDATEDLITIGE(new Date());
        l.setStrSTATUT(OUVERT);
        l.setLgDOSSIERID(dossierId);
        l.setStrSTATUTFACTUREAVANT(dossier.getStrSTATUTFACTURE());
        l.setLgUSERID(user.getLgUSERID());
        em.persist(l);
        dossier.setStrSTATUTFACTURE(EN_LITIGE);
        em.merge(dossier);
        LOG.log(Level.INFO, "litige {0} ouvert sur le dossier {1}", new Object[] { l.getLgLITIGEID(), dossierId });
        return new JSONObject().put("success", SUCCESS).put("lg_LITIGE_ID", l.getLgLITIGEID()).put("message",
                "Litige ouvert : le dossier " + vente.getStrREF() + " est sorti de la facturation"
                        + " jusqu'à la clôture du litige");
    }

    private TLitige ouvert(String litigeId, JSONObject[] erreur) {
        TLitige l = StringUtils.isBlank(litigeId) ? null
                : em.find(TLitige.class, litigeId, LockModeType.PESSIMISTIC_WRITE);
        if (l == null) {
            erreur[0] = echec("Litige introuvable");
        } else if (CLOS.equals(l.getStrSTATUT())) {
            erreur[0] = echec("Ce litige est déjà clôturé");
        } else if (ANNULE.equals(l.getStrSTATUT())) {
            erreur[0] = echec("Ce litige est annulé");
        } else if (!OUVERT.equals(l.getStrSTATUT()) || l.getLgDOSSIERID() == null) {
            erreur[0] = echec("Ancien litige sans dossier lié : il ne peut être ni clôturé ni annulé");
        }
        return erreur[0] == null ? l : null;
    }

    @Override
    public JSONObject annuler(TUser user, String litigeId) {
        JSONObject[] erreur = new JSONObject[1];
        TLitige l = ouvert(litigeId, erreur);
        if (l == null) {
            return erreur[0];
        }
        TPreenregistrementCompteClientTiersPayent dossier = em.find(TPreenregistrementCompteClientTiersPayent.class,
                l.getLgDOSSIERID(), LockModeType.PESSIMISTIC_WRITE);
        if (dossier != null && EN_LITIGE.equals(dossier.getStrSTATUTFACTURE())) {
            dossier.setStrSTATUTFACTURE(StringUtils.defaultIfBlank(l.getStrSTATUTFACTUREAVANT(), NON_FACTURE));
            em.merge(dossier);
        }
        l.setStrSTATUT(ANNULE);
        l.setDtUPDATEDLITIGE(new Date());
        l.setDtCLOTURE(new Date());
        l.setLgUSERCLOTUREID(user.getLgUSERID());
        em.merge(l);
        return new JSONObject().put("success", SUCCESS).put("message",
                "Litige annulé : le dossier est revenu dans la facturation");
    }

    @Override
    public JSONObject cloturer(TUser user, String litigeId, boolean remboursement, String montant, String motif) {
        JSONObject[] erreur = new JSONObject[1];
        TLitige l = ouvert(litigeId, erreur);
        if (l == null) {
            return erreur[0];
        }
        int part = l.getIntAMOUNTTOTALLITIGE() == null ? 0 : l.getIntAMOUNTTOTALLITIGE();
        int accorde = 0;
        if (remboursement) {
            try {
                accorde = Integer.parseInt(StringUtils.defaultString(montant).trim());
            } catch (NumberFormatException e) {
                return echec("Saisissez le montant accordé par l'organisme (nombre entier)");
            }
            if (accorde <= 0 || accorde > part) {
                return echec("Le montant accordé doit être compris entre 1 et la part d'origine (" + part + ")");
            }
        } else if (StringUtils.isBlank(motif)) {
            return echec("Indiquez le motif de l'abandon de la créance");
        }
        TPreenregistrementCompteClientTiersPayent dossier = em.find(TPreenregistrementCompteClientTiersPayent.class,
                l.getLgDOSSIERID(), LockModeType.PESSIMISTIC_WRITE);
        if (dossier == null || !EN_LITIGE.equals(dossier.getStrSTATUTFACTURE())) {
            return echec("Le dossier lié n'est plus en litige : clôture impossible");
        }
        int ecart = part - accorde;
        if (FACTURE.equals(l.getStrSTATUTFACTUREAVANT())) {
            // dossier deja facture : la facture emise ne change pas, le restant a recouvrer diminue de l'ecart
            TFactureDetail lf = ligneFacture(dossier.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
            if (lf != null && ecart > 0) {
                lf.setDblMONTANTRESTANT(moins(lf.getDblMONTANTRESTANT(), ecart));
                lf.setDtUPDATED(new Date());
                em.merge(lf);
                TFacture f = lf.getLgFACTUREID();
                f.setDblMONTANTRESTANT(moins(f.getDblMONTANTRESTANT(), ecart));
                f.setDtUPDATED(new Date());
                em.merge(f);
            }
            dossier.setIntPRICERESTE(accorde);
            dossier.setStrSTATUTFACTURE(FACTURE);
        } else {
            // dossier non facture : refacturable au montant accorde, ou sorti de la facturation si rien n'est accorde
            if (accorde > 0) {
                dossier.setIntPRICE(accorde);
                dossier.setIntPRICERESTE(accorde);
                dossier.setStrSTATUTFACTURE(NON_FACTURE);
            } else {
                dossier.setIntPRICERESTE(0);
                dossier.setStrSTATUTFACTURE(ABANDONNE);
            }
            TCompteClientTiersPayant compte = dossier.getLgCOMPTECLIENTTIERSPAYANTID();
            if (compte != null && ecart > 0) {
                int conso = Math.max(0, Objects.requireNonNullElse(compte.getDbCONSOMMATIONMENSUELLE(), 0) - ecart);
                compte.setDbCONSOMMATIONMENSUELLE(conso);
                if (conso <= Objects.requireNonNullElse(compte.getDbPLAFONDENCOURS(), 0)) {
                    compte.setBCANBEUSE(true);
                }
                em.merge(compte);
            }
        }
        em.merge(dossier);
        l.setIntAMOUNTPAYELITIGE(accorde);
        l.setIntECART(ecart);
        l.setStrMOTIFCLOTURE(StringUtils.left(StringUtils.trimToNull(motif), 255));
        l.setStrSTATUT(CLOS);
        l.setDtCLOTURE(new Date());
        l.setDtUPDATEDLITIGE(new Date());
        l.setLgUSERCLOTUREID(user.getLgUSERID());
        em.merge(l);
        return new JSONObject().put("success", SUCCESS).put("message",
                remboursement
                        ? "Litige clôturé : " + accorde + " accordé"
                                + (ecart > 0 ? ", écart de " + ecart + " abandonné" : "")
                        : "Litige clôturé sans remboursement : créance de " + part + " abandonnée");
    }

    private static Double moins(Double v, int ecart) {
        return Math.max(0d, (v == null ? 0d : v) - ecart);
    }
}
