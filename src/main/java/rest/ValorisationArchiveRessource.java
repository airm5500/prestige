package rest;

import dal.TUser;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.ValorisationPdfArchiveService;
import util.Constant;

/**
 * Valorisations du stock archivees en PDF (evolution 5, point 2).
 *
 * <p>
 * Les documents sont produits tout seuls les jours de fin et de debut de mois et ranges dans le sous-dossier
 * {@code valorisations}. Ces trois services permettent de les retrouver depuis l'application plutot qu'en allant
 * fouiller le disque du serveur, et de relancer l'archivage du jour a la demande.
 * </p>
 */
@javax.ws.rs.Path("v1/valorisation-archive")
@Produces("application/json")
@Consumes("application/json")
public class ValorisationArchiveRessource {

    @EJB
    private ValorisationPdfArchiveService archiveService;

    @Context
    private HttpServletRequest servletRequest;

    private TUser connecte() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    /** Liste des archives presentes, de la plus recente a la plus ancienne, avec le reglage courant. */
    @GET
    @javax.ws.rs.Path("list")
    public Response list() {
        if (connecte() == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        JSONArray lignes = new JSONArray();
        for (Path fichier : archiveService.archives()) {
            String nom = fichier.getFileName().toString();
            LocalDate jour = ValorisationPdfArchiveService.jourDuNom(nom);
            long taille = 0L;
            try {
                taille = Files.size(fichier);
            } catch (Exception e) {
                taille = 0L;
            }
            lignes.put(new JSONObject().put("fichier", nom).put("jour", jour == null ? "" : jour.toString())
                    .put("taille", taille));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", lignes.length())
                        .put("critere", archiveService.critere()).put("actif", archiveService.estActif())
                        .put("moisConserves", archiveService.moisConserves())
                        .put("dossier", archiveService.dossier().toString()).put("data", lignes).toString())
                .build();
    }

    /**
     * Sert une archive en flux, dans l'onglet ouvert par le clic : aucune fenetre intermediaire, comme les autres
     * editions de l'application.
     */
    @GET
    @javax.ws.rs.Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("fichier") String fichier) {
        if (connecte() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        // Le nom vient du client : on ne garde que le nom de fichier nu et on verifie qu'il designe bien
        // une archive du dossier, faute de quoi un « ../ » servirait n'importe quel fichier du serveur.
        String nom = StringUtils.trimToEmpty(fichier);
        if (nom.isEmpty() || !nom.matches("valorisation_[A-Za-z0-9_]+_du_\\d{4}-\\d{2}-\\d{2}\\.pdf")) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        Path cible = archiveService.dossier().resolve(nom).normalize();
        if (!cible.getParent().equals(archiveService.dossier().normalize()) || !Files.isRegularFile(cible)) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok((Object) cible.toFile()).type("application/pdf")
                .header("Content-Disposition", "inline; filename=\"" + nom + "\"").build();
    }

    /**
     * Relance l'archivage du jour. Utile juste apres avoir change le critere : on voit tout de suite le document que le
     * traitement de nuit produira, sans attendre la prochaine fin de mois.
     */
    @POST
    @javax.ws.rs.Path("generer")
    public Response generer() {
        if (connecte() == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        LocalDate jour = LocalDate.now();
        Path archive = archiveService.archiver(jour, true);
        if (archive == null) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message",
                            "La valorisation n'a pas pu etre produite. Verifiez que le modele d'etat"
                                    + " rp_valoristion est installe et consultez les journaux du serveur.")
                    .toString()).build();
        }
        int purgees = archiveService.purger(jour);
        List<Path> archives = archiveService.archives();
        String message = "Valorisation archivee : " + archive.getFileName() + (purgees > 0
                ? " (" + purgees + " archive(s) de plus de " + archiveService.moisConserves() + " mois retiree(s))"
                : "");
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("fichier", archive.getFileName().toString())
                        .put("total", archives.size()).put("purgees", purgees).put("critere", archiveService.critere())
                        .put("message", message).toString())
                .build();
    }
}
