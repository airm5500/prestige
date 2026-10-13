package rest;

import dal.TPrivilege;
import dal.TUser;
import etiquetagepro.LecteurTableau;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.pdf.TableauPdf;
import rest.service.impl.valorisation.SetValorisation;
import rest.service.impl.valorisation.SetValorisation.Base;
import rest.service.impl.valorisation.SetValorisation.Ligne;
import rest.service.impl.valorisation.SetValorisation.Resultat;
import rest.service.impl.valorisation.SetValorisationService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * SET VALORISATION (besoins du 11/10, lot 4) : valorisation SIMULEE. Droit dedie P_SET_VALORISATION, donne a aucun role
 * par defaut, verifie a chaque appel. Rien n'est ecrit dans le stock ; un fichier importe n'est pas conserve. Chaque
 * reponse et chaque edition portent la mention « SIMULATION ».
 * <ul>
 * <li>GET depart : valeur du stock de l'officine (prix d'achat et de vente) ;</li>
 * <li>POST import (multipart, champ fichier) : lignes lues d'un fichier CSV / Excel ;</li>
 * <li>POST calculer : {source STOCK|IMPORT, base PA|PV, cible, lignes (IMPORT)} : quantites ajustees ;</li>
 * <li>POST pdf / excel (formulaire, champ « donnees » : la meme demande) : edition.</li>
 * </ul>
 */
@Path("v1/set-valorisation")
@Produces("application/json")
public class SetValorisationRessource {

    static final String DROIT = "P_SET_VALORISATION";
    static final long TAILLE_MAX = 10L * 1024 * 1024;
    private static final Logger LOG = Logger.getLogger(SetValorisationRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SetValorisationService service;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        Object u = s == null ? null : s.getAttribute(commonparameter.AIRTIME_USER);
        return u instanceof TUser ? (TUser) u : null;
    }

