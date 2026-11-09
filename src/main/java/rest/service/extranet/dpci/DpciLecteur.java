package rest.service.extranet.dpci;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.ParcoursDataTables;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.commun.TransportExtranet.Attendu;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Lecture de l'extranet DPCI (releve du 08/11), GET seulement. Les listes viennent d'appels JSON .action ; sans
 * session, ces appels repondent 500 (pas de redirection) : la page HTML de la rubrique est donc lue d'abord, elle
 * redirige vers /login quand la session est perdue, ce qui declenche la reconnexion du transport avant toute lecture
 * JSON.
 *
 * Aucune commande, aucun panier, aucune reclamation n'est envoye : seules les listes sont lues. Aucune valeur n'est
 * journalisee.
 */
public final class DpciLecteur {

    public static final String PAGE_OFFRES = "/offres";
    public static final String PAGE_COMMANDES = "/commandes";
    public static final String PAGE_DOCUMENTS = "/geide";
    public static final String PAGE_RECLAMATIONS = "/reclamations";
    public static final String OFFRES = "/module/offre/AllListOffres.action";
    public static final String OFFRE = "/module/offre/GetOffre.action";
    public static final String COMMANDES = "/module/commande/ListCommandes.action";
    public static final String DOCUMENTS = "/module/geide/ListDocuments.action";
    public static final String RECLAMATIONS = "/module/reclamation/DonneListReclamationClient.action";
    /** Profondeur lue pour les commandes, documents et reclamations. */
    static final int JOURS = 365;
    static final int TAILLE_PAGE = 100;
    static final int PAGES_MAX = 200;
    static final int OFFRES_MAX = 400;
    static final int LIGNES_MAX = 40000;
    static final int LONGUEUR_CELLULE = 1000;
    /** GetOffre repond « loading » le temps de preparer l'offre : quelques relectures, une seconde d'ecart. */
    static final int ESSAIS_OFFRE = 8;
    static final Pattern CIP = Pattern.compile("\\d{7,14}");

    /** Pause entre deux relectures d'une offre en preparation (0 dans les tests). */
    static volatile long attenteOffreMs = 1000;

    private DpciLecteur() {
    }

    public static List<Ligne> lire(TransportExtranet t, ListeDpci l) throws ExtranetException {
        return lire(t, l, LocalDate.now());
    }

    /** Sans periode (rafraichissement automatique) : offres en cours le jour donne, le reste sur un an. */
    static List<Ligne> lire(TransportExtranet t, ListeDpci l, LocalDate jour) throws ExtranetException {
        return l == ListeDpci.DPCI_OFFRES ? lire(t, l, jour, jour) : lire(t, l, jour.minusDays(JOURS), jour);
    }

    /**
     * Periode choisie a l'ecran (demande du 08/11 : le jour par defaut, au lieu d'un an) : DPCI ne renvoie que les
     * commandes, documents et reclamations de la periode ; offres en cours pendant la periode.
     */
    public static List<Ligne> lire(TransportExtranet t, ListeDpci l, LocalDate du, LocalDate au)
            throws ExtranetException {
        if (t == null || l == null || du == null || au == null || du.isAfter(au)) {
            throw new IllegalArgumentException("transport, liste et periode (du <= au) attendus");
        }
        switch (l) {
        case DPCI_OFFRES:
            return offres(t, du, au);
        case DPCI_COMMANDES:
            return commandes(t, du, au);
        case DPCI_RECLAMATIONS:
            return reclamations(t, du, au);
        default:
            return documents(t, l, du, au);
        }
    }

    /* ============================================================ offres */

