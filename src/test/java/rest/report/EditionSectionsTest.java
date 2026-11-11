package rest.report;

import commonTasks.dto.LigneEditionSectionDTO;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import net.sf.jasperreports.engine.JRPrintElement;
import net.sf.jasperreports.engine.JRPrintFrame;
import net.sf.jasperreports.engine.JRPrintText;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.json.JSONArray;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Plan du 08/11, point 7 : analyse des avoirs et tableau de bord des retours fournisseur en PDF.
 *
 * <ul>
 * <li>coherence de la mise en forme avec l'ecran (Math.round, separateur de milliers, pourcentage a virgule, mois) sur
 * 5 000 valeurs tirees au hasard, graine fixe ;</li>
 * <li>mise a plat : chaque section a son en-tete puis exactement ses lignes, dans l'ordre, valeur par valeur ; une
 * section vide porte le message de l'ecran ;</li>
 * <li>le modele rp_edition_sections se compile et se remplit (plusieurs pages), chaque valeur se retrouve dans le
 * document.</li>
 * </ul>
 */
public class EditionSectionsTest {

    private static final long GRAINE = 20261108L;

    /** Reference : la fonction « entier » de l'ecran, ecrite autrement (par format). */
    private static String entierEcran(double v) {
        long n = Math.round(v);
        String s = String.format(java.util.Locale.ROOT, "%,d", Math.abs(n)).replace(',', ' ');
        return (n < 0 ? "-" : "") + s;
    }

    @Test
    public void miseEnFormeCommeEcran() {
        Random r = new Random(GRAINE);
        for (int i = 0; i < 5000; i++) {
            double v;
            switch (i % 5) {
            case 0:
                v = 0;
                break;
            case 1:
                v = r.nextInt(1000);
                break;
            case 2:
                v = r.nextDouble() * 1e7;
                break;
            case 3:
                v = -r.nextDouble() * 1e5;
                break;
            default:
                v = r.nextInt(2000) + 0.5;
            }
            JSONObject o = new JSONObject().put("x", v);
            assertEquals(entierEcran(v), EditionSections.entier(o, "x"), "entier(" + v + ")");
            double p = Math.round(r.nextDouble() * 1000) / 10.0;
            String attendu = (p == Math.rint(p) ? String.valueOf((long) p) : String.valueOf(p)).replace('.', ',')
                    + " %";
            assertEquals(attendu, EditionSections.pct(new JSONObject().put("p", p), "p"), "pct(" + p + ")");
        }
        assertEquals("0", EditionSections.entier(new JSONObject(), "absent"));
        /* compteurs ecrits sans separateur par l'ecran des retours (nombre de retours, de lignes) */
        assertEquals("1359", EditionSections.brut(new JSONObject().put("x", 1359), "x"));
        assertEquals("0", EditionSections.brut(new JSONObject(), "x"));
        assertEquals("1 000", EditionSections.entier(new JSONObject().put("x", 999.5), "x"));
        assertEquals("100 %", EditionSections.pct(new JSONObject().put("p", 100.0), "p"));
        assertEquals("0 %", EditionSections.pct(new JSONObject().put("p", JSONObject.NULL), "p"));
        assertEquals("12,5 %", EditionSections.pct(new JSONObject().put("p", 12.5), "p"));
        assertEquals("janv. 2026", EditionSections.libelleMois("2026-01"));
        assertEquals("déc. 2025", EditionSections.libelleMois("2025-12"));
        assertEquals("08/11/2026", EditionSections.date("2026-11-08"));
    }

