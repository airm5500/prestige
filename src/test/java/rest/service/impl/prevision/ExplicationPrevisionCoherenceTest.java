package rest.service.impl.prevision;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Random;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 15 : l'explication de la prevision redonne la prevision du calcul, sur des milliers de series
 * tirees au hasard (graine fixe) : produits reguliers, saisonniers, en hausse, en baisse, avec des mois a zero, de 0 a
 * 40 mois. Regles : la valeur expliquee = la prevision enregistree (analyser) ; chaque methode suit sa formule (moyenne
 * = somme ÷ nombre de mois, saison = meme mois l'an dernier × tendance bornee 0,5..2, Holt = niveau + tendance,
 * Holt-Winters = niveau + tendance + saison, jamais negatif) ; les mois cites sont les bons ; et la prevision elle-meme
 * n'a pas change (copie de l'ancien calcul).
 */
class ExplicationPrevisionCoherenceTest {

    private static final String[] METHODES = { Prevision.MOYENNE, Prevision.SAISON, Prevision.HOLT,
            Prevision.HOLT_WINTERS };
    private static final DateTimeFormatter MOIS = DateTimeFormatter.ofPattern("MMM yy", Locale.FRANCE);

    /** Ancien calcul, mot pour mot (avant le point 15) : la reference de non-regression. */
    static double ancienPrevoir(double[] serie, String methode) {
        int n = serie.length;
        switch (methode) {
        case Prevision.MOYENNE:
            if (n == 0) {
                return Double.NaN;
            }
            double s = 0;
            int k = Math.min(3, n);
            for (int i = n - k; i < n; i++) {
                s += serie[i];
            }
            return s / k;
        case Prevision.SAISON:
            if (n < 12) {
                return Double.NaN;
            }
            double base = serie[n - 12];
            if (n >= 24) {
                double recent = Prevision.somme(serie, n - 12, n), ancien = Prevision.somme(serie, n - 24, n - 12);
                double tendance = ancien > 0 ? Math.max(0.5, Math.min(2, recent / ancien)) : 1;
                return base * tendance;
            }
            return base;
        case Prevision.HOLT:
            if (n < 4) {
                return Double.NaN;
            }
            double niveau = serie[0], pente = serie[1] - serie[0];
            for (int i = 1; i < n; i++) {
                double ancienNiveau = niveau;
                niveau = Prevision.ALPHA * serie[i] + (1 - Prevision.ALPHA) * (niveau + pente);
                pente = Prevision.BETA * (niveau - ancienNiveau) + (1 - Prevision.BETA) * pente;
            }
            return Math.max(0, niveau + pente);
        case Prevision.HOLT_WINTERS:
            if (n < 24) {
                return Double.NaN;
            }
            double moyenne1 = Prevision.somme(serie, 0, 12) / 12, moyenne2 = Prevision.somme(serie, 12, 24) / 12;
            double niv = moyenne1, tend = (moyenne2 - moyenne1) / 12;
            double[] saison = new double[12];
            for (int i = 0; i < 12; i++) {
                saison[i] = (serie[i] - moyenne1 + serie[i + 12] - moyenne2) / 2;
            }
            for (int i = 0; i < n; i++) {
                double ancien = niv;
                int m = i % 12;
                niv = Prevision.ALPHA * (serie[i] - saison[m]) + (1 - Prevision.ALPHA) * (niv + tend);
                tend = Prevision.BETA * (niv - ancien) + (1 - Prevision.BETA) * tend;
                saison[m] = Prevision.GAMMA * (serie[i] - niv) + (1 - Prevision.GAMMA) * saison[m];
            }
            return Math.max(0, niv + tend + saison[n % 12]);
        default:
            return Double.NaN;
        }
    }

    static double[] tirer(Random r) {
        int n = r.nextInt(5) == 0 ? r.nextInt(5) : r.nextInt(41);
        double[] s = new double[n];
        int forme = r.nextInt(5);
        double base = r.nextInt(4) == 0 ? r.nextInt(3) : r.nextInt(400);
        for (int i = 0; i < n; i++) {
            double v = base;
            if (forme == 1) {
                v += base * 0.6 * Math.sin(2 * Math.PI * i / 12);
            } else if (forme == 2) {
                v += i * r.nextInt(8);
            } else if (forme == 3) {
                v -= i * base / 50;
            }
            v += r.nextGaussian() * Math.max(1, base * 0.2);
            s[i] = r.nextInt(8) == 0 ? 0 : Math.max(0, Math.round(v));
        }
        return s;
    }

