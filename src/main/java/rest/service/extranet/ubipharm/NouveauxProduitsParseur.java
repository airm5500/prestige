package rest.service.extranet.ubipharm;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Attribute;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import rest.service.extranet.commun.Normalisation;
import rest.service.extranet.ubipharm.NouveauProduitUbipharm.DisponibiliteAgence;

/**
 * Lecture de la page HTML « Nouveaux produits » d'Ubipharm (plan du 07/11, §3), avec un parseur DOM (jsoup) : les
 * scripts ne sont jamais executes et sont retires avant la lecture.
 * <p>
 * Seuls les selecteurs et attributs du plan sont certains : a.popup-produit (data-pscode, data-sheettype), .td-detail
 * ou champ cache cip_*, .tip-viewStock-lgetlib / -etlib / -dispo / -colisage, data-etcoda, data-colisage. Le balisage
 * autour n'est pas connu : le parseur est TOLERANT (valeur introuvable = null) et une ligne est reperee par son
 * a.popup-produit. Categorie, date, mouvement et disponibilite globale n'ont pas de selecteur documente : ils sont lus
 * par le titre de colonne du tableau (« Catégorie », « Date », « Mouvement », « Disponibilité ») quand il existe ; sans
 * titre, seule la date est reconnue (cellule au format jj/mm/aaaa).
 * <p>
 * La pagination n'est pas documentee : si la page montre des liens de page, le resultat le signale
 * ({@link Resultat#paginationDetectee()}) au lieu de pretendre la liste complete.
 */
public final class NouveauxProduitsParseur {

    /** Resultat de lecture d'une page. */
    public static final class Resultat {
        private final List<NouveauProduitUbipharm> lignes;
        private final boolean paginationDetectee;

        Resultat(List<NouveauProduitUbipharm> lignes, boolean paginationDetectee) {
            this.lignes = Collections.unmodifiableList(lignes);
            this.paginationDetectee = paginationDetectee;
        }

        public List<NouveauProduitUbipharm> lignes() {
            return lignes;
        }

        /** Vrai si la page montre une pagination : la liste lue n'est peut-etre pas complete. */
        public boolean paginationDetectee() {
            return paginationDetectee;
        }
    }

    private static final String BULLE = "[class*=tip-viewStock]";
    private static final Pattern DATE = Pattern.compile("^\\d{2}/\\d{2}/\\d{4}(\\s.*)?$");
    private static final Pattern ETIQUETTE_CIP = Pattern.compile("^(?i)(code\\s*)?cip\\s*:?\\s*");
    private static final Pattern LIEN_PAGE = Pattern.compile("[?&](page|p|pg|start|offset)=\\d+",
            Pattern.CASE_INSENSITIVE);

    private enum Colonne {
        CATEGORIE, DATE, MOUVEMENT, DISPONIBILITE
    }

    public Resultat analyser(String html) {
        Document d = Jsoup.parse(html == null ? "" : html);
        d.select("script, noscript, template").remove();
        List<NouveauProduitUbipharm> lignes = new ArrayList<>();
        Map<Element, NouveauProduitUbipharm> parConteneur = new LinkedHashMap<>();
        for (Element a : d.select("a.popup-produit")) {
            if (dansBulle(a)) {
                continue;
            }
            Element conteneur = conteneur(a);
            NouveauProduitUbipharm p = parConteneur.get(conteneur);
            if (p != null) {
                /* plusieurs liens dans la meme ligne (image + texte) : une seule ligne produit */
                if (vide(p.designation)) {
                    p.designation = Normalisation.texte(a.text());
                }
                if (p.pscode == null || p.pscode.isEmpty()) {
                    p.pscode = attribut(a, "data-pscode");
                }
                if (p.sheettype == null) {
                    p.sheettype = attribut(a, "data-sheettype");
                }
                continue;
            }
            p = new NouveauProduitUbipharm();
            p.position = lignes.size() + 1;
            p.pscode = attribut(a, "data-pscode");
            p.sheettype = attribut(a, "data-sheettype");
            p.designation = Normalisation.texte(a.text());
            lireCip(conteneur, p);
            lireColonnes(conteneur, p);
            lireAgences(conteneur, p);
            parConteneur.put(conteneur, p);
            lignes.add(p);
        }
        return new Resultat(lignes, pagination(d));
    }

    /* ---------------------------------------------------------------- ligne */

    /** La ligne d'un produit : son tr, sinon l'element parent du lien. */
    static Element conteneur(Element a) {
        Element tr = a.closest("tr");
        if (tr != null) {
            return tr;
        }
        return a.parent() == null ? a : a.parent();
    }

