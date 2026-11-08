package rest.service.extranet.ubipharm;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.Normalisation;
import rest.service.extranet.ubipharm.ListeUbipharm.Colonne;
import rest.service.extranet.ubipharm.ListeUbipharm.Genre;

/**
 * Lecture des lignes des listes Ubipharm (jsoup ; les scripts ne sont jamais executes et sont retires). Une ligne lue
 * devient une ligne affichee : agence (listes par agence), reference produit, puis les colonnes gardees dans l'ordre de
 * la definition, la colonne produit suivie de son CIP. Aucun HTML n'est garde ; aucun montant n'est converti.
 * <p>
 * Une page qui ne ressemble plus a celle relevee (tableau absent, titre de colonne different, ligne trop courte) arrete
 * la lecture : rien n'est presente comme complet.
 */
public final class ListesUbipharmParseur {

    /** Ligne affichee. */
    public static final class Ligne {
        public final int position;
        public final String agence;
        public final String pscode;
        public final String cip;
        public final List<String> cellules;

        Ligne(int position, String agence, String pscode, String cip, List<String> cellules) {
            this.position = position;
            this.agence = agence;
            this.pscode = pscode;
            this.cip = cip;
            this.cellules = Collections.unmodifiableList(cellules);
        }
    }

    static final int LONGUEUR_CELLULE = 1000;
    private static final Pattern CODE_AGENCE = Pattern.compile("[A-Za-z0-9_-]{1,20}");
    private static final Pattern CIP = Pattern.compile("\\d{7,14}");

    private ListesUbipharmParseur() {
    }

    /* ================================================================ lignes */

