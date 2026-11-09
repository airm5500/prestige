package rest.service.extranet.copharmed;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Lecture de Copharmed (Intershop, releve du 08/11), GET seulement. Une ligne produit (.product-row) porte : nom
 * (.product-row-name), « Code CIP/ACL/EAN7 : x », « Colisage : x », DCI (liens .product-row-features), prix
 * (.product-row-price : prix HT, taux de TVA, prix TTC, prix public, au format « 1.469 CFA » et « 18,0% » ; les champs
 * remise et prixNet portent le taux de TVA et le prix TTC), disponibilite (.product-row-buybox : « Indisponible », «
 * Livraison en 48 h », ou champ de quantite = disponible), badge de promotion (.product-row-promotion) et paliers
 * d'unites gratuites (« 300 U.G. / 1.000 »).
 *
 * Une page lue sans session ouverte reste publique sur Copharmed (sans prix) : elle est reconnue a l'absence du lien de
 * deconnexion, la session est alors marquee expiree et la page relue une fois apres reconnexion.
 */
public final class CopharmedLecteur {

    public static final String PROMOTIONS = "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/ViewPromotion-ShowAll";
    public static final String PROMOTION_DETAIL = "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/ViewPromotion-Detail";
    public static final String CATALOGUE = "/fr/products/";
    public static final String RECHERCHE = "/fr/search";
    static final int TAILLE_PAGE = 200;
    static final int PAGES_MAX = 150;
    static final int PROMOTIONS_MAX = 400;
    static final int LIGNES_MAX = 40000;
    public static final int RESULTATS_MAX = 100;
    /** « 300 U.G. / 1.000 » : nombres avec points de milliers, sans avaler le nombre suivant. */
    static final Pattern UG = Pattern
            .compile("(\\d{1,3}(?:\\.\\d{3})+|\\d+)\\s*U\\.?G\\.?\\s*/\\s*(\\d{1,3}(?:\\.\\d{3})+|\\d+)");
    static final Pattern PROMO_UUID = Pattern.compile("PromotionUUID=([A-Za-z0-9_-]{8,64})");
    static final Pattern CIP = Pattern.compile("\\d{7,14}");

    /** Produit lu sur une page. */
    public static final class Produit {
        public String nom = "", code = "", colisage = "", dci = "", prixHT = "", remise = "", prixNet = "",
                prixPublic = "", dispo = "", promotion = "", ug = "";

        JSONObject json() {
            return new JSONObject().put("designation", nom).put("code", code).put("dci", dci).put("colisage", colisage)
                    .put("prixHT", prixHT).put("remise", remise).put("prixNet", prixNet).put("prixPublic", prixPublic)
                    .put("dispo", dispo).put("promotion", promotion).put("ug", ug);
        }
    }

    /** Promotion de la liste : nom, debut, fin, type, identifiant. */
    public static final class Promotion {
        public final String nom, debut, fin, type, uuid;

        Promotion(String nom, String debut, String fin, String type, String uuid) {
            this.nom = nom;
            this.debut = debut;
            this.fin = fin;
            this.type = type;
            this.uuid = uuid;
        }
    }

    private CopharmedLecteur() {
    }

    /* ============================================================ pages */

    static boolean connecte(String html) {
        return html != null && html.contains("/fr/logout");
    }

    /** GET d'une page HTML connectee ; une page publique (session perdue) est relue une fois apres reconnexion. */
    static String page(TransportExtranet t, String chemin, Map<String, String> p) throws ExtranetException {
        String h = t.lire(chemin, p, TransportExtranet.Attendu.HTML, null).texte();
        if (connecte(h)) {
            return h;
        }
        t.session().expiree();
        h = t.lire(chemin, p, TransportExtranet.Attendu.HTML, null).texte();
        if (!connecte(h)) {
            throw new ExtranetException(ExtranetException.Nature.SESSION_EXPIREE,
                    "Session Copharmed expirée : page lue sans connexion (" + chemin + ")");
        }
        return h;
    }

    /* ============================================================ lecture des listes */

    public static List<Ligne> lire(TransportExtranet t, ListeCopharmed l) throws ExtranetException {
        switch (l) {
        case COPHARMED_PROMOTIONS:
            return promotions(t);
        case COPHARMED_FACTURES:
            return documents(t, FACTURES);
        case COPHARMED_AVOIRS:
            return documents(t, AVOIRS);
        default:
            return catalogue(t);
        }
    }

    /* ============================================================ factures et avoirs (09/11) */

