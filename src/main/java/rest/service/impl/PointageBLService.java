package rest.service.impl;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.RapprochementBL.Piece;
import rest.service.impl.RapprochementBL.Resultat;
import rest.service.impl.RapprochementBL.Statut;

/**
 * Retours du 09/10 (5) : pointage des BL et avoirs grossistes, rapprochement avec le releve du grossiste (PDF).
 *
 * <p>
 * Pieces Prestige d'un grossiste : BL (enable = en cours, is_Closed = entre en stock), avoirs = retours fournisseur et
 * quantites retournees a la reception du BL (t_bon_livraison_detail.int_QTE_RETURN x PAF). Pointage, N° de sequence et
 * reference d'avoir modifies directement dans la liste. Le releve importe et son rapprochement sont conserves.
 * </p>
 */
@Stateless
public class PointageBLService {

    static final String TYPE_BL = "BL", TYPE_RETOUR = "RETOUR", TYPE_RECEPTION = "RECEPTION";
    /** Fenetre de recherche des pieces Prestige autour des dates du releve (saisie decalee). */
    static final int MARGE_JOURS = 7;
    private static final DateTimeFormatter JJ_MM_AAAA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Piece Prestige avec ses informations d'affichage. */
    static class PieceVue {

        String type, id, reference, referenceAvoir, sequence, statut, pointePar, pointeLe, blId;
        LocalDate date;
        long montantHt;

        Piece piece() {
            return new Piece(type + ":" + id, !TYPE_BL.equals(type), reference, referenceAvoir, sequence, date,
                    montantHt);
        }

        JSONObject json() {
            return new JSONObject().put("type", type).put("id", id).put("cle", type + ":" + id)
                    .put("reference", StringUtils.defaultString(reference))
                    .put("referenceAvoir", StringUtils.defaultString(referenceAvoir))
                    .put("sequence", StringUtils.defaultString(sequence))
                    .put("statut", StringUtils.defaultString(statut))
                    .put("date", date == null ? "" : date.format(JJ_MM_AAAA))
                    .put("montantHt", TYPE_BL.equals(type) ? montantHt : -Math.abs(montantHt))
                    .put("pointable", !TYPE_RECEPTION.equals(type)).put("pointe", pointeLe != null)
                    .put("pointeLe", StringUtils.defaultString(pointeLe))
                    .put("pointePar", StringUtils.defaultString(pointePar));
        }
    }

