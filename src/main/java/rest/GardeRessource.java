package rest;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;

import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeTrancheDTO;
import dal.Garde;
import dal.TUser;
import rest.report.ReportUtil;
import rest.service.GardeService;
import rest.service.impl.AnalyseGarde;
import rest.service.utils.ReportExcelExportService;
import util.Constant;

/**
 * Les gardes : periodes d'activite nommees, et les deux analyses qu'aucun ecran existant ne sait produire.
 *
 * <p>
 * La garde ne reconstruit pas les etats de gestion de l'officine. Le chiffre d'affaires par type de vente, les
 * reglements, les articles vendus sont deja affiches ailleurs : la garde leur transmet sa periode plutot que de
 * reconstruire des etats concurrents qui finiraient par diverger. Ce qui est calcule ici, et seulement ici, c'est la
 * repartition par tranche horaire et la classification ABC sur la fenetre horaire EXACTE de la garde.
 * </p>
 */
@Path("v1/gardes")
@Produces("application/json")
@Consumes("application/json")
public class GardeRessource {

    private static final Logger LOG = Logger.getLogger(GardeRessource.class.getName());

    private static final DateTimeFormatter SAISIE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter AFFICHE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter HEURE = DateTimeFormatter.ofPattern("HH:mm");

    private static final String[] ENTETES_ABC = { "Classe", "CIP", "Produit", "Quantité", "Montant", "Part %",
            "Cumul %" };
    private static final String[] ENTETES_TRANCHES = { "Tranche", "Ventes", "Quantité", "Montant" };

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private GardeService gardeService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private ReportExcelExportService reportExcelExportService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static Response echec(String message) {
        return Response.ok().entity(new JSONObject().put("success", false).put("msg", message).toString()).build();
    }

    /**
     * Lit une date-heure saisie par l'ecran.
     *
     * <p>
     * Les deux formes sont acceptees, avec ou sans les secondes : l'ecran envoie « 2026-09-05 20:00 », un appel direct
     * a l'API ecrit naturellement la forme complete.
     * </p>
     */
    private static LocalDateTime instant(String valeur) {
        String brut = StringUtils.trimToEmpty(valeur);
        if (brut.isEmpty()) {
            return null;
        }
        try {
            return LocalDateTime.parse(brut, brut.length() > 16 ? AFFICHE : SAISIE);
        } catch (DateTimeParseException e) {
            try {
                return LocalDateTime.parse(brut.replace(' ', 'T'));
            } catch (DateTimeParseException ignore) {
                return null;
            }
        }
    }

    private static JSONObject json(Garde g) {
        return new JSONObject().put("id", g.getId()).put("libelle", StringUtils.defaultString(g.getLibelle()))
                .put("dateDebut", g.getDateDebut() != null ? g.getDateDebut().format(AFFICHE) : "")
                .put("dateFin", g.getDateFin() != null ? g.getDateFin().format(AFFICHE) : "")
                // Les ecrans qui ne connaissent que des dates ou des heures separees lisent ces
                // quatre champs sans avoir a decouper eux-memes la date-heure.
                .put("jourDebut", g.getDateDebut() != null ? g.getDateDebut().format(JOUR) : "")
                .put("heureDebut", g.getDateDebut() != null ? g.getDateDebut().format(HEURE) : "")
                .put("jourFin", g.getDateFin() != null ? g.getDateFin().format(JOUR) : "")
                .put("heureFin", g.getDateFin() != null ? g.getDateFin().format(HEURE) : "")
                .put("dureeMinutes", g.dureeMinutes()).put("duree", dureeLisible(g.dureeMinutes()));
    }

    /** « 12 h 30 » plutot que « 750 minutes » : c'est ainsi qu'on parle d'une garde. */
    private static String dureeLisible(long minutes) {
        if (minutes <= 0) {
            return "";
        }
        long heures = minutes / 60;
        long reste = minutes % 60;
        return reste == 0 ? heures + " h" : heures + " h " + String.format("%02d", reste);
    }

