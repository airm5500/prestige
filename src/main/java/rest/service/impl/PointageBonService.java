package rest.service.impl;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;

import org.json.JSONArray;
import org.json.JSONObject;

import dal.TUser;
import rest.service.impl.pointage.RegleControleBon;
import rest.service.impl.pointage.RegleControleBon.Controle;
import rest.service.impl.pointage.RegleControleBon.Niveau;
import util.DateConverter;
import util.IdGenerator;

/**
 * Pointage des bons par organisme (15/11).
 *
 * Les bons sont ceux de l'onglet « Bons » (ListDesBonServiceImpl) pour un organisme et une periode : vente cloturee,
 * non annulee, non importee, montant positif, hors depot, sur l'emplacement de l'utilisateur, periode sur la date de la
 * vente (dt_UPDATED). Le meme nombre de bons doit donc apparaitre dans les deux onglets.
 *
 * Pour chaque bon : six controles automatiques (RegleControleBon), l'etat de pointage (t_pointage_bon, un bon modifie
 * depuis repasse « a pointer »), les compteurs (en base, annonces, pointes, conformes, anomalies, alertes, montant).
 * Aucun nom n'est journalise.
 */
@Stateless
public class PointageBonService {

    public static final String CONFORME = "CONFORME", ANOMALIE = "ANOMALIE", ABSENT = "ABSENT";