    static List<Ligne> offres(TransportExtranet t, LocalDate du, LocalDate au) throws ExtranetException {
        t.lire(PAGE_OFFRES, null, Attendu.HTML, null);
        JSONObject r = json(t, OFFRES, null, PAGE_OFFRES);
        JSONArray offres = r.optJSONArray("allOffresList");
        if (offres == null) {
            throw inattendu("liste des offres absente");
        }
        List<Ligne> lignes = new ArrayList<>();
        int lues = 0;
        for (int i = 0; i < offres.length() && lues < OFFRES_MAX; i++) {
            JSONObject o = offres.optJSONObject(i);
            if (o == null) {
                throw inattendu("offre " + (i + 1) + " illisible");
            }
            JSONObject part = o.optJSONObject("partenariat");
            JSONObject remise = o.optJSONObject("remise");
            if (part == null || remise == null) {
                throw inattendu("offre " + (i + 1) + " sans partenariat ni remise");
            }
            String debut = date(remise.opt("dateDebut")), fin = date(remise.opt("dateFin"));
            if (!enCours(debut, fin, du, au)) {
                continue;
            }
            lues++;
            String nom = premier(texte(o.opt("libelleRemise")), texte(remise.opt("libelleMarketing")),
                    texte(remise.opt("libelle")), texte(part.opt("libelle")));
            String labo = libelle(part.opt("laboratoire"));
            Map<String, String> q = new LinkedHashMap<>();
            q.put("codeSociete", libelleOuCode(part.opt("societe"), "code"));
            q.put("idPartenariat", texte(part.opt("code")));
            q.put("numeroRemise", texte(remise.opt("numero")));
            JSONArray l = offre(t, q).optJSONArray("offreLigneList");
            if (l == null) {
                throw inattendu("offre « " + nom + " » sans liste de produits");
            }
            for (int k = 0; k < l.length(); k++) {
                JSONObject x = l.optJSONObject(k);
                JSONObject p = x == null ? null : x.optJSONObject("produit");
                if (p == null) {
                    throw inattendu("offre « " + nom + " » : produit " + (k + 1) + " illisible");
                }
                if (lignes.size() >= LIGNES_MAX) {
                    return lignes;
                }
                String code = premier(texte(p.opt("code")), texte(x.opt("codeProduit")));
                String facture = texte(p.opt("codeFacture"));
                lignes.add(ligne(lignes.size(), code,
                        CIP.matcher(facture).matches() ? facture : CIP.matcher(code).matches() ? code : null,
                        Arrays.asList(nom, labo, debut, fin, texte(p.opt("libelle")), code, facture,
                                paliers(x.optJSONArray("palierOffreViews")))));
            }
        }
        return lignes;
    }

    /** Detail d'une offre ; relu tant que DPCI le prepare (« loading »), dans la limite des essais. */
    static JSONObject offre(TransportExtranet t, Map<String, String> q) throws ExtranetException {
        for (int e = 0; e < ESSAIS_OFFRE; e++) {
            JSONObject v = json(t, OFFRE, q, PAGE_OFFRES).optJSONObject("offreVue");
            if (v == null) {
                throw inattendu("détail d'offre sans « offreVue »");
            }
            if (!v.optBoolean("loading")) {
                return v;
            }
            pause();
        }
        throw new ExtranetException(ExtranetException.Nature.TRANSPORT,
                "Offre toujours en préparation chez DPCI après " + ESSAIS_OFFRE + " essais : à relancer");
    }

    /** Offre en cours le jour donne : commencee (ou sans debut) et non finie (ou sans fin). */
    static boolean enCours(String debut, String fin, LocalDate jour) {
        return enCours(debut, fin, jour, jour);
    }

    /** Offre en cours pendant la periode : commencee au plus tard le dernier jour, finie au plus tot le premier. */
    static boolean enCours(String debut, String fin, LocalDate du, LocalDate au) {
        return (debut.isEmpty() || debut.substring(0, Math.min(10, debut.length())).compareTo(au.toString()) <= 0)
                && (fin.isEmpty() || fin.substring(0, Math.min(10, fin.length())).compareTo(du.toString()) >= 0);
    }