    @GET
    public Response lister() {
        JSONArray data = new JSONArray();
        for (Garde g : gardeService.lister()) {
            data.put(json(g));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data).toString())
                .build();
    }

    @POST
    @Consumes("application/x-www-form-urlencoded")
    public Response enregistrer(@javax.ws.rs.FormParam("id") String id,
            @javax.ws.rs.FormParam("libelle") String libelle, @javax.ws.rs.FormParam("dateDebut") String dateDebut,
            @javax.ws.rs.FormParam("dateFin") String dateFin) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        LocalDateTime debut = instant(dateDebut);
        LocalDateTime fin = instant(dateFin);
        if (debut == null || fin == null) {
            return echec("Renseignez la date et l'heure de début et de fin.");
        }
        try {
            Garde garde = gardeService.enregistrer(id, libelle, debut, fin);
            return Response.ok().entity(new JSONObject().put("success", true).put("data", json(garde))
                    .put("msg", "Garde enregistrée.").toString()).build();
        } catch (rest.service.SaisieRefusee e) {
            // Saisie refusee : le message est deja redige pour l'utilisateur.
            return echec(e.getMessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "enregistrement d'une garde", e);
            return echec("La garde n'a pas pu être enregistrée.");
        }
    }

    @DELETE
    @Path("{id}")
    public Response supprimer(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        try {
            // Supprimer une garde ne supprime aucune vente : seule la definition de la periode part.
            if (!gardeService.supprimer(id)) {
                return echec("Cette garde n'existe plus.");
            }
            return Response.ok().entity(new JSONObject().put("success", true).put("msg", "Garde supprimée.").toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "suppression d'une garde", e);
            return echec("La garde n'a pas pu être supprimée.");
        }
    }

    private static JSONObject indicateursJson(AnalyseGarde.Indicateurs i) {
        return new JSONObject().put("ventes", i.getVentes()).put("lignes", i.getLignes())
                .put("produitsDistincts", i.getProduitsDistincts()).put("quantite", i.getQuantite())
                .put("montant", i.getMontant()).put("dureeMinutes", i.getDureeMinutes())
                .put("montantParHeure", i.getMontantParHeure());
    }

    /**
     * Le rapport d'une garde : indicateurs, tranches horaires et classification ABC.
     *
     * @param heures
     *            largeur d'une tranche horaire
     */
    @GET
    @Path("{id}/rapport")
    public Response rapport(@PathParam("id") String id, @DefaultValue("2") @QueryParam("heures") int heures) {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        JSONArray tranches = new JSONArray();
        for (GardeTrancheDTO t : gardeService.tranches(garde, heures)) {
            tranches.put(new JSONObject().put("libelle", t.getLibelle()).put("ventes", t.getVentes())
                    .put("quantite", t.getQuantite()).put("montant", t.getMontant()));
        }
        JSONArray abc = new JSONArray();
        for (GardeProduitDTO p : gardeService.abc(garde)) {
            abc.put(new JSONObject().put("classe", p.getClasse()).put("cip", p.getCip()).put("libelle", p.getLibelle())
                    .put("quantite", p.getQuantite()).put("montant", p.getMontant()).put("part", arrondi(p.getPart()))
                    .put("cumulPart", arrondi(p.getCumulPart())));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("garde", json(garde))
                        .put("indicateurs", indicateursJson(gardeService.indicateurs(garde))).put("tranches", tranches)
                        .put("abc", abc).put("resumeAbc", resumeAbc(gardeService.abc(garde))).toString())
                .build();
    }

    /** Combien de produits dans chaque classe, et quelle part du chiffre ils representent. */
    private static JSONArray resumeAbc(List<GardeProduitDTO> produits) {
        JSONArray resume = new JSONArray();
        for (String classe : new String[] { "A", "B", "C" }) {
            int nombre = 0;
            long montant = 0L;
            double part = 0D;
            for (GardeProduitDTO p : produits) {
                if (classe.equals(p.getClasse())) {
                    nombre++;
                    montant += p.getMontant();
                    part += p.getPart();
                }
            }
            resume.put(new JSONObject().put("classe", classe).put("produits", nombre).put("montant", montant)
                    .put("part", arrondi(part)));
        }
        return resume;
    }

    private static double arrondi(double valeur) {
        return Math.round(valeur * 100D) / 100D;
    }

    /**
     * Comparaison de plusieurs gardes sur les memes indicateurs.
     *
     * @param ids
     *            identifiants separes par des virgules ; vide compare les trois dernieres gardes enregistrees
     */
    @GET
    @Path("comparaison")
    public Response comparaison(@DefaultValue("") @QueryParam("ids") String ids) {
        List<Garde> gardes = new ArrayList<>();
        if (StringUtils.isBlank(ids)) {
            List<Garde> toutes = gardeService.lister();
            gardes.addAll(toutes.subList(0, Math.min(3, toutes.size())));
        } else {
            for (String id : ids.split(",")) {
                Garde g = gardeService.parId(StringUtils.trimToEmpty(id));
                if (g != null) {
                    gardes.add(g);
                }
            }
        }
        // De la plus ancienne a la plus recente : les ecarts se lisent alors dans le sens du temps.
        gardes.sort(java.util.Comparator.comparing(Garde::getDateDebut));
        JSONArray data = new JSONArray();
        AnalyseGarde.Indicateurs precedente = null;
        for (Garde g : gardes) {
            AnalyseGarde.Indicateurs i = gardeService.indicateurs(g);
            JSONObject ligne = json(g);
            ligne.put("indicateurs", indicateursJson(i));
            // L'ecart est calcule sur le chiffre PAR HEURE, jamais sur le montant brut : une garde
            // de week-end de 36 h fera toujours plus qu'une nuit de 12 h, sans rien dire de son
            // intensite. Comparer les bruts ferait conclure a une progression qui n'existe pas.
            if (precedente != null) {
                long ecart = i.getMontantParHeure() - precedente.getMontantParHeure();
                ligne.put("ecartParHeure", ecart);
                ligne.put("ecartPourcentage", precedente.getMontantParHeure() > 0
                        ? arrondi(ecart * 100D / precedente.getMontantParHeure()) : 0D);
            }
            data.put(ligne);
            precedente = i;
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data).toString())
                .build();
    }

    @GET
    @Path("{id}/pdf")
    public Response imprimer(@PathParam("id") String id, @DefaultValue("2") @QueryParam("heures") int heures) {
        TUser user = utilisateur();
        if (user == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        AnalyseGarde.Indicateurs i = gardeService.indicateurs(garde);
        java.util.Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_H_CLT_INFOS", "GARDE : " + StringUtils.defaultString(garde.getLibelle()));
        parametres.put("P_PERIODE", "Du " + garde.getDateDebut().format(AFFICHE) + " au "
                + garde.getDateFin().format(AFFICHE) + " (" + dureeLisible(garde.dureeMinutes()) + ")");
        parametres.put("P_INDICATEURS",
                i.getVentes() + " vente(s) - " + i.getLignes() + " ligne(s) - " + i.getProduitsDistincts()
                        + " produit(s) - " + i.getQuantite() + " unité(s) - " + i.getMontant() + " au total - "
                        + i.getMontantParHeure() + " par heure");
        String url = reportUtil.buildReport(parametres, "garde", lignesEtat(garde, heures));
        // buildReport rend l'URL attendue meme quand l'edition a echoue : on verifie que le PDF
        // existe avant d'annoncer un succes, sinon l'utilisateur ouvrirait un fichier absent.
        if (StringUtils.isBlank(url)
                || !new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))).isFile()) {
            return echec("L'édition n'a pas pu être générée");
        }
        return Response.ok().entity(new JSONObject().put("success", true).put("url", url).put("msg", url).toString())
                .build();
    }

    /** Les tranches puis la classification, en une table unique groupee par section. */
    private List<commonTasks.dto.AnalyseOrdonnancierLigneDTO> lignesEtat(Garde garde, int heures) {
        List<commonTasks.dto.AnalyseOrdonnancierLigneDTO> lignes = new ArrayList<>();
        for (GardeTrancheDTO t : gardeService.tranches(garde, heures)) {
            commonTasks.dto.AnalyseOrdonnancierLigneDTO l = new commonTasks.dto.AnalyseOrdonnancierLigneDTO();
            l.setSection("Tranche horaire");
            l.setLibelle(t.getLibelle());
            l.setComplement(t.getVentes() + " vente(s)");
            l.setDelivrances(t.getVentes());
            l.setQuantite(t.getQuantite());
            l.setMontant(t.getMontant());
            lignes.add(l);
        }
        for (GardeProduitDTO p : gardeService.abc(garde)) {
            commonTasks.dto.AnalyseOrdonnancierLigneDTO l = new commonTasks.dto.AnalyseOrdonnancierLigneDTO();
            l.setSection("Classe " + (StringUtils.isBlank(p.getClasse()) ? "-" : p.getClasse()));
            l.setLibelle(p.getLibelle());
            l.setComplement(p.getCip() + " - " + arrondi(p.getCumulPart()) + " % cumulé");
            l.setDelivrances(p.getLignes());
            l.setQuantite(p.getQuantite());
            l.setMontant(p.getMontant());
            lignes.add(l);
        }
        return lignes;
    }

    @GET
    @Path("{id}/excel")
    @Produces("application/vnd.ms-excel")
    public Response exporter(@PathParam("id") String id, @DefaultValue("2") @QueryParam("heures") int heures)
            throws IOException {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        List<GardeProduitDTO> abc = gardeService.abc(garde);
        String titre = "GARDE " + StringUtils.defaultString(garde.getLibelle()) + " - du "
                + garde.getDateDebut().format(AFFICHE) + " au " + garde.getDateFin().format(AFFICHE);
        byte[] data = reportExcelExportService.createExcelReport(titre, ENTETES_ABC, abc, (row, p) -> {
            int col = 0;
            row.createCell(col++).setCellValue(p.getClasse());
            row.createCell(col++).setCellValue(p.getCip());
            row.createCell(col++).setCellValue(p.getLibelle());
            row.createCell(col++).setCellValue(p.getQuantite());
            row.createCell(col++).setCellValue(p.getMontant());
            row.createCell(col++).setCellValue(arrondi(p.getPart()));
            row.createCell(col++).setCellValue(arrondi(p.getCumulPart()));
        });
        String nomFichier = "garde_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss"))
                + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + nomFichier).build();
    }

    @GET
    @Path("{id}/tranches/excel")
    @Produces("application/vnd.ms-excel")
    public Response exporterTranches(@PathParam("id") String id, @DefaultValue("2") @QueryParam("heures") int heures)
            throws IOException {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        String titre = "GARDE " + StringUtils.defaultString(garde.getLibelle()) + " - répartition horaire";
        byte[] data = reportExcelExportService.createExcelReport(titre, ENTETES_TRANCHES,
                gardeService.tranches(garde, heures), (row, t) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(t.getLibelle());
                    row.createCell(col++).setCellValue(t.getVentes());
                    row.createCell(col++).setCellValue(t.getQuantite());
                    row.createCell(col++).setCellValue(t.getMontant());
                });
        String nomFichier = "garde_tranches_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + nomFichier).build();
    }
}
