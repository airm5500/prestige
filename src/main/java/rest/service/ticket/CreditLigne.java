package rest.service.ticket;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Cas 1 du 03/11/2026 (Q1.9) : sur le ticket de vente assurance, chaque ligne porte « Taux <taux> % : part » pour
 * chaque tiers-payant. Les parts par ligne sont recalculees a partir de la base de calcul de la ligne et du taux
 * applique, puis ramenees au total de l'organisme sur la vente (plafonds, arrondis) : la somme des lignes est
 * exactement la part imprimee dans le bloc tiers-payant.
 */
public final class CreditLigne {

    private CreditLigne() {
    }

    /**
     * Parts d'un tiers-payant, ligne par ligne, dont la somme vaut {@code totalTp}.
     *
     * @param bases
     *            base de calcul de chaque ligne (prix de reference ou montant de la ligne)
     * @param taux
     *            taux applique par le tiers-payant (0 a 100)
     * @param totalTp
     *            part de l'organisme sur la vente, telle qu'enregistree a la cloture
     */
    public static List<Integer> parts(List<Integer> bases, int taux, int totalTp) {
        List<Integer> tauxParLigne = new ArrayList<>();
        if (bases != null) {
            bases.forEach(x -> tauxParLigne.add(taux));
        }
        return parts(bases, tauxParLigne, totalTp);
    }

    /**
     * Ticket du 05/11 : chaque ligne avec son propre taux (taux modifie sur la ligne a l'ecran de vente, table
     * taux_produit), toujours ramene au total de l'organisme.
     */
    public static List<Integer> parts(List<Integer> bases, List<Integer> tauxParLigne, int totalTp) {
        List<Integer> res = new ArrayList<>();
        if (bases == null || bases.isEmpty()) {
            return res;
        }
        long somme = 0;
        for (int i = 0; i < bases.size(); i++) {
            Integer b = bases.get(i);
            Integer tx = tauxParLigne == null || i >= tauxParLigne.size() ? null : tauxParLigne.get(i);
            BigDecimal t = BigDecimal.valueOf(Math.max(0, tx == null ? 0 : tx)).divide(BigDecimal.valueOf(100), 10,
                    RoundingMode.HALF_UP);
            int p = BigDecimal.valueOf(b == null ? 0 : b).multiply(t).setScale(0, RoundingMode.HALF_UP).intValue();
            res.add(p);
            somme += p;
        }
        return ramenerAuTotal(res, somme, totalTp);
    }

    /** Ramene les parts d'un organisme a son total : ecart d'arrondi absorbe, sinon (plafond) prorata. */
    private static List<Integer> ramenerAuTotal(List<Integer> res, long somme, int totalTp) {
        int total = Math.max(0, totalTp);
        if (somme == total || somme <= 0) {
            return res;
        }
        if (Math.abs(somme - total) <= res.size()) {
            // simple ecart d'arrondi : la derniere ligne l'absorbe (6 725 et 3 145 a 70 % -> 4 708 et 2 201)
            absorber(res, (int) (total - somme));
            return res;
        }
        // plafonne par le moteur : chaque ligne au prorata, la derniere absorbe l'ecart
        long cumul = 0;
        for (int i = 0; i < res.size(); i++) {
            int p = BigDecimal.valueOf(res.get(i)).multiply(BigDecimal.valueOf(total))
                    .divide(BigDecimal.valueOf(somme), 0, RoundingMode.HALF_UP).intValue();
            res.set(i, p);
            cumul += p;
        }
        absorber(res, (int) (total - cumul));
        return res;
    }

