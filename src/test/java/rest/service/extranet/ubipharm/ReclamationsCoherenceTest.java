package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;

/**
 * Coherence de la lecture des reclamations sur des milliers de listes et de details generes (graine fixe) :
 * <ul>
 * <li>chaque ligne relue porte exactement l'id, l'eta et l'appl de SON lien (ordre des parametres, encodage, adresse
 * relative ou absolue, appl EXT, YOP, VRI ou autre) ;</li>
 * <li>nombre de lignes rendues = recordsTotal ; un ecart arrete la lecture (PAGINATION) ;</li>
 * <li>ALL contient C et V (par cle id/eta/appl), et un ecart est detecte ;</li>
 * <li>aucun montant ni quantite inconnu ou vide ne devient 0 ; un zero affiche reste 0 ;</li>
 * <li>toJson ne contient aucun HTML ; l'aller-retour par les colonnes de la base rend le meme JSON.</li>
 * </ul>
 */
class ReclamationsCoherenceTest {

    private static final long GRAINE = 20261107L;
    private static final String[] APPL = { "EXT", "YOP", "VRI" };
    private static final String[][] STATUTS = { { "En traitement", "En traitement", "V" },
            { "Cl&ocirc;tur&eacute;e", "Clôturée", "C" }, { "Supprim&eacute;e", "Supprimée", null } };
    private static final String ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    /** Reclamation generee : ce qu'on attend de la lecture. */
    private static final class Gen {
        String id, eta, appl, reference, statutHtml, statut, filtre, envoi, maj;
        List<String> numeros = new ArrayList<>();
        JSONArray cellules;
    }

    private static String code(Random r, int min, int max) {
        int n = min + r.nextInt(max - min + 1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            sb.append(ALNUM.charAt(r.nextInt(ALNUM.length())));
        }
        return sb.toString();
    }

    private static String chiffres(Random r, int min, int max) {
        int n = min + r.nextInt(max - min + 1);
        StringBuilder sb = new StringBuilder();
        sb.append(1 + r.nextInt(9));
        for (int i = 1; i < n; i++) {
            sb.append(r.nextInt(10));
        }
        return sb.toString();
    }

    private static String lien(Random r, Gen g) {
        List<String> p = new ArrayList<>(List.of("id=" + g.id, "eta=" + g.eta, "appl=" + g.appl));
        if (r.nextInt(4) == 0) {
            p.add("_=" + chiffres(r, 10, 13));
        }
        Collections.shuffle(p, r);
        String sep = r.nextBoolean() ? "&amp;" : "&";
        String base;
        switch (r.nextInt(3)) {
        case 0:
            base = "AfficherReclamation";
            break;
        case 1:
            base = "/AfficherReclamation";
            break;
        default:
            base = "https://extranet.invalid/AfficherReclamation";
        }
        String href = base + "?" + String.join(sep, p) + (r.nextInt(5) == 0 ? "#haut" : "");
        String q = r.nextBoolean() ? "\"" : "'";
        String interieur = r.nextBoolean() ? "<i class=\"fa fa-eye\"></i>" : "Voir";
        return (r.nextBoolean() ? "<div>" : "") + "<a class=\"btn\" href=" + q + href + q + ">" + interieur + "</a>";
    }

    private static String date(Random r) {
        switch (r.nextInt(6)) {
        case 0:
            return "";
        case 1:
            return "N/A";
        case 2:
            return "31/02/2026";
        default:
            return String.format("%02d/%02d/%04d", 1 + r.nextInt(28), 1 + r.nextInt(12), 2023 + r.nextInt(4));
        }
    }

    private static Gen generer(Random r) {
        Gen g = new Gen();
        g.id = chiffres(r, 1, 10);
        g.eta = r.nextInt(3) == 0 ? APPL[r.nextInt(3)] : code(r, 1, 10);
        g.appl = r.nextInt(4) == 0 ? code(r, 1, 10) : APPL[r.nextInt(3)];
        /* la reference ne sert jamais a retrouver id/eta/appl : parfois sans rapport */
        g.reference = r.nextInt(5) == 0 ? "REF-" + code(r, 3, 8) : g.appl + g.id + g.eta;
        String[] s = STATUTS[r.nextInt(STATUTS.length)];
        g.statutHtml = s[0];
        g.statut = s[1];
        g.filtre = s[2];
        int n = r.nextInt(4);
        StringBuilder num = new StringBuilder(r.nextBoolean() ? " " : "");
        for (int i = 0; i < n; i++) {
            String x = chiffres(r, 3, 7);
            g.numeros.add(x);
            num.append(x).append(r.nextBoolean() ? " " : "  ");
        }
        g.envoi = date(r);
        g.maj = date(r);
        g.cellules = new JSONArray().put(lien(r, g)).put(g.reference).put(num.toString()).put(g.statutHtml).put(g.envoi)
                .put(g.maj);
        return g;
    }

    private static String enveloppe(List<Gen> l, int total, int filtres) {
        JSONArray data = new JSONArray();
        l.forEach(g -> data.put(g.cellules));
        return new JSONObject().put("msg", new JSONArray())
                .put("datatables",
                        new JSONObject().put("recordsFiltered", filtres).put("data", data).put("recordsTotal", total))
                .toString();
    }

