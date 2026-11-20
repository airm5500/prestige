package rest.service.impl.achats;

import commonTasks.dto.MvtCaisseDTO;
import dal.TBonLivraison;
import dal.TEventLog;
import dal.TParameters;
import dal.TUser;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeTransaction;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.CaisseService;
import rest.service.ReglementFournisseurService;
import util.Constant;

/**
 * Plan du 19/11, point 16 : reglements fournisseurs.
 * <ul>
 * <li>un reglement se repartit sur les BL du grossiste (les plus anciens d'abord, ou ceux coches) ; les parts sont
 * enregistrees (reglement_fournisseur_bl) et s'ajoutent au montant regle du BL : regle cumule, restant = TTC − regle,
 * statut derive, sur le BL et sur son mouvement d'achat (memes colonnes que « Regler les BL ») ;</li>
 * <li>en especes, avec KEY_REGLEMENT_FRS_SORTIE_CAISSE a 1 : une sortie de caisse dans la caisse ouverte de
 * l'utilisateur (refus, sans rien ecrire, si elle est fermee) ; l'annulation la rend par une entree du meme montant
 * ;</li>
 * <li>date de depart (KEY_REGLEMENT_FRS_DATE_DEPART) : les BL dates d'avant sont consideres comme regles, a la lecture
 * seulement ;</li>
 * <li>journal : une ligne par reglement, par annulation et par changement de la date de depart.</li>
 * </ul>
 */
@Stateless
public class ReglementFournisseurServiceImpl implements ReglementFournisseurService {

    private static final Logger LOG = Logger.getLogger(ReglementFournisseurServiceImpl.class.getName());

    public static final String CLE_DEPART = "KEY_REGLEMENT_FRS_DATE_DEPART";
    public static final String CLE_SORTIE_CAISSE = "KEY_REGLEMENT_FRS_SORTIE_CAISSE";
    public static final LocalDate DEPART_DEFAUT = LocalDate.of(2026, 11, 1);
    private static final DateTimeFormatter JJ = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter JJ_HH = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private CaisseService caisseService;
    @Resource
    private SessionContext contexte;

