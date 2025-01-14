/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.repo;

import java.util.Optional;
import javax.persistence.EntityManager;
import rest.repo.AbstractRepo;

/**
 *
 * @author koben
 */
public abstract class AbstractRepoImpl<T> implements AbstractRepo<T> {

    protected abstract EntityManager getEntityManager();
    private Class<T> entityClass;

    public AbstractRepoImpl(Class<T> entityClass) {
        this.entityClass = entityClass;
    }

    @Override
    public void save(T entity) {
        getEntityManager().persist(entity);

    }

    @Override
    public void delete(T entity) {
        getEntityManager().remove(entity);
    }

    @Override
    public T update(T entity) {
        return getEntityManager().merge(entity);
    }

    @Override
    public int deleteById(Long entityId) {
        T obj = getEntityManager().find(entityClass, entityId);
        if (obj != null) {
            getEntityManager().remove(getEntityManager().merge(obj));
            return 1;
        }
        return 0;
    }

    @Override
    public Optional<T> findById(Long entityId) {
        try {
            T obj = getEntityManager().find(entityClass, entityId);
            if (obj != null) {
                return Optional.of(obj);
            }
            return Optional.empty();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Optional.empty();
        }
    }

    @Override
    public int deleteById(String entityId) {
        T obj = getEntityManager().find(entityClass, entityId);
        if (obj != null) {
            getEntityManager().remove(getEntityManager().merge(obj));
            return 1;
        }
        return 0;
    }

    @Override
    public Optional<T> findById(String entityId) {
        try {
            T obj = getEntityManager().find(entityClass, entityId);
            if (obj != null) {
                return Optional.of(obj);
            }
            return Optional.empty();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Optional.empty();
        }
    }

    @Override
    public int deleteById(Integer entityId) {
     T obj = getEntityManager().find(entityClass, entityId);
        if (obj != null) {
            getEntityManager().remove(getEntityManager().merge(obj));
            return 1;
        }
        return 0;
    }

    @Override
    public Optional<T> findById(Integer entityId) {
         try {
            T obj = getEntityManager().find(entityClass, entityId);
            if (obj != null) {
                return Optional.of(obj);
            }
            return Optional.empty();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Optional.empty();
        }
    }
//  @Override
//public Optional<T> find(Class<T> clazz, ID id) {
//if (id == null) {
//throw new IllegalArgumentException("ID cannot be null");
//}
//return Optional.ofNullable(entityManager.find(clazz, id));
//}
}
