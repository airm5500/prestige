package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.report.pdf.TableauPdf;

/**
 * Plan du 21/11, point 15 : coherence de l'edition (PDF / Excel) de l'analyse de la demande, sur des milliers
 * d'analyses tirees au hasard (graine fixe) : la matrice se recoupe (somme des mois = total de l'annee, somme des
 * annees = unites vendues de la synthese), la synthese suit ses regles (mois le plus fort = pic, mois faibles,
 * tendance), chaque produit est repris tel quel, et le classeur Excel relu donne les memes valeurs que l'edition.
 */
class EditionDemandeTest {

    private static final long GRAINE = 21112026L;

    /** Analyse au format du service : annees x mois (null hors fenetre), indices, tendance, produits. */
    static JSONObject analyse(Random r) {
        int nbMois = new int[] { 12, 24, 36 }[r.nextInt(3)];
        int moisFin = 1 + r.nextInt(12), anFin = 2024 + r.nextInt(3);
        boolean rien = r.nextInt(12) == 0;
        boolean creux = r.nextInt(5) == 0;
        long[] parMois = new long[nbMois];
        long total = 0;
        for (int i = 0; i < nbMois; i++) {
            parMois[i] = rien || (creux && r.nextInt(3) == 0) ? 0 : r.nextInt(r.nextBoolean() ? 50 : 50000);
            total += parMois[i];
        }
        /* annees */
        java.util.LinkedHashMap<Integer, JSONObject> annees = new java.util.LinkedHashMap<>();
        java.time.YearMonth fin = java.time.YearMonth.of(anFin, moisFin), debut = fin.minusMonths(nbMois - 1L);
        double[] somme = new double[12];
        int[] nb = new int[12];
        int i = 0;
        for (java.time.YearMonth m = debut; !m.isAfter(fin); m = m.plusMonths(1), i++) {
            JSONObject a = annees.computeIfAbsent(m.getYear(), y -> {
                JSONArray v = new JSONArray();
                for (int k = 0; k < 12; k++) {
                    v.put(JSONObject.NULL);
                }
                return new JSONObject().put("annee", y).put("mois", v).put("total", 0L);
            });
            a.getJSONArray("mois").put(m.getMonthValue() - 1, parMois[i]);
            a.put("total", a.getLong("total") + parMois[i]);
            somme[m.getMonthValue() - 1] += parMois[i];
            nb[m.getMonthValue() - 1]++;
        }
        double moyenne = (double) total / nbMois;
        double[] ind = new double[12];
        JSONArray indices = new JSONArray();
        for (int k = 0; k < 12; k++) {
            ind[k] = moyenne == 0 || nb[k] == 0 ? 0 : Math.round(somme[k] / nb[k] / moyenne * 100) / 100.0;
            indices.put(ind[k]);
        }
        JSONObject tendance = new JSONObject();
        if (nbMois >= 24) {
            long recent = 0, avant = 0;
            for (int k = 0; k < 12; k++) {
                recent += parMois[nbMois - 1 - k];
                avant += parMois[nbMois - 13 - k];
            }
            tendance.put("recent", recent).put("avant", avant).put("evolution",
                    avant == 0 ? JSONObject.NULL : Math.round((recent - avant) * 1000.0 / avant) / 10.0);
        }
        int prochain = 1 + r.nextInt(12);
        JSONArray produits = new JSONArray(), anticiper = new JSONArray();
        int nbP = rien ? 0 : r.nextInt(31);
        for (int k = 0; k < nbP; k++) {
            int pic = 1 + r.nextInt(12);
            boolean ant = pic == prochain || pic == prochain % 12 + 1;
            JSONObject p = new JSONObject().put("id", "P" + k)
                    .put("cip", r.nextInt(7) == 0 ? JSONObject.NULL : String.valueOf(1000000 + r.nextInt(8999999)))
                    .put("libelle",
                            r.nextInt(9) == 0 ? JSONObject.NULL
                                    : "PRODUIT " + k + (r.nextBoolean() ? " 500MG CP B/20" : ""))
                    .put("unites", 24 + r.nextInt(100000)).put("pic", pic)
                    .put("indicePic", Math.round((1 + r.nextDouble() * 3) * 100) / 100.0)
                    .put("force", Math.round(r.nextDouble() * 150) / 100.0).put("anticiper", ant);
            produits.put(p);
            if (ant && r.nextBoolean()) {
                anticiper.put(p);
            }
        }
        int pic = 0;
        for (int k = 1; k < 12; k++) {
            if (ind[k] > ind[pic]) {
                pic = k;
            }
        }
        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("mois", nbMois).put("total", total).put("annees", new JSONArray(annees.values()))
                .put("indices", indices).put("pic", total == 0 ? JSONObject.NULL : pic + 1)
                .put("force", DemandeSaisonniereService.force(ind)).put("tendance", tendance).put("produits", produits)
                .put("anticiper", anticiper).put("prochainMois", prochain)
                .put("produitsClasses", nbP + r.nextInt(5000));
    }