    @EJB
    private rest.service.GenerateTicketService tickets;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /* bons de l'organisme sur la periode, avec tout ce qu'il faut aux controles */
    private static final String BONS = "SELECT cp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID AS id, cp.str_REF_BON AS bon,"
            + " p.lg_PREENREGISTREMENT_ID AS vente, p.str_REF AS refVente, p.dt_UPDATED AS dateVente,"
            + " p.dt_CREATED_ORDONNANCE AS dateOrdo, cp.int_PERCENT AS taux, cl.int_POURCENTAGE AS tauxContrat,"
            + " cp.int_PRICE AS part, p.int_PRICE AS montantVente, cl.str_NUMERO_SECURITE_SOCIAL AS matricule,"
            + " clt.lg_CLIENT_ID AS client, CONCAT_WS(' ', clt.str_FIRST_NAME, clt.str_LAST_NAME) AS assure,"
            + " p.lg_AYANTS_DROITS_ID AS ayantDroit, CONCAT_WS(' ', ayd.str_FIRST_NAME, ayd.str_LAST_NAME) AS nomAyantDroit,"
            + " ayd.lg_CLIENT_ID AS clientAyantDroit,"
            + " (SELECT COALESCE(SUM(c2.int_PRICE), 0) FROM t_preenregistrement_compte_client_tiers_payent c2"
            + "   WHERE c2.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) AS sommeParts,"
            + " (SELECT COALESCE(SUM(CASE WHEN d.calculation_base_price IS NOT NULL THEN d.calculation_base_price * d.int_QUANTITY"
            + "   ELSE d.int_PRICE END), 0) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + "   AND COALESCE(d.comptant, 0) = 0) AS base,"
            + " (SELECT COUNT(*) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID) AS lignes,"
            + " (SELECT COUNT(*) FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + "   WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND d.int_PRICE_UNITAIR <> f.int_PRICE) AS prixDiff,"
            + " (SELECT COUNT(DISTINCT cpt2.lg_CLIENT_ID) FROM t_compte_client_tiers_payant cl2"
            + "   JOIN t_compte_client cpt2 ON cpt2.lg_COMPTE_CLIENT_ID = cl2.lg_COMPTE_CLIENT_ID"
            + "   WHERE cl2.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND TRIM(cl2.str_NUMERO_SECURITE_SOCIAL) = TRIM(cl.str_NUMERO_SECURITE_SOCIAL)"
            + "   AND TRIM(cl.str_NUMERO_SECURITE_SOCIAL) <> '' AND cpt2.lg_CLIENT_ID <> clt.lg_CLIENT_ID) AS autresMatricule,"
            + " (SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent c3"
            + "   JOIN t_compte_client_tiers_payant cl3 ON cl3.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c3.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
            + "   JOIN t_preenregistrement p3 ON p3.lg_PREENREGISTREMENT_ID = c3.lg_PREENREGISTREMENT_ID"
            + "   WHERE cl3.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND c3.str_REF_BON = cp.str_REF_BON AND TRIM(cp.str_REF_BON) <> ''"
            + "   AND p3.b_IS_CANCEL = 0 AND p3.str_STATUT = 'is_Closed'"
            + "   AND c3.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID <> cp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID) AS doublons,"
            + " tp.int_DELAI_SAISIE_BON AS delaiTp, grp.int_DELAI_SAISIE_BON AS delaiGroupe,"
            + " pb.str_RESULTAT AS resultat, pb.int_BLOC AS bloc, pb.str_MOTIF AS motif, pb.int_PRICE_POINTE AS prixPointe,"
            + " pb.dt_BON_UPDATED AS majPointee, cp.dt_UPDATED AS majBon, pb.dt_UPDATED AS dtPointage,"
            + " CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME) AS pointePar"
            + " FROM t_preenregistrement_compte_client_tiers_payent cp"
            + " JOIN t_compte_client_tiers_payant cl ON cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
            + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = cl.lg_TIERS_PAYANT_ID"
            + " LEFT JOIN t_groupe_tierspayant grp ON grp.lg_GROUPE_ID = tp.lg_GROUPE_ID"
            + " JOIN t_type_tiers_payant typeTp ON typeTp.lg_TYPE_TIERS_PAYANT_ID = tp.lg_TYPE_TIERS_PAYANT_ID"
            + " JOIN t_compte_client cpt ON cpt.lg_COMPTE_CLIENT_ID = cl.lg_COMPTE_CLIENT_ID"
            + " JOIN t_client clt ON clt.lg_CLIENT_ID = cpt.lg_CLIENT_ID"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = cp.lg_PREENREGISTREMENT_ID"
            + " JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID AND m.typeTransaction = 1 AND m.lg_EMPLACEMENT_ID = ?4"
            + " LEFT JOIN t_ayant_droit ayd ON ayd.lg_AYANTS_DROITS_ID = p.lg_AYANTS_DROITS_ID"
            + " LEFT JOIN t_pointage_bon pb ON pb.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = cp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID"
            + " LEFT JOIN t_user u ON u.lg_USER_ID = pb.lg_USER_ID"
            + " WHERE tp.lg_TIERS_PAYANT_ID = ?5 AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED <= ?2 AND p.str_STATUT = 'is_Closed'"
            + " AND p.lg_TYPE_VENTE_ID <> ?3 AND p.imported = 0 AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + " ORDER BY p.dt_UPDATED, cp.str_REF_BON";

    /* rang des colonnes de BONS */
    private static final int ID = 0, BON = 1, VENTE = 2, REF_VENTE = 3, DATE_VENTE = 4, DATE_ORDO = 5, TAUX = 6,
            TAUX_CONTRAT = 7, PART = 8, MONTANT_VENTE = 9, MATRICULE = 10, CLIENT = 11, ASSURE = 12, AYANT_DROIT = 13,
            NOM_AYANT_DROIT = 14, CLIENT_AYANT_DROIT = 15, SOMME_PARTS = 16, BASE = 17, LIGNES = 18, PRIX_DIFF = 19,
            AUTRES_MATRICULE = 20, DOUBLONS = 21, DELAI_TP = 22, DELAI_GROUPE = 23, RESULTAT = 24, BLOC = 25,
            MOTIF = 26, PRIX_POINTE = 27, MAJ_POINTEE = 28, MAJ_BON = 29, DT_POINTAGE = 30, POINTE_PAR = 31;

    /** Un bon et ses controles. */
    public static final class Bon {
        public JSONObject json;
        public String etat;
        public Niveau alerte;
        public long part;
        public List<Controle> controles = new ArrayList<>();
        public JSONArray produits;
    }

    public List<Bon> bons(TUser user, String tiersPayantId, LocalDate debut, LocalDate fin) {
        Query q = em.createNativeQuery(BONS);
        q.setParameter(1, Timestamp.valueOf(debut.atStartOfDay()));
        q.setParameter(2, Timestamp.valueOf(fin.atTime(23, 59, 59)));
        q.setParameter(3, DateConverter.DEPOT_EXTENSION);
        q.setParameter(4, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        q.setParameter(5, tiersPayantId);
        @SuppressWarnings("unchecked")
        List<Object[]> rs = q.getResultList();
        List<Bon> l = new ArrayList<>();
        Map<String, Boolean> vus = new HashMap<>();
        for (Object[] r : rs) {
            String id = (String) r[0];
            if (vus.put(id, Boolean.TRUE) != null) {
                continue; // plusieurs mouvements de caisse pour une vente : un bon une seule fois
            }
            l.add(bon(r));
        }
        return l;
    }

    private static Integer entier(Object o) {
        return o == null ? null : ((Number) o).intValue();
    }

    private static long lng(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    private static LocalDateTime dt(Object o) {
        return o == null ? null : ((Timestamp) o).toLocalDateTime();
    }

    private static LocalDate jour(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof java.sql.Date) {
            return ((java.sql.Date) o).toLocalDate();
        }
        return ((java.util.Date) o).toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
    }

    private static String txt(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private Bon bon(Object[] r) {
        Bon b = new Bon();
        Integer delaiTp = entier(r[DELAI_TP]), delaiGr = entier(r[DELAI_GROUPE]);
        Integer delai = RegleControleBon.delaiApplicable(delaiTp, delaiGr);
        String origine = delai == null ? null : (delaiTp != null && delaiTp >= 0 ? "organisme" : "groupe");
        LocalDateTime dateVente = dt(r[DATE_VENTE]);
        b.part = lng(r[PART]);
        Controle assure = RegleControleBon.assure(txt(r[MATRICULE]), entier(r[AUTRES_MATRICULE]));
        Controle ayant = RegleControleBon.ayantDroit(r[AYANT_DROIT] != null,
                r[AYANT_DROIT] == null || txt(r[CLIENT_AYANT_DROIT]).equals(txt(r[CLIENT])));
        Controle taux = RegleControleBon.taux(entier(r[TAUX]), entier(r[TAUX_CONTRAT]));
        Controle produits = RegleControleBon.produits(entier(r[LIGNES]), entier(r[PRIX_DIFF]));
        Controle montant = RegleControleBon.montant(lng(r[BASE]), entier(r[TAUX]), b.part, lng(r[MONTANT_VENTE]),
                lng(r[SOMME_PARTS]));
        Controle date = RegleControleBon.date(jour(r[DATE_ORDO]), dateVente == null ? null : dateVente.toLocalDate(),
                delai, origine);
        b.controles.add(assure);
        b.controles.add(ayant);
        b.controles.add(taux);
        b.controles.add(produits);
        b.controles.add(montant);
        b.controles.add(date);
        String numero = txt(r[BON]);
        int doublons = entier(r[DOUBLONS]);
        List<String> alertesBon = new ArrayList<>();
        if (numero.isEmpty()) {
            alertesBon.add("N° de bon vide");
        } else if (doublons > 0) {
            alertesBon
                    .add("N° de bon " + numero + " déjà utilisé sur " + doublons + " autre(s) bon(s) de cet organisme");
        }
        Niveau pire = RegleControleBon.pire(b.controles.toArray(new Controle[0]));
        b.alerte = alertesBon.isEmpty() ? pire : Niveau.ALERTE;
        Object resultat = r[RESULTAT];
        b.etat = RegleControleBon.etat((String) resultat, entier(r[PRIX_POINTE]), dt(r[MAJ_POINTEE]), (int) b.part,
                dt(r[MAJ_BON]));
        JSONArray ctr = new JSONArray();
        String premiereAlerte = alertesBon.isEmpty() ? null : alertesBon.get(0);
        for (Controle c : b.controles) {
            ctr.put(new JSONObject().put("bloc", c.bloc).put("niveau", c.niveau.name()).put("texte", c.texte));
            if (premiereAlerte == null && c.niveau == Niveau.ALERTE) {
                premiereAlerte = c.texte;
            }
        }
        b.json = new JSONObject().put("id", r[ID]).put("bon", numero).put("vente", r[VENTE])
                .put("refVente", txt(r[REF_VENTE]))
                .put("dateVente", dateVente == null ? JSONObject.NULL : dateVente.toString())
                .put("dateOrdonnance", r[DATE_ORDO] == null ? JSONObject.NULL : jour(r[DATE_ORDO]).toString())
                .put("assure", txt(r[ASSURE])).put("matricule", txt(r[MATRICULE]))
                .put("ayantDroit", r[AYANT_DROIT] == null ? "" : txt(r[NOM_AYANT_DROIT]))
                .put("taux", r[TAUX] == null ? JSONObject.NULL : entier(r[TAUX])).put("part", b.part)
                .put("montantVente", lng(r[MONTANT_VENTE])).put("controles", ctr)
                .put("alertesBon", new JSONArray(alertesBon)).put("alerte", b.alerte.name())
                .put("resumeAlerte", premiereAlerte == null ? JSONObject.NULL : premiereAlerte).put("etat", b.etat)
                .put("resultat", resultat == null ? JSONObject.NULL : resultat)
                .put("blocAnomalie", r[BLOC] == null ? JSONObject.NULL : entier(r[BLOC]))
                .put("motif", r[MOTIF] == null ? JSONObject.NULL : r[MOTIF])
                .put("modifieDepuis", resultat != null && "A_POINTER".equals(b.etat))
                .put("pointeLe", r[DT_POINTAGE] == null ? JSONObject.NULL : dt(r[DT_POINTAGE]).toString())
                .put("pointePar", txt(r[POINTE_PAR])).put("delai", delai == null ? JSONObject.NULL : delai);
        return b;
    }

    /** Filtre de la liste : A_POINTER, TOUS, ALERTES, ANOMALIES. */
    public static boolean garder(Bon b, String filtre) {
        switch (filtre == null ? "TOUS" : filtre) {
        case "A_POINTER":
            return "A_POINTER".equals(b.etat);
        case "ALERTES":
            return b.alerte == Niveau.ALERTE;
        case "ANOMALIES":
            return ANOMALIE.equals(b.etat) || ABSENT.equals(b.etat);
        default:
            return true;
        }
    }

    public JSONObject liste(TUser user, String tp, LocalDate debut, LocalDate fin, String filtre, String recherche) {
        List<Bon> tous = bons(user, tp, debut, fin);
        JSONArray data = new JSONArray();
        String r = recherche == null ? "" : recherche.trim().toLowerCase(Locale.FRANCE);
        for (Bon b : tous) {
            if (garder(b, filtre) && (r.isEmpty() || b.json.optString("bon").toLowerCase(Locale.FRANCE).contains(r)
                    || b.json.optString("matricule").toLowerCase(Locale.FRANCE).contains(r))) {
                data.put(b.json);
            }
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data).put("compteurs",
                compteurs(user, tp, debut, fin, tous));
    }

    public JSONObject compteurs(TUser user, String tp, LocalDate debut, LocalDate fin, List<Bon> tous) {
        int pointes = 0, conformes = 0, anomalies = 0, alertes = 0;
        long montant = 0;
        for (Bon b : tous) {
            montant += b.part;
            if (!"A_POINTER".equals(b.etat)) {
                pointes++;
            }
            if (CONFORME.equals(b.etat)) {
                conformes++;
            }
            if (ANOMALIE.equals(b.etat) || ABSENT.equals(b.etat)) {
                anomalies++;
            }
            if (b.alerte == Niveau.ALERTE) {
                alertes++;
            }
        }
        Integer annonces = annonces(tp, debut, fin);
        return new JSONObject().put("enBase", tous.size())
                .put("annonces", annonces == null ? JSONObject.NULL : annonces)
                .put("ecart", annonces == null ? JSONObject.NULL : tous.size() - annonces).put("pointes", pointes)
                .put("conformes", conformes).put("anomalies", anomalies).put("alertes", alertes).put("montant", montant)
                .put("aPointer", tous.size() - pointes);
    }

    /** Fiche de controle d'un bon : le bon, ses controles et ses produits. */
    public JSONObject fiche(TUser user, String tp, LocalDate debut, LocalDate fin, String bonId) {
        for (Bon b : bons(user, tp, debut, fin)) {
            if (b.json.optString("id").equals(bonId)) {
                return new JSONObject().put("success", true).put("bon", b.json)
                        .put("produits", produits(b.json.getString("vente")))
                        .put("ticket", corpsTicket(b.json.getString("vente")));
            }
        }
        return new JSONObject().put("success", false).put("msg",
                "Bon introuvable pour cet organisme et cette période.");
    }

    /**
     * Demande du 15/11 : les lignes de la vente telles que le ticket les imprime (meme construction que la
     * reimpression, sans impression) : designation, « quantite × prix », lot, montant, puis les lignes propres a
     * l'article (« Taux 70 % : part », « P[…] * T[…%] : part »), comme le ticket les imprime quand
     * KEY_LIGNE_COMPTANT_VO vaut 1, quel que soit ce parametre. Vide si le ticket ne peut pas etre construit.
     */
    private JSONArray corpsTicket(String vente) {
        JSONArray a = new JSONArray();
        try {
            List<rest.service.ticket.TicketDocument> docs = tickets.apercuTicketVoDetaille(vente);
            if (docs == null || docs.isEmpty()) {
                return a;
            }
            rest.service.ticket.TicketDocument doc = docs.get(0);
            for (rest.service.ticket.TicketDocument d : docs) {
                if ("VENTE_ASSURANCE".equals(d.ticket().name())) {
                    doc = d;
                    break;
                }
            }
            rest.service.ticket.TicketDocument.Bloc corps = doc.existant(rest.service.ticket.TicketDocument.CORPS);
            if (corps == null) {
                return a;
            }
            JSONObject article = null;
            for (rest.service.ticket.TicketDocument.Element e : corps.elements) {
                if (e.genre == rest.service.ticket.TicketDocument.Genre.ARTICLE) {
                    article = new JSONObject().put("designation", sansGras(e.a)).put("detail", sansGras(e.b))
                            .put("lot", sansGras(e.c)).put("montant", sansGras(e.d)).put("lignes", new JSONArray());
                    a.put(article);
                } else if (e.genre == rest.service.ticket.TicketDocument.Genre.TEXTE && article != null) {
                    article.getJSONArray("lignes").put(sansGras(e.a));
                }
            }
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(PointageBonService.class.getName()).log(java.util.logging.Level.WARNING,
                    "corps du ticket de la vente {0} : {1}", new Object[] { vente, e.getMessage() });
        }
        return a;
    }

    private static String sansGras(String t) {
        return t == null ? "" : t.replace(String.valueOf(rest.service.ticket.TicketDocument.GRAS_DEBUT), "")
                .replace(String.valueOf(rest.service.ticket.TicketDocument.GRAS_FIN), "");
    }

    private JSONArray produits(String vente) {
        @SuppressWarnings("unchecked")
        List<Object[]> rs = em.createNativeQuery(
                "SELECT f.str_NAME AS produit, d.int_QUANTITY AS quantite, d.int_PRICE_UNITAIR AS prix,"
                        + " f.int_PRICE AS prixFiche, d.int_PRICE AS montant"
                        + " FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                        + " WHERE d.lg_PREENREGISTREMENT_ID = ?1 ORDER BY f.str_NAME")
                .setParameter(1, vente).getResultList();
        JSONArray a = new JSONArray();
        for (Object[] r : rs) {
            a.put(new JSONObject().put("produit", txt(r[0])).put("quantite", lng(r[1])).put("prix", lng(r[2]))
                    .put("prixFiche", lng(r[3])).put("montant", lng(r[4])));
        }
        return a;
    }

    /**
     * Enregistre le pointage d'un bon (un seul par bon, le dernier fait foi). Le montant et la date de mise a jour du
     * bon sont gardes : si le bon change ensuite, il repasse « a pointer ».
     */
    public JSONObject pointer(TUser user, JSONObject o) {
        String id = o.optString("id", "");
        String resultat = o.optString("resultat", "");
        if (!CONFORME.equals(resultat) && !ANOMALIE.equals(resultat) && !ABSENT.equals(resultat)) {
            return new JSONObject().put("success", false).put("msg", "Résultat inconnu.");
        }
        Integer bloc = o.isNull("bloc") || !o.has("bloc") ? null : o.getInt("bloc");
        String motif = o.optString("motif", "").trim();
        if (ANOMALIE.equals(resultat) && (bloc == null || bloc < 1 || bloc > 6)) {
            return new JSONObject().put("success", false).put("msg", "Choisissez le bloc faux (1 à 6).");
        }
        if (motif.length() > 255) {
            motif = motif.substring(0, 255);
        }
        @SuppressWarnings("unchecked")
        List<Object[]> rs = em
                .createNativeQuery("SELECT cp.int_PRICE, cp.dt_UPDATED, cl.lg_TIERS_PAYANT_ID"
                        + " FROM t_preenregistrement_compte_client_tiers_payent cp JOIN t_compte_client_tiers_payant cl"
                        + " ON cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                        + " WHERE cp.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = ?1 FOR UPDATE")
                .setParameter(1, id).getResultList();
        if (rs.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Bon introuvable.");
        }
        Object[] b = rs.get(0);
        int n = em
                .createNativeQuery("UPDATE t_pointage_bon SET str_RESULTAT = ?2, int_BLOC = ?3, str_MOTIF = ?4,"
                        + " int_PRICE_POINTE = ?5, dt_BON_UPDATED = ?6, lg_USER_ID = ?7, dt_UPDATED = NOW()"
                        + " WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = ?1")
                .setParameter(1, id).setParameter(2, resultat).setParameter(3, CONFORME.equals(resultat) ? null : bloc)
                .setParameter(4, CONFORME.equals(resultat) || motif.isEmpty() ? null : motif).setParameter(5, b[0])
                .setParameter(6, b[1]).setParameter(7, user.getLgUSERID()).executeUpdate();
        if (n == 0) {
            em.createNativeQuery("INSERT INTO t_pointage_bon (id, lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID,"
                    + " lg_TIERS_PAYANT_ID, str_RESULTAT, int_BLOC, str_MOTIF, int_PRICE_POINTE, dt_BON_UPDATED, lg_USER_ID,"
                    + " dt_CREATED, dt_UPDATED) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NOW(), NOW())")
                    .setParameter(1, IdGenerator.getComplexId()).setParameter(2, id).setParameter(3, b[2])
                    .setParameter(4, resultat).setParameter(5, CONFORME.equals(resultat) ? null : bloc)
                    .setParameter(6, CONFORME.equals(resultat) || motif.isEmpty() ? null : motif).setParameter(7, b[0])
                    .setParameter(8, b[1]).setParameter(9, user.getLgUSERID()).executeUpdate();
        }
        return new JSONObject().put("success", true).put("resultat", resultat);
    }

    public Integer annonces(String tp, LocalDate debut, LocalDate fin) {
        List<?> r = em
                .createNativeQuery("SELECT int_ANNONCES FROM t_pointage_annonce WHERE lg_TIERS_PAYANT_ID = ?1"
                        + " AND dt_DEBUT = ?2 AND dt_FIN = ?3")
                .setParameter(1, tp).setParameter(2, java.sql.Date.valueOf(debut))
                .setParameter(3, java.sql.Date.valueOf(fin)).getResultList();
        return r.isEmpty() ? null : entier(r.get(0));
    }

    /** Nombre de bons annonce par l'organisme (saisi ou issu du releve) ; vide = efface. */
    public JSONObject fixerAnnonces(TUser user, String tp, LocalDate debut, LocalDate fin, Integer nombre,
            String source) {
        em.createNativeQuery(
                "DELETE FROM t_pointage_annonce WHERE lg_TIERS_PAYANT_ID = ?1 AND dt_DEBUT = ?2 AND dt_FIN = ?3")
                .setParameter(1, tp).setParameter(2, java.sql.Date.valueOf(debut))
                .setParameter(3, java.sql.Date.valueOf(fin)).executeUpdate();
        if (nombre != null) {
            if (nombre < 0) {
                return new JSONObject().put("success", false).put("msg", "Nombre de bons annoncés invalide.");
            }
            em.createNativeQuery(
                    "INSERT INTO t_pointage_annonce (id, lg_TIERS_PAYANT_ID, dt_DEBUT, dt_FIN, int_ANNONCES,"
                            + " str_SOURCE, lg_USER_ID, dt_UPDATED) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NOW())")
                    .setParameter(1, IdGenerator.getComplexId()).setParameter(2, tp)
                    .setParameter(3, java.sql.Date.valueOf(debut)).setParameter(4, java.sql.Date.valueOf(fin))
                    .setParameter(5, nombre).setParameter(6, source).setParameter(7, user.getLgUSERID())
                    .executeUpdate();
        }
        return new JSONObject().put("success", true).put("annonces", nombre == null ? JSONObject.NULL : nombre);
    }

    /** Delais de saisie de l'organisme et de son groupe (null = sans delai). */
    public JSONObject delais(String tp) {
        @SuppressWarnings("unchecked")
        List<Object[]> r = em.createNativeQuery(
                "SELECT tp.int_DELAI_SAISIE_BON AS delaiTp, grp.lg_GROUPE_ID AS groupeId, grp.str_LIBELLE AS groupe,"
                        + " grp.int_DELAI_SAISIE_BON AS delaiGroupe"
                        + " FROM t_tiers_payant tp LEFT JOIN t_groupe_tierspayant grp ON grp.lg_GROUPE_ID = tp.lg_GROUPE_ID"
                        + " WHERE tp.lg_TIERS_PAYANT_ID = ?1")
                .setParameter(1, tp).getResultList();
        if (r.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Organisme introuvable.");
        }
        Object[] x = r.get(0);
        return new JSONObject().put("success", true).put("organisme", x[0] == null ? JSONObject.NULL : entier(x[0]))
                .put("groupeId", x[1] == null ? JSONObject.NULL : x[1]).put("groupe", txt(x[2]))
                .put("delaiGroupe", x[3] == null ? JSONObject.NULL : entier(x[3]));
    }

    /** Regle le delai de l'organisme et, s'il en a un, de son groupe. Vide = sans delai (comportement par defaut). */
    public JSONObject fixerDelais(String tp, Integer organisme, boolean avecGroupe, Integer groupe) {
        if ((organisme != null && (organisme < 0 || organisme > 365))
                || (groupe != null && (groupe < 0 || groupe > 365))) {
            return new JSONObject().put("success", false).put("msg", "Délai invalide : de 0 à 365 jours, ou vide.");
        }
        em.createNativeQuery("UPDATE t_tiers_payant SET int_DELAI_SAISIE_BON = ?2 WHERE lg_TIERS_PAYANT_ID = ?1")
                .setParameter(1, tp).setParameter(2, organisme).executeUpdate();
        if (avecGroupe) {
            em.createNativeQuery(
                    "UPDATE t_groupe_tierspayant g JOIN t_tiers_payant tp ON tp.lg_GROUPE_ID = g.lg_GROUPE_ID"
                            + " SET g.int_DELAI_SAISIE_BON = ?2 WHERE tp.lg_TIERS_PAYANT_ID = ?1")
                    .setParameter(1, tp).setParameter(2, groupe).executeUpdate();
        }
        return delais(tp);
    }

    /** Lignes d'un releve (n° de bon, matricule, date, montant) rapprochees des bons de la periode. */
    public JSONObject rapprocher(TUser user, String tp, LocalDate debut, LocalDate fin,
            List<Map<String, Object>> releve) {
        List<Bon> tous = bons(user, tp, debut, fin);
        Map<String, Bon> parNumero = new LinkedHashMap<>();
        for (Bon b : tous) {
            String n = b.json.optString("bon").trim().toUpperCase(Locale.FRANCE);
            if (!n.isEmpty()) {
                parNumero.putIfAbsent(n, b);
            }
        }
        java.util.Set<String> trouves = new java.util.HashSet<>();
        JSONArray absentsChezNous = new JSONArray(), ecarts = new JSONArray();
        int apparies = 0;
        for (Map<String, Object> l : releve) {
            String n = txt(l.get("bon")).toUpperCase(Locale.FRANCE);
            Long montant = l.get("montant") == null ? null : ((Number) l.get("montant")).longValue();
            Bon b = n.isEmpty() ? null : parNumero.get(n);
            if (b == null) {
                // a defaut du numero : matricule + date + montant
                for (Bon x : tous) {
                    if (!trouves.contains(x.json.getString("id")) && !txt(l.get("matricule")).isEmpty()
                            && x.json.optString("matricule").equalsIgnoreCase(txt(l.get("matricule")))
                            && l.get("date") != null
                            && x.json.optString("dateVente").startsWith(String.valueOf(l.get("date")))
                            && montant != null && montant == x.part) {
                        b = x;
                        break;
                    }
                }
            }
            if (b == null || trouves.contains(b.json.getString("id"))) {
                absentsChezNous.put(new JSONObject().put("bon", txt(l.get("bon")))
                        .put("matricule", txt(l.get("matricule"))).put("date", txt(l.get("date")))
                        .put("montant", montant == null ? JSONObject.NULL : montant));
                continue;
            }
            trouves.add(b.json.getString("id"));
            apparies++;
            if (montant != null && montant != b.part) {
                ecarts.put(new JSONObject().put("id", b.json.getString("id")).put("bon", b.json.optString("bon"))
                        .put("chezNous", b.part).put("chezLui", montant).put("ecart", b.part - montant));
            }
        }
        JSONArray absentsChezLui = new JSONArray();
        for (Bon b : tous) {
            if (!trouves.contains(b.json.getString("id"))) {
                absentsChezLui
                        .put(new JSONObject().put("id", b.json.getString("id")).put("bon", b.json.optString("bon"))
                                .put("part", b.part).put("dateVente", b.json.opt("dateVente")));
            }
        }
        fixerAnnonces(user, tp, debut, fin, releve.size(), "RELEVE");
        return new JSONObject().put("success", true).put("lignesReleve", releve.size()).put("apparies", apparies)
                .put("absentsChezNous", absentsChezNous).put("absentsChezLui", absentsChezLui).put("ecarts", ecarts)
                .put("compteurs", compteurs(user, tp, debut, fin, tous));
    }

    public String nomOrganisme(String tp) {
        List<?> r = em.createNativeQuery("SELECT str_FULLNAME FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = ?1")
                .setParameter(1, tp).getResultList();
        return r.isEmpty() || r.get(0) == null ? "" : String.valueOf(r.get(0));
    }
}
