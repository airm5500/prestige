package util.vente;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import util.vente.EtatsSaisieVente.Contexte;
import util.vente.EtatsSaisieVente.Decision;
import util.vente.EtatsSaisieVente.Droit;
import util.vente.EtatsSaisieVente.Etat;
import util.vente.EtatsSaisieVente.Geste;

/**
 * Cahier des charges du 24/11, point 2 : machine d'états d'une vente en saisie (vente et vente en dépôt).
 * <p>
 * Constat : la vente était enregistrée dès le premier produit avec le même statut qu'une vente mise en attente ; la
 * liste « Ventes en attente » montrait les ventes en cours de saisie sur les autres postes, et « Retour » laissait la
 * vente dans la liste. Règles : « en cours de saisie », « en attente », « interrompue », « abandonnée » et « clôturée »
 * sont distincts ; une vente en cours n'est jamais rappelable ; chaque geste a son droit ; toute transition passe par
 * une seule décision.
 * <p>
 * Toutes les combinaisons sont parcourues (5 états, 8 gestes, 16 combinaisons des 4 droits, auteur ou non, même jour ou
 * non, vente tenue ou non, geste du système ou d'un utilisateur), puis 1 000 ventes de suite tirées au hasard.
 */
class EtatsSaisieVenteCoherenceTest {

    private static Set<Droit> droits(int masque) {
        EnumSet<Droit> s = EnumSet.noneOf(Droit.class);
        for (Droit d : Droit.values()) {
            if ((masque & (1 << d.ordinal())) != 0) {
                s.add(d);
            }
        }
        return s;
    }

    private static String decrire(Etat e, Geste g, Contexte c) {
        return e + " + " + g + " droits=" + c.droits + " auteur=" + c.auteur + " memeJour=" + c.memeJour + " tenue="
                + c.tenueParCePoste + " systeme=" + c.systeme;
    }

    @Test
    void toutesLesCombinaisons() {
        assertEquals(4, Droit.values().length);
        Map<Etat, Integer> atteints = new EnumMap<>(Etat.class);
        int cas = 0;
        for (Etat e : Etat.values()) {
            for (Geste g : Geste.values()) {
                for (int m = 0; m < 16; m++) {
                    for (int bits = 0; bits < 16; bits++) {
                        Contexte c = new Contexte(droits(m), (bits & 1) != 0, (bits & 2) != 0, (bits & 4) != 0,
                                (bits & 8) != 0);
                        Decision d = EtatsSaisieVente.decider(e, g, c);
                        String k = decrire(e, g, c) + " -> " + d.etat + " " + d.motif;
                        cas++;
                        assertNotNull(d.etat, k);
                        if (!d.admis) {
                            // un refus ne change rien et dit pourquoi
                            assertEquals(e, d.etat, k);
                            assertTrue(d.motif != null && d.motif.length() > 10, k);
                            continue;
                        }
                        atteints.merge(d.etat, 1, Integer::sum);
                        assertEquals(EtatsSaisieVente.CIBLE.get(g), d.etat, k);
                        // états finals : on n'en sort jamais
                        assertFalse(e == Etat.ABANDONNEE || e == Etat.CLOTUREE, k);
                        // gestes du système et gestes des utilisateurs ne se mélangent pas
                        assertEquals(g.systeme, c.systeme, k);
                        switch (g) {
                        case METTRE_EN_ATTENTE:
                            assertEquals(Etat.EN_COURS, e, k);
                            assertTrue(c.droits.contains(Droit.METTRE_EN_ATTENTE) && c.tenueParCePoste, k);
                            break;
                        case REPRENDRE_ATTENTE:
                            assertEquals(Etat.EN_ATTENTE, e, k);
                            assertTrue(c.droits.contains(Droit.REPRENDRE_ATTENTE) && c.memeJour, k);
                            break;
                        case RETOUR_SUPPRIMER:
                        case CLOTURER:
                            assertEquals(Etat.EN_COURS, e, k);
                            assertTrue(c.tenueParCePoste, k);
                            break;
                        case INTERROMPRE:
                            assertEquals(Etat.EN_COURS, e, k);
                            break;
                        case SIGNAL_RETROUVE:
                            assertEquals(Etat.INTERROMPUE, e, k);
                            assertTrue(c.tenueParCePoste && c.memeJour, k);
                            break;
                        case REPRENDRE_INTERROMPUE:
                            assertEquals(Etat.INTERROMPUE, e, k);
                            assertTrue(c.memeJour, k);
                            assertTrue(c.auteur || c.droits.contains(Droit.REPRENDRE_INTERROMPUE_AUTRUI), k);
                            break;
                        case EXPIRER:
                            assertFalse(c.memeJour, k);
                            assertTrue(e == Etat.EN_COURS || e == Etat.EN_ATTENTE || e == Etat.INTERROMPUE, k);
                            break;
                        default:
                            throw new AssertionError(k);
                        }
                    }
                }
            }
        }
        assertEquals(5 * Geste.values().length * 16 * 16, cas);
        // chaque état d'arrivée est atteint par au moins un geste admis
        for (Etat e : EnumSet.of(Etat.EN_COURS, Etat.EN_ATTENTE, Etat.INTERROMPUE, Etat.ABANDONNEE, Etat.CLOTUREE)) {
            assertTrue(atteints.getOrDefault(e, 0) > 0, "jamais atteint : " + e);
        }
    }