    public static final String FACTURES = "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/ViewPharmacy-Invoices";
    public static final String AVOIRS = "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/ViewPharmacy-CreditNotes";
    static final String INTERSHOP = "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/";
    /** Page suivante : action de pagination de la page elle-meme (ex. ViewPharmacy-PagingInvoices). */
    static final Pattern ACTION_PAGES = Pattern.compile("ViewPharmacy-Paging[A-Za-z]{1,40}");
    static final Pattern PAGEABLE = Pattern.compile("[A-Za-z0-9_.-]{1,80}");

    /**
     * Une page de documents : lignes {numero, date, montant, InvoiceNo}, pages proposees et identifiant de pagination.
     */
    static final class PageDocuments {
        final List<String[]> lignes = new ArrayList<>();
        final Set<Integer> pages = new LinkedHashSet<>();
        String pageable;
        String pagination;
    }

    /**
     * Factures ou avoirs : premiere page, puis les pages suivantes proposees par ses liens (PageNumber a partir de 0,
     * meme PageableID), tant qu'un lien mene plus loin. Une page sans tableau arrete la lecture.
     */
    static List<Ligne> documents(TransportExtranet t, String chemin) throws ExtranetException {
        List<Ligne> r = new ArrayList<>();
        Set<String> vus = new LinkedHashSet<>();
        PageDocuments p = documents(page(t, chemin, null));
        int courante = 0;
        for (int n = 0; n < PAGES_MAX; n++) {
            for (String[] x : p.lignes) {
                if (vus.add(x[0] + "|" + x[3]) && r.size() < LIGNES_MAX) {
                    Map<String, String> d = null;
                    String inv = rest.service.extranet.commun.FichiersExtranet.reference(x[3]);
                    if (inv != null) {
                        d = new LinkedHashMap<>();
                        d.put("InvoiceNo", inv);
                    }
                    r.add(new Ligne(r.size(), null, null, null, Arrays.asList(x[0], x[1], x[2]), d));
                }
            }
            int suivante = -1;
            for (int k : p.pages) {
                if (k > courante && (suivante < 0 || k < suivante)) {
                    suivante = k;
                }
            }
            if (suivante < 0 || p.pageable == null || p.pagination == null) {
                break;
            }
            Map<String, String> q = new LinkedHashMap<>();
            q.put("PageNumber", String.valueOf(suivante));
            q.put("PageSize", "25");
            q.put("ViewType", "");
            q.put("PageableID", p.pageable);
            String pageable = p.pageable, pagination = p.pagination;
            p = documents(page(t, INTERSHOP + pagination, q));
            if (p.pageable == null) {
                p.pageable = pageable;
            }
            if (p.pagination == null) {
                p.pagination = pagination;
            }
            courante = suivante;
        }
        return r;
    }

