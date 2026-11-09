package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.MotifVenteService;

/**
 * Plan du 08/11, point 18 : recapitulatif des motifs d'annulation et de modification. Sur 3 000 jeux tires au hasard
 * (graine fixe, 0 a 60 operations, plusieurs auteurs et motifs, montants varies dont 0) : somme par motif = somme par
 * auteur = total (nombre, annulations, modifications, montant) ; chaque ligne du detail est une operation ; tri du plus
 * grand nombre au plus petit ; jamais negatif. Regles du motif : obligatoire, « Autre » avec texte, texte borne a 255.
 */
class MotifVenteCoherenceTest {

    private static final String[] MOTIFS = { "Erreur de saisie", "Confusion de produit", "Erreur client", "Autre" };

    @Test
    void recapitulatifParSesRegles() {
        Random h = new Random(18_0811L);
        for (int cas = 0; cas < 3000; cas++) {
            int n = h.nextInt(61), nbAuteurs = 1 + h.nextInt(6);
            List<MotifVenteServiceImpl.Ligne> l = new ArrayList<>();
            Map<String, Integer> attenduMotif = new HashMap<>(), attenduAuteur = new HashMap<>();
            int annul = 0, montant = 0;
            for (int i = 0; i < n; i++) {
                boolean a = h.nextBoolean();
                String motif = MOTIFS[h.nextInt(MOTIFS.length)], auteur = "U" + h.nextInt(nbAuteurs);
                int m = h.nextInt(5) == 0 ? 0 : h.nextInt(250_000);
                l.add(new MotifVenteServiceImpl.Ligne(a ? MotifVenteService.ANNULATION : MotifVenteService.MODIFICATION,
                        motif, auteur, "Nom " + auteur, "Op", "REF" + i, "Autre".equals(motif) ? "client parti" : null,
                        "08/11/2026 10:00", m));
                attenduMotif.merge(motif, 1, Integer::sum);
                attenduAuteur.merge(auteur, 1, Integer::sum);
                annul += a ? 1 : 0;
                montant += m;
            }
            JSONObject o = MotifVenteServiceImpl.agreger(l);
            String cle = "cas " + cas;
            JSONObject t = o.getJSONObject("total");
            assertEquals(n, t.getInt("nb"), cle);
            assertEquals(annul, t.getInt("annulations"), cle);
            assertEquals(n - annul, t.getInt("modifications"), cle);
            assertEquals(montant, t.getInt("montant"), cle);
            assertEquals(n, o.getJSONArray("detail").length(), cle + " : une ligne de detail par operation");
            for (String bloc : new String[] { "parMotif", "parAuteur" }) {
                JSONArray b = o.getJSONArray(bloc);
                int nb = 0, an = 0, mo = 0, mt = 0, precedent = Integer.MAX_VALUE;
                for (int i = 0; i < b.length(); i++) {
                    JSONObject x = b.getJSONObject(i);
                    assertEquals(x.getInt("annulations") + x.getInt("modifications"), x.getInt("nb"), cle + " " + bloc);
                    assertTrue(x.getInt("nb") > 0 && x.getInt("montant") >= 0, cle + " " + bloc);
                    assertTrue(x.getInt("nb") <= precedent, cle + " " + bloc + " : du plus grand au plus petit");
                    precedent = x.getInt("nb");
                    nb += x.getInt("nb");
                    an += x.getInt("annulations");
                    mo += x.getInt("modifications");
                    mt += x.getInt("montant");
                    Map<String, Integer> attendu = "parMotif".equals(bloc) ? attenduMotif : attenduAuteur;
                    String k = "parMotif".equals(bloc) ? x.getString("motif") : x.getString("auteurId");
                    assertEquals(attendu.get(k).intValue(), x.getInt("nb"), cle + " " + bloc + " " + k);
                }
                assertEquals(("parMotif".equals(bloc) ? attenduMotif : attenduAuteur).size(), b.length(),
                        cle + " " + bloc);
                assertEquals(n, nb, cle + " " + bloc + " : somme = total");
                assertEquals(annul, an, cle + " " + bloc);
                assertEquals(n - annul, mo, cle + " " + bloc);
                assertEquals(montant, mt, cle + " " + bloc);
            }
        }
    }

    @Test
    void regleDuMotif() {
        assertNotNull(MotifVenteServiceImpl.refus(false, false, "x"), "motif absent ou inconnu : refuse");
        assertNotNull(MotifVenteServiceImpl.refus(true, true, null), "« Autre » sans texte : refuse");
        assertNotNull(MotifVenteServiceImpl.refus(true, true, "   "), "« Autre » avec des espaces : refuse");
        assertNull(MotifVenteServiceImpl.refus(true, true, "client parti"));
        assertNull(MotifVenteServiceImpl.refus(true, false, null), "motif de la liste : pas de texte demande");
        assertNull(MotifVenteServiceImpl.commentaire("  "));
        assertEquals("abc", MotifVenteServiceImpl.commentaire("  abc "));
        Random h = new Random(7);
        for (int i = 0; i < 1000; i++) {
            StringBuilder b = new StringBuilder();
            int lg = h.nextInt(600);
            for (int k = 0; k < lg; k++) {
                b.append((char) ('a' + h.nextInt(26)));
            }
            String c = MotifVenteServiceImpl.commentaire(b.toString());
            assertTrue(c == null ? lg == 0 : c.length() == Math.min(lg, MotifVenteServiceImpl.COMMENTAIRE_MAX),
                    "longueur " + lg);
        }
    }

    @Test
    void texteLibreLuQuelQueSoitLeTypeDuPilote() {
        /* le pilote MariaDB rend tinyint(1) en Boolean : la lecture planta en 500 (menu de motifs vide) */
        assertTrue(MotifVenteServiceImpl.vrai(Boolean.TRUE));
        assertTrue(!MotifVenteServiceImpl.vrai(Boolean.FALSE));
        assertTrue(MotifVenteServiceImpl.vrai(1));
        assertTrue(MotifVenteServiceImpl.vrai((byte) 1));
        assertTrue(!MotifVenteServiceImpl.vrai(0));
        assertTrue(!MotifVenteServiceImpl.vrai(null));
    }
}