    @Test
    void laValeurExpliqueeEstLaPrevisionDuCalcul() {
        Random r = new Random(22112026L);
        YearMonth dernier = YearMonth.of(2026, 10);
        int parMethode[] = new int[4];
        for (int cas = 0; cas < 8000; cas++) {
            double[] serie = tirer(r);
            for (String m : METHODES) {
                double ancien = ancienPrevoir(serie, m);
                double nouveau = Prevision.prevoir(serie, m);
                assertTrue(Double.isNaN(ancien) ? Double.isNaN(nouveau) : ancien == nouveau,
                        "prevision inchangee (" + m + ")");
            }
            for (int mt : new int[] { 1, 3, 6, 12 }) {
                Prevision.Resultat res = Prevision.analyser(serie, mt);
                ExplicationPrevision e = ExplicationPrevision.expliquer(serie, res.methode, dernier);
                assertEquals(res.prevuMois, e.valeur, 1e-9, "valeur expliquee = prevision enregistree");
                assertTrue(e.formule.endsWith("= " + ExplicationPrevision.nombre(e.valeur, 1)), e.formule);
                assertEquals(ExplicationPrevision.nombre(e.valeur, 1), e.etapes.get(e.etapes.size() - 1)[1],
                        "derniere etape = la prevision");
                JSONObject j = new JSONObject(e.json().toString());
                assertEquals(e.valeur, j.getDouble("valeur"), 1e-9, "relue telle qu'ecrite");
                assertEquals(e.etapes.size(), j.getJSONArray("etapes").length());
            }
            for (int k = 0; k < METHODES.length; k++) {
                String m = METHODES[k];
                double[] t = Prevision.termes(serie, m);
                ExplicationPrevision e = ExplicationPrevision.expliquer(serie, m, dernier);
                if (t == null) {
                    assertEquals(Prevision.MOYENNE, e.methode, "methode non applicable : la moyenne, comme le calcul");
                    continue;
                }
                parMethode[k]++;
                double v = t[t.length - 1];
                assertEquals(m, e.methode);
                switch (m) {
                case Prevision.MOYENNE: {
                    int n = (int) t[0];
                    assertEquals(Math.min(3, serie.length), n);
                    assertEquals(Prevision.somme(serie, serie.length - n, serie.length), t[1], 1e-9);
                    assertEquals(t[1] / n, v, 1e-9, "moyenne = somme ÷ nombre de mois");
                    for (int i = 0; i < n; i++) {
                        YearMonth mois = dernier.minusMonths(n - 1L - i);
                        assertEquals("Ventes de " + mois.format(MOIS), e.etapes.get(i)[0], "mois cites dans l'ordre");
                        assertEquals(ExplicationPrevision.nombre(serie[serie.length - n + i], 1), e.etapes.get(i)[1]);
                    }
                    break;
                }
                case Prevision.SAISON:
                    assertEquals(serie[serie.length - 12], t[0], 1e-9, "meme mois l'an dernier");
                    assertTrue(t[3] >= 0.5 - 1e-12 && t[3] <= 2 + 1e-12, "tendance bornee 0,5..2");
                    assertEquals(t[0] * t[3], v, 1e-9);
                    assertTrue(e.etapes.get(0)[0].contains(dernier.plusMonths(1).minusMonths(12).format(MOIS)));
                    if (serie.length >= 24 && t[2] > 0) {
                        assertEquals(Math.max(0.5, Math.min(2, t[1] / t[2])), t[3], 1e-12);
                    } else {
                        assertEquals(1, t[3], 0);
                    }
                    break;
                case Prevision.HOLT:
                    assertEquals(Math.max(0, t[0] + t[1]), v, 1e-9, "Holt = niveau + tendance, jamais negatif");
                    break;
                default:
                    assertEquals(Math.max(0, t[0] + t[1] + t[2]), v, 1e-9, "niveau + tendance + saison");
                    break;
                }
                assertTrue(v >= 0, "jamais negatif");
            }
        }
        for (int k = 0; k < 4; k++) {
            assertTrue(parMethode[k] > 500, "chaque methode tiree souvent : " + METHODES[k] + " " + parMethode[k]);
        }
    }

    @Test
    void casLimites() {
        YearMonth dernier = YearMonth.of(2026, 10);
        ExplicationPrevision vide = ExplicationPrevision.expliquer(new double[0], Prevision.HOLT, dernier);
        assertEquals(0, vide.valeur, 0);
        assertNull(vide.termes);
        assertTrue(vide.formule.contains("nov. 26"), vide.formule);
        ExplicationPrevision un = ExplicationPrevision.expliquer(new double[] { 7 }, Prevision.MOYENNE, dernier);
        assertEquals("Moyenne des derniers mois : 7 = 7", un.formule);
        ExplicationPrevision trois = ExplicationPrevision.expliquer(new double[] { 1, 12, 15, 9 }, Prevision.MOYENNE,
                dernier);
        assertEquals("Moyenne des 3 derniers mois : (12 + 15 + 9) ÷ 3 = 12", trois.formule);
        assertEquals("Ventes de août 26", trois.etapes.get(0)[0]);
        /* saison : tendance au-dessus de 2 ramenee a 2 */
        double[] s = new double[24];
        for (int i = 0; i < 24; i++) {
            s[i] = i < 12 ? 10 : 40;
        }
        ExplicationPrevision sa = ExplicationPrevision.expliquer(s, Prevision.SAISON, dernier);
        assertEquals(80, sa.valeur, 0, "40 l'an dernier x tendance 4 ramenee a 2");
        assertTrue(sa.etapes.get(1)[0].contains("ramené à 2 au plus"), sa.etapes.get(1)[0]);
        assertTrue(sa.etapes.get(0)[0].contains("nov. 25"), sa.etapes.get(0)[0]);
        /* Holt sur une baisse forte : jamais en dessous de 0 */
        ExplicationPrevision h = ExplicationPrevision.expliquer(new double[] { 100, 60, 20, 0, 0 }, Prevision.HOLT,
                dernier);
        assertEquals(0, h.valeur, 0);
        assertNotNull(h.termes);
        assertTrue(h.etapes.get(1)[0].contains("baissent"));
        assertTrue(h.etapes.get(2)[0].contains("jamais en dessous de 0"));
    }

    @Test
    void nombresALaFrancaise() {
        assertEquals("0", ExplicationPrevision.nombre(-0.001, 1));
        assertEquals("12", ExplicationPrevision.nombre(12.0, 1));
        assertEquals("12,5", ExplicationPrevision.nombre(12.46, 1));
        assertEquals("1,11", ExplicationPrevision.nombre(1.1111, 2));
        Random r = new Random(21112026L);
        for (int i = 0; i < 20000; i++) {
            double v = r.nextGaussian() * 1000;
            assertEquals(Math.round(v * 100) / 100.0,
                    Double.parseDouble(ExplicationPrevision.nombre(v, 2).replace(',', '.')), 1e-9);
        }
    }
}
