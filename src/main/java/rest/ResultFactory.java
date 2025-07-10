/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

/**
 *
 * @author Kobena
 */
public class ResultFactory {

    public static <T> Result<T> getSuccessResult(T data, long total) {
        return new Result(true, data, total);
    }

    public static <T> Result<T> getSuccessResult(T data) {
        return new Result(data);
    }

    public static <T> Result<T> getSuccessResult(T data, String msg, long total) {
        return new Result(true, data, total);
    }

    public static <T> Result<T> getSuccessResultMsg(String msg) {
        return new Result(true, msg);
    }

    public static <T> Result<T> getFailResult(String msg) {
        return new Result(false, msg);
    }

    public static <T> Result<T> getSuccessResult(T data, T metaData, long total) {
        return new Result(true, data, metaData, total);
    }

    public static <T> Result<T> getSuccessResultMsg() {
        return new Result(true, "Opération effectuée avec succès");
    }

    public static <T> Result<T> getFailResult() {
        return new Result(false, "Erreur!!: L'opération n'a pas abouti");
    }

    private ResultFactory() {
    }

}
