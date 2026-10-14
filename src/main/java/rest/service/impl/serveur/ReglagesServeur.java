package rest.service.impl.serveur;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * STABILITE DU SERVEUR (besoins du 11/10, lot 4) : reglages conseilles pour la machine, calcules d'apres sa memoire et
 * son nombre de processeurs, et compares aux reglages en place (MariaDB : SHOW VARIABLES ; serveur Java : memoire
 * maximale). Regles pures, sans base (testees a part).
 * <p>
 * Budget memoire (MariaDB et Payara sur la meme machine Windows) : Windows et les autres programmes gardent environ 3
 * Go ; le serveur Java recoit 3 Go (12 Go de RAM) a 6 Go (32 Go) ; le tampon InnoDB prend environ 35 % de la RAM, sans
 * depasser ce qui reste. Les tampons par connexion et le journal InnoDB en memoire restent petits : un journal en
 * memoire de 2 Go immobilise 2 Go pour rien.
 */
public final class ReglagesServeur {

    public static final long MO = 1024L * 1024L, GO = 1024L * MO;

    public enum Niveau {
        OK, A_AJUSTER, CRITIQUE
    }

    /** Un reglage : valeur en place, valeur conseillee, niveau, explication et ligne a ecrire. */
    public static final class Reglage {
        public final String domaine, cle, libelle;
        public String actuel, conseille, explication, ligne;
        public Niveau niveau = Niveau.OK;

        Reglage(String domaine, String cle, String libelle) {
            this.domaine = domaine;
            this.cle = cle;
            this.libelle = libelle;
        }
    }

    private ReglagesServeur() {
    }

    /** Memoire maximale conseillee pour le serveur Java (Payara). */
    public static long heapConseille(long ram) {
        long g = ram / GO;
        if (g <= 8) {
            return 2 * GO;
        }
        if (g <= 16) {
            return 3 * GO;
        }
        if (g <= 24) {
            return 4 * GO;
        }
        return 6 * GO;
    }

    /** Tampon InnoDB conseille : ~35 % de la RAM, sans depasser RAM - Java - 4 Go, arrondi au 512 Mo, 1 Go minimum. */
    public static long bufferPoolConseille(long ram) {
        long a = (long) (ram * 0.35);
        long b = ram - heapConseille(ram) - 4 * GO;
        long v = Math.max(GO, Math.min(a, b));
        return v / (512 * MO) * (512 * MO);
    }

    /**
     * Connexions du pool d'UN Payara : chaque poste a le sien (un utilisateur a la caisse) ; celui du serveur sert
     * aussi les terminaux, les telephones et les taches planifiees.
     */
    public static int poolConseille(boolean serveur) {
        return serveur ? 50 : 32;
    }

    /** Connexions que MariaDB doit accepter : les pools de tous les postes, plus une marge pour les outils. */
    public static int connexionsMariadb(int postes) {
        return Math.max(151, (Math.max(1, postes) - 1) * poolConseille(false) + poolConseille(true) + 50);
    }

