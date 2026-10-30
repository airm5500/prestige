package rest.service.impl.serveur;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * STABILITE DU SERVEUR : ecriture durable des reglages conseilles de MariaDB dans my.ini (section [mysqld]), depuis le
 * Centre de support. Regles pures (testees a part) :
 * <ul>
 * <li>seules les cles de la liste fermee ({@link ApplicationMariadb}) sont ecrites, innodb_flush_log_at_trx_commit
 * toujours a 1 ;</li>
 * <li>une cle presente est remplacee en place (orthographe, espaces et commentaire gardes), une cle absente est ajoutee
 * en fin de section [mysqld] ; toutes les autres lignes restent identiques, octet pour octet ;</li>
 * <li>refus si la structure n'est pas comprise : pas ou plusieurs sections [mysqld], !include, ligne illisible, cle en
 * double, ou cle aussi presente dans une autre section lue par le serveur ;</li>
 * <li>sauvegarde du fichier avant toute modification ; MariaDB n'est jamais redemarre.</li>
 * </ul>
 * Le fichier est lu et ecrit en ISO-8859-1 : chaque octet est rendu tel quel, quel que soit l'encodage d'origine.
 */
public final class FichierMyIni {

    private static final Pattern SECTION = Pattern.compile("^\\s*\\[([^\\]]+)\\]\\s*([#;].*)?$");
    private static final Pattern OPTION = Pattern
            .compile("^(\\s*([A-Za-z0-9_.\\-]+)\\s*)(?:(=\\s*)(.*?))?(\\s+[#;].*)?\\s*$");

    /** Une ligne changee : valeur avant (null si la cle etait absente) et apres. */
    public static final class Changement {
        public final String cle, avant, apres;

        Changement(String cle, String avant, String apres) {
            this.cle = cle;
            this.avant = avant;
            this.apres = apres;
        }
    }

    /** Texte modifie (null si refus) et changements. */
    public static final class Resultat {
        public String refus, texte;
        public final List<Changement> changements = new ArrayList<>();
    }

    /** Ecriture du fichier : sauvegarde (null si rien n'a change) et resultat. */
    public static final class Ecriture {
        public String refus;
        public Path fichier, sauvegarde;
        public Resultat resultat;
    }

    /** Lecture de la structure du fichier. */
    private static final class Analyse {
        String refus, fin = "\n";
        List<String> lignes = new ArrayList<>();
        boolean finalSansRetour;
        int debutMysqld = -1, finMysqld = -1;
        /** cle normalisee -> indice de ligne dans [mysqld] */
        Map<String, Integer> cles = new HashMap<>();
    }

    private FichierMyIni() {
    }

    /** « max-connections » et « max_connections » designent le meme reglage. */
    static String normaliser(String cle) {
        return cle.trim().toLowerCase(Locale.ROOT).replace('-', '_');
    }

    /** Sections lues par le serveur MariaDB (en plus de [mysqld]). */
    private static boolean sectionServeur(String nom) {
        return nom.equals("server") || nom.equals("mysqld") || nom.equals("mariadb") || nom.equals("mariadbd")
                || nom.startsWith("mysqld-") || nom.startsWith("mariadb-") || nom.startsWith("mariadbd-");
    }

    private static Analyse analyser(String contenu) {
        Analyse a = new Analyse();
        String t = contenu == null ? "" : contenu;
        a.fin = t.contains("\r\n") ? "\r\n" : "\n";
        a.finalSansRetour = !t.isEmpty() && !t.endsWith("\n");
        for (String l : t.split("\r?\n", -1)) {
            a.lignes.add(l);
        }
        if (!a.finalSansRetour && !a.lignes.isEmpty()) {
            a.lignes.remove(a.lignes.size() - 1);
        }
        String section = null;
        int mysqld = 0;
        for (int i = 0; i < a.lignes.size(); i++) {
            String l = a.lignes.get(i), s = l.trim();
            if (i == 0 && s.startsWith("ï»¿")) {
                s = s.substring(3).trim(); // marque UTF-8 (BOM) lue en ISO-8859-1
            }
            if (s.isEmpty() || s.startsWith("#") || s.startsWith(";")) {
                continue;
            }
            if (s.startsWith("!")) {
                a.refus = "Ligne " + (i + 1) + " : « " + s
                        + " » renvoie à d'autres fichiers, où les réglages peuvent être repris : écriture refusée.";
                return a;
            }
            Matcher m = SECTION.matcher(s);
            if (m.matches()) {
                if (section != null && section.equals("mysqld")) {
                    a.finMysqld = i;
                }
                section = m.group(1).trim().toLowerCase(Locale.ROOT);
                if (section.equals("mysqld")) {
                    mysqld++;
                    a.debutMysqld = i;
                }
                continue;
            }
            Matcher o = OPTION.matcher(l.replace("ï»¿", ""));
            if (!o.matches() || section == null) {
                a.refus = "Ligne " + (i + 1) + " non comprise (« " + s + " ») : écriture refusée.";
                return a;
            }
            String cle = normaliser(o.group(2));
            if (!ApplicationMariadb.connu(cle) || !sectionServeur(section)) {
                continue;
            }
            if (!section.equals("mysqld")) {
                a.refus = "« " + o.group(2) + " » est aussi réglé dans la section [" + section
                        + "], qui l'emporterait : écriture refusée.";
                return a;
            }
            if (a.cles.containsKey(cle)) {
                a.refus = "« " + cle + " » apparaît deux fois dans [mysqld] : écriture refusée.";
                return a;
            }
            a.cles.put(cle, i);
        }
        if (mysqld == 0) {
            a.refus = "Aucune section [mysqld] dans le fichier : écriture refusée.";
        } else if (mysqld > 1) {
            a.refus = "Plusieurs sections [mysqld] dans le fichier : écriture refusée.";
        } else if (a.finMysqld < 0) {
            a.finMysqld = a.lignes.size();
        }
        return a;
    }

