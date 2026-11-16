package rest;

import com.itextpdf.text.Document;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfWriter;
import dal.TPrivilege;
import dal.TUser;
import dal.dataManager;
import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.impl.facture.CachetFacture;
import rest.service.impl.facture.EnteteFacture;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * En-tête et pied de page des factures (plan du 14/11, point 2) : chargement des deux images, hauteur de leur zone,
 * retrait, aperçu. Écran « En-tête des factures » (FACTURATION). Les images sont apposées sur les factures par
 * {@link EnteteFacture}, après leur génération.
 */
@Path("v1/entete-facture")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EnteteFactureRessource {

    private static final Logger LOG = Logger.getLogger(EnteteFactureRessource.class.getName());
    static final String DROIT = "P_SM_ENTETE_FACTURE";

    @Inject
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        HttpSession hs = servletRequest.getSession(false);
        return hs == null ? null : (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean peutModifier() {
        HttpSession hs = servletRequest.getSession(false);
        return hs != null && hs.getAttribute(commonparameter.AIRTIME_USER) != null && CommonUtils
                .hasAuthorityByName((List<TPrivilege>) hs.getAttribute(commonparameter.USER_LIST_PRIVILEGE), DROIT);
    }

    private static Response json(JSONObject j) {
        return Response.ok(j.toString(), MediaType.APPLICATION_JSON + ";charset=UTF-8").build();
    }

    private static Response refus(String msg) {
        return json(new JSONObject().put("success", false).put("msg", msg));
    }

    private static Response deconnecte() {
        return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
    }

    /** Images en place : pour chaque partie, hauteur (mm), type, nom, taille et date ; et le droit de modifier. */
    @GET
    @Path("info")
    @SuppressWarnings("unchecked")
    public Response info() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            List<Object[]> r = odm.getEm()
                    .createNativeQuery(
                            "SELECT partie, hauteur, type, nom, LENGTH(image), created_at FROM t_entete_facture")
                    .getResultList();
            JSONObject j = new JSONObject().put("success", true).put("peutModifier", peutModifier()).put("bornes",
                    new JSONObject().put("enteteMin", EnteteFacture.ENTETE_MIN)
                            .put("enteteMax", EnteteFacture.ENTETE_MAX).put("enteteDefaut", EnteteFacture.ENTETE_DEFAUT)
                            .put("piedMin", EnteteFacture.PIED_MIN).put("piedMax", EnteteFacture.PIED_MAX)
                            .put("piedDefaut", EnteteFacture.PIED_DEFAUT));
            SimpleDateFormat f = new SimpleDateFormat("dd/MM/yyyy HH:mm");
            for (Object[] o : r) {
                j.put(EnteteFacture.ENTETE.equals(o[0]) ? "entete" : "pied",
                        new JSONObject().put("hauteur", ((Number) o[1]).intValue()).put("type", o[2])
                                .put("nom", o[3] == null ? "" : o[3]).put("taille", ((Number) o[4]).longValue())
                                .put("date", o[5] == null ? "" : f.format(o[5])));
            }
            return json(j);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "en-tête info", e);
            return refus("Lecture impossible.");
        } finally {
            odm.closeEntityManager();
        }
    }

    /** L'image d'une partie, pour l'aperçu de l'écran. */
    @GET
    @Path("image")
    @Produces({ "image/png", "image/jpeg", MediaType.TEXT_PLAIN })
    @SuppressWarnings("unchecked")
    public Response image(@QueryParam("partie") String partieParam) {
        String partie = EnteteFacture.partie(partieParam);
        if (utilisateur() == null || partie == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            List<Object[]> r = odm.getEm()
                    .createNativeQuery("SELECT image, type FROM t_entete_facture WHERE partie = ?1")
                    .setParameter(1, partie).getResultList();
            if (r.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).build();
            }
            return Response.ok(r.get(0)[0], "image/" + r.get(0)[1]).header("Cache-Control", "no-store").build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Enregistre (ou remplace) l'image d'une partie : {partie: "ENTETE" | "PIED", donnees: base64, nom, hauteur}. */
    @POST
    public Response enregistrer(String corps) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        if (!peutModifier()) {
            return refus("Vous n'avez pas le droit de modifier l'en-tête des factures.");
        }
        JSONObject c = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        String partie = EnteteFacture.partie(c.optString("partie"));
        if (partie == null) {
            return refus("Choisissez l'en-tête ou le pied de page.");
        }
        byte[] image;
        try {
            image = CachetFacture.decoder(c.optString("donnees"));
        } catch (IllegalArgumentException e) {
            return refus(e.getMessage());
        }
        int hauteur = EnteteFacture.hauteur(partie, c.has("hauteur") ? c.optInt("hauteur") : null);
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            em.getTransaction().begin();
            em.createNativeQuery("DELETE FROM t_entete_facture WHERE partie = ?1").setParameter(1, partie)
                    .executeUpdate();
            em.createNativeQuery("INSERT INTO t_entete_facture (partie, image, type, nom, hauteur, created_at,"
                    + " lg_USER_ID) VALUES (?1, ?2, ?3, ?4, ?5, NOW(), ?6)").setParameter(1, partie)
                    .setParameter(2, image).setParameter(3, CachetFacture.type(image))
                    .setParameter(4, StringUtils.left(c.optString("nom"), 200)).setParameter(5, hauteur)
                    .setParameter(6, u.getLgUSERID()).executeUpdate();
            em.getTransaction().commit();
            return json(new JSONObject().put("success", true).put("hauteur", hauteur).put("msg",
                    EnteteFacture.ENTETE.equals(partie) ? "En-tête enregistré." : "Pied de page enregistré."));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "en-tête enregistrer", e);
            if (odm.getEm().getTransaction().isActive()) {
                odm.getEm().getTransaction().rollback();
            }
            return refus("Enregistrement impossible.");
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Hauteur seule (sans changer l'image) : {partie, hauteur}. */
    @POST
    @Path("hauteur")
    public Response hauteur(String corps) {
        return maj(corps, true);
    }

    /** Retire l'image d'une partie : {partie}. Les factures reprennent leur en-tête (ou leur pied) d'origine. */
    @POST
    @Path("supprimer")
    public Response supprimer(String corps) {
        return maj(corps, false);
    }

    private Response maj(String corps, boolean hauteurSeule) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!peutModifier()) {
            return refus("Vous n'avez pas le droit de modifier l'en-tête des factures.");
        }
        JSONObject c = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        String partie = EnteteFacture.partie(c.optString("partie"));
        if (partie == null) {
            return refus("Choisissez l'en-tête ou le pied de page.");
        }
        int hauteur = EnteteFacture.hauteur(partie, c.has("hauteur") ? c.optInt("hauteur") : null);
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            em.getTransaction().begin();
            int n = hauteurSeule
                    ? em.createNativeQuery("UPDATE t_entete_facture SET hauteur = ?2 WHERE partie = ?1")
                            .setParameter(1, partie).setParameter(2, hauteur).executeUpdate()
                    : em.createNativeQuery("DELETE FROM t_entete_facture WHERE partie = ?1").setParameter(1, partie)
                            .executeUpdate();
            em.getTransaction().commit();
            String quoi = EnteteFacture.ENTETE.equals(partie) ? "l'en-tête" : "le pied de page";
            return json(new JSONObject().put("success", n > 0).put("hauteur", hauteur).put("msg",
                    n == 0 ? "Aucune image pour " + quoi + "." : hauteurSeule ? "Hauteur enregistrée."
                            : "Image retirée : les factures reprennent " + quoi + " d'origine."));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "en-tête mise à jour", e);
            if (odm.getEm().getTransaction().isActive()) {
                odm.getEm().getTransaction().rollback();
            }
            return refus("Opération impossible.");
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Page d'essai A4 (corps fictif) portant l'en-tête et le pied enregistrés : pour juger du rendu sans facture. */
    @GET
    @Path("apercu")
    @Produces({ "application/pdf", MediaType.TEXT_PLAIN })
    public Response apercu() {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            byte[] pdf = EnteteFacture.apposerSiRegle(odm.getEm(), pageEssai());
            return Response.ok(pdf, "application/pdf")
                    .header("Content-Disposition", "inline; filename=\"apercu-entete-facture.pdf\"")
                    .header("Cache-Control", "no-store").build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "en-tête aperçu", e);
            return Response.serverError().entity("Aperçu impossible").type(MediaType.TEXT_PLAIN).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Page A4 : un en-tête et un pied d'origine fictifs (à masquer) et le corps de la facture entre les deux. */
    static byte[] pageEssai() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document d = new Document(PageSize.A4, 36, 36, 20, 20);
        PdfWriter.getInstance(d, out);
        d.open();
        Font gros = new Font(Font.FontFamily.HELVETICA, 16, Font.BOLD),
                normal = new Font(Font.FontFamily.HELVETICA, 10);
        d.add(new Paragraph("EN-TÊTE D'ORIGINE (masqué par l'image)", gros));
        Paragraph corps = new Paragraph("Corps de la facture", gros);
        corps.setSpacingBefore((float) EnteteFacture.pt(EnteteFacture.ENTETE_MAX));
        d.add(corps);
        for (int i = 1; i <= 25; i++) {
            d.add(new Paragraph("Ligne " + i + " de la facture", normal));
        }
        d.close();
        return out.toByteArray();
    }
}
