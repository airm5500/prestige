package rest.service.impl;

import avisclients.Analyse;
import avisclients.AvisRefus;
import avisclients.Avis;
import avisclients.Limiteur;
import avisclients.Saisie;
import avisclients.Texte;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.WhatsAppService;

/**
 * Avis clients (menu AVIS CLIENTS, retours du 11/10). Les avis arrivent par la page publique (QR code de la pharmacie,
 * port public dedie) et sont lus, filtres, analyses et traites ici. Toutes les requetes passent par des parametres lies
 * ; aucune valeur saisie par un client n'est concatenee dans du SQL.
 */
@Stateless
public class AvisClientService {

    private static final Logger LOG = Logger.getLogger(AvisClientService.class.getName());
    public static final String ADRESSE = "KEY_AVIS_ADRESSE_PUBLIQUE", PORT = "KEY_AVIS_PORT_PUBLIC",
            JETON = "KEY_AVIS_JETON", ACTIF = "KEY_AVIS_ACTIF", MAX_HEURE = "KEY_AVIS_MAX_HEURE",
            ADRESSE_AFFICHEE = "KEY_AVIS_ADRESSE_AFFICHEE";
    /** Avis lus au plus pour une liste ou une analyse (la periode choisie les borne deja). */
    static final int MAX_AVIS = 20000;
    private static final Limiteur LIMITEUR = new Limiteur(500);
    private static final SecureRandom HASARD = new SecureRandom();
    private static final DateTimeFormatter AFFICHAGE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /* port public mis en cache pour le filtre (lu a chaque requete) */
    private static volatile int portPublic = -2;
    private static volatile long portLu;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private WhatsAppService whatsAppService;

    /* ------------------------------------------------------------------ reglages */

