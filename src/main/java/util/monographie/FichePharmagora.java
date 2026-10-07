package util.monographie;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * LECTURE DES FICHES DS PHARMAGORA (monographies VIDAL), retours du 07/10. Calcul pur, sans reseau
 * (FichePharmagoraTest, sur des pages reelles) : le site n'a pas d'API, ses pages HTML (ISO-8859-1) sont lues ici.
 *
 * <ul>
 * <li>{@code qPX.php3?cbCprod=<produit>&curRub=<n>} : titre, presentations, rubriques disponibles et contenu de la
 * rubrique (0 proprietes, 1 posologie, 2 contre-indications et precautions, 3 interactions, 4 mises en garde, 5 effets
 * indesirables et surdosage, 6 indications et composition) ;</li>
 * <li>rubrique 3 : pour chaque classe du produit, les classes avec lesquelles il interagit, le niveau (titre de la
 * bulle et couleur de la pastille), l'analyse et les conseils au prescripteur et au dispensateur ;</li>
 * <li>recherche par CIP : le premier produit (ou la premiere presentation) trouve dans la page.</li>
 * </ul>
 * Accents : une partie du texte arrive en UTF-8 lu comme ISO-8859-1 (« PrÃ©caution ») et est reparee ; une autre arrive
 * deja abimee a la source (« Parac?tamol ») : elle est laissee telle quelle et signalee ({@code accentsPerdus}).
 */
public final class FichePharmagora {

    public static final Map<Integer, String> RUBRIQUES = new LinkedHashMap<>();

    static {
        RUBRIQUES.put(6, "Indications, composition");
        RUBRIQUES.put(0, "Propriétés thérapeutiques");
        RUBRIQUES.put(1, "Posologie");
        RUBRIQUES.put(2, "Contre-indications, précautions");
        RUBRIQUES.put(4, "Mises en garde");
        RUBRIQUES.put(5, "Effets indésirables, surdosage");
        RUBRIQUES.put(3, "Interactions");
    }

