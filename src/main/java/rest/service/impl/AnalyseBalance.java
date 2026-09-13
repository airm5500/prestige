package rest.service.impl;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;
import util.PeriodesCa;

/**
 * L'analyse comparative de la balance, apres le calcul par periode (retour des tests du 09/09) : les taux d'evolution
 * d'une periode a la precedente sur chaque indicateur, le total general, et les series des graphiques.
 *
 * <p>
 * Classe pure, sans base ni conteneur : ce qu'elle produit se verifie a la main.
 * </p>
 */
public final class AnalyseBalance {

    private AnalyseBalance() {
    }

    /**
     * Ajoute a chaque ligne un objet « evolutions » (champ -> % d'evolution par rapport a la ligne precedente, null
     * pour la premiere ligne ou quand la valeur precedente est nulle) et rend la ligne TOTAL GENERAL.
     *
     * @param lignes
     *            les periodes, dans l'ordre chronologique
     * @param champs
     *            les indicateurs a suivre
     * @param modes
     *            les identifiants des modes de reglement (cles de « parModes »)
     */
    public static JSONObject evolutionsEtTotal(JSONArray lignes, List<String> champs, List<String> modes) {
        JSONObject total = new JSONObject().put("libelle", "TOTAL GÉNÉRAL").put("total", true);
        JSONObject totalModes = new JSONObject();
        JSONObject precedente = null;
        for (int i = 0; lignes != null && i < lignes.length(); i++) {
            JSONObject ligne = lignes.getJSONObject(i);
            JSONObject evolutions = new JSONObject();
            for (String champ : champs) {
                long valeur = ligne.optLong(champ, 0L);
                total.put(champ, total.optLong(champ, 0L) + valeur);
                evolutions.put(champ, taux(precedente == null ? null : precedente.optLong(champ, 0L), valeur));
            }
            JSONObject parModes = ligne.optJSONObject("parModes");
            JSONObject evolutionsModes = new JSONObject();
            for (String mode : modes) {
                long valeur = parModes == null ? 0L : parModes.optLong(mode, 0L);
                totalModes.put(mode, totalModes.optLong(mode, 0L) + valeur);
                JSONObject modesPrecedents = precedente == null ? null : precedente.optJSONObject("parModes");
                evolutionsModes.put(mode,
                        taux(modesPrecedents == null ? null : modesPrecedents.optLong(mode, 0L), valeur));
            }
            long mobile = ligne.optLong("montantMobile", 0L);
            total.put("montantMobile", total.optLong("montantMobile", 0L) + mobile);
            evolutions.put("montantMobile",
                    taux(precedente == null ? null : precedente.optLong("montantMobile", 0L), mobile));
            evolutions.put("parModes", evolutionsModes);
            ligne.put("evolutions", evolutions);
            precedente = ligne;
        }
        total.put("parModes", totalModes);
        // Le panier moyen d'un total n'est pas la somme des paniers : c'est le chiffre sur le nombre de ventes.
        long ventes = total.optLong("nbreVente", 0L);
        total.put("panierMoyen", ventes == 0 ? 0L : Math.round((double) total.optLong("montantTTC", 0L) / ventes));
        return total;
    }

    /** Le taux d'evolution en %, arrondi a deux decimales ; null sans valeur precedente ou quand elle est nulle. */
    public static Object taux(Long precedente, long valeur) {
        if (precedente == null || precedente == 0L) {
            return JSONObject.NULL;
        }
        return Math.round((valeur - precedente) * 10000D / Math.abs(precedente)) / 100D;
    }

