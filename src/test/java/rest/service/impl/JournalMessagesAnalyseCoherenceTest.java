package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 22/11 (lot 9) : analyse du journal des messages. Regles verifiees sur des milliers de selections tirees au
 * hasard (graine fixe), dont des selections vides, d'un seul canal, d'une seule origine, sans aucun envoi :
 * <ul>
 * <li>compteurs de l'ensemble : envoyes + echecs + attente = messages ; lus &lt;= distribues &lt;= envoyes ;</li>
 * <li>taux = numerateur / denominateur a une decimale, 0 si le denominateur est nul ; tous entre 0 et 100 ;</li>
 * <li>taux de lecture sur WhatsApp seulement : les SMS n'y entrent jamais ;</li>
 * <li>repartition par canal et par origine : chaque message dans un seul groupe, la somme des groupes = l'ensemble
 * (messages, envoyes, distribues, lus, echecs, attente), du plus grand groupe au plus petit ;</li>
 * <li>la page de l'ecran porte la meme analyse que la selection entiere ;</li>
 * <li>edition PDF : un document est produit, quelle que soit la selection (vide comprise).</li>
 * </ul>
 */
class JournalMessagesAnalyseCoherenceTest {

    private static final String[] CANAUX = { JournalMessages.SMS, JournalMessages.WHATSAPP };
    private static final String[] CLES = { "total", "envoyes", "distribues", "lus", "echecs", "attente" };

    private static JournalMessages.Ligne ligne(Random r, int i, String canalForce, String origineForcee) {
        String canal = canalForce != null ? canalForce : CANAUX[r.nextInt(2)];
        String etat = JournalMessages.ETATS.get(r.nextInt(JournalMessages.ETATS.size()));
        if (JournalMessages.SMS.equals(canal) && AvoirMessage.LU.equals(etat)) {
            etat = AvoirMessage.DISTRIBUE;
        }
        String origine = origineForcee != null ? origineForcee
                : JournalMessages.ORIGINES.get(r.nextInt(JournalMessages.ORIGINES.size()));
        return new JournalMessages.Ligne("L" + i, new Date(1_790_000_000_000L + r.nextInt(5000) * 60_000L), canal,
                origine, "ZZJM " + i, "0100" + (100000 + r.nextInt(900000)), etat, null, "");
    }

    private static double taux(int a, int b) {
        return b == 0 ? 0d : Math.round(a * 1000d / b) / 10d;
    }

    private static int compte(List<JournalMessages.Ligne> l, String canal, String... etats) {
        Set<String> e = new HashSet<>(Arrays.asList(etats));
        int n = 0;
        for (JournalMessages.Ligne x : l) {
            if ((canal == null || canal.equals(x.canal)) && e.contains(x.etat)) {
                n++;
            }
        }
        return n;
    }

    /** Verifie les compteurs et les taux d'un bloc d'analyse contre la reference ecrite a part. */
    private static void verifier(JSONObject t, List<JournalMessages.Ligne> l, String jeu) {
        int total = l.size();
        int envoyes = compte(l, null, AvoirMessage.ENVOYE, AvoirMessage.DISTRIBUE, AvoirMessage.LU);
        int distribues = compte(l, null, AvoirMessage.DISTRIBUE, AvoirMessage.LU);
        int lus = compte(l, null, AvoirMessage.LU);
        int echecs = compte(l, null, AvoirMessage.ECHEC);
        int attente = compte(l, null, AvoirMessage.EN_ATTENTE);
        int distribuesWa = compte(l, JournalMessages.WHATSAPP, AvoirMessage.DISTRIBUE, AvoirMessage.LU);
        int lusWa = compte(l, JournalMessages.WHATSAPP, AvoirMessage.LU);
        assertEquals(total, t.getInt("total"), jeu);
        assertEquals(envoyes, t.getInt("envoyes"), jeu);
        assertEquals(distribues, t.getInt("distribues"), jeu);
        assertEquals(lus, t.getInt("lus"), jeu);
        assertEquals(echecs, t.getInt("echecs"), jeu);
        assertEquals(attente, t.getInt("attente"), jeu);
        assertEquals(total, t.getInt("envoyes") + t.getInt("echecs") + t.getInt("attente"), "partage " + jeu);
        assertTrue(t.getInt("lus") <= t.getInt("distribues") && t.getInt("distribues") <= t.getInt("envoyes"), jeu);
        assertEquals(taux(envoyes, total), t.getDouble("tauxEnvoi"), 1e-9, "envoi " + jeu);
        assertEquals(taux(distribues, envoyes), t.getDouble("tauxReception"), 1e-9, "reception " + jeu);
        assertEquals(taux(lusWa, distribuesWa), t.getDouble("tauxLecture"), 1e-9, "lecture " + jeu);
        assertEquals(distribuesWa, t.getInt("distribuesWhatsApp"), jeu);
        assertEquals(lusWa, t.getInt("lusWhatsApp"), jeu);
        assertEquals(taux(echecs, total), t.getDouble("tauxEchec"), 1e-9, "echec " + jeu);
        assertEquals(taux(attente, total), t.getDouble("tauxAttente"), 1e-9, "attente " + jeu);
        for (String k : new String[] { "tauxEnvoi", "tauxReception", "tauxLecture", "tauxEchec", "tauxAttente" }) {
            assertTrue(t.getDouble(k) >= 0 && t.getDouble(k) <= 100, k + " " + jeu);
        }
    }

