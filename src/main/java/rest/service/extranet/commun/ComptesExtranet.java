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
        List<Object[]> l = em.createNativeQuery("SELECT identifiant, mot_de_passe_chiffre, modifie_le, modifie_par"
                + " FROM extranet_compte WHERE source = ?1").setParameter(1, s.name()).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    /** Ce que l'ecran peut voir : jamais le mot de passe. */
    public JSONObject publique(SourceExtranet s) {
        Object[] l = ligne(s);
        JSONObject o = new JSONObject().put("source", s.name()).put("enregistre", l != null);
        if (l != null) {
            o.put("identifiant", l[0]).put("motDePasseEnregistre", l[1] != null)
                    .put("modifieLe", l[2] == null ? JSONObject.NULL : l[2].toString())
                    .put("modifiePar", l[3] == null ? JSONObject.NULL : l[3]);
        }
        return o;
    }

    /** Identifiants en clair pour la connexion automatique ; null si aucun. */
    public ConnexionExtranet.Identifiants identifiants(SourceExtranet s) throws GeneralSecurityException {
        Object[] l = ligne(s);
        if (l == null) {
            return null;
        }
        String empreinte = String.valueOf(l[2]) + "|" + Integer.toHexString(String.valueOf(l[1]).hashCode());
        return new ConnexionExtranet.Identifiants((String) l[0], chiffrement.dechiffrer((String) l[1]), empreinte);
    }

    /**
     * Enregistre. Mot de passe vide ou null : l'ancien est garde (il doit alors exister).
     *
     * @return null si accepte, sinon le motif du refus
     */
    public String enregistrer(SourceExtranet s, String identifiant, String motDePasse, String par)
            throws GeneralSecurityException {
        String id = identifiant == null ? "" : identifiant.trim();
        if (id.isEmpty()) {
            return "L'identifiant est obligatoire";
        }
        if (id.length() > IDENTIFIANT_MAX) {
            return "L'identifiant dépasse " + IDENTIFIANT_MAX + " caractères";
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
                + " modifie_par) VALUES (?1, ?2, ?3, NOW(6), ?4) ON DUPLICATE KEY UPDATE identifiant = VALUES(identifiant),"
                + " mot_de_passe_chiffre = VALUES(mot_de_passe_chiffre), modifie_le = VALUES(modifie_le),"
                + " modifie_par = VALUES(modifie_par)").setParameter(1, s.name()).setParameter(2, id)
                .setParameter(3, chiffre).setParameter(4, auteur).executeUpdate();
        return null;
    }

    public int effacer(SourceExtranet s) {
        return em.createNativeQuery("DELETE FROM extranet_compte WHERE source = ?1").setParameter(1, s.name())
                .executeUpdate();
    }
}
