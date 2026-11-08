package rest.service.extranet.ubipharm;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Jeux d'essai des listes Ubipharm, au balisage releve le 08/11 (valeurs tirees avec une graine fixe, jamais de donnee
 * reelle) : chaque ligne porte ses valeurs attendues (cellules affichees) et son rendu HTML ou JSON.
 */
final class ListesUbipharmJeuEssai {

    static final String[] AGENCES = { "BKE", "GNA", "VRI", "YOP" };
    private static final String[] MOTS = { "PARACETAMOL", "Gel", "douche", "ÉCLAT", "1000ML", "B/20", "500MG", "&",
            "<sirop>", "\"forte\"", "L'été", "x/90", "crème", "50%", "N°3" };
    private static final String[] DISPOS = { "Oui", "Non", "N/A", "Faible" };

    /** Ligne generee : cellules attendues apres lecture, et cellules HTML telles que servies par la page. */
    static final class Ligne {
        final List<String> attendu = new ArrayList<>();
        final List<String> html = new ArrayList<>();
        String agence, pscode, cip;
    }

    private ListesUbipharmJeuEssai() {
    }

    static String mots(Random r, int min, int max) {
        int n = min + r.nextInt(max - min + 1);
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < n; i++) {
            s.append(i > 0 ? " " : "").append(MOTS[r.nextInt(MOTS.length)]);
        }
        return s.toString();
    }

    static String esc(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    static String date(Random r) {
        return String.format("%02d/%02d/20%02d", 1 + r.nextInt(28), 1 + r.nextInt(12), 20 + r.nextInt(8));
    }

    static String montant(Random r) {
        int v = r.nextInt(5) == 0 ? 0 : r.nextInt(9_000_000);
        return String.format(java.util.Locale.ROOT, "%,d", v).replace(',', ' ');
    }

    static String pscode(Random r) {
        return (r.nextBoolean() ? "PARA" : "ABZ") + r.nextInt(99999);
    }

    static String cip(Random r) {
        return "3000" + String.format("%09d", r.nextInt(1_000_000_000));
    }

    /* ----------------------------------------------------------- cellules */

    static String menu() {
        return "<a href='#' class='dropdown-toggle'><i class='fa fa-bars'></i></a><ul class='dropdown-menu'>"
                + "<li><a href='#' onclick='voirPdf(123456)'>Voir le PDF</a></li></ul>";
    }

    static String saisie(int i) {
        return "<input type='hidden' name='cip_" + i + "' value='1'><input class='touchspin' name='qtt_" + i
                + "' value='0'><input type='hidden' name='pscode_" + i + "' value='X'>";
    }

    /** Cellule produit ; cip null : pas de detail. */
    static String produit(String designation, String pscode, String cip) {
        return "<a class='popup-produit' data-pscode=\"" + esc(pscode) + "\" data-sheettype=\"\" href='#'>"
                + esc(designation) + "</a>"
                + (cip == null ? "" : "<div class='td-detail'>" + pscode + " - " + cip + "</div>");
    }

    /** Cellule disponibilite : etiquette + bulle par agence ; rend aussi le texte attendu. */
    static String[] dispo(Random r, String pscode) {
        String etiquette = r.nextBoolean() ? "En stock" : "Rupture";
        StringBuilder h = new StringBuilder("<span class='badge badge-sm badge-primary tooltip-stock-link'"
                + " data-toggle=\"tooltip-stock\">" + etiquette + "</span><div class=\"tooltip-stock\">"
                + "<div class=\"tip-viewStock-cip\" id=\"tip-stock-cip-" + pscode + "\">CIP: 3000000000000</div>"
                + "<div class=\"tip-viewStock\" id=\"tip-stock-" + pscode + "\">");
        List<String> attendu = new ArrayList<>();
        for (String a : AGENCES) {
            if (r.nextInt(5) == 0) {
                continue;
            }
            String d = DISPOS[r.nextInt(DISPOS.length)];
            h.append("<div class=\"tip-viewStock-lgetlib\" data-etcoda=\"").append(a).append("\" data-colisage=\"")
                    .append(1 + r.nextInt(500)).append("\"><span class=\"tip-viewStock-etlib\">UBIPHARM ").append(a)
                    .append("</span><span class=\"tip-viewStock-dispo text-success\">").append(d)
                    .append("</span><span class=\"tip-viewStock-colisagelib\">Colisage</span>")
                    .append("<span class=\"tip-viewStock-colisage\">12, 24</span></div>");
            attendu.add(a + " : " + d);
        }
        h.append("</div></div>");
        String t = etiquette + (attendu.isEmpty() ? "" : " — " + String.join(", ", attendu));
        return new String[] { h.toString(), t };
    }

    /** Paliers d'UG : 1 a 3 paliers (ou aucun : cellule vide). */
    static String[] paliers(Random r, String pscode) {
        int n = r.nextInt(4);
        StringBuilder h = new StringBuilder();
        List<String> attendu = new ArrayList<>();
        int q = 0;
        for (int i = 0; i < n; i++) {
            q += 1 + r.nextInt(100);
            int ug = r.nextInt(30);
            h.append("<div class='ml-1'><a href='#' class='link-qtt-promo' data-pscode='").append(pscode)
                    .append("' data-qtt='").append(q).append("'>").append(q).append(" <small>U</small></a> ")
                    .append("<i class='fal fa-arrow-right'></i> ").append(ug).append(" <small>UG</small></div>");
            attendu.add(q + " U → " + ug + " UG");
        }
        return new String[] { h.toString(), String.join(" ; ", attendu) };
    }

    static String prix(Random r) {
        return "<div class='td-main cell-pspven'>" + r.nextInt(99999) + " <small>CFA</small></div>"
                + "<div class='td-detail'>Prix TTC* : <span class='cell-pspttc'>" + r.nextInt(99999)
                + " <small>CFA</small></span></div><input type=\"hidden\" name=\"pspven_0\" value=\"198.0\" />";
    }

    /* -------------------------------------------------------------- lignes */

    /** Une ligne de la liste, valeurs variees (vides, zeros, caracteres speciaux, dates, montants). */
    static Ligne ligne(ListeUbipharm l, Random r, int i, String agence) {
        Ligne x = new Ligne();
        x.agence = agence;
        if (l.mode == ListeUbipharm.Mode.JSON_PAR_AGENCE) {
            x.attendu.add(agence);
        }
        String ps = pscode(r);
        String cip = r.nextInt(6) == 0 ? null : cip(r);
        String designation = mots(r, 1, 6);
        int largeur = l.colonnes().stream().mapToInt(c -> c.index).max().getAsInt() + 1
                + (l == ListeUbipharm.PRODUITS_UG || l == ListeUbipharm.PLUS_ACHETES ? 1 : 0);
        String[] cellules = new String[largeur];
        for (int c = 0; c < largeur; c++) {
            cellules[c] = c == 0 ? menu() : saisie(i);
        }
        if (l.aProduit()) {
            x.pscode = ps;
            x.cip = cip;
            x.attendu.add(ps);
        }
        for (ListeUbipharm.Colonne c : l.colonnes()) {
            switch (c.genre) {
            case PRODUIT:
                cellules[c.index] = produit(designation, ps, cip);
                x.attendu.add(designation);
                x.attendu.add(cip == null ? "" : cip);
                break;
            case DISPO:
                String[] d = dispo(r, ps);
                cellules[c.index] = d[0];
                x.attendu.add(d[1]);
                break;
            case PALIERS:
                String[] p = paliers(r, ps);
                cellules[c.index] = p[0];
                x.attendu.add(p[1]);
                break;
            default:
                String v;
                if (c.titre.startsWith("Prix")) {
                    cellules[c.index] = prix(r);
                    v = null;
                } else if (c.titre.contains("Date") || c.titre.equals("Début") || c.titre.equals("Fin")) {
                    v = date(r)
                            + (r.nextBoolean() ? " " + String.format("%02d:%02d", r.nextInt(24), r.nextInt(60)) : "");
                } else if (c.titre.contains("Montant")) {
                    v = montant(r) + (r.nextBoolean() ? " CFA" : "");
                } else if (c.titre.startsWith("N°") || c.titre.startsWith("Quantit")) {
                    v = String.valueOf(r.nextInt(5) == 0 ? 0 : r.nextInt(9_999_999));
                } else {
                    v = r.nextInt(8) == 0 ? "" : mots(r, 1, 4);
                }
                if (v != null) {
                    cellules[c.index] = r.nextBoolean() ? esc(v) : "<span class='x'>" + esc(v) + "</span>";
                    x.attendu.add(v);
                } else {
                    x.attendu.add(ListesUbipharmParseur.texte(cellules[c.index]));
                }
            }
        }
        for (String h : cellules) {
            x.html.add(h);
        }
        return x;
    }

    static List<Ligne> generer(ListeUbipharm l, Random r, int n, String agence) {
        List<Ligne> a = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            a.add(ligne(l, r, i, agence));
        }
        return a;
    }

    /* -------------------------------------------------------------- rendus */

    /** Titres des colonnes de la page, tels que releves. */
    static String[] titres(ListeUbipharm l) {
        switch (l) {
        case PROMOTIONS:
            return new String[] { "", "", "Libellé", "Type", "Date de début", "Date de fin" };
        case PRODUITS_SUPPRIMES:
            return new String[] { "Libellé du produit", "Date de suppression", "Statut", "Dispo", "Qte" };
        case FACTURES:
            return new String[] { "", "N° Facture", "Ref Commande", "Date", "Montant (CFA)" };
        case COMMANDES_EXTRANET:
            return new String[] { "", "N° commande", "Etablissement", "Réf. commande", "Description", "Utilisateur",
                    "Date" };
        default:
            throw new IllegalArgumentException(l.name());
        }
    }

    /** Page HTML complete (scripts et formulaires de commande compris, jamais executes). */
    static String page(ListeUbipharm l, List<Ligne> lignes) {
        StringBuilder h = new StringBuilder("<html><head><script>var x = '<table id=\"faux\">';</script></head><body>"
                + "<form method='post' action='/RechercheProduits'><input name='motifRecherche'></form>"
                + "<form method='post' action='AjoutProduitsCommande'><table id=\"" + l.selecteur.substring(1)
                + "\"><thead><tr>");
        for (String t : titres(l)) {
            h.append("<th>").append(esc(t)).append("</th>");
        }
        h.append("</tr></thead><tbody>");
        if (lignes.isEmpty()) {
            h.append("<tr><td colspan='").append(titres(l).length).append("'>Aucune donnée</td></tr>");
        }
        for (Ligne x : lignes) {
            h.append("<tr>");
            for (String c : x.html) {
                h.append("<td>").append(c).append("</td>");
            }
            h.append("</tr>");
        }
        return h.append("</tbody></table></form></body></html>").toString();
    }

    /** Reponse JSON (enveloppe msg + datatables). */
    static JSONObject json(List<Ligne> lignes, int total, int draw) {
        JSONArray data = new JSONArray();
        for (Ligne x : lignes) {
            data.put(new JSONArray(x.html));
        }
        return new JSONObject().put("msg", new JSONArray()).put("datatables", new JSONObject()
                .put("recordsTotal", total).put("recordsFiltered", total).put("data", data).put("draw", draw));
    }

    static String pageAgences(String... agences) {
        StringBuilder h = new StringBuilder("<html><body>");
        for (String a : agences) {
            h.append("<h4>Agence ").append(a).append("</h4><table class='lastCde table' id='").append(a)
                    .append("'><thead><tr><th></th><th>N° commande</th></tr></thead></table>");
        }
        return h.append("</body></html>").toString();
    }
}
