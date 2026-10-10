package rest;

import dal.TPrivilege;
import dal.TUser;
import etiquetagepro.Correspondance;
import etiquetagepro.LecteurTableau;
import etiquetagepro.LigneEtiquette;
import etiquetagepro.MoteurEtiquettes;
import etiquetagepro.OptionsImpression;
import etiquetagepro.Tableau;
import etiquetagepro.Zone;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.report.pdf.EtiquetteEditionService;
import rest.report.pdf.LabelSheetPdf;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Etiquettage Pro (menu GESTION DU STOCK) : etiquettes de produits importes d'un fichier CSV / Excel (assistant de
 * correspondance des zones) ou saisis a l'ecran, en code-barres standard, DataMatrix ou QR code, sur les planches de
 * Prestige. Impression seule : rien n'est enregistre dans les fiches articles. Droit P_SM_ETIQUETAGE_PRO.
 * <ul>
 * <li>GET config : pharmacie, modeles de planche, reglages, zones ;</li>
 * <li>POST lire (multipart : fichier, feuille, titres) : contenu du fichier et correspondance proposee ;</li>
 * <li>POST appliquer : lignes tirees du fichier selon la correspondance, controlees ;</li>
 * <li>POST controler : lignes saisies ou modifiees a l'ecran, controlees ;</li>
 * <li>POST produits : designation, prix, EAN et grossiste de Prestige pour des CIP (completer les lignes) ;</li>
 * <li>POST pdf / test (formulaire, champ « donnees ») : planche PDF / page de test de calage.</li>
 * </ul>
 */
@Path("v1/etiquetage-pro")
@Produces("application/json")
public class EtiquetageProRessource {

