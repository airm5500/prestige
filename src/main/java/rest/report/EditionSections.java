package rest.report;

import commonTasks.dto.LigneEditionSectionDTO;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Plan du 08/11, point 7 : l'analyse des avoirs (Ventes avoir, onglet Analyse) et le tableau de bord des retours
 * fournisseur, mis a plat pour l'edition rp_edition_sections.jrxml.
 *
 * <p>
 * Les sections, leurs colonnes et la mise en forme des nombres reprennent celles de l'ecran (VenteAvoir.htmlAnalyse,
 * RetoursFournisseur.htmlTableau) : entiers arrondis avec une espace pour separateur de milliers, pourcentages avec une
 * virgule, mois en « nov. 2026 ». Le test de rapprochement compare l'ecran et le PDF texte a texte.
 */
public final class EditionSections {

    private static final String[] MOIS = { "janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.",
            "oct.", "nov.", "déc." };

    private static final String A = LigneEditionSectionDTO.A;
    private static final String B = LigneEditionSectionDTO.B;

    private EditionSections() {
    }

    /* ---------- seuil de reserve atteint apres une entree en stock (plan du 08/11, point 8) ---------- */

    /** Sens d'un deplacement, comme dans la fenetre « Seuil de réserve atteint ». */
    public static String sensReserve(String categorie) {
        /* « » » et non « → » : la police du PDF (jeu WinAnsi) n'a pas la fleche, qui disparaissait a l'impression */
        return "RESERVE".equals(categorie) ? "Rayon » réserve" : "Réserve » rayon";
    }

    /** Les lignes de la fenetre, colonne par colonne (nombres bruts, comme a l'ecran). */
    public static List<LigneEditionSectionDTO> reserveApresEntree(JSONArray lignes) {
        List<LigneEditionSectionDTO> l = new ArrayList<>();
        String s = "Produits à déplacer";
        l.add(entete(s, B, "CIP", "Produit", "Sens", "Rayon", "Réserve", "Seuil", "À déplacer"));
        JSONArray t = lignes == null ? new JSONArray() : lignes;
        for (int i = 0; i < t.length(); i++) {
            JSONObject p = t.getJSONObject(i);
            l.add(ligne(s, B, p.optString("cip", ""), p.optString("nom", ""), sensReserve(p.optString("categorie")),
                    brut(p, "stockRayon"), brut(p, "stockReserve"), brut(p, "seuil"), brut(p, "quantite")));
        }
        vide(l, s, B, t, "Aucun produit à déplacer.");
        return l;
    }

    /** « 3 produit(s) · 2 vers la réserve · 1 vers le rayon ». */
    public static String indicateursReserve(JSONArray lignes) {
        int n = lignes == null ? 0 : lignes.length(), vers = 0;
        for (int i = 0; i < n; i++) {
            if ("RESERVE".equals(lignes.getJSONObject(i).optString("categorie"))) {
                vers++;
            }
        }
        return n + " produit(s) · " + vers + " vers la réserve · " + (n - vers) + " vers le rayon";
    }

    /** « Suggestion SR-… du BL … », une fois par suggestion, dans l'ordre des lignes. */
    public static String suggestionsReserve(JSONArray lignes) {
        java.util.LinkedHashSet<String> refs = new java.util.LinkedHashSet<>();
        for (int i = 0; lignes != null && i < lignes.length(); i++) {
            JSONObject p = lignes.getJSONObject(i);
            String bon = p.optString("bon", "");
            refs.add(p.optString("ref", "") + (bon.isEmpty() ? "" : " du BL " + bon));
        }
        return refs.isEmpty() ? "" : "Suggestion " + String.join(", ", refs);
    }

    /* ---------- analyse des avoirs ---------- */

