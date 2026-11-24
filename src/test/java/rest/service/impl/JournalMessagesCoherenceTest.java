package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 8.1 : journal des messages. Regles verifiees sur des milliers de selections tirees au hasard
 * (graine fixe) :
 * <ul>
 * <li>filtre : les lignes gardees sont exactement celles qui respectent chaque critere ; les etats (ou les canaux)
 * partagent la selection sans perte ni doublon ;</li>
 * <li>ordre : de la plus recente a la plus ancienne ;</li>
 * <li>compteurs : envoyes = envoye + distribue + lu, distribues = distribue + lu, attente + envoyes + echecs = total
 * ;</li>
 * <li>pages : leur suite redonne la selection ; compteurs de toute la selection sur chaque page ;</li>
 * <li>CSV : une ligne par message, memes valeurs et meme ordre que l'ecran ; formules de tableur neutralisees ;</li>
 * <li>motif seulement sur un echec, jamais vide alors.</li>
 * </ul>
 */
class JournalMessagesCoherenceTest {

    private static final String[] NOMS = { "ZZJM Kouassi Aya", "ZZJM Koné Élodie", "ZZJM N'Guessan \"Paul\"",
            "=ZZJM Formule", "Numéro d'administration", "" };
    private static final String[] CANAUX = { JournalMessages.SMS, JournalMessages.WHATSAPP };

    private static <T> T un(Random r, List<T> l) {
        return l.get(r.nextInt(l.size()));
    }

    private static JournalMessages.Ligne ligne(Random r, int i) {
        String canal = CANAUX[r.nextInt(2)];
        String etat = un(r, JournalMessages.ETATS);
        if (JournalMessages.SMS.equals(canal) && AvoirMessage.LU.equals(etat)) {
            etat = AvoirMessage.DISTRIBUE;
        }
        String numero = r.nextInt(6) == 0 ? "+2250100990" + (100 + r.nextInt(900))
                : "01009" + String.format("%05d", r.nextInt(100000));
        return new JournalMessages.Ligne(String.format("L%05d", i),
                r.nextInt(10) == 0 ? null : new Date(1_790_000_000_000L + r.nextInt(500) * 60_000L), canal,
                un(r, JournalMessages.ORIGINES), NOMS[r.nextInt(NOMS.length)], numero, etat,
                r.nextBoolean() ? "Refusé ; motif \"technique\"" : null, r.nextInt(4) == 0 ? "" : "ZZJM Caissière");
    }