    private static JSONObject analyseAvoirsAuHasard(Random r, boolean vide) {
        JSONObject o = new JSONObject();
        o.put("total",
                new JSONObject().put("avoirs", 12).put("partVentes", 3.4).put("ventes", 350).put("enCours", 2)
                        .put("valeurEnCours", 15400).put("tauxCloture", 83.3).put("clotures", 10)
                        .put("delaiMoyenJours", 2.5).put("quantite", 40).put("valeur", 123456));
        JSONArray produits = new JSONArray(), grossistes = new JSONArray(), anciennete = new JSONArray(),
                mois = new JSONArray();
        int n = vide ? 0 : 1 + r.nextInt(30);
        for (int i = 0; i < n; i++) {
            produits.put(new JSONObject().put("cip", "CIP" + i).put("libelle", "PRODUIT " + i)
                    .put("grossiste", "GROSSISTE " + (i % 3)).put("fois", 1 + r.nextInt(9))
                    .put("quantite", r.nextInt(50)).put("enCours", i % 4 == 0 ? r.nextInt(5) : 0)
                    .put("valeur", r.nextInt(2_000_000)));
        }
        for (int i = 0; i < (vide ? 0 : 1 + r.nextInt(4)); i++) {
            grossistes.put(new JSONObject().put("libelle", "GROSSISTE " + i).put("fois", r.nextInt(40))
                    .put("produits", r.nextInt(20)).put("quantite", r.nextInt(80)).put("valeur", r.nextInt(900000))
                    .put("part", Math.round(r.nextDouble() * 1000) / 10.0));
        }
        for (String tr : new String[] { "moins de 7 jours", "7 à 30 jours", "plus de 30 jours" }) {
            anciennete.put(
                    new JSONObject().put("tranche", tr).put("avoirs", r.nextInt(5)).put("valeur", r.nextInt(50000)));
        }
        for (int i = 0; i < (vide ? 0 : 1 + r.nextInt(12)); i++) {
            mois.put(new JSONObject().put("mois", "2026-" + String.format("%02d", 1 + i)).put("ventes", r.nextInt(900))
                    .put("avoirs", r.nextInt(30)).put("part", 1.5).put("clotures", r.nextInt(30))
                    .put("valeur", r.nextInt(100000)));
        }
        return o.put("produits", produits).put("grossistes", grossistes).put("anciennete", anciennete).put("mois",
                mois);
    }

    private static List<LigneEditionSectionDTO> section(List<LigneEditionSectionDTO> l, String s) {
        List<LigneEditionSectionDTO> r = new ArrayList<>();
        l.stream().filter(x -> s.equals(x.getSection())).forEach(r::add);
        return r;
    }

    @Test
    public void avoirsMisAPlatSectionParSection() {
        Random r = new Random(GRAINE);
        for (int essai = 0; essai < 300; essai++) {
            JSONObject o = analyseAvoirsAuHasard(r, essai % 25 == 0);
            List<LigneEditionSectionDTO> l = EditionSections.analyseAvoirs(o);
            List<LigneEditionSectionDTO> p = section(l, "Produits le plus souvent en avoir (30 premiers)");
            JSONArray produits = o.getJSONArray("produits");
            assertTrue(p.get(0).getEntete());
            assertArrayEquals(
                    new String[] { "CIP", "Produit", "Grossiste", "Fois", "Quantité due", "Encore due", "Valeur" },
                    p.get(0).colonnes());
            if (produits.length() == 0) {
                assertEquals(2, p.size());
                assertEquals("Aucun avoir sur la période.", p.get(1).getC0());
                assertEquals(LigneEditionSectionDTO.A, p.get(1).getDisposition());
            } else {
                assertEquals(produits.length() + 1, p.size(), "une ligne par produit, plus l'en-tete");
            }
            for (int i = 0; i < produits.length(); i++) {
                JSONObject x = produits.getJSONObject(i);
                LigneEditionSectionDTO d = p.get(i + 1);
                assertEquals(false, d.getEntete());
                assertArrayEquals(new String[] { x.getString("cip"), x.getString("libelle"), x.getString("grossiste"),
                        entierEcran(x.getInt("fois")), entierEcran(x.getInt("quantite")),
                        entierEcran(x.getInt("enCours")), entierEcran(x.getInt("valeur")) }, d.colonnes());
            }
            List<LigneEditionSectionDTO> a = section(l, "Ancienneté des avoirs encore en cours (depuis la vente)");
            assertEquals(4, a.size());
            JSONArray m = o.getJSONArray("mois");
            List<LigneEditionSectionDTO> pm = section(l, "Par mois");
            assertEquals(Math.max(m.length(), 1) + 1, pm.size());
            /* sections dans l'ordre de l'ecran, d'un seul tenant (le groupe du jrxml change a chaque section) */
            List<String> ordre = new ArrayList<>();
            l.forEach(x -> {
                if (ordre.isEmpty() || !ordre.get(ordre.size() - 1).equals(x.getSection())) {
                    ordre.add(x.getSection());
                }
            });
            assertEquals(4, ordre.size(), ordre.toString());
        }
    }

