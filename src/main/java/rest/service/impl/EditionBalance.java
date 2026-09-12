package rest.service.impl;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.dto.BalanceEditionLigneDTO;

/**
 * L'edition de la balance vente / caisse dans sa nouvelle presentation (retour des tests du 09/09) : les memes blocs
 * que l'ecran, construits a partir de la MEME reponse JSON que l'ecran (lignes, resume, ventilation). Ce que le PDF
 * imprime est ce que l'ecran affiche.
 */
public final class EditionBalance {

    public static final String S_BALANCE = "BALANCE VENTE / CAISSE";
    public static final String S_RESUME = "RÉSUMÉ";
    public static final String S_CLIENTS = "CLIENTS ET VENTES";
    public static final String S_PART = "PART DANS LE CHIFFRE D'AFFAIRES";
    public static final String S_CAISSE = "CAISSE";
    public static final String S_TVA = "RÉPARTITION PAR TAUX DE TVA";

    private EditionBalance() {
    }

    /** Les en-tetes de colonnes de chaque section, dans l'ordre des six valeurs. */
    public static Map<String, String[]> entetes() {
        Map<String, String[]> e = new HashMap<>();
        e.put(S_BALANCE, new String[] { "Ventes", "Brut TTC", "Remise", "Net TTC", "Espèces", "Mobile" });
        e.put(S_RESUME, new String[] { "Montant", "", "", "", "", "" });
        e.put(S_CLIENTS, new String[] { "Clients", "% clients", "Montant net", "% ventes", "", "" });
        e.put(S_PART, new String[] { "Montant", "% du CA", "Ventes", "% ventes", "", "" });
        e.put(S_CAISSE, new String[] { "Nombre", "Montant", "", "", "", "" });
        e.put(S_TVA, new String[] { "HT", "TVA", "TTC", "% TTC", "", "" });
        return e;
    }

    /**
     * Les indicateurs du bandeau de tete de l'edition (retours du 12/09, point 10) : chiffre d'affaires net, marge,
     * nombre de ventes, panier moyen, especes, lus dans le resume de la vue.
     */
    public static Map<String, Object> indicateurs(JSONObject vue) {
        JSONObject resume = vue == null ? null : vue.optJSONObject("metaData");
        resume = resume == null ? new JSONObject() : resume;
        Map<String, Object> m = new HashMap<>();
        m.put("P_KPI_CA", n(resume.optLong("montantNet", resume.optLong("montantTTC"))));
        m.put("P_KPI_MARGE", n(resume.optLong("marge")));
        m.put("P_KPI_VENTES", n(resume.optLong("nbreVente")));
        m.put("P_KPI_PANIER", n(resume.optLong("panierMoyen")));
        m.put("P_KPI_ESPECES", n(resume.optLong("montantEsp")));
        return m;
    }

