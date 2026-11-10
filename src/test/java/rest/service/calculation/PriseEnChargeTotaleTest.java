package rest.service.calculation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.PrixReferenceType;
import dal.Rate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.calculation.dto.CalculatedShare;
import rest.service.calculation.dto.CalculationInput;
import rest.service.calculation.dto.CalculationResult;
import rest.service.calculation.dto.NatureVente;
import rest.service.calculation.dto.SaleItemInput;
import rest.service.calculation.dto.TiersPayantInput;
import rest.service.calculation.dto.TiersPayantLineOutput;
import rest.service.calculation.dto.TiersPayantPrixInput;

/**
 * Retour du 10/11/2026 : prise en charge totale d'une ligne. Les cas chiffres sont ceux de l'explication du parametre
 * KEY_PRISE_EN_CHARGE_TOTALE (ligne a 1 000, RO a 80 %, RC1 a 20 %), aux deux valeurs de KEY_PRIX_REF_BASE_PAR_TP ;
 * puis des milliers de ventes tirees au hasard (graine fixe) pour les regles qui doivent toujours tenir.
 */
class PriseEnChargeTotaleTest {

    private static final String RO = "lien-RO";
    private static final String RC1 = "lien-RC1";

    private static TiersPayantInput tp(String lien, int taux, int priorite) {
        TiersPayantInput t = new TiersPayantInput();
        t.setClientTiersPayantId(lien);
        t.setTiersPayantId("tp-" + lien);
        t.setTiersPayantFullName(lien.toUpperCase());
        t.setTaux(taux / 100.0f);
        t.setPriorite(priorite);
        return t;
    }

    private static TiersPayantPrixInput ref(String lien, PrixReferenceType type, int prix, float taux) {
        TiersPayantPrixInput p = new TiersPayantPrixInput();
        p.setCompteTiersPayantId(lien);
        p.setOptionPrixType(type);
        p.setPrice(prix);
        p.setRate(taux);
        return p;
    }

    private static SaleItemInput ligne(String id, int prix, int qte, String premier, TiersPayantPrixInput... refs) {
        SaleItemInput l = new SaleItemInput();
        l.setSalesLineId(id);
        l.setQuantity(qte);
        l.setRegularUnitPrice(BigDecimal.valueOf(prix));
        l.setTotalSalesAmount(BigDecimal.valueOf((long) prix * qte));
        l.setPremierCompteTiersPayantId(premier);
        l.getPrixAssurances().addAll(Arrays.asList(refs));
        return l;
    }

    private static CalculationResult calcul(boolean baseParTp, List<TiersPayantInput> tps, SaleItemInput... lignes) {
        CalculationInput in = new CalculationInput();
        in.setNatureVente(NatureVente.ASSURANCE);
        in.setDiscountAmount(BigDecimal.ZERO);
        in.setTiersPayants(new ArrayList<>(tps));
        in.setSaleItems(Arrays.asList(lignes));
        BigDecimal total = BigDecimal.ZERO;
        for (SaleItemInput l : lignes) {
            total = total.add(l.getTotalSalesAmount());
        }
        in.setTotalSalesAmount(total);
        in.setBasePrixReferenceParTiersPayant(baseParTp);
        return new TiersPayantCalculationService().calculate(in);
    }

    private static int part(CalculationResult r, String lien) {
        for (TiersPayantLineOutput l : r.getTiersPayantLines()) {
            if (l.getClientTiersPayantId().equals(lien)) {
                return l.getMontant().intValue();
            }
        }
        throw new AssertionError("organisme absent : " + lien);
    }

    private static List<TiersPayantInput> roEtRc1() {
        return Arrays.asList(tp(RC1, 20, 2), tp(RO, 80, 1));
    }

    private static void verifier(CalculationResult r, int ro, int rc1, int client, String cas) {
        assertEquals(ro, part(r, RO), "RO, " + cas);
        assertEquals(rc1, part(r, RC1), "RC1, " + cas);
        assertEquals(client, r.getTotalPatientShare().intValue(), "client, " + cas);
    }

    @Test
    @DisplayName("Aucun taux modifie : RO 800, RC1 200, client 0")
    void aucunTauxModifie() {
        for (boolean b : new boolean[] { false, true }) {
            verifier(calcul(b, roEtRc1(), ligne("l1", 1000, 1, null)), 800, 200, 0, "base par TP " + b);
        }
    }

