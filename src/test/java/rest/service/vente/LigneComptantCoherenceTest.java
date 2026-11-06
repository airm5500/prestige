package rest.service.vente;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.VenteReglementDTO;
import dal.TFamille;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TTypeVente;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import util.Constant;

/**
 * Tests de coherence (regle du 05/11) de la ligne au comptant : au lieu de la seule vente de la maquette, des milliers
 * de ventes tirees au hasard (graine fixe : un echec se rejoue a l'identique), avec des prix, quantites, remises et
 * coches differents d'une ligne a l'autre, zero, plusieurs modes de reglement, differe, trop-percu ; et pour chacune
 * les regles qui doivent toujours tenir : rien ne se perd, rien ne se cree, jamais de negatif, le comptant d'abord.
 */
class LigneComptantCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int VENTES = 5000;

    private static TPreenregistrement vente(String type) {
        TPreenregistrement tp = new TPreenregistrement("V");
        tp.setLgTYPEVENTEID(new TTypeVente(type));
        return tp;
    }

    /** Une vente tiree : lignes (prix, remise, tva, quantite, famille du CA ou non, coche), et ce qu'on en attend. */
    private static final class Tirage {
        final List<TPreenregistrementDetail> lignes = new ArrayList<>();
        int cochees;
        int totalCochees;
        int remiseCochees;
        int tvaCochees;
        int accountCochees;
        int margeCochees;
        int totalToutes;

        Tirage(Random r, int k) {
            int n = 1 + r.nextInt(7);
            for (int i = 0; i < n; i++) {
                TPreenregistrementDetail d = new TPreenregistrementDetail("L" + k + "-" + i);
                int qte = 1 + r.nextInt(5);
                int pu = r.nextInt(10) == 0 ? 0 : (1 + r.nextInt(400)) * 25;
                int prix = pu * qte;
                int remise = r.nextInt(3) == 0 ? 0 : (int) (prix * (r.nextInt(21)) / 100.0);
                int tva = r.nextInt(2) == 0 ? 0 : prix / 10;
                boolean account = r.nextInt(5) != 0;
                boolean coche = r.nextInt(3) == 0;
                TFamille f = new TFamille("F" + i);
                f.setBoolACCOUNT(account);
                f.setIntPAF(pu / 2);
                d.setLgFAMILLEID(f);
                d.setIntQUANTITY(qte);
                d.setIntPRICEUNITAIR(pu);
                d.setIntPRICE(prix);
                d.setIntPRICEREMISE(remise);
                d.setMontantTva(tva);
                d.setBoolACCOUNT(account);
                d.setComptant(coche);
                lignes.add(d);
                totalToutes += prix;
                if (coche) {
                    cochees++;
                    totalCochees += prix;
                    remiseCochees += remise;
                    tvaCochees += tva;
                    if (account) {
                        accountCochees += prix;
                        margeCochees += (prix - remise - tva) - qte * (pu / 2);
                    }
                }
            }
        }

        String decrire() {
            StringBuilder b = new StringBuilder();
            for (TPreenregistrementDetail d : lignes) {
                b.append(d.isComptant() ? "[C]" : "[ ]").append(d.getIntPRICE()).append('-')
                        .append(d.getIntPRICEREMISE()).append(' ');
            }
            return b.toString();
        }
    }

    @Test
    void lesLignesDuMoteurSontExactementLesLignesNonCochees() {
        Random r = new Random(GRAINE);
        TPreenregistrement assurance = vente(Constant.VENTE_ASSURANCE_ID);
        TPreenregistrement carnet = vente(Constant.VENTE_AVEC_CARNET);
        for (int k = 0; k < VENTES; k++) {
            Tirage t = new Tirage(r, k);
            // parametre a 0, carnet, ou aucune coche : la liste rendue est l'objet recu, intact
            assertSame(t.lignes, LigneComptant.lignesPourLeCalcul(false, assurance, t.lignes), t.decrire());
            assertSame(t.lignes, LigneComptant.lignesPourLeCalcul(true, carnet, t.lignes), t.decrire());
            List<TPreenregistrementDetail> moteur = LigneComptant.lignesPourLeCalcul(true, assurance, t.lignes);
            if (t.cochees == 0) {
                assertSame(t.lignes, moteur, t.decrire());
                continue;
            }
            assertEquals(t.lignes.size() - t.cochees, moteur.size(), t.decrire());
            int j = 0;
            for (TPreenregistrementDetail d : t.lignes) {
                if (!d.isComptant()) {
                    assertSame(d, moteur.get(j++), "ordre, " + t.decrire());
                }
            }
            assertTrue(moteur.stream().noneMatch(TPreenregistrementDetail::isComptant), t.decrire());
            // lignes cochees + lignes assurance = toutes les lignes, rien ne se perd
            assertEquals(t.lignes.size(), LigneComptant.lignesComptant(t.lignes).size() + moteur.size(), t.decrire());
            assertEquals(t.totalToutes, LigneComptant.montantTotal(LigneComptant.lignesComptant(t.lignes))
                    + LigneComptant.montantTotal(moteur), t.decrire());
        }
    }

    @Test
    void montantsDesLignesCocheesRemiseTvaCaEtMarge() {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < VENTES; k++) {
            Tirage t = new Tirage(r, k);
            List<TPreenregistrementDetail> c = LigneComptant.lignesComptant(t.lignes);
            assertEquals(t.totalCochees, LigneComptant.montantTotal(c), t.decrire());
            assertEquals(t.remiseCochees, LigneComptant.montantRemise(c), t.decrire());
            assertEquals(t.tvaCochees, LigneComptant.montantTva(c), t.decrire());
            assertEquals(t.accountCochees, LigneComptant.montantAccount(c), t.decrire());
            assertEquals(t.margeCochees, LigneComptant.marge(c), t.decrire());
            int net = LigneComptant.montantComptant(t.lignes);
            assertEquals(Math.max(0, t.totalCochees - t.remiseCochees), net, t.decrire());
            assertTrue(net >= 0 && net <= t.totalCochees, t.decrire());
            assertEquals(t.cochees > 0, LigneComptant.aDesLignesComptant(t.lignes), t.decrire());
        }
    }

    @Test
    void arrondiACinqToujoursAuDessusEtJamaisPlusDeQuatre() {
        Random r = new Random(GRAINE + 2);
        for (int k = 0; k < VENTES; k++) {
            int v = r.nextInt(200000) - 1000;
            int a = LigneComptant.arrondi5(v);
            assertEquals(0, a % 5, v + " -> " + a);
            if (v <= 0) {
                assertEquals(0, a, v + " -> " + a);
            } else {
                assertTrue(a >= v && a - v <= 4, v + " -> " + a);
            }
        }
    }

    @Test
    void imputationComptantDAbordSansPerteNiNegatif() {
        Random r = new Random(GRAINE + 3);
        for (int k = 0; k < VENTES; k++) {
            int comptant = LigneComptant.arrondi5(r.nextInt(50000));
            int partClient = LigneComptant.arrondi5(r.nextInt(50000));
            int paye;
            switch (r.nextInt(4)) {
            case 0:
                paye = 0; // differe
                break;
            case 1:
                paye = r.nextInt(comptant + partClient + 1); // partiel
                break;
            case 2:
                paye = comptant + partClient + r.nextInt(5000); // trop-percu (monnaie)
                break;
            default:
                paye = comptant + partClient;
                break;
            }
            int[] i = LigneComptant.imputation(paye, comptant, partClient);
            String cas = "paye " + paye + " comptant " + comptant + " part client " + partClient;
            assertEquals(paye, i[0] + i[1], "rien ne se perd, " + cas);
            assertEquals(Math.min(paye, comptant), i[0], "le comptant d'abord, " + cas);
            assertTrue(i[0] >= 0 && i[1] >= 0, cas);
            assertTrue(i[0] <= comptant, "jamais plus que le comptant, " + cas);
            // le comptant n'est entame par l'assurance que quand il est entierement paye
            assertTrue(i[1] == 0 || i[0] == comptant, cas);
        }
    }

    private static VenteReglementDTO reglement(String type, int montant, int verse) {
        VenteReglementDTO x = new VenteReglementDTO();
        x.setTypeReglement(type);
        x.setMontant(montant);
        x.setMontantAttentu(montant);
        x.setMontantVerse(verse);
        return x;
    }

    private static int somme(Set<VenteReglementDTO> s) {
        return s.stream().mapToInt(VenteReglementDTO::getMontant).sum();
    }

    @Test
    void repartitionDesModesDeReglementSansPerteNiDoublon() {
        Random r = new Random(GRAINE + 4);
        String[] modes = { "1", "2", "5", "6", "7" };
        for (int k = 0; k < VENTES; k++) {
            Set<VenteReglementDTO> recus = new LinkedHashSet<>();
            int n = 1 + r.nextInt(2);
            int total = 0;
            for (int i = 0; i < n; i++) {
                int m = r.nextInt(10) == 0 ? 0 : (1 + r.nextInt(400)) * 25;
                recus.add(reglement(modes[(k + i) % modes.length], m, m + (i == 0 ? r.nextInt(3) * 500 : 0)));
                total += m;
            }
            int netComptant = r.nextInt(5) == 0 ? 0 : LigneComptant.arrondi5(r.nextInt(total + 2000));
            List<Set<VenteReglementDTO>> parts = LigneComptant.repartirReglements(recus, netComptant);
            String cas = "recus " + total + " (" + n + " modes) comptant " + netComptant;
            assertEquals(total, somme(parts.get(0)) + somme(parts.get(1)), "rien ne se perd, " + cas);
            assertEquals(Math.min(total, netComptant), somme(parts.get(0)), "le comptant d'abord, " + cas);
            for (Set<VenteReglementDTO> cote : parts) {
                Set<String> types = new LinkedHashSet<>();
                for (VenteReglementDTO x : cote) {
                    assertTrue(x.getMontant() >= 0, cas);
                    assertTrue(x.getMontantVerse() >= x.getMontant(), "verse >= montant, " + cas);
                    assertTrue(types.add(x.getTypeReglement()), "un mode une fois par vente, " + cas);
                }
                assertTrue(cote.size() <= 2, "au plus deux modes par vente, " + cas);
            }
            // tout ce qui va au comptant est reellement paye : aucune ligne a 0 de ce cote
            assertTrue(parts.get(0).stream().allMatch(x -> x.getMontant() > 0), cas);
        }
    }

    @Test
    void laChargeDeLaVenteComptantEtCelleDeLAssuranceSePartagentTout() {
        Random r = new Random(GRAINE + 5);
        for (int k = 0; k < VENTES; k++) {
            Tirage t = new Tirage(r, k);
            if (t.cochees == 0) {
                continue;
            }
            int netComptant = LigneComptant.arrondi5(LigneComptant.montantComptant(t.lignes));
            int partClient = LigneComptant.arrondi5(r.nextInt(40000));
            boolean differe = r.nextInt(4) == 0;
            int paye = differe ? 0
                    : (r.nextInt(3) == 0 ? r.nextInt(netComptant + partClient + 1) : netComptant + partClient);
            int monnaie = differe ? 0 : r.nextInt(3) * 100;
            int marge = r.nextInt(20000) - 5000;
            ClotureVenteParams vo = new ClotureVenteParams();
            vo.setVenteId("VO" + k);
            vo.setTypeVenteId("2");
            vo.setTypeRegleId(differe ? "4" : "1");
            vo.setClientId("C");
            vo.setUserVendeurId("U");
            vo.setRemiseId("R");
            vo.setMontantPaye(paye);
            vo.setMontantRecu(paye + monnaie);
            vo.setMontantRemis(monnaie);
            vo.setTotalRecap(t.totalToutes);
            vo.setMarge(marge);
            vo.setReglements(
                    new LinkedHashSet<>(List.of(reglement(vo.getTypeRegleId(), paye + monnaie, paye + monnaie))));
            ClotureVenteParams c = LigneComptant.parametresVenteComptant(vo, t.lignes, "VNO" + k);
            String cas = "vente " + k + " paye " + paye + " comptant " + netComptant + " : " + t.decrire();
            assertEquals("VNO" + k, c.getVenteId(), cas);
            assertEquals(Constant.VENTE_COMPTANT_ID, c.getTypeVenteId(), cas);
            assertEquals(vo.getTypeRegleId(), c.getTypeRegleId(), cas);
            assertEquals("C", c.getClientId(), cas);
            assertEquals("U", c.getUserVendeurId(), cas);
            assertEquals("R", c.getRemiseId(), cas);
            // montants payes : rien ne se perd, le comptant d'abord
            assertEquals(paye, c.getMontantPaye() + vo.getMontantPaye(), "paye, " + cas);
            assertEquals(Math.min(paye, netComptant), c.getMontantPaye().intValue(), "comptant d'abord, " + cas);
            assertEquals(c.getMontantPaye(), c.getMontantRecu(), "le comptant n'a pas de monnaie, " + cas);
            assertEquals(0, c.getMontantRemis().intValue(), cas);
            assertEquals(monnaie, vo.getMontantRemis().intValue(), "la monnaie reste a l'assurance, " + cas);
            assertEquals(paye + monnaie, c.getMontantRecu() + vo.getMontantRecu(), "recu, " + cas);
            // totaux et marge partages sans perte
            assertEquals(t.totalCochees, c.getTotalRecap().intValue(), cas);
            assertEquals(t.totalToutes, c.getTotalRecap() + vo.getTotalRecap(), "total, " + cas);
            assertEquals(marge, c.getMarge() + vo.getMarge(), "marge, " + cas);
            assertEquals(t.margeCochees, c.getMarge().intValue(), cas);
            assertEquals(0, c.getPartTP().intValue(), cas);
            // reglements : le comptant recoit exactement son net paye, le reste va a l'assurance
            assertEquals(Math.min(paye + monnaie, netComptant), somme(c.getReglements()),
                    "reglements comptant, " + cas);
            assertEquals(paye + monnaie, somme(c.getReglements()) + somme(vo.getReglements()), "reglements, " + cas);
            assertTrue(vo.getMontantPaye() >= 0 && vo.getMontantRecu() >= 0 && vo.getTotalRecap() >= 0, cas);
        }
    }
}
