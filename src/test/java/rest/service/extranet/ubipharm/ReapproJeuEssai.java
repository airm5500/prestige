package rest.service.extranet.ubipharm;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Jeu d'essai reconstitue de lignes de reapprovisionnement (structure du plan du 07/11, §6 et §3 ; a remplacer par des
 * captures). Chaque ligne generee garde ses valeurs attendues a cote de ses six cellules HTML.
 */
final class ReapproJeuEssai {

    static final String[][] AGENCES = { { "BKE", "BOUAKE" }, { "YOP", "ABIDJAN YOPOUGON" }, { "VRI", "ABIDJAN VRIDI" },
            { "GNA", "GAGNOA" }, { "SPE", "SAN-PEDRO" } };
    static final String[] DISPOS = { "En stock", "Oui", "Non", "N/A", "Rupture" };
    static final String[] STATUTS = { "Normal", "Rupture", "Arrêté", "Nouveau" };

    /** Valeurs attendues d'une agence. */
    static final class Agence {
        String etcode, etlib, dispo, colisageTexte, dataColisage;
        /** null : inconnu (N/A). */
        List<Integer> colisages;
    }

    /** Valeurs attendues d'une ligne. */
    static final class Ligne {
        String pscode, designation, code, categorie, dateAffichee, agence, statut, cip;
        int jour, mois, annee;
        boolean dateValide;
        final List<Agence> agences = new ArrayList<>();

        JSONArray cellules() {
            StringBuilder c0 = new StringBuilder("<a href='#' class='popup-produit' data-pscode='").append(attr(pscode))
                    .append("'>").append(html(designation)).append("</a>");
            if (code != null) {
                c0.append("<br><span class='td-detail'>").append(html(code)).append("</span>");
                if (categorie != null) {
                    c0.append("<br><span class='td-detail'>").append(html(categorie)).append("</span>");
                }
            }
            c0.append("<script>document.write('<b>PIEGE</b>')</script>");
            StringBuilder c4 = new StringBuilder("<div class='tip-viewStock'>");
            for (Agence a : agences) {
                c4.append("<div class='tip-viewStock-lgetlib' data-etcoda='").append(a.etcode).append("'>")
                        .append("<span class='tip-viewStock-etlib'>").append(html(a.etlib)).append("</span> ")
                        .append("<span class='tip-viewStock-dispo'>").append(html(a.dispo)).append("</span> ")
                        .append("<span class='tip-viewStock-colisage'");
                if (a.dataColisage != null) {
                    c4.append(" data-colisage=\"").append(a.dataColisage).append('"');
                }
                c4.append('>').append(html(a.colisageTexte)).append("</span></div>");
            }
            c4.append("</div>");
            String c5 = "<input type='hidden' name='pscode_" + attr(pscode) + "' value='" + attr(pscode) + "'>"
                    + (cip == null ? "" : "<input type='hidden' name='cip_" + attr(pscode) + "' value='" + cip + "'>")
                    + "<input type='hidden' name='etcoda_" + attr(pscode) + "' value='" + agence + "'>"
                    + "<input type='number' name='qte_" + attr(pscode) + "' value='1'>";
            return new JSONArray().put(c0.toString()).put(html(dateAffichee)).put(agence).put(html(statut))
                    .put(c4.toString()).put(c5);
        }
    }

    private ReapproJeuEssai() {
    }

