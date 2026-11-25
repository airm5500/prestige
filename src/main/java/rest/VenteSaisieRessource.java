package rest;

import dal.TUser;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.ejb.Stateless;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.VenteSaisieService;
import util.ContexteRequete;
import util.vente.EtatsSaisieVente.Droit;

/**
 * Ventes en saisie (cahier des charges du 24/11, point 2) : signal de l'écran, mise en attente, Retour, reprise,
 * interruption ; écran « Ventes en cours de saisie et saisies interrompues » ; journal de preuve et son export. Les
 * droits sont lus dans la session, jamais envoyés par l'écran.
 */
@Path("v1/vente-saisie")
@Produces("application/json")
@Stateless
public class VenteSaisieRessource {

    public static final String P_METTRE = "P_VENTE_METTRE_EN_ATTENTE";
    public static final String P_REPRENDRE = "P_VENTE_REPRENDRE_ATTENTE";
    public static final String P_VOIR = "P_VENTE_VOIR_EN_COURS";
    public static final String P_AUTRUI = "P_VENTE_REPRENDRE_INTERROMPUE_AUTRUI";
    public static final String P_JOURNAL = "P_SM_JOURNAL_SAISIE_VENTE";

    @javax.inject.Inject
    private HttpServletRequest servletRequest;

    @EJB
    private VenteSaisieService service;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Acteur du geste, depuis la session ; null si personne n'est connecté. */
    static VenteSaisieService.Acteur acteur(HttpServletRequest req) {
        TUser u = Droits.utilisateur(req);
        if (u == null) {
            return null;
        }
        EnumSet<Droit> d = EnumSet.noneOf(Droit.class);
        if (Droits.a(req, P_METTRE)) {
            d.add(Droit.METTRE_EN_ATTENTE);
        }
        if (Droits.a(req, P_REPRENDRE)) {
            d.add(Droit.REPRENDRE_ATTENTE);
        }
        if (Droits.a(req, P_VOIR)) {
            d.add(Droit.VOIR_EN_COURS);
        }
        if (Droits.a(req, P_AUTRUI)) {
            d.add(Droit.REPRENDRE_INTERROMPUE_AUTRUI);
        }
        HttpSession s = req.getSession(false);
        return new VenteSaisieService.Acteur(u.getLgUSERID(), ContexteRequete.poste(req), s == null ? null : s.getId(),
                d);
    }

    static JSONObject json(VenteSaisieService.Reponse r) {
        return new JSONObject().put("success", r.admis).put("etat", r.etat == null ? JSONObject.NULL : r.etat)
                .put("msg", r.motif == null ? "" : r.motif).put("libre", r.libre);
    }

    private static Response connexion() {
        return Response.status(Response.Status.UNAUTHORIZED).type(MediaType.APPLICATION_JSON)
                .entity(new JSONObject().put("success", false).put("msg", "Veuillez vous connecter").toString())
                .build();
    }

    private Response geste(String id,
            java.util.function.BiFunction<String, VenteSaisieService.Acteur, VenteSaisieService.Reponse> f) {
        VenteSaisieService.Acteur a = acteur(servletRequest);
        if (a == null) {
            return connexion();
        }
        return Response.ok(json(f.apply(id, a)).toString()).build();
    }

    @POST
    @Path("{id}/signal")
    public Response signal(@PathParam("id") String id) {
        return geste(id, service::signal);
    }

    @POST
    @Path("{id}/attente")
    public Response attente(@PathParam("id") String id) {
        return geste(id, service::mettreEnAttente);
    }

    @POST
    @Path("{id}/retour-supprimer")
    public Response retourSupprimer(@PathParam("id") String id) {
        return geste(id, service::retourSupprimer);
    }

    @POST
    @Path("{id}/reprendre")
    public Response reprendre(@PathParam("id") String id) {
        return geste(id, service::reprendreInterrompue);
    }

    /** Fin du décompte de 30 s du bandeau « Saisie interrompue » sans reprise : l'auteur, le jour même. */
    @POST
    @Path("{id}/abandonner-interrompue")
    public Response abandonnerInterrompue(@PathParam("id") String id) {
        return geste(id, service::abandonnerInterrompue);
    }

