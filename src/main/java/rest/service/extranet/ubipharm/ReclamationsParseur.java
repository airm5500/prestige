package rest.service.extranet.ubipharm;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.Elements;
import org.jsoup.select.NodeTraversor;
import org.jsoup.select.NodeVisitor;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.Normalisation;
import rest.service.extranet.commun.ParcoursDataTables;

/**
 * Lecture des reclamations Ubipharm (plan du 07/11, §7, §8, §17). Aucun appel reseau ici ; jsoup n'execute aucun
 * script.
 *
 * <p>
 * <b>Liste</b> : enveloppe DataTables, six cellules par ligne (0 lien de detail en HTML, 1 reference, 2 numeros
 * associes, 3 statut, 4 date d'envoi, 5 date de mise a jour). La liste n'est rendue que COMPLETE : {@code recordsTotal}
 * et {@code recordsFiltered} egaux au nombre de lignes recues.
 *
 * <p>
 * <b>Detail</b> : le balisage exact n'a pas ete capture. La lecture est donc TOLERANTE : metadonnees cherchees par leur
 * libelle (Référence, Agence, Date d'envoi, Mise à jour, Statut), valeur introuvable = null ; tableau
 * {@code #reclamation} lu cellule par cellule, par position, sans sens invente.
 */
public final class ReclamationsParseur {

    /** Nombre de cellules d'une ligne de la liste (confirme). */
    public static final int CELLULES_LISTE = 6;

    static final Pattern ID = Pattern.compile("\\d{1,18}");
    static final Pattern CODE = Pattern.compile("[A-Za-z0-9]{1,10}");
    private static final Pattern CHEMIN_DETAIL = Pattern.compile("(?i)(^|/)AfficherReclamation$");
    private static final Pattern CIP = Pattern.compile("(?i)^(?:CIP\\s*:?\\s*)?\"?(\\d{4,20})\"?$");

    static final String L_REFERENCE = "reference";
    static final String L_AGENCE = "agence";
    static final String L_DATE_ENVOI = "date d'envoi";
    static final String L_MISE_A_JOUR = "mise a jour";
    static final String L_STATUT = "statut";

    private ReclamationsParseur() {
    }

    /* ========================================================= liste */

