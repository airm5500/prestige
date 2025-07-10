/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ManagedUserVM;
import dal.TOfficine;
import dal.TPrivilege;
import dal.TRoleUser;
import dal.TUser;
import rest.service.dto.AccountInfoDTO;

import java.util.List;
import javax.ejb.Local;
import javax.servlet.http.HttpServletRequest;

/**
 *
 * @author koben
 */
@Local
public interface UserService {

    TUser connexion(ManagedUserVM managedUser, HttpServletRequest request);

    boolean deConnexion(HttpServletRequest request, TUser user);

    TRoleUser getTRoleUser(String userId);

    TOfficine getOfficine();

    List<TPrivilege> getAllPrivilege(TUser oTUser);

    AccountInfoDTO getAccount(TUser oTUser);

    TUser updateProfilUser(AccountInfoDTO accountInfo);
}