    /** Envoyé par l'écran qui se ferme (navigator.sendBeacon) : changement de menu, fermeture, déconnexion. */
    @POST
    @Path("{id}/interrompre")
    public Response interrompre(@PathParam("id") String id, @QueryParam("cause") String cause) {
        String c = "MENU".equals(cause) || "FERMETURE".equals(cause) || "DECONNEXION".equals(cause) ? cause
                : "ECRAN_QUITTE";
        return geste(id, (v, a) -> service.interrompre(v, a, c));
    }

    private static final String LISTE_SQL = "SELECT p.lg_PREENREGISTREMENT_ID, p.str_REF, p.etat_saisie,"
            + " p.saisie_poste, DATE_FORMAT(p.saisie_signal, '%H:%i:%s'), p.saisie_interruption, p.int_PRICE,"
            + " (SELECT COUNT(*) FROM t_preenregistrement_detail d"
            + "   WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID),"
            + " CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME), p.lg_USER_ID, p.lg_NATURE_VENTE_ID,"
            + " DATE_FORMAT(p.dt_CREATED, '%H:%i:%s'), p.saisie_avant_maj, p.lg_EMPLACEMENT_VENTE_ID,"
            + " p.str_TYPE_VENTE, p.lg_TYPE_VENTE_ID, DATE_FORMAT(p.dt_UPDATED, '%d/%m/%Y')"
            + " FROM t_preenregistrement p LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
            + " WHERE p.etat_saisie IN ('EN_COURS', 'INTERROMPUE') AND p.str_STATUT IN ('is_Process', 'pending')"
            + " AND p.dt_UPDATED >= CURDATE() ORDER BY p.etat_saisie, p.dt_CREATED";

    /**
     * Ventes de l'onglet « Ventes en cours et interrompues » : toutes avec le droit « voir », sinon les saisies
     * interrompues de l'utilisateur. Retour du 25/11 : mêmes filtres que la liste des ventes en attente (type VNO / VO,
     * recherche au début de la référence, du CIP ou du nom d'un produit) ; l'écran, les impressions et l'inventaire
     * lisent les mêmes ventes.
     */
    private List<Object[]> ventesEnCours(VenteSaisieService.Acteur a, String query, String typeVenteId) {
        List<Object> valeurs = new java.util.ArrayList<>();
        StringBuilder w = new StringBuilder();
        if (!a.droits.contains(Droit.VOIR_EN_COURS)) {
            valeurs.add(a.utilisateurId);
            w.append(" AND p.etat_saisie = 'INTERROMPUE' AND p.lg_USER_ID = ?").append(valeurs.size());
        }
        if (typeVenteId != null && !typeVenteId.trim().isEmpty()) {
            valeurs.add(typeVenteId.trim());
            w.append(" AND p.str_TYPE_VENTE = ?").append(valeurs.size());
        }
        if (query != null && !query.trim().isEmpty()) {
            valeurs.add(query.trim() + "%");
            String r = "?" + valeurs.size();
            w.append(" AND (p.str_REF LIKE ").append(r)
                    .append(" OR p.lg_PREENREGISTREMENT_ID IN (SELECT d.lg_PREENREGISTREMENT_ID")
                    .append(" FROM t_preenregistrement_detail d JOIN t_famille f ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID")
                    .append(" WHERE f.int_CIP LIKE ").append(r).append(" OR f.str_NAME LIKE ").append(r).append("))");
        }
        @SuppressWarnings("unchecked")
        List<Object[]> l = requete(LISTE_SQL.replace(" ORDER BY", w + " ORDER BY"), valeurs).getResultList();
        return l;
    }