    /** Valeur d'une ligne d'option (null si la cle est seule, « 1 » pour MariaDB). */
    private static String valeurLigne(String ligne) {
        Matcher o = OPTION.matcher(ligne.replace("ï»¿", ""));
        return o.matches() ? (o.group(3) == null ? "1" : o.group(4).trim()) : null;
    }

    private static boolean equivalent(String cle, String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        long x = ApplicationMariadb.valeur(cle, a), y = ApplicationMariadb.valeur(cle, b);
        return x >= 0 ? x == y : a.trim().equalsIgnoreCase(b.trim());
    }

    /**
     * Ecrit les valeurs dans [mysqld] (cles de la liste fermee seulement).
     *
     * @param valeurs
     *            cle -> valeur telle qu'ecrite dans my.ini (« 4G », « 196 »)
     */
    public static Resultat appliquer(String contenu, Map<String, String> valeurs) {
        Resultat r = new Resultat();
        Analyse a = analyser(contenu);
        if (a.refus != null) {
            r.refus = a.refus;
            return r;
        }
        List<String> l = new ArrayList<>(a.lignes), ajouts = new ArrayList<>();
        for (Map.Entry<String, String> e : valeurs.entrySet()) {
            String cle = normaliser(e.getKey());
            if (!ApplicationMariadb.connu(cle)) {
                continue;
            }
            String v = "innodb_flush_log_at_trx_commit".equals(cle) ? "1" : e.getValue().trim();
            Integer i = a.cles.get(cle);
            if (i == null) {
                ajouts.add(cle + "=" + v);
                r.changements.add(new Changement(cle, null, v));
                continue;
            }
            String ancienne = valeurLigne(l.get(i));
            if (equivalent(cle, ancienne, v)) {
                continue;
            }
            Matcher o = OPTION.matcher(l.get(i));
            o.matches();
            l.set(i, o.group(1) + (o.group(3) == null ? "=" : o.group(3)) + v + (o.group(5) == null ? "" : o.group(5)));
            r.changements.add(new Changement(cle, ancienne, v));
        }
        if (!ajouts.isEmpty()) {
            /* apres la derniere ligne non vide de [mysqld] */
            int apres = a.finMysqld - 1;
            while (apres > a.debutMysqld && l.get(apres).trim().isEmpty()) {
                apres--;
            }
            List<String> bloc = new ArrayList<>();
            bloc.add("# Reglages conseilles par Prestige (Centre de support)");
            bloc.addAll(ajouts);
            l.addAll(apres + 1, bloc);
        }
        r.texte = String.join(a.fin, l) + (a.finalSansRetour || l.isEmpty() ? "" : a.fin);
        return r;
    }

