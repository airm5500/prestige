package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Random;
import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Retour du 22/11 sur le point 8.3 du plan du 21/11 : « je peux avoir un client avec un numero belge, francais ou
 * autres ou je peux installer le logiciel hors de la Cote d'Ivoire ».
 *
 * <p>
 * Regles verifiees sur des milliers de saisies tirees au hasard (graine fixe) :
 * <ul>
 * <li>Cote d'Ivoire (225) : la regle d'avant est intacte : toute saisie que l'ancien controle acceptait donne le meme
 * numero ; une saisie qui change de resultat est forcement un numero etranger ecrit avec son indicatif ;</li>
 * <li>numero etranger (« + » ou « 00 » et un autre indicatif, qui ne commence jamais par 0) : valide si et seulement
 * s'il compte 8 a 15 chiffres ; garde sous la forme « + » et chiffres ; international = chiffres ;</li>
 * <li>officine hors de Cote d'Ivoire : 6 a 12 chiffres hors zero de tete ; international = indicatif + numero sans le
 * zero ; les regles ivoiriennes (01, 05, 07) ne s'appliquent plus ;</li>
 * <li>l'ecran (view/commun/TelephoneSaisie.js) rend exactement le meme resultat que le serveur, pour trois pays ;</li>
 * <li>le SMS part vers l'indicatif du numero : voir util.sms.LeTextoNumeroEtrangerTest.</li>
 * </ul>
 */
public class TelephonePaysCoherenceTest {

    private static final Random HASARD = new Random(2211221L);

    @AfterEach
    void remettreCoteDIvoire() {
        TelephoneCi.indicatifPays("225");
    }

    /** L'ancien controle (avant le 22/11), recopie tel quel : la reference de non-regression. */
    static String[] ancien(String saisie) {
        if (saisie == null || saisie.trim().isEmpty()) {
            return new String[] { "0", "Numéro absent" };
        }
        String nettoye = saisie.trim().replaceAll("[\\s.\\-()]", "");
        if (nettoye.startsWith("+")) {
            nettoye = nettoye.substring(1);
        }
        if (!nettoye.matches("\\d+")) {
            return new String[] { "0", "Caractères non numériques" };
        }
        if (nettoye.startsWith("00225")) {
            nettoye = nettoye.substring(5);
        } else if (nettoye.startsWith("225") && nettoye.length() == 13) {
            nettoye = nettoye.substring(3);
        }
        if (nettoye.length() == 8) {
            return new String[] { "0", "Ancien format à 8 chiffres" };
        }
        if (nettoye.length() != 10) {
            return new String[] { "0", "Nombre de chiffres incorrect (" + nettoye.length() + ")" };
        }
        String p = nettoye.substring(0, 2);
        if (p.equals("21") || p.equals("25") || p.equals("27")) {
            return new String[] { "0", "Numéro fixe (non mobile)" };
        }
        if (!p.equals("01") && !p.equals("05") && !p.equals("07")) {
            return new String[] { "0", "Préfixe non mobile (" + p + ")" };
        }
        return new String[] { "1", nettoye, "225" + nettoye };
    }