    private static void verifierRepartition(JSONArray groupes, JSONObject ensemble, List<JournalMessages.Ligne> l,
            boolean parCanal, String jeu) {
        long[] somme = new long[CLES.length];
        Set<String> codes = new HashSet<>();
        int precedent = Integer.MAX_VALUE;
        for (int i = 0; i < groupes.length(); i++) {
            JSONObject g = groupes.getJSONObject(i);
            assertTrue(codes.add(g.getString("code")), "groupe en double " + jeu);
            List<JournalMessages.Ligne> du = new ArrayList<>();
            for (JournalMessages.Ligne x : l) {
                if (g.getString("code").equals(parCanal ? x.canal : x.origine)) {
                    du.add(x);
                }
            }
            verifier(g, du, jeu + " groupe " + g.getString("code"));
            assertTrue(g.getInt("total") > 0 && g.getInt("total") <= precedent, "ordre " + jeu);
            precedent = g.getInt("total");
            for (int k = 0; k < CLES.length; k++) {
                somme[k] += g.getInt(CLES[k]);
            }
        }
        for (int k = 0; k < CLES.length; k++) {
            assertEquals(ensemble.getInt(CLES[k]), somme[k], "somme " + CLES[k] + " " + jeu);
        }
    }

    @Test
    void tauxEtRepartitionSurDesMilliersDeSelections() {
        Random r = new Random(20261122L);
        for (int k = 0; k < 4_000; k++) {
            List<JournalMessages.Ligne> l = new ArrayList<>();
            int n = k % 50 == 0 ? 0 : r.nextInt(80);
            String canal = k % 7 == 0 ? CANAUX[r.nextInt(2)] : null;
            String origine = k % 11 == 0 ? JournalMessages.ORIGINES.get(r.nextInt(JournalMessages.ORIGINES.size()))
                    : null;
            for (int i = 0; i < n; i++) {
                l.add(ligne(r, i, canal, origine));
            }
            JSONObject a = JournalMessages.analyse(l);
            String jeu = "jeu " + k;
            verifier(a.getJSONObject("ensemble"), l, jeu);
            verifierRepartition(a.getJSONArray("parCanal"), a.getJSONObject("ensemble"), l, true, jeu);
            verifierRepartition(a.getJSONArray("parOrigine"), a.getJSONObject("ensemble"), l, false, jeu);
            /* la page porte l'analyse de toute la selection */
            JSONObject page = JournalMessages.page(
                    JournalMessages.filtrer(l, new JournalMessages.Filtre(null, null, null, null)), r.nextInt(3) * 20,
                    20);
            assertEquals(a.toString(), page.getJSONObject("analyse").toString(), jeu);
        }
    }

    @Test
    void cas_limites_sans_envoi_et_sms_seuls() {
        /* aucun message : tous les taux a 0 */
        JSONObject vide = JournalMessages.analyse(new ArrayList<>()).getJSONObject("ensemble");
        assertEquals(0, vide.getInt("total"));
        assertEquals(0d, vide.getDouble("tauxEnvoi"));
        assertEquals(0d, vide.getDouble("tauxLecture"));
        /* SMS lus impossibles : les SMS distribues ne comptent jamais dans la lecture */
        List<JournalMessages.Ligne> l = new ArrayList<>();
        l.add(new JournalMessages.Ligne("a", new Date(), JournalMessages.SMS, "AVIS", "x", "0100000001",
                AvoirMessage.DISTRIBUE, null, ""));
        l.add(new JournalMessages.Ligne("b", new Date(), JournalMessages.WHATSAPP, "AVIS", "y", "0100000002",
                AvoirMessage.LU, null, ""));
        l.add(new JournalMessages.Ligne("c", new Date(), JournalMessages.WHATSAPP, "AVIS", "z", "0100000003",
                AvoirMessage.DISTRIBUE, null, ""));
        l.add(new JournalMessages.Ligne("d", new Date(), JournalMessages.WHATSAPP, "AVIS", "t", "0100000004",
                AvoirMessage.ECHEC, "refus", ""));
        JSONObject t = JournalMessages.analyse(l).getJSONObject("ensemble");
        assertEquals(75.0, t.getDouble("tauxEnvoi"));
        assertEquals(100.0, t.getDouble("tauxReception"));
        assertEquals(50.0, t.getDouble("tauxLecture"));
        assertEquals(25.0, t.getDouble("tauxEchec"));
        assertEquals("33,3 %", JournalMessages.texteTaux(JournalMessages.pourcent(1, 3)));
    }

    @Test
    void edition_pdf_produite_pour_toute_selection() {
        Random r = new Random(7L);
        for (int k = 0; k < 20; k++) {
            List<JournalMessages.Ligne> l = new ArrayList<>();
            int n = k == 0 ? 0 : r.nextInt(120);
            for (int i = 0; i < n; i++) {
                l.add(ligne(r, i, null, null));
            }
            byte[] pdf = JournalMessages.pdf(l, java.time.LocalDate.of(2026, 11, 1),
                    java.time.LocalDate.of(2026, 11, 22),
                    new JournalMessages.Filtre(k % 2 == 0 ? "SMS" : null, null, null, k % 3 == 0 ? "zzjm" : null),
                    "PHARMACIE ZZJM", "ZZJM Test");
            assertTrue(
                    pdf.length > 500
                            && new String(pdf, 0, 5, java.nio.charset.StandardCharsets.ISO_8859_1).equals("%PDF-"),
                    "pdf " + k);
        }
    }
}