    /**
     * Les series du graphique sous l'analyse (retour des tests du 09/09).
     *
     * <ul>
     * <li>3 dernieres annees : les mois en abscisse, une serie par annee (mois par mois sur chaque annee) ;</li>
     * <li>3 dernieres semaines : les jours de la semaine en abscisse, une serie par semaine ;</li>
     * <li>3 ou 6 derniers mois, periode libre : une barre par periode, une seule serie.</li>
     * </ul>
     *
     * @param type
     *            le type de periode
     * @param tranches
     *            les periodes comparees
     * @param lignes
     *            les lignes de l'analyse (montantNet par periode), dans le meme ordre
     * @param jours
     *            le chiffre de chaque jour (jour, montantNet), pour les decoupages plus fins que la periode
     */
    /** Les indicateurs du graphique, et le champ du jour ou de la ligne qui les porte. */
    public static final String[] INDICATEURS = { "montantNet", "nbreVente", "montantAchat", "panierMoyen", "montantEsp",
            "montantMobilePayment", "montantTp" };

    public static JSONObject graphique(PeriodesCa.Type type, List<PeriodesCa.Tranche> tranches, JSONArray lignes,
            JSONArray jours) {
        JSONObject graphique = new JSONObject();
        JSONArray series = new JSONArray();
        if (type == PeriodesCa.Type.TROIS_ANS || type == PeriodesCa.Type.TROIS_SEMAINES) {
            boolean parMois = type == PeriodesCa.Type.TROIS_ANS;
            int nbCategories = parMois ? 12 : 7;
            List<String> categories = new ArrayList<>();
            for (int i = 1; i <= nbCategories; i++) {
                categories.add(parMois ? libelleMois(i) : libelleJour(i));
            }
            // par tranche puis par indicateur, une valeur par categorie
            Map<Integer, Map<String, long[]>> valeurs = new LinkedHashMap<>();
            for (int t = 0; t < tranches.size(); t++) {
                Map<String, long[]> parIndicateur = new LinkedHashMap<>();
                for (String indicateur : INDICATEURS) {
                    parIndicateur.put(indicateur, new long[nbCategories]);
                }
                valeurs.put(t, parIndicateur);
            }
            for (int j = 0; jours != null && j < jours.length(); j++) {
                JSONObject jour = jours.getJSONObject(j);
                LocalDate date;
                try {
                    date = LocalDate.parse(jour.optString("jour"));
                } catch (RuntimeException e) {
                    continue;
                }
                for (int t = 0; t < tranches.size(); t++) {
                    PeriodesCa.Tranche tranche = tranches.get(t);
                    if (!date.isBefore(tranche.getDebut()) && !date.isAfter(tranche.getFin())) {
                        int categorie = parMois ? date.getMonthValue() - 1 : date.getDayOfWeek().getValue() - 1;
                        Map<String, long[]> v = valeurs.get(t);
                        v.get("montantNet")[categorie] += jour.optLong("montantNet", 0L);
                        v.get("nbreVente")[categorie] += jour.optLong("ventes", 0L);
                        v.get("montantAchat")[categorie] += jour.optLong("montantAchat", 0L);
                        v.get("montantEsp")[categorie] += jour.optLong("montantEsp", 0L);
                        v.get("montantMobilePayment")[categorie] += jour.optLong("montantMobile", 0L);
                        v.get("montantTp")[categorie] += jour.optLong("montantTp", 0L);
                        break;
                    }
                }
            }
            for (int t = 0; t < tranches.size(); t++) {
                PeriodesCa.Tranche tranche = tranches.get(t);
                Map<String, long[]> v = valeurs.get(t);
                // le panier moyen d'une categorie : le net sur le nombre de ventes de cette categorie
                for (int c = 0; c < nbCategories; c++) {
                    long ventes = v.get("nbreVente")[c];
                    v.get("panierMoyen")[c] = ventes == 0 ? 0 : Math.round((double) v.get("montantNet")[c] / ventes);
                }
                JSONObject parIndicateur = new JSONObject();
                for (String indicateur : INDICATEURS) {
                    parIndicateur.put(indicateur, new JSONArray(v.get(indicateur)));
                }
                series.put(new JSONObject()
                        .put("libelle", tranche.getLibelle() + (tranche.isEnCours() ? " (en cours)" : ""))
                        .put("enCours", tranche.isEnCours()).put("valeurs", parIndicateur));
            }
            graphique.put("type", parMois ? "ANNEES" : "SEMAINES").put("categories", new JSONArray(categories));
        } else {
            List<String> categories = new ArrayList<>();
            JSONObject parIndicateur = new JSONObject();
            for (String indicateur : INDICATEURS) {
                parIndicateur.put(indicateur, new JSONArray());
            }
            for (int i = 0; lignes != null && i < lignes.length(); i++) {
                JSONObject ligne = lignes.getJSONObject(i);
                categories.add(ligne.optString("libelle") + (ligne.optBoolean("enCours") ? " (en cours)" : ""));
                for (String indicateur : INDICATEURS) {
                    parIndicateur.getJSONArray(indicateur).put(ligne.optLong(indicateur, 0L));
                }
            }
            series.put(new JSONObject().put("libelle", "Valeur").put("valeurs", parIndicateur));
            graphique.put("type", "PERIODES").put("categories", new JSONArray(categories));
        }
        return graphique.put("indicateurs", new JSONArray(INDICATEURS)).put("series", series);
    }

