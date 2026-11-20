package rest.service.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Plan du 19/11, point 3 : pagination de l'analyse tiers payant par produit. Des milliers de listes tirees au hasard
 * (graine fixe), tailles de page variees : les pages couvrent la liste exactement une fois, dans l'ordre ; les totaux =
 * somme de toutes les lignes, identiques sur chaque page ; sans limit, toute la liste ; taux = marge / CA HT.
 */
class PageAnalyseCoherenceTest {

    private static AnalyseTiersPayantDTO ligne(Random r, int i) {
        AnalyseTiersPayantDTO d = new AnalyseTiersPayantDTO();
        d.setCip("C" + i);
        d.setQuantite(r.nextInt(50));
        long ttc = r.nextInt(500000), ht = ttc * 100 / 118, achat = r.nextInt(400000);
        d.setCaTtc(ttc);
        d.setCaHt(ht);
        d.setMontantAchat(achat);
        d.setMarge(ht - achat);
        return d;
    }

    @Test
    void pagesEtTotaux() {
        Random r = new Random(20261119L);
        for (int essai = 0; essai < 3000; essai++) {
            int n = r.nextInt(300);
            List<AnalyseTiersPayantDTO> l = new ArrayList<>();
            long q = 0, ttc = 0, ht = 0, ach = 0, mg = 0;
            for (int i = 0; i < n; i++) {
                AnalyseTiersPayantDTO d = ligne(r, i);
                l.add(d);
                q += d.getQuantite();
                ttc += d.getCaTtc();
                ht += d.getCaHt();
                ach += d.getMontantAchat();
                mg += d.getMarge();
            }
            int taille = 1 + r.nextInt(80);
            List<String> vus = new ArrayList<>();
            for (int start = 0; start < Math.max(n, 1); start += taille) {
                JSONObject rep = PageAnalyse.reponse(l, start, taille);
                assertEquals(n, rep.getInt("total"));
                JSONObject t = rep.getJSONObject("totaux");
                assertEquals(q, t.getLong("quantite"));
                assertEquals(ttc, t.getLong("caTtc"));
                assertEquals(ht, t.getLong("caHt"));
                assertEquals(ach, t.getLong("montantAchat"));
                assertEquals(mg, t.getLong("marge"));
                assertEquals(ht == 0 ? 0d : Math.round(mg * 10000d / ht) / 100d, t.getDouble("tauxMarge"), 1e-9);
                List<AnalyseTiersPayantDTO> page = PageAnalyse.tranche(l, start, taille);
                assertTrue(page.size() <= taille);
                page.forEach(d -> vus.add(d.getCip()));
            }
            List<String> attendu = new ArrayList<>();
            l.forEach(d -> attendu.add(d.getCip()));
            assertEquals(attendu, vus, "chaque produit une fois, dans l'ordre, essai " + essai);
            assertEquals(n, PageAnalyse.tranche(l, null, null).size());
            assertEquals(n, PageAnalyse.tranche(l, 0, 0).size());
            assertEquals(0, PageAnalyse.tranche(l, n + 10, taille).size());
        }
    }
}