    @Test
    @DisplayName("RC1 a 100 % sans marque : il complete le reste, comme avant (RO 800, RC1 200)")
    void centPourCentSansMarqueGardeSonSens() {
        for (boolean b : new boolean[] { false, true }) {
            verifier(calcul(b, roEtRc1(), ligne("l1", 1000, 1, null, ref(RC1, PrixReferenceType.TAUX, 0, 100))), 800,
                    200, 0, "base par TP " + b);
        }
    }

    @Test
    @DisplayName("RC1 confirme, sans prix de reference : RC1 1 000, RO 0")
    void rc1ConfirmeSansReference() {
        for (boolean b : new boolean[] { false, true }) {
            CalculationResult r = calcul(b, roEtRc1(), ligne("l1", 1000, 1, RC1));
            verifier(r, 0, 1000, 0, "base par TP " + b);
            // taux_produit : chaque organisme laisse son taux et sa base, RC1 a 100 %
            String memos = r.getItemShares().get(0).getRates().stream()
                    .map(x -> x.getCompteTiersPayantId() + ":" + Math.round(x.getTaux() * 100) + "/" + x.getBaseLigne())
                    .sorted().collect(Collectors.joining(" "));
            assertEquals(RC1 + ":100/1000 " + RO + ":80/1000", memos);
        }
    }

    @Test
    @DisplayName("RC1 confirme, prix de reference 800 : RC1 800, RO 200 sur le reste, client 0")
    void rc1ConfirmeAvecReference() {
        for (boolean b : new boolean[] { false, true }) {
            CalculationResult r = calcul(b, roEtRc1(),
                    ligne("l1", 1000, 1, RC1, ref(RC1, PrixReferenceType.MIX_TAUX_PRIX, 800, 20)));
            verifier(r, 200, 800, 0, "base par TP " + b);
            assertEquals(800, r.getItemShares().get(0).getCalculationBasePrice());
        }
    }

    @Test
    @DisplayName("RO a 100 % confirme : RO 1 000, RC1 0")
    void roConfirme() {
        for (boolean b : new boolean[] { false, true }) {
            verifier(calcul(b, roEtRc1(), ligne("l1", 1000, 1, RO)), 1000, 0, 0, "base par TP " + b);
        }
    }

    @Test
    @DisplayName("RC1 confirme mais plafonne a 600 : RO 0, RC1 600, client 400 (plafonds inchanges)")
    void rc1ConfirmeEtPlafonne() {
        for (boolean b : new boolean[] { false, true }) {
            List<TiersPayantInput> tps = roEtRc1();
            tps.get(0).setPlafondJournalierClient(BigDecimal.valueOf(600)); // RC1
            CalculationResult r = calcul(b, tps, ligne("l1", 1000, 1, RC1));
            verifier(r, 0, 600, 400, "base par TP " + b);
            assertTrue(r.getWarningMessage().contains("LIEN-RC1"));
        }
    }

    @Test
    @DisplayName("Seule la ligne marquee change : les autres lignes de la vente gardent leur calcul")
    void lesAutresLignesNeChangentPas() {
        for (boolean b : new boolean[] { false, true }) {
            CalculationResult sans = calcul(b, roEtRc1(), ligne("l1", 3450, 2, null), ligne("l2", 1000, 1, null));
            CalculationResult avec = calcul(b, roEtRc1(), ligne("l1", 3450, 2, null), ligne("l2", 1000, 1, RC1));
            CalculatedShare l1Sans = sans.getItemShares().get(0), l1Avec = avec.getItemShares().get(0);
            assertEquals(l1Sans.getTiersPayants(), l1Avec.getTiersPayants(), "ligne non marquee, base par TP " + b);
            // l2 : RO 800 -> 0, RC1 200 -> 1 000
            assertEquals(part(sans, RO) - 800, part(avec, RO));
            assertEquals(part(sans, RC1) + 800, part(avec, RC1));
        }
    }

    @Test
    @DisplayName("Une marque sur un organisme absent de la vente est ignoree")
    void marqueInconnueIgnoree() {
        for (boolean b : new boolean[] { false, true }) {
            verifier(calcul(b, roEtRc1(), ligne("l1", 1000, 1, "lien-inconnu")), 800, 200, 0, "base par TP " + b);
        }
    }

    @Test
    @DisplayName("Quantite 3 et reference : la base du premier est multipliee par la quantite")
    void quantite() {
        // 1 250 x 3 = 3 750 ; RC1 marque sur sa reference 1 000 : 3 000 ; RO 80 % de 3 750 = 3 000 borne au reste 750
        CalculationResult r = calcul(false, roEtRc1(),
                ligne("l1", 1250, 3, RC1, ref(RC1, PrixReferenceType.MIX_TAUX_PRIX, 1000, 20)));
        verifier(r, 750, 3000, 0, "quantite 3");
    }

