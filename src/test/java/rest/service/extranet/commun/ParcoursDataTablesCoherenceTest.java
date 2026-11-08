package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Coherence de la lecture paginee DataTables : sur des milliers de listes tirees au hasard (graine fixe), toutes les
 * lignes sont lues une fois et une seule, dans l'ordre, avec ⌈total / longueur⌉ pages ; chaque anomalie (page vide,
 * page repetee, total qui change, page trop longue, limite) arrete la lecture au lieu de rendre une liste incomplete.
 */
class ParcoursDataTablesCoherenceTest {

    private static final long GRAINE = 20261107L;

    /** Faux serveur DataTables en memoire ; les defauts sont injectes par page. */
    private static final class Liste implements ParcoursDataTables.Page {
        final int total;
        int pageVide = -1, pageRepetee = -1, pageTotalChange = -1, pageTropLongue = -1;
        /** Lignes servies au plus par page, quelle que soit la longueur demandee (0 : pas de plafond). */
        int plafond;
        boolean racine;
        final List<int[]> demandes = new ArrayList<>();

        Liste(int total) {
            this.total = total;
        }

        @Override
        public JSONObject lire(int start, int length, int draw) {
            demandes.add(new int[] { start, length, draw });
            if (plafond > 0) {
                length = Math.min(length, plafond);
            }
            int p = start / length;
            int debut = p == pageRepetee ? start - length : start;
            JSONArray data = new JSONArray();
            if (p != pageVide) {
                int fin = Math.min(total, debut + length + (p == pageTropLongue ? 1 : 0));
                for (int i = debut; i < fin; i++) {
                    data.put(new JSONArray().put("<a data-pscode='P" + i + "'>P" + i + "</a>").put("06/11/2026")
                            .put("YOP").put("Normal").put("").put(""));
                }
            }
            int t = p == pageTotalChange ? total + 1 : total;
            JSONObject dt = new JSONObject().put("recordsTotal", t).put("recordsFiltered", t).put("data", data)
                    .put("draw", String.valueOf(draw));
            return racine ? dt : new JSONObject().put("msg", new JSONArray()).put("datatables", dt);
        }
    }

    @Test
    void toutesLesLignesUneSeuleFoisDansLOrdre() throws Exception {
        Random r = new Random(GRAINE);
        for (int k = 0; k < 3000; k++) {
            int total = r.nextInt(5) == 0 ? r.nextInt(3) : r.nextInt(2000);
            int longueur = new int[] { 10, 25, 50, 100 }[r.nextInt(4)];
            Liste l = new Liste(total);
            l.racine = r.nextBoolean();
            List<String> lues = new ArrayList<>();
            ParcoursDataTables.Bilan b = ParcoursDataTables.parcourir(l, longueur, 10000, (pos, c) -> {
                assertEquals(lues.size(), pos);
                lues.add(c.getString(0));
            });
            assertEquals(total, b.lignes);
            assertEquals(total, lues.size());
            for (int i = 0; i < total; i++) {
                assertEquals("<a data-pscode='P" + i + "'>P" + i + "</a>", lues.get(i));
            }
            int pages = total == 0 ? 1 : (total + longueur - 1) / longueur;
            assertEquals(pages, b.pages);
            assertEquals(pages, l.demandes.size());
            for (int p = 0; p < pages; p++) {
                assertEquals(p * longueur, l.demandes.get(p)[0]);
                assertEquals(longueur, l.demandes.get(p)[1]);
                assertEquals(p + 1, l.demandes.get(p)[2], "draw croissant");
            }
        }
    }

