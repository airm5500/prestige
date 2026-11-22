package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

/**
 * Retour du 22/11 : calcul des previsions restreint aux produits d'une suggestion ou d'une commande. La clause « IN »
 * et ses parametres doivent correspondre un a un : autant de marques que de produits, numerotees a la suite des
 * parametres deja poses, et les produits passes dans le meme ordre, apres eux.
 */
class PrevisionProduitsRestreintsTest {

    @Test
    void clauseEtParametresCorrespondent() {
        Random r = new Random(22112026L);
        Pattern marque = Pattern.compile("\\?(\\d+)");
        for (int i = 0; i < 5000; i++) {
            int premier = 1 + r.nextInt(5), n = 1 + r.nextInt(400);
            Set<String> ids = new LinkedHashSet<>();
            while (ids.size() < n) {
                ids.add("F" + r.nextInt(1000000));
            }
            String clause = PrevisionCommandeServiceImpl.dans("d.lg_FAMILLE_ID", ids, premier);
            assertTrue(clause.startsWith(" AND d.lg_FAMILLE_ID IN (") && clause.endsWith(")"), clause);
            Matcher m = marque.matcher(clause);
            List<Integer> numeros = new ArrayList<>();
            while (m.find()) {
                numeros.add(Integer.parseInt(m.group(1)));
            }
            assertEquals(n, numeros.size(), "une marque par produit");
            for (int k = 0; k < n; k++) {
                assertEquals(premier + k, numeros.get(k).intValue(), "numerotees a la suite");
            }
            Object[] debut = new Object[premier - 1];
            for (int k = 0; k < debut.length; k++) {
                debut[k] = "p" + k;
            }
            Object[] params = avec(ids, debut);
            assertEquals(premier - 1 + n, params.length, "parametres = poses + produits");
            Object[] attendus = new Object[params.length];
            System.arraycopy(debut, 0, attendus, 0, debut.length);
            System.arraycopy(ids.toArray(), 0, attendus, debut.length, n);
            assertArrayEquals(attendus, params);
        }
        assertEquals("", PrevisionCommandeServiceImpl.dans("x", null, 1), "tous les produits : pas de clause");
    }

    private static Object[] avec(Set<String> ids, Object... debut) {
        try {
            java.lang.reflect.Method m = PrevisionCommandeServiceImpl.class.getDeclaredMethod("avec", Set.class,
                    Object[].class);
            m.setAccessible(true);
            return (Object[]) m.invoke(null, ids, debut);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
