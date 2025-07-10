package rest.service.dto.builder;

import commonTasks.dto.FamilleDTO;
import commonTasks.dto.UserDTO;
import dal.TFamille;
import dal.TUser;
import java.util.Objects;

/**
 *
 * @author koben
 */
public class CommonBuilder {

    public static FamilleDTO produit(TFamille f) {
        FamilleDTO o = new FamilleDTO();
        o.setStrNAME(f.getStrNAME());
        o.setIntCIP(f.getIntCIP());
        o.setIntEAN13(f.getIntEAN13());
        o.setStrDESCRIPTION(f.getStrDESCRIPTION());
        return o;
    }

    public static UserDTO user(TUser user) {
        if (Objects.nonNull(user)) {
            UserDTO us = new UserDTO();
            us.setStrFIRSTNAME(user.getStrFIRSTNAME());
            us.setStrLASTNAME(user.getStrLASTNAME());
            us.setFullName(String.format("%s %s", user.getStrFIRSTNAME(), user.getStrLASTNAME()));
            return us;
        }
        return null;

    }
}