    private static long entier(String s) {
        return Long.parseLong(s.replace(" ", ""));
    }

    @Test
    void nombreEtIndiceAuFormatDeLEcran() {
        Random r = new Random(GRAINE);
        assertEquals("0", EditionDemande.nombre(0));
        assertEquals("1 234 567", EditionDemande.nombre(1234567));
        assertEquals("—", EditionDemande.indice(1.5, 0));
        assertEquals("1,50", EditionDemande.indice(1.5, 10));
        assertEquals("0,07", EditionDemande.indice(0.07, 10));
        assertEquals("12", EditionDemande.decimal(12.0));
        assertEquals("-3,4", EditionDemande.decimal(-3.4));
        assertEquals("janv. 2026", EditionDemande.moisLong("2026-01"));
        for (int i = 0; i < 5000; i++) {
            long v = r.nextInt(Integer.MAX_VALUE);
            String t = EditionDemande.nombre(v);
            assertEquals(v, entier(t), t);
            assertTrue(t.matches("\\d{1,3}( \\d{3})*"), t);
            double x = Math.round(r.nextDouble() * 500) / 100.0;
            assertEquals(x, EditionDemande.valeur(EditionDemande.indice(x, 1)), 1e-9);
        }
    }

    @Test
    void matriceEtSyntheseSeRecoupent() {
        Random r = new Random(GRAINE);
        for (int n = 0; n < 4000; n++) {
            JSONObject d = analyse(r);
            List<TableauPdf.Section> s = EditionDemande.sections(d);
            assertEquals(4, s.size());
            List<String[]> syn = s.get(0).lignes, mat = s.get(1).lignes;
            long total = d.getLong("total");
            /* unites vendues = somme des totaux des annees = somme de tous les mois */
            assertEquals(total, entier(syn.get(0)[1]));
            assertEquals(d.getInt("mois") + " mois complets", syn.get(0)[2]);
            assertEquals(d.getJSONArray("annees").length() + 1, mat.size());
            long somme = 0;
            int cellules = 0;
            for (int a = 0; a < mat.size() - 1; a++) {
                String[] l = mat.get(a);
                JSONArray mois = d.getJSONArray("annees").getJSONObject(a).getJSONArray("mois");
                long ligne = 0;
                for (int k = 1; k <= 12; k++) {
                    if (mois.isNull(k - 1)) {
                        assertEquals("", l[k], "mois hors periode vide");
                    } else {
                        ligne += entier(l[k]);
                        cellules++;
                    }
                }
                assertEquals(ligne, entier(l[13]), "somme des mois = total de l'annee");
                somme += ligne;
            }
            assertEquals(d.getInt("mois"), cellules, "autant de mois remplis que la periode");
            assertEquals(total, somme, "somme des annees = unites vendues");
            /* ligne des indices */
            String[] ind = mat.get(mat.size() - 1);
            assertEquals("Indice", ind[0]);
            double[] iv = new double[12];
            for (int k = 0; k < 12; k++) {
                iv[k] = d.getJSONArray("indices").getDouble(k);
                assertEquals(total == 0 ? "—" : String.format(java.util.Locale.ROOT, "%.2f", iv[k]).replace('.', ','),
                        ind[k + 1]);
            }
            /* mois le plus fort = pic ; c'est le premier des pics ; aucun mois n'a un indice plus haut */
            if (total == 0) {
                assertEquals("—", syn.get(1)[1]);
                assertEquals("—", syn.get(2)[1]);
            } else {
                int pic = d.getInt("pic");
                assertEquals(EditionDemande.MOIS[pic - 1], syn.get(1)[1]);
                assertTrue(syn.get(1)[2].startsWith("pics : " + EditionDemande.MOIS[pic - 1]), syn.get(1)[2]);
                for (double v : iv) {
                    assertTrue(v <= iv[pic - 1]);
                }
                int sansVente = 0;
                for (double v : iv) {
                    sansVente += v == 0 ? 1 : 0;
                }
                if (sansVente > 3) {
                    assertEquals(sansVente + " mois sans vente", syn.get(2)[1]);
                } else {
                    /* les mois faibles ont les plus petits indices : aucun autre mois n'est plus bas */
                    String[] faibles = syn.get(2)[1].split(", ");
                    assertEquals(Math.min(3, 12), faibles.length);
                    double max = 0;
                    List<Integer> pris = new ArrayList<>();
                    for (String f : faibles) {
                        int k = java.util.Arrays.asList(EditionDemande.MOIS).indexOf(f);
                        assertTrue(k >= 0, f);
                        pris.add(k);
                        max = Math.max(max, iv[k]);
                    }
                    for (int k = 0; k < 12; k++) {
                        if (!pris.contains(k)) {
                            assertTrue(iv[k] >= max, "mois " + k + " plus faible que les mois retenus");
                        }
                    }
                }
            }
            assertEquals("force de la saison : " + EditionDemande.indice(d.getDouble("force"), total), syn.get(2)[2]);
            /* tendance : signe et chiffres */
            JSONObject t = d.getJSONObject("tendance");
            String tv = syn.get(3)[1];
            if (!t.has("evolution") || t.isNull("evolution")) {
                assertEquals("—", tv);
            } else {
                double e = t.getDouble("evolution");
                assertEquals(e, Double.parseDouble(tv.replace(" %", "").replace("+", "").replace(',', '.')), 1e-9);
                assertEquals(e > 0, tv.startsWith("+"));
                assertTrue(tv.endsWith(" %"));
            }
            if (t.has("recent")) {
                assertEquals(EditionDemande.nombre(t.getLong("recent")) + " contre "
                        + EditionDemande.nombre(t.getLong("avant")) + " unités", syn.get(3)[2]);
            } else {
                assertEquals("sur 24 mois et plus", syn.get(3)[2]);
            }
        }
    }