    /**
     * Liste complete des reclamations d'un filtre.
     *
     * @throws ExtranetException
     *             PAGINATION si les totaux annonces different du nombre de lignes recues ; REPONSE_INATTENDUE si le
     *             JSON ou une ligne n'a pas la forme confirmee
     */
    public static List<ReclamationUbipharm> liste(String json) throws ExtranetException {
        JSONObject racine;
        try {
            racine = new JSONObject(json);
        } catch (JSONException e) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "Liste des réclamations illisible",
                    e);
        }
        ParcoursDataTables.Enveloppe env = ParcoursDataTables.Enveloppe.lire(racine);
        int n = env.data.length();
        if (env.recordsTotal != n || env.recordsFiltered != n) {
            throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                    "Liste des réclamations incomplète : " + n + " lignes reçues pour " + env.recordsTotal
                            + " annoncées (recordsFiltered " + env.recordsFiltered + ")");
        }
        List<ReclamationUbipharm> r = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            JSONArray c = env.data.optJSONArray(i);
            if (c == null || c.length() < CELLULES_LISTE) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "Réclamation " + (i + 1)
                        + " : " + CELLULES_LISTE + " cellules attendues, " + (c == null ? 0 : c.length()) + " reçues");
            }
            r.add(ligneListe(c));
        }
        return r;
    }

    static ReclamationUbipharm ligneListe(JSONArray c) {
        Map<String, String> p = parametresLien(brut(c, 0));
        return new ReclamationUbipharm(valide(p.get("id"), ID), valide(p.get("eta"), CODE), valide(p.get("appl"), CODE),
                texteCellule(c, 1), texteCellule(c, 2), texteCellule(c, 3), texteCellule(c, 4), texteCellule(c, 5),
                null, null, null);
    }

    private static String brut(JSONArray c, int i) {
        return c.isNull(i) ? null : String.valueOf(c.get(i));
    }

    /** Texte d'une cellule : entites decodees, balises retirees, blancs normalises ; null si la cellule est null. */
    private static String texteCellule(JSONArray c, int i) {
        String b = brut(c, i);
        return b == null ? null : Normalisation.texte(Jsoup.parseBodyFragment(b).text());
    }

    /**
     * Parametres id, eta, appl du premier lien vers AfficherReclamation trouve dans le HTML de la cellule. Les
     * parametres sont lus dans le lien, jamais deduits de la reference. Carte vide si aucun lien.
     */
    static Map<String, String> parametresLien(String html) {
        Map<String, String> p = new LinkedHashMap<>();
        if (html == null || html.isEmpty()) {
            return p;
        }
        for (Element a : Jsoup.parseBodyFragment(html).select("a[href]")) {
            String href = a.attr("href").trim();
            int q = href.indexOf('?');
            String chemin = q < 0 ? href : href.substring(0, q);
            if (!CHEMIN_DETAIL.matcher(chemin).find()) {
                continue;
            }
            if (q < 0) {
                return p;
            }
            String req = href.substring(q + 1);
            int h = req.indexOf('#');
            if (h >= 0) {
                req = req.substring(0, h);
            }
            for (String paire : req.split("&")) {
                int e = paire.indexOf('=');
                if (e <= 0) {
                    continue;
                }
                String k = decoder(paire.substring(0, e));
                String v = decoder(paire.substring(e + 1));
                if (k != null && v != null) {
                    p.putIfAbsent(k, v.trim());
                }
            }
            return p;
        }
        return p;
    }

    private static String decoder(String s) {
        try {
            return URLDecoder.decode(s, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String valide(String v, Pattern motif) {
        return v != null && motif.matcher(v).matches() ? v : null;
    }

    /** Date affichee : jj/mm/aaaa, ou date et heure ecrites (on n'en garde que le jour) ; null sinon. */
    static LocalDate date(String brut) {
        LocalDate d = Normalisation.date(brut);
        if (d != null) {
            return d;
        }
        LocalDateTime dh = Normalisation.dateHeure(brut);
        return dh == null ? null : dh.toLocalDate();
    }

    /* ========================================================= detail */

    /**
     * Detail d'une reclamation. id, eta et appl sont ceux de la requete (la page ne les repete pas de facon
     * documentee).
     *
     * @throws ExtranetException
     *             REPONSE_INATTENDUE si le tableau #reclamation est absent (page qui n'est pas un detail)
     */
    public static ReclamationUbipharm detail(String html, String id, String eta, String appl) throws ExtranetException {
        Element doc = Jsoup.parse(html == null ? "" : html);
        Element table = doc.selectFirst("table#reclamation");
        if (table == null) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Détail de réclamation sans tableau #reclamation");
        }
        List<String> entetes = new ArrayList<>();
        Element ligneTitres = table.selectFirst("thead tr");
        if (ligneTitres == null) {
            for (Element tr : table.select("tr")) {
                if (!tr.select("> th").isEmpty() && tr.select("> td").isEmpty()) {
                    ligneTitres = tr;
                    break;
                }
            }
        }
        if (ligneTitres != null) {
            for (Element th : ligneTitres.select("> th, > td")) {
                entetes.add(Normalisation.texte(th.text()));
            }
        }
        List<LigneReclamationUbipharm> lignes = new ArrayList<>();
        for (Element tr : table.select("tr")) {
            if (tr.parent() != null && "thead".equals(tr.parent().normalName())) {
                continue;
            }
            if (tr.closest("table") != table) {
                continue;
            }
            Elements tds = tr.select("> td");
            if (tds.isEmpty()) {
                continue;
            }
            /* ligne de message DataTables (« aucune donnée ») : une seule cellule etalee */
            if (tds.size() == 1 && tds.get(0).hasAttr("colspan")) {
                continue;
            }
            lignes.add(ligneDetail(lignes.size(), tds));
        }
        table.remove();
        return new ReclamationUbipharm(id, eta, appl, meta(doc, L_REFERENCE), null, meta(doc, L_STATUT),
                meta(doc, L_DATE_ENVOI), meta(doc, L_MISE_A_JOUR), meta(doc, L_AGENCE), entetes, lignes);
    }

    static LigneReclamationUbipharm ligneDetail(int position, Elements tds) {
        List<String> cellules = new ArrayList<>(tds.size());
        for (Element td : tds) {
            cellules.add(Normalisation.texte(td.text()));
        }
        if (cellules.size() != LigneReclamationUbipharm.COLONNES) {
            /* positions non sures : rien n'est reconnu, les cellules brutes restent */
            return new LigneReclamationUbipharm(position, cellules, null, null, null, null, null, null, null, null);
        }
        String[] produit = produit(tds.get(3));
        String prixBrut = vide(cellules.get(5));
        return new LigneReclamationUbipharm(position, cellules, produit[0], produit[1], produit[2],
                Normalisation.entier(cellules.get(4)), prixBrut, Normalisation.montant(prixBrut), vide(cellules.get(7)),
                vide(cellules.get(11)));
    }

    /**
     * Produit d'une cellule : { pscode, designation, CIP }. Le pscode vient de {@code data-pscode} (sur la cellule ou
     * un element interieur) ; absent ou vide, il n'y a pas de produit (« Produit inconnu ») et tout reste null. La
     * designation et le CIP sont lus dans les segments de texte de la cellule : le CIP est le segment numerique (avec
     * ou sans « CIP : » et guillemets), la designation le premier segment qui n'est ni le pscode ni le CIP.
     */
    static String[] produit(Element td) {
        Element porteur = td.hasAttr("data-pscode") ? td : td.selectFirst("[data-pscode]");
        String pscode = porteur == null ? null : vide(Normalisation.texte(porteur.attr("data-pscode")));
        if (pscode == null) {
            return new String[3];
        }
        String designation = null, cip = null;
        for (String s : segments(td)) {
            if (s.equalsIgnoreCase(pscode)) {
                continue;
            }
            Matcher m = CIP.matcher(s);
            if (m.matches()) {
                if (cip == null) {
                    cip = m.group(1);
                }
            } else if (designation == null) {
                designation = s;
            }
        }
        return new String[] { pscode, designation, cip };
    }

    /** Morceaux de texte d'un element, separes par ses balises (br, span, div...), blancs normalises, non vides. */
    static List<String> segments(Element e) {
        List<String> l = new ArrayList<>();
        NodeTraversor.traverse(new NodeVisitor() {
            @Override
            public void head(Node n, int profondeur) {
                if (n instanceof TextNode) {
                    String t = Normalisation.texte(((TextNode) n).text());
                    if (t != null && !t.isEmpty()) {
                        l.add(t);
                    }
                }
            }

            @Override
            public void tail(Node n, int profondeur) {
                // rien
            }
        }, e);
        return l;
    }

    /**
     * Valeur d'une metadonnee cherchee par son libelle, hors tableau #reclamation :
     * <ol>
     * <li>element dont tout le texte est le libelle (« Référence », « Référence : ») : valeur = texte qui le suit
     * (element frere, texte frere, ou element frere du parent qui ne contient que ce libelle) ;</li>
     * <li>sinon, element le plus profond dont le texte est « libelle : valeur ».</li>
     * </ol>
     * null si introuvable ou vide.
     */
    static String meta(Element doc, String libelle) {
        Element body = doc.ownerDocument() != null && doc.ownerDocument().body() != null ? doc.ownerDocument().body()
                : doc;
        for (Element e : body.getAllElements()) {
            if (!libelle.equals(cle(e.text()))) {
                continue;
            }
            String v = suivant(e);
            if (v != null) {
                return v;
            }
            Element p = e.parent();
            if (p != null && p != body && libelle.equals(cle(p.text()))) {
                v = suivant(p);
                if (v != null) {
                    return v;
                }
            }
        }
        Element meilleur = null;
        String valeur = null;
        for (Element e : body.getAllElements()) {
            String t = Normalisation.texte(e.text());
            int dp = t.indexOf(':');
            if (dp <= 0 || !libelle.equals(cle(t.substring(0, dp)))) {
                continue;
            }
            String v = vide(Normalisation.texte(t.substring(dp + 1)));
            if (v != null && (meilleur == null || e.parents().contains(meilleur))) {
                meilleur = e;
                valeur = v;
            }
        }
        return valeur;
    }

    private static String suivant(Element e) {
        StringBuilder sb = new StringBuilder();
        for (Node n = e.nextSibling(); n != null; n = n.nextSibling()) {
            if (n instanceof TextNode) {
                sb.append(((TextNode) n).text());
            } else if (n instanceof Element) {
                if (sb.toString().trim().isEmpty()) {
                    String t = vide(Normalisation.texte(((Element) n).text()));
                    if (t != null && !estLibelle(t)) {
                        return deuxPoints(t);
                    }
                }
                break;
            }
        }
        return vide(deuxPoints(Normalisation.texte(sb.toString())));
    }

    /** Retire un « : » de tete (« : EXT1408456VRI »). */
    private static String deuxPoints(String s) {
        if (s == null) {
            return null;
        }
        String t = s.startsWith(":") ? s.substring(1) : s;
        return vide(Normalisation.texte(t));
    }

    private static boolean estLibelle(String t) {
        String c = cle(t);
        return L_REFERENCE.equals(c) || L_AGENCE.equals(c) || L_DATE_ENVOI.equals(c) || L_MISE_A_JOUR.equals(c)
                || L_STATUT.equals(c);
    }

    /** Libelle compare sans accents, sans casse, apostrophes unifiees, « : » final retire. */
    static String cle(String s) {
        String t = Normalisation.texte(s);
        if (t == null) {
            return "";
        }
        t = Normalizer.normalize(t, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").replace('’', '\'')
                .toLowerCase(Locale.ROOT);
        while (t.endsWith(":") || t.endsWith(" ")) {
            t = t.substring(0, t.length() - 1);
        }
        return t;
    }

    private static String vide(String s) {
        return s == null || s.isEmpty() ? null : s;
    }
}
