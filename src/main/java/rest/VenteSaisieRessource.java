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
            + " DATE_FORMAT(p.dt_CREATED, '%H:%i:%s'), p.saisie_avant_maj, p.lg_EMPLACEMENT_VENTE_ID"
            + " FROM t_preenregistrement p LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
            + " WHERE p.etat_saisie IN ('EN_COURS', 'INTERROMPUE') AND p.str_STATUT IN ('is_Process', 'pending')"
            + " AND p.dt_UPDATED >= CURDATE() ORDER BY p.etat_saisie, p.dt_CREATED";

    /**
     * Écran « Ventes en cours de saisie et saisies interrompues » : du jour, en lecture (droit « voir »). Sans ce
     * droit, l'utilisateur ne reçoit que SES saisies interrompues du jour : l'écran de vente les lui propose à la
     * reprise.
     */
    @GET
    @Path("en-cours")
    public Response enCours() {
        VenteSaisieService.Acteur a = acteur(servletRequest);
        if (a == null) {
            return connexion();
        }
        boolean tout = a.droits.contains(Droit.VOIR_EN_COURS);
        @SuppressWarnings("unchecked")
        List<Object[]> l = (tout ? em.createNativeQuery(LISTE_SQL)
                : em.createNativeQuery(LISTE_SQL.replace(" ORDER BY",
                        " AND p.etat_saisie = 'INTERROMPUE' AND p.lg_USER_ID = ?1 ORDER BY"))
                        .setParameter(1, a.utilisateurId)).getResultList();
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
                    .put("depotId", ecranDepot ? depotId : "").put("commencee", s(r[11])).put("reprenable",
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
            + " FROM vente_journal_saisie j LEFT JOIN t_user u ON u.lg_USER_ID = j.utilisateur_id"
            + " WHERE j.cree_le >= ?1 AND j.cree_le < ?2 ORDER BY j.id DESC";

    private List<Object[]> journal(String du, String au) {
        LocalDate d = util.horloge.DatesFutures.jour(du), f = util.horloge.DatesFutures.jour(au);
        LocalDate aujourdhui = LocalDate.now();
        d = d == null ? aujourdhui : d;
        f = f == null ? aujourdhui : f;
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery(JOURNAL_SQL).setParameter(1, java.sql.Date.valueOf(d))
                .setParameter(2, java.sql.Date.valueOf(f.plusDays(1))).setMaxResults(20000).getResultList();
        return l;
    }

    @GET
    @Path("journal")
    public Response journalLire(@QueryParam("du") String du, @QueryParam("au") String au) {
        Response refus = Droits.refus(servletRequest, "Journal des ventes en saisie", P_JOURNAL);
        if (refus != null) {
            return refus;
        }
        JSONArray data = new JSONArray();
        for (Object[] r : journal(du, au)) {
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
    public Response journalExport(@QueryParam("du") String du, @QueryParam("au") String au) {
        Response refus = Droits.refus(servletRequest, "Journal des ventes en saisie", P_JOURNAL);
        if (refus != null) {
            return refus;
        }
        StringBuilder b = new StringBuilder("﻿");
        b.append("N°;Date et heure;Vente;Dépôt;Geste;État avant;État après;Admis;Motif;Cause;Utilisateur;Poste;"
                + "Lignes;Montant;Empreinte\r\n");
        for (Object[] r : journal(du, au)) {
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
}