    private static void lireCip(Element ligne, NouveauProduitUbipharm p) {
        for (Element e : ligne.select(".td-detail")) {
            if (dansBulle(e)) {
                continue;
            }
            String t = Normalisation.texte(e.text());
            t = ETIQUETTE_CIP.matcher(t).replaceFirst("");
            if (!t.isEmpty()) {
                p.cip = t.replaceAll("\\s+", "");
                p.cipSource = NouveauProduitUbipharm.CIP_DETAIL;
                return;
            }
        }
        for (Element e : ligne.select("input[name^=cip_], input[id^=cip_]")) {
            String v = Normalisation.texte(e.attr("value"));
            if (!v.isEmpty()) {
                p.cip = v.replaceAll("\\s+", "");
                p.cipSource = NouveauProduitUbipharm.CIP_CHAMP_CACHE;
                return;
            }
        }
    }

    private static void lireColonnes(Element ligne, NouveauProduitUbipharm p) {
        if (!"tr".equals(ligne.normalName())) {
            return;
        }
        Map<Integer, Colonne> titres = titres(ligne);
        int i = 0;
        for (Element c : ligne.children()) {
            if (!"td".equals(c.normalName()) && !"th".equals(c.normalName())) {
                continue;
            }
            Colonne col = titres.get(i);
            if (col != null) {
                String t = texteSansBulle(c);
                switch (col) {
                case CATEGORIE:
                    p.categorie = t;
                    break;
                case DATE:
                    p.dateAffichee = t;
                    break;
                case MOUVEMENT:
                    p.mouvement = t;
                    break;
                default:
                    p.disponibiliteBrute = t;
                }
            }
            i += etendue(c);
        }
        if (p.dateAffichee == null && !titres.containsValue(Colonne.DATE)) {
            for (Element c : ligne.children()) {
                String t = texteSansBulle(c);
                if (("td".equals(c.normalName()) || "th".equals(c.normalName())) && DATE.matcher(t).matches()) {
                    p.dateAffichee = t;
                    break;
                }
            }
        }
    }

    /** Titres du tableau de la ligne : position de colonne (colspan compris) vers champ reconnu. */
    private static Map<Integer, Colonne> titres(Element tr) {
        Map<Integer, Colonne> m = new HashMap<>();
        Element table = tr.closest("table");
        if (table == null) {
            return m;
        }
        Element entete = null;
        List<Element> rangees = new ArrayList<>();
        for (Element s : table.children()) {
            if ("thead".equals(s.normalName())) {
                for (Element r : s.children()) {
                    if ("tr".equals(r.normalName())) {
                        entete = r;
                    }
                }
            } else if ("tbody".equals(s.normalName())) {
                rangees.addAll(s.children());
            } else if ("tr".equals(s.normalName())) {
                rangees.add(s);
            }
        }
        if (entete == null) {
            for (Element r : rangees) {
                boolean th = false, td = false;
                for (Element c : r.children()) {
                    th |= "th".equals(c.normalName());
                    td |= "td".equals(c.normalName());
                }
                if (th && !td) {
                    entete = r;
                    break;
                }
            }
        }
        if (entete == null) {
            return m;
        }
        int i = 0;
        for (Element c : entete.children()) {
            String t = sansAccent(Normalisation.texte(c.text()));
            Colonne col = null;
            if (t.contains("categ")) {
                col = Colonne.CATEGORIE;
            } else if (t.contains("mouvement")) {
                col = Colonne.MOUVEMENT;
            } else if (t.contains("dispo")) {
                col = Colonne.DISPONIBILITE;
            } else if (t.contains("date")) {
                col = Colonne.DATE;
            }
            if (col != null && !m.containsValue(col)) {
                m.put(i, col);
            }
            i += etendue(c);
        }
        return m;
    }

    private static int etendue(Element c) {
        try {
            return Math.max(1, Integer.parseInt(c.attr("colspan").trim()));
        } catch (NumberFormatException e) {
            return 1;
        }
    }

    /* -------------------------------------------------------------- agences */