    /**
     * Site qui sert moins de lignes que demande (08/11 : 100 demandees pour aller plus vite, 25 servies) : la lecture
     * se regle sur la longueur servie, lit tout une fois dans l'ordre ; sans plafond, une page par 100 lignes.
     */
    @Test
    void longueurServiePlusCourteQueDemandee() throws Exception {
        Random r = new Random(GRAINE + 2);
        for (int k = 0; k < 3000; k++) {
            int total = r.nextInt(5) == 0 ? r.nextInt(30) : r.nextInt(2000);
            int plafond = new int[] { 0, 10, 25, 50, 99 }[r.nextInt(5)];
            Liste l = new Liste(total);
            l.plafond = plafond;
            l.racine = r.nextBoolean();
            List<String> lues = new ArrayList<>();
            ParcoursDataTables.Bilan b = ParcoursDataTables.parcourir(l, 100, 10000, (pos, c) -> {
                assertEquals(lues.size(), pos);
                lues.add(c.getString(0));
            });
            assertEquals(total, lues.size(), "plafond " + plafond + ", total " + total);
            for (int i = 0; i < total; i++) {
                assertEquals("<a data-pscode='P" + i + "'>P" + i + "</a>", lues.get(i));
            }
            int servie = plafond == 0 || total <= plafond ? 100 : plafond;
            int pages = total == 0 ? 1 : (total + servie - 1) / servie;
            assertEquals(pages, b.pages);
            assertEquals(pages, l.demandes.size());
            for (int p = 1; p < pages; p++) {
                assertEquals(p * servie, l.demandes.get(p)[0]);
            }
        }
        /* plafond qui fait depasser la limite de pages : refuse apres la premiere page */
        Liste l = new Liste(1000);
        l.plafond = 25;
        ExtranetException e = assertThrows(ExtranetException.class,
                () -> ParcoursDataTables.parcourir(l, 100, 20, (x, c) -> {
                }));
        assertEquals(ExtranetException.Nature.PAGINATION, e.nature());
        assertEquals(1, l.demandes.size());
    }

    @Test
    void instantaneDuPlan414LignesPar25() throws Exception {
        Liste l = new Liste(414);
        ParcoursDataTables.Bilan b = ParcoursDataTables.parcourir(l, 25, 200, (p, c) -> {
        });
        assertEquals(17, b.pages);
        assertEquals(400, l.demandes.get(16)[0]);
        assertEquals(414, b.lignes);
    }

    @Test
    void chaqueAnomalieArreteLaLecture() {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < 2000; k++) {
            int longueur = new int[] { 10, 25, 50 }[r.nextInt(3)];
            int total = longueur * 2 + 1 + r.nextInt(500);
            int pages = (total + longueur - 1) / longueur;
            Liste l = new Liste(total);
            int p = 1 + r.nextInt(pages - 1);
            switch (r.nextInt(4)) {
            case 0:
                l.pageVide = p;
                break;
            case 1:
                l.pageRepetee = p;
                break;
            case 2:
                l.pageTotalChange = p;
                break;
            default:
                l.pageTropLongue = p == pages - 1 ? p - 1 : p;
                if (l.pageTropLongue == 0) {
                    l.pageTropLongue = 1;
                }
            }
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ParcoursDataTables.parcourir(l, longueur, 10000, (x, c) -> {
                    }));
            assertEquals(ExtranetException.Nature.PAGINATION, e.nature(), e.getMessage());
        }
    }

    @Test
    void limiteDePagesVerifieeAvantDeToutLire() {
        Liste l = new Liste(1000);
        ExtranetException e = assertThrows(ExtranetException.class,
                () -> ParcoursDataTables.parcourir(l, 25, 10, (x, c) -> {
                }));
        assertEquals(ExtranetException.Nature.PAGINATION, e.nature());
        assertEquals(1, l.demandes.size());
    }

    @Test
    void enveloppeIllisible() {
        for (String s : new String[] { "{}", "{\"datatables\":{}}", "{\"datatables\":{\"recordsTotal\":1}}",
                "{\"recordsTotal\":-1,\"data\":[]}" }) {
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class, () -> ParcoursDataTables.Enveloppe.lire(new JSONObject(s)))
                            .nature(),
                    s);
        }
    }

    @Test
    void ligneQuiNEstPasUnTableau() {
        ParcoursDataTables.Page p = (s, l, d) -> new JSONObject().put("recordsTotal", 1).put("recordsFiltered", 1)
                .put("data", new JSONArray().put(new JSONObject().put("a", 1)));
        assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                assertThrows(ExtranetException.class, () -> ParcoursDataTables.parcourir(p, 25, 10, (x, c) -> {
                })).nature());
    }
}