    private static String chiffres(int n) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < n; i++) {
            b.append(HASARD.nextInt(10));
        }
        return b.toString();
    }

    /** Une saisie au hasard : numeros ivoiriens, etrangers, du pays, fautifs, avec separateurs. */
    public static String saisie() {
        String[] seps = { "", " ", ".", "-", "  " };
        String sep = seps[HASARD.nextInt(seps.length)];
        String corps;
        switch (HASARD.nextInt(9)) {
        case 0:
            corps = "0" + "157".charAt(HASARD.nextInt(3)) + chiffres(8);
            break;
        case 1:
            corps = chiffres(6 + HASARD.nextInt(10));
            break;
        case 2:
            corps = "+" + (1 + HASARD.nextInt(999)) + sep + chiffres(4 + HASARD.nextInt(12));
            break;
        case 3:
            corps = "00" + (1 + HASARD.nextInt(999)) + sep + chiffres(4 + HASARD.nextInt(12));
            break;
        case 4:
            corps = (HASARD.nextBoolean() ? "+225" : "00225") + sep + "0" + "1579".charAt(HASARD.nextInt(4))
                    + chiffres(8);
            break;
        case 5:
            corps = "+33" + sep + chiffres(9 + HASARD.nextInt(2));
            break;
        case 6:
            corps = "0" + chiffres(5 + HASARD.nextInt(10));
            break;
        case 7:
            corps = "+" + chiffres(2) + "x" + chiffres(6);
            break;
        default:
            corps = "(" + chiffres(2) + ") " + chiffres(2) + sep + chiffres(2) + sep + chiffres(2) + sep + chiffres(2);
        }
        if (sep.length() > 0 && corps.length() > 6 && HASARD.nextBoolean()) {
            int i = 2 + HASARD.nextInt(corps.length() - 3);
            corps = corps.substring(0, i) + sep + corps.substring(i);
        }
        return HASARD.nextInt(20) == 0 ? " " + corps + " " : corps;
    }

    @Test
    void coteDIvoireLaRegleDAvantEstIntacte() {
        int changes = 0;
        int valides = 0;
        for (int i = 0; i < 20000; i++) {
            String s = saisie();
            String[] a = ancien(s);
            TelephoneCi.Resultat n = TelephoneCi.controler(s, "225");
            if ("1".equals(a[0])) {
                valides++;
                assertTrue(n.isValide(), s);
                assertEquals(a[1], n.getLocal(), s);
                assertEquals(a[2], n.getInternational(), s);
            } else if (n.isValide()) {
                /* seul changement admis : un numero etranger ecrit avec son indicatif, garde « + » et chiffres */
                changes++;
                String c = s.trim().replaceAll("[\\s.\\-()]", "");
                assertTrue(c.startsWith("+") || c.startsWith("00"), s);
                assertFalse(c.replaceFirst("^\\+", "").replaceFirst("^00", "").startsWith("225"), s);
                assertTrue(n.getLocal().startsWith("+"), s);
            } else {
                String c = s.trim().replaceAll("[\\s.\\-()]", "");
                String apres = c.replaceFirst("^\\+", "").replaceFirst("^00", "");
                boolean etranger = (c.startsWith("+") || c.startsWith("00")) && !apres.startsWith("225")
                        && !apres.startsWith("0");
                if (!etranger) {
                    assertEquals(a[1], n.getMotif(), "motif inchangé pour " + s);
                }
            }
        }
        assertTrue(valides > 1500, "valides : " + valides);
        assertTrue(changes > 1500, "numéros étrangers devenus valides : " + changes);
    }

    @Test
    void numeroEtrangerHuitAQuinzeChiffres() {
        int vus = 0;
        for (int i = 0; i < 20000; i++) {
            String indicatif = String.valueOf(1 + HASARD.nextInt(999));
            if (indicatif.startsWith("225")) {
                continue;
            }
            String numero = chiffres(3 + HASARD.nextInt(14));
            String tout = indicatif + numero;
            String s = (HASARD.nextBoolean() ? "+" : "00") + indicatif + (HASARD.nextBoolean() ? " " : "") + numero;
            for (String pays : new String[] { "225", "33", "1" }) {
                if (tout.startsWith(pays)) {
                    continue;
                }
                vus++;
                TelephoneCi.Resultat r = TelephoneCi.controler(s, pays);
                boolean attendu = tout.length() >= 8 && tout.length() <= 15;
                assertEquals(attendu, r.isValide(), s + " / pays " + pays);
                if (attendu) {
                    assertEquals("+" + tout, r.getLocal(), s);
                    assertEquals(tout, r.getInternational(), s);
                    /* rejouer le numero garde donne le meme numero (relecture du numero en base) */
                    TelephoneCi.Resultat relu = TelephoneCi.controler(r.getLocal(), pays);
                    assertTrue(relu.isValide(), r.getLocal());
                    assertEquals(r.getLocal(), relu.getLocal());
                    assertEquals(r.getInternational(), relu.getInternational());
                } else {
                    assertTrue(r.getMotif().startsWith("Numéro étranger : nombre de chiffres incorrect"), r.getMotif());
                }
            }
        }
        assertTrue(vus > 30000, "vus : " + vus);
    }

    @Test
    void officineHorsDeCoteDIvoire() {
        for (int i = 0; i < 10000; i++) {
            /* un numero national ne commence pas par « 00 » (ce serait un numero international) */
            String national = (HASARD.nextBoolean() ? "0" : "") + (1 + HASARD.nextInt(9))
                    + chiffres(3 + HASARD.nextInt(12));
            TelephoneCi.Resultat r = TelephoneCi.controler(national, "33");
            String utile = national.startsWith("0") ? national.substring(1) : national;
            boolean attendu = utile.length() >= 6 && utile.length() <= 12;
            assertEquals(attendu, r.isValide(), national);
            if (attendu) {
                assertEquals(national, r.getLocal());
                assertEquals("33" + utile, r.getInternational());
                assertTrue(TelephoneCi.controler(r.getLocal(), "33").isValide());
            }
        }
        /* les prefixes ivoiriens n'y ont plus de sens : 06 et 04 sont valides en France */
        assertTrue(TelephoneCi.controler("06 12 34 56 78", "33").isValide());
        assertEquals("33612345678", TelephoneCi.controler("06 12 34 56 78", "33").getInternational());
        assertEquals("+33612345678", TelephoneCi.controler("+33 6 12 34 56 78", "33").getLocal());
        /* un numero ivoirien y est un numero etranger, avec son indicatif */
        assertEquals("+2250708473750", TelephoneCi.controler("+225 07 08 47 37 50", "33").getLocal());
    }

    @Test
    void cas() {
        assertEquals("+32470123456", TelephoneCi.controler("+32 470 12 34 56").getLocal());
        assertEquals("32470123456", TelephoneCi.controler("0032 470 12 34 56").getInternational());
        assertEquals("+33612345678", TelephoneCi.controler("0033 6 12 34 56 78").getLocal());
        assertEquals("0708473750", TelephoneCi.controler("+225 07 08 47 37 50").getLocal());
        assertEquals("Préfixe non mobile (04)", TelephoneCi.controler("04 70 12 34 56").getMotif());
        /* « + » devant un numero local : numero du pays, comme avant */
        assertEquals("0708473750", TelephoneCi.controler("+07 08 47 37 50").getLocal());
        assertEquals("Préfixe non mobile (04)", TelephoneCi.controler("+0 470 12 34 56").getMotif());
        assertTrue(TelephoneCi.aide().contains("01, 05 ou 07") && TelephoneCi.aide().contains("+33"));
        assertEquals("225", TelephoneCi.lireIndicatif("abc"));
        assertEquals("225", TelephoneCi.lireIndicatif(null));
        assertEquals("33", TelephoneCi.lireIndicatif("+33"));
        assertEquals("32", TelephoneCi.lireIndicatif("0032"));
        assertEquals("225", TelephoneCi.lireIndicatif("2250"));
        TelephoneCi.indicatifPays("+33");
        assertFalse(TelephoneCi.paysCoteDIvoire());
        assertTrue(TelephoneCi.controler("06 12 34 56 78").isValide());
        assertFalse(TelephoneCi.aide().contains("01, 05 ou 07"));
        TelephoneCi.indicatifPays("n'importe quoi");
        assertTrue(TelephoneCi.paysCoteDIvoire());
    }

    /** L'ecran rend le meme resultat que le serveur, pour trois pays d'officine. */
    @Test
    void ecranEtServeurDisentLaMemeChose() throws Exception {
        ScriptEngine js = new ScriptEngineManager().getEngineByName("nashorn");
        org.junit.jupiter.api.Assumptions.assumeTrue(js != null, "moteur JavaScript absent");
        js.eval("var module = {exports: {}};");
        js.eval(new String(Files.readAllBytes(Paths.get("src/main/webapp/general/app/view/commun/TelephoneSaisie.js")),
                StandardCharsets.UTF_8));
        js.eval("function lire(s, p) { var r = module.exports.controler(s, p); return r.valide ? 'OK|' + r.local + '|' + r.international : 'REFUS|' + r.motif; }");
        js.eval("function indicatif(v) { return module.exports.lireIndicatif(v); }");
        js.eval("function aide(p) { return module.exports.aide(p); }");
        Invocable f = (Invocable) js;
        int valides = 0;
        for (String pays : new String[] { "225", "33", "1" }) {
            assertEquals(TelephoneCi.aide(pays), f.invokeFunction("aide", pays));
            for (int i = 0; i < 8000; i++) {
                String s = saisie();
                TelephoneCi.Resultat r = TelephoneCi.controler(s, pays);
                String attendu = r.isValide() ? "OK|" + r.getLocal() + "|" + r.getInternational()
                        : "REFUS|" + r.getMotif();
                valides += r.isValide() ? 1 : 0;
                assertEquals(attendu, String.valueOf(f.invokeFunction("lire", s, pays)), s + " / pays " + pays);
            }
        }
        for (String v : new String[] { "225", "+33", "0032", "abc", "", "2250", "1" }) {
            assertEquals(TelephoneCi.lireIndicatif(v), f.invokeFunction("indicatif", v), v);
        }
        assertTrue(valides > 6000, "valides : " + valides);
    }
}