    /** « 3500M », « 2G », « 3670016000 », « 64M » -> octets ; -1 si illisible. */
    public static long octets(String v) {
        if (v == null) {
            return -1;
        }
        String s = v.trim().toUpperCase(Locale.ROOT);
        if (s.isEmpty()) {
            return -1;
        }
        long f = 1;
        char u = s.charAt(s.length() - 1);
        if (u == 'K' || u == 'M' || u == 'G') {
            f = u == 'K' ? 1024L : u == 'M' ? MO : GO;
            s = s.substring(0, s.length() - 1);
        }
        try {
            return (long) (Double.parseDouble(s) * f);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    /** Taille lisible : « 3,5 Go », « 64 Mo ». */
    public static String taille(long o) {
        if (o < 0) {
            return "?";
        }
        if (o >= GO) {
            double g = o / (double) GO;
            return (g == Math.rint(g) ? String.valueOf((long) g) : String.format(Locale.FRANCE, "%.1f", g)) + " Go";
        }
        return Math.round(o / (double) MO) + " Mo";
    }

    private static String mysql(long o) {
        return o % GO == 0 ? (o / GO) + "G" : (o / MO) + "M";
    }

    private static Reglage taille(List<Reglage> l, Map<String, String> v, String cle, String libelle, long conseille,
            long min, long max, String pourquoi) {
        Reglage r = new Reglage("MARIADB", cle, libelle);
        long a = octets(v.get(cle));
        r.actuel = taille(a);
        r.conseille = taille(conseille);
        r.ligne = cle + "=" + mysql(conseille);
        r.explication = pourquoi;
        if (a < 0) {
            r.niveau = Niveau.A_AJUSTER;
        } else if (a > max) {
            r.niveau = a > 2 * max ? Niveau.CRITIQUE : Niveau.A_AJUSTER;
        } else if (a < min) {
            r.niveau = Niveau.A_AJUSTER;
        }
        l.add(r);
        return r;
    }

    private static Reglage nombre(List<Reglage> l, Map<String, String> v, String cle, String libelle, long conseille,
            long min, long max, String pourquoi) {
        Reglage r = new Reglage("MARIADB", cle, libelle);
        long a = octets(v.get(cle));
        r.actuel = a < 0 ? "?" : String.valueOf(a);
        r.conseille = String.valueOf(conseille);
        r.ligne = cle + "=" + conseille;
        r.explication = pourquoi;
        r.niveau = a < 0 || a < min || a > max ? Niveau.A_AJUSTER : Niveau.OK;
        l.add(r);
        return r;
    }

    private static Reglage interrupteur(List<Reglage> l, Map<String, String> v, String cle, String libelle,
            boolean conseille, String pourquoi) {
        Reglage r = new Reglage("MARIADB", cle, libelle);
        String a = v.get(cle) == null ? "?" : v.get(cle).trim().toUpperCase(Locale.ROOT);
        boolean actif = "ON".equals(a) || "1".equals(a);
        r.actuel = "?".equals(a) ? "?" : actif ? "activé" : "désactivé";
        r.conseille = conseille ? "activé" : "désactivé";
        r.ligne = cle + "=" + (conseille ? 1 : 0);
        r.explication = pourquoi;
        r.niveau = actif == conseille ? Niveau.OK : Niveau.A_AJUSTER;
        l.add(r);
        return r;
    }

    /**
     * Reglages conseilles et comparaison.
     *
     * @param ram
     *            memoire physique de la machine (octets)
     * @param heapActuel
     *            memoire maximale du serveur Java en place (octets)
     * @param mariadb
     *            variables de MariaDB (SHOW GLOBAL VARIABLES), noms en minuscules
     * @param postes
     *            nombre de postes (caisses, terminaux) qui se connectent
     * @param poolActuel
     *            taille maximale du pool de connexions en place (-1 si inconnue)
     */
    public static List<Reglage> comparer(long ram, int processeurs, long heapActuel, Map<String, String> mariadb,
            int postes, int poolActuel) {
        return comparer(ram, processeurs, heapActuel, mariadb, postes, poolActuel, true, true);
    }

    /**
     * @param serveur
     *            poste serveur (sinon : poste de caisse, un seul utilisateur)
     * @param mariadbLocale
     *            MariaDB tourne sur cette machine (ses reglages et sa memoire n'ont de sens que la)
     */
    public static List<Reglage> comparer(long ram, int processeurs, long heapActuel, Map<String, String> mariadb,
            int postes, int poolActuel, boolean serveur, boolean mariadbLocale) {
        List<Reglage> l = new ArrayList<>();
        long heap = heapConseille(ram), bp = mariadbLocale ? bufferPoolConseille(ram) : 0;

        Reglage h = new Reglage("JAVA", "Xmx", "Mémoire maximale du serveur Java (Payara)");
        h.actuel = taille(heapActuel);
        h.conseille = taille(heap);
        h.ligne = "-Xms" + mysql(heap).toLowerCase(Locale.ROOT) + " -Xmx" + mysql(heap).toLowerCase(Locale.ROOT);
        h.explication = "Trop peu : lenteurs puis arrêt par manque de mémoire. Trop : MariaDB et Windows en manquent.";
        h.niveau = heapActuel < heap * 0.66 ? Niveau.CRITIQUE
                : heapActuel < heap * 0.9 || heapActuel > heap * 1.6 ? Niveau.A_AJUSTER : Niveau.OK;
        l.add(h);

        int pool = poolConseille(serveur);
        Reglage p = new Reglage("JAVA", "max-pool-size", "Connexions du serveur Java à la base (pool)");
        p.actuel = poolActuel < 0 ? "?" : String.valueOf(poolActuel);
        p.conseille = String.valueOf(pool);
        p.ligne = "asadmin set resources.jdbc-connection-pool.<pool>.max-pool-size=" + pool;
        p.explication = serveur
                ? "Le serveur sert aussi les terminaux, les téléphones et les tâches planifiées : trop peu de connexions les fait attendre."
                : "Une caisse n'a qu'un utilisateur : 32 connexions suffisent, même pendant une clôture ou un état lourd.";
        p.niveau = poolActuel < 0 ? Niveau.OK : poolActuel < pool * 0.6 ? Niveau.A_AJUSTER : Niveau.OK;
        l.add(p);

        if (!mariadbLocale) {
            return machine(l, ram, processeurs, heap, 0);
        }
        taille(l, mariadb, "innodb_buffer_pool_size", "Tampon InnoDB (données en mémoire)", bp, (long) (bp * 0.7),
                (long) (bp * 1.3),
                "Principal réglage de vitesse ; au-delà, Windows et le serveur Java manquent de mémoire.");
        taille(l, mariadb, "innodb_log_buffer_size", "Journal InnoDB en mémoire", 64 * MO, 16 * MO, 256 * MO,
                "64 Mo suffisent ; une grande valeur immobilise de la mémoire sans rien accélérer.");
        taille(l, mariadb, "max_allowed_packet", "Taille maximale d'une requête", 256 * MO, 64 * MO, 512 * MO,
                "Trop grand, une requête énorme peut saturer la mémoire ; trop petit, les images et les imports échouent. 256 Mo couvrent les deux.");
        taille(l, mariadb, "tmp_table_size", "Tables temporaires en mémoire", 128 * MO, 32 * MO, 256 * MO,
                "Réservé par requête qui trie ou regroupe : à garder modéré.");
        taille(l, mariadb, "max_heap_table_size", "Tables en mémoire (maximum)", 128 * MO, 32 * MO, 256 * MO,
                "Doit rester égal à tmp_table_size.");
        int connexions = connexionsMariadb(postes);
        nombre(l, mariadb, "max_connections", "Connexions simultanées à MariaDB", connexions, connexions - 30, 2000,
                "Chacun des " + postes
                        + " poste(s) a son propre pool de connexions : MariaDB doit les accepter tous, plus les outils (sauvegardes).");
        nombre(l, mariadb, "thread_cache_size", "Fils réutilisés par MariaDB", 64, 32, 256,
                "Évite de recréer un fil à chaque connexion des caisses et terminaux.");
        nombre(l, mariadb, "table_open_cache", "Tables ouvertes gardées en cache", 4000, 2000, 20000,
                "L'application ouvre de nombreuses tables : un cache trop petit ralentit tout.");
        nombre(l, mariadb, "innodb_io_capacity", "Capacité d'écriture du disque (SSD)", 2000, 1000, 20000,
                "Valeur pour un disque SSD ; la valeur par défaut (200) est prévue pour un disque à plateaux.");
        nombre(l, mariadb, "innodb_flush_log_at_trx_commit", "Écriture sûre à chaque validation", 1, 1, 1,
                "1 : aucune vente perdue en cas de coupure de courant. Ne pas baisser.");
        interrupteur(l, mariadb, "slow_query_log", "Journal des requêtes lentes", true,
                "Garde la trace des requêtes de plus de 2 s : indispensable pour expliquer une lenteur.");
        nombre(l, mariadb, "long_query_time", "Seuil d'une requête lente (secondes)", 2, 1, 5,
                "Au-delà de ce temps, la requête est notée dans le journal des requêtes lentes.");
        interrupteur(l, mariadb, "innodb_print_all_deadlocks", "Trace des interblocages", true,
                "Chaque interblocage (deux caisses sur le même produit) est écrit dans le journal d'erreurs de MariaDB.");

        return machine(l, ram, processeurs, heap, bp);
    }

    private static List<Reglage> machine(List<Reglage> l, long ram, int processeurs, long heap, long bp) {
        long total = heap + bp + 64 * MO + 3 * GO;
        Reglage m = new Reglage("MACHINE", "memoire", "Mémoire de la machine");
        m.actuel = taille(ram) + ", " + processeurs + " processeur(s) logique(s)";
        m.conseille = "≥ " + taille(total + 2 * GO);
        m.explication = "Budget : Windows 3 Go, serveur Java " + taille(heap)
                + (bp > 0 ? ", MariaDB " + taille(bp) + " + tampons" : "") + " ; le reste absorbe les pointes.";
        m.ligne = "";
        m.niveau = ram < total ? Niveau.CRITIQUE : ram < total + 2 * GO ? Niveau.A_AJUSTER : Niveau.OK;
        l.add(m);
        return l;
    }

    /** Bloc [mysqld] conseille, a copier dans my.ini (les lignes non citees restent telles quelles). */
    public static String blocMyIni(List<Reglage> l) {
        StringBuilder sb = new StringBuilder("[mysqld]\n");
        for (Reglage r : l) {
            if ("MARIADB".equals(r.domaine)) {
                sb.append(r.ligne).append('\n');
            }
        }
        return sb.append("innodb_io_capacity_max=4000\n").toString();
    }
}
