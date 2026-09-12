package rest.report.pdf;

import commonTasks.dto.AchatDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RecapActiviteCreditDTO;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Editions des onglets du rapport d'activite (achats, credits accordes, reglements des tiers payants) : un meme modele
 * tableau, prepare ici hors conteneur pour etre teste.
 */
public final class EditionRecapActivite {

    public static final String MODELE = "recap_activite_tableau";

    private EditionRecapActivite() {
    }

    /** Une ligne du tableau : jusqu'a trois textes et trois montants. */
    public static final class Ligne {

        private final String texte1;
        private final String texte2;
        private final String texte3;
        private final Long nombre1;
        private final Long nombre2;
        private final Long nombre3;

        public Ligne(String texte1, String texte2, String texte3, Long nombre1, Long nombre2, Long nombre3) {
            this.texte1 = texte1;
            this.texte2 = texte2;
            this.texte3 = texte3;
            this.nombre1 = nombre1;
            this.nombre2 = nombre2;
            this.nombre3 = nombre3;
        }

        public String getTexte1() {
            return texte1;
        }

        public String getTexte2() {
            return texte2;
        }

        public String getTexte3() {
            return texte3;
        }

        public Long getNombre1() {
            return nombre1;
        }

        public Long getNombre2() {
            return nombre2;
        }

        public Long getNombre3() {
            return nombre3;
        }
    }

    public static String periode(LocalDate dtStart, LocalDate dtEnd) {
        DateTimeFormatter f = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        if (dtEnd == null || dtEnd.isEqual(dtStart)) {
            return "Période du " + dtStart.format(f);
        }
        return "Période du " + dtStart.format(f) + " au " + dtEnd.format(f);
    }

    public static String filtre(String query) {
        return (query == null || query.trim().isEmpty()) ? "" : "Tiers payant recherché : " + query.trim();
    }

    private static void entetes(Map<String, Object> p, String titre, String e1, String e2, String e3, String e4,
            String e5, String e6) {
        p.put("P_TITRE", titre);
        p.put("P_ENT_1", e1);
        p.put("P_ENT_2", e2);
        p.put("P_ENT_3", e3);
        p.put("P_ENT_4", e4);
        p.put("P_ENT_5", e5);
        p.put("P_ENT_6", e6);
    }

    /** Achats par groupe de grossistes : HT, TVA, TTC. */
    public static List<Ligne> lignesAchats(Map<String, Object> parametres, List<AchatDTO> achats) {
        entetes(parametres, "ACHATS PAR GROUPE DE GROSSISTES", "Groupe grossiste", null, null, "Montant HT",
                "Montant TVA", "Montant TTC");
        List<Ligne> lignes = new ArrayList<>();
        if (achats != null) {
            for (AchatDTO a : achats) {
                lignes.add(new Ligne(a.getLibelleGroupeGrossiste(), null, null, a.getMontantHT(), a.getMontantTVA(),
                        a.getMontantTTC()));
            }
        }
        return lignes;
    }

    /** Credits accordes par tiers payant : bons, montant, clients. */
    public static List<Ligne> lignesCredits(Map<String, Object> parametres, List<RecapActiviteCreditDTO> credits) {
        entetes(parametres, "CRÉDITS ACCORDÉS", "Tiers payant", "Type", null, "Nb. bons", "Montant", "Nb. clients");
        List<Ligne> lignes = new ArrayList<>();
        if (credits != null) {
            for (RecapActiviteCreditDTO c : credits) {
                lignes.add(new Ligne(c.getLibelleTiersPayant(), c.getLibelleTypeTiersPayant(), null, c.getNbreBons(),
                        c.getMontant(), c.getNbreClient()));
            }
        }
        return lignes;
    }

    /** Reglements des tiers payants : facture, montant regle, reste. */
    public static List<Ligne> lignesReglements(Map<String, Object> parametres, List<Params> reglements) {
        entetes(parametres, "RÈGLEMENTS DES TIERS PAYANTS", "Tiers payant", "Type", "Facture", "Montant facture",
                "Montant réglé", "Reste");
        List<Ligne> lignes = new ArrayList<>();
        if (reglements != null) {
            for (Params r : reglements) {
                lignes.add(new Ligne(r.getDescription(), r.getRef(), r.getRefTwo(), entier(r.getValueTwo()),
                        entier(r.getValue()), entier(r.getValueThree())));
            }
        }
        return lignes;
    }

    private static Long entier(Integer v) {
        return v == null ? 0L : v.longValue();
    }
}
