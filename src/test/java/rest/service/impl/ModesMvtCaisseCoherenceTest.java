package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 12/11, mouvement de caisse : coherence de la recherche du mode et du type de reglement. Des milliers de
 * referentiels tires au hasard (graine fixe), avec des identifiants qui se prolongent les uns les autres (1, 10, 11,
 * 19, 2, 20...) comme dans les bases des officines, et pour chaque saisie les regles qui doivent toujours tenir :
 * <ul>
 * <li>un identifiant saisi donne exactement cet element, jamais un autre qui commence pareil ;</li>
 * <li>un libelle saisi donne l'unique element qui le porte, sinon rien (ambigu ou inconnu) ;</li>
 * <li>une saisie vide ou inconnue ne donne rien ;</li>
 * <li>le type retenu pour la transaction est celui du mode ; un type contraire ou inconnu est refuse.</li>
 * </ul>
 * L'ancienne recherche (« LIKE saisie% », premiere ligne) echoue a la premiere regle des que « 10 » precede « 1 ».
 */
class ModesMvtCaisseCoherenceTest {

    private static final long GRAINE = 20261112L;
    private static final int TIRAGES = 5000;
    private static final String[] NOMS = { "Cash", "CH", "CP", "WAVE", "DJAMO", "ORANGE", "MOOV", "MTN", "Virement",
            "Carte Bancaire", "Devise", "Differe" };

    private static final class Mode {
        final String id;
        final String nom;
        final String type;

        Mode(String id, String nom, String type) {
            this.id = id;
            this.nom = nom;
            this.type = type;
        }
    }

    private static List<Mode> referentiel(Random r) {
        List<String> ids = new ArrayList<>();
        int n = 2 + r.nextInt(14);
        while (ids.size() < n) {
            int base = 1 + r.nextInt(9);
            String id = r.nextInt(3) == 0 ? base + "" + r.nextInt(10) : String.valueOf(base);
            if (!ids.contains(id)) {
                ids.add(id);
            }
        }
        Collections.shuffle(ids, r); // l'ordre de la base n'est jamais garanti
        List<Mode> modes = new ArrayList<>();
        for (String id : ids) {
            String nom = NOMS[r.nextInt(NOMS.length)];
            if (r.nextInt(4) == 0) {
                nom = nom.toLowerCase();
            }
            modes.add(new Mode(id, nom, String.valueOf(1 + r.nextInt(9))));
        }
        return modes;
    }

    private static Mode cherche(String saisie, List<Mode> modes) {
        return ModesMvtCaisse.retrouver(saisie, modes, m -> m.id, m -> m.nom);
    }

    @Test
    void unIdentifiantDonneExactementCetElement() {
        Random r = new Random(GRAINE);
        int verifies = 0;
        for (int i = 0; i < TIRAGES; i++) {
            List<Mode> modes = referentiel(r);
            for (Mode m : modes) {
                Mode trouve = cherche(m.id, modes);
                assertNotNull(trouve, "tirage " + i + " : " + m.id);
                assertEquals(m.id, trouve.id, "tirage " + i + " : saisie " + m.id);
                verifies++;
            }
        }
        assertTrue(verifies > TIRAGES * 2);
    }

    @Test
    void unLibelleDonneLUniqueElementQuiLePorte() {
        Random r = new Random(GRAINE + 1);
        for (int i = 0; i < TIRAGES; i++) {
            List<Mode> modes = referentiel(r);
            String nom = NOMS[r.nextInt(NOMS.length)];
            String saisie = r.nextBoolean() ? nom.toUpperCase() : " " + nom + " ";
            long porteurs = modes.stream().filter(m -> m.nom.equalsIgnoreCase(nom)).count();
            boolean nomEstUnId = modes.stream().anyMatch(m -> m.id.equals(saisie));
            Mode trouve = cherche(saisie, modes);
            if (nomEstUnId) {
                continue;
            }
            if (porteurs == 1) {
                assertNotNull(trouve, "tirage " + i);
                assertTrue(trouve.nom.equalsIgnoreCase(nom), "tirage " + i);
            } else {
                assertNull(trouve, "tirage " + i + " : " + porteurs + " porteurs de " + nom);
            }
        }
    }

    @Test
    void uneSaisieVideOuInconnueNeDonneRien() {
        Random r = new Random(GRAINE + 2);
        for (int i = 0; i < TIRAGES; i++) {
            List<Mode> modes = referentiel(r);
            for (String saisie : Arrays.asList(null, "", "  ", "999", "%", "1%", "_")) {
                assertNull(cherche(saisie, modes), "tirage " + i + " : saisie " + saisie);
            }
            /* un prefixe d'identifiant qui n'est pas lui-meme un identifiant ne donne rien */
            for (Mode m : modes) {
                if (m.id.length() == 2) {
                    String prefixe = m.id.substring(0, 1);
                    boolean existe = modes.stream().anyMatch(x -> x.id.equals(prefixe));
                    Mode trouve = cherche(prefixe, modes);
                    if (existe) {
                        assertEquals(prefixe, trouve.id, "tirage " + i);
                    } else {
                        assertTrue(trouve == null || !trouve.id.equals(m.id), "tirage " + i + " : " + prefixe);
                    }
                }
            }
        }
    }

    @Test
    void leTypeRetenuEstCeluiDuMode() {
        Random r = new Random(GRAINE + 3);
        for (int i = 0; i < TIRAGES; i++) {
            List<Mode> modes = referentiel(r);
            Mode m = modes.get(r.nextInt(modes.size()));
            String autre = String.valueOf(1 + r.nextInt(9));
            /* type absent : on prend celui du mode */
            assertNull(ModesMvtCaisse.incoherence(r.nextBoolean() ? null : " ", null, m.type));
            /* type identique : accepte */
            assertNull(ModesMvtCaisse.incoherence(m.type, m.type, m.type));
            /* type contraire : refuse */
            if (!autre.equals(m.type)) {
                assertNotNull(ModesMvtCaisse.incoherence(autre, autre, m.type), "tirage " + i);
            }
            /* type saisi mais introuvable : refuse */
            assertNotNull(ModesMvtCaisse.incoherence("X" + autre, null, m.type), "tirage " + i);
        }
    }

    @Test
    void lesTypesSontRangesEspecesDAbord() {
        Random r = new Random(GRAINE + 4);
        for (int i = 0; i < TIRAGES; i++) {
            List<String> ids = new ArrayList<>();
            for (Mode m : referentiel(r)) {
                ids.add(m.id);
            }
            ids.sort(ModesMvtCaisse::comparerIdentifiants);
            for (int k = 1; k < ids.size(); k++) {
                assertTrue(Long.parseLong(ids.get(k - 1)) < Long.parseLong(ids.get(k)), "tirage " + i + " : " + ids);
            }
        }
    }
}