    @Test
    public void retoursMisAPlatSectionParSection() {
        Random r = new Random(GRAINE + 1);
        for (int essai = 0; essai < 300; essai++) {
            boolean vide = essai % 20 == 0;
            JSONObject o = new JSONObject().put("total",
                    new JSONObject().put("retours", 5).put("lignes", 9).put("produits", 7)
                            .put("quantite", vide ? 0 : 40).put("acceptee", vide ? 0 : 33).put("montant", 98765));
            JSONArray produits = new JSONArray(), motifs = new JSONArray(), utilisateurs = new JSONArray(),
                    mois = new JSONArray();
            for (int i = 0; i < (vide ? 0 : 1 + r.nextInt(20)); i++) {
                produits.put(new JSONObject().put("cip", "C" + i).put("libelle", "P " + i).put("retours", r.nextInt(9))
                        .put("quantite", r.nextInt(99)).put("acceptee", r.nextInt(99))
                        .put("montant", r.nextInt(3_000_000)));
            }
            for (int i = 0; i < (vide ? 0 : 1 + r.nextInt(5)); i++) {
                motifs.put(new JSONObject().put("libelle", "M " + i).put("lignes", r.nextInt(5000))
                        .put("quantite", r.nextInt(99)).put("part", Math.round(r.nextDouble() * 1000) / 10.0));
                utilisateurs.put(new JSONObject().put("libelle", "U " + i).put("retours", r.nextInt(9))
                        .put("part", 25.0).put("lignes", r.nextInt(9)).put("quantite", r.nextInt(99))
                        .put("montant", r.nextInt(3_000_000)));
                mois.put(new JSONObject().put("mois", "2026-0" + (1 + i)).put("retours", r.nextInt(9))
                        .put("lignes", r.nextInt(9)).put("quantite", r.nextInt(99)).put("acceptee", r.nextInt(99))
                        .put("montant", r.nextInt(3_000_000)));
            }
            o.put("produits", produits).put("motifs", motifs).put("utilisateurs", utilisateurs).put("mois", mois);
            List<LigneEditionSectionDTO> l = EditionSections.tableauRetours(o);
            List<LigneEditionSectionDTO> p = section(l, "Produits les plus retournés");
            assertEquals(Math.max(produits.length(), 1) + 1, p.size());
            for (int i = 0; i < produits.length(); i++) {
                JSONObject x = produits.getJSONObject(i);
                assertArrayEquals(new String[] { x.getString("cip"), x.getString("libelle"), "",
                        entierEcran(x.getInt("retours")), entierEcran(x.getInt("quantite")),
                        entierEcran(x.getInt("acceptee")), entierEcran(x.getInt("montant")) }, p.get(i + 1).colonnes());
            }
            List<LigneEditionSectionDTO> mo = section(l, "Motifs les plus utilisés");
            for (int i = 0; i < motifs.length(); i++) {
                assertEquals(String.valueOf(motifs.getJSONObject(i).getInt("lignes")), mo.get(i + 1).getC1());
            }
            List<LigneEditionSectionDTO> u = section(l, "Retours par utilisateur");
            for (int i = 0; i < utilisateurs.length(); i++) {
                JSONObject x = utilisateurs.getJSONObject(i);
                assertEquals("25 %", u.get(i + 1).getC2());
                assertEquals(entierEcran(x.getInt("montant")), u.get(i + 1).getC5());
            }
            String ind = EditionSections.indicateursRetours(o);
            assertTrue(ind.contains((vide ? 0 : Math.round(33 * 100.0 / 40)) + " % du retourné"), ind);
            assertTrue(ind.contains("98 765 F"), ind);
        }
    }