    private static final Pattern TITRE = Pattern.compile("<p class=\"entete\"><b>(.*?)</b>", Pattern.DOTALL);
    private static final Pattern PRESENTATION = Pattern
            .compile("<a class=\"disp\" href=\"qUV\\.php3\\?cbCuvSemp=([^\"&]+)\">(.*?)</a>", Pattern.DOTALL);
    private static final Pattern MENU = Pattern
            .compile("qPX\\.php3\\?cbCprod=(\\w+)&(?:amp;)?curRub=(\\d+)\"><font[^>]*>(.*?)</font>", Pattern.DOTALL);
    private static final Pattern CORPS = Pattern.compile(
            "<!--\\s*Espace fiche\\s*-->\\s*<td>(.*)</td>\\s*</tr>\\s*</table>\\s*</body>",
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
    private static final Pattern CLASSE = Pattern.compile(
            "<td bgcolor=\"white\" valign=\"top\">\\s*<p><a class=\"disp\" href=\"[^\"]*\">(.*?)</a></p>",
            Pattern.DOTALL);
    private static final Pattern INTERACTION = Pattern.compile(
            "EnterContent\\('ToolTip','((?:[^'\\\\]|\\\\.)*)','((?:[^'\\\\]|\\\\.)*)'\\).*?<img src=\"ImagesAppli/(\\w+)\\.GIF\">"
                    + ".*?<a class=\"disp\" href=\"[^\"]*\">(.*?)</a>",
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
    private static final Pattern BLOC_CONSEIL = Pattern.compile("<p><b>(.*?)</b><br/><small>(.*?)</small></p>",
            Pattern.DOTALL);
    private static final Pattern MOJIBAKE = Pattern
            .compile("[\\u00C2-\\u00DF][\\u0080-\\u00BF]|[\\u00E0-\\u00EF][\\u0080-\\u00BF]{2}");
    private static final Pattern ACCENT_PERDU = Pattern.compile("\\p{L}\\?\\p{L}|\\p{L}\\? \\p{L}");

    private FichePharmagora() {
    }

    /**
     * Fiche d'une rubrique : {produit, titre, rubrique, rubriques[], presentations[], paragraphes[] ou interactions[]}.
     */
    public static JSONObject lireFiche(String html, int rubrique) {
        JSONObject o = new JSONObject().put("rubrique", rubrique).put("libelleRubrique",
                RUBRIQUES.getOrDefault(rubrique, "Rubrique " + rubrique));
        Matcher t = TITRE.matcher(html);
        o.put("titre", t.find() ? texte(t.group(1)) : "");
        JSONArray pres = new JSONArray();
        Matcher p = PRESENTATION.matcher(html);
        while (p.find()) {
            pres.put(new JSONObject().put("code", p.group(1).trim()).put("libelle", texte(p.group(2))));
        }
        o.put("presentations", pres);
        JSONArray rub = new JSONArray();
        Matcher m = MENU.matcher(html);
        String produit = null;
        while (m.find()) {
            produit = m.group(1);
            rub.put(new JSONObject().put("numero", Integer.parseInt(m.group(2))).put("libelle", texte(m.group(3))));
        }
        o.put("produit", produit == null ? JSONObject.NULL : produit).put("rubriques", rub);
        Matcher c = CORPS.matcher(html);
        String corps = c.find() ? c.group(1) : "";
        boolean perdus;
        if (rubrique == 3) {
            JSONArray inter = interactions(corps);
            o.put("interactions", inter);
            perdus = ACCENT_PERDU.matcher(inter.toString()).find();
        } else {
            JSONArray par = paragraphes(corps);
            o.put("paragraphes", par);
            perdus = ACCENT_PERDU.matcher(par.toString()).find();
        }
        return o.put("accentsPerdus", perdus);
    }

    /** Recherche par CIP : code produit (cbCprod) ou, a defaut, code de presentation (cbCuvSemp) ; null si rien. */
    public static JSONObject lireRecherche(String html) {
        Matcher m = Pattern.compile("cbCprod=(\\w+)").matcher(html);
        if (m.find()) {
            return new JSONObject().put("produit", m.group(1));
        }
        Matcher u = Pattern.compile("cbCuvSemp=(\\w+)").matcher(html);
        return u.find() ? new JSONObject().put("presentation", u.group(1)) : null;
    }

    static JSONArray paragraphes(String corps) {
        String s = corps.replaceAll("(?i)<br\\s*/?>", "\n").replaceAll("(?i)</p>", "\n")
                .replaceAll("(?is)<!DOCTYPE[^>]*>", "");
        JSONArray a = new JSONArray();
        String precedent = null;
        for (String ligne : texte(s).split("\n")) {
            String l = ligne.replaceAll("[ \\t\\u00A0]+", " ").trim();
            /* « POSOLOGIE : POSOLOGIE : » : le titre de section est double dans la source */
            l = l.replaceAll("^([A-Z' ÉÈÀ]{4,}) : \\1 :", "$1 :").trim();
            if (l.isEmpty() || l.equals(precedent)) {
                continue;
            }
            a.put(l);
            precedent = l;
        }
        return a;
    }

    static JSONArray interactions(String corps) {
        JSONArray out = new JSONArray();
        List<int[]> positions = new ArrayList<>();
        List<String> noms = new ArrayList<>();
        Matcher c = CLASSE.matcher(corps);
        while (c.find()) {
            positions.add(new int[] { c.start(), c.end() });
            noms.add(texte(c.group(1)));
        }
        for (int i = 0; i < noms.size(); i++) {
            int fin = i + 1 < positions.size() ? positions.get(i + 1)[0] : corps.length();
            String bloc = corps.substring(positions.get(i)[1], fin);
            JSONArray avec = new JSONArray();
            Matcher m = INTERACTION.matcher(bloc);
            while (m.find()) {
                String niveau = texte(js(m.group(1)));
                JSONObject x = new JSONObject().put("classe", texte(m.group(4))).put("niveau", niveau)
                        .put("gravite", gravite(niveau, m.group(3))).put("pastille", m.group(3));
                Matcher b = BLOC_CONSEIL.matcher(js(m.group(2)));
                while (b.find()) {
                    String titre = texte(b.group(1)).toLowerCase();
                    String v = texte(b.group(2));
                    if (titre.contains("analyse")) {
                        x.put("analyse", v);
                    } else if (titre.contains("prescripteur")) {
                        x.put("conseilPrescripteur", v);
                    } else if (titre.contains("dispensateur")) {
                        x.put("conseilDispensateur", v);
                    }
                }
                avec.put(x);
            }
            out.put(new JSONObject().put("classe", noms.get(i)).put("avec", avec));
        }
        return out;
    }

    /** 4 contre-indication, 3 association deconseillee, 2 precaution d'emploi, 1 a prendre en compte, 0 inconnu. */
    public static int gravite(String niveau, String pastille) {
        String n = niveau == null ? "" : niveau.toLowerCase();
        if (n.startsWith("contre")) {
            return 4;
        }
        if (n.contains("conseill")) {
            return 3;
        }
        if (n.startsWith("pr")) {
            return 2;
        }
        if (n.contains("prendre en compte")) {
            return 1;
        }
        String p = pastille == null ? "" : pastille.toLowerCase();
        return p.contains("rouge") || p.contains("noir") ? 4 : p.contains("orange") ? 3 : p.contains("jaune") ? 2 : 0;
    }

    private static String js(String s) {
        return s.replace("\\'", "'").replace("\\\"", "\"").replace("\\\\", "\\");
    }

    /** Balises retirees, entites decodees, accents en UTF-8 lus comme ISO-8859-1 repares. */
    static String texte(String html) {
        String s = html.replaceAll("(?s)<\\?xml[^>]*\\?>", "").replaceAll("(?s)<[^>]+>", "");
        s = entites(s);
        return reparer(s).trim();
    }

    static String reparer(String s) {
        Matcher m = MOJIBAKE.matcher(s);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String brut = m.group();
            String repare = new String(brut.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
            m.appendReplacement(sb, Matcher.quoteReplacement(repare.contains("�") ? brut : repare));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static String entites(String s) {
        Matcher m = Pattern.compile("&#(x?)([0-9A-Fa-f]+);").matcher(s);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            int cp = Integer.parseInt(m.group(2), m.group(1).isEmpty() ? 10 : 16);
            m.appendReplacement(sb, Matcher.quoteReplacement(new String(Character.toChars(cp))));
        }
        m.appendTail(sb);
        return sb.toString().replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&nbsp;", " ")
                .replace("&apos;", "'").replace("&amp;", "&");
    }
}
