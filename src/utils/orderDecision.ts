const orderAction = {
    SEND_QUOTE: "SEND_QUOTE",
    PENDING_SUBMITTED: "PENDING_SUBMITTED",
    PENDING_DRIVER_ASSIGNED: "PENDING_DRIVER_ASSIGNED",
    PENDING_DRIVER_UNASSIGNED: "PENDING_DRIVER_UNASSIGNED"
}

const orderDecision = (order: any, driverId?: String) => {
    if (order) {
        if (order.status == "pending" && order.orderDetails.status == "submitted") {
            return orderAction.SEND_QUOTE
        }
        if (order.status == "pending" && order.orderDetails.status == "quoting") {
            return orderAction.PENDING_DRIVER_ASSIGNED
        }




    }

}

export const orderConfirmedCondition = (order) => {
    console.log("order", order)
    if (order.status == "converted_to_order"
        || order.status == "assigned"
        || order.status == "arrived"
        || order.status == "picked_up") {
        return true
    }
    return false

}

export default orderDecision