    /** Coherence : 5 000 ventes au hasard, une ligne sur deux marquee. */
    @Test
    void coherenceSurDesVentesTireesAuHasard() {
        Random r = new Random(20261110L);
        int marquees = 0;
        for (int k = 0; k < 5000; k++) {
            int nbTp = 2 + r.nextInt(2);
            List<TiersPayantInput> tps = new ArrayList<>();
            for (int t = 0; t < nbTp; t++) {
                tps.add(tp("lien-" + t, 10 * r.nextInt(11), t + 1));
            }
            int nbLignes = 1 + r.nextInt(4);
            SaleItemInput[] lignes = new SaleItemInput[nbLignes];
            int total = 0;
            for (int i = 0; i < nbLignes; i++) {
                int prix = r.nextInt(10) == 0 ? 0 : (1 + r.nextInt(400)) * 25;
                int qte = 1 + r.nextInt(4);
                String premier = r.nextBoolean() ? "lien-" + r.nextInt(nbTp) : null;
                List<TiersPayantPrixInput> refs = new ArrayList<>();
                for (int t = 0; t < nbTp && prix > 0; t++) {
                    int tirage = r.nextInt(4);
                    if (tirage == 1) {
                        refs.add(ref("lien-" + t, PrixReferenceType.MIX_TAUX_PRIX,
                                Math.max(5, (int) (prix * (0.3 + 0.7 * r.nextDouble()))), 5 * (1 + r.nextInt(20))));
                    } else if (tirage == 2) {
                        refs.add(ref("lien-" + t, PrixReferenceType.TAUX, 0, 5 * (1 + r.nextInt(20))));
                    }
                }
                lignes[i] = ligne("l" + i, prix, qte, premier, refs.toArray(new TiersPayantPrixInput[0]));
                total += prix * qte;
            }
            boolean baseParTp = r.nextBoolean();
            CalculationResult res = calcul(baseParTp, tps, lignes);
            String vente = "vente " + k;
            BigDecimal sommeParts = BigDecimal.ZERO;
            for (TiersPayantLineOutput l : res.getTiersPayantLines()) {
                assertTrue(l.getMontant().signum() >= 0, "part negative, " + vente);
                sommeParts = sommeParts.add(l.getMontant());
            }
            assertEquals(0, sommeParts.compareTo(res.getTotalTiersPayant()), "total = somme des parts, " + vente);
            assertEquals(0,
                    BigDecimal.valueOf(total).subtract(sommeParts).max(BigDecimal.ZERO)
                            .setScale(0, RoundingMode.HALF_UP).compareTo(res.getTotalPatientShare()),
                    "client, " + vente);
            for (int i = 0; i < nbLignes; i++) {
                SaleItemInput l = lignes[i];
                CalculatedShare s = res.getItemShares().get(i);
                BigDecimal somme = BigDecimal.ZERO;
                for (BigDecimal p : s.getTiersPayants().values()) {
                    somme = somme.add(p);
                }
                assertTrue(somme.compareTo(l.getTotalSalesAmount()) <= 0, "ligne au-dela de son prix, " + vente);
                if (l.getPremierCompteTiersPayantId() == null) {
                    continue;
                }
                marquees++;
                // l'organisme marque prend 100 % de sa propre base, borne au prix de la ligne
                String premier = l.getPremierCompteTiersPayantId();
                TiersPayantPrixInput ref = l.getPrixAssurances().stream()
                        .filter(p -> p.getCompteTiersPayantId().equals(premier)).findFirst().orElse(null);
                long base = (ref != null && ref.getOptionPrixType() != PrixReferenceType.TAUX && ref.getPrice() > 0
                        ? ref.getPrice() : l.getRegularUnitPrice().intValue()) * (long) l.getQuantity();
                BigDecimal attendu = BigDecimal.valueOf(base).min(l.getTotalSalesAmount());
                BigDecimal obtenu = s.getTiersPayants().getOrDefault(premier, BigDecimal.ZERO);
                assertEquals(0, attendu.compareTo(obtenu), "part du premier, " + vente + " ligne " + i);
                // sa trace taux_produit est a 100 %, et il y en a une par organisme
                Rate memo = s.getRates().stream().filter(x -> x.getCompteTiersPayantId().equals(premier)).findFirst()
                        .orElseThrow();
                assertEquals(100, Math.round(memo.getTaux() * 100), "taux du premier, " + vente);
                assertEquals(nbTp, s.getRates().size(), "une trace par organisme, " + vente);
            }
        }
        assertTrue(marquees > 2000, "lignes marquees verifiees : " + marquees);
    }
}