    @SuppressWarnings("unchecked")
    private String refus() {
        HttpSession s = servletRequest.getSession(false);
        if (utilisateur() == null) {
            return Constant.DECONNECTED_MESSAGE;
        }
        if (!CommonUtils.hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                DROIT)) {
            return "Votre profil ne donne pas accès à Set valorisation.";
        }
        return null;
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.put("mention", SetValorisation.MENTION).toString()).type(MediaType.APPLICATION_JSON)
                .build();
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("message", msg);
    }

    /* ------------------------------------------------------------------------------------------------ depart */

    @GET
    @Path("depart")
    public Response depart() {
        String refus = refus();
        if (refus != null) {
            return json(echec(refus));
        }
        List<Ligne> l = service.stockOfficine();
        long pa = 0, pv = 0, q = 0;
        for (Ligne x : l) {
            pa += x.qte * x.pa;
            pv += x.qte * x.pv;
            q += x.qte;
        }
        return json(new JSONObject().put("success", true).put("nbLignes", l.size()).put("quantite", q)
                .put("valeurPA", pa).put("valeurPV", pv));
    }

    /* ------------------------------------------------------------------------------------------------ import */

    /** Lecture d'un fichier (reponse text/html : l'envoi de fichier d'ExtJS passe par une iframe cachee). */
    @POST
    @Path("import")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.TEXT_HTML)
    public Response importer() {
        String refus = refus();
        if (refus != null) {
            return Response.ok(echec(refus).put("mention", SetValorisation.MENTION).toString()).build();
        }
        JSONObject o;
        try {
            ServletFileUpload upload = new ServletFileUpload(new DiskFileItemFactory());
            upload.setFileSizeMax(TAILLE_MAX);
            upload.setSizeMax(TAILLE_MAX + 64 * 1024);
            FileItem fichier = null;
            for (FileItem item : upload.parseRequest(servletRequest)) {
                if (!item.isFormField() && fichier == null) {
                    fichier = item;
                }
            }
            if (fichier == null || fichier.getSize() == 0) {
                o = echec("Aucun fichier reçu (ou fichier vide).");
            } else {
                String nom = StringUtils.defaultString(fichier.getName());
                nom = nom.substring(Math.max(nom.lastIndexOf('/'), nom.lastIndexOf('\\')) + 1);
                SetValorisation.Import im = SetValorisation.lire(LecteurTableau.lire(nom, fichier.get(), null, true));
                if (im.message != null) {
                    o = echec(im.message).put("ignorees", im.ignorees);
                } else {
                    long pa = 0, pv = 0;
                    for (Ligne x : im.lignes) {
                        pa += x.qte * x.pa;
                        pv += x.qte * x.pv;
                    }
                    o = new JSONObject().put("success", true).put("fichier", nom).put("lignes", lignesJson(im.lignes))
                            .put("nbLignes", im.lignes.size()).put("ignorees", im.ignorees).put("colonnes", im.colonnes)
                            .put("valeurPA", pa).put("valeurPV", pv);
                }
            }
        } catch (org.apache.commons.fileupload.FileUploadBase.SizeLimitExceededException
                | org.apache.commons.fileupload.FileUploadBase.FileSizeLimitExceededException e) {
            o = echec("Fichier trop volumineux (10 Mo au plus).");
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Set valorisation : lecture du fichier : {0}", e.getClass().getSimpleName());
            o = echec("Fichier illisible : enregistrez-le en CSV, XLS ou XLSX.");
        }
        return Response.ok(o.put("mention", SetValorisation.MENTION).toString(), "text/html; charset=UTF-8").build();
    }

    private static JSONArray lignesJson(List<Ligne> l) {
        JSONArray a = new JSONArray();
        for (Ligne x : l) {
            a.put(new JSONObject().put("cip", x.cip).put("designation", x.designation).put("qte", x.qte).put("pa", x.pa)
                    .put("pv", x.pv));
        }
        return a;
    }

    /* ------------------------------------------------------------------------------------------------ calcul */

    /** Demande lue et calculee ; IllegalArgumentException si elle est irrecevable. */
    private Object[] calcul(JSONObject d) {
        String source = "IMPORT".equalsIgnoreCase(d.optString("source")) ? "IMPORT" : "STOCK";
        Base base = Base.de(d.optString("base"));
        long cible = d.optLong("cible", 0);
        List<Ligne> lignes;
        if ("STOCK".equals(source)) {
            /* le stock est relu ici : on ne se fie pas a des lignes envoyees par le navigateur */
            lignes = service.stockOfficine();
        } else {
            JSONArray a = d.optJSONArray("lignes");
            lignes = new ArrayList<>();
            if (a != null) {
                if (a.length() > SetValorisation.MAX_LIGNES) {
                    throw new IllegalArgumentException("Trop de lignes (" + SetValorisation.MAX_LIGNES + " au plus).");
                }
                for (int i = 0; i < a.length(); i++) {
                    JSONObject x = a.optJSONObject(i);
                    if (x != null) {
                        lignes.add(new Ligne(StringUtils.left(x.optString("cip"), 40),
                                StringUtils.left(x.optString("designation"), 200), x.optLong("qte"), x.optLong("pa"),
                                x.optLong("pv")));
                    }
                }
            }
        }
        String motif = SetValorisation.controler(lignes, cible);
        if (motif != null) {
            throw new IllegalArgumentException(motif);
        }
        Resultat r = SetValorisation.ajuster(lignes, cible, base);
        if (r.valeurDepart <= 0) {
            throw new IllegalArgumentException(
                    "La valeur de départ est nulle au " + base.libelle + " : rien à ajuster.");
        }
        return new Object[] { source, r };
    }

    private void journal(String action, String source, Resultat r) {
        try {
            service.journaliser(utilisateur().getLgUSERID(), action, source, r);
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Set valorisation : journal non écrit : {0}", e.getClass().getSimpleName());
        }
    }

    @POST
    @Path("calculer")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response calculer(String corps) {
        String refus = refus();
        if (refus != null) {
            return json(echec(refus));
        }
        try {
            Object[] c = calcul(new JSONObject(StringUtils.defaultIfBlank(corps, "{}")));
            Resultat r = (Resultat) c[1];
            journal("CALCUL", (String) c[0], r);
            JSONArray a = new JSONArray();
            for (Ligne x : r.lignes) {
                long p = x.prix(r.base);
                a.put(new JSONObject().put("cip", x.cip).put("designation", x.designation).put("qte", x.qte)
                        .put("qteAjustee", x.qteAjustee).put("prix", p).put("valeurDepart", x.qte * p)
                        .put("valeurAjustee", x.qteAjustee * p));
            }
            return json(new JSONObject().put("success", true).put("source", c[0]).put("base", r.base.name())
                    .put("cible", r.cible).put("valeurDepart", r.valeurDepart).put("valeurObtenue", r.valeurObtenue)
                    .put("ecart", r.ecart()).put("coefficient", r.coefficient).put("qteDepart", r.qteDepart)
                    .put("qteAjustee", r.qteAjustee).put("nbLignes", r.lignes.size())
                    .put("lignesValorisees", r.lignesValorisees).put("lignes", a));
        } catch (IllegalArgumentException e) {
            return json(echec(e.getMessage()));
        } catch (org.json.JSONException e) {
            return json(echec("Demande illisible."));
        }
    }

    /* ------------------------------------------------------------------------------------------------ editions */

    private static String n(long v) {
        return String.format(java.util.Locale.FRANCE, "%,d", v).replace(' ', ' ').replace(' ', ' ');
    }

    private String sousTitre(String source, Resultat r) {
        return ("IMPORT".equals(source) ? "Fichier importé" : "Stock de l'officine") + " · valorisé au "
                + r.base.libelle + " · cible " + n(r.cible) + " · obtenu " + n(r.valeurObtenue) + " (écart "
                + n(r.ecart()) + ") · départ " + n(r.valeurDepart) + " · coefficient "
                + String.format(java.util.Locale.FRANCE, "%.4f", r.coefficient);
    }

    private String nomUtilisateur() {
        TUser u = utilisateur();
        return (StringUtils.defaultString(u.getStrFIRSTNAME()) + " " + StringUtils.defaultString(u.getStrLASTNAME()))
                .trim();
    }

    private static Response page(String message) {
        String html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>Set valorisation</title></head>"
                + "<body style=\"font-family:sans-serif;padding:24px\"><h3>Set valorisation</h3><p>"
                + StringUtils.defaultString(message).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                + "</p></body></html>";
        return Response.ok(html.getBytes(StandardCharsets.UTF_8), "text/html; charset=UTF-8").build();
    }

    static final String[] ENTETES = { "CIP", "Désignation", "Qté de départ", "Qté simulée", "Prix unitaire",
            "Valeur de départ", "Valeur simulée" };

    @POST
    @Path("pdf")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces({ "application/pdf", "text/html" })
    public Response pdf(@FormParam("donnees") String donnees) {
        return editionPdf(donnees);
    }

    /** Meme edition, demande en JSON (un fichier importe volumineux depasse la taille permise d'un formulaire). */
    @POST
    @Path("pdf")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces({ "application/pdf", "text/html" })
    public Response pdfJson(String corps) {
        return editionPdf(corps);
    }

    private Response editionPdf(String donnees) {
        String refus = refus();
        if (refus != null) {
            return page(refus);
        }
        try {
            Object[] c = calcul(new JSONObject(StringUtils.defaultIfBlank(donnees, "{}")));
            Resultat r = (Resultat) c[1];
            TableauPdf.Edition e = new TableauPdf.Edition();
            e.officine = service.nomOfficine();
            e.titre = "SET VALORISATION — " + SetValorisation.MENTION.toUpperCase(java.util.Locale.FRANCE);
            e.sousTitre = sousTitre((String) c[0], r);
            e.imprimePar = nomUtilisateur();
            e.filigrane = "SIMULATION";
            e.entetes = ENTETES;
            e.largeurs = new float[] { 9f, 34f, 9f, 9f, 10f, 13f, 13f };
            e.droite = new boolean[] { false, false, true, true, true, true, true };
            List<String[]> lignes = new ArrayList<>();
            for (Ligne x : r.lignes) {
                long p = x.prix(r.base);
                lignes.add(new String[] { x.cip, x.designation, n(x.qte), n(x.qteAjustee), n(p), n(x.qte * p),
                        n(x.qteAjustee * p) });
            }
            lignes.add(new String[] { "", "TOTAL (" + r.lignes.size() + " lignes)", n(r.qteDepart), n(r.qteAjustee), "",
                    n(r.valeurDepart), n(r.valeurObtenue) });
            journal("PDF", (String) c[0], r);
            return Response.ok(TableauPdf.generer(e, lignes), "application/pdf")
                    .header("Content-Disposition", "inline; filename=\"set_valorisation_simulation.pdf\"").build();
        } catch (IllegalArgumentException e) {
            return page(e.getMessage());
        } catch (org.json.JSONException e) {
            return page("Demande illisible.");
        }
    }

    @POST
    @Path("excel")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces({ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/html" })
    public Response excel(@FormParam("donnees") String donnees) {
        return editionExcel(donnees);
    }

    @POST
    @Path("excel")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces({ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/html" })
    public Response excelJson(String corps) {
        return editionExcel(corps);
    }

    private Response editionExcel(String donnees) {
        String refus = refus();
        if (refus != null) {
            return page(refus);
        }
        try {
            Object[] c = calcul(new JSONObject(StringUtils.defaultIfBlank(donnees, "{}")));
            Resultat r = (Resultat) c[1];
            byte[] fichier = classeur(service.nomOfficine(), sousTitre((String) c[0], r), r);
            journal("EXCEL", (String) c[0], r);
            return Response.ok(fichier, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .header("Content-Disposition", "attachment; filename=\"set_valorisation_simulation.xlsx\"").build();
        } catch (IllegalArgumentException e) {
            return page(e.getMessage());
        } catch (org.json.JSONException e) {
            return page("Demande illisible.");
        }
    }

    static byte[] classeur(String officine, String sousTitre, Resultat r) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet s = wb.createSheet("SIMULATION");
            Font gras = wb.createFont();
            gras.setBold(true);
            Font rouge = wb.createFont();
            rouge.setBold(true);
            rouge.setColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_RED.getIndex());
            rouge.setFontHeightInPoints((short) 13);
            CellStyle alerte = wb.createCellStyle();
            alerte.setFont(rouge);
            CellStyle entete = wb.createCellStyle();
            entete.setFont(gras);
            CellStyle total = wb.createCellStyle();
            total.setFont(gras);
            int i = 0;
            s.createRow(i++).createCell(0).setCellValue(StringUtils.defaultString(officine));
            Cell m = s.createRow(i++).createCell(0);
            m.setCellValue("SET VALORISATION — " + SetValorisation.MENTION);
            m.setCellStyle(alerte);
            s.addMergedRegion(new CellRangeAddress(1, 1, 0, ENTETES.length - 1));
            s.createRow(i++).createCell(0).setCellValue(sousTitre);
            s.createRow(i++).createCell(0).setCellValue(
                    "Édité le " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            i++;
            Row h = s.createRow(i++);
            for (int k = 0; k < ENTETES.length; k++) {
                Cell x = h.createCell(k);
                x.setCellValue(ENTETES[k]);
                x.setCellStyle(entete);
            }
            for (Ligne x : r.lignes) {
                long p = x.prix(r.base);
                Row l = s.createRow(i++);
                l.createCell(0).setCellValue(StringUtils.defaultString(x.cip));
                l.createCell(1).setCellValue(StringUtils.defaultString(x.designation));
                l.createCell(2).setCellValue(x.qte);
                l.createCell(3).setCellValue(x.qteAjustee);
                l.createCell(4).setCellValue(p);
                l.createCell(5).setCellValue(x.qte * p);
                l.createCell(6).setCellValue(x.qteAjustee * p);
            }
            Row t = s.createRow(i++);
            Cell tl = t.createCell(1);
            tl.setCellValue("TOTAL — " + SetValorisation.MENTION);
            tl.setCellStyle(total);
            t.createCell(2).setCellValue(r.qteDepart);
            t.createCell(3).setCellValue(r.qteAjustee);
            t.createCell(5).setCellValue(r.valeurDepart);
            t.createCell(6).setCellValue(r.valeurObtenue);
            s.setColumnWidth(0, 14 * 256);
            s.setColumnWidth(1, 44 * 256);
            for (int k = 2; k < ENTETES.length; k++) {
                s.setColumnWidth(k, 16 * 256);
            }
            s.createFreezePane(0, 6);
            wb.write(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Classeur impossible", e);
        }
    }
}