    /**
     * Paliers d'une ligne d'offre, du plus petit au plus grand : « 25 à 49 : 2 UG ; dès 200 : 50 UG ; dès 10 : 5 % ».
     * Un palier sans avantage n'est pas montre.
     */
    static String paliers(JSONArray a) {
        if (a == null) {
            return "";
        }
        List<JSONObject> ps = new ArrayList<>();
        for (int i = 0; i < a.length(); i++) {
            JSONObject p = a.optJSONObject(i);
            if (p != null) {
                ps.add(p);
            }
        }
        ps.sort(Comparator.comparing((JSONObject p) -> nombre(p.opt("palier1")))
                .thenComparing(p -> nombre(p.opt("palier2"))));
        List<String> r = new ArrayList<>();
        for (JSONObject p : ps) {
            List<String> av = new ArrayList<>();
            BigDecimal ug = nombre(p.opt("uniteGratuite")), taux = nombre(p.opt("tauxRemise")),
                    mt = nombre(p.opt("montantRemise"));
            if (ug.signum() > 0) {
                av.add(simple(ug) + " UG");
            }
            if (taux.signum() > 0) {
                av.add(simple(taux) + " %");
            }
            if (mt.signum() > 0) {
                av.add(simple(mt) + " F");
            }
            if (av.isEmpty()) {
                continue;
            }
            BigDecimal p1 = nombre(p.opt("palier1")), p2 = nombre(p.opt("palier2"));
            String op = texte(p.opt("operateur")).toUpperCase();
            String seuil = "ENTRE".equals(op) && p2.signum() > 0 ? simple(p1) + " à " + simple(p2)
                    : op.startsWith(">") || p2.signum() == 0 ? "dès " + simple(p1) : simple(p1) + " à " + simple(p2);
            r.add(seuil + " : " + String.join(" + ", av));
        }
        return String.join(" ; ", r);
    }

    /* ============================================================ commandes */

    static List<Ligne> commandes(TransportExtranet t, LocalDate du, LocalDate au) throws ExtranetException {
        t.lire(PAGE_COMMANDES, null, Attendu.HTML, null);
        List<Ligne> lignes = new ArrayList<>();
        ParcoursDataTables.parcourir((start, length, draw) -> {
            Map<String, String> q = dataTables(start, length, draw, "date", "date_commande");
            q.put("dateDebut", du.toString());
            q.put("dateFin", au.toString());
            JSONObject r = json(t, COMMANDES, q, PAGE_COMMANDES);
            JSONObject d = r.optJSONObject("data");
            JSONArray c = d == null ? null : d.optJSONArray("commandes");
            if (c == null) {
                throw inattendu("liste des commandes absente");
            }
            JSONArray rangs = new JSONArray();
            for (int i = 0; i < c.length(); i++) {
                JSONObject x = c.optJSONObject(i);
                if (x == null) {
                    throw inattendu("commande illisible");
                }
                JSONObject etat = x.optJSONObject("etat"), type = x.optJSONObject("type"),
                        tot = x.optJSONObject("totaux"), soc = x.optJSONObject("societe");
                String num = texte(x.opt("numeroCommande")), ind = texte(x.opt("indiceCommande"));
                rangs.put(new JSONArray(Arrays.asList(dateHeure(x.opt("date")), num + (ind.isEmpty() ? "" : "-" + ind),
                        texte(x.opt("referenceCommandeClient")), libelleType(type),
                        soc == null ? "" : libelle(soc.opt("agence")), libelle(etat),
                        etat == null ? "" : date(etat.opt("date")),
                        tot == null ? "" : simple(nombre(tot.opt("nombreLignes"))),
                        tot == null ? "" : simple(nombre(tot.opt("quantite"))))));
            }
            return enveloppe(r, rangs);
        }, TAILLE_PAGE, PAGES_MAX, (pos, cel) -> lignes.add(ligne(pos, null, null, cellules(cel))));
        return lignes;
    }

