package rest.service.impl.whatsapp;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import org.apache.commons.lang3.StringUtils;
import util.Constant;
import util.TelephoneCi;
import util.whatsapp.WhatsAppEnvoi;
import util.whatsapp.WhatsAppWebhook;

/**
 * Fils de discussion WhatsApp (demande du 25/10) : ecriture dans whatsapp_discussion, partagee par le webhook (messages
 * recus, statuts) et par la reponse depuis l'ecran. Classe sans etat : l'EntityManager vient du service appelant.
 */
public final class DiscussionStockage {

    private static final AtomicLong DERNIERE_PURGE = new AtomicLong();

    private DiscussionStockage() {
    }

    /** Numero local a 10 chiffres et client (s'il est seul a porter ce numero) d'un expediteur. */
    public static final class Rattachement {
        public final String numero;
        public final String clientId;

        Rattachement(String numero, String clientId) {
            this.numero = numero;
            this.clientId = clientId;
        }
    }

    /**
     * Rattache un numero recu au fil d'un client : numero valide, ou ancien identifiant a 8 chiffres quand un seul
     * numero a 10 chiffres de la base lui correspond (retour du 24/10). Null si le numero ne peut pas etre rattache.
     */
    @SuppressWarnings("unchecked")
    public static Rattachement rattacher(EntityManager em, String numeroRecu) {
        TelephoneCi.Resultat tel = TelephoneCi.controler(numeroRecu);
        String huit = tel.isValide() ? null : TelephoneCi.ancienIdentifiant(numeroRecu);
        if (!tel.isValide() && huit == null) {
            return null;
        }
        List<Object[]> candidats = em
                .createNativeQuery("SELECT lg_CLIENT_ID, str_ADRESSE FROM t_client"
                        + " WHERE REPLACE(REPLACE(REPLACE(str_ADRESSE,' ',''),'.',''),'-','') LIKE ?1")
                .setParameter(1, "%" + (huit != null ? huit : tel.getLocal().substring(2))).getResultList();
        String local = tel.isValide() ? tel.getLocal() : TelephoneCi.numeroActuel(huit,
                candidats.stream().map(c -> (String) c[1]).collect(Collectors.toList()));
        if (local == null) {
            return null;
        }
        List<String> clients = candidats.stream().filter(c -> {
            TelephoneCi.Resultat t = TelephoneCi.controler((String) c[1]);
            return t.isValide() && t.getLocal().equals(local);
        }).map(c -> (String) c[0]).collect(Collectors.toList());
        return new Rattachement(local, clients.size() == 1 ? clients.get(0) : null);
    }

    /** Message recu : garde dans le fil (une seule fois par identifiant WhatsApp). Rend vrai s'il a ete garde. */
    public static boolean recevoir(EntityManager em, WhatsAppWebhook.Entrant e) {
        if (e == null || (StringUtils.isBlank(e.texte) && StringUtils.isBlank(e.type))) {
            return false;
        }
        Rattachement r = rattacher(em, e.numero);
        if (r == null) {
            return false;
        }
        if (e.messageId != null && ((Number) em
                .createNativeQuery("SELECT COUNT(*) FROM whatsapp_discussion" + " WHERE message_id = ?1 AND sens = 'E'")
                .setParameter(1, e.messageId).getSingleResult()).intValue() > 0) {
            return false;
        }
        purgerSiBesoin(em);
        em.createNativeQuery(
                "INSERT INTO whatsapp_discussion (numero, client_id, sens, type, texte, nom_profil, message_id,"
                        + " lu, created_at) VALUES (?1, ?2, 'E', ?3, ?4, ?5, ?6, 0, NOW())")
                .setParameter(1, r.numero).setParameter(2, r.clientId).setParameter(3, DiscussionRegles.type(e.type))
                .setParameter(4, DiscussionRegles.nettoyer(e.texte)).setParameter(5, StringUtils.left(e.nom, 100))
                .setParameter(6, StringUtils.left(e.messageId, 200)).executeUpdate();
        return true;
    }

    /** Statut d'une reponse envoyee depuis l'ecran (ENVOYE, DELIVRE, LU, ECHEC), suivi par le webhook. */
    public static int statut(EntityManager em, String messageId, String statut) {
        return em.createNativeQuery("UPDATE whatsapp_discussion SET statut = ?1 WHERE message_id = ?2 AND sens = 'S'")
                .setParameter(1, statut).setParameter(2, messageId).executeUpdate();
    }

    /** Reponse envoyee (ou refusee) depuis l'ecran : gardee dans le fil avec son statut et son auteur. */
    public static void sortant(EntityManager em, Rattachement r, String texte, String pieceNom, String type,
            WhatsAppEnvoi.Resultat resultat, String userId) {
        em.createNativeQuery(
                "INSERT INTO whatsapp_discussion (numero, client_id, sens, type, texte, piece_nom, message_id,"
                        + " statut, lg_USER_ID, lu, created_at) VALUES (?1, ?2, 'S', ?3, ?4, ?5, ?6, ?7, ?8, 1, NOW())")
                .setParameter(1, r.numero).setParameter(2, r.clientId).setParameter(3, DiscussionRegles.type(type))
                .setParameter(4, DiscussionRegles.nettoyer(texte)).setParameter(5, StringUtils.left(pieceNom, 150))
                .setParameter(6, resultat.messageId)
                .setParameter(7, resultat.accepte ? (resultat.simule ? "SIMULE" : "ENVOYE") : "ECHEC")
                .setParameter(8, userId).executeUpdate();
    }

    /** Une fois par jour au plus : retire les messages plus anciens que la duree de conservation. */
    static void purgerSiBesoin(EntityManager em) {
        long maintenant = System.currentTimeMillis(), avant = DERNIERE_PURGE.get();
        if (maintenant - avant < 24L * 3600 * 1000 || !DERNIERE_PURGE.compareAndSet(avant, maintenant)) {
            return;
        }
        em.createNativeQuery("DELETE FROM whatsapp_discussion WHERE created_at < DATE_SUB(NOW(), INTERVAL ?1 DAY)")
                .setParameter(1, Constant.WHATSAPP_DISCUSSION_CONSERVATION_JOURS).executeUpdate();
    }
}
