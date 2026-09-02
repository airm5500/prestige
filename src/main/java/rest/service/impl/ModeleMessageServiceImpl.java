package rest.service.impl;

import dal.ModeleMessage;
import java.time.LocalDateTime;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ModeleMessageService;

@Stateless
public class ModeleMessageServiceImpl implements ModeleMessageService {

    private static final Logger LOG = Logger.getLogger(ModeleMessageServiceImpl.class.getName());
    static final int LIBELLE_MAX = 80;
    static final int CONTENU_MAX = 1000;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject lister(String canal, boolean tous) {
        JSONArray data = new JSONArray();
        try {
            List<ModeleMessage> modeles = em
                    .createNamedQuery(tous ? "ModeleMessage.findAll" : "ModeleMessage.findActifs", ModeleMessage.class)
                    .getResultList();
            for (ModeleMessage m : modeles) {
                if (!tous && !m.convientAuCanal(canal)) {
                    continue;
                }
                data.put(new JSONObject().put("id", m.getId()).put("libelle", m.getLibelle()).put("canal", m.getCanal())
                        .put("contenu", m.getContenu()).put("actif", m.isActif()));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste des modeles", e);
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    @Override
    public JSONObject enregistrer(String id, String libelle, String canal, String contenu) {
        String lib = StringUtils.trimToEmpty(libelle);
        String cont = StringUtils.trimToEmpty(contenu);
        String can = StringUtils.trimToEmpty(canal).toUpperCase(java.util.Locale.ROOT);
        if (lib.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Le libellé est obligatoire");
        }
        if (lib.length() > LIBELLE_MAX) {
            return new JSONObject().put("success", false).put("msg",
                    "Le libellé ne doit pas dépasser " + LIBELLE_MAX + " caractères");
        }
        if (cont.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Le contenu du message est obligatoire");
        }
        if (cont.length() > CONTENU_MAX) {
            return new JSONObject().put("success", false).put("msg",
                    "Le contenu ne doit pas dépasser " + CONTENU_MAX + " caractères");
        }
        if (!ModeleMessage.CANAL_SMS.equals(can) && !ModeleMessage.CANAL_WHATSAPP.equals(can)) {
            can = ModeleMessage.CANAL_TOUS;
        }
        try {
            ModeleMessage existant = StringUtils.isBlank(id) ? null : em.find(ModeleMessage.class, id.trim());
            long doublons = em
                    .createQuery("SELECT COUNT(m) FROM ModeleMessage m WHERE UPPER(m.libelle) = :lib AND m.id <> :id",
                            Long.class)
                    .setParameter("lib", lib.toUpperCase(java.util.Locale.ROOT))
                    .setParameter("id", existant == null ? "" : existant.getId()).getSingleResult();
            if (doublons > 0) {
                return new JSONObject().put("success", false).put("msg", "Un modèle « " + lib + " » existe déjà");
            }
            ModeleMessage m = existant == null ? new ModeleMessage() : existant;
            m.setLibelle(lib);
            m.setCanal(can);
            m.setContenu(cont);
            m.setUpdatedAt(LocalDateTime.now());
            if (existant == null) {
                em.persist(m);
            }
            return new JSONObject().put("success", true).put("id", m.getId()).put("msg",
                    existant == null ? "Modèle créé" : "Modèle modifié");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "enregistrement du modele", e);
            return new JSONObject().put("success", false).put("msg", "L'enregistrement a échoué");
        }
    }

    @Override
    public JSONObject basculer(String id) {
        try {
            ModeleMessage m = em.find(ModeleMessage.class, id);
            if (m == null) {
                return new JSONObject().put("success", false).put("msg", "Modèle introuvable");
            }
            m.setActif(!m.isActif());
            m.setUpdatedAt(LocalDateTime.now());
            return new JSONObject().put("success", true).put("actif", m.isActif());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "bascule du modele", e);
            return new JSONObject().put("success", false).put("msg", "L'opération a échoué");
        }
    }
}
