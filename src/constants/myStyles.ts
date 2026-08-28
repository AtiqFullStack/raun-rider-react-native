import { fontScale, vw } from "../utils/scaling";
import { Colors } from "./Colors";

export const MY_STYLES ={
    CONTENT_CONTAINER :{
        flexGrow:1,
        paddingHorizontal:vw(3),
        paddingTop:10
    },
    CARD :{
        borderRadius:fontScale(10),
        padding:10,
        marginBottom:10,
        backgroundColor:Colors.white
        
    }
}