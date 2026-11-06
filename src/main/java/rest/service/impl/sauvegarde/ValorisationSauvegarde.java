package rest.service.impl.sauvegarde;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPInputStream;
import javax.annotation.Resource;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.EJB;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.sql.DataSource;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.securite.ArchiveChiffree;

/**
 * VALORISATION DU STOCK D'UNE SAUVEGARDE (retour du 02/11 : valoriser sans restaurer toute la base sur un autre poste).
 * <p>
 * Seules les tables utiles (produits, stock par emplacement, reserve, familles, rayons, grossistes, emplacements) sont
 * extraites du fichier et chargees dans une base temporaire {@link #BASE_TEMPORAIRE} du meme serveur, supprimee a la
 * fin. La base en service n'est que lue pour rien : toutes les requetes portent sur la base temporaire. Le calcul est
 * celui de la valorisation du jour de Prestige (ProduitServiceImpl) : rayon = int_NUMBER_AVAILABLE des stocks actifs,
 * reserve = t_type_stock_famille de type 2 actif, produits actifs, prix d'achat int_PAF et de vente int_PRICE.
 * </p>
 */
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.BEAN)
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class ValorisationSauvegarde {

    private static final Logger LOG = Logger.getLogger(ValorisationSauvegarde.class.getName());
    static final String BASE_TEMPORAIRE = "prestige_valo_tmp";
    static final Set<String> TABLES = new HashSet<>(Arrays.asList("t_famille", "t_famille_stock",
            "t_type_stock_famille", "t_famillearticle", "t_zone_geographique", "t_grossiste", "t_emplacement"));
    /** mode : libelle, table du groupe, cle, colonne du code, colonne du libelle (comme l'ecran de valorisation). */
    static final String[][] MODES = {
            { "1", "Famille", "t_famillearticle", "lg_FAMILLEARTICLE_ID", "str_CODE_FAMILLE", "str_LIBELLE" },
            { "2", "Rayon", "t_zone_geographique", "lg_ZONE_GEO_ID", "str_CODE", "str_LIBELLEE" },
            { "3", "Grossiste", "t_grossiste", "lg_GROSSISTE_ID", "str_CODE", "str_LIBELLE" } };

    @Resource(mappedName = PoolMariaDb.JNDI)
    private DataSource dataSource;
    @EJB
    private SauvegardeService sauvegardeService;

    private final AtomicBoolean enCours = new AtomicBoolean();
    private volatile JSONObject dernier;

    /** Valorise le stock de la sauvegarde {@code id} ; {success:false, message} si impossible. */
    public JSONObject valoriser(long id) {
        if (!enCours.compareAndSet(false, true)) {
            return echec("Une valorisation est déjà en cours.");
        }
        long debut = System.currentTimeMillis();
        Path options = null, erreurs = null;
        boolean baseCreee = false;
        try {
            String[] ligne = ligne(id);
            if (ligne == null) {
                return echec("Sauvegarde introuvable ou non réussie.");
            }
            Path fichier = trouver(ligne[0]);
            if (fichier == null) {
                return echec("Le fichier " + ligne[0]
                        + " n'est plus dans le dossier des sauvegardes ni dans sa copie (conservation).");
            }
            String outil = sauvegardeService.outil();
            Path client = outil == null ? null : client(Paths.get(outil));
            if (client == null) {
                return echec("Client de MariaDB (mariadb) introuvable à côté de l'outil de sauvegarde.");
            }
            PoolMariaDb pool;
            try {
                pool = sauvegardeService.identifiants();
            } catch (IllegalStateException e) {
                return echec(e.getMessage());
            }
            executer("DROP DATABASE IF EXISTS " + BASE_TEMPORAIRE);
            executer("CREATE DATABASE " + BASE_TEMPORAIRE + " CHARACTER SET utf8mb4");
            baseCreee = true;
            options = SauvegardeService.fichierPrive("prestige-valorisation", ".cnf",
                    sauvegardeService.securiteActive());
            Files.write(options, pool.options().getBytes(StandardCharsets.UTF_8));
            erreurs = Files.createTempFile("prestige-valorisation", ".txt");
            ProcessBuilder pb = new ProcessBuilder(client.toString(),
                    "--defaults-extra-file=" + options.toAbsolutePath(), "--default-character-set=utf8mb4",
                    BASE_TEMPORAIRE);
            pb.redirectError(erreurs.toFile());
            pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
            /* lot 4.C : archive chiffree ouverte (HMAC verifie, cle lue) avant de lancer le client */
            java.io.InputStream octets;
            try {
                octets = flux(fichier);
            } catch (IllegalStateException e) {
                return echec(e.getMessage());
            }
            Process p = pb.start();
            int tables;
            try (BufferedReader in = new BufferedReader(
                    new InputStreamReader(new GZIPInputStream(octets, 1 << 16), StandardCharsets.ISO_8859_1), 1 << 20);
                    Writer out = new BufferedWriter(
                            new OutputStreamWriter(p.getOutputStream(), StandardCharsets.ISO_8859_1), 1 << 20)) {
                tables = ExtraitSauvegarde.filtrer(in, out, TABLES);
            } catch (java.io.IOException e) {
                p.waitFor();
                return echec("Chargement interrompu : " + detail(erreurs, pool));
            }
            int code = p.waitFor();
            if (code != 0 || tables != TABLES.size()) {
                return echec("Chargement des tables en échec (code " + code + ", " + tables + " table(s) sur "
                        + TABLES.size() + ") : " + detail(erreurs, pool));
            }
            JSONObject r = calculer();
            r.put("success", true).put("id", id).put("fichier", ligne[0]).put("debut", ligne[1]).put("dureeS",
                    (System.currentTimeMillis() - debut) / 1000);
            dernier = r;
            return r;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Valorisation de la sauvegarde " + id, e);
            return echec("Valorisation en échec : " + e.getClass().getSimpleName() + " "
                    + StringUtils.defaultString(e.getMessage()));
        } finally {
            if (baseCreee) {
                try {
                    executer("DROP DATABASE IF EXISTS " + BASE_TEMPORAIRE);
                } catch (Exception e) {
                    LOG.log(Level.WARNING, "Suppression de la base temporaire de valorisation", e);
                }
            }
            SauvegardeService.supprimer(options);
            SauvegardeService.supprimer(erreurs);
            enCours.set(false);
        }
    }

    /** Groupes de chaque mode, pour chaque emplacement qui a du stock (rayon ou reserve). */
    private JSONObject calculer() throws Exception {
        String b = BASE_TEMPORAIRE + ".";
        JSONArray emplacements = new JSONArray();
        try (Connection c = dataSource.getConnection()) {
            Map<String, String> noms = new LinkedHashMap<>();
            try (Statement st = c.createStatement();
                    ResultSet rs = st.executeQuery("SELECT e.lg_EMPLACEMENT_ID, e.str_NAME FROM " + b
                            + "t_emplacement e WHERE EXISTS" + " (SELECT 1 FROM " + b
                            + "t_famille_stock s WHERE s.lg_EMPLACEMENT_ID = e.lg_EMPLACEMENT_ID AND s.str_STATUT = 'enable')"
                            + " OR EXISTS (SELECT 1 FROM " + b
                            + "t_type_stock_famille z WHERE z.lg_EMPLACEMENT_ID = e.lg_EMPLACEMENT_ID"
                            + " AND z.lg_TYPE_STOCK_ID = '2' AND z.str_STATUT = 'enable') ORDER BY e.lg_EMPLACEMENT_ID")) {
                while (rs.next()) {
                    noms.put(rs.getString(1), StringUtils.defaultString(rs.getString(2)));
                }
            }
            for (Map.Entry<String, String> e : noms.entrySet()) {
                JSONObject modes = new JSONObject();
                for (String[] m : MODES) {
                    Map<String, JSONObject> groupes = new LinkedHashMap<>();
                    String groupe = " JOIN " + b + m[2] + " g ON g." + m[3] + " = o." + m[3];
                    lire(c, "SELECT g." + m[3] + ", g." + m[4] + ", g." + m[5]
                            + ", SUM(s.int_NUMBER_AVAILABLE), SUM(o.int_PAF * s.int_NUMBER_AVAILABLE),"
                            + " SUM(o.int_PRICE * s.int_NUMBER_AVAILABLE) FROM " + b + "t_famille o JOIN " + b
                            + "t_famille_stock s ON s.lg_FAMILLE_ID = o.lg_FAMILLE_ID" + groupe
                            + " WHERE o.str_STATUT = 'enable' AND s.str_STATUT = 'enable' AND s.lg_EMPLACEMENT_ID = ? GROUP BY g."
                            + m[3], e.getKey(), groupes, "Rayon");
                    lire(c, "SELECT g." + m[3] + ", g." + m[4] + ", g." + m[5]
                            + ", SUM(z.int_NUMBER), SUM(o.int_PAF * z.int_NUMBER),"
                            + " SUM(o.int_PRICE * z.int_NUMBER) FROM " + b + "t_famille o JOIN " + b
                            + "t_type_stock_famille z ON z.lg_FAMILLE_ID = o.lg_FAMILLE_ID" + groupe
                            + " WHERE o.str_STATUT = 'enable' AND z.lg_TYPE_STOCK_ID = '2' AND z.str_STATUT = 'enable' AND z.lg_EMPLACEMENT_ID = ?"
                            + " GROUP BY g." + m[3], e.getKey(), groupes, "Reserve");
                    JSONArray l = new JSONArray();
                    groupes.values().stream().sorted((x, y) -> x.optString("code").compareTo(y.optString("code")))
                            .forEach(l::put);
                    modes.put(m[0], l);
                }
                emplacements.put(new JSONObject().put("id", e.getKey()).put("nom", e.getValue()).put("modes", modes));
            }
        }
        return new JSONObject().put("emplacements", emplacements);
    }

    private static void lire(Connection c, String sql, String emplacement, Map<String, JSONObject> groupes,
            String suffixe) throws Exception {
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, emplacement);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    JSONObject g = groupes.computeIfAbsent(rs.getString(1),
                            k -> new JSONObject().put("qteRayon", 0L).put("achatRayon", 0L).put("venteRayon", 0L)
                                    .put("qteReserve", 0L).put("achatReserve", 0L).put("venteReserve", 0L));
                    g.put("code", StringUtils.defaultString(rs.getString(2)))
                            .put("libelle", StringUtils.defaultString(rs.getString(3)))
                            .put("qte" + suffixe, rs.getLong(4)).put("achat" + suffixe, rs.getLong(5))
                            .put("vente" + suffixe, rs.getLong(6));
                }
            }
        }
    }

    /* ============================================================================================ export */

    /** Classeur Excel de la derniere valorisation de cette sauvegarde (une feuille par mode, par emplacement). */
    public byte[] excel(long id) throws Exception {
        JSONObject r = dernier;
        if (r == null || r.optLong("id") != id) {
            r = valoriser(id);
            if (!r.optBoolean("success")) {
                return null;
            }
        }
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle gras = wb.createCellStyle();
            Font f = wb.createFont();
            f.setBold(true);
            gras.setFont(f);
            CellStyle montant = wb.createCellStyle();
            montant.setDataFormat(wb.createDataFormat().getFormat("#,##0"));
            JSONArray emplacements = r.getJSONArray("emplacements");
            for (int i = 0; i < emplacements.length(); i++) {
                JSONObject e = emplacements.getJSONObject(i);
                for (String[] m : MODES) {
                    String nom = (emplacements.length() > 1 ? StringUtils.abbreviate(e.optString("nom"), 14) + " - "
                            : "") + m[1];
                    Sheet s = wb.createSheet(org.apache.poi.ss.util.WorkbookUtil.createSafeSheetName(nom));
                    s.createRow(0).createCell(0).setCellValue("Valorisation du stock de la sauvegarde du "
                            + r.optString("debut") + " - " + e.optString("nom") + " - par " + m[1].toLowerCase());
                    s.getRow(0).getCell(0).setCellStyle(gras);
                    String[] titres = { "Code", m[1], "Qté rayon", "Achat rayon", "Vente rayon", "Qté réserve",
                            "Achat réserve", "Vente réserve", "Achat total", "Vente total" };
                    Row t = s.createRow(2);
                    for (int k = 0; k < titres.length; k++) {
                        Cell c = t.createCell(k);
                        c.setCellValue(titres[k]);
                        c.setCellStyle(gras);
                    }
                    JSONArray l = e.getJSONObject("modes").getJSONArray(m[0]);
                    long[] totaux = new long[8];
                    for (int k = 0; k < l.length(); k++) {
                        JSONObject g = l.getJSONObject(k);
                        long[] v = { g.getLong("qteRayon"), g.getLong("achatRayon"), g.getLong("venteRayon"),
                                g.getLong("qteReserve"), g.getLong("achatReserve"), g.getLong("venteReserve"),
                                g.getLong("achatRayon") + g.getLong("achatReserve"),
                                g.getLong("venteRayon") + g.getLong("venteReserve") };
                        Row row = s.createRow(3 + k);
                        row.createCell(0).setCellValue(g.optString("code"));
                        row.createCell(1).setCellValue(g.optString("libelle"));
                        for (int j = 0; j < v.length; j++) {
                            Cell c = row.createCell(2 + j);
                            c.setCellValue(v[j]);
                            c.setCellStyle(montant);
                            totaux[j] += v[j];
                        }
                    }
                    Row tot = s.createRow(3 + l.length());
                    tot.createCell(1).setCellValue("Total");
                    tot.getCell(1).setCellStyle(gras);
                    for (int j = 0; j < totaux.length; j++) {
                        Cell c = tot.createCell(2 + j);
                        c.setCellValue(totaux[j]);
                        c.setCellStyle(montant);
                    }
                    s.setColumnWidth(0, 14 * 256);
                    s.setColumnWidth(1, 40 * 256);
                    for (int j = 2; j < titres.length; j++) {
                        s.setColumnWidth(j, 15 * 256);
                    }
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    /* ============================================================================================ outils */

    private String[] ligne(long id) throws Exception {
        try (Connection c = dataSource.getConnection(); PreparedStatement ps = c.prepareStatement(
                "SELECT fichier, DATE_FORMAT(debut, '%d/%m/%Y %H:%i') FROM t_sauvegarde WHERE id = ? AND statut = 'REUSSIE'")) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && StringUtils.isNotBlank(rs.getString(1))
                        ? new String[] { rs.getString(1), rs.getString(2) } : null;
            }
        }
    }

    /** Le fichier dans le dossier des sauvegardes, a defaut dans sa copie ; seul un nom de sauvegarde est accepte. */
    private Path trouver(String nom) {
        if (!nom.matches("prestige_[A-Za-z0-9_$-]+_\\d{8}_\\d{4}\\.sql\\.gz(\\.aes)?")) {
            return null;
        }
        for (String d : new String[] { sauvegardeService.dossier(), sauvegardeService.copie() }) {
            if (StringUtils.isNotBlank(d)) {
                Path f = Paths.get(d, nom);
                if (Files.isRegularFile(f)) {
                    return f;
                }
            }
        }
        return null;
    }

    /**
     * Octets du fichier de sauvegarde : tels quels, ou dechiffres (lot 4.C, .sql.gz.aes) avec la cle des archives du
     * serveur ; le HMAC est verifie avant le premier octet. IllegalStateException, sans valeur, si la cle manque ou ne
     * convient pas.
     */
    private java.io.InputStream flux(Path fichier) throws Exception {
        if (!ArchiveChiffree.estChiffree(fichier.getFileName().toString())) {
            return Files.newInputStream(fichier);
        }
        byte[] cle = sauvegardeService.cleLecture();
        if (cle == null) {
            throw new IllegalStateException("Sauvegarde chiffrée, mais la clé des archives est absente sur ce serveur ("
                    + sauvegardeService.fichierCle()
                    + ") : 7-cle-archive.ps1 -Creer, ou déchiffrez-la avec la clé du pharmacien.");
        }
        try {
            return ArchiveChiffree.dechiffrer(fichier, cle);
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("Sauvegarde chiffrée illisible avec la clé des archives de ce serveur"
                    + " (mauvaise clé ou fichier altéré) : " + fichier.getFileName());
        }
    }

    /** Client de MariaDB a cote de l'outil de sauvegarde : mariadb, a defaut mysql. */
    static Path client(Path outil) {
        String exe = outil.getFileName().toString().toLowerCase().endsWith(".exe") ? ".exe" : "";
        for (String n : new String[] { "mariadb", "mysql" }) {
            Path c = outil.resolveSibling(n + exe);
            if (Files.isRegularFile(c)) {
                return c;
            }
        }
        return null;
    }

    private void executer(String sql) throws Exception {
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            st.execute(sql);
        }
    }

    private static String detail(Path erreurs, PoolMariaDb pool) {
        try {
            String d = StringUtils.trimToEmpty(new String(Files.readAllBytes(erreurs), StandardCharsets.UTF_8));
            if (!pool.motDePasse.isEmpty()) {
                d = d.replace(pool.motDePasse, "***");
            }
            return StringUtils.abbreviate(StringUtils.defaultIfBlank(d, "aucun détail"), 500);
        } catch (Exception e) {
            return "aucun détail";
        }
    }

    private static JSONObject echec(String m) {
        return new JSONObject().put("success", false).put("message", m);
    }
}