    private static void sansHtml(String json) {
        assertFalse(json.contains("<"), json);
        assertFalse(json.contains("href"), json);
        assertFalse(json.contains("data-pscode"), json);
        assertFalse(json.matches("(?s).*&[a-zA-Z]+;.*"), json);
    }

    @Test
    void listesGenereesRelues() throws Exception {
        Random r = new Random(GRAINE);
        int listes = 0, lignes = 0, autresAppl = 0;
        for (int essai = 0; essai < 3000; essai++) {
            int n = r.nextInt(10) == 0 ? 0 : r.nextInt(40);
            List<Gen> tout = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                tout.add(generer(r));
            }
            List<Gen> c = new ArrayList<>(), v = new ArrayList<>();
            for (Gen g : tout) {
                if ("C".equals(g.filtre)) {
                    c.add(g);
                } else if ("V".equals(g.filtre)) {
                    v.add(g);
                }
            }
            List<ReclamationUbipharm> lt = ReclamationsParseur.liste(enveloppe(tout, n, n));
            List<ReclamationUbipharm> lc = ReclamationsParseur.liste(enveloppe(c, c.size(), c.size()));
            List<ReclamationUbipharm> lv = ReclamationsParseur.liste(enveloppe(v, v.size(), v.size()));
            assertEquals(n, lt.size());
            assertEquals(c.size(), lc.size());
            assertEquals(v.size(), lv.size());
            for (int i = 0; i < n; i++) {
                Gen g = tout.get(i);
                ReclamationUbipharm x = lt.get(i);
                assertEquals(g.id, x.id());
                assertEquals(g.eta, x.eta());
                assertEquals(g.appl, x.appl());
                assertEquals(g.reference, x.reference());
                assertEquals(g.statut, x.statut());
                assertEquals(g.numeros, x.numerosAssocies());
                assertEquals(g.envoi, x.dateEnvoiBrute());
                assertEquals(g.maj, x.dateMiseAJourBrute());
                assertEquals(g.envoi.matches("\\d\\d/\\d\\d/\\d{4}") && !g.envoi.startsWith("31/02"),
                        x.dateEnvoi() != null);
                assertNull(x.lignes());
                sansHtml(x.toJson().toString());
                if (!"EXT".equals(g.appl)) {
                    autresAppl++;
                }
            }
            assertTrue(ReclamationsCollecteur.absentesDeTout(lt, lc, lv).isEmpty());
            /* une reclamation de C absente de ALL est signalee */
            if (!c.isEmpty()) {
                List<ReclamationUbipharm> amputee = new ArrayList<>(lt);
                String cle = lc.get(0).cle();
                amputee.removeIf(x -> cle.equals(x.cle()));
                assertTrue(ReclamationsCollecteur.absentesDeTout(amputee, lc, lv).contains(cle));
            }
            /* total annonce different des lignes recues : jamais rendu comme complet */
            int ecart = 1 + r.nextInt(3);
            int annonce = r.nextBoolean() ? n + ecart : Math.max(0, n - ecart);
            if (annonce != n) {
                int a = annonce;
                assertEquals(ExtranetException.Nature.PAGINATION,
                        assertThrows(ExtranetException.class, () -> ReclamationsParseur.liste(enveloppe(tout, a, a)))
                                .nature());
                assertEquals(ExtranetException.Nature.PAGINATION,
                        assertThrows(ExtranetException.class, () -> ReclamationsParseur.liste(enveloppe(tout, n, a)))
                                .nature());
            }
            listes++;
            lignes += n;
        }
        assertEquals(3000, listes);
        assertTrue(lignes > 40000, "jeu varié : " + lignes);
        assertTrue(autresAppl > 10000, "appl autres que EXT : " + autresAppl);
    }

    /** Prix affiche genere et sa valeur attendue (null = inconnu). */
    private static Object[] prix(Random r) {
        switch (r.nextInt(8)) {
        case 0:
            return new Object[] { "N/A", null };
        case 1:
            return new Object[] { "", null };
        case 2:
            return new Object[] { "0 CFA", BigDecimal.ZERO };
        case 3: {
            BigDecimal b = BigDecimal.valueOf(r.nextInt(10_000_000), 2);
            String s = b.toPlainString().replace('.', ',');
            return new Object[] { s, b };
        }
        default: {
            int v = 1 + r.nextInt(2_000_000);
            String s = String.format("%,d", v).replace(',', ' ').replace(' ', ' ').replace(' ', ' ');
            return new Object[] { (r.nextBoolean() ? s.replace(" ", "&nbsp;") : s) + " CFA", BigDecimal.valueOf(v) };
        }
        }
    }

    @Test
    void detailsGeneresAucunInconnuChangeEnZero() throws Exception {
        Random r = new Random(GRAINE + 1);
        int lignesVues = 0, inconnus = 0, zeros = 0, sansProduit = 0;
        for (int essai = 0; essai < 1500; essai++) {
            int n = r.nextInt(8);
            StringBuilder html = new StringBuilder("<html><body><dl><dt>R&eacute;f&eacute;rence</dt><dd>EXT" + essai
                    + "VRI</dd><dt>Agence</dt><dd>UBIPHARM ZONE " + (1 + r.nextInt(9))
                    + "</dd></dl><p><b>Statut :</b> En traitement</p>" + "<table id=\"reclamation\"><thead><tr>");
            for (int k = 0; k < 14; k++) {
                html.append("<th>").append(r.nextBoolean() ? "" : "C" + k).append("</th>");
            }
            html.append("</tr></thead><tbody>");
            List<Object[]> attendus = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                Object[] p = prix(r);
                String qte;
                Integer q;
                switch (r.nextInt(5)) {
                case 0:
                    qte = "";
                    q = null;
                    break;
                case 1:
                    qte = "N/A";
                    q = null;
                    break;
                case 2:
                    qte = "0";
                    q = 0;
                    break;
                default:
                    q = 1 + r.nextInt(500);
                    qte = String.valueOf(q);
                }
                boolean connu = r.nextInt(4) != 0;
                String ps = connu ? code(r, 3, 10).toUpperCase() : null;
                String cip = connu && r.nextBoolean() ? chiffres(r, 7, 13) : null;
                String produit = connu
                        ? "<span data-pscode=\"" + ps + "\">" + ps + "</span><br>D&Eacute;SIGNATION " + i
                                + (cip == null ? "" : "<br>CIP : \"" + cip + "\"")
                        : "<span data-pscode=\"\">Produit inconnu</span>";
                html.append("<tr><td></td><td>").append(chiffres(r, 6, 6)).append("</td><td>").append(i)
                        .append("</td><td>").append(produit).append("</td><td>").append(qte).append("</td><td>")
                        .append(p[0]).append("</td><td>").append(r.nextInt(5000)).append("</td><td>MOTIF &amp; ")
                        .append(i).append("</td><td></td><td></td><td></td><td>").append("Demande ").append(i)
                        .append("</td><td></td><td>Aucun commentaire</td></tr>");
                attendus.add(new Object[] { p[1], q, ps, cip });
            }
            html.append("</tbody></table></body></html>");
            ReclamationUbipharm d = ReclamationsParseur.detail(html.toString(), String.valueOf(essai), "VRI", "EXT");
            assertEquals("EXT" + essai + "VRI", d.reference());
            assertEquals("En traitement", d.statut());
            assertEquals(n, d.lignes().size());
            assertEquals(14, d.entetes().size());
            for (int i = 0; i < n; i++) {
                LigneReclamationUbipharm l = d.lignes().get(i);
                Object[] a = attendus.get(i);
                assertEquals(14, l.cellules().size());
                assertEquals(i, l.position());
                BigDecimal attendu = (BigDecimal) a[0];
                if (attendu == null) {
                    assertNull(l.prix(), "montant inconnu changé en " + l.prix());
                    inconnus++;
                } else {
                    assertNotNull(l.prix());
                    assertEquals(0, attendu.compareTo(l.prix()), l.prixBrut());
                    if (attendu.signum() == 0) {
                        zeros++;
                    }
                }
                assertEquals(a[1], l.quantite());
                assertEquals(a[2], l.pscode());
                assertEquals(a[3], l.cip());
                if (a[2] == null) {
                    assertNull(l.designation());
                    sansProduit++;
                } else {
                    assertEquals("DÉSIGNATION " + i, l.designation());
                }
                assertEquals("MOTIF & " + i, l.motif());
                assertEquals("Demande " + i, l.commentaire());
                lignesVues++;
            }
            String json = d.toJson().toString();
            sansHtml(json);
            allerRetourBase(d);
        }
        assertTrue(lignesVues > 4000, "lignes : " + lignesVues);
        assertTrue(inconnus > 500 && zeros > 200 && sansProduit > 500,
                inconnus + " inconnus, " + zeros + " zéros, " + sansProduit + " sans produit");
    }

    /** Valeurs ecrites en base puis relues (DECIMAL(18,4) simule) : meme JSON. */
    private static void allerRetourBase(ReclamationUbipharm d) {
        Object[] v = ReclamationsDepot.valeursReclamation(d);
        Object[] ligneRec = { 1L, v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[8], v[10], v[11], 7L,
                "2026-11-07 10:00:00" };
        List<LigneReclamationUbipharm> lues = new ArrayList<>();
        for (LigneReclamationUbipharm l : d.lignes()) {
            Object[] w = ReclamationsDepot.valeursLigne(l);
            if (w[7] != null) {
                w[7] = ((BigDecimal) w[7]).setScale(4, RoundingMode.UNNECESSARY);
            }
            lues.add(ReclamationsDepot.ligneDepuisBase(w));
        }
        ReclamationUbipharm relue = ReclamationsDepot.depuisBase(ligneRec, lues);
        assertTrue(d.toJson().similar(relue.toJson()), d.toJson() + "\n" + relue.toJson());
        assertEquals(d.dateEnvoi() == null ? null : java.sql.Date.valueOf(d.dateEnvoi()), v[7]);
    }
}
