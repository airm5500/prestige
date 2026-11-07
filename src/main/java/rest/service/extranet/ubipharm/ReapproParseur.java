package rest.service.extranet.ubipharm;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.Normalisation;

/**
 * Lecture d'une ligne de {@code /ReturnProduitsReapproJSON} : six cellules HTML (plan du 07/11, §6 et sélecteurs du
 * §3).
 * <ol start="0">
 * <li>produit : {@code a.popup-produit} ({@code data-pscode}, texte = designation), {@code .td-detail} (code,
 * categorie) ;</li>
 * <li>date affichee (sens non interprete) ;</li>
 * <li>code agence ;</li>
 * <li>statut ;</li>
 * <li>disponibilites par agence : {@code .tip-viewStock-lgetlib}, {@code .tip-viewStock-etlib},
 * {@code .tip-viewStock-dispo}, {@code .tip-viewStock-colisage}, {@code data-etcoda}, {@code data-colisage} ;</li>
 * <li>saisie de commande : on n'en lit QUE les champs caches pscode, cip ({@code cip_*}) et etcoda.</li>
 * </ol>
 * Le balisage exact n'a pas ete capture : la lecture est TOLERANTE (valeur introuvable = null, cellule brute gardee).
 * Parseur DOM (jsoup), entites decodees, scripts jamais executes ni lus.
 */
public final class ReapproParseur {

    public static final int CELLULES = 6;

    private ReapproParseur() {
    }

    /** Une ligne ; moins de six cellules : REPONSE_INATTENDUE. */
    public static LigneReapproUbipharm ligne(int position, JSONArray cellules) throws ExtranetException {
        if (cellules == null || cellules.length() < CELLULES) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "Ligne " + (position + 1) + " : "
                    + (cellules == null ? 0 : cellules.length()) + " cellules pour " + CELLULES + " attendues");
        }
        List<String> brutes = new ArrayList<>();
        for (int i = 0; i < cellules.length(); i++) {
            Object o = cellules.opt(i);
            brutes.add(o == null || o == JSONObject.NULL ? null : String.valueOf(o));
        }

        /* colonne 0 : produit */
        Document c0 = fragment(brutes.get(0));
        String pscode = null;
        String designation = null;
        List<String> details = new ArrayList<>();
        if (c0 != null) {
            Element lien = c0.selectFirst("a.popup-produit");
            if (lien != null) {
                pscode = lien.hasAttr("data-pscode") ? Normalisation.texte(lien.attr("data-pscode")) : null;
                designation = Normalisation.texte(lien.text());
            }
            for (Element d : c0.select(".td-detail")) {
                details.add(Normalisation.texte(d.text()));
            }
        }

        /* colonnes 1 a 3 : textes */
        String dateAffichee = texte(brutes.get(1));
        String codeAgence = texte(brutes.get(2));
        String statut = texte(brutes.get(3));

        /* colonne 4 : disponibilites par agence */
        List<LigneReapproUbipharm.DisponibiliteAgence> dispos = new ArrayList<>();
        Document c4 = fragment(brutes.get(4));
        if (c4 != null) {
            for (Element bloc : blocsAgence(c4)) {
                dispos.add(agence(bloc));
            }
        }

        /* colonne 5 : seulement les champs caches pscode, cip, etcoda */
        String psCache = null, cipCache = null, etCache = null;
        Document c5 = fragment(brutes.get(5));
        if (c5 != null) {
            for (Element in : c5.select("input[type=hidden]")) {
                String nom = prefixe(in.attr("name"));
                String val = in.hasAttr("value") ? Normalisation.texte(in.attr("value")) : null;
                if ("pscode".equals(nom) && psCache == null) {
                    psCache = val;
                } else if ("cip".equals(nom) && cipCache == null) {
                    cipCache = val;
                } else if ("etcoda".equals(nom) && etCache == null) {
                    etCache = val;
                }
            }
        }

        return new LigneReapproUbipharm(position, pscode, designation, details, dateAffichee,
                Normalisation.date(dateAffichee), codeAgence, statut, dispos, psCache, cipCache, etCache, brutes);
    }

    /**
     * Blocs d'agence : chaque {@code .tip-viewStock-lgetlib} ; a defaut, chaque element portant {@code data-etcoda} ; a
     * defaut, un bloc par {@code .tip-viewStock-etlib}.
     */
    private static List<Element> blocsAgence(Document d) {
        Elements b = d.select(".tip-viewStock-lgetlib");
        if (b.isEmpty()) {
            b = d.select("[data-etcoda]");
        }
        if (b.isEmpty()) {
            b = d.select(".tip-viewStock-etlib");
        }
        List<Element> r = new ArrayList<>();
        for (Element e : b) {
            /* un bloc contenu dans un autre bloc deja retenu n'est pas compte deux fois */
            boolean inclus = false;
            for (Element p : e.parents()) {
                if (b.contains(p)) {
                    inclus = true;
                    break;
                }
            }
            if (!inclus) {
                r.add(e);
            }
        }
        return r;
    }

    private static LigneReapproUbipharm.DisponibiliteAgence agence(Element bloc) {
        String etcode = attribut(bloc, "data-etcoda");
        Element lib = premier(bloc, ".tip-viewStock-etlib");
        Element dispo = premier(bloc, ".tip-viewStock-dispo");
        Element col = premier(bloc, ".tip-viewStock-colisage");
        String colTexte = col == null ? null : Normalisation.texte(col.text());
        String dataCol = col != null && col.hasAttr("data-colisage") ? col.attr("data-colisage")
                : attribut(bloc, "data-colisage");
        return new LigneReapproUbipharm.DisponibiliteAgence(etcode,
                lib == null ? null : Normalisation.texte(lib.text()),
                dispo == null ? null : Normalisation.texte(dispo.text()), Normalisation.colisages(colTexte), colTexte,
                dataCol);
    }

    /** L'element lui-meme s'il correspond, sinon son premier descendant correspondant. */
    private static Element premier(Element bloc, String selecteur) {
        return bloc.is(selecteur) ? bloc : bloc.selectFirst(selecteur);
    }

    private static String attribut(Element bloc, String nom) {
        if (bloc.hasAttr(nom)) {
            return bloc.attr(nom);
        }
        Element e = bloc.selectFirst("[" + nom + "]");
        return e == null ? null : e.attr(nom);
    }

    /** « cip_FAIR248 », « cip[3] », « etcoda-1 » → « cip », « etcoda ». */
    static String prefixe(String nom) {
        if (nom == null) {
            return "";
        }
        String n = nom.trim().toLowerCase(Locale.ROOT);
        int i = 0;
        while (i < n.length() && Character.isLetter(n.charAt(i))) {
            i++;
        }
        return n.substring(0, i);
    }

    private static Document fragment(String html) {
        if (html == null) {
            return null;
        }
        Document d = Jsoup.parseBodyFragment(html);
        d.select("script, style, noscript, template").remove();
        return d;
    }

    /** Texte d'une cellule : null si absente, "" si vide, entites decodees, scripts retires. */
    static String texte(String html) {
        Document d = fragment(html);
        return d == null ? null : Normalisation.texte(d.body().text());
    }
}
