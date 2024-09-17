import { responseMaker } from "../../services/responseMaker"
import { db } from "../../../data"

exports.handler = async (event) => {
    try {
        return responseMaker(200, )
    } catch (error) {
        return responseMaker( 500, )
    } 
}