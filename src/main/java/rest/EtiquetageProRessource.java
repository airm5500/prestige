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

    static final String DROIT_PERSO = "P_SM_ETIQUETTE_PERSO";

    /** Personnalisation : droit de modifier les dispositions (administrateur par defaut). */
    @SuppressWarnings("unchecked")
    private boolean peutPersonnaliser() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), DROIT_PERSO);
    }

    private String utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        Object u = s == null ? null : s.getAttribute(commonparameter.AIRTIME_USER);
        return u instanceof TUser ? ((TUser) u).getStrLOGIN() : "";
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
                .put("codes", codes()).put("personnaliser", peutPersonnaliser()).put("reglages", reglages)
                .put("zones", zones).put("monnaie", "CFA")
                .put("date", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yy")))
                .put("modeleCsv", Zone.fichierModele()).put("maxEtiquettes", MoteurEtiquettes.MAX_ETIQUETTES)
                .put("maxLignes", LecteurTableau.MAX_LIGNES));
    }

    /** Types de code proposes : les 3 habituels et les 2 codes etendus (hors vente). */
    static JSONArray codes() {
        return new JSONArray()
                .put(new JSONObject().put("id", LabelSheetPdf.CODE_BARRES).put("libelle", "Code-barres (CIP)"))
                .put(new JSONObject().put("id", LabelSheetPdf.DATAMATRIX).put("libelle", "DataMatrix GS1"))
                .put(new JSONObject().put("id", LabelSheetPdf.QR).put("libelle", "QR code GS1"))
                .put(new JSONObject().put("id", LabelSheetPdf.DATAMATRIX_PLUS).put("etendu", true).put("libelle",
                        "DataMatrix+ (étendu, hors vente)"))
                .put(new JSONObject().put("id", LabelSheetPdf.QR_PLUS).put("etendu", true).put("libelle",
                        "QR+ (étendu, hors vente)"));
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

    @EJB
    private rest.service.impl.EtiquetteTypeService typeService;

    /**
     * Retours du 11/10 : « selon le type de chaque produit » (option de l'ecran, cochee par defaut) : un CIP connu de
     * Prestige dont le type d'etiquette designe un code prend ce code ; les autres gardent le type choisi.
     */
    OptionsImpression typesDesProduits(OptionsImpression o, JSONObject d, List<LigneEtiquette> lignes) {
        JSONObject x = d.optJSONObject("options");
        if (x == null || !x.optBoolean("parProduit", false)) {
            return o;
        }
        List<String> cips = new ArrayList<>();
        for (LigneEtiquette l : lignes) {
            if (l.imprimable()) {
                cips.add(l.valeur(Zone.CIP));
            }
        }
        return o.parProduit(true, typeService.codesParCip(cips));
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
            List<LigneEtiquette> l = lignes(d);
            byte[] pdf = service.etiquetagePro(l, typesDesProduits(options(d), d, l), reportUtil::findParameterValue);
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

    /* --------------------------------------------------- personnalisation */

    /** Elements de la personnalisation (libelle, police de depart, lignes, possible dans le code). */
    static JSONArray elements() {
        JSONArray a = new JSONArray();
        for (etiquetagepro.disposition.ElementEtiquette e : etiquetagepro.disposition.ElementEtiquette.values()) {
            a.put(new JSONObject().put("id", e.name()).put("libelle", e.getLibelle()).put("police", e.getPoliceDefaut())
                    .put("lignes", e.getLignesMax()).put("dansLeCode", e.isPossibleDansLeCode())
                    .put("texte", e.estTexte()).put("gras", e.isGras()));
        }
        return a;
    }

    /**
     * Disposition qui sert aujourd'hui pour ce type et la planche choisie : enregistree, sinon reportee a l'echelle
     * d'une disposition enregistree du meme type (a recontroler), sinon la disposition proposee.
     */
    @POST
    @Path("disposition/charger")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response chargerDisposition(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        JSONObject d = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        OptionsImpression o = options(d);
        float[] dim = LabelSheetPdf.dimension(o.planche(reportUtil::findParameterValue));
        String type = o.getTypeCode();
        etiquetagepro.disposition.Disposition disp = service.dispositionEnregistree(type, dim[0], dim[1]);
        String source = "enregistree";
        String depuis = null;
        if (disp == null) {
            List<etiquetagepro.disposition.Disposition> autres = service.dispositionsDuType(type);
            if (!autres.isEmpty()) {
                disp = autres.get(0).aLEchelle(dim[0], dim[1]);
                source = "echelle";
                depuis = autres.get(0).getLargeur() + " x " + autres.get(0).getHauteur() + " mm";
            } else {
                disp = etiquetagepro.disposition.Disposition.parDefaut(type, dim[0], dim[1]);
                source = "proposee";
            }
        }
        boolean historique = !"enregistree".equals(source) && !disp.estEtendu();
        return json(new JSONObject().put("success", true).put("type", type).put("largeur", disp.getLargeur())
                .put("hauteur", disp.getHauteur()).put("source", source).put("depuis", depuis)
                .put("historique", historique).put("disposition", disp.json())
                .put("controle", etiquetagepro.disposition.ControleDisposition.controler(disp).json())
                .put("elements", elements()).put("personnaliser", peutPersonnaliser())
                .put("enregistrees", service.dispositionsEnregistrees())
                .put("marge", etiquetagepro.disposition.Disposition.MARGE));
    }

    /** Etiquette d'exemple (valeurs saisies a l'ecran ou produit choisi) pour l'apercu. */
    static LabelSheetPdf.LabelData exemple(JSONObject e, String type) {
        JSONObject x = e == null ? new JSONObject() : e;
        String cip = StringUtils.defaultIfBlank(x.optString("cip"), "3400930000014");
        String prix = x.has("prix") && !x.optString("prix").isEmpty() ? MoteurEtiquettes
                .prixAffiche(LigneEtiquette.lirePrix(x.optString("prix")), x.optString("monnaie", "CFA")) : "";
        LabelSheetPdf.LabelData l = new LabelSheetPdf.LabelData(x.optString("officine"), x.optString("grossiste"),
                x.optString("designation"), cip, prix, x.optString("date")).codeGeo(x.optString("codeGeo"))
                        .mention(x.optString("mention"));
        java.time.LocalDate per = LigneEtiquette.lireDate(x.optString("peremption"));
        String lot = StringUtils.trimToNull(x.optString("lot"));
        String brute = rest.report.pdf.Gs1.brute(x.optString("ean"), per, lot, cip);
        if (!LabelSheetPdf.CODE_BARRES.equals(type)) {
            l.codeEtendu(type, brute, lot, per == null ? null : per.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .codeUnique(StringUtils.defaultIfBlank(x.optString("codeUnique"), "AB2CD"));
        }
        return l;
    }

    /**
     * Controle d'une disposition en cours de modification, avec ce qu'il faut pour l'apercu reel : le texte de chaque
     * element et les modules du code pour l'etiquette d'exemple.
     */
    @POST
    @Path("disposition/controler")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response controlerDisposition(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        try {
            JSONObject d = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
            etiquetagepro.disposition.Disposition disp = etiquetagepro.disposition.Disposition
                    .lire(d.getJSONObject("disposition"));
            LabelSheetPdf.LabelData l = exemple(d.optJSONObject("exemple"), disp.getTypeCode());
            return json(rendu(disp, l));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Etiquettage Pro : controler la disposition", e);
            return json(echec("Disposition illisible."));
        }
    }

    /** Ce que rend le code au scan, lisible (separateur GS montre « <GS> »). */
    static String lisible(String type, String contenu) {
        if (contenu == null) {
            return "";
        }
        if (LabelSheetPdf.QR.equals(type) || LabelSheetPdf.DATAMATRIX.equals(type)) {
            return rest.report.pdf.Gs1.lisible(contenu);
        }
        return contenu.replace(String.valueOf(rest.report.pdf.Gs1.GS), "<GS>");
    }

    @POST
    @Path("disposition/enregistrer")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerDisposition(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        if (!peutPersonnaliser()) {
            return json(echec("Vous n'avez pas le droit de personnaliser les étiquettes.").put("interdit", true));
        }
        try {
            etiquetagepro.disposition.Disposition disp = etiquetagepro.disposition.Disposition
                    .lire(new JSONObject(corps).getJSONObject("disposition"));
            etiquetagepro.disposition.ControleDisposition.Resultat c = etiquetagepro.disposition.ControleDisposition
                    .controler(disp);
            if (!c.valide()) {
                return json(echec("Disposition non enregistrée : corrigez d'abord ce qui est signalé en rouge.")
                        .put("controle", c.json()));
            }
            service.enregistrerDisposition(disp, utilisateur());
            return json(new JSONObject().put("success", true).put("cle", disp.cle()).put("controle", c.json())
                    .put("msg", "Disposition enregistrée : elle sert désormais à toutes les impressions de ce type"
                            + " et de ce format."));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Etiquettage Pro : enregistrer la disposition", e);
            return json(echec("Disposition illisible."));
        }
    }

    @POST
    @Path("disposition/supprimer")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response supprimerDisposition(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        if (!peutPersonnaliser()) {
            return json(echec("Vous n'avez pas le droit de personnaliser les étiquettes.").put("interdit", true));
        }
        JSONObject d = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        boolean fait = service.supprimerDisposition(LabelSheetPdf.typeCodeEtendu(d.optString("type")),
                (float) d.optDouble("largeur", 0), (float) d.optDouble("hauteur", 0));
        return json(new JSONObject().put("success", true).put("supprimee", fait).put("msg", fait
                ? "Disposition d'origine rétablie pour ce type et ce format." : "Aucune disposition enregistrée."));
    }

    /** Ce qu'il faut pour dessiner une etiquette comme a l'impression : texte de chaque element et modules du code. */
    private static JSONObject rendu(etiquetagepro.disposition.Disposition disp, LabelSheetPdf.LabelData l) {
        JSONObject valeurs = new JSONObject(), mise = new JSONObject();
        for (Map.Entry<etiquetagepro.disposition.ElementEtiquette, String> v : l.valeurs().entrySet()) {
            valeurs.put(v.getKey().name(), StringUtils.defaultString(v.getValue()));
            etiquetagepro.disposition.Placement p = disp.placement(v.getKey());
            if (p != null && StringUtils.isNotBlank(v.getValue()) && p.getL() > 0 && p.getH() > 0) {
                mise.put(v.getKey().name(),
                        rest.report.pdf.RenduDisposition.miseEnPage(v.getKey().isGras(), v.getValue(), p));
            }
        }
        JSONObject symbole = new JSONObject();
        String contenu = l.contenuCode(disp);
        try {
            rest.report.pdf.Symbole s = rest.report.pdf.Symbole.de(disp.getTypeCode(), contenu);
            symbole.put("lignes", new JSONArray(s.lignes())).put("silence", s.getSilence())
                    .put("lineaire", s.isLineaire()).put("caracteres", StringUtils.length(contenu));
        } catch (IllegalArgumentException e) {
            symbole.put("erreur", "Contenu trop long pour ce code.");
        }
        return new JSONObject().put("success", true).put("disposition", disp.json())
                .put("controle", etiquetagepro.disposition.ControleDisposition.controler(disp).json())
                .put("valeurs", valeurs).put("mise", mise).put("symbole", symbole)
                .put("contenuLisible", lisible(disp.getTypeCode(), contenu));
    }

    /**
     * Retours du 13/10 (point 2) : exemple visuel de l'etiquette d'un produit, dans le detail de la fiche article. Type
     * d'etiquette du produit, disposition qui sert aujourd'hui (planche par defaut), donnees du produit. Lecture seule
     * ; il suffit d'etre connecte (ce sont les informations de la fiche que l'on consulte).
     */
    @GET
    @Path("apercu-produit/{id}")
    public Response apercuProduit(@javax.ws.rs.PathParam("id") String id) {
        HttpSession s = servletRequest.getSession(false);
        if (s == null || s.getAttribute(commonparameter.AIRTIME_USER) == null) {
            return json(echec(Constant.DECONNECTED_MESSAGE));
        }
        JSONObject produit = service.produitPourApercu(id);
        if (produit == null) {
            return json(echec("Produit introuvable."));
        }
        try {
            String type = LabelSheetPdf.typeCodeEtendu(produit.optString("typeCode"));
            OptionsImpression o = new OptionsImpression().typeCode(type);
            float[] dim = LabelSheetPdf.dimension(o.planche(reportUtil::findParameterValue));
            etiquetagepro.disposition.Disposition disp = service.dispositionEnregistree(type, dim[0], dim[1]);
            if (disp == null) {
                List<etiquetagepro.disposition.Disposition> autres = service.dispositionsDuType(type);
                disp = autres.isEmpty() ? etiquetagepro.disposition.Disposition.parDefaut(type, dim[0], dim[1])
                        : autres.get(0).aLEchelle(dim[0], dim[1]);
            }
            JSONObject x = new JSONObject().put("officine", StringUtils.defaultString(service.officine()))
                    .put("designation", produit.optString("designation")).put("cip", produit.optString("cip"))
                    .put("ean", produit.optString("ean")).put("prix", produit.optString("prix"))
                    .put("codeGeo", produit.optString("codeGeo")).put("grossiste", produit.optString("grossiste"))
                    .put("date", java.time.LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            return json(rendu(disp, exemple(x, disp.getTypeCode())).put("produit", produit).put("typeCode", type)
                    .put("elements", elements()));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Etiquettage Pro : apercu de l'etiquette d'un produit", e);
            return json(echec("Aperçu indisponible."));
        }
    }

    /** Page de test de la disposition : une etiquette d'exemple dessinee comme a l'impression (premiere case). */
    @POST
    @Path("disposition/pdf")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces({ "application/pdf", "text/html" })
    public Response pdfDisposition(@FormParam("donnees") String donnees) {
        JSONObject r = refus();
        if (r != null) {
            return page(r.optString("msg"));
        }
        try {
            JSONObject d = new JSONObject(StringUtils.defaultIfBlank(donnees, "{}"));
            etiquetagepro.disposition.Disposition disp = etiquetagepro.disposition.Disposition
                    .lire(d.getJSONObject("disposition"));
            OptionsImpression o = options(d);
            LabelSheetPdf.SheetFormat f = o.planche(reportUtil::findParameterValue);
            java.io.ByteArrayOutputStream sortie = new java.io.ByteArrayOutputStream();
            LabelSheetPdf.write(sortie,
                    java.util.Collections.singletonList(exemple(d.optJSONObject("exemple"), disp.getTypeCode())),
                    Math.max(1, o.getPositionDepart()), f, (t, l, h) -> disp);
            return Response.ok(sortie.toByteArray(), "application/pdf")
                    .header("Content-Disposition", disposition("etiquette_essai.pdf")).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Etiquettage Pro : essai de disposition", e);
            return page("Essai impossible : " + e.getMessage());
        }
    }

    /* ------------------------------------------------- lire une etiquette */

    /**
     * Lire une etiquette (hors vente) : code etendu (DataMatrix+, QR+) avec toutes ses informations, etiquette GS1
     * habituelle, ou simple CIP / EAN ; le produit de Prestige et les alertes (prix etiquete different du prix actuel,
     * peremption depassee ou proche, produit inconnu).
     */
    @GET
    @Path("lire-etiquette")
    public Response lireEtiquette(@javax.ws.rs.QueryParam("code") String code) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        if (StringUtils.isBlank(code)) {
            return json(echec("Scannez ou saisissez une étiquette."));
        }
        Map<String, String> infos = rest.report.pdf.ContenuEtendu.lire(code);
        String type;
        /* retour du 24/10 : code « peremption + lot » seul, sans le produit */
        rest.report.pdf.Gs1.Contenu decoupe = null;
        if (infos == null && !rest.report.pdf.Gs1.estGs1(code)) {
            /* separateur GS perdu par la douchette : la decoupe dont le CIP est un produit */
            for (rest.report.pdf.Gs1.Contenu x : rest.report.pdf.Gs1.sansSeparateur(code)) {
                if (service.produitPourLecture(x.cip) != null) {
                    decoupe = x;
                    break;
                }
            }
        }
        rest.report.pdf.Gs1.Contenu partiel = infos == null && decoupe == null ? rest.report.pdf.Gs1.sansProduit(code)
                : null;
        if (partiel != null) {
            infos = new LinkedHashMap<>();
            putSi(infos, rest.report.pdf.ContenuEtendu.LOT, partiel.lot);
            putSi(infos, rest.report.pdf.ContenuEtendu.PER, partiel.peremption == null ? null
                    : partiel.peremption.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            JSONObject o = new JSONObject().put("success", true).put("type", "GS1").put("venteAutorisee", true)
                    .put("infos", new JSONObject(infos)).put("produit", JSONObject.NULL).put("alertes", new JSONArray()
                            .put(String.format(Constant.MSG_GS1_SANS_PRODUIT, rest.report.pdf.Gs1.decrire(partiel))));
            return json(o);
        }
        if (infos != null) {
            type = infos.remove("TYPE");
        } else if (decoupe != null || rest.report.pdf.Gs1.estGs1(code)) {
            rest.report.pdf.Gs1.Contenu c = decoupe != null ? decoupe : rest.report.pdf.Gs1.lire(code);
            infos = new LinkedHashMap<>();
            putSi(infos, rest.report.pdf.ContenuEtendu.CIP, c.cip);
            putSi(infos, rest.report.pdf.ContenuEtendu.LOT, c.lot);
            putSi(infos, rest.report.pdf.ContenuEtendu.PER,
                    c.peremption == null ? null : c.peremption.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            putSi(infos, rest.report.pdf.ContenuEtendu.EAN, c.gtin == null ? null : rest.report.pdf.Gs1.ean13(c.gtin));
            type = "GS1";
        } else {
            infos = new LinkedHashMap<>();
            infos.put(rest.report.pdf.ContenuEtendu.CIP, code.trim());
            type = "CIP";
        }
        JSONObject produit = service.produitPourLecture(infos.get(rest.report.pdf.ContenuEtendu.CIP));
        if (produit == null && infos.containsKey(rest.report.pdf.ContenuEtendu.EAN)) {
            produit = service.produitPourLecture(infos.get(rest.report.pdf.ContenuEtendu.EAN));
        }
        JSONArray alertes = new JSONArray();
        if (produit == null) {
            alertes.put("Produit inconnu dans Prestige (CIP "
                    + StringUtils.defaultString(infos.get(rest.report.pdf.ContenuEtendu.CIP), "-") + ").");
        } else {
            String prixCode = infos.get(rest.report.pdf.ContenuEtendu.PRIX);
            if (prixCode != null) {
                try {
                    long etiquete = new java.math.BigDecimal(prixCode).longValue();
                    long actuel = produit.optLong("prix");
                    if (etiquete != actuel) {
                        alertes.put("Prix étiqueté "
                                + MoteurEtiquettes.prixAffiche(java.math.BigDecimal.valueOf(etiquete), "")
                                + ", prix actuel "
                                + MoteurEtiquettes.prixAffiche(java.math.BigDecimal.valueOf(actuel), "")
                                + " : étiquette à refaire.");
                    }
                } catch (NumberFormatException e) {
                    alertes.put("Prix illisible dans le code.");
                }
            }
        }
        java.time.LocalDate per = LigneEtiquette
                .lireDate(StringUtils.defaultString(infos.get(rest.report.pdf.ContenuEtendu.PER)));
        if (per != null) {
            if (per.isBefore(LocalDate.now())) {
                alertes.put("Lot périmé depuis le " + infos.get(rest.report.pdf.ContenuEtendu.PER) + ".");
            } else if (!per.isAfter(LocalDate.now().plusMonths(3))) {
                alertes.put("Péremption proche : " + infos.get(rest.report.pdf.ContenuEtendu.PER) + ".");
            }
        }
        return json(new JSONObject().put("success", true).put("type", type).put("infos", new JSONObject(infos))
                .put("produit", produit == null ? JSONObject.NULL : produit).put("alertes", alertes)
                .put("venteAutorisee", !"DATAMATRIX+".equals(type) && !"QR+".equals(type)));
    }

    private static void putSi(Map<String, String> m, String cle, String v) {
        if (StringUtils.isNotBlank(v)) {
            m.put(cle, v);
        }
    }

    /* ------------------------------------------------- types d'etiquette */

    static final String DROIT_TYPE = "P_SM_ETIQUETTE_TYPE";

    @SuppressWarnings("unchecked")
    private boolean peutAffecter() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils
                .hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), DROIT_TYPE);
    }

    private JSONObject refusType() {
        JSONObject r = refus();
        if (r != null) {
            return r;
        }
        return peutAffecter() ? null
                : echec("Vous n'avez pas le droit de modifier les types d'étiquette.").put("interdit", true);
    }

    /** Types d'etiquette, listes des filtres, dernieres mises a jour. */
    @GET
    @Path("types")
    public Response types() {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(new JSONObject().put("success", true).put("types", typeService.types())
                .put("filtres", typeService.filtres()).put("journal", typeService.journal(10))
                .put("peutAffecter", peutAffecter()).put("codes", codes()));
    }

    @POST
    @Path("types/enregistrer")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerType(String corps) {
        JSONObject r = refusType();
        if (r != null) {
            return json(r);
        }
        JSONObject d = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        try {
            String id = d.optString("id");
            if (StringUtils.isBlank(id)) {
                id = typeService.creerType(d.optString("nom"), d.optString("description"), d.optString("code"));
            } else {
                typeService.modifierType(id, d.optString("nom"), d.optString("description"), d.optString("code"),
                        d.optBoolean("actif", true));
            }
            return json(new JSONObject().put("success", true).put("id", id).put("msg", "Type d'étiquette enregistré."));
        } catch (IllegalArgumentException e) {
            return json(echec(e.getMessage()));
        } catch (javax.ejb.EJBException e) {
            Throwable c = e.getCause();
            if (c instanceof IllegalArgumentException) {
                return json(echec(c.getMessage()));
            }
            throw e;
        }
    }

    /** Produits du filtre (mise a jour selective), page par page. */
    @POST
    @Path("types/produits")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response produitsDuFiltre(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        JSONObject d = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        JSONObject f = d.optJSONObject("filtres");
        return json(typeService.produits(f == null ? new JSONObject() : f, d.optInt("start", 0), d.optInt("limit", 50))
                .put("success", true));
    }

    /** Mise a jour selective : produits coches, ou tout le filtre. */
    @POST
    @Path("types/affecter")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response affecter(String corps) {
        JSONObject r = refusType();
        if (r != null) {
            return json(r);
        }
        JSONObject d = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        List<String> produits = new ArrayList<>();
        JSONArray a = d.optJSONArray("produits");
        for (int i = 0; a != null && i < a.length(); i++) {
            produits.add(a.optString(i));
        }
        try {
            JSONObject res = typeService.affecter(d.optString("type"), produits,
                    d.optBoolean("toutLeFiltre") ? d.optJSONObject("filtres") : null, utilisateur());
            return json(res.put("success", true).put("msg", res.getInt("modifies") + " produit(s) mis à jour."));
        } catch (IllegalArgumentException e) {
            return json(echec(e.getMessage()));
        } catch (javax.ejb.EJBException e) {
            if (e.getCause() instanceof IllegalArgumentException) {
                return json(echec(e.getCause().getMessage()));
            }
            throw e;
        }
    }

    @POST
    @Path("types/annuler")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response annulerAffectation(String corps) {
        JSONObject r = refusType();
        if (r != null) {
            return json(r);
        }
        try {
            int n = typeService.annuler(new JSONObject(StringUtils.defaultIfBlank(corps, "{}")).optString("lot"));
            return json(new JSONObject().put("success", true).put("remis", n).put("msg",
                    n + " produit(s) remis sur leur type d'avant."));
        } catch (IllegalArgumentException e) {
            return json(echec(e.getMessage()));
        } catch (javax.ejb.EJBException e) {
            if (e.getCause() instanceof IllegalArgumentException) {
                return json(echec(e.getCause().getMessage()));
            }
            throw e;
        }
    }

    /* ------------------------------------ apercu des impressions de Prestige */

    static final String[] CLES_APERCU = { LabelSheetPdf.KEY_NB_COLONNES, LabelSheetPdf.KEY_NB_LIGNES,
            LabelSheetPdf.KEY_LARGEUR_MM, LabelSheetPdf.KEY_HAUTEUR_MM, LabelSheetPdf.KEY_ESPACE_H_MM,
            LabelSheetPdf.KEY_ESPACE_V_MM, LabelSheetPdf.KEY_MARGE_GAUCHE_MM, LabelSheetPdf.KEY_MARGE_HAUT_MM,
            LabelSheetPdf.KEY_DECALAGE_X_MM, LabelSheetPdf.KEY_DECALAGE_Y_MM, LabelSheetPdf.KEY_ECHELLE_POURCENT };

    /** Reglages d'impression de Prestige (parametres), en visuel ; peut-on les enregistrer (administrateur). */
    @GET
    @Path("impression/reglages")
    public Response reglagesPrestige() {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        JSONObject reglages = new JSONObject();
        for (String k : CLES_APERCU) {
            reglages.put(k, StringUtils.defaultString(reportUtil.findParameterValue(k)));
        }
        String modele = StringUtils.defaultIfBlank(reportUtil.findParameterValue(LabelSheetPdf.KEY_MODELE),
                LabelSheetPdf.MODELE_CARRE_38X21_2).toUpperCase();
        return json(new JSONObject().put("success", true)
                .put("code", LabelSheetPdf.typeCode(reportUtil.findParameterValue("KEY_ETIQUETTE_CODE")))
                .put("parProduit",
                        !"0".equals(StringUtils
                                .trimToEmpty(reportUtil.findParameterValue("KEY_ETIQUETTE_CODE_PAR_PRODUIT"))))
                .put("modele", modele).put("reglages", reglages)
                .put("telechargement", "1".equals(reportUtil.findParameterValue("KEY_ETIQUETTE_TELECHARGEMENT")))
                .put("officine", StringUtils.defaultString(service.officine()))
                .put("date", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yy")))
                .put("peutEnregistrer", peutPersonnaliser()));
    }

    /** Enregistre les reglages de l'apercu comme reglages par defaut de Prestige (administrateur). */
    @POST
    @Path("impression/reglages/enregistrer")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerReglagesPrestige(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        if (!peutPersonnaliser()) {
            return json(echec("Seul l'administrateur enregistre les réglages par défaut.").put("interdit", true));
        }
        JSONObject d = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        String code = LabelSheetPdf.typeCode(d.optString("code"));
        String modele = d.optString("modele");
        boolean modeleConnu = false;
        for (String m : new String[] { LabelSheetPdf.MODELE_CARRE_38X21_2, LabelSheetPdf.MODELE_CARRE_38_1X21_2,
                LabelSheetPdf.MODELE_ARRONDI_38X21, LabelSheetPdf.MODELE_PERSONNALISE }) {
            modeleConnu |= m.equals(modele);
        }
        if (!modeleConnu) {
            return json(echec("Planche inconnue."));
        }
        JSONObject reglages = d.optJSONObject("reglages");
        java.util.Map<String, String> valeurs = new LinkedHashMap<>();
        for (String k : CLES_APERCU) {
            String v = reglages == null || reglages.isNull(k) ? ""
                    : String.valueOf(reglages.opt(k)).trim().replace(',', '.');
            if (!v.isEmpty() && !v.matches("-?\\d+(\\.\\d+)?")) {
                return json(echec("Valeur illisible pour " + k + " : " + v));
            }
            valeurs.put(k, v);
        }
        service.ecrireParametre("KEY_ETIQUETTE_CODE", code, "Code des etiquettes par defaut (CODE128, QR, DATAMATRIX)");
        service.ecrireParametre("KEY_ETIQUETTE_CODE_PAR_PRODUIT", d.optBoolean("parProduit", true) ? "1" : "0",
                "Etiquettes : imprimer selon le type d'etiquette de chaque produit (1) ou le code choisi (0)");
        service.ecrireParametre(LabelSheetPdf.KEY_MODELE, modele, "Modele de planche d'etiquettes");
        for (java.util.Map.Entry<String, String> e : valeurs.entrySet()) {
            service.ecrireParametre(e.getKey(), e.getValue(), "Reglage des planches d'etiquettes");
        }
        return json(new JSONObject().put("success", true).put("msg",
                "Réglages enregistrés : ils servent désormais à toutes les impressions d'étiquettes de Prestige."));
    }

    /** Source de l'apercu : etiquettes par type (selon les types des produits ou le code choisi) et planches. */
    @POST
    @Path("impression/resume")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response resumeImpression(String corps) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        JSONObject d = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        String source = d.optString("source", "PANIER");
        java.util.Map<String, Integer> parProduit = service.etiquettesParProduit(source, d.optString("id"));
        String code = LabelSheetPdf.typeCode(d.optString("code"));
        java.util.Map<String, String> codes = d.optBoolean("parProduit", true)
                ? typeService.codesDesProduits(parProduit.keySet()) : new java.util.HashMap<>();
        JSONObject parType = new JSONObject();
        int total = 0;
        for (java.util.Map.Entry<String, Integer> e : parProduit.entrySet()) {
            String t = codes.getOrDefault(e.getKey(), code);
            parType.put(t, parType.optInt(t) + e.getValue());
            total += e.getValue();
        }
        return json(new JSONObject().put("success", true).put("total", total).put("produits", parProduit.size())
                .put("parType", parType).put("bons", "BL".equals(source) && StringUtils.isBlank(d.optString("id"))
                        ? service.bonsPourEtiquettes(d.optString("recherche")) : new JSONArray()));
    }

    /** Bons de livraison (recents ou par reference) pour l'apercu. */
    @GET
    @Path("impression/bons")
    public Response bons(@javax.ws.rs.QueryParam("recherche") String recherche) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(new JSONObject().put("success", true).put("bons", service.bonsPourEtiquettes(recherche)));
    }
}