    /** Tableau de la page Factures ou Avoirs (N° / Date / Montant HT / liens). */
    static PageDocuments documents(String html) throws ExtranetException {
        Document d = Jsoup.parse(html == null ? "" : html);
        d.select("script, noscript, template").remove();
        Element table = null;
        for (Element t : d.select("table")) {
            Elements th = t.select("> thead > tr > th");
            if (th.size() >= 3 && th.get(0).text().trim().startsWith("N°")
                    && th.get(1).text().trim().equalsIgnoreCase("Date")) {
                table = t;
                break;
            }
        }
        if (table == null) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Copharmed : tableau des documents introuvable (page modifiée ou session expirée)");
        }
        PageDocuments p = new PageDocuments();
        for (Element tr : table.select("> tbody > tr")) {
            Elements td = tr.select("> td");
            if (td.size() < 3) {
                continue;
            }
            String inv = null;
            for (Element a : tr.select("a[href*=DownloadInvoice]")) {
                String v = parametre(a.attr("href"), "InvoiceNo");
                if (v != null) {
                    inv = v;
                    break;
                }
            }
            p.lignes.add(new String[] { texte(td.get(0)), texte(td.get(1)), texte(td.get(2)), inv });
        }
        for (Element a : d.select("a[href*=Paging]")) {
            String n = parametre(a.attr("href"), "PageNumber"), id = parametre(a.attr("href"), "PageableID");
            if (n != null && n.matches("\\d{1,4}")) {
                p.pages.add(Integer.parseInt(n));
            }
            if (id != null && PAGEABLE.matcher(id).matches()) {
                p.pageable = id;
            }
            Matcher m = ACTION_PAGES.matcher(a.attr("href"));
            if (m.find()) {
                p.pagination = m.group();
            }
        }
        return p;
    }

    private static String texte(Element e) {
        return rest.service.extranet.commun.Normalisation.texte(e.text());
    }

    /** Valeur d'un parametre d'une adresse ; null si absent. */
    static String parametre(String href, String nom) {
        int q = href == null ? -1 : href.indexOf('?');
        if (q < 0) {
            return null;
        }
        for (String kv : href.substring(q + 1).split("&")) {
            int e = kv.indexOf('=');
            if (e > 0 && kv.substring(0, e).equals(nom)) {
                return java.net.URLDecoder.decode(kv.substring(e + 1), java.nio.charset.StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    static List<Ligne> promotions(TransportExtranet t) throws ExtranetException {
        List<Promotion> ps = promotions(page(t, PROMOTIONS, null));
        List<Ligne> r = new ArrayList<>();
        for (Promotion p : ps) {
            Map<String, String> q = new LinkedHashMap<>();
            q.put("PromotionUUID", p.uuid);
            for (Produit x : produits(page(t, PROMOTION_DETAIL, q))) {
                if (r.size() >= LIGNES_MAX) {
                    return r;
                }
                r.add(ligne(r.size(), x, Arrays.asList(p.nom, p.debut, p.fin, p.type, x.nom, x.code, x.dci, x.colisage,
                        x.prixHT, x.remise, x.prixNet, x.prixPublic, x.ug)));
            }
        }
        return r;
    }

    static List<Ligne> catalogue(TransportExtranet t) throws ExtranetException {
        List<Ligne> r = new ArrayList<>();
        Set<String> vus = new LinkedHashSet<>();
        for (int n = 0; n < PAGES_MAX && r.size() < LIGNES_MAX; n++) {
            Map<String, String> q = new LinkedHashMap<>();
            q.put("PageSize", String.valueOf(TAILLE_PAGE));
            q.put("PageNumber", String.valueOf(n));
            List<Produit> ps = produits(page(t, CATALOGUE, q));
            int nouveaux = 0;
            for (Produit x : ps) {
                if (!vus.add(x.code + "|" + x.nom)) {
                    continue;
                }
                nouveaux++;
                r.add(ligne(r.size(), x, Arrays.asList(x.nom, x.code, x.dci, x.colisage, x.prixHT, x.remise, x.prixNet,
                        x.prixPublic, x.dispo, x.promotion, x.ug)));
            }
            /* fin du catalogue : page vide ou deja vue */
            if (ps.isEmpty() || nouveaux == 0) {
                break;
            }
        }
        return r;
    }

    static Ligne ligne(int position, Produit x, List<String> cellules) {
        List<String> c = new ArrayList<>();
        for (String s : cellules) {
            String v = s == null ? "" : s;
            c.add(v.length() > 1000 ? v.substring(0, 1000) : v);
        }
        String code = x.code.length() > 40 ? x.code.substring(0, 40) : x.code;
        return new Ligne(position, null, code.isEmpty() ? null : code, CIP.matcher(x.code).matches() ? x.code : null,
                c);
    }

    /* ============================================================ recherche en direct */

    public static JSONObject rechercher(TransportExtranet t, String motif) throws ExtranetException {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("SearchTerm", motif);
        q.put("PageSize", String.valueOf(RESULTATS_MAX));
        List<Produit> ps = produits(page(t, RECHERCHE, q));
        JSONArray a = new JSONArray();
        for (Produit x : ps) {
            if (a.length() >= RESULTATS_MAX) {
                break;
            }
            a.put(x.json());
        }
        return new JSONObject().put("resultats", a).put("tronque", ps.size() > RESULTATS_MAX);
    }

    /* ============================================================ analyse HTML */

    static List<Promotion> promotions(String html) {
        List<Promotion> r = new ArrayList<>();
        Document d = Jsoup.parse(html);
        for (Element tr : d.select("table tbody tr")) {
            Element a = tr.selectFirst("a[href*=ViewPromotion-Detail]");
            if (a == null || tr.children().size() < 4) {
                continue;
            }
            Matcher m = PROMO_UUID.matcher(a.attr("href"));
            if (!m.find()) {
                continue;
            }
            r.add(new Promotion(tr.child(0).text().trim(), tr.child(1).text().trim(), tr.child(2).text().trim(),
                    tr.child(3).text().trim(), m.group(1)));
            if (r.size() >= PROMOTIONS_MAX) {
                break;
            }
        }
        return r;
    }

    public static List<Produit> produits(String html) {
        List<Produit> r = new ArrayList<>();
        Document d = Jsoup.parse(html);
        for (Element row : d.select(".product-row")) {
            Element nom = row.selectFirst(".product-row-name");
            if (nom == null) {
                continue;
            }
            Produit p = new Produit();
            p.nom = nom.text().trim();
            for (Element e : row.select(".product-row-infos .fs-14px, .product-row-infos div")) {
                String s = e.ownText().trim();
                if (s.matches("(?i)^Code\\s.*:.*")) {
                    p.code = s.replaceFirst("^[^:]*:\\s*", "").trim();
                } else if (s.matches("(?i)^Colisage\\s*:.*")) {
                    p.colisage = s.replaceFirst("^[^:]*:\\s*", "").trim();
                }
            }
            List<String> dci = new ArrayList<>();
            for (Element a : row.select(".product-row-features a")) {
                String s = a.text().trim();
                if (!s.isEmpty() && !dci.contains(s)) {
                    dci.add(s);
                }
            }
            p.dci = String.join(" + ", dci);
            Element prix = row.selectFirst(".product-row-price");
            if (prix != null) {
                Elements v = prix.select(".text-nowrap");
                p.prixHT = v.size() > 0 ? montant(v.get(0).text()) : "";
                p.remise = v.size() > 1 ? v.get(1).text().trim() : "";
                p.prixNet = v.size() > 2 ? montant(v.get(2).text()) : "";
                p.prixPublic = v.size() > 3 ? montant(v.get(3).text()) : "";
            }
            p.dispo = dispo(row.selectFirst(".product-row-buybox"));
            Element promo = row.selectFirst(".product-row-promotion");
            p.ug = paliers(row);
            /* le badge ne porte que « Promotions » et sa fenetre de detail (nom du produit, paliers) */
            p.promotion = promo != null && (!promo.text().trim().isEmpty() || !p.ug.isEmpty()) ? "Oui" : "";
            r.add(p);
        }
        return r;
    }

    /** « Indisponible », « Livraison en 48 h », ou « Disponible » si la quantite peut etre saisie. */
    static String dispo(Element buybox) {
        if (buybox == null) {
            return "";
        }
        String s = buybox.text().replaceAll("\\s+", " ").trim();
        if (s.toLowerCase().contains("indisponible")) {
            return "Indisponible";
        }
        Matcher m = Pattern.compile("(?i)livraison en [^.]*?\\d+\\s*h").matcher(s);
        if (m.find()) {
            return "Disponible (" + m.group().trim() + ")";
        }
        return !buybox.select("input, button, .px-2").isEmpty() || s.contains("+") ? "Disponible" : s;
    }

    /** Paliers d'unites gratuites, du plus petit au plus grand, sans doublon : « 1 UG / 10 ; 10 UG / 50 ». */
    /** Paliers lus element par element (deux balises collees ne fusionnent pas leurs nombres). */
    static String paliers(Element row) {
        StringBuilder sb = new StringBuilder();
        for (Element e : row.getAllElements()) {
            String s = e.ownText();
            if (s.contains("U.G") || s.contains("UG")) {
                sb.append(' ').append(s).append(' ');
            }
        }
        return paliers(sb.toString());
    }

    static String paliers(String texte) {
        Map<String, long[]> m = new LinkedHashMap<>();
        Matcher x = UG.matcher(texte == null ? "" : texte);
        while (x.find()) {
            long ug = entier(x.group(1)), qte = entier(x.group(2));
            if (ug > 0 && qte > 0) {
                m.put(ug + "/" + qte, new long[] { ug, qte });
            }
        }
        List<long[]> l = new ArrayList<>(m.values());
        l.sort((a, b) -> a[1] != b[1] ? Long.compare(a[1], b[1]) : Long.compare(a[0], b[0]));
        StringBuilder sb = new StringBuilder();
        for (long[] p : l) {
            sb.append(sb.length() > 0 ? " ; " : "").append(p[0]).append(" UG / ").append(p[1]);
        }
        return sb.toString();
    }

    static long entier(String s) {
        String c = s.replaceAll("[^0-9]", "");
        return c.isEmpty() || c.length() > 12 ? 0 : Long.parseLong(c);
    }

    /** « 1.469 CFA » -> « 1469 » ; « 12,5 CFA » -> « 12.5 » ; vide si illisible. */
    static String montant(String s) {
        String c = s == null ? ""
                : s.replaceAll("(?i)f?cfa|[\\s\\u00a0\\u202f]", "").replace(".", "").replace(',', '.');
        if (!c.matches("-?\\d+(\\.\\d+)?")) {
            return "";
        }
        BigDecimal b = new BigDecimal(c).stripTrailingZeros();
        return b.scale() < 0 ? b.setScale(0).toPlainString() : b.toPlainString();
    }
}
