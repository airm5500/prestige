package rest.service.calculation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.PrixReferenceType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
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
 * Tests de coherence (proprietes) du moteur tiers-payant avec le lot « base par tiers-payant » (Q2.5) : des milliers de
 * ventes assurance tirees au hasard (graine fixe : un echec se rejoue a l'identique), avec des prix differents d'une
 * ligne a l'autre, des quantites de 1 a 5, des lignes a 0, un a trois organismes de taux differents, des references de
 * chaque type ou aucune, des plafonds parfois atteints, et pour chacune les regles qui doivent toujours tenir,
 * parametre a 0 et a 1.
 *
 * <p>
 * Les proprietes du parametre a 1 echouent sur le moteur d'avant le lot (qui ignore le parametre) : c'est ainsi
 * qu'elles ont ete mises au point.
 */
class BaseParTiersPayantCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int VENTES = 5000;

    /**
     * Part attendue d'un organisme sur une ligne, sans plafond : base x taux. Le taux passe par un float comme dans le
     * moteur (0,9f vaut 0,899999976 en double) : l'oracle reproduit cette conversion pour comparer au franc pres.
     */
    private static BigDecimal brut(int baseUnitaire, int quantite, int taux) {
        return BigDecimal.valueOf((long) baseUnitaire * quantite).multiply(BigDecimal.valueOf(taux / 100.0f));
    }

    private static final class Organisme {
        final String lien;
        final int taux;
        final int priorite;
        boolean plafondParVente;
        int plafond;

        Organisme(String lien, int taux, int priorite) {
            this.lien = lien;
            this.taux = taux;
            this.priorite = priorite;
        }
    }

    private static final class Ligne {
        final String id;
        final int prix;
        final int quantite;
        /** lien -> reference (type, prix, taux) ; absent = pas de reference pour cet organisme */
        final Map<String, TiersPayantPrixInput> references = new HashMap<>();

        Ligne(String id, int prix, int quantite) {
            this.id = id;
            this.prix = prix;
            this.quantite = quantite;
        }
    }

    private static final class Vente {
        final List<Organisme> organismes = new ArrayList<>();
        final List<Ligne> lignes = new ArrayList<>();
        int total;
        boolean avecPlafond;

        Vente(Random r) {
            int nbTp = 1 + r.nextInt(3);
            int[] tauxPossibles = { 0, 10, 20, 30, 50, 60, 70, 80, 90, 100 };
            for (int t = 0; t < nbTp; t++) {
                organismes.add(new Organisme("lien-" + t, tauxPossibles[r.nextInt(tauxPossibles.length)], t + 1));
            }
            int nbLignes = 1 + r.nextInt(4);
            for (int i = 0; i < nbLignes; i++) {
                int prix = r.nextInt(10) == 0 ? 0 : (1 + r.nextInt(400)) * 25;
                int quantite = 1 + r.nextInt(5);
                Ligne l = new Ligne("ligne-" + i, prix, quantite);
                for (Organisme o : organismes) {
                    int tirage = r.nextInt(4);
                    if (tirage == 0 || prix == 0) {
                        continue; // pas de reference pour cet organisme
                    }
                    TiersPayantPrixInput ref = new TiersPayantPrixInput();
                    ref.setCompteTiersPayantId(o.lien);
                    PrixReferenceType type = tirage == 1 ? PrixReferenceType.MIX_TAUX_PRIX
                            : tirage == 2 ? PrixReferenceType.PRIX_REFERENCE : PrixReferenceType.TAUX;
                    ref.setOptionPrixType(type);
                    // prix de reference de 5 au prix de vente (bornes de la caisse), parfois egal au prix
                    ref.setPrice(type == PrixReferenceType.TAUX ? 0
                            : r.nextInt(5) == 0 ? prix : Math.max(5, (int) (prix * (0.3 + 0.7 * r.nextDouble()))));
                    ref.setRate(type == PrixReferenceType.PRIX_REFERENCE ? 100f : 5 * (1 + r.nextInt(20)));
                    l.references.put(o.lien, ref);
                }
                lignes.add(l);
                total += prix * quantite;
            }
            if (r.nextInt(4) == 0) {
                avecPlafond = true;
                Organisme o = organismes.get(r.nextInt(organismes.size()));
                o.plafondParVente = true;
                o.plafond = 5 * (1 + r.nextInt(400));
            }
        }

        CalculationInput entree(boolean baseParTp) {
            CalculationInput in = new CalculationInput();
            in.setNatureVente(NatureVente.ASSURANCE);
            in.setDiscountAmount(BigDecimal.ZERO);
            in.setTotalSalesAmount(BigDecimal.valueOf(total));
            in.setBasePrixReferenceParTiersPayant(baseParTp);
            List<TiersPayantInput> tps = new ArrayList<>();
            for (Organisme o : organismes) {
                TiersPayantInput tp = new TiersPayantInput();
                tp.setClientTiersPayantId(o.lien);
                tp.setTiersPayantId("tp-" + o.lien);
                tp.setTiersPayantFullName(o.lien.toUpperCase());
                tp.setTaux(o.taux / 100.0f);
                tp.setPriorite(o.priorite);
                if (o.plafondParVente) {
                    tp.setPlafondJournalierClient(BigDecimal.valueOf(o.plafond));
                }
                tps.add(tp);
            }
            in.setTiersPayants(tps);
            List<SaleItemInput> items = new ArrayList<>();
            for (Ligne l : lignes) {
                SaleItemInput si = new SaleItemInput();
                si.setSalesLineId(l.id);
                si.setQuantity(l.quantite);
                si.setRegularUnitPrice(BigDecimal.valueOf(l.prix));
                si.setTotalSalesAmount(BigDecimal.valueOf((long) l.prix * l.quantite));
                // copies : le moteur ne doit pas modifier le jeu d'essai entre les deux appels
                for (TiersPayantPrixInput ref : l.references.values()) {
                    TiersPayantPrixInput c = new TiersPayantPrixInput();
                    c.setCompteTiersPayantId(ref.getCompteTiersPayantId());
                    c.setOptionPrixType(ref.getOptionPrixType());
                    c.setPrice(ref.getPrice());
                    c.setRate(ref.getRate());
                    si.getPrixAssurances().add(c);
                }
                items.add(si);
            }
            in.setSaleItems(items);
            return in;
        }

        boolean sansReference() {
            return lignes.stream().allMatch(l -> l.references.isEmpty());
        }

        String decrire() {
            StringBuilder s = new StringBuilder("organismes ");
            for (Organisme o : organismes) {
                s.append(o.lien).append(':').append(o.taux).append('%')
                        .append(o.plafondParVente ? "/plafond " + o.plafond : "").append(' ');
            }
            for (Ligne l : lignes) {
                s.append("| ").append(l.id).append(' ').append(l.prix).append('x').append(l.quantite).append(' ');
                l.references.forEach((k, v) -> s.append(k).append('=').append(v.getOptionPrixType()).append('/')
                        .append(v.getPrice()).append('/').append((int) v.getRate()).append(' '));
            }
            return s.toString();
        }
    }

    /**
     * Oracle independant de la regle a 1 : pour chaque ligne et chaque organisme par priorite, base = sa reference
     * (sinon le prix de vente) x quantite, taux de sa reference (TAUX, MIX) sinon de la vente, part = base x taux
     * bornee au reste du prix de la ligne ; a 100 % sans reference, tout le reste.
     */
    private static Map<String, BigDecimal> attenduA1SansPlafond(Vente v) {
        Map<String, BigDecimal> parts = new HashMap<>();
        for (Organisme o : v.organismes) {
            parts.put(o.lien, BigDecimal.ZERO);
        }
        for (Ligne l : v.lignes) {
            BigDecimal reste = BigDecimal.valueOf((long) l.prix * l.quantite);
            for (Organisme o : v.organismes) {
                if (reste.signum() <= 0) {
                    break;
                }
                TiersPayantPrixInput ref = l.references.get(o.lien);
                boolean aPrix = ref != null && ref.getOptionPrixType() != PrixReferenceType.TAUX && ref.getPrice() > 0;
                int base = aPrix ? ref.getPrice() : l.prix;
                int taux = ref != null && ref.getOptionPrixType() != PrixReferenceType.PRIX_REFERENCE
                        ? (int) ref.getRate() : o.taux;
                BigDecimal part = taux == 100 && !aPrix ? reste : brut(base, l.quantite, taux).min(reste);
                reste = reste.subtract(part);
                parts.put(o.lien, parts.get(o.lien).add(part));
            }
        }
        return parts;
    }

    private static BigDecimal part(CalculationResult r, String lien) {
        for (TiersPayantLineOutput l : r.getTiersPayantLines()) {
            if (l.getClientTiersPayantId().equals(lien)) {
                return l.getMontant();
            }
        }
        return BigDecimal.ZERO;
    }

    private static CalculationResult calcul(Vente v, boolean baseParTp) {
        return new TiersPayantCalculationService().calculate(v.entree(baseParTp));
    }

    @Test
    void parametreA1ChaqueOrganismeVautSaBaseFoisSonTaux() {
        Random r = new Random(GRAINE);
        int verifiees = 0;
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            if (v.avecPlafond) {
                continue;
            }
            CalculationResult res = calcul(v, true);
            Map<String, BigDecimal> attendu = attenduA1SansPlafond(v);
            for (Organisme o : v.organismes) {
                assertEquals(attendu.get(o.lien).setScale(0, RoundingMode.HALF_UP), part(res, o.lien).setScale(0),
                        "vente " + k + ", " + o.lien + " : " + v.decrire());
            }
            verifiees++;
        }
        assertTrue(verifiees > VENTES / 2, "ventes verifiees : " + verifiees);
    }

    @Test
    void parametreA1LesPartsDUneLigneNeDepassentJamaisSonPrix() {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            CalculationResult res = calcul(v, true);
            for (CalculatedShare s : res.getItemShares()) {
                Ligne l = v.lignes.stream().filter(x -> x.id.equals(s.getSaleLineId())).findFirst().orElseThrow();
                BigDecimal somme = BigDecimal.ZERO;
                for (BigDecimal p : s.getTiersPayants().values()) {
                    assertTrue(p.signum() >= 0, "part negative, vente " + k + " : " + v.decrire());
                    somme = somme.add(p);
                }
                assertTrue(somme.compareTo(BigDecimal.valueOf((long) l.prix * l.quantite)) <= 0,
                        "ligne " + l.id + " : parts " + somme + " > prix, vente " + k + " : " + v.decrire());
                assertEquals(0, somme.compareTo(s.getTotalReimbursedAmount()), "total de la ligne, vente " + k);
            }
        }
    }

    @Test
    void auxDeuxValeursLaPartClientVautLeResteJamaisNegative() {
        Random r = new Random(GRAINE + 2);
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            for (boolean b : new boolean[] { false, true }) {
                CalculationResult res = calcul(v, b);
                BigDecimal sommeParts = BigDecimal.ZERO;
                for (TiersPayantLineOutput l : res.getTiersPayantLines()) {
                    assertTrue(l.getMontant().signum() >= 0, "part negative, vente " + k + " a " + (b ? 1 : 0));
                    sommeParts = sommeParts.add(l.getMontant());
                }
                assertEquals(0, sommeParts.compareTo(res.getTotalTiersPayant()),
                        "total tiers-payant = somme des parts, vente " + k + " a " + (b ? 1 : 0));
                BigDecimal attendu = BigDecimal.valueOf(v.total).subtract(res.getTotalTiersPayant())
                        .max(BigDecimal.ZERO).setScale(0, RoundingMode.HALF_UP);
                assertEquals(0, attendu.compareTo(res.getTotalPatientShare()),
                        "part client, vente " + k + " a " + (b ? 1 : 0) + " : " + v.decrire());
            }
        }
    }

    @Test
    void sansReferenceOuAvecUnSeulOrganismeLesDeuxValeursDonnentLaMemeChose() {
        Random r = new Random(GRAINE + 3);
        int comparees = 0;
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            if (!v.sansReference() && v.organismes.size() > 1) {
                continue;
            }
            CalculationResult r0 = calcul(v, false);
            CalculationResult r1 = calcul(v, true);
            for (Organisme o : v.organismes) {
                assertEquals(0, part(r0, o.lien).compareTo(part(r1, o.lien)),
                        "vente " + k + ", " + o.lien + " : " + v.decrire());
            }
            assertEquals(0, r0.getTotalPatientShare().compareTo(r1.getTotalPatientShare()), "client, vente " + k);
            assertEquals(r0.getWarningMessage(), r1.getWarningMessage(), "avertissement, vente " + k);
            comparees++;
        }
        assertTrue(comparees > 500, "ventes comparees : " + comparees);
    }

    @Test
    void unPlafondParVenteEcreteLaPartSansToucherAuxAutresAuxDeuxValeurs() {
        Random r = new Random(GRAINE + 4);
        int verifiees = 0;
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            if (!v.avecPlafond) {
                continue;
            }
            Organisme plafonne = v.organismes.stream().filter(o -> o.plafondParVente).findFirst().orElseThrow();
            for (boolean b : new boolean[] { false, true }) {
                CalculationResult res = calcul(v, b);
                // sans le plafond, la meme vente
                plafonne.plafondParVente = false;
                CalculationResult libre = calcul(v, b);
                plafonne.plafondParVente = true;
                for (Organisme o : v.organismes) {
                    BigDecimal avec = part(res, o.lien), sans = part(libre, o.lien);
                    if (o == plafonne) {
                        assertEquals(0,
                                sans.min(BigDecimal.valueOf(o.plafond)).setScale(0, RoundingMode.HALF_UP)
                                        .compareTo(avec.setScale(0, RoundingMode.HALF_UP)),
                                "plafond, vente " + k + " a " + (b ? 1 : 0) + " : " + v.decrire());
                        assertTrue(avec.compareTo(sans) < 0 == !res.getWarningMessage().isEmpty(),
                                "avertissement si et seulement si ecrete, vente " + k + " a " + (b ? 1 : 0));
                    } else {
                        assertEquals(0, avec.compareTo(sans),
                                "autre organisme touche par le plafond, vente " + k + " a " + (b ? 1 : 0));
                    }
                }
            }
            verifiees++;
        }
        assertTrue(verifiees > 500, "ventes verifiees : " + verifiees);
    }

    @Test
    void parametreA1LaBaseAfficheeEstCelleDuPrioritaireQuiAUneReference() {
        Random r = new Random(GRAINE + 5);
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            CalculationResult res = calcul(v, true);
            for (CalculatedShare s : res.getItemShares()) {
                Ligne l = v.lignes.stream().filter(x -> x.id.equals(s.getSaleLineId())).findFirst().orElseThrow();
                Integer attendu = null;
                for (Organisme o : v.organismes) {
                    TiersPayantPrixInput ref = l.references.get(o.lien);
                    if (ref != null && ref.getOptionPrixType() != PrixReferenceType.TAUX && ref.getPrice() > 0) {
                        attendu = ref.getPrice();
                        break;
                    }
                }
                assertEquals(attendu, s.getCalculationBasePrice(), "base affichee, vente " + k + " : " + v.decrire());
            }
        }
    }
}
