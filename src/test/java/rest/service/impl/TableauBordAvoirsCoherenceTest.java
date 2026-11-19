package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicInteger;

import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.Tuple;
import javax.persistence.TupleElement;

import org.junit.jupiter.api.Test;

import commonTasks.dto.TableauBaordPhDTO;
import commonTasks.dto.TableauBaordSummary;
import rest.service.dto.BalanceParamsDTO;
import util.Constant;

/**
 * Retour support du 18/11 (R8) : le tableau de bord sur onze mois prenait 28,9 s a appaul (14 a 36 s sur la copie). La
 * requete des ventes en prend 5,5 ; le reste venait des achats : pour CHAQUE ligne d'achat (un grossiste, un jour), une
 * requete des avoirs fournisseurs de ce jour-la (1 473 requetes pour onze mois).
 *
 * <p>
 * Les avoirs sont maintenant lus en une seule requete pour la periode, groupes par jour et par groupe de grossistes.
 * Retour du 19/11 (« double avoir ») : l'avoir du jour d'un groupe etait repris sur CHAQUE ligne d'achat du groupe ce
 * jour-la (deux grossistes LABOREX-CI livres le meme jour : avoir double), perdu un jour sans achat du groupe, et deux
 * groupes sans libelle se remplacaient sous « AUTRES ». Regle verifiee : chaque avoir compte une fois ; achat net =
 * achats - avoirs ; sur des milliers de jeux tires au hasard, graine fixe, jour par jour et mois par mois.
 *
 * <p>
 * La base est simulee par un EntityManager factice qui execute les requetes sur des donnees en memoire, avec les memes
 * filtres et groupements que le SQL ; il compte les requetes des avoirs.
 */
public class TableauBordAvoirsCoherenceTest {

    private static final String[] LIBELLES = { Constant.LABOREXCI, Constant.DPCI, Constant.COPHARMED, Constant.TEDIS,
            "UBIPHARM", null };

    /** Un retour fournisseur (t_retour_fournisseur, avec le groupe de son grossiste). */
    static final class Retour {
        LocalDate jour;
        Integer groupeId; // null : grossiste sans groupe
        String libelle; // null : groupe sans libelle, ou sans groupe
        double montant;
        boolean repondu;
        boolean actif;
    }

    /** Une ligne d'achat de TABLEAU_BOARD_SQL_ACHATS (un grossiste, un jour). */
    static final class Achat {
        LocalDate jour;
        String libelle;
        int montant;
    }

    /** Tuple JPA en memoire. */
    static final class Ligne implements Tuple {
        private final Map<String, Object> v = new LinkedHashMap<>();

        Ligne avec(String k, Object o) {
            v.put(k, o);
            return this;
        }

        @Override
        public <X> X get(TupleElement<X> e) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <X> X get(String alias, Class<X> type) {
            return type.cast(v.get(alias));
        }

        @Override
        public Object get(String alias) {
            return v.get(alias);
        }

        @Override
        public <X> X get(int i, Class<X> type) {
            return type.cast(new ArrayList<>(v.values()).get(i));
        }

        @Override
        public Object get(int i) {
            return new ArrayList<>(v.values()).get(i);
        }

        @Override
        public Object[] toArray() {
            return v.values().toArray();
        }

        @Override
        public List<TupleElement<?>> getElements() {
            return Collections.emptyList();
        }
    }

    /** Base simulee : repond aux requetes du tableau de bord et compte celles des avoirs. */
    static final class Base {
        final List<Achat> achats = new ArrayList<>();
        final List<Retour> retours = new ArrayList<>();
        final AtomicInteger requetesAvoirs = new AtomicInteger();

        EntityManager em() {
            return (EntityManager) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[] { EntityManager.class }, (proxy, m, args) -> {
                        switch (m.getName()) {
                        case "createNativeQuery":
                            return requete((String) args[0]);
                        case "find":
                            return null;
                        default:
                            throw new UnsupportedOperationException(m.getName());
                        }
                    });
        }