    @Test
    void produitsReprisTelsQuels() {
        Random r = new Random(GRAINE + 1);
        for (int n = 0; n < 4000; n++) {
            JSONObject d = analyse(r);
            List<TableauPdf.Section> s = EditionDemande.sections(d);
            int p = d.getInt("prochainMois");
            assertEquals("À anticiper : pic de demande en " + EditionDemande.MOIS[p - 1] + " ou "
                    + EditionDemande.MOIS[p % 12], s.get(2).titre);
            assertTrue(s.get(3).titre.contains(EditionDemande.nombre(d.getLong("produitsClasses")) + " classés"));
            for (int b = 0; b < 2; b++) {
                JSONArray liste = d.getJSONArray(b == 0 ? "anticiper" : "produits");
                List<String[]> l = s.get(2 + b).lignes;
                if (liste.length() == 0) {
                    assertEquals(1, l.size());
                    assertTrue(l.get(0)[0].length() > 10, "message de liste vide");
                    continue;
                }
                assertEquals(liste.length(), l.size());
                for (int k = 0; k < liste.length(); k++) {
                    JSONObject o = liste.getJSONObject(k);
                    String[] x = l.get(k);
                    assertEquals(7, x.length);
                    assertEquals(o.isNull("cip") ? "" : o.getString("cip"), x[0]);
                    assertEquals(o.isNull("libelle") ? "" : o.getString("libelle"), x[1]);
                    assertEquals(o.getLong("unites"), entier(x[2]));
                    assertEquals(EditionDemande.MOIS[o.getInt("pic") - 1], x[3]);
                    assertEquals(EditionDemande.indice(o.getDouble("indicePic"), d.getLong("total")), x[4]);
                    assertEquals(EditionDemande.indice(o.getDouble("force"), d.getLong("total")), x[5]);
                    assertEquals(o.getBoolean("anticiper") ? "À anticiper" : "", x[6]);
                }
            }
        }
    }

