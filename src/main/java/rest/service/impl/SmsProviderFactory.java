package rest.service.impl;

import dal.SmsFournisseur;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import rest.service.SmsFournisseurService;
import rest.service.SmsService;
import util.AppParameters;
import util.sms.LeTextoSmsProvider;
import util.sms.OrangeSmsProvider;
import util.sms.SmsProvider;
import util.sms.SmsProviderCatalog;

/**
 * Construit l'implémentation {@link SmsProvider} correspondant à un fournisseur configuré en base.
 *
 * {@link #current()} retourne le fournisseur en vigueur pour les envois ; en l'absence de configuration (base pas
 * encore migrée), repli sur Orange avec les valeurs de dicisms.properties pour ne jamais bloquer les envois.
 *
 * @author koben
 */
@Stateless
public class SmsProviderFactory {

    @EJB
    private SmsFournisseurService smsFournisseurService;
    @EJB
    private SmsService smsService;

    /** Provider du fournisseur en vigueur (repli Orange si aucun n'est configuré), ou null si code inconnu. */
    public SmsProvider current() {
        SmsFournisseur enVigueur = smsFournisseurService.getEnVigueur();
        if (enVigueur == null) {
            return new OrangeSmsProvider(smsFournisseurService.findByCode(SmsProviderCatalog.CODE_ORANGE),
                    smsService::getValidAccessToken, AppParameters.getInstance());
        }
        return forFournisseur(enVigueur);
    }

    /** Provider pour un fournisseur donné, ou null si son code n'est pas pris en charge. */
    public SmsProvider forFournisseur(SmsFournisseur fournisseur) {
        if (fournisseur == null) {
            return null;
        }
        switch (fournisseur.getCode()) {
        case SmsProviderCatalog.CODE_ORANGE:
            return new OrangeSmsProvider(fournisseur, smsService::getValidAccessToken, AppParameters.getInstance());
        case SmsProviderCatalog.CODE_LETEXTO:
            return new LeTextoSmsProvider(fournisseur);
        default:
            return null;
        }
    }

}