    /**
     * Écran « Ventes en cours de saisie et saisies interrompues » : du jour, en lecture (droit « voir »). Sans ce
     * droit, l'utilisateur ne reçoit que SES saisies interrompues du jour : l'écran de vente les lui propose à la
     * reprise.
     */
    @GET
    @Path("en-cours")
    public Response enCours(@QueryParam("query") String query, @QueryParam("typeVenteId") String typeVenteId) {
        VenteSaisieService.Acteur a = acteur(servletRequest);
        if (a == null) {
            return connexion();
        }
        boolean tout = a.droits.contains(Droit.VOIR_EN_COURS);
        List<Object[]> l = ventesEnCours(a, query, typeVenteId);
        JSONArray data = new JSONArray();
        for (Object[] r : l) {
            boolean interrompue = "INTERROMPUE".equals(r[2]);
            boolean auteur = a.utilisateurId.equals(r[9]);
            /*
             * écran de saisie : une vente de l'onglet « Saisir vente dépôt » porte son dépôt ; une vente de l'officine
             * n'en porte pas. Elle n'est proposée et rouverte que sur son écran.
             */
            String depotId = s(r[13]);
            boolean ecranDepot = !depotId.isEmpty() && !"1".equals(depotId);
            data.put(new JSONObject().put("id", r[0]).put("numero", s(r[1])).put("etat", s(r[2]))
                    .put("libelle", interrompue ? "Saisie interrompue" : "En cours de saisie").put("poste", s(r[3]))
                    .put("dernierSignal", s(r[4])).put("cause", s(r[5]))
                    .put("montant", r[6] == null ? 0 : ((Number) r[6]).longValue())
                    .put("lignes", ((Number) r[7]).intValue()).put("utilisateur", s(r[8])).put("auteur", auteur)
                    .put("depot", "3".equals(s(r[10]))).put("ecran", ecranDepot ? "depot" : "vente")
                    .put("depotId", ecranDepot ? depotId : "").put("commencee", s(r[11])).put("typeVente", s(r[14]))
                    .put("typeVenteId", s(r[15])).put("reprenable",
                            interrompue && (auteur || a.droits.contains(Droit.REPRENDRE_INTERROMPUE_AUTRUI))));
        }
        return Response.ok(new JSONObject().put("success", true).put("data", data).put("total", data.length())
                .put("tout", tout).toString()).build();
    }