    /** Reference ecrite a part du filtre. */
    private static boolean garde(JournalMessages.Ligne l, String canal, String origine, String etat, String q) {
        if (canal != null && !canal.equals(l.canal)) {
            return false;
        }
        if (origine != null && !origine.equals(l.origine)) {
            return false;
        }
        if (etat != null && !etat.equals(l.etat)) {
            return false;
        }
        if (q == null) {
            return true;
        }
        String n = java.text.Normalizer.normalize(l.destinataire, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase();
        String qn = java.text.Normalizer.normalize(q, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase().trim();
        String chiffres = q.replaceAll("\\D", "");
        return n.contains(qn) || (chiffres.length() >= 3 && l.numero.replaceAll("\\D", "").contains(chiffres));
    }

    @Test
    void filtresCompteursPagesEtCsvSurDesMilliersDeSelections() {
        Random r = new Random(20261122L);
        List<String> recherches = Arrays.asList(null, "kone", "KOUASSI", "élodie", "0100990", "990 1", "01", "zzjm",
                "administration", "07");
        int nonVides = 0;
        for (int k = 0; k < 3_000; k++) {
            List<JournalMessages.Ligne> lignes = new ArrayList<>();
            int n = r.nextInt(60);
            for (int i = 0; i < n; i++) {
                lignes.add(ligne(r, i));
            }
            String canal = r.nextInt(3) == 0 ? CANAUX[r.nextInt(2)] : null;
            String origine = r.nextInt(4) == 0 ? un(r, JournalMessages.ORIGINES) : null;
            String etat = r.nextInt(4) == 0 ? un(r, JournalMessages.ETATS) : null;
            String q = un(r, recherches);
            List<JournalMessages.Ligne> f = JournalMessages.filtrer(lignes,
                    new JournalMessages.Filtre(canal, origine, etat, q));
            /* filtre = reference */
            List<String> attendu = lignes.stream().filter(l -> garde(l, canal, origine, etat, q)).map(l -> l.id)
                    .sorted().collect(Collectors.toList());
            assertEquals(attendu, f.stream().map(l -> l.id).sorted().collect(Collectors.toList()), "jeu " + k);
            /* ordre : plus recent d'abord (sans date en dernier) */
            for (int i = 1; i < f.size(); i++) {
                Date a = f.get(i - 1).date, b = f.get(i).date;
                assertTrue(a == null ? b == null : (b == null || !a.before(b)), "ordre jeu " + k);
            }
            /* les etats et les canaux partagent la selection */
            int parEtat = 0;
            for (String e : JournalMessages.ETATS) {
                parEtat += JournalMessages.filtrer(f, new JournalMessages.Filtre(null, null, e, null)).size();
            }
            assertEquals(f.size(), parEtat, "jeu " + k);
            assertEquals(f.size(),
                    JournalMessages.filtrer(f, new JournalMessages.Filtre("SMS", null, null, null)).size()
                            + JournalMessages.filtrer(f, new JournalMessages.Filtre("whatsapp", null, null, null))
                                    .size());
            /* compteurs */
            Map<String, Integer> c = JournalMessages.compteurs(f);
            long envoye = f.stream().filter(l -> l.etat.equals(AvoirMessage.ENVOYE)).count();
            long distribue = f.stream().filter(l -> l.etat.equals(AvoirMessage.DISTRIBUE)).count();
            long lu = f.stream().filter(l -> l.etat.equals(AvoirMessage.LU)).count();
            long echec = f.stream().filter(l -> l.etat.equals(AvoirMessage.ECHEC)).count();
            assertEquals(f.size(), (int) c.get("total"));
            assertEquals(envoye + distribue + lu, (long) c.get("envoyes"), "jeu " + k);
            assertEquals(distribue + lu, (long) c.get("distribues"), "jeu " + k);
            assertEquals(lu, (long) c.get("lus"), "jeu " + k);
            assertEquals(echec, (long) c.get("echecs"), "jeu " + k);
            assertEquals(c.get("total"), c.get("attente") + c.get("envoyes") + c.get("echecs"), "jeu " + k);
            assertTrue(c.values().stream().allMatch(x -> x >= 0));
            /* pages */
            int taille = 1 + r.nextInt(20);
            List<String> pages = new ArrayList<>();
            for (int d = 0; d < Math.max(1, f.size()); d += taille) {
                JSONObject p = JournalMessages.page(f, d, taille);
                assertEquals(f.size(), p.getInt("total"));
                assertEquals(c.get("echecs").intValue(), p.getJSONObject("compteurs").getInt("echecs"));
                JSONArray data = p.getJSONArray("data");
                for (int i = 0; i < data.length(); i++) {
                    pages.add(data.getJSONObject(i).getString("id"));
                }
            }
            assertEquals(f.stream().map(l -> l.id).collect(Collectors.toList()), pages, "pages jeu " + k);
            /* CSV = ecran */
            String csv = new String(JournalMessages.csv(f), StandardCharsets.UTF_8);
            assertTrue(csv.startsWith("﻿" + JournalMessages.ENTETE_CSV + "\r\n"));
            List<List<String>> lus = lireCsv(csv.substring(1));
            assertEquals(f.size() + 1, lus.size(), "jeu " + k);
            for (int i = 0; i < f.size(); i++) {
                JSONObject j = JournalMessages.json(f.get(i));
                List<String> attenduCsv = Arrays
                        .asList(j.getString("date"), j.getString("canal"), j.getString("origineLibelle"),
                                j.getString("destinataire"), j.getString("numero"), j.getString("etat"),
                                j.getString("motif"), j.getString("utilisateur"))
                        .stream().map(v -> !v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0 ? "'" + v : v)
                        .collect(Collectors.toList());
                assertEquals(attenduCsv, lus.get(i + 1), "csv jeu " + k + " ligne " + i);
            }
            /* motif seulement sur un echec */
            for (JournalMessages.Ligne l : f) {
                if (AvoirMessage.ECHEC.equals(l.etat)) {
                    assertTrue(l.motif != null && !l.motif.trim().isEmpty());
                } else {
                    assertNull(l.motif);
                }
            }
            if (!f.isEmpty()) {
                nonVides++;
            }
        }
        assertTrue(nonVides > 1000, "selections non vides : " + nonVides);
    }

    /** Lecteur CSV independant (guillemets, « ; », \r\n). */
    private static List<List<String>> lireCsv(String s) {
        List<List<String>> l = new ArrayList<>();
        List<String> ligne = new ArrayList<>();
        StringBuilder champ = new StringBuilder();
        boolean dans = false;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (dans) {
                if (ch == '"' && i + 1 < s.length() && s.charAt(i + 1) == '"') {
                    champ.append('"');
                    i++;
                } else if (ch == '"') {
                    dans = false;
                } else {
                    champ.append(ch);
                }
            } else if (ch == '"') {
                dans = true;
            } else if (ch == ';') {
                ligne.add(champ.toString());
                champ.setLength(0);
            } else if (ch == '\r') {
                continue;
            } else if (ch == '\n') {
                ligne.add(champ.toString());
                champ.setLength(0);
                l.add(ligne);
                ligne = new ArrayList<>();
            } else {
                champ.append(ch);
            }
        }
        return l;
    }

    @Test
    void etatsEtOrigines() {
        /* memes regles que la liste des avoirs */
        assertEquals("Envoyé", JournalMessages.etatWhatsApp("SIMULE"));
        assertEquals("Envoyé", JournalMessages.etatWhatsApp("ENVOYE"));
        assertEquals("Envoyé", JournalMessages.etatWhatsApp("OUVERT"));
        assertEquals("Distribué", JournalMessages.etatWhatsApp("DELIVRE"));
        assertEquals("Lu", JournalMessages.etatWhatsApp("LU"));
        assertEquals("Échec", JournalMessages.etatWhatsApp("ECHEC"));
        assertEquals("En attente", JournalMessages.etatWhatsApp(null));
        assertEquals("Distribué", JournalMessages.etatSms("SENT", "SENT", "DELIVERED_TO_TERMINAL", null));
        assertEquals("Échec", JournalMessages.etatSms("SENT", "SENT", "DELIVERY_IMPOSSIBLE", null));
        assertEquals("Envoyé", JournalMessages.etatSms("NOT_SEND", "SENT", "ACCEPTED_BY_PROVIDER", null));
        assertEquals("Échec", JournalMessages.etatSms("NOT_SEND", "NOT_SEND", null, "NUMERO_INVALIDE"));
        assertEquals("Échec", JournalMessages.etatSms("LOCK", "NOT_SEND", null, null));
        assertEquals("En attente", JournalMessages.etatSms("NOT_SEND", "NOT_SEND", null, null));
        assertEquals("Envoyé", JournalMessages.etatAdministration("ENVOYE"));
        assertEquals("Échec", JournalMessages.etatAdministration("ECHEC"));
        assertEquals("Échec", JournalMessages.etatAdministration("NON_ENVOYE"));

        assertEquals("CAMPAGNE", JournalMessages.origineSms("RAPPEL_HABITUDE", true));
        assertEquals("CAMPAGNE", JournalMessages.origineSms("CAMPAGNE", false));
        assertEquals("RAPPEL", JournalMessages.origineSms("RAPPEL_HABITUDE", false));
        assertEquals("RAPPEL", JournalMessages.origineSms("RAPPEL_RENOUVELLEMENT", false));
        assertEquals("AVOIR", JournalMessages.origineSms("AVOIR_PRODUIT", false));
        assertEquals("CLOTURE_CAISSE", JournalMessages.origineSms("CLOTURE_DE_CAISSE", false));
        assertEquals("NOTIFICATION", JournalMessages.origineSms("ENTREE_EN_STOCK", false));
        assertEquals("NOTIFICATION", JournalMessages.origineSms(null, false));
        assertEquals("TICKET_Z", JournalMessages.origineAdministration("TICKET_Z"));
        assertEquals("POINT_ACTIVITE", JournalMessages.origineAdministration("POINT_ACTIVITE"));
        assertEquals("CLOTURE_CAISSE", JournalMessages.origineAdministration("CLOTURE_CAISSE"));
        assertEquals("ADMINISTRATION", JournalMessages.origineAdministration("AVOIR"));
        assertEquals("ADMINISTRATION", JournalMessages.origineAdministration(null));
        for (String o : JournalMessages.ORIGINES) {
            assertTrue(!JournalMessages.libelleOrigine(o).isEmpty());
        }
        assertEquals("Clôture de caisse", JournalMessages.libelleOrigine("CLOTURE_CAISSE"));
        assertEquals("Ticket Z", JournalMessages.libelleOrigine("TICKET_Z"));
    }

    @Test
    void motifParDefautSelonLeCanal() {
        assertEquals("Refusé par le fournisseur SMS",
                new JournalMessages.Ligne("a", null, "SMS", "AVOIR", "", "", "Échec", " ", "").motif);
        assertEquals("Refusé par WhatsApp",
                new JournalMessages.Ligne("a", null, "WHATSAPP", "AVOIR", "", "", "Échec", null, "").motif);
        assertNull(new JournalMessages.Ligne("a", null, "SMS", "AVOIR", "", "", "Envoyé", "x", "").motif);
    }

    @Test
    void periodeBornee() {
        LocalDate auj = LocalDate.now();
        assertArrayEquals(new LocalDate[] { auj, auj }, JournalMessagesService.periode(null, null));
        assertArrayEquals(new LocalDate[] { LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 22) },
                JournalMessagesService.periode("2026-11-22", "2026-11-01"));
        LocalDate[] p = JournalMessagesService.periode("2025-01-01", "2026-11-22");
        assertEquals(LocalDate.of(2026, 11, 22), p[1]);
        assertEquals(JournalMessages.JOURS_MAX - 1, java.time.temporal.ChronoUnit.DAYS.between(p[0], p[1]));
        assertArrayEquals(new LocalDate[] { LocalDate.of(2026, 11, 3), LocalDate.of(2026, 11, 3) },
                JournalMessagesService.periode("2026-11-03", "2026-11-03"));
        /* date illisible : aujourd'hui */
        assertEquals(auj, JournalMessagesService.periode("pas une date", null)[0]);
    }

    @Test
    void numeroAdministrationLocal() {
        assertEquals("0100990299", SmsImpl.administration("+225 01 00 99 02 99"));
        assertEquals("0100990299", SmsImpl.administration("0100990299"));
        assertEquals("12345", SmsImpl.administration(" 12345 "));
        assertNull(SmsImpl.administration(" "));
    }
}
