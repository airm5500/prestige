package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 19/11, point 7 : « Modifier infos client » sans aucun changement n'ecrit rien. Coherence de la regle sur des
 * milliers de ventes tirees au hasard (graine fixe) : la demande identique a la vente est « sans changement » ; toute
 * modification reelle (client, ayant droit, compte, numero de bon, taux, ligne ajoutee ou retiree, nouveau principal)
 * ne l'est jamais ; les retouches sans effet (ordre des lignes, principal decoche, espaces autour des identifiants)
 * restent « sans changement ».
 */
public class InfosClientSansChangementCoherenceTest {

    private static void vrai(String message, boolean c) {
        assertTrue(c, message);
    }

    private static void faux(String message, boolean c) {
        assertFalse(c, message);
    }

    private static InfosClientSansChangement.Ligne l(String item, String compte, String bon, int taux, boolean p) {
        return new InfosClientSansChangement.Ligne(item, compte, bon, taux, p);
    }

    private static List<InfosClientSansChangement.Ligne> copie(List<InfosClientSansChangement.Ligne> a) {
        List<InfosClientSansChangement.Ligne> c = new ArrayList<>();
        a.forEach(x -> c.add(l(x.itemId, x.compteTp, x.numBon, x.taux, x.principal)));
        return c;
    }

    @Test
    public void casDuPharmacien() {
        List<InfosClientSansChangement.Ligne> vente = List.of(l("L1", "C1", "B-100", 80, true));
        vrai("rien change", InfosClientSansChangement.sansChangement("CL", "AD", vente, "CL", "AD",
                List.of(l("L1", "C1", "B-100", 80, true))));
        faux("numero de bon retape", InfosClientSansChangement.sansChangement("CL", "AD", vente, "CL", "AD",
                List.of(l("L1", "C1", "B-100M", 80, true))));
        faux("autre ayant droit", InfosClientSansChangement.sansChangement("CL", "AD", vente, "CL", "AD2",
                List.of(l("L1", "C1", "B-100", 80, true))));
        faux("tiers payant change", InfosClientSansChangement.sansChangement("CL", "AD", vente, "CL", "AD",
                List.of(l("L1", "C2", "B-100", 80, true))));
        faux("ligne ajoutee (sans identifiant)", InfosClientSansChangement.sansChangement("CL", "AD", vente, "CL", "AD",
                List.of(l("L1", "C1", "B-100", 50, true), l("", "C3", "B-7", 30, false))));
        faux("ligne retiree",
                InfosClientSansChangement.sansChangement("CL", "AD",
                        List.of(l("L1", "C1", "B", 50, true), l("L2", "C2", "B2", 30, false)), "CL", "AD",
                        List.of(l("L1", "C1", "B", 50, true))));
        vrai("vente sans ayant droit : null et vide equivalents", InfosClientSansChangement.sansChangement("CL", null,
                vente, "CL", "", List.of(l("L1", "C1", "B-100", 80, true))));
        faux("ligne en double",
                InfosClientSansChangement.sansChangement("CL", "AD",
                        List.of(l("L1", "C1", "B", 50, true), l("L2", "C2", "B2", 30, false)), "CL", "AD",
                        List.of(l("L1", "C1", "B", 50, true), l("L1", "C1", "B", 50, true))));
        faux("demande vide pour une vente a tiers payant",
                InfosClientSansChangement.sansChangement("CL", "AD", vente, "CL", "AD", null));
    }

    @Test
    public void milliersDeVentesTireesAuHasard() {
        Random r = new Random(20261119L);
        int identiques = 0, modifiees = 0, retouches = 0;
        for (int n = 0; n < 20000; n++) {
            int nb = r.nextInt(4); // 0 a 3 tiers payants
            List<InfosClientSansChangement.Ligne> vente = new ArrayList<>();
            int principal = nb == 0 ? -1 : r.nextInt(nb + 1) - 1; // -1 : aucun principal
            for (int i = 0; i < nb; i++) {
                vente.add(l("L" + n + "-" + i, "C" + r.nextInt(50), r.nextInt(5) == 0 ? null : "B" + r.nextInt(100000),
                        r.nextInt(101), i == principal));
            }
            String client = "CL" + r.nextInt(1000), ayant = r.nextInt(4) == 0 ? null : "AD" + r.nextInt(1000);

            // 1. demande identique
            assertTrue(InfosClientSansChangement.sansChangement(client, ayant, vente, client, ayant, copie(vente)));
            identiques++;

            // 2. une modification reelle
            List<InfosClientSansChangement.Ligne> d = copie(vente);
            String c2 = client, a2 = ayant;
            int quoi = r.nextInt(nb == 0 ? 3 : 9);
            int k = nb == 0 ? 0 : r.nextInt(nb);
            switch (quoi) {
            case 0:
                c2 = client + "X";
                break;
            case 1:
                a2 = (ayant == null ? "" : ayant) + "Y";
                break;
            case 2:
                d.add(l("", "C" + r.nextInt(50), "NOUVEAU", 10, false));
                break;
            case 3:
                d.set(k, l(d.get(k).itemId, d.get(k).compteTp + "Z", d.get(k).numBon, d.get(k).taux,
                        d.get(k).principal));
                break;
            case 4:
                d.set(k, l(d.get(k).itemId, d.get(k).compteTp, (d.get(k).numBon == null ? "" : d.get(k).numBon) + "M",
                        d.get(k).taux, d.get(k).principal));
                break;
            case 5:
                d.set(k, l(d.get(k).itemId, d.get(k).compteTp, d.get(k).numBon, d.get(k).taux + 1 + r.nextInt(5),
                        d.get(k).principal));
                break;
            case 6:
                d.remove(k);
                break;
            case 7:
                if (vente.get(k).principal) {
                    d.add(l("", "C" + r.nextInt(50), "NOUVEAU", 0, true));
                } else {
                    d.set(k, l(d.get(k).itemId, d.get(k).compteTp, d.get(k).numBon, d.get(k).taux, true));
                }
                break;
            default:
                d.set(k, l("AUTRE" + n, d.get(k).compteTp, d.get(k).numBon, d.get(k).taux, d.get(k).principal));
                break;
            }
            faux("modification " + quoi + " sur la vente " + n,
                    InfosClientSansChangement.sansChangement(client, ayant, vente, c2, a2, d));
            modifiees++;

            // 3. retouches sans effet : ordre des lignes, principal decoche, espaces autour des identifiants
            List<InfosClientSansChangement.Ligne> t = new ArrayList<>();
            for (InfosClientSansChangement.Ligne x : vente) {
                t.add(l(" " + x.itemId + " ", x.compteTp, x.numBon, x.taux, x.principal && r.nextBoolean()));
            }
            Collections.shuffle(t, r);
            assertTrue(InfosClientSansChangement.sansChangement(client, ayant, vente, " " + client,
                    ayant == null ? "" : ayant, t));
            retouches++;
        }
        assertEquals(20000, identiques);
        assertEquals(20000, modifiees);
        assertEquals(20000, retouches);
    }
}