    private static void lireAgences(Element ligne, NouveauProduitUbipharm p) {
        List<Element> zones = new ArrayList<>();
        zones.add(ligne);
        /*
         * bulle eventuellement rangee dans un attribut (title, data-content...) : lue comme fragment, jamais executee
         */
        for (Element e : ligne.getAllElements()) {
            for (Attribute at : e.attributes()) {
                String v = at.getValue();
                if (v != null && v.contains("<") && v.contains("tip-viewStock")) {
                    Document f = Jsoup.parseBodyFragment(v);
                    f.select("script, noscript, template").remove();
                    zones.add(f.body());
                }
            }
        }
        for (Element zone : zones) {
            for (Element bloc : blocs(zone)) {
                DisponibiliteAgence ag = new DisponibiliteAgence();
                ag.etcoda = attributDans(bloc, "data-etcoda");
                ag.etlib = texte(bloc, ".tip-viewStock-etlib");
                ag.lgetlib = texte(bloc, ".tip-viewStock-lgetlib");
                ag.disponibiliteBrute = texte(bloc, ".tip-viewStock-dispo");
                String c = attributDans(bloc, "data-colisage");
                ag.colisagesBrut = c != null ? c : texte(bloc, ".tip-viewStock-colisage");
                if (ag.etcoda != null || ag.etlib != null || ag.disponibiliteBrute != null
                        || ag.colisagesBrut != null) {
                    p.agences.add(ag);
                }
            }
        }
    }

    /**
     * Un bloc par agence : chaque element porteur de data-etcoda, elargi a ses parents tant qu'il ne contient ni dispo
     * ni colisage et que le parent ne regroupe pas une autre agence. Sans data-etcoda : un bloc par
     * .tip-viewStock-etlib, elargi de la meme facon.
     */
    private static List<Element> blocs(Element zone) {
        List<Element> r = new ArrayList<>();
        Elements porteurs = zone.select("[data-etcoda]");
        String repere = "[data-etcoda]";
        if (porteurs.isEmpty()) {
            porteurs = zone.select(".tip-viewStock-etlib");
            repere = ".tip-viewStock-etlib";
        }
        for (Element e : porteurs) {
            Element b = e;
            while (b.select(".tip-viewStock-dispo, .tip-viewStock-colisage").isEmpty() && b.parent() != null
                    && b != zone && b.parent() != zone && b.parent().select(repere).size() <= 1) {
                b = b.parent();
            }
            boolean deja = false;
            for (Element x : r) {
                if (x == b || x.getAllElements().contains(b)) {
                    deja = true;
                    break;
                }
            }
            if (!deja) {
                r.add(b);
            }
        }
        return r;
    }

    /* ----------------------------------------------------------- pagination */

    static boolean pagination(Document d) {
        for (Element e : d
                .select(".pagination, .pager, .dataTables_paginate, [class*=paginat], nav[aria-label*=agination]")) {
            if (cache(e)) {
                continue;
            }
            for (Element x : e.select("a, button")) {
                String t = Normalisation.texte(x.text());
                if (x.hasAttr("href") || x.hasAttr("data-page") || t.matches("\\d+")) {
                    return true;
                }
            }
        }
        for (Element a : d.select("a[rel=next], link[rel=next], a[href]")) {
            if (cache(a)) {
                continue;
            }
            if ("next".equalsIgnoreCase(a.attr("rel")) || LIEN_PAGE.matcher(a.attr("href")).find()) {
                return true;
            }
        }
        return false;
    }

    private static boolean cache(Element e) {
        for (Element x = e; x != null; x = x.parent()) {
            String s = x.attr("style").replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
            if (x.hasAttr("hidden") || s.contains("display:none") || s.contains("visibility:hidden")) {
                return true;
            }
        }
        return false;
    }

    /* -------------------------------------------------------------- outils */

    private static boolean dansBulle(Element e) {
        for (Element x = e; x != null; x = x.parent()) {
            if (x.className().contains("tip-viewStock")) {
                return true;
            }
        }
        return false;
    }

    /** Texte d'une cellule, bulles d'agences retirees. */
    private static String texteSansBulle(Element c) {
        Element k = c.clone();
        k.select(BULLE).remove();
        k.select("[data-etcoda]").remove();
        return Normalisation.texte(k.text());
    }

    private static String texte(Element bloc, String selecteur) {
        Element e = bloc.is(selecteur) ? bloc : bloc.selectFirst(selecteur);
        return e == null ? null : Normalisation.texte(e.text());
    }

    private static String attribut(Element e, String nom) {
        return e.hasAttr(nom) ? Normalisation.texte(e.attr(nom)) : null;
    }

    private static String attributDans(Element bloc, String nom) {
        if (bloc.hasAttr(nom)) {
            return attribut(bloc, nom);
        }
        Element e = bloc.selectFirst("[" + nom + "]");
        return e == null ? null : attribut(e, nom);
    }

    private static boolean vide(String s) {
        return s == null || s.isEmpty();
    }

    static String sansAccent(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