    private static LocalDate date(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof java.sql.Date) {
            return ((java.sql.Date) o).toLocalDate();
        }
        if (o instanceof Timestamp) {
            return ((Timestamp) o).toLocalDateTime().toLocalDate();
        }
        if (o instanceof java.util.Date) {
            return new java.sql.Date(((java.util.Date) o).getTime()).toLocalDate();
        }
        return null;
    }

    private static long nombre(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    private static String texte(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static String quand(Object o) {
        if (o instanceof Timestamp) {
            return ((Timestamp) o).toLocalDateTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        }
        return null;
    }

    /** BL et avoirs du grossiste sur la periode, pour l'emplacement de l'operateur. */
    @SuppressWarnings("unchecked")
    List<PieceVue> pieces(String grossisteId, String emplacement, LocalDate du, LocalDate au) {
        List<PieceVue> sortie = new ArrayList<>();
        java.sql.Date debut = java.sql.Date.valueOf(du), fin = java.sql.Date.valueOf(au.plusDays(1));
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON,"
                + " b.str_SEQ_CLIENT, b.dt_DATE_LIVRAISON, COALESCE(b.int_MHT, 0), b.str_STATUT, b.dt_POINTAGE,"
                + " CONCAT_WS(' ', pu.str_FIRST_NAME, pu.str_LAST_NAME)"
                + " FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                + " JOIN t_user bu ON bu.lg_USER_ID = b.lg_USER_ID"
                + " LEFT JOIN t_user pu ON pu.lg_USER_ID = b.lg_POINTAGE_USER"
                + " WHERE o.lg_GROSSISTE_ID = ?1 AND bu.lg_EMPLACEMENT_ID = ?2 AND b.str_STATUT IN ('enable', 'is_Closed')"
                + " AND b.dt_DATE_LIVRAISON >= ?3 AND b.dt_DATE_LIVRAISON < ?4 ORDER BY b.dt_DATE_LIVRAISON, b.str_REF_LIVRAISON")
                .setParameter(1, grossisteId).setParameter(2, emplacement).setParameter(3, debut).setParameter(4, fin)
                .getResultList()) {
            PieceVue p = new PieceVue();
            p.type = TYPE_BL;
            p.id = texte(r[0]);
            p.blId = p.id;
            p.reference = texte(r[1]);
            p.sequence = texte(r[2]);
            p.date = date(r[3]);
            p.montantHt = nombre(r[4]);
            p.statut = "is_Closed".equals(r[5]) ? "Entré en stock" : "En cours";
            p.pointeLe = quand(r[6]);
            p.pointePar = texte(r[7]);
            sortie.add(p);
        }
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT rf.lg_RETOUR_FRS_ID, b.str_REF_LIVRAISON,"
                + " rf.str_REF_AVOIR, COALESCE(rf.dt_AVOIR, rf.dt_DATE), COALESCE(rf.int_AVOIR_HT, rf.dl_AMOUNT, 0),"
                + " rf.str_REF_RETOUR_FRS, rf.dt_POINTAGE, CONCAT_WS(' ', pu.str_FIRST_NAME, pu.str_LAST_NAME), b.str_SEQ_CLIENT,"
                + " rf.lg_BON_LIVRAISON_ID"
                + " FROM t_retour_fournisseur rf LEFT JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = rf.lg_BON_LIVRAISON_ID"
                + " JOIN t_user ru ON ru.lg_USER_ID = rf.lg_USER_ID"
                + " LEFT JOIN t_user pu ON pu.lg_USER_ID = rf.lg_POINTAGE_USER"
                + " WHERE rf.lg_GROSSISTE_ID = ?1 AND ru.lg_EMPLACEMENT_ID = ?2 AND rf.str_STATUT IN ('enable', 'is_Closed')"
                + " AND COALESCE(rf.dt_AVOIR, rf.dt_DATE) >= ?3 AND COALESCE(rf.dt_AVOIR, rf.dt_DATE) < ?4")
                .setParameter(1, grossisteId).setParameter(2, emplacement).setParameter(3, debut).setParameter(4, fin)
                .getResultList()) {
            PieceVue p = new PieceVue();
            p.type = TYPE_RETOUR;
            p.id = texte(r[0]);
            p.reference = texte(r[1]);
            p.referenceAvoir = texte(r[2]);
            p.date = date(r[3]);
            p.montantHt = Math.abs(nombre(r[4]));
            p.statut = "Retour " + StringUtils.defaultString(texte(r[5]));
            p.pointeLe = quand(r[6]);
            p.pointePar = texte(r[7]);
            p.sequence = texte(r[8]);
            p.blId = texte(r[9]);
            sortie.add(p);
        }
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON,"
                + " b.dt_DATE_LIVRAISON, SUM(d.int_QTE_RETURN * d.int_PAF), b.str_SEQ_CLIENT"
                + " FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                + " JOIN t_user bu ON bu.lg_USER_ID = b.lg_USER_ID"
                + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
                + " WHERE o.lg_GROSSISTE_ID = ?1 AND bu.lg_EMPLACEMENT_ID = ?2 AND b.str_STATUT IN ('enable', 'is_Closed')"
                + " AND b.dt_DATE_LIVRAISON >= ?3 AND b.dt_DATE_LIVRAISON < ?4 AND d.int_QTE_RETURN > 0"
                + " GROUP BY b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, b.dt_DATE_LIVRAISON, b.str_SEQ_CLIENT")
                .setParameter(1, grossisteId).setParameter(2, emplacement).setParameter(3, debut).setParameter(4, fin)
                .getResultList()) {
            PieceVue p = new PieceVue();
            p.type = TYPE_RECEPTION;
            p.id = texte(r[0]);
            p.blId = p.id;
            p.reference = texte(r[1]);
            p.date = date(r[2]);
            p.montantHt = Math.abs(nombre(r[3]));
            p.statut = "Manquants à la réception";
            p.sequence = texte(r[4]);
            sortie.add(p);
        }
        return sortie;
    }

    /** Ecran de pointage : pieces de la periode, filtre pointees / non pointees, totaux. */
    public JSONObject liste(String grossisteId, String emplacement, LocalDate du, LocalDate au, String etat) {
        List<PieceVue> toutes = pieces(grossisteId, emplacement, du, au);
        JSONArray data = new JSONArray();
        long bl = 0, avoirs = 0, pointes = 0, nonPointes = 0;
        for (PieceVue p : toutes) {
            boolean pointe = p.pointeLe != null;
            if (TYPE_BL.equals(p.type)) {
                bl += p.montantHt;
            } else {
                avoirs -= p.montantHt;
            }
            if (!TYPE_RECEPTION.equals(p.type)) {
                if (pointe) {
                    pointes++;
                } else {
                    nonPointes++;
                }
            }
            if ("POINTES".equals(etat) && !pointe
                    || "NON_POINTES".equals(etat) && (pointe || TYPE_RECEPTION.equals(p.type))) {
                continue;
            }
            data.put(p.json());
        }
        return new JSONObject().put("success", true).put("data", data).put("total", data.length()).put("totalBl", bl)
                .put("totalAvoirs", avoirs).put("net", bl + avoirs).put("pointes", pointes)
                .put("nonPointes", nonPointes);
    }

    /** Pointer ou depointer un BL ou un avoir (retour). */
    public JSONObject pointer(String type, String id, boolean pointe, String userId) {
        String table = TYPE_BL.equals(type) ? "t_bon_livraison"
                : TYPE_RETOUR.equals(type) ? "t_retour_fournisseur" : null;
        String cle = TYPE_BL.equals(type) ? "lg_BON_LIVRAISON_ID" : "lg_RETOUR_FRS_ID";
        if (table == null || StringUtils.isBlank(id)) {
            return new JSONObject().put("success", false).put("msg", "Pièce inconnue.");
        }
        int n = pointe
                ? em.createNativeQuery(
                        "UPDATE " + table + " SET dt_POINTAGE = NOW(), lg_POINTAGE_USER = ?1 WHERE " + cle + " = ?2")
                        .setParameter(1, userId).setParameter(2, id).executeUpdate()
                : em.createNativeQuery(
                        "UPDATE " + table + " SET dt_POINTAGE = NULL, lg_POINTAGE_USER = NULL WHERE " + cle + " = ?1")
                        .setParameter(1, id).executeUpdate();
        return new JSONObject().put("success", n == 1).put("msg", n == 1 ? "" : "Pièce introuvable.");
    }

    /** N° de sequence client imprime sur le BL (facultatif). */
    public JSONObject sequence(String blId, String sequence) {
        String s = StringUtils.trimToNull(sequence);
        if (s != null && !s.matches("[A-Za-z0-9 ./-]{1,20}")) {
            return new JSONObject().put("success", false).put("msg",
                    "N° de séquence : 20 caractères au plus (chiffres, lettres, - / .).");
        }
        int n = em.createNativeQuery("UPDATE t_bon_livraison SET str_SEQ_CLIENT = ?1 WHERE lg_BON_LIVRAISON_ID = ?2")
                .setParameter(1, s).setParameter(2, blId).executeUpdate();
        return new JSONObject().put("success", n == 1).put("msg", n == 1 ? "" : "BL introuvable.");
    }

    /** Reference de l'avoir du grossiste sur un retour (ex. « VRI 683562 2 »), facultative. */
    public JSONObject referenceAvoir(String retourId, String reference) {
        String s = StringUtils.trimToNull(reference);
        if (s != null && !s.matches("[A-Za-z0-9 ./-]{1,40}")) {
            return new JSONObject().put("success", false).put("msg",
                    "Référence d'avoir : 40 caractères au plus (chiffres, lettres, - / .).");
        }
        int n = em.createNativeQuery("UPDATE t_retour_fournisseur SET str_REF_AVOIR = ?1 WHERE lg_RETOUR_FRS_ID = ?2")
                .setParameter(1, s).setParameter(2, retourId).executeUpdate();
        return new JSONObject().put("success", n == 1).put("msg", n == 1 ? "" : "Retour introuvable.");
    }

    private long tolerance() {
        try {
            List<?> l = em
                    .createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_POINTAGE_BL_TOLERANCE'")
                    .getResultList();
            return l.isEmpty() ? 1 : Math.max(0, Long.parseLong(String.valueOf(l.get(0)).trim()));
        } catch (RuntimeException e) {
            return 1;
        }
    }

    /** Lecture du releve : modele du grossiste s'il existe, sinon format standard. */
    static final String LECTURE_MODELE = "MODELE", LECTURE_STANDARD = "STANDARD";
    /** Lignes du releve montrees a l'ecran de reconnaissance des colonnes. */
    static final int APERCU_MAX = 400;

    /** Modele de releve memorise pour ce grossiste, null sinon. */
    ReleveModele.Modele modele(String grossisteId) {
        List<?> l = em.createNativeQuery("SELECT str_MODELE FROM t_releve_modele WHERE lg_GROSSISTE_ID = ?1")
                .setParameter(1, grossisteId).getResultList();
        if (l.isEmpty() || l.get(0) == null) {
            return null;
        }
        try {
            return ReleveModele.Modele.lire(String.valueOf(l.get(0)));
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** Etat du reglage des colonnes pour ce grossiste. */
    @SuppressWarnings("unchecked")
    public JSONObject infoModele(String grossisteId) {
        List<Object[]> l = em.createNativeQuery("SELECT m.dt_UPDATED, CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME)"
                + " FROM t_releve_modele m LEFT JOIN t_user u ON u.lg_USER_ID = m.lg_USER_ID WHERE m.lg_GROSSISTE_ID = ?1")
                .setParameter(1, grossisteId).getResultList();
        JSONObject o = new JSONObject().put("success", true).put("memorise", !l.isEmpty());
        if (!l.isEmpty()) {
            o.put("majLe", StringUtils.defaultString(quand(l.get(0)[0]))).put("majPar",
                    StringUtils.defaultString(texte(l.get(0)[1])).trim());
        }
        return o;
    }

    /** Oublie le reglage du grossiste : ses releves sont de nouveau lus au format standard. */
    public JSONObject oublierModele(String grossisteId) {
        int n = em.createNativeQuery("DELETE FROM t_releve_modele WHERE lg_GROSSISTE_ID = ?1")
                .setParameter(1, grossisteId).executeUpdate();
        return new JSONObject().put("success", true).put("msg",
                n == 0 ? "Aucun réglage mémorisé pour ce grossiste." : "Réglage oublié : format standard.");
    }

    /**
     * Import du releve PDF : lecture (modele du grossiste, sinon format standard), rapprochement, conservation. Si rien
     * n'est lu, l'ecran propose de designer les colonnes ({@code reconnaissance}).
     */
    public JSONObject importer(String grossisteId, String emplacement, String fichier,
            List<ReleveModele.LigneBrute> brutes, String texte, String userId) {
        String lecture = LECTURE_MODELE;
        ReleveModele.Modele m = modele(grossisteId);
        List<ReleveGrossiste.Ligne> lignes = m == null ? new ArrayList<>() : ReleveModele.lire(brutes, m);
        if (lignes.isEmpty()) {
            lecture = LECTURE_STANDARD;
            lignes = ReleveGrossiste.lire(texte);
        }
        if (lignes.isEmpty()) {
            boolean texteVide = brutes.stream().allMatch(l -> l.cellules.isEmpty());
            return new JSONObject().put("success", false).put("reconnaissance", !texteVide).put("msg", texteVide
                    ? "Aucun texte dans ce PDF : c'est sans doute une image scannée. Demandez le relevé en PDF au grossiste."
                    : (m == null ? "Ce relevé n'est pas au format standard."
                            : "Le réglage mémorisé pour ce grossiste ne lit plus ce relevé (présentation changée ?).")
                            + " Désignez les colonnes du relevé : le réglage sera mémorisé pour ce grossiste.");
        }
        return enregistrer(grossisteId, emplacement, fichier, lignes, userId).put("lecture", lecture);
    }

    /** Lignes du releve rangees en colonnes, en-tetes, et colonnes proposees (reglage memorise ou devine). */
    public JSONObject apercu(String grossisteId, List<ReleveModele.LigneBrute> brutes) {
        List<ReleveModele.Colonne> cols = ReleveModele.colonnes(brutes);
        String[] entetes = ReleveModele.entetes(brutes, cols);
        ReleveModele.Modele m = modele(grossisteId);
        /* reglage memorise propose s'il lit ce releve, sinon colonnes devinees */
        java.util.Map<ReleveModele.Champ, Integer> choix = m == null || ReleveModele.lire(brutes, m).isEmpty()
                ? new java.util.EnumMap<>(ReleveModele.Champ.class) : ReleveModele.rangs(m, cols);
        if (choix.isEmpty()) {
            choix = ReleveModele.deviner(brutes, cols);
        }
        JSONArray colonnes = new JSONArray();
        for (int i = 0; i < cols.size(); i++) {
            colonnes.put(new JSONObject().put("rang", i).put("entete", entetes[i]));
        }
        JSONArray lignes = new JSONArray();
        for (ReleveModele.LigneBrute l : brutes) {
            if (lignes.length() >= APERCU_MAX) {
                break;
            }
            if (!l.cellules.isEmpty()) {
                lignes.put(new JSONObject().put("n", lignes.length()).put("page", l.page).put("valeurs",
                        new JSONArray(java.util.Arrays.asList(ReleveModele.ranger(l, cols)))));
            }
        }
        JSONObject champs = new JSONObject();
        choix.forEach((k, v) -> champs.put(k.name(), v));
        JSONArray disponibles = new JSONArray();
        for (ReleveModele.Champ c : ReleveModele.Champ.values()) {
            disponibles.put(new JSONObject().put("champ", c.name()).put("libelle", c.libelle));
        }
        return new JSONObject().put("success", true).put("colonnes", colonnes).put("lignes", lignes)
                .put("tronque", brutes.size() > APERCU_MAX).put("champs", champs).put("disponibles", disponibles)
                .put("marqueursAvoir", m == null ? "AV" : m.marqueursAvoir).put("memorise", m != null);
    }

    /** Choix de colonnes envoye par l'ecran : { "NUMERO": 1, "DATE": 0, ... }. */
    static java.util.Map<ReleveModele.Champ, Integer> choix(JSONObject champs, int nbColonnes) {
        java.util.Map<ReleveModele.Champ, Integer> r = new java.util.EnumMap<>(ReleveModele.Champ.class);
        if (champs == null) {
            return r;
        }
        for (ReleveModele.Champ c : ReleveModele.Champ.values()) {
            int i = champs.optInt(c.name(), -1);
            if (i >= 0 && i < nbColonnes) {
                r.put(c, i);
            }
        }
        return r;
    }

    private static final class Lecture {

        final List<ReleveGrossiste.Ligne> lignes = new ArrayList<>();
        final JSONArray reconnues = new JSONArray();
        String erreur;
    }

    private static Lecture lire(List<ReleveModele.LigneBrute> brutes, JSONObject champs, String marqueurs) {
        Lecture r = new Lecture();
        List<ReleveModele.Colonne> cols = ReleveModele.colonnes(brutes);
        java.util.Map<ReleveModele.Champ, Integer> choix = choix(champs, cols.size());
        ReleveModele.Modele m = ReleveModele.modele(choix, cols, marqueurs);
        r.erreur = m.incomplet();
        if (r.erreur != null) {
            return r;
        }
        int n = 0;
        for (ReleveModele.LigneBrute l : brutes) {
            if (l.cellules.isEmpty()) {
                continue;
            }
            ReleveGrossiste.Ligne x = ReleveModele.ligne(ReleveModele.ranger(l, cols), choix, m.marqueursAvoir);
            if (x != null) {
                r.lignes.add(x);
                if (n < APERCU_MAX) {
                    r.reconnues.put(new JSONObject().put("n", n).put("type", x.type.name()).put("numero", x.numero)
                            .put("sequence", x.sequence).put("date", x.date.format(JJ_MM_AAAA))
                            .put("montantHt", x.montantHt));
                }
            }
            n++;
        }
        return r;
    }

    /** Essai des colonnes choisies : lignes reconnues et totaux, sans rien enregistrer. */
    public JSONObject essayer(List<ReleveModele.LigneBrute> brutes, JSONObject champs, String marqueurs) {
        Lecture r = lire(brutes, champs, marqueurs);
        long[] t = RapprochementBL.totaux(r.lignes, java.util.Collections.emptyList());
        return new JSONObject().put("success", true).put("msg", StringUtils.defaultString(r.erreur))
                .put("reconnues", r.reconnues).put("nombre", r.lignes.size()).put("totalBl", t[0])
                .put("totalAvoirs", t[1]);
    }

    /** Applique les colonnes choisies, memorise le reglage du grossiste et rapproche le releve. */
    public JSONObject appliquerModele(String grossisteId, String emplacement, String fichier,
            List<ReleveModele.LigneBrute> brutes, JSONObject champs, String marqueurs, String userId) {
        Lecture r = lire(brutes, champs, marqueurs);
        if (r.erreur != null) {
            return new JSONObject().put("success", false).put("msg", r.erreur);
        }
        if (r.lignes.isEmpty()) {
            return new JSONObject().put("success", false).put("msg",
                    "Aucune ligne reconnue avec ces colonnes : vérifiez la colonne de la date, du N° BL et du montant.");
        }
        List<ReleveModele.Colonne> cols = ReleveModele.colonnes(brutes);
        String json = ReleveModele.modele(choix(champs, cols.size()), cols, marqueurs).json().toString();
        em.createNativeQuery("INSERT INTO t_releve_modele (lg_GROSSISTE_ID, str_MODELE, dt_UPDATED, lg_USER_ID)"
                + " VALUES (?1, ?2, NOW(), ?3) ON DUPLICATE KEY UPDATE str_MODELE = VALUES(str_MODELE),"
                + " dt_UPDATED = NOW(), lg_USER_ID = VALUES(lg_USER_ID)").setParameter(1, grossisteId)
                .setParameter(2, json).setParameter(3, userId).executeUpdate();
        return enregistrer(grossisteId, emplacement, fichier, r.lignes, userId).put("lecture", LECTURE_MODELE);
    }

    /** Rapprochement des lignes lues et conservation du releve. */
    JSONObject enregistrer(String grossisteId, String emplacement, String fichier, List<ReleveGrossiste.Ligne> lignes,
            String userId) {
        LocalDate debut = lignes.stream().map(l -> l.date).min(LocalDate::compareTo).get();
        LocalDate finR = lignes.stream().map(l -> l.date).max(LocalDate::compareTo).get();
        List<PieceVue> vues = pieces(grossisteId, emplacement, debut.minusDays(MARGE_JOURS),
                finR.plusDays(MARGE_JOURS));
        List<Piece> pieces = new ArrayList<>();
        java.util.Map<String, PieceVue> parCle = new java.util.HashMap<>();
        vues.forEach(v -> {
            pieces.add(v.piece());
            parCle.put(v.type + ":" + v.id, v);
        });
        List<Resultat> resultats = new ArrayList<>();
        for (Resultat r : RapprochementBL.rapprocher(lignes, pieces, tolerance())) {
            /* une piece Prestige hors de la periode du releve n'est pas « absente du releve » */
            if (r.statut == Statut.ABSENT_RELEVE
                    && (r.piece.date == null || r.piece.date.isBefore(debut) || r.piece.date.isAfter(finR))) {
                continue;
            }
            resultats.add(r);
        }
        long[] t = RapprochementBL.totaux(lignes, java.util.Collections.emptyList());
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO t_releve_grossiste (lg_RELEVE_ID, lg_GROSSISTE_ID, lg_EMPLACEMENT_ID,"
                + " str_FICHIER, dt_DEBUT, dt_FIN, int_LIGNES, int_TOTAL_BL, int_TOTAL_AVOIRS, dt_IMPORT, lg_USER_ID)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NOW(), ?10)").setParameter(1, id)
                .setParameter(2, grossisteId).setParameter(3, emplacement)
                .setParameter(4, StringUtils.left(StringUtils.defaultString(fichier), 255))
                .setParameter(5, java.sql.Date.valueOf(debut)).setParameter(6, java.sql.Date.valueOf(finR))
                .setParameter(7, lignes.size()).setParameter(8, t[0]).setParameter(9, t[1]).setParameter(10, userId)
                .executeUpdate();
        int rang = 0;
        for (Resultat r : resultats) {
            PieceVue v = r.piece == null ? null : parCle.get(r.piece.id);
            Query q = em.createNativeQuery("INSERT INTO t_releve_grossiste_ligne (lg_LIGNE_ID, lg_RELEVE_ID, int_RANG,"
                    + " str_TYPE, str_NUMERO, str_SEQUENCE, dt_DATE, int_MONTANT_HT, str_STATUT, str_PIECE_TYPE,"
                    + " lg_PIECE_ID, str_PIECE_REF, int_PIECE_HT, int_ECART)"
                    + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)");
            q.setParameter(1, UUID.randomUUID().toString()).setParameter(2, id).setParameter(3, rang++);
            q.setParameter(4, r.releve == null ? null : (r.releve.type == ReleveGrossiste.Type.AVOIR ? "AV/BL" : "BL"));
            q.setParameter(5, r.releve == null ? null : r.releve.numero);
            q.setParameter(6, r.releve == null ? null : r.releve.sequence);
            q.setParameter(7, r.releve == null ? null : java.sql.Date.valueOf(r.releve.date));
            q.setParameter(8, r.releve == null ? null : r.releve.montantHt);
            q.setParameter(9, r.statut.name());
            q.setParameter(10, v == null ? null : v.type).setParameter(11, v == null ? null : v.id);
            q.setParameter(12, v == null ? null : StringUtils.left(v.reference, 40));
            q.setParameter(13, v == null ? null : (TYPE_BL.equals(v.type) ? v.montantHt : -Math.abs(v.montantHt)));
            q.setParameter(14, r.statut == Statut.ECART ? r.ecart : null);
            q.executeUpdate();
        }
        return releve(id);
    }

    /** Releve importe et son rapprochement. */
    @SuppressWarnings("unchecked")
    public JSONObject releve(String releveId) {
        List<Object[]> e = em.createNativeQuery("SELECT r.lg_GROSSISTE_ID, g.str_LIBELLE, r.str_FICHIER, r.dt_DEBUT,"
                + " r.dt_FIN, r.int_LIGNES, r.int_TOTAL_BL, r.int_TOTAL_AVOIRS, r.dt_IMPORT"
                + " FROM t_releve_grossiste r LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = r.lg_GROSSISTE_ID"
                + " WHERE r.lg_RELEVE_ID = ?1").setParameter(1, releveId).getResultList();
        if (e.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Relevé introuvable.");
        }
        Object[] h = e.get(0);
        JSONArray data = new JSONArray();
        java.util.Map<String, Integer> compte = new java.util.HashMap<>();
        long prestigeBl = 0, prestigeAvoirs = 0;
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT str_STATUT, str_TYPE, str_NUMERO, str_SEQUENCE,"
                + " dt_DATE, int_MONTANT_HT, str_PIECE_TYPE, lg_PIECE_ID, str_PIECE_REF, int_PIECE_HT, int_ECART"
                + " FROM t_releve_grossiste_ligne WHERE lg_RELEVE_ID = ?1 ORDER BY int_RANG").setParameter(1, releveId)
                .getResultList()) {
            String statut = texte(r[0]);
            compte.merge(statut, 1, Integer::sum);
            if (r[9] != null) {
                if (TYPE_BL.equals(r[6])) {
                    prestigeBl += nombre(r[9]);
                } else {
                    prestigeAvoirs += nombre(r[9]);
                }
            }
            LocalDate d = date(r[4]);
            data.put(new JSONObject().put("statut", statut).put("type", StringUtils.defaultString(texte(r[1])))
                    .put("numero", StringUtils.defaultString(texte(r[2])))
                    .put("sequence", StringUtils.defaultString(texte(r[3])))
                    .put("date", d == null ? "" : d.format(JJ_MM_AAAA))
                    .put("montantReleve", r[5] == null ? JSONObject.NULL : nombre(r[5]))
                    .put("pieceType", StringUtils.defaultString(texte(r[6])))
                    .put("pieceId", StringUtils.defaultString(texte(r[7])))
                    .put("pieceReference", StringUtils.defaultString(texte(r[8])))
                    .put("montantPrestige", r[9] == null ? JSONObject.NULL : nombre(r[9]))
                    .put("ecart", r[10] == null ? JSONObject.NULL : nombre(r[10])));
        }
        JSONObject compteurs = new JSONObject();
        for (Statut s : Statut.values()) {
            compteurs.put(s.name(), compte.getOrDefault(s.name(), 0));
        }
        long relBl = nombre(h[6]), relAv = nombre(h[7]);
        return new JSONObject().put("success", true).put("id", releveId).put("grossisteId", texte(h[0]))
                .put("grossiste", StringUtils.defaultString(texte(h[1])))
                .put("fichier", StringUtils.defaultString(texte(h[2])))
                .put("du", date(h[3]) == null ? "" : date(h[3]).format(JJ_MM_AAAA))
                .put("au", date(h[4]) == null ? "" : date(h[4]).format(JJ_MM_AAAA)).put("lignes", nombre(h[5]))
                .put("importeLe", StringUtils.defaultString(quand(h[8]))).put("compteurs", compteurs)
                .put("totaux",
                        new JSONObject().put("releveBl", relBl).put("releveAvoirs", relAv)
                                .put("releveNet", relBl + relAv).put("prestigeBl", prestigeBl)
                                .put("prestigeAvoirs", prestigeAvoirs).put("prestigeNet", prestigeBl + prestigeAvoirs)
                                .put("ecartNet", relBl + relAv - prestigeBl - prestigeAvoirs))
                .put("data", data).put("total", data.length());
    }

    /** Releves importes pour un grossiste (les plus recents d'abord). */
    @SuppressWarnings("unchecked")
    public JSONObject releves(String grossisteId, String emplacement) {
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT lg_RELEVE_ID, str_FICHIER, dt_DEBUT, dt_FIN,"
                + " int_LIGNES, dt_IMPORT FROM t_releve_grossiste WHERE lg_GROSSISTE_ID = ?1 AND lg_EMPLACEMENT_ID = ?2"
                + " ORDER BY dt_IMPORT DESC").setParameter(1, grossisteId).setParameter(2, emplacement)
                .setMaxResults(50).getResultList()) {
            data.put(new JSONObject().put("id", texte(r[0])).put("fichier", StringUtils.defaultString(texte(r[1])))
                    .put("du", date(r[2]) == null ? "" : date(r[2]).format(JJ_MM_AAAA))
                    .put("au", date(r[3]) == null ? "" : date(r[3]).format(JJ_MM_AAAA)).put("lignes", nombre(r[4]))
                    .put("importeLe", StringUtils.defaultString(quand(r[5]))));
        }
        return new JSONObject().put("success", true).put("data", data).put("total", data.length());
    }

    /** Pointe d'un coup les BL et retours rapproches de ce releve (non encore pointes). */
    public JSONObject pointerRapproches(String releveId, String userId) {
        int bl = em
                .createNativeQuery("UPDATE t_bon_livraison b JOIN t_releve_grossiste_ligne l"
                        + " ON l.lg_PIECE_ID = b.lg_BON_LIVRAISON_ID AND l.str_PIECE_TYPE = 'BL'"
                        + " SET b.dt_POINTAGE = NOW(), b.lg_POINTAGE_USER = ?1"
                        + " WHERE l.lg_RELEVE_ID = ?2 AND l.str_STATUT = 'RAPPROCHE' AND b.dt_POINTAGE IS NULL")
                .setParameter(1, userId).setParameter(2, releveId).executeUpdate();
        int av = em
                .createNativeQuery("UPDATE t_retour_fournisseur rf JOIN t_releve_grossiste_ligne l"
                        + " ON l.lg_PIECE_ID = rf.lg_RETOUR_FRS_ID AND l.str_PIECE_TYPE = 'RETOUR'"
                        + " SET rf.dt_POINTAGE = NOW(), rf.lg_POINTAGE_USER = ?1"
                        + " WHERE l.lg_RELEVE_ID = ?2 AND l.str_STATUT = 'RAPPROCHE' AND rf.dt_POINTAGE IS NULL")
                .setParameter(1, userId).setParameter(2, releveId).executeUpdate();
        return new JSONObject().put("success", true).put("bl", bl).put("avoirs", av).put("msg",
                bl + " BL et " + av + " avoir(s) pointé(s).");
    }
}