    public static List<LigneEditionSectionDTO> analyseAvoirs(JSONObject o) {
        List<LigneEditionSectionDTO> l = new ArrayList<>();
        String s = "Produits le plus souvent en avoir (30 premiers)";
        l.add(entete(s, B, "CIP", "Produit", "Grossiste", "Fois", "Quantité due", "Encore due", "Valeur"));
        JSONArray t = tableau(o, "produits");
        for (int i = 0; i < t.length(); i++) {
            JSONObject p = t.getJSONObject(i);
            l.add(ligne(s, B, p.optString("cip", ""), p.optString("libelle", ""), p.optString("grossiste", ""),
                    entier(p, "fois"), entier(p, "quantite"), entier(p, "enCours"), entier(p, "valeur")));
        }
        vide(l, s, B, t, "Aucun avoir sur la période.");

        s = "Grossiste habituel des produits en avoir";
        l.add(entete(s, A, "Grossiste", "Lignes", "Produits", "Quantité", "Valeur", "Part"));
        t = tableau(o, "grossistes");
        for (int i = 0; i < t.length(); i++) {
            JSONObject g = t.getJSONObject(i);
            l.add(ligne(s, A, g.optString("libelle", ""), entier(g, "fois"), entier(g, "produits"),
                    entier(g, "quantite"), entier(g, "valeur"), pct(g, "part")));
        }
        vide(l, s, A, t, "Aucun avoir sur la période.");

        s = "Ancienneté des avoirs encore en cours (depuis la vente)";
        l.add(entete(s, A, "Depuis", "Avoirs", "Valeur due"));
        t = tableau(o, "anciennete");
        for (int i = 0; i < t.length(); i++) {
            JSONObject a = t.getJSONObject(i);
            l.add(ligne(s, A, a.optString("tranche", ""), entier(a, "avoirs"), entier(a, "valeur")));
        }

        s = "Par mois";
        l.add(entete(s, A, "Mois", "Ventes", "Avec avoir", "Part", "Clôturés", "Valeur due"));
        t = tableau(o, "mois");
        for (int i = 0; i < t.length(); i++) {
            JSONObject m = t.getJSONObject(i);
            l.add(ligne(s, A, libelleMois(m.optString("mois", "")), entier(m, "ventes"), entier(m, "avoirs"),
                    pct(m, "part"), entier(m, "clotures"), entier(m, "valeur")));
        }
        vide(l, s, A, t, "Aucune vente sur la période.");
        return l;
    }

    /** Les quatre tuiles de l'ecran, sur une ligne. */
    public static String indicateursAvoirs(JSONObject o) {
        JSONObject t = o.optJSONObject("total");
        if (t == null) {
            t = new JSONObject();
        }
        Object d = t.opt("delaiMoyenJours");
        String delai = d == null || JSONObject.NULL.equals(d) ? "—" : nombre(d).replace('.', ',') + " j";
        return "Ventes avec avoir : " + entier(t, "avoirs") + " (" + pct(t, "partVentes") + " des "
                + entier(t, "ventes") + " ventes)   ·   Encore en cours : " + entier(t, "enCours") + " ("
                + entier(t, "valeurEnCours") + " F encore dus)   ·   Taux de clôture : " + pct(t, "tauxCloture") + " ("
                + entier(t, "clotures") + " clôturé(s) sur " + entier(t, "avoirs") + ")   ·   Délai moyen de clôture : "
                + delai + " (" + entier(t, "quantite") + " unité(s) · " + entier(t, "valeur") + " F)";
    }

    /* ---------- tableau de bord des retours fournisseur ---------- */

    public static List<LigneEditionSectionDTO> tableauRetours(JSONObject o) {
        List<LigneEditionSectionDTO> l = new ArrayList<>();
        String s = "Retours par mois";
        l.add(entete(s, A, "Mois", "Retours", "Lignes", "Qté retournée", "Qté acceptée", "Montant"));
        JSONArray t = tableau(o, "mois");
        for (int i = 0; i < t.length(); i++) {
            JSONObject m = t.getJSONObject(i);
            /* l'ecran ecrit les nombres de retours et de lignes sans separateur : le PDF aussi */
            l.add(ligne(s, A, libelleMois(m.optString("mois", "")), brut(m, "retours"), brut(m, "lignes"),
                    entier(m, "quantite"), entier(m, "acceptee"), entier(m, "montant")));
        }
        vide(l, s, A, t, "Aucun retour sur la période.");

        s = "Produits les plus retournés";
        l.add(entete(s, B, "CIP", "Produit", "", "Retours", "Qté retournée", "Qté acceptée", "Montant"));
        t = tableau(o, "produits");
        for (int i = 0; i < t.length(); i++) {
            JSONObject p = t.getJSONObject(i);
            l.add(ligne(s, B, p.optString("cip", ""), p.optString("libelle", ""), "", brut(p, "retours"),
                    entier(p, "quantite"), entier(p, "acceptee"), entier(p, "montant")));
        }
        vide(l, s, B, t, "Aucun produit retourné.");

        s = "Motifs les plus utilisés";
        l.add(entete(s, A, "Motif", "Lignes", "Qté", "Part"));
        t = tableau(o, "motifs");
        for (int i = 0; i < t.length(); i++) {
            JSONObject m = t.getJSONObject(i);
            l.add(ligne(s, A, m.optString("libelle", ""), brut(m, "lignes"), entier(m, "quantite"), pct(m, "part")));
        }
        vide(l, s, A, t, "Aucun motif.");

        s = "Retours par utilisateur";
        l.add(entete(s, A, "Utilisateur", "Retours", "Part des retours", "Lignes", "Qté retournée", "Montant"));
        t = tableau(o, "utilisateurs");
        for (int i = 0; i < t.length(); i++) {
            JSONObject u = t.getJSONObject(i);
            l.add(ligne(s, A, u.optString("libelle", ""), brut(u, "retours"), pct(u, "part"), brut(u, "lignes"),
                    entier(u, "quantite"), entier(u, "montant")));
        }
        vide(l, s, A, t, "Aucun retour sur la période.");
        return l;
    }

