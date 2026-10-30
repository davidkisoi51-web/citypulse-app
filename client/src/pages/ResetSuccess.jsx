import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
export default function ResetSuccess(){
    return(
        <AuthLayout title="Password Changed!" 
            subtitle="Your password was reset successfully"
            footer={
            <Link to="/login"> Login </Link>}>
        </AuthLayout>
    )
}