    /**
     * Retours des tests 3 (diagnostic chez l'officine) : les series du graphique par jour sur toute l'etendue (trois
     * ans) coutaient 20 a 25 s a elles seules. Elles sont remplacees par des sous-periodes (un mois par barre pour les
     * trois annees, un jour par barre pour les trois semaines), chacune calculee par la balance elle-meme, en parallele
     * : le graphique et le tableau lisent alors la MEME source, et la somme des barres d'une annee est exactement la
     * ligne de cette annee. Chaque sous-periode : [debut, fin] bornee par sa tranche.
     */
    public static List<LocalDate[]> sousPeriodes(List<PeriodesCa.Tranche> tranches, boolean parMois) {
        List<LocalDate[]> sous = new ArrayList<>();
        for (PeriodesCa.Tranche tranche : tranches) {
            LocalDate debut = tranche.getDebut();
            while (!debut.isAfter(tranche.getFin())) {
                LocalDate fin = parMois ? debut.withDayOfMonth(debut.lengthOfMonth()) : debut;
                if (fin.isAfter(tranche.getFin())) {
                    fin = tranche.getFin();
                }
                sous.add(new LocalDate[] { debut, fin });
                debut = fin.plusDays(1);
            }
        }
        return sous;
    }

    /**
     * Une sous-periode calculee par la balance, au format des series par jour du graphique : la date de debut la range
     * dans sa tranche et sa categorie (mois ou jour de la semaine), les indicateurs viennent du resume et de la
     * ventilation de la balance (memes cles que le tableau de l'analyse).
     */
    public static JSONObject jourDepuisBalance(LocalDate debut, JSONObject balance) {
        JSONObject resume = balance == null ? null : balance.optJSONObject("metaData");
        JSONObject ventilation = balance == null ? null : balance.optJSONObject("ventilation");
        JSONObject mobile = ventilation == null ? null : ventilation.optJSONObject("mobile");
        return new JSONObject().put("jour", debut.toString())
                .put("montantNet", resume == null ? 0L : resume.optLong("montantNet", 0L))
                .put("ventes", resume == null ? 0L : resume.optLong("nbreVente", 0L))
                .put("montantAchat", resume == null ? 0L : resume.optLong("montantAchat", 0L))
                .put("montantEsp", resume == null ? 0L : resume.optLong("montantEsp", 0L))
                .put("montantMobile", mobile == null ? 0L : mobile.optLong("montant", 0L))
                .put("montantTp", resume == null ? 0L : resume.optLong("montantTp", 0L));
    }

    private static String libelleMois(int mois) {
        String l = java.time.Month.of(mois).getDisplayName(TextStyle.SHORT, Locale.FRENCH).replace(".", "");
        return l.substring(0, 1).toUpperCase(Locale.FRENCH) + l.substring(1);
    }

    private static String libelleJour(int jour) {
        String l = DayOfWeek.of(jour).getDisplayName(TextStyle.SHORT, Locale.FRENCH).replace(".", "");
        return l.substring(0, 1).toUpperCase(Locale.FRENCH) + l.substring(1);
    }
}
