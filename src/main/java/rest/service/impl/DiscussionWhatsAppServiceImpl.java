package rest.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import rest.service.DiscussionWhatsAppService;
import rest.service.dto.DiscussionWhatsAppDTO;
import rest.service.impl.whatsapp.DiscussionRegles;
import util.Constant;
import util.TelephoneCi;

/** Fils de discussion WhatsApp (demande du 25/10) : lectures ; l'envoi d'une reponse est dans WhatsAppServiceImpl. */
@Stateless
public class DiscussionWhatsAppServiceImpl implements DiscussionWhatsAppService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static String date(Object o) {
        return o == null ? "" : StringUtils.left(String.valueOf(o), 19);
    }

    private static long n(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    /* consentement WhatsApp (TINYINT(1)) : Boolean ou nombre selon le pilote ; seul un 0 explicite est un refus */
    private static boolean refus(Object o) {
        return o instanceof Boolean ? !((Boolean) o) : o instanceof Number && ((Number) o).intValue() == 0;
    }

    /* sens est un CHAR(1) : rendu comme Character par le pilote */
    private static String texte(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static String numero(String saisie) {
        TelephoneCi.Resultat t = TelephoneCi.controler(saisie);
        return t.isValide() ? t.getLocal() : StringUtils.defaultString(saisie).replaceAll("\\D", "");
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<DiscussionWhatsAppDTO.Discussion> discussions(String filtre, boolean nonLues) {
        String f = StringUtils.trimToEmpty(filtre);
        StringBuilder sql = new StringBuilder(
                "SELECT d.numero, d.nl, d.tot, d.texte, d.sens, d.created_at, d.cid, d.np,"
                        + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,''))), c.bool_CONSENT_WHATSAPP"
                        + " FROM (SELECT g.numero, g.mid, g.nl, g.tot, l.texte, l.sens, l.created_at,"
                        + " (SELECT x.client_id FROM whatsapp_discussion x WHERE x.numero = g.numero AND x.client_id IS NOT NULL"
                        + " ORDER BY x.id DESC LIMIT 1) cid,"
                        + " (SELECT x.nom_profil FROM whatsapp_discussion x WHERE x.numero = g.numero AND x.nom_profil IS NOT NULL"
                        + " ORDER BY x.id DESC LIMIT 1) np"
                        + " FROM (SELECT numero, MAX(id) mid, SUM(sens = 'E' AND lu = 0) nl, COUNT(*) tot FROM whatsapp_discussion"
                        + " GROUP BY numero) g JOIN whatsapp_discussion l ON l.id = g.mid) d"
                        + " LEFT JOIN t_client c ON c.lg_CLIENT_ID = d.cid WHERE 1 = 1");
        if (nonLues) {
            sql.append(" AND d.nl > 0");
        }
        /*
         * recherche sur le nom du client, le nom du profil, le texte ; et sur le numero si elle contient des chiffres
         */
        String chiffres = f.replaceAll("\\D", "");
        if (!f.isEmpty()) {
            sql.append(" AND (d.np LIKE ?1 OR CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,''))"
                    + " LIKE ?1 OR EXISTS (SELECT 1 FROM whatsapp_discussion t WHERE t.numero = d.numero AND t.texte LIKE ?1)"
                    + (chiffres.isEmpty() ? "" : " OR d.numero LIKE ?2") + ")");
        }
        sql.append(" ORDER BY d.mid DESC LIMIT ").append(Constant.WHATSAPP_DISCUSSION_LISTE_MAX);
        Query q = em.createNativeQuery(sql.toString());
        if (!f.isEmpty()) {
            q.setParameter(1, "%" + f + "%");
            if (!chiffres.isEmpty()) {
                q.setParameter(2, "%" + chiffres + "%");
            }
        }
        List<DiscussionWhatsAppDTO.Discussion> r = new ArrayList<>();
        for (Object[] l : (List<Object[]>) q.getResultList()) {
            r.add(DiscussionWhatsAppDTO.Discussion.builder().numero((String) l[0]).nonLus(n(l[1])).total(n(l[2]))
                    .dernier(DiscussionRegles.extrait((String) l[3])).dernierSens(texte(l[4])).date(date(l[5]))
                    .clientId((String) l[6]).nomProfil((String) l[7]).client(StringUtils.trimToNull((String) l[8]))
                    .stop(refus(l[9])).build());
        }
        return r;
    }

    @Override
    @SuppressWarnings("unchecked")
    public DiscussionWhatsAppDTO fil(String saisie) {
        String num = numero(saisie);
        List<DiscussionWhatsAppDTO.Discussion> d = discussions(num, false);
        DiscussionWhatsAppDTO.Discussion disc = d.stream().filter(x -> num.equals(x.getNumero())).findFirst()
                .orElse(null);
        List<Object[]> lignes = em.createNativeQuery("SELECT w.id, w.sens, w.type, w.texte, w.piece_nom, w.statut,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME,''),' ',COALESCE(u.str_LAST_NAME,''))), w.created_at"
                + " FROM whatsapp_discussion w LEFT JOIN t_user u ON u.lg_USER_ID = w.lg_USER_ID WHERE w.numero = ?1"
                + " ORDER BY w.id DESC LIMIT " + Constant.WHATSAPP_DISCUSSION_FIL_MAX).setParameter(1, num)
                .getResultList();
        List<DiscussionWhatsAppDTO.Message> messages = new ArrayList<>();
        for (Object[] l : lignes) {
            messages.add(DiscussionWhatsAppDTO.Message.builder().id(n(l[0])).sens(texte(l[1])).type((String) l[2])
                    .texte(StringUtils.defaultString((String) l[3])).pieceNom((String) l[4]).statut((String) l[5])
                    .auteur(StringUtils.trimToNull((String) l[6])).date(date(l[7])).build());
        }
        Collections.reverse(messages);
        em.createNativeQuery("UPDATE whatsapp_discussion SET lu = 1 WHERE numero = ?1 AND sens = 'E' AND lu = 0")
                .setParameter(1, num).executeUpdate();
        if (disc != null) {
            disc.setNonLus(0);
        }
        return DiscussionWhatsAppDTO.builder().discussion(disc).messages(messages).build();
    }

    @Override
    public long nonLus() {
        return n(em.createNativeQuery("SELECT COUNT(*) FROM whatsapp_discussion WHERE sens = 'E' AND lu = 0")
                .getSingleResult());
    }
}