    public static List<BalanceEditionLigneDTO> lignes(JSONObject vue) {
        List<BalanceEditionLigneDTO> l = new ArrayList<>();
        JSONArray balances = vue.optJSONArray("data");
        JSONObject resume = vue.optJSONObject("metaData");
        JSONObject v = vue.optJSONObject("ventilation");
        resume = resume == null ? new JSONObject() : resume;
        v = v == null ? new JSONObject() : v;

        // 1. la balance : COMPTANT, CREDIT, TOTAL
        for (int i = 0; balances != null && i < balances.length(); i++) {
            JSONObject b = balances.getJSONObject(i);
            l.add(new BalanceEditionLigneDTO(S_BALANCE, 1, typeVente(b.optString("typeVente")), false, false,
                    n(b.optLong("nbreVente")), n(b.optLong("montantTTC")), n(b.optLong("montantRemise")),
                    n(b.optLong("montantNet")), n(b.optLong("montantEsp")), n(b.optLong("montantMobilePayment"))));
        }
        l.add(new BalanceEditionLigneDTO(S_BALANCE, 1, "TOTAL", true, false, n(resume.optLong("nbreVente")),
                n(resume.optLong("montantTTC")), n(resume.optLong("montantRemise")), n(resume.optLong("montantNet")),
                n(resume.optLong("montantEsp")), n(resume.optLong("montantMobilePayment"))));

        // 2. le resume
        String[][] kpis = { { "Montant vente", "montantTTC" }, { "Montant achat", "montantAchat" },
                { "Marge", "marge" }, { "Fonds de caisse", "fondCaisse" }, { "Règlements différés", "montantRegDiff" },
                { "Règlements tiers payant", "montantRegleTp" }, { "Entrées", "montantEntre" },
                { "Sorties", "montantSortie" }, { "Espèces", "montantEsp" }, { "Mobile", "montantMobilePayment" },
                { "Chèques", "montantCheque" }, { "Virements", "montantVirement" }, { "Carte bancaire", "montantCB" },
                { "Tiers payant", "montantTp" }, { "Panier moyen", "panierMoyen" },
                { "Nombre de ventes", "nbreVente" } };
        for (String[] k : kpis) {
            l.add(new BalanceEditionLigneDTO(S_RESUME, 2, k[0], false, false, n(resume.optLong(k[1]))));
        }
        l.add(new BalanceEditionLigneDTO(S_RESUME, 2, "Ratio V/A", false, false,
                String.valueOf(resume.opt("ratioVA"))));

        // 3. clients et ventes
        JSONObject comptant = v.optJSONObject("comptant"), credit = v.optJSONObject("credit");
        if (comptant != null && credit != null) {
            l.add(new BalanceEditionLigneDTO(S_CLIENTS, 3, "COMPTANT", false, false, n(comptant.optLong("ventes")),
                    p(comptant.optDouble("partVentes")), n(comptant.optLong("montant")),
                    p(comptant.optDouble("partMontant"))));
            l.add(new BalanceEditionLigneDTO(S_CLIENTS, 3, "CRÉDIT", false, false, n(credit.optLong("ventes")),
                    p(credit.optDouble("partVentes")), n(credit.optLong("montant")),
                    p(credit.optDouble("partMontant"))));
            l.add(new BalanceEditionLigneDTO(S_CLIENTS, 3, "TOTAL", true, false, n(v.optLong("totalVentes")), "100 %",
                    n(v.optLong("chiffreAffaires")), "100 %"));
        }

        // 4. part dans le chiffre d'affaires
        JSONObject especes = v.optJSONObject("especes"), mobile = v.optJSONObject("mobile"),
                creditCa = v.optJSONObject("creditCa");
        if (especes != null) {
            l.add(part("Espèces", especes, false));
        }
        if (mobile != null) {
            l.add(part("Mobile money", mobile, false));
            JSONArray operateurs = mobile.optJSONArray("operateurs");
            for (int i = 0; operateurs != null && i < operateurs.length(); i++) {
                JSONObject o = operateurs.getJSONObject(i);
                l.add(part("    " + o.optString("libelle"), o, true));
            }
        }
        JSONArray modes = v.optJSONArray("modes");
        for (int i = 0; modes != null && i < modes.length(); i++) {
            JSONObject m = modes.getJSONObject(i);
            if (!m.optBoolean("mobile") && !"1".equals(m.optString("modeId"))) {
                l.add(part(m.optString("libelle"), m, false));
            }
        }
        if (creditCa != null && credit != null) {
            l.add(new BalanceEditionLigneDTO(S_PART, 4, "Part tiers payant (sur ventes à crédit)", false, false,
                    n(creditCa.optLong("montant")), p(creditCa.optDouble("part")), n(credit.optLong("ventes")),
                    p(credit.optDouble("partVentes"))));
        }

        // 5. caisse
        JSONObject caisse = v.optJSONObject("caisse");
        if (caisse != null) {
            l.add(mvt("Mouvements de caisse", caisse.optJSONObject("mouvements"), false));
            l.add(mvt("    Entrées", caisse.optJSONObject("entrees"), true));
            l.add(mvt("    Sorties", caisse.optJSONObject("sorties"), true));
            l.add(mvt("Règlements tiers payant", caisse.optJSONObject("reglementsTp"), false));
            l.add(mvt("Règlements différés", caisse.optJSONObject("reglementsDifferes"), false));
            l.add(mvt("Ventes à crédit", caisse.optJSONObject("ventesCredit"), false));
        }

        // 6. TVA
        JSONArray tva = v.optJSONArray("tva");
        for (int i = 0; tva != null && i < tva.length(); i++) {
            JSONObject t = tva.getJSONObject(i);
            l.add(new BalanceEditionLigneDTO(S_TVA, 6, t.optInt("taux") + " %", false, false, n(t.optLong("montantHt")),
                    n(t.optLong("montantTva")), n(t.optLong("montantTtc")), p(t.optDouble("part"))));
        }
        return l;
    }

    private static BalanceEditionLigneDTO part(String libelle, JSONObject o, boolean secondaire) {
        return new BalanceEditionLigneDTO(S_PART, 4, libelle, false, secondaire, n(o.optLong("montant")),
                p(o.optDouble("part")), n(o.optLong("ventes")), p(o.optDouble("partVentes")));
    }

    private static BalanceEditionLigneDTO mvt(String libelle, JSONObject o, boolean secondaire) {
        JSONObject x = o == null ? new JSONObject() : o;
        return new BalanceEditionLigneDTO(S_CAISSE, 5, libelle, false, secondaire, n(x.optLong("nombre")),
                n(x.optLong("montant")));
    }

    public static String typeVente(String v) {
        if ("VNO".equals(v)) {
            return "COMPTANT";
        }
        if ("VO".equals(v)) {
            return "CRÉDIT";
        }
        return v == null ? "" : v;
    }

    /** Nombre entier avec separateur de milliers (espace), quelle que soit la locale de la machine. */
    public static String n(long valeur) {
        return NumberFormat.getIntegerInstance(Locale.FRANCE).format(valeur).replace('\u202f', ' ').replace('\u00a0',
                ' ');
    }

    public static String p(double valeur) {
        return String.format(Locale.FRANCE, "%.1f %%", Double.isNaN(valeur) ? 0D : valeur);
    }
}