    /** Ligne venue d'une reponse JSON (tableau de cellules HTML). */
    public static Ligne ligne(ListeUbipharm l, int position, String agence, JSONArray cellules)
            throws ExtranetException {
        if (cellules.length() <= l.indexMax()) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    l.libelle + " : ligne " + (position + 1) + " de " + cellules.length() + " cellules, au moins "
                            + (l.indexMax() + 1) + " attendues");
        }
        List<String> html = new ArrayList<>();
        for (int i = 0; i < cellules.length(); i++) {
            html.add(cellules.isNull(i) ? "" : String.valueOf(cellules.get(i)));
        }
        return construire(l, position, agence, html);
    }

    /** Lignes du tableau d'une page HTML, apres controle des titres de colonne. */
    public static List<Ligne> page(ListeUbipharm l, String htmlPage) throws ExtranetException {
        Document d = Jsoup.parse(htmlPage == null ? "" : htmlPage);
        d.select("script, noscript, template").remove();
        Element table = d.selectFirst("table" + l.selecteur);
        if (table == null) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    l.libelle + " : tableau introuvable sur la page (page modifiée ou session expirée)");
        }
        controlerTitres(l, table);
        List<Ligne> r = new ArrayList<>();
        for (Element tr : table.select("> tbody > tr")) {
            Elements tds = tr.select("> td");
            if (tds.size() == 1 && tds.first().hasAttr("colspan")) {
                /* ligne « aucune donnee » de DataTables */
                continue;
            }
            if (tds.size() <= l.indexMax()) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                        l.libelle + " : ligne " + (r.size() + 1) + " de " + tds.size() + " cellules, au moins "
                                + (l.indexMax() + 1) + " attendues");
            }
            List<String> html = new ArrayList<>();
            for (Element td : tds) {
                html.add(td.html());
            }
            r.add(construire(l, r.size(), null, html));
        }
        return r;
    }

    /** Codes des agences (identifiants des tableaux) de la page des dernieres commandes. */
    public static List<String> agences(ListeUbipharm l, String htmlPage) throws ExtranetException {
        Document d = Jsoup.parse(htmlPage == null ? "" : htmlPage);
        d.select("script, noscript, template").remove();
        List<String> r = new ArrayList<>();
        for (Element t : d.select(l.selecteur)) {
            String id = t.id().trim();
            if (!CODE_AGENCE.matcher(id).matches()) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                        l.libelle + " : code d'agence inattendu");
            }
            if (!r.contains(id)) {
                r.add(id);
            }
        }
        if (r.isEmpty()) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    l.libelle + " : aucune agence sur la page (page modifiée ou session expirée)");
        }
        return r;
    }

    private static void controlerTitres(ListeUbipharm l, Element table) throws ExtranetException {
        Element entete = table.selectFirst("> thead > tr");
        List<String> titres = new ArrayList<>();
        if (entete != null) {
            for (Element th : entete.children()) {
                titres.add(NouveauxProduitsParseur.sansAccent(Normalisation.texte(th.text())));
            }
        }
        for (Colonne c : l.colonnes()) {
            if (c.entete == null) {
                continue;
            }
            if (c.index >= titres.size() || !titres.get(c.index).contains(c.entete)) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                        l.libelle + " : colonne « " + c.titre + " » introuvable à sa place (page modifiée)");
            }
        }
    }

    private static Ligne construire(ListeUbipharm l, int position, String agence, List<String> html) {
        List<String> cellules = new ArrayList<>();
        String pscode = null, cip = null;
        if (l.mode == ListeUbipharm.Mode.JSON_PAR_AGENCE) {
            cellules.add(agence == null ? "" : agence);
        }
        List<String> colonnes = new ArrayList<>();
        for (Colonne c : l.colonnes()) {
            String h = html.get(c.index);
            switch (c.genre) {
            case PRODUIT:
                String[] p = produit(h);
                pscode = p[1];
                cip = p[2];
                colonnes.add(p[0]);
                colonnes.add(cip == null ? "" : cip);
                break;
            case DISPO:
                colonnes.add(dispo(h));
                break;
            case PALIERS:
                colonnes.add(paliers(h));
                break;
            default:
                colonnes.add(texte(h));
            }
        }
        if (l.aProduit()) {
            cellules.add(pscode == null ? "" : pscode);
        }
        cellules.addAll(colonnes);
        List<String> bornees = new ArrayList<>();
        for (String s : cellules) {
            bornees.add(s.length() > LONGUEUR_CELLULE ? s.substring(0, LONGUEUR_CELLULE) : s);
        }
        return new Ligne(position, agence, pscode, cip, bornees);
    }

    /* =============================================================== cellules */

    private static Element fragment(String html) {
        Document f = Jsoup.parseBodyFragment(html == null ? "" : html);
        f.select("script, noscript, template, input, select, button, textarea").remove();
        return f.body();
    }

    /** Texte affiche, bulles de stock retirees. */
    static String texte(String html) {
        Element b = fragment(html);
        b.select(".tooltip-stock, [class*=tip-viewStock]").remove();
        return Normalisation.texte(b.text());
    }

    /** { designation, pscode, cip } du lien produit ; pscode et cip null s'ils manquent. */
    static String[] produit(String html) {
        Element b = fragment(html);
        Element a = b.selectFirst("a.popup-produit");
        String designation, pscode = null, cip = null;
        if (a != null) {
            designation = Normalisation.texte(a.text());
            pscode = vide(a.attr("data-pscode")) ? null : Normalisation.texte(a.attr("data-pscode"));
        } else {
            Element k = b.clone();
            k.select(".td-detail").remove();
            designation = Normalisation.texte(k.text());
        }
        Element detail = b.selectFirst(".td-detail");
        if (detail != null) {
            /* « CODE - 3000001262862 » : le CIP est le dernier groupe de chiffres */
            String t = Normalisation.texte(detail.text());
            int i = t.lastIndexOf(" - ");
            String fin = (i >= 0 ? t.substring(i + 3) : t).replaceAll("\\s+", "");
            if (CIP.matcher(fin).matches()) {
                cip = fin;
            }
        }
        return new String[] { designation, pscode, cip };
    }

    /** « En stock — BKE : Oui, GNA : Non » : etiquette puis disponibilite par agence de la bulle. */
    static String dispo(String html) {
        Element b = fragment(html);
        Element etiquette = b.selectFirst(".tooltip-stock-link");
        StringBuilder s = new StringBuilder(etiquette == null ? "" : Normalisation.texte(etiquette.text()));
        List<String> agences = new ArrayList<>();
        for (Element ag : b.select("[data-etcoda]")) {
            Element d = ag.selectFirst(".tip-viewStock-dispo");
            agences.add(Normalisation.texte(ag.attr("data-etcoda")) + " : "
                    + (d == null ? "?" : Normalisation.texte(d.text())));
        }
        if (!agences.isEmpty()) {
            s.append(s.length() > 0 ? " — " : "").append(String.join(", ", agences));
        }
        if (s.length() == 0) {
            b.select(".tooltip-stock, [class*=tip-viewStock]").remove();
            return Normalisation.texte(b.text());
        }
        return s.toString();
    }

    /** « 20 U → 2 UG ; 50 U → 6 UG » : un palier par bloc. */
    static String paliers(String html) {
        Element b = fragment(html);
        b.select(".tooltip-stock, [class*=tip-viewStock]").remove();
        List<String> l = new ArrayList<>();
        for (Element bloc : b.select("> div")) {
            String t = Normalisation.texte(bloc.text());
            if (!t.isEmpty()) {
                l.add(bloc.selectFirst("i.fa-arrow-right, i[class*=arrow]") != null ? fleche(bloc) : t);
            }
        }
        return l.isEmpty() ? Normalisation.texte(b.text()) : String.join(" ; ", l);
    }

    /** Texte d'un palier, l'icone fleche remplacee par « → ». */
    private static String fleche(Element bloc) {
        Element k = bloc.clone();
        for (Element i : k.select("i")) {
            i.replaceWith(new org.jsoup.nodes.TextNode(" → "));
        }
        return Normalisation.texte(k.text());
    }

    private static boolean vide(String s) {
        return s == null || s.trim().isEmpty();
    }
}
