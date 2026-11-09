package rest.service.extranet.mayite;

import org.json.JSONArray;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Monographie d'une specialite Mayite (releve du 08/11) : GET /pro/medicament/detail/{id}/. Page HTML : h1 = nom ; h3 «
 * DCI: ... » et « Prix: ... FCFA » ; onglet Monographie = blocs .cbp_tmlabel (h3 = rubrique, puis le texte) : Formes,
 * Proprietes, Indications, Contre indications et Interactions, Posologie, Effets secondaires, Remarques, Precautions...
 * ; onglet « Specialites correspondantes » = table Specialite / Prix / lien vers la fiche. Lecture seule, rien n'est
 * journalise du contenu.
 */
public final class MonographieMayite {

    static final int TEXTE_MAX = 20000;
    static final int EQUIVALENTS_MAX = 300;

    private MonographieMayite() {
    }

    public static String chemin(String id) {
        return "/pro/medicament/detail/" + id + "/";
    }

    public static JSONObject lire(TransportExtranet t, String id) throws ExtranetException {
        if (!RechercheMayite.identifiantValide(id)) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "Identifiant Mayité invalide");
        }
        String html = t.lire(chemin(id), null, TransportExtranet.Attendu.HTML, RechercheMayite.REFERER).texte();
        return lire(html, id);
    }

    /** {id, nom, dci, prix, rubriques:[{titre, texte}], equivalents:[{id, nom, prix}]}. */
    static JSONObject lire(String html, String id) throws ExtranetException {
        Document d = Jsoup.parse(html);
        Element h1 = d.selectFirst("section.content-header h1, h1");
        JSONArray rubriques = new JSONArray();
        for (Element bloc : d.select(".cbp_tmlabel")) {
            Element h3 = bloc.selectFirst("h3");
            if (h3 == null) {
                continue;
            }
            StringBuilder sb = new StringBuilder();
            for (Element e : bloc.children()) {
                if (e != h3) {
                    String x = texteMultiligne(e);
                    if (!x.isEmpty()) {
                        sb.append(sb.length() > 0 ? "\n" : "").append(x);
                    }
                }
            }
            rubriques.put(new JSONObject().put("titre", h3.text().trim()).put("texte", borne(sb.toString())));
        }
        if (h1 == null || rubriques.length() == 0) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Mayité : page de monographie non reconnue");
        }
        String dci = "", prix = "";
        for (Element h3 : d.select("h3")) {
            String s = h3.text().trim();
            if (s.matches("(?i)^DCI\\s*:.*")) {
                dci = s.replaceFirst("(?i)^DCI\\s*:\\s*", "");
            } else if (s.matches("(?i)^Prix\\s*:.*")) {
                prix = s.replaceFirst("(?i)^Prix\\s*:\\s*", "");
            }
        }
        JSONArray eq = new JSONArray();
        for (Element table : d.select("table")) {
            if (!table.select("th").text().toLowerCase().contains("spécialité")) {
                continue;
            }
            for (Element tr : table.select("tbody tr")) {
                if (eq.length() >= EQUIVALENTS_MAX) {
                    break;
                }
                Element lien = tr.selectFirst("a[href*=/pro/medicament/detail/]");
                String eid = lien == null ? null : RechercheMayite.identifiant(lien.attr("href"));
                if (eid == null || tr.children().size() < 2) {
                    continue;
                }
                eq.put(new JSONObject().put("id", eid).put("nom", tr.child(0).text().trim()).put("prix",
                        RechercheMayite.prix(tr.child(1).text().replace(" ", "").replace(",", "."))));
            }
        }
        return new JSONObject().put("id", id).put("nom", h1.text().trim()).put("dci", dci).put("prix", prix)
                .put("rubriques", rubriques).put("equivalents", eq);
    }

    /** Texte d'un element en gardant les retours a la ligne (br, paragraphes, listes). */
    static String texteMultiligne(Element e) {
        Element c = e.clone();
        c.select("br").after("\n");
        c.select("p, li, div, dd, dt, tr").after("\n");
        StringBuilder sb = new StringBuilder();
        for (String l : c.wholeText().split("\n")) {
            String x = l.replace(' ', ' ').trim().replaceAll("\\s+", " ");
            if (!x.isEmpty()) {
                sb.append(sb.length() > 0 ? "\n" : "").append(x);
            }
        }
        return sb.toString();
    }

    static String borne(String s) {
        return s.length() > TEXTE_MAX ? s.substring(0, TEXTE_MAX) + " …" : s;
    }
}