    /**
     * Retours du 10/11 (ticket 5842772163) : parts par organisme et par ligne, calculees comme le moteur. Sur chaque
     * ligne, dans l'ORDRE DE PASSAGE des organismes, la part vaut base x taux, bornee a ce qui reste de la ligne apres
     * ceux qui passent avant ; puis chaque organisme est ramene a son total sur la vente (arrondi, plafond). Sans cette
     * borne, un complementaire qui n'avait rien pris sur une ligne deja couverte y recevait une part par prorata («
     * MUGEFCI · Taux 0 % : 190 »).
     *
     * @param basesParTp
     *            [organisme][ligne] : base de l'organisme sur la ligne (quantite comprise)
     * @param tauxParTp
     *            [organisme][ligne] : taux applique (0 a 100)
     * @param plafondsLigne
     *            [ligne] : ce que les organismes peuvent prendre ensemble sur la ligne
     * @param ordresParLigne
     *            [ligne] : indices des organismes dans leur ordre de passage sur cette ligne
     * @param totaux
     *            [organisme] : part enregistree de l'organisme sur la vente
     *
     * @return [organisme][ligne]
     */
    public static List<List<Integer>> partsBornees(List<List<Integer>> basesParTp, List<List<Integer>> tauxParTp,
            List<Integer> plafondsLigne, List<List<Integer>> ordresParLigne, List<Integer> totaux) {
        List<List<Integer>> res = new ArrayList<>();
        int nbTp = basesParTp == null ? 0 : basesParTp.size();
        int nbLignes = plafondsLigne == null ? 0 : plafondsLigne.size();
        for (int t = 0; t < nbTp; t++) {
            List<Integer> col = new ArrayList<>();
            for (int i = 0; i < nbLignes; i++) {
                col.add(0);
            }
            res.add(col);
        }
        for (int i = 0; i < nbLignes; i++) {
            long reste = Math.max(0, plafondsLigne.get(i) == null ? 0 : plafondsLigne.get(i));
            List<Integer> ordre = ordresParLigne == null || i >= ordresParLigne.size() ? null : ordresParLigne.get(i);
            for (int k = 0; k < nbTp; k++) {
                int t = ordre == null || k >= ordre.size() || ordre.get(k) == null ? k : ordre.get(k);
                if (t < 0 || t >= nbTp) {
                    continue;
                }
                Integer b = i < basesParTp.get(t).size() ? basesParTp.get(t).get(i) : null;
                Integer tx = tauxParTp == null || t >= tauxParTp.size() || i >= tauxParTp.get(t).size() ? null
                        : tauxParTp.get(t).get(i);
                BigDecimal taux = BigDecimal.valueOf(Math.max(0, tx == null ? 0 : tx)).divide(BigDecimal.valueOf(100),
                        10, RoundingMode.HALF_UP);
                long p = BigDecimal.valueOf(b == null ? 0 : b).multiply(taux).setScale(0, RoundingMode.HALF_UP)
                        .longValue();
                p = Math.max(0, Math.min(p, reste));
                res.get(t).set(i, (int) p);
                reste -= p;
            }
        }
        for (int t = 0; t < nbTp; t++) {
            long somme = 0;
            for (Integer p : res.get(t)) {
                somme += p;
            }
            Integer total = totaux == null || t >= totaux.size() ? null : totaux.get(t);
            if (total != null) {
                ramenerAuTotal(res.get(t), somme, total);
            }
        }
        return res;
    }

    /**
     * Retour du 10/11 (ticket 1750418138) : sur une vente a plusieurs organismes, celui dont la part est nulle n'est
     * pas imprime (ni sous la ligne, ni dans le bloc du client). Un organisme seul reste imprime, meme a zero, et un
     * montant negatif (vente annulee) n'est jamais masque.
     */
    public static boolean masquerPartNulle(int part, int nombreOrganismes) {
        return part == 0 && nombreOrganismes > 1;
    }

    /**
     * Tests de coherence du 05/11 : l'ecart d'arrondi va a la derniere ligne qui a une part et peut l'absorber sans
     * passer sous zero ; jamais a une ligne a 0 % (elle afficherait une part), et la somme tombe toujours juste.
     */
    private static void absorber(List<Integer> res, int residu) {
        if (residu == 0) {
            return;
        }
        for (int i = res.size() - 1; i >= 0; i--) {
            if (res.get(i) > 0 && res.get(i) + residu >= 0) {
                res.set(i, res.get(i) + residu);
                return;
            }
        }
        // aucune ligne ne l'absorbe seule : de la derniere vers la premiere, sans passer sous zero
        int reste = residu;
        for (int i = res.size() - 1; i >= 0 && reste != 0; i--) {
            int nouveau = Math.max(0, res.get(i) + reste);
            reste -= nouveau - res.get(i);
            res.set(i, nouveau);
        }
    }

    /**
     * Retour du 05/11 : taux tels qu'imprimes, dans l'ordre des organismes. Leur total ne depasse jamais 100 % ; quand
     * il s'en ecarte d'un ou deux points (29 % ou 31 % pour un complementaire qui prend le reste d'un 70 %), le dernier
     * organisme affiche le reste exact : 100 − les autres. Les parts (montants) ne changent pas.
     */
    public static List<Integer> tauxAffiches(List<Integer> taux) {
        List<Integer> res = new ArrayList<>();
        if (taux == null) {
            return res;
        }
        int cumul = 0;
        for (int i = 0; i < taux.size(); i++) {
            int t = Math.max(0, taux.get(i) == null ? 0 : taux.get(i));
            boolean dernier = i == taux.size() - 1;
            if (cumul + t > 100 || (dernier && i > 0 && Math.abs(cumul + t - 100) <= 2)) {
                t = Math.max(0, 100 - cumul);
            }
            res.add(t);
            cumul += t;
        }
        return res;
    }

