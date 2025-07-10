/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

/**
 *
 * @author koben
 */
public final class Condition {

    private final String leftHand;
    private final String rightHand;
    private final OperationType operation;
    private final LogicalOperatorType operator;

    public enum LogicalOperatorType {
        AND, OR, END
    }

    public enum OperationType {
        EQUAL, NOT_EQUAL, GREATER_THAN, LESS_THAN, LIKE
    }

    public Condition(String leftHand, String rightHand, OperationType operation, LogicalOperatorType operator) {
        this.leftHand = leftHand;
        this.rightHand = rightHand;
        this.operation = operation;
        this.operator = operator;
    }

    public String getLeftHand() {
        return leftHand;
    }

    public String getRightHand() {
        return rightHand;
    }

    public OperationType getOperation() {
        return operation;
    }

    public LogicalOperatorType getOperator() {
        return operator;
    }

}
