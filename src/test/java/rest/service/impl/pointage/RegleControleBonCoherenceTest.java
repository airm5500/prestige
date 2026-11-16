package rest.service.impl.pointage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Random;

import org.junit.jupiter.api.Test;

import rest.service.impl.pointage.RegleControleBon.Controle;
import rest.service.impl.pointage.RegleControleBon.Niveau;

/**
 * Pointage des bons (15/11) : regles de controle verifiees par leurs proprietes sur des milliers de cas tires au hasard
 * (graine fixe), plus les exemples de la maquette.
 */
class RegleControleBonCoherenceTest {

    private static final long GRAINE = 151120261L;

    @Test
    void delaiEtDate() {
        Random r = new Random(GRAINE);
        for (int i = 0; i < 20000; i++) {
            Integer tp = r.nextInt(4) == 0 ? null : r.nextInt(5) == 0 ? -1 : r.nextInt(30);
            Integer gr = r.nextInt(3) == 0 ? null : r.nextInt(30);
            Integer d = RegleControleBon.delaiApplicable(tp, gr);
            Integer attendu = tp != null && tp >= 0 ? tp : gr;
            assertEquals(attendu, d, "delai organisme d'abord, puis groupe, sinon aucun");

            LocalDate saisie = LocalDate.of(2026, 11, 1).plusDays(r.nextInt(40));
            LocalDate ordo = r.nextInt(8) == 0 ? null : saisie.minusDays(r.nextInt(25) - 3);
            Controle c = RegleControleBon.date(ordo, saisie, d, "organisme");
            assertEquals(RegleControleBon.DATE, c.bloc);
            if (ordo == null) {
                assertEquals(Niveau.INFO, c.niveau);
                continue;
            }
            long jours = saisie.toEpochDay() - ordo.toEpochDay();
            boolean alerte = jours < 0 || (d != null && jours > d);
            assertEquals(alerte ? Niveau.ALERTE : Niveau.OK, c.niveau, c.texte);
            assertTrue(c.texte.contains(Math.abs(jours) + " j"), c.texte);
        }
        // parametre a 0 : le jour meme seulement
        assertEquals(Niveau.OK,
                RegleControleBon.date(LocalDate.of(2026, 11, 3), LocalDate.of(2026, 11, 3), 0, null).niveau);
        assertEquals(Niveau.ALERTE,
                RegleControleBon.date(LocalDate.of(2026, 11, 3), LocalDate.of(2026, 11, 4), 0, null).niveau);
        // maquette : bon du 28/10 saisi le 06/11, 9 j, maximum 7 j
        Controle m = RegleControleBon.date(LocalDate.of(2026, 10, 28), LocalDate.of(2026, 11, 6), 7, "organisme");
        assertEquals(Niveau.ALERTE, m.niveau);
        assertEquals("Délai 9 j : maximum 7 j, organisme", m.texte);
        // sans delai renseigne : jamais d'alerte de delai (choix du 15/11 : flexible par defaut)
        assertEquals(Niveau.OK,
                RegleControleBon.date(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 11, 6), null, null).niveau);
    }

    @Test
    void montant() {
        Random r = new Random(GRAINE + 1);
        for (int i = 0; i < 30000; i++) {
            long vente = r.nextInt(10) == 0 ? 0 : 1 + r.nextInt(200000);
            long base = r.nextInt(5) == 0 ? vente : (long) (vente * r.nextDouble());
            int taux = r.nextInt(6) == 0 ? 0 : r.nextInt(6) == 0 ? 100 : 1 + r.nextInt(99);
            long a = RegleControleBon.attendu(base, taux);
            // part = base x taux, arrondi au franc
            assertTrue(Math.abs(a * 100 - base * taux) <= 50, "arrondi au franc");
            assertTrue(a >= 0 && a <= base);
            long part;
            switch (r.nextInt(5)) {
            case 0:
                part = a;
                break;
            case 1:
                part = a - r.nextInt(500);
                break;
            case 2:
                part = vente + 1 + r.nextInt(100);
                break;
            case 3:
                part = -r.nextInt(3);
                break;
            default:
                part = a + r.nextInt(300);
            }
            long autres = r.nextInt(3) == 0 ? r.nextInt(100000) : 0;
            long somme = part + autres;
            Controle c = RegleControleBon.montant(base, taux, part, vente, somme);
            boolean impossible = part < 0 || (part == 0 && taux > 0) || part > vente || somme > vente;
            Niveau n = impossible ? Niveau.ALERTE : part == a ? Niveau.OK : Niveau.INFO;
            assertEquals(n, c.niveau, c.texte);
            assertEquals(RegleControleBon.MONTANT, c.bloc);
        }
        // maquette : 15 600 x 80 % = 12 480
        Controle m = RegleControleBon.montant(15600, 80, 12480, 15600, 12480);
        assertEquals(Niveau.OK, m.niveau);
        assertEquals("15600 × 80 % = 12480 = part enregistrée 12480", m.texte);
        assertEquals(Niveau.INFO, RegleControleBon.montant(15600, 80, 10000, 15600, 10000).niveau);
        assertEquals(1, RegleControleBon.attendu(1, 50), "demi franc : au superieur");
    }

    @Test
    void tauxAssureAyantDroitProduits() {
        Random r = new Random(GRAINE + 2);
        for (int i = 0; i < 10000; i++) {
            Integer b = r.nextInt(10) == 0 ? null : Integer.valueOf(r.nextInt(101));
            Integer k = r.nextInt(10) == 0 ? null : r.nextInt(3) == 0 ? b : Integer.valueOf(r.nextInt(101));
            Niveau n = RegleControleBon.taux(b, k).niveau;
            assertEquals(b == null ? Niveau.ALERTE : k == null ? Niveau.INFO : b.equals(k) ? Niveau.OK : Niveau.ALERTE,
                    n);

            String mat = r.nextInt(6) == 0 ? (r.nextBoolean() ? null : "  ") : "M" + r.nextInt(1000);
            int autres = r.nextInt(4) == 0 ? 1 + r.nextInt(3) : 0;
            Niveau na = RegleControleBon.assure(mat, autres).niveau;
            assertEquals(mat == null || mat.trim().isEmpty() || autres > 0 ? Niveau.ALERTE : Niveau.OK, na);

            boolean present = r.nextBoolean(), rattache = r.nextBoolean();
            assertEquals(present && !rattache ? Niveau.ALERTE : Niveau.OK,
                    RegleControleBon.ayantDroit(present, rattache).niveau);

            int lignes = r.nextInt(5), diff = lignes == 0 ? 0 : r.nextInt(lignes + 1);
            assertEquals(lignes == 0 ? Niveau.ALERTE : Niveau.INFO, RegleControleBon.produits(lignes, diff).niveau);
        }
        assertEquals("80 % ≠ contrat (70 %)", RegleControleBon.taux(80, 70).texte);
    }

    @Test
    void etatEtPire() {
        Random r = new Random(GRAINE + 3);
        LocalDateTime t0 = LocalDateTime.of(2026, 11, 10, 9, 0);
        String[] res = { null, "CONFORME", "ANOMALIE", "ABSENT" };
        for (int i = 0; i < 10000; i++) {
            String resultat = res[r.nextInt(4)];
            int prix = r.nextInt(50000);
            Integer prixPointe = r.nextInt(4) == 0 ? (Integer) (prix + 1 + r.nextInt(10))
                    : r.nextInt(10) == 0 ? null : (Integer) prix;
            LocalDateTime majP = t0.plusMinutes(r.nextInt(100));
            LocalDateTime majA = r.nextInt(4) == 0 ? majP.plusMinutes(1 + r.nextInt(60))
                    : majP.minusMinutes(r.nextInt(30));
            String e = RegleControleBon.etat(resultat, prixPointe, majP, prix, majA);
            boolean change = prixPointe == null || prixPointe != prix || majA.isAfter(majP);
            assertEquals(resultat == null || change ? "A_POINTER" : resultat, e);
        }
        Controle ok = new Controle(1, Niveau.OK, ""), info = new Controle(2, Niveau.INFO, ""),
                al = new Controle(3, Niveau.ALERTE, "");
        assertEquals(Niveau.OK, RegleControleBon.pire(ok, ok));
        assertEquals(Niveau.INFO, RegleControleBon.pire(ok, info, ok));
        assertEquals(Niveau.ALERTE, RegleControleBon.pire(info, al, ok));
    }
}
