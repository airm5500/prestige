package rest.service.impl.reserve;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Onglet « Liste réserve » (15/11) : regle de la premiere configuration de la reserve.
 * <p>
 * COHERENCE sur 20 000 cas tires au hasard (graine fixe ; VMJ nulle, absente, tres petite, grande ; 1 a 30 jours ; les
 * trois seuils) :
 * </p>
 * <ul>
 * <li>capacite maxi rayon = VMJ x jours arrondie au superieur, au moins 1 ; aucune sans vente ;</li>
 * <li>seuil mini rayon = capacite x ½ ou ⅔ arrondi au superieur, ou = capacite ; jamais au-dessus de la capacite,
 * jamais en dessous de 1 ;</li>
 * <li>controle d'un enregistrement : capacite et seuil entiers positifs, seuil &lt;= capacite ; un produit qui a du
 * stock en reserve ne sort pas de la reserve ; les refus sont lignes par ligne, les autres lignes restent valables
 * ;</li>
 * <li>bilan : mis en reserve + retires + reglages modifies + refus + inchanges = lignes envoyees.</li>
 * </ul>
 */
class RegleListeReserveCoherenceTest {

    @Test
    void capaciteEtSeuil() {
        Random h = new Random(15_11_2026L);
        String[] seuils = { RegleListeReserve.DEMI, RegleListeReserve.DEUX_TIERS, RegleListeReserve.EGAL };
        for (int cas = 0; cas < 20_000; cas++) {
            Double vmj = h.nextInt(10) == 0 ? null
                    : h.nextInt(6) == 0 ? 0.0 : h.nextInt(4) == 0 ? h.nextDouble() * 0.2 : h.nextDouble() * 80;
            int jours = 1 + h.nextInt(30);
            String s = seuils[h.nextInt(3)];
            Integer cap = RegleListeReserve.capacite(vmj, jours);
            String cle = "cas " + cas + " vmj=" + vmj + " j=" + jours + " " + s;
            if (vmj == null || vmj <= 0) {
                assertNull(cap, cle + " : pas de capacite sans vente");
                assertNull(RegleListeReserve.seuil(cap, s), cle);
                continue;
            }
            assertEquals(Math.max(1, (int) Math.ceil(vmj * jours - 1e-9)), cap.intValue(), cle);
            assertTrue(cap >= vmj * jours - 1e-9 && cap >= 1, cle);
            Integer seuil = RegleListeReserve.seuil(cap, s);
            int attendu = RegleListeReserve.EGAL.equals(s) ? cap
                    : (int) Math.ceil(cap * (RegleListeReserve.DEMI.equals(s) ? 1 / 2.0 : 2 / 3.0) - 1e-9);
            assertEquals(Math.max(1, attendu), seuil.intValue(), cle);
            assertTrue(seuil >= 1 && seuil <= cap, cle + " : 1 <= seuil <= capacite");
        }
    }

    @Test
    void exemplesDeLaMaquette() {
        assertEquals(19, RegleListeReserve.capacite(18.4, 1).intValue());
        assertEquals(13, RegleListeReserve.seuil(19, RegleListeReserve.DEUX_TIERS).intValue());
        assertEquals(10, RegleListeReserve.seuil(19, RegleListeReserve.DEMI).intValue());
        assertEquals(19, RegleListeReserve.seuil(19, RegleListeReserve.EGAL).intValue());
        assertEquals(1, RegleListeReserve.capacite(0.03, 1).intValue());
        assertEquals(1, RegleListeReserve.seuil(1, RegleListeReserve.DEMI).intValue());
        assertEquals(30, RegleListeReserve.capacite(1.0, 30).intValue(),
                "1 par jour sur 30 jours, sans arrondi parasite");
    }

    @Test
    void controleDesEnregistrements() {
        Random h = new Random(1511L);
        for (int cas = 0; cas < 5_000; cas++) {
            int n = h.nextInt(25);
            JSONArray lignes = new JSONArray();
            int miseEnReserve = 0, retires = 0, reglages = 0, refus = 0, inchanges = 0;
            for (int i = 0; i < n; i++) {
                boolean avant = h.nextBoolean(), apres = h.nextBoolean();
                int stockReserve = h.nextInt(3) == 0 ? h.nextInt(50) : 0;
                Integer capAvant = h.nextInt(4) == 0 ? null : h.nextInt(40),
                        seuilAvant = capAvant == null ? null : h.nextInt(capAvant + 1);
                Integer cap = h.nextInt(8) == 0 ? Integer.valueOf(-1 - h.nextInt(5))
                        : h.nextInt(5) == 0 ? capAvant : Integer.valueOf(h.nextInt(40));
                Integer seuil = cap == null ? null
                        : h.nextInt(7) == 0 ? cap + 1 + h.nextInt(5) : h.nextInt(Math.max(1, cap + 1));
                if (h.nextInt(10) == 0) {
                    cap = null;
                    seuil = null;
                }
                JSONObject l = new JSONObject().put("id", "P" + i).put("enReserve", apres)
                        .put("capacite", cap == null ? JSONObject.NULL : cap)
                        .put("seuilMini", seuil == null ? JSONObject.NULL : seuil);
                RegleListeReserve.Etat e = new RegleListeReserve.Etat(avant, stockReserve, capAvant, seuilAvant);
                RegleListeReserve.Decision d = RegleListeReserve.decider(l, e);
                String cle = "cas " + cas + " ligne " + i + " " + l + " avant=" + avant + "/" + stockReserve + "/"
                        + capAvant + "/" + seuilAvant;
                boolean valeursFausses = apres && cap != null && (cap < 0 || seuil == null || seuil < 0 || seuil > cap);
                if (avant && !apres && stockReserve > 0) {
                    assertEquals(RegleListeReserve.Action.REFUS, d.action, cle + " : stock reserve > 0, ne sort pas");
                    assertTrue(d.motif.contains(String.valueOf(stockReserve)), cle);
                    refus++;
                } else if (valeursFausses) {
                    assertEquals(RegleListeReserve.Action.REFUS, d.action, cle + " : valeurs refusees");
                    assertFalse(d.motif.isEmpty(), cle);
                    refus++;
                } else if (!avant && apres) {
                    assertEquals(RegleListeReserve.Action.MISE_EN_RESERVE, d.action, cle);
                    miseEnReserve++;
                } else if (avant && !apres) {
                    assertEquals(RegleListeReserve.Action.RETRAIT, d.action, cle);
                    assertEquals(capAvant, d.capacite, cle + " : le retrait garde la capacite");
                    assertEquals(seuilAvant, d.seuilMini, cle + " : le retrait garde le seuil");
                    retires++;
                } else if (apres && cap != null && (!cap.equals(capAvant) || !seuil.equals(seuilAvant))) {
                    assertEquals(RegleListeReserve.Action.REGLAGE, d.action, cle);
                    reglages++;
                } else {
                    assertEquals(RegleListeReserve.Action.AUCUNE, d.action, cle);
                    inchanges++;
                }
                if (d.action == RegleListeReserve.Action.MISE_EN_RESERVE
                        || d.action == RegleListeReserve.Action.REGLAGE) {
                    assertEquals(cap == null ? capAvant : cap, d.capacite, cle);
                    assertTrue(d.capacite == null || d.seuilMini == null || d.seuilMini <= d.capacite, cle);
                }
                lignes.put(l);
            }
            assertEquals(n, miseEnReserve + retires + reglages + refus + inchanges, "cas " + cas + " : bilan");
        }
    }
}