    @Test
    void uneVenteEnCoursNEstJamaisRappelable() {
        for (int m = 0; m < 16; m++) {
            for (int bits = 0; bits < 16; bits++) {
                Contexte c = new Contexte(droits(m), (bits & 1) != 0, (bits & 2) != 0, (bits & 4) != 0,
                        (bits & 8) != 0);
                for (Geste g : EnumSet.of(Geste.REPRENDRE_ATTENTE, Geste.REPRENDRE_INTERROMPUE,
                        Geste.SIGNAL_RETROUVE)) {
                    assertFalse(EtatsSaisieVente.decider(Etat.EN_COURS, g, c).admis, decrire(Etat.EN_COURS, g, c));
                }
            }
        }
        assertFalse(EtatsSaisieVente.rappelable(Etat.EN_COURS));
        assertTrue(EtatsSaisieVente.rappelable(Etat.EN_ATTENTE));
        assertFalse(EtatsSaisieVente.rappelable(Etat.INTERROMPUE));
        assertFalse(EtatsSaisieVente.rappelable(Etat.ABANDONNEE));
        assertFalse(EtatsSaisieVente.rappelable(Etat.CLOTUREE));
    }

    @Test
    void chaqueDroitEstNecessaire() {
        Contexte tout = new Contexte(EnumSet.allOf(Droit.class), false, true, true, false);
        assertTrue(EtatsSaisieVente.decider(Etat.EN_COURS, Geste.METTRE_EN_ATTENTE, tout).admis);
        assertTrue(EtatsSaisieVente.decider(Etat.EN_ATTENTE, Geste.REPRENDRE_ATTENTE, tout).admis);
        assertTrue(EtatsSaisieVente.decider(Etat.INTERROMPUE, Geste.REPRENDRE_INTERROMPUE, tout).admis);
        Object[][] cas = { { Droit.METTRE_EN_ATTENTE, Etat.EN_COURS, Geste.METTRE_EN_ATTENTE },
                { Droit.REPRENDRE_ATTENTE, Etat.EN_ATTENTE, Geste.REPRENDRE_ATTENTE },
                { Droit.REPRENDRE_INTERROMPUE_AUTRUI, Etat.INTERROMPUE, Geste.REPRENDRE_INTERROMPUE } };
        for (Object[] x : cas) {
            EnumSet<Droit> sans = EnumSet.allOf(Droit.class);
            sans.remove(x[0]);
            Decision d = EtatsSaisieVente.decider((Etat) x[1], (Geste) x[2],
                    new Contexte(sans, false, true, true, false));
            assertFalse(d.admis, String.valueOf(x[0]));
            assertTrue(d.motif.contains("Droit manquant"), d.motif);
        }
        // l'auteur reprend sa propre saisie interrompue sans droit particulier
        assertTrue(EtatsSaisieVente.decider(Etat.INTERROMPUE, Geste.REPRENDRE_INTERROMPUE,
                new Contexte(EnumSet.noneOf(Droit.class), true, true, false, false)).admis);
    }

    @Test
    void leLendemainUneSaisieInterrompueEstAbandonnee() {
        Contexte hier = new Contexte(EnumSet.allOf(Droit.class), true, false, true, false);
        Decision d = EtatsSaisieVente.decider(Etat.INTERROMPUE, Geste.REPRENDRE_INTERROMPUE, hier);
        assertFalse(d.admis);
        assertTrue(d.motif.contains("jour même"), d.motif);
        Decision e = EtatsSaisieVente.decider(Etat.INTERROMPUE, Geste.EXPIRER,
                new Contexte(EnumSet.noneOf(Droit.class), false, false, false, true));
        assertTrue(e.admis);
        assertEquals(Etat.ABANDONNEE, e.etat);
    }

    @Test
    void lesNomsEnBaseSontStables() {
        // valeurs écrites dans t_preenregistrement.etat_saisie et dans le journal de preuve
        assertEquals("EN_COURS,EN_ATTENTE,INTERROMPUE,ABANDONNEE,CLOTUREE",
                String.join(",", java.util.Arrays.stream(Etat.values()).map(Enum::name).toArray(String[]::new)));
        for (Etat e : Etat.values()) {
            assertEquals(e, EtatsSaisieVente.lire(e.name()));
            assertTrue(e.libelle.length() > 5);
        }
        assertEquals(null, EtatsSaisieVente.lire(null));
        assertEquals(null, EtatsSaisieVente.lire("is_Process"));
    }

    /** 1 000 ventes de suite, gestes tirés au hasard : toujours un seul état, jamais de sortie d'un état final. */
    @Test
    void milleVentesDeSuite() {
        Random r = new Random(20261124L);
        Geste[] gestes = Geste.values();
        int cloturees = 0, abandonnees = 0, attentes = 0;
        for (int v = 0; v < 1000; v++) {
            Etat e = Etat.EN_COURS;
            boolean vueEnAttente = false;
            for (int pas = 0; pas < 40 && e != Etat.CLOTUREE && e != Etat.ABANDONNEE; pas++) {
                Geste g = gestes[r.nextInt(gestes.length)];
                Contexte c = new Contexte(droits(r.nextInt(16)), r.nextBoolean(), r.nextInt(10) != 0, r.nextBoolean(),
                        g.systeme);
                Decision d = EtatsSaisieVente.decider(e, g, c);
                if (d.admis) {
                    // une vente quitte « en attente » seulement par une reprise ou l'expiration
                    if (e == Etat.EN_ATTENTE) {
                        assertTrue(g == Geste.REPRENDRE_ATTENTE || g == Geste.EXPIRER, g.name());
                    }
                    e = d.etat;
                    vueEnAttente |= e == Etat.EN_ATTENTE;
                }
            }
            cloturees += e == Etat.CLOTUREE ? 1 : 0;
            abandonnees += e == Etat.ABANDONNEE ? 1 : 0;
            attentes += vueEnAttente ? 1 : 0;
        }
        assertTrue(cloturees > 100 && abandonnees > 100 && attentes > 100,
                cloturees + "/" + abandonnees + "/" + attentes);
    }
}