        private Query requete(String sql) {
            Map<Integer, Object> p = new HashMap<>();
            return (Query) Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { Query.class },
                    (proxy, m, args) -> {
                        switch (m.getName()) {
                        case "setParameter":
                            p.put((Integer) args[0], args[1]);
                            return proxy;
                        case "getSingleResult":
                            return BigDecimal.ZERO; // t_emplacement : l'officine n'est pas un depot
                        case "getResultList":
                            return executer(sql, p);
                        default:
                            throw new UnsupportedOperationException(m.getName());
                        }
                    });
        }

        private static LocalDate jour(Object o) {
            return ((java.sql.Date) o).toLocalDate();
        }

        private List<?> executer(String sql, Map<Integer, Object> p) {
            if (sql.contains("t_retour_fournisseur")) {
                requetesAvoirs.incrementAndGet();
                return avoirs(sql, jour(p.get(1)), jour(p.get(2)));
            }
            if (sql.contains("t_grossiste") && sql.contains("typeTransaction` =2")) {
                LocalDate d = jour(p.get(1));
                LocalDate f = jour(p.get(2));
                List<Tuple> l = new ArrayList<>();
                for (Achat a : achats) {
                    if (!a.jour.isBefore(d) && !a.jour.isAfter(f)) {
                        l.add(new Ligne().avec("mvtDate", java.sql.Date.valueOf(a.jour))
                                .avec("montant", BigDecimal.valueOf(a.montant)).avec("libelle", a.libelle));
                    }
                }
                return l;
            }
            return new ArrayList<>(); // ventes : aucune ici, seuls les achats sont en cause
        }

        /**
         * Meme regle que le SQL : periode [debut, fin + 1 jour), avoirs repondus et actifs, groupes par groupe de
         * grossistes (et par jour si la requete le demande), somme > 0, tries par jour puis groupe (NULL en tete).
         */
        private List<Tuple> avoirs(String sql, LocalDate d, LocalDate f) {
            boolean parJour = sql.contains(" AS jour");
            Comparator<Integer> groupe = Comparator.nullsFirst(Comparator.naturalOrder());
            Map<LocalDate, Map<Integer, double[]>> sommes = new TreeMap<>();
            Map<Integer, String> libelles = new HashMap<>();
            for (Retour r : retours) {
                if (r.jour.isBefore(d) || r.jour.isAfter(f) || !r.repondu || !r.actif) {
                    continue;
                }
                LocalDate cle = parJour ? r.jour : d;
                sommes.computeIfAbsent(cle, k -> new TreeMap<>(groupe)).computeIfAbsent(r.groupeId,
                        k -> new double[1])[0] += r.montant;
                libelles.put(r.groupeId, r.libelle);
            }
            List<Tuple> l = new ArrayList<>();
            sommes.forEach((j, parGroupe) -> parGroupe.forEach((g, s) -> {
                if (s[0] > 0) {
                    Ligne t = new Ligne();
                    if (parJour) {
                        t.avec("jour", java.sql.Date.valueOf(j));
                    }
                    l.add(t.avec("montant", s[0]).avec("libelle", libelles.get(g)));
                }
            }));
            return l;
        }
    }

    /**
     * Regle, ecrite a part : avoirs du jour, repondus et actifs, sommes par groupe (somme > 0, tronquee comme le
     * service), chaque groupe compte une fois, quel que soit le nombre de lignes d'achat ce jour-la.
     */
    private static long avoirsDuJour(Base b, LocalDate jour) {
        Map<Integer, double[]> sommes = new HashMap<>();
        for (Retour r : b.retours) {
            if (r.jour.equals(jour) && r.repondu && r.actif) {
                sommes.computeIfAbsent(r.groupeId, k -> new double[1])[0] += r.montant;
            }
        }
        long total = 0;
        for (double[] x : sommes.values()) {
            total += x[0] > 0 ? (long) x[0] : 0;
        }
        return total;
    }

    /** Avoir du jour pour un libelle de ligne (groupes sans libelle reunis sous « AUTRES », additionnes). */
    private static long avoirAttendu(Base b, LocalDate jour, String libelleLigne) {
        Comparator<Integer> groupe = Comparator.nullsFirst(Comparator.naturalOrder());
        Map<Integer, double[]> sommes = new TreeMap<>(groupe);
        Map<Integer, String> libelles = new HashMap<>();
        for (Retour r : b.retours) {
            if (r.jour.equals(jour) && r.repondu && r.actif) {
                sommes.computeIfAbsent(r.groupeId, k -> new double[1])[0] += r.montant;
                libelles.put(r.groupeId, r.libelle);
            }
        }
        Map<String, Long> parLibelle = new HashMap<>();
        sommes.forEach((g, s) -> {
            if (s[0] > 0) {
                String l = libelles.get(g);
                parLibelle.merge(l != null && !l.isEmpty() ? l : Constant.AUTRES, (long) s[0], Long::sum);
            }
        });
        Long a = parLibelle.get(libelleLigne != null ? libelleLigne : Constant.AUTRES);
        return a == null ? 0 : a;
    }

    private static Base tirer(Random rnd, LocalDate debut, int jours) {
        Base b = new Base();
        int nAchats = rnd.nextInt(60);
        for (int i = 0; i < nAchats; i++) {
            Achat a = new Achat();
            a.jour = debut.plusDays(rnd.nextInt(jours));
            a.libelle = LIBELLES[rnd.nextInt(LIBELLES.length)];
            a.montant = rnd.nextInt(10) == 0 ? 0 : rnd.nextInt(2_000_000);
            b.achats.add(a);
        }
        int nRetours = rnd.nextInt(40);
        for (int i = 0; i < nRetours; i++) {
            Retour r = new Retour();
            // parfois hors periode, avant comme apres
            r.jour = debut.plusDays(rnd.nextInt(jours + 6) - 3);
            int g = rnd.nextInt(LIBELLES.length + 1);
            r.groupeId = g == LIBELLES.length ? null : g;
            r.libelle = r.groupeId == null ? null : LIBELLES[g];
            r.montant = rnd.nextInt(8) == 0 ? -rnd.nextInt(5000) : rnd.nextInt(300_000) + (rnd.nextBoolean() ? 0.5 : 0);
            r.repondu = rnd.nextInt(6) != 0;
            r.actif = rnd.nextInt(8) != 0;
            b.retours.add(r);
        }
        return b;
    }

    private static List<TableauBaordPhDTO> tableau(Base b, LocalDate debut, LocalDate fin, boolean parMois)
            throws Exception {
        BalanceServiceImpl s = new BalanceServiceImpl();
        Field f = BalanceServiceImpl.class.getDeclaredField("em");
        f.setAccessible(true);
        f.set(s, b.em());
        Map<TableauBaordSummary, List<TableauBaordPhDTO>> m = s.getTableauBoardData(BalanceParamsDTO.builder()
                .dtStart(debut.toString()).dtEnd(fin.toString()).byMonth(parMois).emplacementId("1").build());
        return m.isEmpty() ? new ArrayList<>() : m.values().iterator().next();
    }

    /** Onze mois d'achats : une seule requete des avoirs, quel que soit le nombre de lignes d'achat. */
    @Test
    public void lesAvoirsSontLusEnUneSeuleRequetePourLaPeriode() throws Exception {
        Random rnd = new Random(20261119L);
        LocalDate debut = LocalDate.of(2025, 1, 1);
        Base b = new Base();
        for (int i = 0; i < 1473; i++) {
            Achat a = new Achat();
            a.jour = debut.plusDays(rnd.nextInt(334));
            a.libelle = LIBELLES[rnd.nextInt(LIBELLES.length)];
            a.montant = rnd.nextInt(2_000_000);
            b.achats.add(a);
        }
        tableau(b, debut, LocalDate.of(2025, 11, 30), true);
        assertTrue(b.requetesAvoirs.get() <= 1,
                "requetes des avoirs pour 1 473 lignes d'achat : " + b.requetesAvoirs.get() + " (attendu : 1)");
    }

    /**
     * Rapprochement avec la base, jour par jour et mois par mois, sur 3 000 jeux tires au hasard : avoirs de la periode
     * = avoirs en base (chacun une fois, y compris les jours sans achat) ; achat net = achats - avoirs ; jamais
     * negatif.
     */
    @Test
    public void chaqueAvoirCompteUneFoisJourParJourEtMoisParMois() throws Exception {
        Random rnd = new Random(20261119L);
        int cas = 0;
        int avecAvoir = 0;
        for (int i = 0; i < 3000; i++) {
            LocalDate debut = LocalDate.of(2025, 1 + rnd.nextInt(12), 1 + rnd.nextInt(28));
            int jours = 1 + rnd.nextInt(rnd.nextBoolean() ? 10 : 120);
            LocalDate fin = debut.plusDays(jours - 1);
            Base b = tirer(rnd, debut, jours);

            /* attendu, jour par jour puis mois par mois */
            Map<LocalDate, long[]> parJour = new TreeMap<>();
            Map<YearMonth, long[]> parMois = new TreeMap<>();
            java.util.Set<LocalDate> periodes = new java.util.TreeSet<>();
            b.achats.forEach(a -> periodes.add(a.jour));
            for (LocalDate d = debut; !d.isAfter(fin); d = d.plusDays(1)) {
                if (avoirsDuJour(b, d) > 0) {
                    periodes.add(d);
                }
            }
            for (LocalDate d : periodes) {
                long av = avoirsDuJour(b, d);
                long achats = b.achats.stream().filter(a -> a.jour.equals(d)).mapToLong(a -> a.montant).sum();
                avecAvoir += av > 0 ? 1 : 0;
                long[] j = parJour.computeIfAbsent(d, k -> new long[2]);
                j[0] += av;
                j[1] += achats - av;
                long[] mo = parMois.computeIfAbsent(YearMonth.from(d), k -> new long[2]);
                mo[0] += av;
                mo[1] += achats - av;
            }

            for (boolean mensuel : new boolean[] { false, true }) {
                List<TableauBaordPhDTO> l = tableau(b, debut, fin, mensuel);
                Map<?, long[]> attendu = mensuel ? parMois : parJour;
                assertEquals(attendu.size(), l.size(), "cas " + i + " : nombre de periodes");
                for (TableauBaordPhDTO o : l) {
                    Object cle = mensuel ? YearMonth.from(o.getMvtDate()) : o.getMvtDate();
                    long[] e = attendu.get(cle);
                    assertTrue(e != null, "cas " + i + " : periode inattendue " + cle);
                    assertEquals(e[0], (long) o.getMontantAvoir(), "cas " + i + " " + cle + " : avoir");
                    assertEquals(e[1], (long) o.getMontantAchat(), "cas " + i + " " + cle + " : achat net");
                    assertTrue(o.getMontantAvoir() >= 0, "avoir jamais negatif");
                }
                cas++;
            }
        }
        assertTrue(avecAvoir > 1000, "jeu varie : des jours avec avoir (" + avecAvoir + ")");
        assertEquals(6000, cas);
    }

    /**
     * Le « double avoir » : deux grossistes du meme groupe livres le meme jour (a appaul, LABOREX-CI 520 jours sur 647)
     * donnent deux lignes d'achat ; l'avoir du groupe ne doit compter qu'une fois.
     */
    @Test
    public void deuxLivraisonsDuMemeGroupeLeMemeJourUnSeulAvoir() throws Exception {
        LocalDate j = LocalDate.of(2025, 3, 10);
        Base b = new Base();
        for (int m : new int[] { 400_000, 250_000, 90_000 }) {
            Achat a = new Achat();
            a.jour = j;
            a.libelle = Constant.LABOREXCI;
            a.montant = m;
            b.achats.add(a);
        }
        Retour r = new Retour();
        r.jour = j;
        r.groupeId = 0;
        r.libelle = Constant.LABOREXCI;
        r.montant = 30_000;
        r.repondu = true;
        r.actif = true;
        b.retours.add(r);
        for (boolean mensuel : new boolean[] { false, true }) {
            List<TableauBaordPhDTO> l = tableau(b, j, j, mensuel);
            assertEquals(1, l.size());
            assertEquals(30_000L, (long) l.get(0).getMontantAvoir(), "un avoir de 30 000, compte une seule fois");
            assertEquals(740_000L - 30_000L, (long) l.get(0).getMontantAchat(), "achat net = achats - avoir");
        }
    }

    /** Un avoir un jour sans achat de son groupe compte quand meme, ce jour-la. */
    @Test
    public void unAvoirUnJourSansAchatCompte() throws Exception {
        LocalDate j = LocalDate.of(2025, 3, 10);
        Base b = new Base();
        Achat a = new Achat();
        a.jour = j;
        a.libelle = Constant.DPCI;
        a.montant = 100_000;
        b.achats.add(a);
        for (Object[] x : new Object[][] { { j, 0, Constant.LABOREXCI, 8000.0 },
                { j.plusDays(2), 1, Constant.DPCI, 500.0 } }) {
            Retour r = new Retour();
            r.jour = (LocalDate) x[0];
            r.groupeId = (Integer) x[1];
            r.libelle = (String) x[2];
            r.montant = (Double) x[3];
            r.repondu = true;
            r.actif = true;
            b.retours.add(r);
        }
        List<TableauBaordPhDTO> mois = tableau(b, j, j.plusDays(5), true);
        assertEquals(1, mois.size());
        assertEquals(8500L, (long) mois.get(0).getMontantAvoir());
        assertEquals(100_000L - 8500L, (long) mois.get(0).getMontantAchat());
        List<TableauBaordPhDTO> jours = tableau(b, j, j.plusDays(5), false);
        assertEquals(2, jours.size(), "le jour de l'avoir seul apparait");
        assertEquals(8000L, (long) jours.get(0).getMontantAvoir());
        assertEquals(500L, (long) jours.get(1).getMontantAvoir());
        assertEquals(-500L, (long) jours.get(1).getMontantAchat(), "jour sans achat : achat net = - avoir");
    }

    /**
     * Un groupe sans libelle et un grossiste sans groupe le meme jour : les deux tombent sur « AUTRES » et s'ajoutent
     * (avant : le dernier l'emportait, 7 000 perdus).
     */
    @Test
    public void groupeSansLibelleEtGrossisteSansGroupeLeMemeJourSAjoutent() throws Exception {
        LocalDate j = LocalDate.of(2025, 3, 10);
        Base b = new Base();
        Achat a = new Achat();
        a.jour = j;
        a.libelle = null;
        a.montant = 100_000;
        b.achats.add(a);
        Achat a2 = new Achat();
        a2.jour = j;
        a2.libelle = Constant.DPCI;
        a2.montant = 50_000;
        b.achats.add(a2);
        for (Object[] r : new Object[][] { { null, null, 7000.0 }, { 5, null, 3000.0 },
                { 1, Constant.DPCI, 1200.5 } }) {
            Retour x = new Retour();
            x.jour = j;
            x.groupeId = (Integer) r[0];
            x.libelle = (String) r[1];
            x.montant = (Double) r[2];
            x.repondu = true;
            x.actif = true;
            b.retours.add(x);
        }
        List<TableauBaordPhDTO> l = tableau(b, j, j, false);
        assertEquals(1, l.size());
        long attendu = avoirAttendu(b, j, null) + avoirAttendu(b, j, Constant.DPCI);
        assertEquals(7000 + 3000 + 1200, attendu, "groupe 5 sans libelle + grossiste sans groupe + DPCI");
        assertEquals(attendu, (long) l.get(0).getMontantAvoir());
        assertEquals(150_000 - attendu, (long) l.get(0).getMontantAchat());
        assertTrue(Objects.equals(j, l.get(0).getMvtDate()));
    }
}
