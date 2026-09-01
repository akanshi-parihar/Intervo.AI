import genToken from "../config/token.js"
import User from "../models/user.model.js"


export const googleAuth = async (req,res) => {
    try {
        const {name , email} = req.body
        if (!email) {
            return res.status(400).json({ message: "Email is required" })
        }
        let user = await User.findOne({email})
        if(!user){
            user = await User.create({
                name: name || email.split("@")[0] , 
                email
            })
        }
        let token = await genToken(user._id)

        const isProd = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
        res.cookie("token" , token , {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json(user)

    } catch (error) {
        return res.status(500).json({message:`Google auth error ${error.message || error}`})
    }
    
}

export const logOut = async (req,res) => {
    try {
        const isProd = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax"
        })
        return res.status(200).json({message:"LogOut Successfully"})
    } catch (error) {
         return res.status(500).json({message:`Logout error ${error.message || error}`})
    }
    
}