    @Test
    void classeurRelu_memesValeursQueLEdition() throws Exception {
        Random r = new Random(GRAINE + 2);
        for (int n = 0; n < 300; n++) {
            JSONObject d = analyse(r);
            List<TableauPdf.Section> s = EditionDemande.sections(d);
            String st = EditionDemande.sousTitre(d, n % 2 == 0 ? "PARA" : null, n % 3 == 0 ? "RAYON A" : null);
            byte[] x = EditionDemande.classeur("Analyse de la demande", st, s);
            try (HSSFWorkbook wb = new HSSFWorkbook(new ByteArrayInputStream(x))) {
                Sheet f = wb.getSheetAt(0);
                assertEquals("Analyse de la demande", f.getRow(0).getCell(0).getStringCellValue());
                assertEquals(st, f.getRow(1).getCell(0).getStringCellValue());
                int ligne = 2;
                for (TableauPdf.Section sec : s) {
                    ligne++;
                    assertEquals(sec.titre, f.getRow(ligne++).getCell(0).getStringCellValue());
                    Row e = f.getRow(ligne++);
                    for (int i = 0; i < sec.entetes.length; i++) {
                        assertEquals(sec.entetes[i], e.getCell(i).getStringCellValue());
                    }
                    for (String[] l : sec.lignes) {
                        Row row = f.getRow(ligne++);
                        assertNotNull(row);
                        for (int i = 0; i < l.length; i++) {
                            Cell c = row.getCell(i);
                            Double v = sec.droite[i] ? EditionDemande.valeur(l[i]) : null;
                            if (v != null) {
                                assertEquals(CellType.NUMERIC, c.getCellType(), sec.titre + " " + l[i]);
                                assertEquals(v, c.getNumericCellValue(), 1e-9);
                            } else {
                                assertEquals(l[i], c.getStringCellValue());
                            }
                        }
                    }
                }
                assertEquals(ligne - 1, f.getLastRowNum(), "ni plus ni moins de lignes que l'edition");
            }
            byte[] pdf = TableauPdf.genererSections(new TableauPdf.Edition(), s);
            assertTrue(pdf.length > 500 && new String(pdf, 0, 5, "ISO-8859-1").equals("%PDF-"));
        }
    }

    @Test
    void sousTitre_periodeEtFiltres() {
        JSONObject d = new JSONObject().put("mois", 24).put("debut", "2024-11").put("fin", "2026-10");
        assertEquals("Sur les 24 derniers mois complets : nov. 2024 à oct. 2026",
                EditionDemande.sousTitre(d, " ", null));
        assertEquals(
                "Sur les 24 derniers mois complets : nov. 2024 à oct. 2026 · Produit : DOLI · Emplacement : RAYON 1",
                EditionDemande.sousTitre(d, " DOLI ", "RAYON 1"));
    }
}