    /**
     * Genere n lignes. Un meme produit revient sur plusieurs agences ; quelques lignes sont des doublons exacts de la
     * precedente (la cle metier est inconnue : on les garde).
     */
    static List<Ligne> generer(Random r, int n) {
        List<Ligne> l = new ArrayList<>();
        int produits = Math.max(1, n / 3);
        for (int i = 0; i < n; i++) {
            if (i > 0 && r.nextInt(40) == 0) {
                l.add(copie(l.get(i - 1)));
                continue;
            }
            int p = r.nextInt(produits);
            Ligne x = new Ligne();
            x.pscode = (r.nextBoolean() ? "PS" : "00") + p;
            x.designation = "PRODUIT " + p + (r.nextInt(5) == 0 ? " & FILS" : "")
                    + (r.nextInt(7) == 0 ? " CRÈME (SOIN)" : "") + " " + (1 + r.nextInt(500)) + "ML";
            if (r.nextInt(6) != 0) {
                x.code = (r.nextBoolean() ? "0" : "") + (3000000000000L + p);
                x.categorie = r.nextInt(3) == 0 ? null : "CATEGORIE " + r.nextInt(9);
                x.cip = x.code;
            } else {
                x.cip = r.nextBoolean() ? null : "";
            }
            x.annee = 2024 + r.nextInt(3);
            x.mois = 1 + r.nextInt(12);
            x.jour = 1 + r.nextInt(28);
            x.dateValide = r.nextInt(10) != 0;
            x.dateAffichee = x.dateValide ? String.format("%02d/%02d/%04d", x.jour, x.mois, x.annee)
                    : String.format("%04d-%02d-%02d", x.annee, x.mois, x.jour);
            String[] ag = AGENCES[r.nextInt(AGENCES.length)];
            x.agence = ag[0];
            x.statut = STATUTS[r.nextInt(STATUTS.length)];
            int na = 1 + r.nextInt(AGENCES.length);
            int debut = r.nextInt(AGENCES.length);
            for (int k = 0; k < na; k++) {
                String[] g = AGENCES[(debut + k) % AGENCES.length];
                Agence a = new Agence();
                a.etcode = g[0];
                a.etlib = g[1];
                a.dispo = DISPOS[r.nextInt(DISPOS.length)];
                int choix = r.nextInt(6);
                if (choix == 0) {
                    a.colisageTexte = "N/A";
                    a.dataColisage = "";
                    a.colisages = null;
                } else if (choix == 1) {
                    a.colisageTexte = "";
                    a.dataColisage = null;
                    a.colisages = List.of();
                } else if (choix == 2) {
                    a.colisageTexte = "0";
                    a.dataColisage = "0";
                    a.colisages = List.of(0);
                } else {
                    int m = 1 + r.nextInt(3);
                    List<Integer> v = new ArrayList<>();
                    StringBuilder t = new StringBuilder();
                    for (int j = 0; j < m; j++) {
                        int c = 1 + r.nextInt(240);
                        v.add(c);
                        t.append(j == 0 ? "" : ", ").append(c);
                    }
                    a.colisages = v;
                    a.colisageTexte = t.toString();
                    a.dataColisage = String.valueOf(v.get(0));
                }
                x.agences.add(a);
            }
            l.add(x);
        }
        return l;
    }

    private static Ligne copie(Ligne o) {
        Ligne x = new Ligne();
        x.pscode = o.pscode;
        x.designation = o.designation;
        x.code = o.code;
        x.categorie = o.categorie;
        x.cip = o.cip;
        x.dateAffichee = o.dateAffichee;
        x.dateValide = o.dateValide;
        x.jour = o.jour;
        x.mois = o.mois;
        x.annee = o.annee;
        x.agence = o.agence;
        x.statut = o.statut;
        x.agences.addAll(o.agences);
        return x;
    }

    /** Enveloppe d'une page, comme l'extranet (draw renvoye en chaine). */
    static JSONObject page(List<Ligne> l, int total, int start, int length, int draw) {
        JSONArray data = new JSONArray();
        for (int i = start; i < Math.min(l.size(), start + length); i++) {
            data.put(l.get(i).cellules());
        }
        return new JSONObject().put("msg", new JSONArray()).put("datatables",
                new JSONObject().put("recordsFiltered", total).put("data", data).put("draw", String.valueOf(draw))
                        .put("recordsTotal", total));
    }

    static String html(String s) {
        return s == null ? ""
                : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("È", "&Egrave;");
    }

    static String attr(String s) {
        return html(s).replace("'", "&#39;");
    }
}