    private static String s(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static final String JOURNAL_SQL = "SELECT j.id, DATE_FORMAT(j.cree_le, '%d/%m/%Y %H:%i:%s'), j.numero,"
            + " j.depot, j.geste, j.etat_avant, j.etat_apres, j.admis, j.motif, j.cause,"
            + " CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME), j.poste, j.nb_lignes, j.montant, j.empreinte"
            + " FROM vente_journal_saisie j LEFT JOIN t_user u ON u.lg_USER_ID = j.utilisateur_id";

    /**
     * Filtres du journal (retours du 25/11, 1.5) : période, geste, poste, utilisateur (identifiant, ou « SERVEUR » pour
     * les gestes du serveur), motif ou cause (texte contenu). Un filtre vide ne restreint rien. L'écran, le CSV, le PDF
     * et l'inventaire lisent les mêmes lignes.
     */
    static final class FiltreJournal {
        LocalDate du, au;
        String geste, poste, utilisateur, motif;

        FiltreJournal(String du, String au, String geste, String poste, String utilisateur, String motif) {
            LocalDate d = util.horloge.DatesFutures.jour(du), f = util.horloge.DatesFutures.jour(au);
            LocalDate aujourdhui = LocalDate.now();
            this.du = d == null ? aujourdhui : d;
            this.au = f == null ? aujourdhui : f;
            this.geste = vide(geste);
            this.poste = vide(poste);
            this.utilisateur = vide(utilisateur);
            this.motif = vide(motif);
        }

        private static String vide(String s) {
            return s == null || s.trim().isEmpty() ? null : s.trim();
        }

        /** Conditions SQL (alias j) et leurs valeurs, à partir du paramètre ?1. */
        String where(List<Object> valeurs) {
            StringBuilder w = new StringBuilder(" WHERE j.cree_le >= ?")
                    .append(ajouter(valeurs, java.sql.Date.valueOf(du))).append(" AND j.cree_le < ?")
                    .append(ajouter(valeurs, java.sql.Date.valueOf(au.plusDays(1))));
            if (geste != null) {
                w.append(" AND j.geste = ?").append(ajouter(valeurs, geste));
            }
            if (poste != null) {
                w.append(" AND j.poste = ?").append(ajouter(valeurs, poste));
            }
            if ("SERVEUR".equals(utilisateur)) {
                w.append(" AND j.utilisateur_id IS NULL");
            } else if (utilisateur != null) {
                w.append(" AND j.utilisateur_id = ?").append(ajouter(valeurs, utilisateur));
            }
            if (motif != null) {
                int i = ajouter(valeurs,
                        "%" + motif.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
                w.append(" AND (j.motif LIKE ?").append(i).append(" OR j.cause LIKE ?").append(i).append(')');
            }
            return w.toString();
        }

        private static int ajouter(List<Object> valeurs, Object v) {
            valeurs.add(v);
            return valeurs.size();
        }

        /** Rappel des filtres, pour le titre du PDF. */
        String libelle(java.util.function.Function<String, String> nomUtilisateur) {
            java.time.format.DateTimeFormatter fr = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
            StringBuilder b = new StringBuilder("Du ").append(du.format(fr)).append(" au ").append(au.format(fr));
            if (geste != null) {
                b.append(" ; geste : ").append(GESTES.getOrDefault(geste, geste));
            }
            if (poste != null) {
                b.append(" ; poste : ").append(poste);
            }
            if (utilisateur != null) {
                b.append(" ; utilisateur : ")
                        .append("SERVEUR".equals(utilisateur) ? "Serveur" : nomUtilisateur.apply(utilisateur));
            }
            if (motif != null) {
                b.append(" ; motif ou cause : « ").append(motif).append(" »");
            }
            return b.toString();
        }
    }

    /** Libellés des gestes, les mêmes qu'à l'écran (JournalSaisieVente.js). */
    static final java.util.Map<String, String> GESTES = new java.util.LinkedHashMap<>();
    static {
        GESTES.put("DEBUT_SAISIE", "Début de saisie");
        GESTES.put("METTRE_EN_ATTENTE", "Mise en attente");
        GESTES.put("REPRENDRE_ATTENTE", "Rappel d'une vente en attente");
        GESTES.put("RETOUR_SUPPRIMER", "Retour : vente abandonnée");
        GESTES.put("INTERROMPRE", "Saisie interrompue");
        GESTES.put("SIGNAL_RETROUVE", "Signal retrouvé");
        GESTES.put("REPRENDRE_INTERROMPUE", "Reprise d'une saisie interrompue");
        GESTES.put("ABANDONNER_INTERROMPUE", "Abandon en fin de décompte");
        GESTES.put("EXPIRER", "Abandon au changement de jour");
        GESTES.put("SUPPRIMER_ATTENTE", "Suppression d'une vente en attente");
        GESTES.put("CLOTURER", "Clôture");
    }

    private static final java.util.Map<String, String> ETATS = new java.util.HashMap<>();
    static {
        ETATS.put("EN_COURS", "En cours");
        ETATS.put("EN_ATTENTE", "En attente");
        ETATS.put("INTERROMPUE", "Interrompue");
        ETATS.put("ABANDONNEE", "Abandonnée");
        ETATS.put("CLOTUREE", "Clôturée");
    }

    private static FiltreJournal filtre(String du, String au, String geste, String poste, String utilisateur,
            String motif) {
        return new FiltreJournal(du, au, geste, poste, utilisateur, motif);
    }

    private javax.persistence.Query requete(String sql, List<Object> valeurs) {
        javax.persistence.Query q = em.createNativeQuery(sql);
        for (int i = 0; i < valeurs.size(); i++) {
            q.setParameter(i + 1, valeurs.get(i));
        }
        return q;
    }

    private List<Object[]> journal(FiltreJournal f) {
        List<Object> valeurs = new java.util.ArrayList<>();
        String sql = JOURNAL_SQL + f.where(valeurs) + " ORDER BY j.id DESC";
        @SuppressWarnings("unchecked")
        List<Object[]> l = requete(sql, valeurs).setMaxResults(20000).getResultList();
        return l;
    }

    /** Produits des ventes du journal filtré : lignes encore en vente, et lignes retirées des ventes abandonnées. */
    private java.util.Set<String> produitsDuJournal(FiltreJournal f) {
        List<Object> valeurs = new java.util.ArrayList<>();
        String ventes = "SELECT DISTINCT j.vente_id FROM vente_journal_saisie j" + f.where(valeurs);
        @SuppressWarnings("unchecked")
        List<Object> l = requete(
                "SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID IN (" + ventes
                        + ") UNION SELECT s.produit_id FROM vente_suppression s WHERE s.produit_id IS NOT NULL AND s.vente_id IN ("
                        + ventes + ")",
                valeurs).getResultList();
        java.util.Set<String> produits = new java.util.LinkedHashSet<>();
        for (Object o : l) {
            if (o != null) {
                produits.add(String.valueOf(o));
            }
        }
        return produits;
    }

    /** Listes des filtres sur la période : postes et utilisateurs présents au journal. */
    @GET
    @Path("journal/valeurs")
    public Response journalValeurs(@QueryParam("du") String du, @QueryParam("au") String au) {
        Response refus = Droits.refus(servletRequest, "Journal des ventes en saisie", P_JOURNAL);
        if (refus != null) {
            return refus;
        }
        FiltreJournal f = filtre(du, au, null, null, null, null);
        List<Object> valeurs = new java.util.ArrayList<>();
        String w = f.where(valeurs);
        JSONArray postes = new JSONArray();
        for (Object o : requete("SELECT DISTINCT j.poste FROM vente_journal_saisie j" + w
                + " AND j.poste IS NOT NULL AND j.poste <> '' ORDER BY j.poste", valeurs).getResultList()) {
            postes.put(new JSONObject().put("valeur", s(o)).put("libelle", s(o)));
        }
        JSONArray utilisateurs = new JSONArray();
        @SuppressWarnings("unchecked")
        List<Object[]> us = requete("SELECT DISTINCT j.utilisateur_id, CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME)"
                + " FROM vente_journal_saisie j LEFT JOIN t_user u ON u.lg_USER_ID = j.utilisateur_id" + w
                + " ORDER BY 2", valeurs).getResultList();
        for (Object[] u : us) {
            utilisateurs.put(u[0] == null ? new JSONObject().put("valeur", "SERVEUR").put("libelle", "Serveur")
                    : new JSONObject().put("valeur", s(u[0])).put("libelle", s(u[1]).trim()));
        }
        JSONArray gestes = new JSONArray();
        GESTES.forEach((k, v) -> gestes.put(new JSONObject().put("valeur", k).put("libelle", v)));
        return Response.ok(new JSONObject().put("success", true).put("postes", postes).put("utilisateurs", utilisateurs)
                .put("gestes", gestes).toString()).build();
    }

    @GET
    @Path("journal")
    public Response journalLire(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("geste") String geste, @QueryParam("poste") String poste,
            @QueryParam("utilisateur") String utilisateur, @QueryParam("motif") String motif) {
        Response refus = Droits.refus(servletRequest, "Journal des ventes en saisie", P_JOURNAL);
        if (refus != null) {
            return refus;
        }
        JSONArray data = new JSONArray();
        for (Object[] r : journal(filtre(du, au, geste, poste, utilisateur, motif))) {
            data.put(new JSONObject().put("id", ((Number) r[0]).longValue()).put("le", s(r[1])).put("numero", s(r[2]))
                    .put("depot", vrai(r[3])).put("geste", s(r[4])).put("etatAvant", s(r[5])).put("etatApres", s(r[6]))
                    .put("admis", vrai(r[7])).put("motif", s(r[8])).put("cause", s(r[9]))
                    .put("utilisateur", s(r[10]).trim()).put("poste", s(r[11]))
                    .put("lignes", r[12] == null ? JSONObject.NULL : r[12])
                    .put("montant", r[13] == null ? JSONObject.NULL : r[13]).put("empreinte", s(r[14])));
        }
        long[] v = service.verifier();
        return Response.ok(new JSONObject().put("success", true).put("data", data).put("total", data.length())
                .put("intact", v[0] < 0).put("rupture", v[0]).put("lignesControlees", v[1]).toString()).build();
    }

    private static boolean vrai(Object o) {
        return o instanceof Boolean ? (Boolean) o : o instanceof Number && ((Number) o).intValue() != 0;
    }

    private static String csv(Object o) {
        String v = s(o).replace("\"", "\"\"");
        /* une cellule qui commence par = + - @ serait lue comme une formule par le tableur */
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0) {
            v = "'" + v;
        }
        return "\"" + v + "\"";
    }

    /** Export CSV du journal (séparateur « ; », UTF-8 avec BOM), empreintes comprises. */
    @GET
    @Path("journal/export")
    @Produces("text/csv")
    public Response journalExport(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("geste") String geste, @QueryParam("poste") String poste,
            @QueryParam("utilisateur") String utilisateur, @QueryParam("motif") String motif) {
        Response refus = Droits.refus(servletRequest, "Journal des ventes en saisie", P_JOURNAL);
        if (refus != null) {
            return refus;
        }
        StringBuilder b = new StringBuilder("﻿");
        b.append("N°;Date et heure;Vente;Dépôt;Geste;État avant;État après;Admis;Motif;Cause;Utilisateur;Poste;"
                + "Lignes;Montant;Empreinte\r\n");
        for (Object[] r : journal(filtre(du, au, geste, poste, utilisateur, motif))) {
            b.append(csv(r[0])).append(';').append(csv(r[1])).append(';').append(csv(r[2])).append(';')
                    .append(vrai(r[3]) ? "oui" : "non").append(';').append(csv(r[4])).append(';').append(csv(r[5]))
                    .append(';').append(csv(r[6])).append(';').append(vrai(r[7]) ? "oui" : "non").append(';')
                    .append(csv(r[8])).append(';').append(csv(r[9])).append(';').append(csv(s(r[10]).trim()))
                    .append(';').append(csv(r[11])).append(';').append(csv(r[12])).append(';').append(csv(r[13]))
                    .append(';').append(csv(r[14])).append("\r\n");
        }
        long[] v = service.verifier();
        b.append("\r\n").append(csv(v[0] < 0 ? "Chaîne d'empreintes intacte (" + v[1] + " lignes contrôlées)"
                : "CHAÎNE ROMPUE à la ligne " + v[0])).append("\r\n");
        return Response.ok(b.toString().getBytes(StandardCharsets.UTF_8), "text/csv; charset=UTF-8")
                .header("Content-Disposition", "attachment; filename=journal_ventes_en_saisie.csv").build();
    }

    /**
     * Retours du 25/11 (1.5) : impression du journal, mêmes lignes et mêmes filtres que l'écran, état de la chaîne
     * d'empreintes en sous-titre.
     */
    @GET
    @Path("journal/pdf")
    @Produces("application/pdf")
    public Response journalPdf(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("geste") String geste, @QueryParam("poste") String poste,
            @QueryParam("utilisateur") String utilisateur, @QueryParam("motif") String motif) {
        Response refus = Droits.refus(servletRequest, "Journal des ventes en saisie", P_JOURNAL);
        if (refus != null) {
            return refus;
        }
        FiltreJournal f = filtre(du, au, geste, poste, utilisateur, motif);
        List<String[]> lignes = new java.util.ArrayList<>();
        for (Object[] r : journal(f)) {
            String avant = ETATS.getOrDefault(s(r[5]), ""), apres = ETATS.getOrDefault(s(r[6]), "");
            String etat = !avant.isEmpty() && !apres.isEmpty() && !avant.equals(apres) ? avant + " → " + apres
                    : (apres.isEmpty() ? avant : apres);
            String vente = s(r[2]) + (vrai(r[3]) ? " (dépôt)" : "");
            String qui = s(r[10]).trim();
            lignes.add(new String[] { s(r[0]), s(r[1]), vente, GESTES.getOrDefault(s(r[4]), s(r[4])),
                    vrai(r[7]) ? "Fait" : "Refusé", etat, s(r[8]).isEmpty() ? s(r[9]) : s(r[8]),
                    qui.isEmpty() ? "Serveur" : qui, s(r[11]), s(r[12]), r[13] == null ? "" : milliers(r[13]) });
        }
        long[] v = service.verifier();
        TUser tu = Droits.utilisateur(servletRequest);
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        @SuppressWarnings("unchecked")
        List<Object> off = em.createNativeQuery("SELECT str_NOM_COMPLET FROM t_officine LIMIT 1").getResultList();
        e.officine = off.isEmpty() ? "" : s(off.get(0));
        e.titre = "JOURNAL DES VENTES EN SAISIE";
        e.sousTitre = f.libelle(this::nomUtilisateur) + " ; " + lignes.size() + " geste(s) ; "
                + (v[0] < 0 ? "chaîne d'empreintes intacte (" + v[1] + " lignes contrôlées)"
                        : "CHAÎNE ROMPUE à la ligne n° " + v[0]);
        e.imprimePar = tu == null ? "" : (s(tu.getStrFIRSTNAME()) + " " + s(tu.getStrLASTNAME())).trim();
        e.entetes = new String[] { "N°", "Date et heure", "Vente", "Geste", "Résultat", "État", "Motif / cause",
                "Utilisateur", "Poste", "Lignes", "Montant" };
        e.largeurs = new float[] { 5, 11, 9, 14, 6, 11, 16, 11, 8, 4, 6 };
        e.droite = new boolean[] { true, false, false, false, false, false, false, false, false, true, true };
        return Response.ok(rest.report.pdf.TableauPdf.generer(e, lignes), "application/pdf")
                .header("Content-Disposition", "inline; filename=journal_ventes_en_saisie.pdf").build();
    }

    private String nomUtilisateur(String id) {
        @SuppressWarnings("unchecked")
        List<Object> l = em
                .createNativeQuery(
                        "SELECT CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME) FROM t_user WHERE lg_USER_ID = ?1")
                .setParameter(1, id).getResultList();
        return l.isEmpty() ? id : s(l.get(0)).trim();
    }

    private static String milliers(Object n) {
        long v = ((Number) n).longValue();
        return (v < 0 ? "-" : "") + String.valueOf(Math.abs(v)).replaceAll("\\B(?=(\\d{3})+(?!\\d))", " ");
    }

    @EJB
    private rest.service.InventaireService inventaireService;

    /**
     * Retours du 25/11 (1.5) : « Créer un inventaire » avec les produits des ventes du journal affiché (mêmes filtres)
     * : lignes encore en vente et lignes retirées des ventes abandonnées ; un produit cité plusieurs fois compte une
     * fois. GET : nombre de produits (la confirmation se fait dans le bouton) ; POST : création.
     */
    @GET
    @Path("journal/inventaire")
    public Response journalInventaireCompte(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("geste") String geste, @QueryParam("poste") String poste,
            @QueryParam("utilisateur") String utilisateur, @QueryParam("motif") String motif) {
        Response refus = Droits.refus(servletRequest, "Journal des ventes en saisie", P_JOURNAL);
        if (refus != null) {
            return refus;
        }
        int n = produitsDuJournal(filtre(du, au, geste, poste, utilisateur, motif)).size();
        return Response.ok(new JSONObject().put("success", true).put("count", n).toString()).build();
    }

    @POST
    @Path("journal/inventaire")
    public Response journalInventaireCreer(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("geste") String geste, @QueryParam("poste") String poste,
            @QueryParam("utilisateur") String utilisateur, @QueryParam("motif") String motif) {
        Response refus = Droits.refus(servletRequest, "Journal des ventes en saisie", P_JOURNAL);
        if (refus != null) {
            return refus;
        }
        FiltreJournal f = filtre(du, au, geste, poste, utilisateur, motif);
        java.util.Set<String> produits = produitsDuJournal(f);
        if (produits.isEmpty()) {
            return Response.ok(new JSONObject().put("success", false)
                    .put("msg", "Aucun produit dans les ventes du journal affiché.").toString()).build();
        }
        String nom = "INVENTAIRE VENTES EN SAISIE " + java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String description = "Journal des ventes en saisie : " + f.libelle(this::nomUtilisateur);
        int n = inventaireService.create(produits, nom,
                description.length() > 200 ? description.substring(0, 200) : description);
        return Response.ok(new JSONObject().put("success", true).put("count", n).put("nom", nom).toString()).build();
    }

    @EJB
    private rest.report.ReportUtil reportUtil;

    /**
     * Retour du 25/11 : produits des ventes de l'onglet « Ventes en cours et interrompues » (mêmes ventes et mêmes
     * filtres que l'écran), au format des impressions des ventes en attente. parVente : ventes dans l'ordre où elles
     * ont été commencées, produits par ordre alphabétique ; sinon liste alphabétique avec le numéro de vente.
     */
    private List<rest.service.dto.PreventeProduitDTO> produitsEnCours(VenteSaisieService.Acteur a, String query,
            String typeVenteId, boolean parVente) {
        java.util.Map<String, Object[]> ventes = new java.util.LinkedHashMap<>();
        for (Object[] r : ventesEnCours(a, query, typeVenteId)) {
            ventes.put(s(r[0]), r);
        }
        List<rest.service.dto.PreventeProduitDTO> rows = new java.util.ArrayList<>();
        if (ventes.isEmpty()) {
            return rows;
        }
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT d.lg_PREENREGISTREMENT_ID, f.lg_FAMILLE_ID, f.int_CIP,"
                + " f.str_NAME, d.int_QUANTITY FROM t_preenregistrement_detail d"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_PREENREGISTREMENT_ID IN (?1)")
                .setParameter(1, new java.util.ArrayList<>(ventes.keySet())).getResultList();
        for (Object[] d : l) {
            Object[] v = ventes.get(s(d[0]));
            if (v == null) {
                continue;
            }
            rest.service.dto.PreventeProduitDTO row = new rest.service.dto.PreventeProduitDTO();
            row.setVenteId(s(v[0]));
            row.setVenteRef(s(v[1]));
            row.setDateVente(s(v[16]));
            row.setHeure(s(v[11]));
            row.setVendeur(s(v[8]).trim());
            row.setProduitId(s(d[1]));
            row.setProduitCip(s(d[2]));
            row.setProduitLibelle(s(d[3]));
            row.setQuantite(d[4] == null ? 0 : ((Number) d[4]).intValue());
            rows.add(row);
        }
        java.util.Comparator<rest.service.dto.PreventeProduitDTO> produit = java.util.Comparator
                .comparing(r -> s(r.getProduitLibelle()));
        rows.sort(parVente
                ? java.util.Comparator.comparing((rest.service.dto.PreventeProduitDTO r) -> s(r.getHeure()))
                        .thenComparing(r -> s(r.getVenteRef())).thenComparing(produit)
                : produit.thenComparing(r -> s(r.getVenteRef())));
        return rows;
    }

    private java.util.Set<String> produitIdsEnCours(VenteSaisieService.Acteur a, String query, String typeVenteId) {
        java.util.Set<String> ids = new java.util.LinkedHashSet<>();
        for (rest.service.dto.PreventeProduitDTO r : produitsEnCours(a, query, typeVenteId, false)) {
            ids.add(r.getProduitId());
        }
        return ids;
    }

    private static String criteresEnCours(String query, String typeVenteId) {
        StringBuilder b = new StringBuilder("VENTES EN COURS ET INTERROMPUES DU "
                + LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        if (typeVenteId != null && !typeVenteId.trim().isEmpty()) {
            b.append(" - TYPE : ").append(typeVenteId.trim());
        }
        if (query != null && !query.trim().isEmpty()) {
            b.append(" - RECHERCHE : ").append(query.trim());
        }
        return b.toString();
    }

    /**
     * Impression « par vente » ou « liste des produits » de l'onglet ; même réponse que celle des ventes en attente.
     */
    @GET
    @Path("en-cours/produits/pdf")
    public Response enCoursProduitsPdf(@QueryParam("query") String query, @QueryParam("typeVenteId") String typeVenteId,
            @QueryParam("mode") String mode) {
        VenteSaisieService.Acteur a = acteur(servletRequest);
        if (a == null) {
            return connexion();
        }
        boolean parVente = !"LISTE".equalsIgnoreCase(mode);
        List<rest.service.dto.PreventeProduitDTO> data = produitsEnCours(a, query, typeVenteId, parVente);
        if (data.isEmpty()) {
            return Response
                    .ok(new JSONObject().put("success", false).put("message", "Aucun produit a imprimer").toString())
                    .build();
        }
        java.util.Map<String, Object> params = reportUtil.officineData(Droits.utilisateur(servletRequest));
        params.put("P_H_CLT_INFOS", (parVente ? "PRODUITS DES VENTES EN COURS PAR VENTE - "
                : "LISTE COMPLETE DES PRODUITS DES VENTES EN COURS - ") + criteresEnCours(query, typeVenteId));
        String url = servletRequest.getContextPath() + reportUtil.buildReport(params,
                parVente ? "rp_preventes_produits_par_vente" : "rp_preventes_produits_liste", data);
        return Response.ok(new JSONObject().put("success", true).put("url", url).toString()).build();
    }

    /** Nombre de produits distincts des ventes de l'onglet (contrôle avant la création de l'inventaire). */
    @GET
    @Path("en-cours/produits/count")
    public Response enCoursProduitsCount(@QueryParam("query") String query,
            @QueryParam("typeVenteId") String typeVenteId) {
        VenteSaisieService.Acteur a = acteur(servletRequest);
        if (a == null) {
            return connexion();
        }
        return Response.ok(new JSONObject().put("success", true)
                .put("count", produitIdsEnCours(a, query, typeVenteId).size()).toString()).build();
    }

    /** Inventaire des produits des ventes de l'onglet : un produit présent dans plusieurs ventes compte une fois. */
    @POST
    @Path("en-cours/create-inventaire")
    public Response enCoursCreerInventaire(@QueryParam("query") String query,
            @QueryParam("typeVenteId") String typeVenteId) {
        VenteSaisieService.Acteur a = acteur(servletRequest);
        if (a == null) {
            return connexion();
        }
        java.util.Set<String> produits = produitIdsEnCours(a, query, typeVenteId);
        if (produits.isEmpty()) {
            return Response.ok(new JSONObject().put("success", false)
                    .put("message", "Aucun produit dans les ventes en cours").toString()).build();
        }
        String nom = "INVENTAIRE PRODUITS EN COURS DU " + java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int n = inventaireService.create(produits, nom, nom);
        return Response.ok(new JSONObject().put("success", true).put("count", n).toString()).build();
    }
}