    /* ============================================================ documents */

    static List<Ligne> documents(TransportExtranet t, ListeDpci l, LocalDate du, LocalDate au)
            throws ExtranetException {
        Map<String, String> page = new LinkedHashMap<>();
        page.put("typeDocument", l.typeDocument);
        Map<String, String> champs = formulaireDocuments(t.lire(PAGE_DOCUMENTS, page, Attendu.HTML, null).texte());
        if (champs == null) {
            throw inattendu("formulaire de recherche des documents introuvable sur la page " + l.typeDocument);
        }
        String referer = PAGE_DOCUMENTS;
        List<Ligne> lignes = new ArrayList<>();
        List<Map<String, String>> documents = new ArrayList<>();
        ParcoursDataTables.parcourir((start, length, draw) -> {
            Map<String, String> q = dataTables(start, length, draw, "fieldMap.DATE_DOCUMENT.value", "DATE_DOCUMENT");
            q.putAll(champs);
            q.put("docuware_debut-DATE_DOCUMENT", du.toString());
            q.put("docuware_fin-DATE_DOCUMENT", au.toString());
            JSONObject r = json(t, DOCUMENTS, q, referer);
            JSONObject d = r.optJSONObject("data");
            JSONArray items = d == null ? null : d.optJSONArray("itemList");
            if (items == null) {
                throw inattendu("liste des documents absente");
            }
            JSONArray rangs = new JSONArray();
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.optJSONObject(i);
                JSONObject f = it == null ? null : it.optJSONObject("fieldMap");
                if (f == null) {
                    throw inattendu("document illisible");
                }
                rangs.put(new JSONArray(celluleDocument(l, f)));
                documents.add(documentFacture(l, f));
            }
            return enveloppe(r, rangs);
        }, TAILLE_PAGE, PAGES_MAX, (pos, cel) -> {
            Ligne x = ligne(pos, null, null, cellules(cel));
            lignes.add(new Ligne(x.position, x.agence, x.pscode, x.cip, x.cellules,
                    pos < documents.size() ? documents.get(pos) : null));
        });
        return lignes;
    }

    static List<String> celluleDocument(ListeDpci l, JSONObject f) {
        String date = date(champ(f, "DATE_DOCUMENT"));
        switch (l) {
        case DPCI_BL:
            return Arrays.asList(date, texte(champ(f, "NUMERO_BL")), texte(champ(f, "NUMERO_COMMANDE")),
                    texte(champ(f, "NUMERO_FACTURE")),
                    premier(texte(champ(f, "LIBELLE_AGENCE")), texte(champ(f, "CODE_AGENCE"))));
        case DPCI_RELEVES:
            return Arrays.asList(date, premier(texte(champ(f, "NUMERO_RELEVE")), texte(champ(f, "NOM_DOCUMENT"))));
        default:
            return Arrays.asList(date, premier(texte(champ(f, "NUMERO_FACTURE")), texte(champ(f, "NOM_DOCUMENT"))),
                    texte(champ(f, "NUMERO_COMMANDE")), texte(champ(f, "NUMERO_BL")), texte(champ(f, "NUMERO_RELEVE")),
                    montant(champ(f, "MONTANT_HT")), montant(champ(f, "MONTANT_TTC")));
        }
    }

    /**
     * Demande du 09/11, point 4 : facture DPCI, references de l'export CSV de l'extranet (numero de facture coche, date
     * du document) ; null hors factures ou si une reference manque.
     */
    static Map<String, String> documentFacture(ListeDpci l, JSONObject f) {
        if (l != ListeDpci.DPCI_FACTURES) {
            return null;
        }
        String id = rest.service.extranet.commun.FichiersExtranet.reference(texte(champ(f, "NUMERO_FACTURE")));
        String date = date(champ(f, "DATE_DOCUMENT"));
        if (id == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return null;
        }
        Map<String, String> d = new LinkedHashMap<>();
        d.put("id", id);
        d.put("date", date);
        return d;
    }

    static Object champ(JSONObject fieldMap, String nom) {
        JSONObject c = fieldMap.optJSONObject(nom);
        return c == null ? null : c.opt("value");
    }

    /**
     * Champs du formulaire de recherche des documents (action ListDocuments.action) tels que la page les porte : type,
     * etablissement, compte « %compteConnecte% »... Les dates sont fixees ensuite par Prestige. Null : pas de
     * formulaire.
     */
    static Map<String, String> formulaireDocuments(String html) {
        Element form = Jsoup.parse(html == null ? "" : html).selectFirst("form[action*=ListDocuments]");
        if (form == null) {
            return null;
        }
        Map<String, String> m = new LinkedHashMap<>();
        for (Element e : form.select("input[name], select[name]")) {
            String type = e.attr("type").toLowerCase();
            if (type.equals("checkbox") || type.equals("radio") || type.equals("submit") || type.equals("button")
                    || type.equals("password")) {
                continue;
            }
            String v = e.tagName().equals("select")
                    ? (e.selectFirst("option[selected]") != null ? e.selectFirst("option[selected]").attr("value") : "")
                    : e.attr("value");
            m.put(e.attr("name"), v);
        }
        return m;
    }

    /* ============================================================ reclamations */

    static List<Ligne> reclamations(TransportExtranet t, LocalDate du, LocalDate au) throws ExtranetException {
        t.lire(PAGE_RECLAMATIONS, null, Attendu.HTML, null);
        List<Ligne> lignes = new ArrayList<>();
        ParcoursDataTables.parcourir((start, length, draw) -> {
            Map<String, String> q = dataTables(start, length, draw, "id", "REC_ID");
            q.put("idReclamation", "");
            q.put("idCommande", "");
            q.put("dateDebut", du.toString());
            q.put("dateFin", au.toString());
            JSONObject r = json(t, RECLAMATIONS, q, PAGE_RECLAMATIONS);
            JSONArray d = r.optJSONArray("data");
            if (d == null) {
                throw inattendu("liste des réclamations absente");
            }
            JSONArray rangs = new JSONArray();
            for (int i = 0; i < d.length(); i++) {
                JSONObject x = d.optJSONObject(i);
                if (x == null) {
                    throw inattendu("réclamation illisible");
                }
                JSONObject soc = x.optJSONObject("societe");
                rangs.put(new JSONArray(Arrays.asList(texte(x.opt("id")), texte(x.opt("idCommande")),
                        soc == null ? "" : libelle(soc.opt("agence")), libelle(x.opt("statut")),
                        dateHeure(x.opt("dateCreation")), dateHeure(x.opt("dateModif")))));
            }
            return enveloppe(r, rangs);
        }, TAILLE_PAGE, PAGES_MAX, (pos, cel) -> lignes.add(ligne(pos, null, null, cellules(cel))));
        return lignes;
    }

    /* ============================================================ outils */

    static Map<String, String> dataTables(int start, int length, int draw, String donnee, String nom) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("draw", String.valueOf(draw));
        q.put("columns[0][data]", donnee);
        q.put("columns[0][name]", nom);
        q.put("order[0][column]", "0");
        q.put("order[0][dir]", "desc");
        q.put("start", String.valueOf(start));
        q.put("length", String.valueOf(length));
        q.put("search[value]", "");
        return q;
    }

    /** Enveloppe DataTables pour le parcours commun : total de DPCI, lignes deja mises en cellules. */
    static JSONObject enveloppe(JSONObject r, JSONArray rangs) throws ExtranetException {
        if (!r.has("recordsTotal")) {
            throw inattendu("total absent");
        }
        return new JSONObject().put("recordsTotal", r.opt("recordsTotal"))
                .put("recordsFiltered", r.has("recordsFiltered") ? r.opt("recordsFiltered") : r.opt("recordsTotal"))
                .put("data", rangs);
    }

    static JSONObject json(TransportExtranet t, String chemin, Map<String, String> q, String referer)
            throws ExtranetException {
        String s = t.lire(chemin, q, Attendu.JSON, referer).texte();
        try {
            return new JSONObject(s);
        } catch (JSONException e) {
            throw inattendu("JSON illisible sur " + chemin);
        }
    }

    static Ligne ligne(int position, String pscode, String cip, List<String> cellules) {
        List<String> c = new ArrayList<>();
        for (String s : cellules) {
            String v = s == null ? "" : s;
            c.add(v.length() > LONGUEUR_CELLULE ? v.substring(0, LONGUEUR_CELLULE) : v);
        }
        String ps = pscode == null || pscode.isEmpty() ? null : pscode.length() > 40 ? pscode.substring(0, 40) : pscode;
        return new Ligne(position, null, ps, cip, c);
    }

    static List<String> cellules(JSONArray a) {
        List<String> c = new ArrayList<>();
        for (int i = 0; i < a.length(); i++) {
            c.add(a.optString(i, ""));
        }
        return c;
    }

    static String texte(Object o) {
        if (o == null || o == JSONObject.NULL) {
            return "";
        }
        if (o instanceof Number) {
            return simple(nombre(o));
        }
        return o.toString().replaceAll("[\\p{Cntrl}]", " ").replaceAll("\\s+", " ").trim();
    }

    /** Libelle d'un objet {code, libelle} (ou le texte lui-meme). */
    static String libelle(Object o) {
        if (o instanceof JSONObject) {
            JSONObject j = (JSONObject) o;
            return premier(texte(j.opt("libelle")), texte(j.opt("code")));
        }
        return texte(o);
    }

    static String libelleOuCode(Object o, String cle) {
        return o instanceof JSONObject ? texte(((JSONObject) o).opt(cle)) : texte(o);
    }

    static String libelleType(JSONObject type) {
        if (type == null) {
            return "";
        }
        String s = libelle(type), sous = libelle(type.opt("sousType"));
        return sous.isEmpty() || sous.equals(s) ? s : s + " (" + sous + ")";
    }

    static String premier(String... v) {
        for (String s : v) {
            if (s != null && !s.isEmpty()) {
                return s;
            }
        }
        return "";
    }

    /** « 2026-11-07T00:00:00 » : 2026-11-07. */
    static String date(Object o) {
        String s = texte(o);
        return s.length() >= 10 && s.charAt(4) == '-' ? s.substring(0, 10) : s;
    }

    /** « 2026-11-07T21:08:42 » : 2026-11-07 21:08 ; minuit seul : la date. */
    static String dateHeure(Object o) {
        String s = texte(o);
        if (s.length() >= 16 && s.charAt(4) == '-' && s.charAt(10) == 'T') {
            String h = s.substring(11, 16);
            return s.substring(0, 10) + ("00:00".equals(h) ? "" : " " + h);
        }
        return date(s);
    }

    static BigDecimal nombre(Object o) {
        if (o == null || o == JSONObject.NULL) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(o.toString().trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    /** Montant tel que l'ecran le met en forme (« 55260 », « -10212.5 ») ; vide si absent. */
    static String montant(Object o) {
        if (o == null || o == JSONObject.NULL || texte(o).isEmpty()) {
            return "";
        }
        return simple(nombre(o));
    }

    static String simple(BigDecimal b) {
        BigDecimal s = b.stripTrailingZeros();
        return (s.scale() < 0 ? s.setScale(0) : s).toPlainString();
    }

    private static void pause() throws ExtranetException {
        long ms = attenteOffreMs;
        if (ms <= 0) {
            return;
        }
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ExtranetException(ExtranetException.Nature.TRANSPORT, "Appel interrompu", e);
        }
    }

    private static ExtranetException inattendu(String m) {
        return new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "DPCI : " + m);
    }
}