    /**
     * Retour du 05/11 : « P.REF 6 000 » quand la ligne a un prix de reference different du prix de vente ; vide sinon
     * (sans reference, la ligne garde le seul taux du client).
     */
    public static String prixReference(Integer reference, Integer prixVente) {
        if (reference == null || reference <= 0
                || (prixVente != null && reference.intValue() == prixVente.intValue())) {
            return "";
        }
        return "P.REF " + ConversionTicket.nombre(reference);
    }

    /**
     * « Taux 70 % : 4 708 » (retour du 03/11 : sans « Crédit » ni « Mont. »), precede du nom de l'organisme quand la
     * vente en a plusieurs : « MUGEF-CI · Taux 80 % : 1 200 ».
     */
    public static String libelle(String nomTiersPayant, int taux, int montant) {
        return libelle(nomTiersPayant, null, taux, montant);
    }

    /**
     * Lot « base par tiers-payant » (Q2.5) : quand les organismes d'une ligne n'ont pas la meme base, chacun imprime
     * SON prix de reference. Retour du 06/11 : « CNAM · P[2 335] * T[60%] : 1 401 », une seule ligne pour le prix de
     * reference et le taux. prixReference null : libelle d'aujourd'hui (« Taux 70 % : 700 »).
     */
    public static String libelle(String nomTiersPayant, Integer prixReference, int taux, int montant) {
        String nom = nomTiersPayant == null || nomTiersPayant.trim().isEmpty() ? "" : nomTiersPayant.trim() + " · ";
        // retour du 06/11 : prix de reference et taux sur une seule ligne, « P[2 235] * T[70%] : 1 565 »
        if (prixReference != null && prixReference > 0) {
            return nom + "P[" + ConversionTicket.nombre(prixReference) + "] * T[" + taux + "%] : "
                    + ConversionTicket.nombre(montant);
        }
        return nom + "Taux " + taux + " % : " + ConversionTicket.nombre(montant);
    }

    /**
     * Vrai si au moins deux organismes de la ligne ont des bases unitaires propres differentes (null = base de la
     * ligne, ignoree) : la ligne imprime alors un P.REF par organisme au lieu du P.REF unique.
     */
    public static boolean basesDifferentes(List<Integer> basesUnitaires) {
        Integer premiere = null;
        if (basesUnitaires == null) {
            return false;
        }
        for (Integer b : basesUnitaires) {
            if (b == null) {
                continue;
            }
            if (premiere == null) {
                premiere = b;
            } else if (!premiere.equals(b)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Plan du 06/11, point 5.2 : une ligne du ticket n'imprime sa ligne prix/taux (« Taux 70 % : part » ou « P[…] *
     * T[…%] : part ») que si elle a quelque chose de PROPRE : un prix de reference different du prix de vente, un taux
     * saisi sur la ligne different de celui de l'organisme, ou une base propre a un organisme (lot Q2.5) differente du
     * prix de vente. Sinon c'est le taux de l'assurance qui s'applique : rien sous le produit, la part reste comptee
     * dans le bloc de l'organisme.
     *
     * @param tauxLigne
     *            taux saisi sur la ligne pour chaque organisme (null : aucun)
     * @param tauxOrganismes
     *            taux de chaque organisme sur la vente
     * @param basesPropres
     *            base unitaire propre de chaque organisme sur la ligne (null : aucune)
     */
    public static boolean afficherLigne(Integer prixReference, Integer prixVente, List<Integer> tauxLigne,
            List<Integer> tauxOrganismes, List<Integer> basesPropres) {
        if (!prixReference(prixReference, prixVente).isEmpty()) {
            return true;
        }
        for (int t = 0; tauxLigne != null && t < tauxLigne.size(); t++) {
            Integer tx = tauxLigne.get(t);
            Integer org = tauxOrganismes == null || t >= tauxOrganismes.size() ? null : tauxOrganismes.get(t);
            if (tx != null && (org == null || tx.intValue() != org.intValue())) {
                return true;
            }
        }
        for (int t = 0; basesPropres != null && t < basesPropres.size(); t++) {
            Integer b = basesPropres.get(t);
            if (b != null && b > 0 && (prixVente == null || b.intValue() != prixVente.intValue())) {
                return true;
            }
        }
        return false;
    }
}
