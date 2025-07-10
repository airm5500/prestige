/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.repo;

import java.util.List;
import java.util.Optional;

/**
 *
 * @author koben
 *
 * @param <T>
 */
public interface AbstractRepo<T /* extends Entity */> {

    void save(T entity);

    void delete(T entity);

    T update(T entity);

    int deleteById(String entityId);

    Optional<T> findById(String entityId);

    int deleteById(Long entityId);

    Optional<T> findById(Long entityId);

    int deleteById(Integer entityId);

    Optional<T> findById(Integer entityId);

    List<T> findAll();

}
