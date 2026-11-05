package rest.service.prixreference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.PrixReference;
import dal.PrixReferenceJournal;
import dal.PrixReferenceJournalAction;
import dal.PrixReferenceType;
import dal.TFamille;
import dal.TTiersPayant;
import dal.TUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.calculation.TiersPayantCalculationService;
import rest.service.calculation.dto.CalculatedShare;
import rest.service.calculation.dto.CalculationInput;
import rest.service.calculation.dto.CalculationResult;
import rest.service.calculation.dto.NatureVente;
import rest.service.calculation.dto.SaleItemInput;
import rest.service.calculation.dto.TiersPayantInput;
import rest.service.calculation.dto.TiersPayantPrixInput;

/**
 * Tests de coherence (regle du 05/11) du cas 2, prix et taux de reference saisis a la caisse : des milliers de cas
 * tires au hasard avec une graine fixe (un echec se rejoue a l'identique), et pour chacun les regles qui doivent
 * toujours tenir, au lieu de quelques exemples choisis.
 *
 * <ul>
 * <li>bornes de la saisie : accepte si, et seulement si, 5 &lt;= prix &lt;= prix de vente (borne haute seulement si le
 * prix de vente est connu) et 5 &lt;= taux &lt;= 100 ; zero, vide et negatif refuses ;</li>
 * <li>moteur (inchange par le cas 2, mais c'est lui qui consomme ce que la caisse ecrit) : part de l'organisme =
 * somme des lignes de (prix de reference ou prix de vente) x quantite x taux de la ligne, jamais au-dessus de la base,
 * ecretee au plafond par vente, part du client = total - part, jamais negative ; avec deux organismes, le second prend
 * au plus le reste de la base ;</li>
 * <li>journal : avant / apres recopies tels quels, une modification a l'identique n'est pas un changement, la copie
 * detachee est fidele.</li>
 * </ul>
 */
class ReferenceCaisseCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int CAS = 20000;
    private static final int VENTES = 5000;
    private static final String LIEN_1 = "lien-1";
    private static final String LIEN_2 = "lien-2";

    private final TiersPayantCalculationService moteur = new TiersPayantCalculationService();

    /* ---------------------------------------------------------------- bornes de la saisie */

    @Test
    @DisplayName("bornes : accepte si et seulement si 5 <= prix <= prix de vente et 5 <= taux <= 100, sur 20 000 cas")
    void bornesDeLaSaisie() {
        Random r = new Random(GRAINE);
        int acceptes = 0;
        for (int k = 0; k < CAS; k++) {
            Integer valeur = r.nextInt(25) == 0 ? null : r.nextInt(20201) - 200;
            Integer taux = r.nextInt(25) == 0 ? null : r.nextInt(241) - 40;
            int prixVente = r.nextInt(5) == 0 ? 0 : 5 + r.nextInt(20000);
            boolean attendu = valeur != null && taux != null && valeur >= 5 && (prixVente <= 0 || valeur <= prixVente)
                    && taux >= 5 && taux <= 100;
            String motif = ReferenceCaisse.motifRefus(valeur, taux, prixVente);
            String cas = "cas " + k + " : prix " + valeur + ", taux " + taux + ", prix de vente " + prixVente;
            assertEquals(attendu, motif == null, cas + " -> " + motif);
            if (attendu) {
                acceptes++;
            } else {
                assertFalse(motif.isBlank(), cas);
                if (valeur != null && taux != null && valeur >= 5 && prixVente > 0 && valeur > prixVente) {
                    assertTrue(motif.contains("dépasse le prix de vente"), cas + " -> " + motif);
                }
            }
        }
        assertTrue(acceptes > CAS / 10 && acceptes < CAS * 9 / 10, "jeu d'essai desequilibre : " + acceptes);
        // zero et vide, en toutes lettres
        assertNotNull(ReferenceCaisse.motifRefus(0, 50, 1000));
        assertNotNull(ReferenceCaisse.motifRefus(500, 0, 1000));
        assertNotNull(ReferenceCaisse.motifRefus(null, null, 1000));
        assertNull(ReferenceCaisse.motifRefus(1000, 100, 1000));
        assertNull(ReferenceCaisse.motifRefus(5, 5, 1000));
    }

    /* ---------------------------------------------------------------- moteur avec references */

    /** Une ligne tiree : prix de vente, quantite, et eventuellement une reference MIX pour le premier organisme. */
    private static final class Ligne {
        final int pu;
        final int qte;
        final Integer valeur;
        final Integer tauxRef;

        Ligne(Random r) {
            pu = 5 * (20 + r.nextInt(1800));
            qte = r.nextInt(3) == 0 ? 1 : 1 + r.nextInt(6);
            if (r.nextBoolean()) {
                int tirage = r.nextInt(6);
                valeur = tirage == 0 ? pu : tirage == 1 ? 5 : 5 + r.nextInt(pu - 4);
                tauxRef = tirage == 2 ? 100 : 5 + r.nextInt(96);
            } else {
                valeur = null;
                tauxRef = null;
            }
        }

        int total() {
            return pu * qte;
        }

        /** Base de calcul de la ligne : prix de reference s'il y en a un, sinon prix de vente, fois la quantite. */
        BigDecimal base() {
            return BigDecimal.valueOf(valeur == null ? pu : valeur).multiply(BigDecimal.valueOf(qte));
        }

        SaleItemInput entree(String id) {
            SaleItemInput s = new SaleItemInput();
            s.setSalesLineId(id);
            s.setQuantity(qte);
            s.setRegularUnitPrice(BigDecimal.valueOf(pu));
            s.setTotalSalesAmount(BigDecimal.valueOf(total()));
            s.setDiscountAmount(BigDecimal.ZERO);
            if (valeur != null) {
                TiersPayantPrixInput p = new TiersPayantPrixInput();
                p.setCompteTiersPayantId(LIEN_1);
                p.setPrice(valeur);
                p.setRate(tauxRef);
                p.setOptionPrixType(PrixReferenceType.MIX_TAUX_PRIX);
                s.getPrixAssurances().add(p);
            }
            return s;
        }

        @Override
        public String toString() {
            return pu + "x" + qte + (valeur == null ? "" : " ref " + valeur + "@" + tauxRef + "%");
        }
    }

    private static TiersPayantInput organisme(String lien, int taux, int priorite) {
        TiersPayantInput tp = new TiersPayantInput();
        tp.setClientTiersPayantId(lien);
        tp.setTiersPayantId("tp-" + lien);
        tp.setTiersPayantFullName(lien);
        tp.setTaux(taux / 100f);
        tp.setPriorite(priorite);
        return tp;
    }

    private CalculationResult calculer(List<Ligne> lignes, List<TiersPayantInput> organismes) {
        CalculationInput input = new CalculationInput();
        input.setNatureVente(NatureVente.ASSURANCE);
        input.setDiscountAmount(BigDecimal.ZERO);
        input.setTiersPayants(new ArrayList<>(organismes));
        List<SaleItemInput> entrees = new ArrayList<>();
        int total = 0;
        for (int i = 0; i < lignes.size(); i++) {
            entrees.add(lignes.get(i).entree("ligne-" + i));
            total += lignes.get(i).total();
        }
        input.setSaleItems(entrees);
        input.setTotalSalesAmount(BigDecimal.valueOf(total));
        return moteur.calculate(input);
    }

    private static List<Ligne> vente(Random r) {
        List<Ligne> lignes = new ArrayList<>();
        int n = 1 + r.nextInt(6);
        for (int i = 0; i < n; i++) {
            lignes.add(new Ligne(r));
        }
        return lignes;
    }

    /** Part attendue d'une ligne pour un taux donne (en %), sans arrondi. */
    private static BigDecimal part(Ligne l, int taux) {
        return l.base().multiply(BigDecimal.valueOf(taux)).divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
    }

    private static int arrondi(BigDecimal v) {
        return v.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    private static void proche(String quoi, BigDecimal attendu, BigDecimal obtenu, String vente) {
        // le moteur multiplie par un taux en virgule flottante : une unite d'ecart au plus, par l'arrondi
        assertTrue(obtenu.subtract(attendu).abs().compareTo(BigDecimal.ONE) <= 0,
                quoi + " : attendu " + attendu + ", obtenu " + obtenu + ", " + vente);
    }

    @Test
    @DisplayName("un organisme : part = somme des (reference ou prix) x quantite x taux de la ligne, plafond par vente, client >= 0")
    void unOrganismeAvecReferencesTireesAuHasard() {
        Random r = new Random(GRAINE + 1);
        int avecReference = 0;
        int plafonnees = 0;
        for (int k = 0; k < VENTES; k++) {
            List<Ligne> lignes = vente(r);
            int tauxTp = 5 * (1 + r.nextInt(20));
            TiersPayantInput tp = organisme(LIEN_1, tauxTp, 1);
            BigDecimal somme = BigDecimal.ZERO;
            int total = 0;
            for (Ligne l : lignes) {
                somme = somme.add(part(l, l.valeur == null ? tauxTp : l.tauxRef));
                total += l.total();
                if (l.valeur != null) {
                    avecReference++;
                }
            }
            Integer plafond = null;
            if (r.nextInt(4) == 0 && somme.intValue() > 10) {
                plafond = 1 + r.nextInt(somme.intValue());
                tp.setPlafondJournalierClient(BigDecimal.valueOf(plafond));
                plafonnees++;
            }
            String vente = "vente " + k + " : " + lignes + " taux organisme " + tauxTp + " % plafond " + plafond;
            CalculationResult res = calculer(lignes, List.of(tp));

            // chaque ligne : base affichee, part de la ligne, jamais au-dessus de la base ni negative
            assertEquals(lignes.size(), res.getItemShares().size(), vente);
            for (int i = 0; i < lignes.size(); i++) {
                Ligne l = lignes.get(i);
                CalculatedShare s = res.getItemShares().get(i);
                assertEquals(l.valeur, s.getCalculationBasePrice(), "base de la ligne " + i + ", " + vente);
                BigDecimal p = s.getTiersPayants().get(LIEN_1);
                assertNotNull(p, "part de la ligne " + i + ", " + vente);
                proche("part de la ligne " + i, part(l, l.valeur == null ? tauxTp : l.tauxRef), p, vente);
                assertTrue(p.signum() >= 0 && p.compareTo(l.base()) <= 0, "ligne " + i + " hors base, " + vente);
            }
            // l'organisme : somme des lignes, ecretee au plafond par vente
            int attendu = arrondi(somme);
            if (plafond != null) {
                attendu = Math.min(attendu, plafond);
            }
            BigDecimal montant = res.getTiersPayantLines().get(0).getMontant();
            proche("part de l'organisme", BigDecimal.valueOf(attendu), montant, vente);
            proche("total tiers-payant", BigDecimal.valueOf(attendu), res.getTotalTiersPayant(), vente);
            assertTrue(montant.compareTo(BigDecimal.valueOf(total)) <= 0, "part au-dessus de la vente, " + vente);
            // le client paie le reste, jamais moins que zero
            assertEquals(0, res.getTotalSaleAmount().compareTo(BigDecimal.valueOf(total)), vente);
            BigDecimal client = res.getTotalPatientShare();
            assertEquals(0, client.compareTo(BigDecimal.valueOf(total).subtract(res.getTotalTiersPayant()).max(BigDecimal.ZERO)),
                    "part du client, " + vente);
            assertTrue(client.signum() >= 0, vente);
            // le taux memorise sur la vente est celui de l'organisme, jamais le taux effectif apres plafond
            assertEquals(tauxTp, res.getTiersPayantLines().get(0).getTauxApplique(), vente);
        }
        assertTrue(avecReference > VENTES, "trop peu de lignes avec reference : " + avecReference);
        assertTrue(plafonnees > VENTES / 10, "trop peu de ventes plafonnees : " + plafonnees);
    }

    @Test
    @DisplayName("deux organismes : le second prend au plus le reste de la base de la ligne, les deux parts ne depassent jamais la base")
    void deuxOrganismesSeparentLaBase() {
        Random r = new Random(GRAINE + 2);
        int lignesSaturees = 0;
        for (int k = 0; k < VENTES; k++) {
            List<Ligne> lignes = vente(r);
            int taux1 = 5 * (1 + r.nextInt(20));
            int taux2 = 5 * (1 + r.nextInt(20));
            String vente = "vente " + k + " : " + lignes + " taux " + taux1 + " % / " + taux2 + " %";
            CalculationResult res = calculer(lignes, List.of(organisme(LIEN_1, taux1, 1), organisme(LIEN_2, taux2, 2)));
            BigDecimal somme1 = BigDecimal.ZERO;
            BigDecimal somme2 = BigDecimal.ZERO;
            for (int i = 0; i < lignes.size(); i++) {
                Ligne l = lignes.get(i);
                CalculatedShare s = res.getItemShares().get(i);
                BigDecimal p1 = part(l, l.valeur == null ? taux1 : l.tauxRef);
                BigDecimal reste = l.base().subtract(p1);
                // sans reference et a 100 %, le second organisme prend tout le reste de la ligne (regle du moteur)
                BigDecimal p2 = (taux2 == 100 && l.valeur == null) ? reste : part(l, taux2).min(reste);
                if (reste.signum() <= 0) {
                    p2 = BigDecimal.ZERO;
                }
                BigDecimal o1 = s.getTiersPayants().get(LIEN_1);
                BigDecimal o2 = s.getTiersPayants().getOrDefault(LIEN_2, BigDecimal.ZERO);
                proche("organisme 1, ligne " + i, p1, o1, vente);
                proche("organisme 2, ligne " + i, p2, o2, vente);
                assertTrue(o1.add(o2).compareTo(l.base().add(BigDecimal.ONE)) <= 0, "les deux parts depassent la base, ligne " + i + ", " + vente);
                if (p2.compareTo(part(l, taux2)) < 0) {
                    lignesSaturees++;
                }
                somme1 = somme1.add(p1);
                somme2 = somme2.add(p2);
            }
            proche("part de l'organisme 1", BigDecimal.valueOf(arrondi(somme1)), res.getTiersPayantLines().get(0).getMontant(), vente);
            proche("part de l'organisme 2", BigDecimal.valueOf(arrondi(somme2)), res.getTiersPayantLines().get(1).getMontant(), vente);
            assertTrue(res.getTotalPatientShare().signum() >= 0, vente);
        }
        assertTrue(lignesSaturees > VENTES / 5, "trop peu de lignes ou le second organisme est borne : " + lignesSaturees);
    }

    /* ---------------------------------------------------------------- journal et copie */

    private static PrixReference reference(Random r, String id) {
        PrixReference p = new PrixReference();
        p.setId(id);
        p.setProduit(new TFamille("produit-" + r.nextInt(50)));
        p.setTiersPayant(new TTiersPayant("tp-" + r.nextInt(5)));
        p.setValeur(r.nextInt(20000));
        p.setValeurTaux(r.nextInt(4) == 0 ? null : (float) r.nextInt(101));
        p.setType(PrixReferenceType.values()[r.nextInt(PrixReferenceType.values().length)]);
        p.setEnabled(r.nextInt(5) != 0);
        return p;
    }

    private static boolean memeTaux(Float a, Float b) {
        return a == null ? b == null : b != null && Math.abs(a - b) < 0.0001f;
    }

    @Test
    @DisplayName("journal : avant / apres recopies, modification a l'identique = pas de changement, copie fidele, sur 20 000 tirages")
    void journalEtCopieSurDesReferencesTireesAuHasard() {
        Random r = new Random(GRAINE + 3);
        TUser u = new TUser();
        u.setLgUSERID("u-1");
        u.setStrFIRSTNAME("Caisse");
        u.setStrLASTNAME("Test");
        int changements = 0;
        for (int k = 0; k < CAS; k++) {
            PrixReference avant = reference(r, "ref-" + k);
            PrixReference apres;
            int variation = r.nextInt(7);
            if (variation == 0) {
                apres = ReferenceCaisse.copie(avant);
            } else if (variation == 1) {
                // seul le prix change
                apres = ReferenceCaisse.copie(avant);
                apres.setValeur(avant.getValeur() + 1 + r.nextInt(500));
            } else if (variation == 2) {
                // seul le taux change (y compris vers ou depuis « sans taux »)
                apres = ReferenceCaisse.copie(avant);
                Float nouveauTaux;
                if (avant.getValeurTaux() == null) {
                    nouveauTaux = (float) r.nextInt(101);
                } else if (r.nextInt(4) == 0) {
                    nouveauTaux = null;
                } else {
                    nouveauTaux = avant.getValeurTaux() + 1 + r.nextInt(50);
                }
                apres.setValeurTaux(nouveauTaux);
            } else if (variation == 3) {
                // seul le type change
                apres = ReferenceCaisse.copie(avant);
                apres.setType(PrixReferenceType.values()[(avant.getType().ordinal() + 1) % PrixReferenceType.values().length]);
            } else if (variation == 4) {
                // seul l'etat actif change
                apres = ReferenceCaisse.copie(avant);
                apres.setEnabled(!avant.isEnabled());
            } else {
                apres = reference(r, "ref-" + k);
                apres.setProduit(avant.getProduit());
                apres.setTiersPayant(avant.getTiersPayant());
            }
            boolean attendu = avant.getValeur() != apres.getValeur() || avant.getType() != apres.getType()
                    || !memeTaux(avant.getValeurTaux(), apres.getValeurTaux()) || avant.isEnabled() != apres.isEnabled();
            String cas = "cas " + k + " : " + avant.getValeur() + "/" + avant.getValeurTaux() + "/" + avant.getType() + " -> "
                    + apres.getValeur() + "/" + apres.getValeurTaux() + "/" + apres.getType();
            assertEquals(attendu, ReferenceCaisse.change(avant, apres), cas);
            if (attendu) {
                changements++;
            }
            PrixReferenceJournal j = ReferenceCaisse.journal(PrixReferenceJournalAction.MODIFICATION, avant, apres, u, "VO-" + k, "POSTE");
            assertEquals(avant.getValeur(), j.getAncienneValeur(), cas);
            assertEquals(apres.getValeur(), j.getNouvelleValeur(), cas);
            assertTrue(memeTaux(avant.getValeurTaux(), j.getAncienTaux()), cas);
            assertTrue(memeTaux(apres.getValeurTaux(), j.getNouveauTaux()), cas);
            assertEquals(avant.getType(), j.getAncienType(), cas);
            assertEquals(apres.getType(), j.getNouveauType(), cas);
            assertEquals(apres.getProduit().getLgFAMILLEID(), j.getProduitId(), cas);
            assertEquals(apres.getTiersPayant().getLgTIERSPAYANTID(), j.getTiersPayantId(), cas);
            assertEquals("VO-" + k, j.getVenteId(), cas);
            assertEquals("u-1", j.getUtilisateurId(), cas);
            // la copie detachee est un autre objet, a l'identique, et n'est pas un changement
            PrixReference c = ReferenceCaisse.copie(avant);
            assertNotSame(avant, c, cas);
            assertFalse(ReferenceCaisse.change(avant, c), cas);
            assertEquals(avant.getId(), c.getId(), cas);
            assertEquals(avant.getValeur(), c.getValeur(), cas);
            assertTrue(memeTaux(avant.getValeurTaux(), c.getValeurTaux()), cas);
            assertEquals(avant.getType(), c.getType(), cas);
            assertEquals(avant.isEnabled(), c.isEnabled(), cas);
        }
        assertTrue(changements > CAS / 2 && changements < CAS, "jeu d'essai desequilibre : " + changements);
    }
}