    /**
     * Valeurs a ecrire d'apres le calcul : les reglages a ajuster, et ceux deja corrects en marche (applique a chaud)
     * dont le fichier garde une autre valeur, qui reviendrait au redemarrage.
     *
     * @param enMarche
     *            SHOW GLOBAL VARIABLES (noms en minuscules)
     * @param contenu
     *            my.ini actuel (vide : seuls les reglages a ajuster)
     */
    public static Map<String, String> valeurs(List<Reglage> reglages, Map<String, String> enMarche, String contenu) {
        Analyse a = analyser(contenu);
        Map<String, String> m = new LinkedHashMap<>();
        for (Reglage r : reglages) {
            if (!"MARIADB".equals(r.domaine) || !ApplicationMariadb.connu(r.cle) || r.ligne == null) {
                continue;
            }
            String ligne = ApplicationMariadb.ligneSure(r.ligne);
            int egal = ligne.indexOf('=');
            if (egal < 0 || !normaliser(ligne.substring(0, egal)).equals(r.cle)) {
                continue;
            }
            String v = ligne.substring(egal + 1).trim();
            Integer i = a.refus == null ? a.cles.get(r.cle) : null;
            boolean perime = i != null && !equivalent(r.cle, valeurLigne(a.lignes.get(i)), enMarche.get(r.cle));
            if (r.niveau != Niveau.OK || perime) {
                m.put(r.cle, v);
            }
        }
        if (m.containsKey("innodb_io_capacity")) {
            m.put("innodb_io_capacity_max", String.valueOf(ApplicationMariadb.CAPACITE_MAX));
        }
        return m;
    }

    /** my.ini dans le dossier des donnees de MariaDB (@@datadir), la ou l'installateur Windows le met. */
    public static Path chemin(String datadir) {
        String d = datadir.trim().replace('\\', '/');
        while (d.length() > 1 && d.endsWith("/")) {
            d = d.substring(0, d.length() - 1);
        }
        return Paths.get(d, "my.ini");
    }

    /**
     * Ecrit le fichier : lecture, refus si non compris, sauvegarde « my.ini.avant-prestige-horodatage », ecriture par
     * un fichier temporaire remplace d'un coup, relecture.
     */
    public static Ecriture ecrire(Path fichier, Map<String, String> valeurs, String horodatage) {
        Ecriture e = new Ecriture();
        e.fichier = fichier;
        if (!Files.isRegularFile(fichier)) {
            e.refus = "Fichier introuvable : " + fichier + ".";
            return e;
        }
        Path tmp = fichier.resolveSibling(fichier.getFileName() + ".prestige-tmp");
        try {
            String avant = new String(Files.readAllBytes(fichier), StandardCharsets.ISO_8859_1);
            e.resultat = appliquer(avant, valeurs);
            if (e.resultat.refus != null) {
                e.refus = e.resultat.refus;
                return e;
            }
            if (e.resultat.changements.isEmpty()) {
                return e;
            }
            Path s = fichier.resolveSibling(fichier.getFileName() + ".avant-prestige-" + horodatage);
            for (int n = 2; Files.exists(s); n++) {
                s = fichier.resolveSibling(fichier.getFileName() + ".avant-prestige-" + horodatage + "-" + n);
            }
            Files.copy(fichier, s, StandardCopyOption.COPY_ATTRIBUTES);
            e.sauvegarde = s;
            Files.write(tmp, e.resultat.texte.getBytes(StandardCharsets.ISO_8859_1));
            try {
                Files.move(tmp, fichier, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException x) {
                Files.move(tmp, fichier, StandardCopyOption.REPLACE_EXISTING);
            }
            if (!e.resultat.texte.equals(new String(Files.readAllBytes(fichier), StandardCharsets.ISO_8859_1))) {
                Files.copy(s, fichier, StandardCopyOption.REPLACE_EXISTING);
                e.refus = "Relecture différente de ce qui a été écrit : fichier remis comme avant.";
            }
        } catch (IOException x) {
            e.refus = "Écriture impossible (" + x.getClass().getSimpleName() + " : " + x.getMessage()
                    + ") : le compte du service de Payara n'a peut-être pas le droit d'écrire dans ce dossier.";
        } finally {
            try {
                Files.deleteIfExists(tmp);
            } catch (IOException x) {
                /* fichier temporaire laisse : sans effet sur MariaDB */
            }
        }
        return e;
    }

    /** Detail du journal : chaque cle avant puis apres, et la sauvegarde. */
    public static String journal(Ecriture e) {
        StringBuilder sb = new StringBuilder("Fichier : ").append(e.fichier).append('\n');
        if (e.sauvegarde != null) {
            sb.append("Sauvegarde : ").append(e.sauvegarde).append('\n');
        }
        if (e.resultat != null) {
            for (Changement c : e.resultat.changements) {
                sb.append(c.cle).append(" : ").append(c.avant == null ? "absent" : c.avant).append(" -> ")
                        .append(c.apres).append('\n');
            }
        }
        if (e.refus != null) {
            sb.append("Refus : ").append(e.refus).append('\n');
        }
        return sb.toString();
    }
}