    /**
     * Fusion du 09/11 : les retours par etat (demande 59, partie 2) affiches en tuiles a l'ecran figurent aussi dans
     * les indicateurs du PDF, avec le meme titre, le meme nombre et les memes unites ; etat absent = 0.
     */
    @Test
    public void lesRetoursParEtatSontDansLesIndicateursDuPdf() {
        Random r = new Random(GRAINE);
        String[][] etats = { { "attente", "En attente de validation" }, { "refuse", "Refusés" },
                { "abandonne", "Abandonnés" }, { "valide", "Validés" } };
        for (int cas = 0; cas < 2_000; cas++) {
            JSONObject o = new JSONObject().put("total", new JSONObject().put("retours", r.nextInt(5000)));
            JSONObject et = new JSONObject();
            int[][] attendu = new int[4][2];
            for (int i = 0; i < 4; i++) {
                if (r.nextInt(5) == 0) {
                    continue; // etat absent de la reponse : 0 attendu
                }
                attendu[i][0] = r.nextInt(3) == 0 ? 0 : r.nextInt(30_000);
                attendu[i][1] = r.nextInt(3) == 0 ? 0 : r.nextInt(3_000_000);
                et.put(etats[i][0], new JSONObject().put("retours", attendu[i][0]).put("quantite", attendu[i][1]));
            }
            if (r.nextInt(10) > 0) {
                o.put("etats", et);
            } else {
                attendu = new int[4][2]; // pas d'etats du tout : tout a 0
            }
            String ind = EditionSections.indicateursRetours(o);
            for (int i = 0; i < 4; i++) {
                String morceau = etats[i][1] + " : " + entierEcran(attendu[i][0]) + " (" + entierEcran(attendu[i][1])
                        + " unité(s))";
                assertTrue(ind.contains(morceau), "cas " + cas + " : " + morceau + " absent de « " + ind + " »");
            }
        }
    }

