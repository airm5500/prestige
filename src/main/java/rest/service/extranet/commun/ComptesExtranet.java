package rest.service.extranet.commun;

import java.security.GeneralSecurityException;
import java.util.List;
import javax.persistence.EntityManager;
import org.json.JSONObject;

/**
 * Table {@code extranet_compte} : identifiant et mot de passe CHIFFRE de chaque extranet, saisis par l'administrateur.
 * Le mot de passe ne sort jamais d'ici en clair, sauf vers la connexion automatique ({@link #identifiants}) ; l'ecran
 * ne recoit que l'identifiant et « mot de passe enregistre : oui / non ».
 */
public final class ComptesExtranet {

    public static final int IDENTIFIANT_MAX = 200;
    public static final int MOT_DE_PASSE_MAX = 200;

    private final EntityManager em;
    private final ChiffrementExtranet chiffrement;

    public ComptesExtranet(EntityManager em, ChiffrementExtranet chiffrement) {
        this.em = em;
        this.chiffrement = chiffrement;
    }

    @SuppressWarnings("unchecked")
    private Object[] ligne(SourceExtranet s) {
        List<Object[]> l = em
                .createNativeQuery("SELECT identifiant, mot_de_passe_chiffre, modifie_le, modifie_par,"
                        + " page_connexion, champ_identifiant FROM extranet_compte WHERE source = ?1")
                .setParameter(1, s.name()).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    /** Ce que l'ecran peut voir : jamais le mot de passe. */
    public JSONObject publique(SourceExtranet s) {
        return publique(s, null);
    }

    /** Avec la page de connexion par defaut de l'extranet configure (utilisee quand aucune n'est saisie). */
    public JSONObject publique(SourceExtranet s, String adresseExtranet) {
        Object[] l = ligne(s);
        String defaut = s.pageConnexionParDefaut(adresseExtranet);
        JSONObject o = new JSONObject().put("source", s.name()).put("enregistre", l != null)
                .put("pageConnexionParDefaut", defaut == null ? JSONObject.NULL : defaut);
        if (l != null) {
            o.put("identifiant", l[0]).put("motDePasseEnregistre", l[1] != null)
                    .put("modifieLe", l[2] == null ? JSONObject.NULL : l[2].toString())
                    .put("modifiePar", l[3] == null ? JSONObject.NULL : l[3])
                    .put("pageConnexion", l[4] == null ? JSONObject.NULL : l[4])
                    .put("champIdentifiant", l[5] == null ? JSONObject.NULL : l[5]);
        }
        return o;
    }

    /** Identifiants en clair pour la connexion automatique ; null si aucun. */
    public ConnexionExtranet.Identifiants identifiants(SourceExtranet s) throws GeneralSecurityException {
        return identifiants(s, null);
    }

    /**
     * Avec l'adresse de l'extranet configure : sans page saisie, la page de connexion par defaut de l'extranet reel
     * (Ubipharm : auth.ubipharm.com) ; une page saisie passe toujours avant.
     */
    public ConnexionExtranet.Identifiants identifiants(SourceExtranet s, String adresseExtranet)
            throws GeneralSecurityException {
        Object[] l = ligne(s);
        if (l == null) {
            return null;
        }
        String page = l[4] != null ? (String) l[4] : s.pageConnexionParDefaut(adresseExtranet);
        String empreinte = String.valueOf(l[2]) + "|" + Integer.toHexString(String.valueOf(l[1]).hashCode());
        return new ConnexionExtranet.Identifiants((String) l[0], chiffrement.dechiffrer((String) l[1]),
                empreinte + "|" + page + "|" + l[5], page, (String) l[5]);
    }

    /**
     * Page de connexion saisie : chemin (« /login ») ou adresse complete, GARDEE TELLE QUELLE, sur le site de
     * l'extranet ou sur un serveur du meme domaine (connexion unique : auth.ubipharm.com). Vide : null (page « / »).
     *
     * @throws IllegalArgumentException
     *             adresse d'un autre site ou chemin invalide
     */
    public static String normaliserPage(String saisie, String adresseExtranet) {
        String v = saisie == null ? "" : saisie.trim();
        if (v.isEmpty()) {
            return null;
        }
        if (v.length() > 1000 || v.contains("\\") || v.contains("#") || v.chars().anyMatch(c -> c < 0x21 || c > 0x7E)) {
            throw new IllegalArgumentException(
                    "Page de connexion invalide : copiez l'adresse affichée par le navigateur");
        }
        if (v.regionMatches(true, 0, "http", 0, 4)) {
            java.net.URI u;
            try {
                u = java.net.URI.create(v);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Page de connexion invalide : copiez l'adresse affichée par le navigateur");
            }
            java.net.URI a = java.net.URI.create(adresseExtranet);
            if (!ConnexionExtranet.memeDomaine(a, u)) {
                String d = ConnexionExtranet.domaine(a.getHost());
                throw new IllegalArgumentException("La page de connexion doit être sur " + a.getHost()
                        + (d == null ? "" : " ou un autre serveur de " + d) + " (en " + a.getScheme() + ")");
            }
            return v;
        }
        if (!v.startsWith("/") || v.startsWith("//")) {
            throw new IllegalArgumentException(
                    "Page de connexion invalide : indiquez l'adresse complète ou un chemin comme /login");
        }
        return v;
    }

    /** Nom de champ HTML : lettres, chiffres, _ - . [ ] ; vide : null (detection automatique). */
    public static String normaliserChamp(String saisie) {
        String v = saisie == null ? "" : saisie.trim();
        if (v.isEmpty()) {
            return null;
        }
        if (!v.matches("[A-Za-z0-9_.\\-\\[\\]]{1,100}")) {
            throw new IllegalArgumentException("Nom du champ identifiant invalide");
        }
        return v;
    }

    /**
     * Enregistre. Mot de passe vide ou null : l'ancien est garde (il doit alors exister).
     *
     * @return null si accepte, sinon le motif du refus
     */
    public String enregistrer(SourceExtranet s, String identifiant, String motDePasse, String par)
            throws GeneralSecurityException {
        return enregistrer(s, identifiant, motDePasse, null, null, par);
    }

    /** Avec la page de connexion et le champ identifiant (deja normalises ; null : par defaut). */
    public String enregistrer(SourceExtranet s, String identifiant, String motDePasse, String pageConnexion,
            String champIdentifiant, String par) throws GeneralSecurityException {
        String id = identifiant == null ? "" : identifiant.trim();
        if (id.isEmpty()) {
            return "L'identifiant est obligatoire";
        }
        if (id.length() > IDENTIFIANT_MAX) {
            return "L'identifiant dépasse " + IDENTIFIANT_MAX + " caractères";
        }
        if (champIdentifiant != null && champIdentifiant.trim().equalsIgnoreCase(id)) {
            return "La case « Nom de la case » ne doit pas contenir votre identifiant : laissez-la vide";
        }
        boolean nouveau = motDePasse != null && !motDePasse.isEmpty();
        if (nouveau && motDePasse.length() > MOT_DE_PASSE_MAX) {
            return "Le mot de passe dépasse " + MOT_DE_PASSE_MAX + " caractères";
        }
        Object[] l = ligne(s);
        if (!nouveau && l == null) {
            return "Le mot de passe est obligatoire";
        }
        String chiffre = nouveau ? chiffrement.chiffrer(motDePasse) : (String) l[1];
        String auteur = par == null ? null : par.length() > 40 ? par.substring(0, 40) : par;
        em.createNativeQuery("INSERT INTO extranet_compte (source, identifiant, mot_de_passe_chiffre, modifie_le,"
                + " modifie_par, page_connexion, champ_identifiant) VALUES (?1, ?2, ?3, NOW(6), ?4, ?5, ?6)"
                + " ON DUPLICATE KEY UPDATE identifiant = VALUES(identifiant),"
                + " mot_de_passe_chiffre = VALUES(mot_de_passe_chiffre), modifie_le = VALUES(modifie_le),"
                + " modifie_par = VALUES(modifie_par), page_connexion = VALUES(page_connexion),"
                + " champ_identifiant = VALUES(champ_identifiant)").setParameter(1, s.name()).setParameter(2, id)
                .setParameter(3, chiffre).setParameter(4, auteur).setParameter(5, pageConnexion)
                .setParameter(6, champIdentifiant).executeUpdate();
        return null;
    }

    public int effacer(SourceExtranet s) {
        return em.createNativeQuery("DELETE FROM extranet_compte WHERE source = ?1").setParameter(1, s.name())
                .executeUpdate();
    }
}