    public String parametre(String cle) {
        @SuppressWarnings("unchecked")
        List<Object> l = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, cle).getResultList();
        return l.isEmpty() || l.get(0) == null ? "" : l.get(0).toString().trim();
    }

    private void ecrire(String cle, String valeur) {
        em.createNativeQuery("UPDATE t_parameters SET str_VALUE = ?1, dt_UPDATED = NOW() WHERE str_KEY = ?2")
                .setParameter(1, valeur).setParameter(2, cle).executeUpdate();
    }

    /** Port public dedie (cache de 30 s) ; -1 si la page d'avis n'est pas publiee (adresse IP vide). */
    public int portPublic() {
        long t = System.currentTimeMillis();
        if (portPublic == -2 || t - portLu > 30_000) {
            try {
                portPublic = parametre(ADRESSE).isEmpty() ? -1 : Integer.parseInt(parametre(PORT));
            } catch (RuntimeException e) {
                portPublic = -1;
            }
            portLu = t;
        }
        return portPublic;
    }

    public static void oublierPort() {
        portPublic = -2;
    }

    /** Nom et adresse de la pharmacie, tels qu'affiches sur la page et l'affiche. */
    public String[] pharmacie() {
        @SuppressWarnings("unchecked")
        List<Object[]> r = em
                .createNativeQuery("SELECT str_NOM_COMPLET, str_ADRESSSE_POSTALE, str_PHONE FROM t_officine LIMIT 1")
                .getResultList();
        String nom = r.isEmpty() ? "" : StringUtils.defaultString((String) r.get(0)[0]).trim();
        String adresse = parametre(ADRESSE_AFFICHEE);
        if (adresse.isEmpty() && !r.isEmpty()) {
            String a = StringUtils.defaultString((String) r.get(0)[1]).trim();
            String tel = StringUtils.defaultString((String) r.get(0)[2]).trim();
            adresse = a + (!a.isEmpty() && !tel.isEmpty() ? " — " : "") + (tel.isEmpty() ? "" : "Tél. " + tel);
        }
        return new String[] { nom, adresse };
    }

    /** Lien du QR code : http://adresse:port/contexte/avis/?t=jeton ; null si l'adresse publique n'est pas saisie. */
    public String lien(String contexte) {
        String ip = parametre(ADRESSE);
        if (ip.isEmpty()) {
            return null;
        }
        String port = parametre(PORT);
        return "http://" + ip + ("80".equals(port) || port.isEmpty() ? "" : ":" + port)
                + StringUtils.defaultString(contexte) + "/avis/?t=" + jeton();
    }

    public JSONObject reglages(String contexte) {
        String[] p = pharmacie();
        return new JSONObject().put("adresse", parametre(ADRESSE)).put("port", parametre(PORT))
                .put("actif", !"0".equals(parametre(ACTIF))).put("maxHeure", parametre(MAX_HEURE))
                .put("adresseAffichee", parametre(ADRESSE_AFFICHEE)).put("pharmacie", p[0])
                .put("adressePharmacie", p[1]).put("lien", lien(contexte) == null ? JSONObject.NULL : lien(contexte))
                .put("publie", !parametre(ADRESSE).isEmpty());
    }

    /** Enregistre les reglages (adresse IPv4 ou nom d'hote, port 1..65535, 1 a 50 avis par heure). */
    public void enregistrerReglages(JSONObject r) {
        String ip = StringUtils.trimToEmpty(r.optString("adresse"));
        if (!ip.isEmpty() && !ip.matches("(\\d{1,3}\\.){3}\\d{1,3}|[A-Za-z0-9]([A-Za-z0-9-]{0,62}\\.)+[A-Za-z]{2,}")) {
            throw new AvisRefus("Adresse publique invalide (ex. : 41.207.10.20).");
        }
        if (ip.matches("(\\d{1,3}\\.){3}\\d{1,3}")) {
            for (String o : ip.split("\\.")) {
                if (Integer.parseInt(o) > 255) {
                    throw new AvisRefus("Adresse publique invalide (ex. : 41.207.10.20).");
                }
            }
        }
        int port = r.optInt("port", 0);
        if (port < 1 || port > 65535) {
            throw new AvisRefus("Port public invalide (1 à 65535).");
        }
        int max = r.optInt("maxHeure", 0);
        if (max < 1 || max > 50) {
            throw new AvisRefus("Avis par heure et par appareil : de 1 à 50.");
        }
        ecrire(ADRESSE, ip);
        ecrire(PORT, String.valueOf(port));
        ecrire(MAX_HEURE, String.valueOf(max));
        ecrire(ACTIF, r.optBoolean("actif", true) ? "1" : "0");
        ecrire(ADRESSE_AFFICHEE, StringUtils.defaultString(Texte.ligne(r.optString("adresseAffichee", ""), 120)));
        oublierPort();
    }

    /** Jeton du QR code ; tire au hasard a la premiere utilisation. */
    String jeton() {
        String j = parametre(JETON);
        if (j.isEmpty()) {
            regenererJeton();
            j = parametre(JETON);
        }
        return j;
    }

    /** Nouveau jeton : les anciennes affiches ne fonctionnent plus. */
    public void regenererJeton() {
        byte[] b = new byte[24];
        HASARD.nextBytes(b);
        StringBuilder s = new StringBuilder();
        for (byte x : b) {
            s.append(String.format("%02x", x));
        }
        ecrire(JETON, s.toString());
    }

    /** Jeton du QR valide (comparaison a temps constant). */
    public boolean jetonValide(String jeton) {
        String attendu = parametre(JETON);
        return jeton != null && !attendu.isEmpty() && MessageDigest.isEqual(attendu.getBytes(StandardCharsets.UTF_8),
                jeton.trim().getBytes(StandardCharsets.UTF_8));
    }

    public boolean actif() {
        return !"0".equals(parametre(ACTIF));
    }

    /* ------------------------------------------------------------------ page publique */

    /** Empreinte de l'adresse de l'emetteur (jamais l'adresse elle-meme), salee par le jeton. */
    public String empreinte(String adresse) {
        try {
            MessageDigest d = MessageDigest.getInstance("SHA-256");
            byte[] h = d.digest((jeton() + "|" + adresse).getBytes(StandardCharsets.UTF_8));
            StringBuilder s = new StringBuilder();
            for (int i = 0; i < 16; i++) {
                s.append(String.format("%02x", h[i]));
            }
            return s.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Vrai si un nouvel avis de cette empreinte est accepte maintenant. */
    public boolean accepterEnvoi(String empreinte) {
        int max;
        try {
            max = Integer.parseInt(parametre(MAX_HEURE));
        } catch (NumberFormatException e) {
            max = 5;
        }
        return LIMITEUR.accepter(empreinte, max, System.currentTimeMillis());
    }

    public String enregistrer(Saisie s, String empreinte) {
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO t_avis_client (id, dt_CREATED, note, criteres, texte, employe, anonyme, nom,"
                + " telephone, email, rappel, empreinte, statut) VALUES (?1, NOW(), ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,"
                + " ?11, 'NOUVEAU')").setParameter(1, id).setParameter(2, s.note).setParameter(3, s.criteresTexte())
                .setParameter(4, s.texte).setParameter(5, s.employe).setParameter(6, s.anonyme ? 1 : 0)
                .setParameter(7, s.nom).setParameter(8, s.telephone).setParameter(9, s.email)
                .setParameter(10, s.rappel ? 1 : 0).setParameter(11, empreinte).executeUpdate();
        return id;
    }

    /* ------------------------------------------------------------------ lecture */

    private static final String COLONNES = "id, dt_CREATED, note, criteres, texte, employe, anonyme, nom, telephone,"
            + " email, rappel, statut, dt_LU, note_interne, reponse, canal_reponse, statut_reponse, dt_REPONSE,"
            + " auteur_reponse, empreinte";

    @SuppressWarnings("unchecked")
    List<Object[]> lignes(LocalDate du, LocalDate au) {
        return em
                .createNativeQuery("SELECT " + COLONNES + " FROM t_avis_client WHERE dt_CREATED >= ?1"
                        + " AND dt_CREATED < ?2 ORDER BY dt_CREATED DESC LIMIT " + MAX_AVIS)
                .setParameter(1, Timestamp.valueOf(du.atStartOfDay()))
                .setParameter(2, Timestamp.valueOf(au.plusDays(1).atStartOfDay())).getResultList();
    }

    private static LocalDateTime date(Object o) {
        return o == null ? null
                : ((java.util.Date) o).toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
    }

    private static boolean vrai(Object o) {
        return o != null && (o instanceof Boolean ? (Boolean) o : ((Number) o).intValue() != 0);
    }

    static Avis avis(Object[] r) {
        return new Avis((String) r[0], date(r[1]), ((Number) r[2]).intValue(), Saisie.criteres((String) r[3]),
                (String) r[4], (String) r[5], (String) r[11], vrai(r[10]) && r[14] == null);
    }

    static JSONObject json(Object[] r) {
        LocalDateTime d = date(r[1]), dl = date(r[12]), dr = date(r[17]);
        JSONObject c = new JSONObject();
        Saisie.criteres((String) r[3]).forEach(c::put);
        return new JSONObject().put("id", r[0]).put("date", d.format(AFFICHAGE)).put("dateIso", d.toString())
                .put("note", ((Number) r[2]).intValue()).put("criteres", c)
                .put("texte", StringUtils.defaultString((String) r[4]))
                .put("employe", StringUtils.defaultString((String) r[5])).put("anonyme", vrai(r[6]))
                .put("nom", StringUtils.defaultString((String) r[7]))
                .put("telephone", StringUtils.defaultString((String) r[8]))
                .put("email", StringUtils.defaultString((String) r[9])).put("rappel", vrai(r[10])).put("statut", r[11])
                .put("dateLu", dl == null ? "" : dl.format(AFFICHAGE))
                .put("noteInterne", StringUtils.defaultString((String) r[13]))
                .put("reponse", StringUtils.defaultString((String) r[14]))
                .put("canalReponse", StringUtils.defaultString((String) r[15]))
                .put("statutReponse", StringUtils.defaultString((String) r[16]))
                .put("dateReponse", dr == null ? "" : dr.format(AFFICHAGE))
                .put("auteurReponse", StringUtils.defaultString((String) r[18]))
                .put("reponseAttendue", vrai(r[10]) && r[14] == null);
    }

    /**
     * Avis filtres et tries. Filtres (tous facultatifs) : note (1..5, NEGATIF, POSITIF), statut (NOUVEAU, LU, TRAITE,
     * NON_TRAITE), contient (texte, employe, nom, telephone), motCle (texte), employe (cle de l'analyse), theme,
     * reponse=ATTENDUE. Tri : DATE_DESC (defaut), DATE_ASC, NOTE_ASC, NOTE_DESC.
     */
    public JSONObject liste(LocalDate du, LocalDate au, JSONObject f, int start, int limit) {
        List<Object[]> toutes = trier(filtrer(lignes(du, au), f), f.optString("tri", "DATE_DESC"));
        JSONArray data = new JSONArray();
        int fin = Math.min(toutes.size(), Math.max(0, start) + Math.max(1, Math.min(limit, 500)));
        for (int i = Math.max(0, start); i < fin; i++) {
            data.put(json(toutes.get(i)));
        }
        return new JSONObject().put("success", true).put("total", toutes.size()).put("data", data);
    }

    /** Tous les avis filtres (impression, export), dans l'ordre demande. */
    public List<JSONObject> tous(LocalDate du, LocalDate au, JSONObject f) {
        return trier(filtrer(lignes(du, au), f), f.optString("tri", "DATE_DESC")).stream().map(AvisClientService::json)
                .collect(Collectors.toList());
    }

    static List<Object[]> trier(List<Object[]> l, String tri) {
        Comparator<Object[]> parDate = Comparator.comparing(r -> (java.util.Date) r[1]);
        Comparator<Object[]> c = "DATE_ASC".equals(tri) ? parDate
                : "NOTE_ASC".equals(tri)
                        ? Comparator.<Object[]> comparingInt(r -> ((Number) r[2]).intValue())
                                .thenComparing(parDate.reversed())
                        : "NOTE_DESC".equals(tri) ? Comparator.<Object[]> comparingInt(r -> -((Number) r[2]).intValue())
                                .thenComparing(parDate.reversed()) : parDate.reversed();
        l.sort(c);
        return l;
    }

    List<Object[]> filtrer(List<Object[]> lignes, JSONObject f) {
        String note = f.optString("note", ""), statut = f.optString("statut", "");
        String contient = Texte.plat(f.optString("contient", "")), motCle = Texte.plat(f.optString("motCle", ""));
        String employe = f.optString("employe", ""), theme = f.optString("theme", "");
        boolean attendue = "ATTENDUE".equals(f.optString("reponse", ""));
        Set<String> idsEmploye = null;
        if (!employe.isEmpty()) {
            idsEmploye = new HashSet<>();
            List<Avis> a = lignes.stream().map(AvisClientService::avis).collect(Collectors.toList());
            JSONArray groupes = Analyse.analyser(a, new ArrayList<>(), LocalDate.now(), LocalDate.now(), null)
                    .getJSONArray("employes");
            for (int i = 0; i < groupes.length(); i++) {
                JSONObject g = groupes.getJSONObject(i);
                if (g.getString("cle").equals(employe)) {
                    for (Object id : g.getJSONArray("avis")) {
                        idsEmploye.add((String) id);
                    }
                }
            }
        }
        String[] racines = theme.isEmpty() ? null : themeRacines(theme);
        Set<String> filtreEmploye = idsEmploye;
        return lignes.stream().filter(r -> {
            int n = ((Number) r[2]).intValue();
            if ("NEGATIF".equals(note) && n > 2 || "POSITIF".equals(note) && n < 4
                    || note.matches("[1-5]") && n != Integer.parseInt(note)) {
                return false;
            }
            if ("NON_TRAITE".equals(statut) ? "TRAITE".equals(r[11]) : !statut.isEmpty() && !statut.equals(r[11])) {
                return false;
            }
            if (attendue && !(vrai(r[10]) && r[14] == null)) {
                return false;
            }
            if (!contient.isEmpty() && !(" "
                    + Texte.plat(StringUtils.join(new Object[] { r[4], r[5], r[7], r[8], r[9], r[13], r[14] }, " "))
                    + " ").contains(contient)) {
                return false;
            }
            if (!motCle.isEmpty() && !(" " + Texte.plat((String) r[4]) + " ").contains(" " + motCle + " ")
                    && !(" " + Texte.plat((String) r[4]) + " ").contains(" " + motCle + "s ")) {
                return false;
            }
            if (filtreEmploye != null && !filtreEmploye.contains((String) r[0])) {
                return false;
            }
            return racines == null || Analyse.evoque(avis(r), racines);
        }).collect(Collectors.toList());
    }

    private static String[] themeRacines(String theme) {
        String[] r = Analyse.racinesTheme(theme);
        return r == null ? new String[] { "\u0000" } : r;
    }

    /** Un avis ; l'ouvrir le marque lu s'il etait nouveau. */
    @SuppressWarnings("unchecked")
    public JSONObject detail(String id, boolean marquerLu) {
        if (marquerLu) {
            em.createNativeQuery("UPDATE t_avis_client SET statut = 'LU', dt_LU = NOW(), dt_UPDATED = NOW()"
                    + " WHERE id = ?1 AND statut = 'NOUVEAU'").setParameter(1, id).executeUpdate();
        }
        List<Object[]> l = em.createNativeQuery("SELECT " + COLONNES + " FROM t_avis_client WHERE id = ?1")
                .setParameter(1, id).getResultList();
        if (l.isEmpty()) {
            return null;
        }
        Object[] r = l.get(0);
        JSONObject j = json(r);
        /* autres avis du meme appareil : repere un client qui revient, ou des envois en serie */
        if (r[19] != null) {
            j.put("memeAppareil",
                    ((Number) em
                            .createNativeQuery("SELECT COUNT(*) FROM t_avis_client WHERE empreinte = ?1 AND id <> ?2")
                            .setParameter(1, r[19]).setParameter(2, id).getSingleResult()).intValue());
        }
        return j;
    }

    /** Statut (NOUVEAU, LU, TRAITE) et note interne. */
    public void traiter(String id, String statut, String noteInterne) {
        if (!"NOUVEAU".equals(statut) && !"LU".equals(statut) && !"TRAITE".equals(statut)) {
            throw new AvisRefus("Statut inconnu.");
        }
        int n = em
                .createNativeQuery("UPDATE t_avis_client SET statut = ?1, note_interne = ?2,"
                        + " dt_LU = COALESCE(dt_LU, NOW()), dt_UPDATED = NOW() WHERE id = ?3")
                .setParameter(1, statut).setParameter(2, Texte.libre(noteInterne, 1500)).setParameter(3, id)
                .executeUpdate();
        if (n == 0) {
            throw new AvisRefus("Avis introuvable.");
        }
    }

    /**
     * Repond au client par WhatsApp (numero laisse) ou e-mail. L'avis passe a TRAITE. Le texte de la reponse est garde
     * avec l'avis, jamais ecrit dans les journaux.
     */
    public JSONObject repondre(String id, String canal, String texte, String auteur) {
        JSONObject a = detail(id, false);
        if (a == null) {
            throw new AvisRefus("Avis introuvable.");
        }
        String t = Texte.libre(texte, 1000);
        if (t == null) {
            throw new AvisRefus("Écrivez la réponse.");
        }
        if (!a.getBoolean("rappel")) {
            throw new AvisRefus("Le client n'a pas accepté d'être recontacté.");
        }
        JSONObject r;
        if ("WHATSAPP".equals(canal)) {
            if (a.getString("telephone").isEmpty()) {
                throw new AvisRefus("Le client n'a pas laissé de numéro.");
            }
            r = whatsAppService.envoyerTexte(a.getString("telephone"), t);
        } else if ("EMAIL".equals(canal)) {
            if (a.getString("email").isEmpty()) {
                throw new AvisRefus("Le client n'a pas laissé d'e-mail.");
            }
            r = envoyerEmail(a.getString("email"), "Votre avis — " + pharmacie()[0], t);
        } else {
            throw new AvisRefus("Canal inconnu.");
        }
        if (!r.optBoolean("success")) {
            em.createNativeQuery("UPDATE t_avis_client SET statut_reponse = 'ECHEC', canal_reponse = ?1,"
                    + " dt_UPDATED = NOW() WHERE id = ?2").setParameter(1, canal).setParameter(2, id).executeUpdate();
            return r;
        }
        em.createNativeQuery("UPDATE t_avis_client SET reponse = ?1, canal_reponse = ?2, statut_reponse = ?3,"
                + " dt_REPONSE = NOW(), auteur_reponse = ?4, statut = 'TRAITE', dt_LU = COALESCE(dt_LU, NOW()),"
                + " dt_UPDATED = NOW() WHERE id = ?5").setParameter(1, t).setParameter(2, canal)
                .setParameter(3, r.getString("statut")).setParameter(4, auteur).setParameter(5, id).executeUpdate();
        return r;
    }

    private JSONObject envoyerEmail(String destinataire, String objet, String texte) {
        try {
            Mail m = new Mail();
            m.setReceiverAddres(destinataire);
            m.setSubject(objet);
            m.setMessage(texte);
            new Thread(m, "avis-email").start();
            return new JSONObject().put("success", true).put("statut", "ENVOYE").put("message",
                    "E-mail remis au serveur de messagerie.");
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Avis : e-mail de reponse non envoye", e);
            return new JSONObject().put("success", false).put("statut", "ECHEC").put("message",
                    "L'e-mail n'a pas pu être envoyé.");
        }
    }

    /* ------------------------------------------------------------------ analyse */

    /** Analyse de la periode, comparee a la periode precedente de meme duree. */
    public JSONObject analyse(LocalDate du, LocalDate au) {
        long jours = ChronoUnit.DAYS.between(du, au) + 1;
        List<Avis> l = lignes(du, au).stream().map(AvisClientService::avis).collect(Collectors.toList());
        List<Avis> avant = lignes(du.minusDays(jours), du.minusDays(1)).stream().map(AvisClientService::avis)
                .collect(Collectors.toList());
        JSONObject r = Analyse.analyser(l, avant, du, au, personnel());
        return r.put("success", true).put("du", du.toString()).put("au", au.toString());
    }

    /** Personnel actif : prenom et nom (forme de comparaison) -> « Prenom NOM (login) ». */
    @SuppressWarnings("unchecked")
    Map<String, String> personnel() {
        Map<String, String> m = new HashMap<>();
        for (Object[] u : (List<Object[]>) em
                .createNativeQuery(
                        "SELECT str_FIRST_NAME, str_LAST_NAME, str_LOGIN FROM t_user WHERE str_STATUT = 'enable'")
                .getResultList()) {
            String p = StringUtils.defaultString((String) u[0]).trim(),
                    n = StringUtils.defaultString((String) u[1]).trim();
            if (!p.isEmpty() || !n.isEmpty()) {
                m.put(Texte.plat(p + " " + n), (p + " " + n.toUpperCase(java.util.Locale.FRANCE)).trim() + " ("
                        + StringUtils.defaultString((String) u[2]) + ")");
            }
        }
        return m;
    }

    /** Nombre d'avis nouveaux (pastille du menu). */
    public int nouveaux() {
        return ((Number) em.createNativeQuery("SELECT COUNT(*) FROM t_avis_client WHERE statut = 'NOUVEAU'")
                .getSingleResult()).intValue();
    }
}