    public static String indicateursRetours(JSONObject o) {
        JSONObject t = o.optJSONObject("total");
        if (t == null) {
            t = new JSONObject();
        }
        double q = t.optDouble("quantite", 0), a = t.optDouble("acceptee", 0);
        long pctAccepte = q != 0 ? Math.round(a * 100 / q) : 0;
        return "Retours : " + entier(t, "retours") + " (" + entier(t, "lignes") + " ligne(s) · " + entier(t, "produits")
                + " produit(s))   ·   Quantité retournée : " + entier(t, "quantite")
                + " unités   ·   Acceptée en avoir : " + entier(t, "acceptee") + " (" + pctAccepte
                + " % du retourné)   ·   Montant retourné : " + entier(t, "montant") + " F au prix d'achat";
    }

    /* ---------- mise en forme, identique a l'ecran ---------- */

    /** Date AAAA-MM-JJ en JJ/MM/AAAA (vide si illisible). */
    public static String date(String iso) {
        try {
            return LocalDate.parse(iso).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (RuntimeException e) {
            return "";
        }
    }

    static String libelleMois(String m) {
        String[] p = String.valueOf(m).split("-");
        if (p.length == 2) {
            try {
                return MOIS[Integer.parseInt(p[1]) - 1] + " " + p[0];
            } catch (RuntimeException e) {
                return m;
            }
        }
        return m;
    }

    /** Math.round(v), separateur de milliers : une espace (comme l'ecran). */
    static String entier(JSONObject o, String cle) {
        double v = o.optDouble(cle, 0);
        if (Double.isNaN(v)) {
            v = 0;
        }
        String s = String.valueOf(Math.round(v));
        boolean negatif = s.startsWith("-");
        if (negatif) {
            s = s.substring(1);
        }
        StringBuilder r = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            if (i > 0 && (s.length() - i) % 3 == 0) {
                r.append(' ');
            }
            r.append(s.charAt(i));
        }
        return (negatif ? "-" : "") + r;
    }

    /** Nombre ecrit tel quel par l'ecran (String(v) sur un entier), sans separateur de milliers. */
    static String brut(JSONObject o, String cle) {
        Object v = o.opt(cle);
        return v == null || JSONObject.NULL.equals(v) ? "0" : nombre(v);
    }

    /** String(v).replace('.', ',') + ' %' de l'ecran. */
    static String pct(JSONObject o, String cle) {
        Object v = o.opt(cle);
        return (v == null || JSONObject.NULL.equals(v) ? "0" : nombre(v)).replace('.', ',') + " %";
    }

    /** Ecriture d'un nombre comme String(v) en JavaScript : 12, 12.5 (jamais 12.0). */
    static String nombre(Object v) {
        if (v instanceof Number) {
            BigDecimal b = new BigDecimal(v.toString()).stripTrailingZeros();
            return b.scale() <= 0 ? b.toBigInteger().toString() : b.toPlainString();
        }
        try {
            return nombre(new BigDecimal(String.valueOf(v)));
        } catch (NumberFormatException e) {
            return String.valueOf(v);
        }
    }

    private static JSONArray tableau(JSONObject o, String cle) {
        JSONArray t = o.optJSONArray(cle);
        return t == null ? new JSONArray() : t;
    }

    private static LigneEditionSectionDTO entete(String section, String disposition, String... colonnes) {
        return new LigneEditionSectionDTO(section, true, disposition, colonnes);
    }

    private static LigneEditionSectionDTO ligne(String section, String disposition, String... colonnes) {
        return new LigneEditionSectionDTO(section, false, disposition, colonnes);
    }

    private static void vide(List<LigneEditionSectionDTO> l, String section, String disposition, JSONArray t,
            String message) {
        if (t.length() == 0) {
            /* le message prend la largeur du libelle (disposition A), meme dans une section en disposition B */
            l.add(ligne(section, A, message));
        }
    }
}