    @Test
    public void leModeleSeRemplitSurPlusieursPages() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/rp_edition_sections.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE TEST");
            parametres.put("P_H_CLT_INFOS", "ANALYSE DES AVOIRS");
            parametres.put("P_PERIODE", "Du 01/11/2026 au 08/11/2026");
            Random r = new Random(GRAINE);
            JSONObject o = analyseAvoirsAuHasard(r, false);
            JSONArray produits = new JSONArray();
            for (int i = 0; i < 80; i++) {
                produits.put(new JSONObject().put("cip", "CIP" + i).put("libelle", "PRODUIT AU LIBELLE " + i)
                        .put("grossiste", "GROSSISTE " + i).put("fois", i).put("quantite", i * 3).put("enCours", i % 2)
                        .put("valeur", 1000 * i + 7));
            }
            o.put("produits", produits);
            parametres.put("P_INDICATEURS", EditionSections.indicateursAvoirs(o));
            List<LigneEditionSectionDTO> lignes = EditionSections.analyseAvoirs(o);
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(lignes));
            assertTrue(impression.getPages().size() >= 2, "80 produits : plus d'une page");
            StringBuilder sb = new StringBuilder();
            impression.getPages().forEach(pg -> pg.getElements().forEach(e -> ajouter(e, sb)));
            String texte = sb.toString();
            assertTrue(texte.contains("ANALYSE DES AVOIRS") && texte.contains("Taux de clôture : 83,3 %"), texte);
            for (LigneEditionSectionDTO l : lignes) {
                for (String c : l.colonnes()) {
                    assertTrue(c.isEmpty() || texte.contains(c), "absent du document : " + c);
                }
            }
            assertTrue(texte.contains("79 007"), "valeur du dernier produit");
        }
    }

    /**
     * Plan du 08/11, point 8 : fenetre « Seuil de réserve atteint » en PDF. Sur 2 000 listes tirees au hasard (graine
     * fixe) : une ligne par produit, colonnes = fenetre (CIP, produit, sens, rayon, reserve, seuil, a deplacer),
     * produits vers la reserve + vers le rayon = produits ; une suggestion citee une fois ; liste vide : un message.
     */
    @Test
    public void reserveApresEntreeCommeLaFenetre() throws Exception {
        Random r = new Random(GRAINE + 8);
        for (int cas = 0; cas < 2000; cas++) {
            JSONArray t = new JSONArray();
            int n = r.nextInt(12), vers = 0;
            for (int i = 0; i < n; i++) {
                boolean reserve = r.nextBoolean();
                vers += reserve ? 1 : 0;
                t.put(new JSONObject().put("cip", String.valueOf(1000000 + r.nextInt(9000000)))
                        .put("nom", "PRODUIT " + i).put("categorie", reserve ? "RESERVE" : "RAYON")
                        .put("stockRayon", r.nextInt(3000)).put("stockReserve", r.nextInt(3000))
                        .put("seuil", r.nextInt(50)).put("quantite", r.nextInt(1500)).put("ref", "SR-" + (i % 2))
                        .put("bon", i % 2 == 0 ? "BL" + cas : ""));
            }
            List<LigneEditionSectionDTO> l = EditionSections.reserveApresEntree(t);
            String cle = "cas " + cas;
            assertArrayEquals(new String[] { "CIP", "Produit", "Sens", "Rayon", "Réserve", "Seuil", "À déplacer" },
                    java.util.Arrays.copyOf(l.get(0).colonnes(), 7), cle);
            assertEquals(Math.max(n, 1) + 1, l.size(), cle + " : en-tete + une ligne par produit");
            for (int i = 0; i < n; i++) {
                JSONObject x = t.getJSONObject(i);
                assertArrayEquals(
                        new String[] { x.getString("cip"), x.getString("nom"),
                                "RESERVE".equals(x.getString("categorie")) ? "Rayon » réserve" : "Réserve » rayon",
                                String.valueOf(x.getInt("stockRayon")), String.valueOf(x.getInt("stockReserve")),
                                String.valueOf(x.getInt("seuil")), String.valueOf(x.getInt("quantite")) },
                        java.util.Arrays.copyOf(l.get(i + 1).colonnes(), 7), cle + " ligne " + i);
                assertEquals("B", l.get(i + 1).getDisposition(), cle);
            }
            if (n == 0) {
                assertEquals("Aucun produit à déplacer.", l.get(1).colonnes()[0], cle);
            }
            assertEquals(n + " produit(s) · " + vers + " vers la réserve · " + (n - vers) + " vers le rayon",
                    EditionSections.indicateursReserve(t), cle);
            String refs = EditionSections.suggestionsReserve(t);
            assertEquals(
                    n == 0 ? ""
                            : n == 1 ? "Suggestion SR-0 du BL BL" + cas : "Suggestion SR-0 du BL BL" + cas + ", SR-1",
                    refs, cle);
        }
        /* le modele se remplit avec ces lignes : chaque cellule est dans le document */
        try (InputStream in = getClass().getResourceAsStream("/reports/rp_edition_sections.jrxml")) {
            JasperReport rapport = JasperCompileManager.compileReport(in);
            JSONArray t = new JSONArray();
            for (int i = 0; i < 40; i++) {
                t.put(new JSONObject().put("cip", "77" + (10000 + i)).put("nom", "PRODUIT RESERVE " + i)
                        .put("categorie", i % 3 == 0 ? "RAYON" : "RESERVE").put("stockRayon", 100 + i)
                        .put("stockReserve", 2000 + i).put("seuil", 10 + i % 7).put("quantite", 300 + i)
                        .put("ref", "SR-X").put("bon", "BL-9"));
            }
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_CLT_INFOS", "SEUIL DE RÉSERVE ATTEINT : PRODUITS À DÉPLACER");
            parametres.put("P_PERIODE", EditionSections.suggestionsReserve(t));
            parametres.put("P_INDICATEURS", EditionSections.indicateursReserve(t));
            List<LigneEditionSectionDTO> lignes = EditionSections.reserveApresEntree(t);
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(lignes));
            StringBuilder sb = new StringBuilder();
            impression.getPages().forEach(pg -> pg.getElements().forEach(e -> ajouter(e, sb)));
            String texte = sb.toString();
            assertTrue(texte.contains("Suggestion SR-X du BL BL-9")
                    && texte.contains("40 produit(s) · 26 vers la réserve"), texte);
            for (LigneEditionSectionDTO l : lignes) {
                for (String c : l.colonnes()) {
                    assertTrue(c.isEmpty() || texte.contains(c), "absent du document : " + c);
                }
            }
        }
    }

    /**
     * Plan du 10/11, point 2 : edition dediee rp_reserve_apres_entree. 2 000 jeux tires au hasard (graine fixe) : une
     * ligne par produit, colonnes = fenetre (CIP, produit, sens, rayon, reserve, seuil mini, seuil maxi, quantite
     * proposee), seuils vides quand la fiche ne les renseigne pas. Puis le modele rempli : chaque ligne du document
     * porte ses huit cellules dans l'ordre ; seuil mini en rouge gras, seuil maxi en bleu gras, quantite en vert gras,
     * en-tetes compris ; A4 paysage ; plusieurs pages.
     */
    @Test
    public void reserveApresEntreeEditionDediee() throws Exception {
        Random r = new Random(GRAINE + 10);
        for (int cas = 0; cas < 2000; cas++) {
            JSONArray t = new JSONArray();
            int n = r.nextInt(12);
            for (int i = 0; i < n; i++) {
                String mini = r.nextInt(4) == 0 ? "" : String.valueOf(r.nextInt(30));
                String maxi = r.nextInt(4) == 0 ? "" : String.valueOf(1 + r.nextInt(300));
                t.put(new JSONObject().put("cip", String.valueOf(1000000 + r.nextInt(9000000)))
                        .put("nom", "PRODUIT " + i).put("categorie", r.nextBoolean() ? "RESERVE" : "RAYON")
                        .put("stockRayon", r.nextInt(3000)).put("stockReserve", r.nextInt(3000)).put("seuilMini", mini)
                        .put("seuilMaxi", maxi).put("quantite", r.nextInt(1500)));
            }
            List<commonTasks.dto.LigneReserveApresEntreeDTO> l = EditionSections.reserveApresEntreeLignes(t);
            assertEquals(n, l.size(), "cas " + cas);
            for (int i = 0; i < n; i++) {
                JSONObject x = t.getJSONObject(i);
                commonTasks.dto.LigneReserveApresEntreeDTO d = l.get(i);
                assertArrayEquals(new String[] { x.getString("cip"), x.getString("nom"),
                        EditionSections.sensReserve(x.getString("categorie")), String.valueOf(x.getInt("stockRayon")),
                        String.valueOf(x.getInt("stockReserve")), x.getString("seuilMini"), x.getString("seuilMaxi"),
                        String.valueOf(x.getInt("quantite")) },
                        new String[] { d.getCip(), d.getNom(), d.getSens(), d.getRayon(), d.getReserve(),
                                d.getSeuilMini(), d.getSeuilMaxi(), d.getQuantite() },
                        "cas " + cas + " ligne " + i);
            }
        }
        try (InputStream in = getClass().getResourceAsStream("/reports/rp_reserve_apres_entree.jrxml")) {
            assertNotNull(in, "rp_reserve_apres_entree.jrxml embarque");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            assertEquals(842, rapport.getPageWidth(), "A4 paysage");
            JSONArray t = new JSONArray();
            for (int i = 0; i < 60; i++) {
                t.put(new JSONObject().put("cip", "88" + (10000 + i)).put("nom", "PRODUIT RESERVE " + i)
                        .put("categorie", i % 3 == 0 ? "RAYON" : "RESERVE").put("stockRayon", 100 + i)
                        .put("stockReserve", 2000 + i).put("seuilMini", i % 5 == 0 ? "" : String.valueOf(3 + i % 7))
                        .put("seuilMaxi", String.valueOf(400 + i)).put("quantite", 300 + i));
            }
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_CLT_INFOS", "SEUIL DE RÉSERVE ATTEINT : PRODUITS À DÉPLACER");
            parametres.put("P_INDICATEURS", EditionSections.indicateursReserve(t));
            List<commonTasks.dto.LigneReserveApresEntreeDTO> lignes = EditionSections.reserveApresEntreeLignes(t);
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(lignes));
            assertTrue(impression.getPages().size() >= 2, "plusieurs pages");
            /* cellules du document regroupees par ligne (page, y), triees par x */
            java.util.TreeMap<String, java.util.TreeMap<Integer, JRPrintText>> parLigne = new java.util.TreeMap<>();
            for (int pg = 0; pg < impression.getPages().size(); pg++) {
                for (JRPrintElement e : impression.getPages().get(pg).getElements()) {
                    if (e instanceof JRPrintText) {
                        parLigne.computeIfAbsent(String.format("%03d-%05d", pg, e.getY()),
                                k -> new java.util.TreeMap<>()).put(e.getX(), (JRPrintText) e);
                    }
                }
            }
            int trouvees = 0;
            int entetes = 0;
            for (java.util.TreeMap<Integer, JRPrintText> rang : parLigne.values()) {
                /* positions du jrxml + marge gauche de 20 */
                JRPrintText mini = rang.get(582), maxi = rang.get(662), qte = rang.get(742);
                if (rang.size() != 8 || mini == null || maxi == null || qte == null) {
                    continue;
                }
                for (Object[] c : new Object[][] { { mini, "#C62828" }, { maxi, "#1A5F9E" }, { qte, "#2E7D32" } }) {
                    JRPrintText x = (JRPrintText) c[0];
                    assertEquals(java.awt.Color.decode((String) c[1]), x.getForecolor(), x.getFullText());
                    assertTrue(Boolean.TRUE.equals(x.isBold()), "gras : " + x.getFullText());
                }
                String[] cellules = rang.values().stream().map(JRPrintText::getFullText).toArray(String[]::new);
                if ("CIP".equals(cellules[0])) {
                    assertArrayEquals(new String[] { "CIP", "Produit", "Sens", "Rayon", "Réserve", "Seuil mini rayon",
                            "Seuil maxi rayon", "Quantité proposée" }, cellules);
                    entetes++;
                    continue;
                }
                commonTasks.dto.LigneReserveApresEntreeDTO d = lignes.get(trouvees++);
                assertArrayEquals(
                        new String[] { d.getCip(), d.getNom(), d.getSens(), d.getRayon(), d.getReserve(),
                                d.getSeuilMini(), d.getSeuilMaxi(), d.getQuantite() },
                        java.util.Arrays.stream(cellules).map(s -> s == null ? "" : s).toArray(String[]::new),
                        "ligne " + trouvees);
            }
            assertEquals(lignes.size(), trouvees, "chaque produit une fois, dans l'ordre");
            assertEquals(impression.getPages().size(), entetes, "en-tete des colonnes sur chaque page");
        }
    }

    private static void ajouter(JRPrintElement e, StringBuilder sb) {
        if (e instanceof JRPrintText) {
            sb.append(((JRPrintText) e).getFullText()).append('\n');
        } else if (e instanceof JRPrintFrame) {
            ((JRPrintFrame) e).getElements().forEach(x -> ajouter(x, sb));
        }
    }

    /**
     * Plan du 08/11, point 8 : la police du PDF (Helvetica, jeu WinAnsi) n'a pas la fleche « → », qui disparaissait a
     * l'impression (« Rayon réserve »). Chaque caractere du sens doit exister dans ce jeu.
     */
    @Test
    void sensImprimableDansLePdf() {
        java.nio.charset.CharsetEncoder win = java.nio.charset.Charset.forName("windows-1252").newEncoder();
        for (String cat : new String[] { "RESERVE", "RAYON", "", null }) {
            String sens = EditionSections.sensReserve(cat);
            assertTrue(win.canEncode(sens), "sens imprimable : " + sens);
            assertTrue(sens.matches("(Rayon|Réserve) \\S (réserve|rayon)"), sens);
        }
        assertEquals("Rayon » réserve", EditionSections.sensReserve("RESERVE"));
        assertEquals("Réserve » rayon", EditionSections.sensReserve("RAYON"));
    }
}