    /** Date de depart du suivi, lue en base (defaut : 01/11/2026). Lue aussi par la liste des BL. */
    public static LocalDate depart(EntityManager em) {
        try {
            TParameters p = em.find(TParameters.class, CLE_DEPART);
            if (p != null && StringUtils.isNotBlank(p.getStrVALUE())) {
                return LocalDate.parse(p.getStrVALUE().trim());
            }
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "date de depart des reglements fournisseurs illisible", e);
        }
        return DEPART_DEFAUT;
    }

    private boolean sortieCaisse() {
        TParameters p = em.find(TParameters.class, CLE_SORTIE_CAISSE);
        return p == null || p.getStrVALUE() == null || !"0".equals(p.getStrVALUE().trim());
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static String nom(TUser u) {
        return u == null ? ""
                : (StringUtils.defaultString(u.getStrFIRSTNAME()) + " " + StringUtils.defaultString(u.getStrLASTNAME()))
                        .trim();
    }

    private static String montant(long v) {
        return String.format(java.util.Locale.FRENCH, "%,d", v).replace(' ', ' ').replace(' ', ' ');
    }

    private static LocalDate jour(Object v) {
        if (v instanceof java.sql.Date) {
            return ((java.sql.Date) v).toLocalDate();
        }
        if (v instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) v).toLocalDateTime().toLocalDate();
        }
        if (v instanceof LocalDate) {
            return (LocalDate) v;
        }
        return v instanceof LocalDateTime ? ((LocalDateTime) v).toLocalDate() : null;
    }

    private static LocalDateTime instant(Object v) {
        if (v instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) v).toLocalDateTime();
        }
        return v instanceof LocalDateTime ? (LocalDateTime) v : null;
    }

    /** TINYINT(1) : rendu en booleen par le pilote, en nombre ailleurs. */
    private static boolean vrai(Object v) {
        return v instanceof Boolean ? (Boolean) v : v != null && ((Number) v).intValue() != 0;
    }

    private static int entier(Object v) {
        return v == null ? 0 : ((Number) v).intValue();
    }

    private static LocalDate dateOu(String v, LocalDate defaut) {
        try {
            return StringUtils.isBlank(v) ? defaut : LocalDate.parse(v.trim());
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    /* ------------------------------------------------------------------ BL suivis */

    /** Un BL clos, vu par les reglements. */
    static final class Ligne {
        String id, numero, statut, grossisteId, grossiste;
        LocalDate date;
        int ttc, regle;

        int restant() {
            return ReglementFournisseurRegles.restant(ttc, regle);
        }

        ReglementFournisseurRegles.Bl bl() {
            return new ReglementFournisseurRegles.Bl(id, date, ttc, regle);
        }
    }

    /**
     * BL clos dates du jour de depart ou apres (un grossiste, ou tous), les plus anciens d'abord ; verrouilles si
     * demande (reglement en cours).
     */
    @SuppressWarnings("unchecked")
    private List<Ligne> lignes(String grossisteId, LocalDate depart, LocalDate fin, boolean verrou) {
        StringBuilder sql = new StringBuilder("SELECT b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, b.dt_DATE_LIVRAISON,"
                + " b.int_HTTC, b.int_MONTANT_REGLE, b.STATUS, g.lg_GROSSISTE_ID, g.str_LIBELLE FROM t_bon_livraison b"
                + " JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
                + " WHERE b.str_STATUT = ?1 AND b.dt_DATE_LIVRAISON >= ?2");
        if (fin != null) {
            sql.append(" AND b.dt_DATE_LIVRAISON < ?4");
        }
        if (grossisteId != null) {
            sql.append(" AND g.lg_GROSSISTE_ID = ?3");
        }
        sql.append(" ORDER BY b.dt_DATE_LIVRAISON, b.lg_BON_LIVRAISON_ID");
        if (verrou) {
            sql.append(" FOR UPDATE");
        }
        Query q = em.createNativeQuery(sql.toString()).setParameter(1, Constant.STATUT_IS_CLOSED).setParameter(2,
                java.sql.Date.valueOf(depart));
        if (fin != null) {
            q.setParameter(4, java.sql.Date.valueOf(fin.plusDays(1)));
        }
        if (grossisteId != null) {
            q.setParameter(3, grossisteId);
        }
        List<Ligne> l = new ArrayList<>();
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            Ligne x = new Ligne();
            x.id = (String) r[0];
            x.numero = (String) r[1];
            x.date = jour(r[2]);
            x.ttc = Math.max(0, entier(r[3]));
            x.statut = (String) r[5];
            x.regle = ReglementFournisseurRegles.regle(x.ttc, r[4] == null ? null : entier(r[4]), x.statut);
            x.grossisteId = (String) r[6];
            x.grossiste = (String) r[7];
            l.add(x);
        }
        return l;
    }

    private static JSONObject json(Ligne x, LocalDate aujourdhui) {
        return new JSONObject().put("id", x.id).put("numero", StringUtils.defaultString(x.numero))
                .put("date", x.date == null ? "" : x.date.format(JJ))
                .put("dateIso", x.date == null ? "" : x.date.toString())
                .put("age", x.date == null ? 0 : Math.max(0, ChronoUnit.DAYS.between(x.date, aujourdhui)))
                .put("tranche", ReglementFournisseurRegles.tranche(x.date, aujourdhui)).put("ttc", x.ttc)
                .put("regle", x.regle).put("restant", x.restant())
                .put("statut", ReglementFournisseurRegles.statut(x.ttc, x.regle));
    }

    /* ------------------------------------------------------------------ date de depart */

    @Override
    public JSONObject depart(boolean modifiable) {
        LocalDate d = depart(em);
        return new JSONObject().put("success", true).put("depart", d.toString()).put("affiche", d.format(JJ))
                .put("modifiable", modifiable);
    }

    @Override
    public JSONObject changerDepart(TUser user, String date) {
        LocalDate nouvelle;
        try {
            nouvelle = LocalDate.parse(StringUtils.trimToEmpty(date));
        } catch (RuntimeException e) {
            return echec("Indiquez une date de départ valide.");
        }
        if (nouvelle.isAfter(LocalDate.now())) {
            return echec("La date de départ ne peut pas être dans le futur.");
        }
        LocalDate avant = depart(em);
        if (avant.equals(nouvelle)) {
            return depart(true).put("inchangee", true);
        }
        TParameters p = em.find(TParameters.class, CLE_DEPART);
        if (p == null) {
            p = new TParameters(CLE_DEPART);
            p.setStrDESCRIPTION("REGLEMENTS FOURNISSEURS : DATE DE DEPART DU SUIVI (AAAA-MM-JJ)");
            p.setStrTYPE("SYSTEM");
            p.setStrSTATUT("disable");
            p.setDtCREATED(new Date());
            p.setStrVALUE(nouvelle.toString());
            p.setDtUPDATED(new Date());
            em.persist(p);
        } else {
            p.setStrVALUE(nouvelle.toString());
            p.setDtUPDATED(new Date());
            em.merge(p);
        }
        journal(user, TypeLog.DATE_DEPART_REGLEMENTS_FRS, "t_parameters", CLE_DEPART,
                "Date de départ des règlements fournisseurs : " + avant.format(JJ) + " → " + nouvelle.format(JJ)
                        + " par " + nom(user),
                "Avant : " + avant.format(JJ) + "\nAprès : " + nouvelle.format(JJ) + "\nPar : " + nom(user));
        return depart(true);
    }

    /* ------------------------------------------------------------------ a regler */

    @Override
    public JSONObject aRegler() {
        LocalDate depart = depart(em), aujourdhui = LocalDate.now();
        Map<String, long[]> parGrossiste = new LinkedHashMap<>(); /* 0-30, 31-60, 61-90, >90, total, nombre */
        Map<String, String> noms = new LinkedHashMap<>();
        long[] totaux = new long[6];
        for (Ligne x : lignes(null, depart, null, false)) {
            int r = x.restant();
            if (r <= 0) {
                continue;
            }
            int t = java.util.Arrays.asList(ReglementFournisseurRegles.TRANCHES)
                    .indexOf(ReglementFournisseurRegles.tranche(x.date, aujourdhui));
            long[] g = parGrossiste.computeIfAbsent(x.grossisteId, k -> new long[6]);
            noms.put(x.grossisteId, x.grossiste);
            g[t] += r;
            g[4] += r;
            g[5]++;
            totaux[t] += r;
            totaux[4] += r;
            totaux[5]++;
        }
        List<Map.Entry<String, long[]>> tri = new ArrayList<>(parGrossiste.entrySet());
        tri.sort((a, b) -> {
            int c = Long.compare(b.getValue()[4], a.getValue()[4]);
            return c != 0 ? c : StringUtils.compare(noms.get(a.getKey()), noms.get(b.getKey()));
        });
        JSONArray data = new JSONArray();
        for (Map.Entry<String, long[]> e : tri) {
            long[] g = e.getValue();
            data.put(new JSONObject().put("grossisteId", e.getKey())
                    .put("grossiste", StringUtils.defaultString(noms.get(e.getKey()))).put("nombre", g[5])
                    .put("t0", g[0]).put("t1", g[1]).put("t2", g[2]).put("t3", g[3]).put("total", g[4]));
        }
        return new JSONObject().put("success", true).put("depart", depart.format(JJ))
                .put("departIso", depart.toString()).put("total", totaux[4]).put("nombre", totaux[5])
                .put("t0", totaux[0]).put("t1", totaux[1]).put("t2", totaux[2]).put("t3", totaux[3]).put("data", data);
    }

    @Override
    public JSONObject bls(String grossisteId) {
        if (StringUtils.isBlank(grossisteId)) {
            return new JSONObject().put("success", true).put("total", 0).put("data", new JSONArray());
        }
        LocalDate aujourdhui = LocalDate.now();
        JSONArray data = new JSONArray();
        long du = 0;
        for (Ligne x : lignes(grossisteId.trim(), depart(em), null, false)) {
            if (x.restant() > 0) {
                data.put(json(x, aujourdhui));
                du += x.restant();
            }
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("du", du).put("data", data);
    }

    /* ------------------------------------------------------------------ reglement */

    @Override
    public JSONObject regler(TUser user, JSONObject d) {
        if (user == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        String grossisteId = StringUtils.trimToNull(d.optString("grossisteId", null));
        if (grossisteId == null) {
            return echec("Choisissez le grossiste.");
        }
        int montantRegle;
        try {
            montantRegle = Integer.parseInt(StringUtils.trimToEmpty(String.valueOf(d.opt("montant"))).replace(" ", ""));
        } catch (RuntimeException e) {
            return echec("Indiquez le montant du règlement.");
        }
        LocalDate date;
        try {
            date = LocalDate.parse(StringUtils.trimToEmpty(d.optString("date", "")));
        } catch (RuntimeException e) {
            return echec("Indiquez la date du règlement.");
        }
        if (date.isAfter(LocalDate.now())) {
            return echec("La date du règlement ne peut pas être dans le futur.");
        }
        String mode;
        try {
            mode = ReglementFournisseurRegles.mode(d.optString("mode", ""));
        } catch (ReglementFournisseurRegles.Refus r) {
            return echec(r.getMessage());
        }
        String referencePaiement = StringUtils.left(StringUtils.trimToNull(d.optString("reference", null)), 100);
        List<String> coches = new ArrayList<>();
        JSONArray b = d.optJSONArray("bls");
        if (b != null) {
            for (int i = 0; i < b.length(); i++) {
                if (StringUtils.isNotBlank(b.optString(i)) && !coches.contains(b.optString(i).trim())) {
                    coches.add(b.optString(i).trim());
                }
            }
        }
        LocalDate depart = depart(em);
        List<Ligne> lignes = lignes(grossisteId, depart, null, true);
        if (lignes.isEmpty()) {
            return echec("Aucun BL à régler pour ce grossiste.");
        }
        Map<String, Ligne> parId = new LinkedHashMap<>();
        lignes.forEach(x -> parId.put(x.id, x));
        List<ReglementFournisseurRegles.Bl> ordre = new ArrayList<>();
        if (coches.isEmpty()) {
            lignes.forEach(x -> ordre.add(x.bl()));
        } else {
            for (String id : coches) {
                Ligne x = parId.get(id);
                if (x == null || x.restant() <= 0) {
                    return echec("Un des BL cochés n'est plus à régler : actualisez la liste.");
                }
                ordre.add(x.bl());
            }
        }
        Map<String, Integer> parts;
        try {
            parts = ReglementFournisseurRegles.repartir(montantRegle,
                    coches.isEmpty() ? ReglementFournisseurRegles.plusAnciensDAbord(ordre) : ordre);
        } catch (ReglementFournisseurRegles.Refus r) {
            return echec(r.getMessage());
        }
        String grossiste = lignes.get(0).grossiste;
        String id = UUID.randomUUID().toString();
        String reference = reference(date);
        String mvtCaisseId = null;
        boolean especesEnCaisse = ReglementFournisseurRegles.ESPECES.equals(mode) && sortieCaisse();
        try {
            if (especesEnCaisse) {
                if (!caisseService.checkCaisse(user)) {
                    return echec("Ouvrez votre caisse pour régler en espèces.");
                }
                JSONObject r = mouvementCaisse(user, Constant.MVT_SORTIE_CAISSE, montantRegle,
                        "Règlement fournisseur " + reference + " - " + grossiste);
                if (!r.optBoolean("success")) {
                    return echec(r.optString("msg", "La sortie de caisse n'a pas pu être enregistrée."));
                }
                mvtCaisseId = r.optString("mvtId", null);
            }
            em.createNativeQuery(
                    "INSERT INTO reglement_fournisseur (id, reference, grossiste_id, montant, date_reglement,"
                            + " mode, reference_paiement, user_id, created_at, annule, mvt_caisse_id)"
                            + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10)")
                    .setParameter(1, id).setParameter(2, reference).setParameter(3, grossisteId)
                    .setParameter(4, montantRegle).setParameter(5, java.sql.Date.valueOf(date)).setParameter(6, mode)
                    .setParameter(7, referencePaiement).setParameter(8, user.getLgUSERID())
                    .setParameter(9, java.sql.Timestamp.valueOf(LocalDateTime.now())).setParameter(10, mvtCaisseId)
                    .executeUpdate();
            JSONArray detailParts = new JSONArray();
            StringBuilder detail = new StringBuilder();
            for (Map.Entry<String, Integer> p : parts.entrySet()) {
                em.createNativeQuery("INSERT INTO reglement_fournisseur_bl (id, reglement_id, bl_id, montant)"
                        + " VALUES (?1, ?2, ?3, ?4)").setParameter(1, UUID.randomUUID().toString()).setParameter(2, id)
                        .setParameter(3, p.getKey()).setParameter(4, p.getValue()).executeUpdate();
                Ligne x = parId.get(p.getKey());
                appliquer(p.getKey(), x.regle + p.getValue(), date);
                detailParts.put(
                        new JSONObject().put("blId", p.getKey()).put("numero", x.numero).put("montant", p.getValue()));
                detail.append(detail.length() == 0 ? "" : "\n").append("BL n° ").append(x.numero).append(" : ")
                        .append(montant(p.getValue()));
            }
            journal(user, TypeLog.REGLEMENT_FOURNISSEUR, "reglement_fournisseur", id,
                    "Règlement fournisseur " + reference + " de " + montant(montantRegle) + " à " + grossiste + " ("
                            + ReglementFournisseurRegles.libelleMode(mode).toLowerCase(java.util.Locale.FRENCH)
                            + ") par " + nom(user) + " : " + parts.size() + " BL",
                    detail.toString());
            return new JSONObject().put("success", true).put("id", id).put("reference", reference)
                    .put("montant", montantRegle).put("grossiste", grossiste).put("parts", detailParts)
                    .put("sortieCaisse", mvtCaisseId != null).put("mvtCaisseId", mvtCaisseId == null ? "" : mvtCaisseId)
                    .put("msg", "Règlement " + reference + " enregistré : " + montant(montantRegle) + " sur "
                            + parts.size() + " BL" + (mvtCaisseId != null ? ", sorti de votre caisse." : "."));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "reglement fournisseur", e);
            contexte.setRollbackOnly();
            return echec("Le règlement n'a pas pu être enregistré.");
        }
    }

    /** RF + date du reglement + rang du jour : RF20261120-001. */
    private String reference(LocalDate date) {
        String prefixe = "RF" + date.format(DateTimeFormatter.BASIC_ISO_DATE) + "-";
        Object n = em.createNativeQuery("SELECT COUNT(*) FROM reglement_fournisseur WHERE reference LIKE ?1")
                .setParameter(1, prefixe + "%").getSingleResult();
        return prefixe + String.format("%03d", entier(n) + 1);
    }

    private JSONObject mouvementCaisse(TUser user, String type, int montant, String libelle) throws Exception {
        MvtCaisseDTO m = new MvtCaisseDTO();
        m.setIdTypeMvt(type);
        m.setIdModeRegle("1");
        m.setIdTypeRegl("1");
        m.setAmount(montant);
        m.setCommentaire(libelle);
        m.setDateMvt(LocalDate.now().toString());
        return caisseService.createMvt(m, user);
    }

    /** Nouveau montant regle d'un BL : restant, statut et date de reglement en decoulent (BL et mouvement d'achat). */
    private void appliquer(String blId, int regle, LocalDate date) {
        TBonLivraison bon = em.find(TBonLivraison.class, blId);
        int ttc = bon.getIntHTTC() == null ? 0 : Math.max(0, bon.getIntHTTC());
        int r = Math.max(0, regle);
        int restant = ReglementFournisseurRegles.restant(ttc, r);
        bon.setIntMONTANTREGLE(r);
        bon.setIntMONTANTRESTANT(restant);
        bon.setSTATUS(ReglementFournisseurRegles.statut(ttc, r));
        bon.setDtREGLEMENTDATE(r == 0 ? null : java.sql.Date.valueOf(date));
        em.merge(bon);
        em.createQuery("UPDATE MvtTransaction m SET m.montantRestant = :r WHERE m.pkey = :p AND m.typeTransaction = :t")
                .setParameter("r", restant).setParameter("p", blId).setParameter("t", TypeTransaction.ACHAT)
                .executeUpdate();
    }

    /* ------------------------------------------------------------------ annulation */

    @Override
    public JSONObject annuler(TUser user, String reglementId) {
        if (user == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        @SuppressWarnings("unchecked")
        List<Object[]> r = em
                .createNativeQuery("SELECT f.reference, f.montant, f.annule, f.mvt_caisse_id, g.str_LIBELLE"
                        + " FROM reglement_fournisseur f LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.grossiste_id"
                        + " WHERE f.id = ?1 FOR UPDATE")
                .setParameter(1, StringUtils.trimToEmpty(reglementId)).getResultList();
        if (r.isEmpty()) {
            return echec("Règlement introuvable.");
        }
        Object[] f = r.get(0);
        if (vrai(f[2])) {
            return echec("Ce règlement est déjà annulé.");
        }
        String reference = (String) f[0], grossiste = StringUtils.defaultString((String) f[4]);
        int montantRegle = entier(f[1]);
        String mvtAnnulation = null;
        try {
            if (f[3] != null) {
                if (!caisseService.checkCaisse(user)) {
                    return echec("Ouvrez votre caisse pour annuler un règlement payé en espèces.");
                }
                JSONObject m = mouvementCaisse(user, Constant.MVT_ENTREE_CAISSE, montantRegle,
                        "Annulation du règlement fournisseur " + reference + " - " + grossiste);
                if (!m.optBoolean("success")) {
                    return echec(m.optString("msg", "L'entrée de caisse n'a pas pu être enregistrée."));
                }
                mvtAnnulation = m.optString("mvtId", null);
            }
            @SuppressWarnings("unchecked")
            List<Object[]> parts = em.createNativeQuery("SELECT p.bl_id, p.montant, b.str_REF_LIVRAISON,"
                    + " b.int_MONTANT_REGLE, b.dt_REGLEMENT_DATE, b.int_HTTC, b.STATUS FROM reglement_fournisseur_bl p"
                    + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = p.bl_id WHERE p.reglement_id = ?1"
                    + " ORDER BY p.id FOR UPDATE").setParameter(1, reglementId.trim()).getResultList();
            StringBuilder detail = new StringBuilder();
            for (Object[] p : parts) {
                int regleBl = ReglementFournisseurRegles.regle(entier(p[5]), p[3] == null ? null : entier(p[3]),
                        (String) p[6]);
                LocalDate dateBl = jour(p[4]);
                appliquer((String) p[0], regleBl - entier(p[1]), dateBl == null ? LocalDate.now() : dateBl);
                detail.append(detail.length() == 0 ? "" : "\n").append("BL n° ").append(p[2]).append(" : ")
                        .append(montant(entier(p[1])));
            }
            em.createNativeQuery("UPDATE reglement_fournisseur SET annule = 1, annule_le = ?2, annule_par = ?3,"
                    + " mvt_caisse_annulation_id = ?4 WHERE id = ?1").setParameter(1, reglementId.trim())
                    .setParameter(2, java.sql.Timestamp.valueOf(LocalDateTime.now()))
                    .setParameter(3, user.getLgUSERID()).setParameter(4, mvtAnnulation).executeUpdate();
            journal(user, TypeLog.ANNULATION_REGLEMENT_FOURNISSEUR, "reglement_fournisseur", reglementId.trim(),
                    "Annulation du règlement fournisseur " + reference + " de " + montant(montantRegle) + " à "
                            + grossiste + " par " + nom(user),
                    detail.toString());
            return new JSONObject().put("success", true).put("reference", reference)
                    .put("entreeCaisse", mvtAnnulation != null).put("msg", "Règlement " + reference + " annulé"
                            + (mvtAnnulation != null ? " : " + montant(montantRegle) + " rendu à votre caisse." : "."));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "annulation de reglement fournisseur", e);
            contexte.setRollbackOnly();
            return echec("L'annulation n'a pas pu être enregistrée.");
        }
    }

    /* ------------------------------------------------------------------ historique et releve */

    @SuppressWarnings("unchecked")
    private JSONArray reglements(String grossisteId, LocalDate debut, LocalDate fin) {
        StringBuilder sql = new StringBuilder("SELECT f.id, f.reference, f.montant, f.date_reglement, f.mode,"
                + " f.reference_paiement, f.created_at, f.annule, f.annule_le, f.mvt_caisse_id, g.lg_GROSSISTE_ID,"
                + " g.str_LIBELLE, CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME) AS auteur,"
                + " CONCAT(a.str_FIRST_NAME, ' ', a.str_LAST_NAME) AS annulateur FROM reglement_fournisseur f"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.grossiste_id"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = f.user_id LEFT JOIN t_user a ON a.lg_USER_ID = f.annule_par"
                + " WHERE f.date_reglement BETWEEN ?1 AND ?2");
        if (grossisteId != null) {
            sql.append(" AND f.grossiste_id = ?3");
        }
        sql.append(" ORDER BY f.date_reglement DESC, f.created_at DESC, f.id");
        Query q = em.createNativeQuery(sql.toString()).setParameter(1, java.sql.Date.valueOf(debut)).setParameter(2,
                java.sql.Date.valueOf(fin));
        if (grossisteId != null) {
            q.setParameter(3, grossisteId);
        }
        List<Object[]> lignes = q.getResultList();
        Map<String, JSONArray> parts = new LinkedHashMap<>();
        if (!lignes.isEmpty()) {
            List<String> ids = new ArrayList<>();
            lignes.forEach(l -> ids.add((String) l[0]));
            for (int i = 0; i < ids.size(); i += 500) {
                List<Object[]> ps = em
                        .createNativeQuery("SELECT p.reglement_id, p.bl_id, p.montant, b.str_REF_LIVRAISON,"
                                + " b.dt_DATE_LIVRAISON, b.int_HTTC FROM reglement_fournisseur_bl p"
                                + " LEFT JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = p.bl_id"
                                + " WHERE p.reglement_id IN ?1 ORDER BY b.dt_DATE_LIVRAISON, p.bl_id")
                        .setParameter(1, ids.subList(i, Math.min(ids.size(), i + 500))).getResultList();
                for (Object[] p : ps) {
                    LocalDate db = jour(p[4]);
                    parts.computeIfAbsent((String) p[0], k -> new JSONArray())
                            .put(new JSONObject().put("blId", p[1])
                                    .put("numero", StringUtils.defaultString((String) p[3]))
                                    .put("dateBl", db == null ? "" : db.format(JJ)).put("ttc", entier(p[5]))
                                    .put("montant", entier(p[2])));
                }
            }
        }
        JSONArray data = new JSONArray();
        for (Object[] l : lignes) {
            LocalDate dr = jour(l[3]);
            LocalDateTime cree = instant(l[6]), annuleLe = instant(l[8]);
            JSONArray ps = parts.getOrDefault((String) l[0], new JSONArray());
            StringBuilder bl = new StringBuilder();
            for (int i = 0; i < ps.length(); i++) {
                bl.append(i == 0 ? "" : ", ").append(ps.getJSONObject(i).optString("numero"));
            }
            data.put(new JSONObject().put("id", l[0]).put("reference", l[1]).put("montant", entier(l[2]))
                    .put("date", dr == null ? "" : dr.format(JJ)).put("dateIso", dr == null ? "" : dr.toString())
                    .put("mode", l[4]).put("libelleMode", ReglementFournisseurRegles.libelleMode((String) l[4]))
                    .put("referencePaiement", StringUtils.defaultString((String) l[5]))
                    .put("saisiLe", cree == null ? "" : cree.format(JJ_HH)).put("annule", vrai(l[7]))
                    .put("annuleLe", annuleLe == null ? "" : annuleLe.format(JJ_HH)).put("sortieCaisse", l[9] != null)
                    .put("grossisteId", l[10]).put("grossiste", StringUtils.defaultString((String) l[11]))
                    .put("auteur", StringUtils.defaultString((String) l[12]).trim())
                    .put("annulePar", StringUtils.defaultString((String) l[13]).trim()).put("nombreBl", ps.length())
                    .put("bls", bl.toString()).put("parts", ps));
        }
        return data;
    }

    @Override
    public JSONObject historique(String dtStart, String dtEnd, String grossisteId) {
        LocalDate fin = dateOu(dtEnd, LocalDate.now());
        LocalDate debut = dateOu(dtStart, fin.withDayOfMonth(1));
        JSONArray data = reglements(StringUtils.trimToNull(grossisteId), debut, fin);
        long total = 0;
        int actifs = 0;
        for (int i = 0; i < data.length(); i++) {
            if (!data.getJSONObject(i).optBoolean("annule")) {
                total += data.getJSONObject(i).optLong("montant");
                actifs++;
            }
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("actifs", actifs)
                .put("montant", total).put("data", data);
    }

    @Override
    public JSONObject releve(String grossisteId, String dtStart, String dtEnd) {
        String g = StringUtils.trimToNull(grossisteId);
        if (g == null) {
            return echec("Choisissez le grossiste du relevé.");
        }
        LocalDate depart = depart(em), aujourdhui = LocalDate.now();
        LocalDate fin = dateOu(dtEnd, aujourdhui);
        LocalDate debut = dateOu(dtStart, depart);
        LocalDate debutBl = debut.isBefore(depart) ? depart : debut;
        JSONArray bls = new JSONArray();
        long ttc = 0, regle = 0, restant = 0;
        String nomGrossiste = null;
        for (Ligne x : lignes(g, debutBl, fin, false)) {
            bls.put(json(x, aujourdhui));
            ttc += x.ttc;
            regle += x.regle;
            restant += x.restant();
            nomGrossiste = x.grossiste;
        }
        JSONArray rg = reglements(g, debut, fin);
        long regles = 0;
        for (int i = 0; i < rg.length(); i++) {
            if (!rg.getJSONObject(i).optBoolean("annule")) {
                regles += rg.getJSONObject(i).optLong("montant");
            }
            nomGrossiste = nomGrossiste == null ? rg.getJSONObject(i).optString("grossiste") : nomGrossiste;
        }
        if (nomGrossiste == null) {
            dal.TGrossiste tg = em.find(dal.TGrossiste.class, g);
            nomGrossiste = tg == null ? "" : tg.getStrLIBELLE();
        }
        return new JSONObject().put("success", true).put("grossisteId", g).put("grossiste", nomGrossiste)
                .put("du", debut.format(JJ)).put("au", fin.format(JJ)).put("depart", depart.format(JJ))
                .put("debutBl", debutBl.format(JJ)).put("bls", bls).put("reglements", rg)
                .put("totaux", new JSONObject().put("ttc", ttc).put("regle", regle).put("restant", restant)
                        .put("reglements", regles).put("nombreBl", bls.length()));
    }

    /* ------------------------------------------------------------------ journal */

    private void journal(TUser user, TypeLog type, String table, String ref, String description, String detail) {
        TEventLog log = new TEventLog(UUID.randomUUID().toString());
        log.setLgUSERID(em.find(TUser.class, user.getLgUSERID()));
        log.setDtCREATED(new Date());
        log.setDtUPDATED(log.getDtCREATED());
        log.setStrCREATEDBY(user.getStrLOGIN());
        log.setStrSTATUT(Constant.STATUT_ENABLE);
        log.setStrTABLECONCERN(table);
        log.setTypeLog(type);
        log.setStrDESCRIPTION(StringUtils.left(description, 255));
        log.setStrTYPELOG(ref);
        log.setStrDETAIL(detail);
        em.persist(log);
    }

    @Override
    public String officine() {
        try {
            dal.TOfficine o = em.find(dal.TOfficine.class, "1");
            return o == null || o.getStrNOMABREGE() == null ? "" : o.getStrNOMABREGE();
        } catch (RuntimeException e) {
            return "";
        }
    }

    /** Pour la liste des BL : restant affiche d'un BL (0 avant la date de depart). */
    public static Integer restantAffiche(TBonLivraison b, LocalDate depart) {
        if (b == null || !Constant.STATUT_IS_CLOSED.equals(b.getStrSTATUT())) {
            return null;
        }
        int ttc = b.getIntHTTC() == null ? 0 : Math.max(0, b.getIntHTTC());
        LocalDate d = b.getDtDATELIVRAISON() == null ? null
                : b.getDtDATELIVRAISON() instanceof java.sql.Date
                        ? ((java.sql.Date) b.getDtDATELIVRAISON()).toLocalDate()
                        : b.getDtDATELIVRAISON().toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        if (!ReglementFournisseurRegles.suivi(d, depart)) {
            return 0;
        }
        return ReglementFournisseurRegles.restant(ttc,
                ReglementFournisseurRegles.regle(ttc, b.getIntMONTANTREGLE(), b.getSTATUS()));
    }
}