    static final String DROIT = "P_SM_ETIQUETAGE_PRO";
    static final long TAILLE_MAX = 20L * 1024 * 1024;
    private static final Logger LOG = Logger.getLogger(EtiquetageProRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private EtiquetteEditionService service;
    @EJB
    private ReportUtil reportUtil;

    @SuppressWarnings("unchecked")
    private JSONObject refus() {
        HttpSession s = servletRequest.getSession(false);
        if (s == null || s.getAttribute(commonparameter.AIRTIME_USER) == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!CommonUtils.hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                DROIT)) {
            return echec("Vous n'avez pas le droit d'utiliser Étiquettage Pro.").put("interdit", true);
        }
        return null;
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    /* ------------------------------------------------------------ config */

    @GET
    @Path("config")
    public Response config() {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        JSONArray modeles = new JSONArray();
        for (String m : new String[] { LabelSheetPdf.MODELE_CARRE_38X21_2, LabelSheetPdf.MODELE_CARRE_38_1X21_2,
                LabelSheetPdf.MODELE_ARRONDI_38X21, LabelSheetPdf.MODELE_PERSONNALISE }) {
            LabelSheetPdf.SheetFormat f = LabelSheetPdf.formatFor(m, reportUtil::findParameterValue);
            modeles.put(new JSONObject().put("id", m).put("libelle", libelleModele(m)).put("parPage", f.perPage()));
        }
        JSONObject reglages = new JSONObject();
        for (String k : new String[] { LabelSheetPdf.KEY_NB_COLONNES, LabelSheetPdf.KEY_NB_LIGNES,
                LabelSheetPdf.KEY_LARGEUR_MM, LabelSheetPdf.KEY_HAUTEUR_MM, LabelSheetPdf.KEY_ESPACE_H_MM,
                LabelSheetPdf.KEY_ESPACE_V_MM, LabelSheetPdf.KEY_MARGE_GAUCHE_MM, LabelSheetPdf.KEY_MARGE_HAUT_MM,
                LabelSheetPdf.KEY_DECALAGE_X_MM, LabelSheetPdf.KEY_DECALAGE_Y_MM,
                LabelSheetPdf.KEY_ECHELLE_POURCENT }) {
            reglages.put(k, StringUtils.defaultString(reportUtil.findParameterValue(k)));
        }
        JSONArray zones = new JSONArray();
        for (Zone z : Zone.values()) {
            zones.put(new JSONObject().put("id", z.name()).put("libelle", z.getLibelle())
                    .put("obligatoire", z.isObligatoireParDefaut()).put("verrouillee", z.isToujoursObligatoire())
                    .put("titres", new JSONArray(z.getTitres())));
        }
        String modele = StringUtils.defaultIfBlank(reportUtil.findParameterValue(LabelSheetPdf.KEY_MODELE),
                LabelSheetPdf.MODELE_CARRE_38X21_2);
        return json(new JSONObject().put("success", true).put("officine", StringUtils.defaultString(service.officine()))
                .put("modeles", modeles).put("modele", modele.toUpperCase())
                .put("code", LabelSheetPdf.typeCode(reportUtil.findParameterValue("KEY_ETIQUETTE_CODE")))
                .put("reglages", reglages).put("zones", zones).put("monnaie", "CFA")
                .put("date", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yy")))
                .put("modeleCsv", Zone.fichierModele()).put("maxEtiquettes", MoteurEtiquettes.MAX_ETIQUETTES)
                .put("maxLignes", LecteurTableau.MAX_LIGNES));
    }

    static String libelleModele(String m) {
        switch (m) {
        case LabelSheetPdf.MODELE_CARRE_38_1X21_2:
            return "Carré 38,1 x 21,2 mm (65 par page, espacées)";
        case LabelSheetPdf.MODELE_ARRONDI_38X21:
            return "Arrondi 38 x 21 mm (65 par page)";
        case LabelSheetPdf.MODELE_PERSONNALISE:
            return "Format libre (dimensions ci-dessous)";
        default:
            return "Carré 38 x 21,2 mm (65 par page)";
        }
    }

    /* -------------------------------------------------------------- lire */

    /** Lecture du fichier (reponse text/html : l'envoi de fichier d'ExtJS passe par une iframe cachee). */
    @POST
    @Path("lire")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.TEXT_HTML)
    public Response lire() {
        JSONObject r = refus();
        if (r != null) {
            return Response.ok(r.toString()).build();
        }
        try {
            ServletFileUpload upload = new ServletFileUpload(new DiskFileItemFactory());
            upload.setFileSizeMax(TAILLE_MAX);
            upload.setSizeMax(TAILLE_MAX + 64 * 1024);
            String feuille = null;
            boolean titres = true;
            FileItem fichier = null;
            for (FileItem item : upload.parseRequest(servletRequest)) {
                if (item.isFormField() && "feuille".equals(item.getFieldName())) {
                    feuille = StringUtils.trimToNull(item.getString("UTF-8"));
                } else if (item.isFormField() && "titres".equals(item.getFieldName())) {
                    titres = !"false".equals(item.getString()) && !"0".equals(item.getString());
                } else if (!item.isFormField() && fichier == null) {
                    fichier = item;
                }
            }
            if (fichier == null || fichier.getSize() == 0) {
                return Response.ok(echec("Aucun fichier reçu (ou fichier vide).").toString()).build();
            }
            String nom = StringUtils.defaultString(fichier.getName());
            nom = nom.substring(Math.max(nom.lastIndexOf('/'), nom.lastIndexOf('\\')) + 1);
            Tableau t = LecteurTableau.lire(nom, fichier.get(), feuille, titres);
            Correspondance c = Correspondance.proposer(t);
            JSONObject proposition = new JSONObject();
            for (Zone z : Zone.values()) {
                if (c.getSource(z) != null) {
                    proposition.put(z.name(), c.getSource(z));
                }
            }
            JSONObject o = tableauJson(t).put("success", true).put("fichier", nom).put("proposition", proposition)
                    .put("titres", titres);
            return Response.ok(o.toString()).build();
        } catch (org.apache.commons.fileupload.FileUploadBase.SizeLimitExceededException
                | org.apache.commons.fileupload.FileUploadBase.FileSizeLimitExceededException e) {
            return Response.ok(echec("Fichier trop volumineux (20 Mo au plus).").toString()).build();
        } catch (IOException e) {
            return Response.ok(echec(e.getMessage()).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Etiquettage Pro : lecture du fichier", e);
            return Response.ok(echec("Fichier illisible.").toString()).build();
        }
    }

    static JSONObject tableauJson(Tableau t) {
        JSONArray lignes = new JSONArray();
        for (List<String> l : t.getLignes()) {
            lignes.put(new JSONArray(l));
        }
        return new JSONObject().put("colonnes", new JSONArray(t.getColonnes())).put("lignes", lignes)
                .put("feuilles", new JSONArray(t.getFeuilles()))
                .put("feuille", StringUtils.defaultString(t.getFeuille()))
                .put("separateur", StringUtils.defaultString(t.getSeparateur()))
                .put("encodage", StringUtils.defaultString(t.getEncodage())).put("ignorees", t.getLignesIgnorees());
    }

    /* ------------------------------------------------- appliquer / controler */

    @POST
    @Path("appliquer")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response appliquer(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        try {
            JSONObject d = new JSONObject(corps);
            List<String> colonnes = new ArrayList<>();
            JSONArray c = d.optJSONArray("colonnes");
            for (int i = 0; c != null && i < c.length(); i++) {
                colonnes.add(c.optString(i));
            }
            List<List<String>> cellules = new ArrayList<>();
            JSONArray l = d.optJSONArray("lignes");
            for (int i = 0; l != null && i < l.length() && i < LecteurTableau.MAX_LIGNES; i++) {
                JSONArray x = l.optJSONArray(i);
                List<String> ligne = new ArrayList<>();
                for (int k = 0; x != null && k < x.length(); k++) {
                    ligne.add(x.optString(k));
                }
                cellules.add(ligne);
            }
            Tableau t = new Tableau(colonnes, cellules);
            Correspondance corr = correspondance(d);
            List<LigneEtiquette> lignes = corr.appliquer(t, d.optBoolean("titres", true));
            return json(lignesJson(lignes).put("success", true).put("inconnues",
                    new JSONArray(corr.referencesInconnues(t))));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Etiquettage Pro : appliquer", e);
            return json(echec("Correspondance illisible."));
        }
    }

    @POST
    @Path("controler")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response controler(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        try {
            JSONObject d = new JSONObject(corps);
            return json(lignesJson(lignes(d)).put("success", true));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Etiquettage Pro : controler", e);
            return json(echec("Lignes illisibles."));
        }
    }

    static Correspondance correspondance(JSONObject d) {
        Correspondance c = new Correspondance();
        JSONObject sources = d.optJSONObject("sources");
        if (sources != null) {
            for (String k : sources.keySet()) {
                Zone z = Zone.de(k);
                if (z != null) {
                    c.source(z, sources.optString(k));
                }
            }
        }
        for (Zone z : obligatoires(d)) {
            c.obligatoire(z, true);
        }
        if (d.has("obligatoires")) {
            for (Zone z : Zone.values()) {
                if (!obligatoires(d).contains(z)) {
                    c.obligatoire(z, false);
                }
            }
        }
        JSONArray a = d.optJSONArray("ajoutees");
        for (int i = 0; a != null && i < a.length() && i < 30; i++) {
            JSONObject x = a.optJSONObject(i);
            if (x != null) {
                c.ajouter(x.optString("nom"), x.optString("modele"));
            }
        }
        return c;
    }

    static Set<Zone> obligatoires(JSONObject d) {
        Set<Zone> s = EnumSet.of(Zone.CIP);
        JSONArray o = d.optJSONArray("obligatoires");
        if (o == null) {
            for (Zone z : Zone.values()) {
                if (z.isObligatoireParDefaut()) {
                    s.add(z);
                }
            }
            return s;
        }
        for (int i = 0; i < o.length(); i++) {
            Zone z = Zone.de(o.optString(i));
            if (z != null) {
                s.add(z);
            }
        }
        return s;
    }

    /** Lignes recues de l'ecran ({numero, valeurs: {ZONE: texte}, ajoutees: {nom: texte}}), controlees. */
    static List<LigneEtiquette> lignes(JSONObject d) {
        Set<Zone> obl = obligatoires(d);
        List<LigneEtiquette> lignes = new ArrayList<>();
        JSONArray l = d.optJSONArray("lignes");
        for (int i = 0; l != null && i < l.length() && i < LecteurTableau.MAX_LIGNES; i++) {
            JSONObject x = l.optJSONObject(i);
            if (x == null) {
                continue;
            }
            LigneEtiquette e = new LigneEtiquette(x.optInt("numero", i + 1));
            JSONObject v = x.optJSONObject("valeurs");
            for (Zone z : Zone.values()) {
                if (v != null && v.has(z.name())) {
                    e.valeur(z, v.isNull(z.name()) ? "" : String.valueOf(v.get(z.name())));
                }
            }
            JSONObject a = x.optJSONObject("ajoutees");
            if (a != null) {
                for (String k : a.keySet()) {
                    e.ajoutee(k, a.optString(k));
                }
            }
            lignes.add(e.valider(obl));
        }
        return lignes;
    }

    static JSONObject lignesJson(List<LigneEtiquette> lignes) {
        JSONArray a = new JSONArray();
        int erreurs = 0;
        for (LigneEtiquette l : lignes) {
            JSONObject v = new JSONObject();
            for (Zone z : Zone.values()) {
                v.put(z.name(), l.valeur(z));
            }
            Map<String, String> ajoutees = new LinkedHashMap<>(l.getAjoutees());
            a.put(new JSONObject().put("numero", l.getNumero()).put("valeurs", v)
                    .put("ajoutees", new JSONObject(ajoutees)).put("erreurs", new JSONArray(l.getErreurs()))
                    .put("avertissements", new JSONArray(l.getAvertissements()))
                    .put("nombre", l.imprimable() ? l.getNombre() : 0));
            if (!l.imprimable()) {
                erreurs++;
            }
        }
        return new JSONObject().put("lignes", a).put("total", MoteurEtiquettes.total(lignes)).put("enErreur", erreurs);
    }

    /* ----------------------------------------------------------- produits */

    @POST
    @Path("produits")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response produits(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        JSONArray c = new JSONObject(corps).optJSONArray("cips");
        List<String> cips = new ArrayList<>();
        for (int i = 0; c != null && i < c.length(); i++) {
            cips.add(c.optString(i));
        }
        return json(new JSONObject().put("success", true).put("produits", service.produitsParCip(cips)));
    }

    /* ---------------------------------------------------------- impression */

    static OptionsImpression options(JSONObject d) {
        JSONObject o = d.optJSONObject("options");
        OptionsImpression opt = new OptionsImpression();
        if (o == null) {
            return opt;
        }
        opt.typeCode(o.optString("code")).modele(StringUtils.trimToNull(o.optString("modele")))
                .positionDepart(o.optInt("position", 1)).officine(o.optString("officine"))
                .monnaie(o.has("monnaie") ? o.optString("monnaie") : "CFA").dateParDefaut(o.optString("date"));
        JSONObject reglages = o.optJSONObject("reglages");
        if (reglages != null) {
            for (String k : reglages.keySet()) {
                opt.reglage(k, reglages.isNull(k) ? null : String.valueOf(reglages.get(k)));
            }
        }
        return opt;
    }

    private Response page(String message) {
        String html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>Étiquettage Pro</title></head>"
                + "<body style=\"font-family:sans-serif;padding:24px\"><h3>Étiquettage Pro</h3><p>" + echapper(message)
                + "</p></body></html>";
        return Response.ok(html.getBytes(StandardCharsets.UTF_8), "text/html; charset=UTF-8").build();
    }

    static String echapper(String s) {
        return StringUtils.defaultString(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String disposition(String nom) {
        return "inline; filename=\"" + nom + "\"";
    }

    @POST
    @Path("pdf")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces({ "application/pdf", "text/html" })
    public Response pdf(@FormParam("donnees") String donnees) {
        JSONObject r = refus();
        if (r != null) {
            return page(r.optString("msg"));
        }
        try {
            JSONObject d = new JSONObject(StringUtils.defaultIfBlank(donnees, "{}"));
            byte[] pdf = service.etiquetagePro(lignes(d), options(d), reportUtil::findParameterValue);
            return Response.ok(pdf, "application/pdf").header("Content-Disposition", disposition("etiquettes.pdf"))
                    .build();
        } catch (Exception e) {
            Throwable c = e;
            while (c instanceof javax.ejb.EJBException && c.getCause() != null) {
                c = c.getCause();
            }
            if (c instanceof IllegalArgumentException) {
                return page(c.getMessage());
            }
            LOG.log(Level.SEVERE, "Etiquettage Pro : impression", e);
            return page("Impression impossible : " + e.getMessage());
        }
    }

    @POST
    @Path("test")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces({ "application/pdf", "text/html" })
    public Response test(@FormParam("donnees") String donnees) {
        JSONObject r = refus();
        if (r != null) {
            return page(r.optString("msg"));
        }
        try {
            java.io.ByteArrayOutputStream o = new java.io.ByteArrayOutputStream();
            MoteurEtiquettes.pageDeTest(o, options(new JSONObject(StringUtils.defaultIfBlank(donnees, "{}"))),
                    reportUtil::findParameterValue);
            return Response.ok(o.toByteArray(), "application/pdf")
                    .header("Content-Disposition", disposition("etiquettes_test.pdf")).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Etiquettage Pro : page de test", e);
            return page("Page de test impossible : " + e.getMessage());
        }
    }
}
