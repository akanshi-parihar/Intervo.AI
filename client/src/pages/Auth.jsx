import React, { useState } from 'react'
import { BsRobot } from "react-icons/bs";
import { IoSparkles } from "react-icons/io5";
import { motion } from "motion/react"
import { FcGoogle } from "react-icons/fc";
import { FaEnvelope, FaUser, FaArrowRight } from "react-icons/fa";
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../utils/firebase';
import axios from 'axios';
import { ServerUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { useNavigate } from 'react-router-dom';

function Auth({ isModel = false }) {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")

    const handleGoogleAuth = async () => {
        setLoading(true)
        setError("")
        try {
            const response = await signInWithPopup(auth, provider)
            let User = response.user
            let userDisplayName = User.displayName || User.email.split('@')[0]
            let userEmail = User.email
            const result = await axios.post(ServerUrl + "/api/auth/google", { name: userDisplayName, email: userEmail }, { withCredentials: true })
            dispatch(setUserData(result.data))
            if (!isModel) {
                navigate('/')
            }
        } catch (err) {
            console.error("Google Auth Error:", err)
            // If Firebase Popup failed (e.g. missing API key, popup blocked, or closed), reveal smooth email/demo login fallback
            setError("Google popup sign-in unavailable. Use email or demo login below.")
            setShowEmailForm(true)
        } finally {
            setLoading(false)
        }
    }

    const handleDirectAuth = async (e) => {
        if (e) e.preventDefault();
        const targetEmail = email.trim() || "candidate@intervo.ai";
        const targetName = name.trim() || "Candidate User";

        setLoading(true);
        setError("");
        try {
            const result = await axios.post(ServerUrl + "/api/auth/google", { name: targetName, email: targetEmail }, { withCredentials: true });
            dispatch(setUserData(result.data));
            if (!isModel) {
                navigate('/');
            }
        } catch (err) {
            console.error("Direct Auth Error:", err);
            setError(err.response?.data?.message || "Failed to sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`
      w-full 
      ${isModel ? "py-4" : "min-h-screen bg-slate-950 flex items-center justify-center px-6 py-20"}
    `}>
            <motion.div
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className={`
        w-full 
        ${isModel ? "max-w-md p-8 rounded-3xl" : "max-w-lg p-12 rounded-[32px]"}
        bg-slate-900 shadow-2xl border border-slate-700
      `}>
                <div className='flex items-center justify-center gap-3 mb-6'>
                    <div className='bg-black text-white p-2 rounded-lg'>
                        <BsRobot size={18} />
                    </div>
                    <h2 className='font-semibold text-lg text-slate-100'>Intervo.AI</h2>
                </div>

                <h1 className='text-2xl md:text-3xl font-semibold text-center leading-snug mb-4 text-slate-100'>
                    Continue with
                    <span className='bg-pink-950 text-pink-400 px-3 py-1 rounded-full inline-flex items-center gap-2 ml-2 text-sm sm:text-base'>
                        <IoSparkles size={16} />
                        AI Smart Interview
                    </span>
                </h1>

                <p className='text-slate-300 text-center text-sm md:text-base leading-relaxed mb-6'>
                    Sign in to start AI-powered mock interviews, track your progress, and unlock performance analytics.
                </p>

                {error && (
                    <div className='mb-4 p-3 bg-red-950/80 border border-red-700 rounded-xl text-red-300 text-xs sm:text-sm text-center'>
                        {error}
                    </div>
                )}

                <div className='space-y-4'>
                    <motion.button
                        disabled={loading}
                        onClick={handleGoogleAuth}
                        whileHover={{ opacity: 0.9, scale: 1.02 }}
                        whileTap={{ opacity: 1, scale: 0.98 }}
                        className='w-full flex items-center justify-center gap-3 py-3 bg-black text-white rounded-full shadow-md hover:bg-slate-800 transition disabled:opacity-50 font-medium'>
                        <FcGoogle size={20} />
                        {loading ? "Signing in..." : "Continue with Google"}
                    </motion.button>

                    <div className='flex items-center my-4'>
                        <div className='flex-1 h-px bg-slate-800'></div>
                        <span className='px-3 text-xs text-slate-400'>OR</span>
                        <div className='flex-1 h-px bg-slate-800'></div>
                    </div>

                    {!showEmailForm ? (
                        <button
                            onClick={() => setShowEmailForm(true)}
                            className='w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-sm font-medium transition flex items-center justify-center gap-2'>
                            <FaEnvelope /> Sign in with Email / Demo Account
                        </button>
                    ) : (
                        <form onSubmit={handleDirectAuth} className='space-y-3 pt-1'>
                            <div className='relative'>
                                <FaUser className='absolute left-4 top-3.5 text-slate-400 text-xs' />
                                <input
                                    type="text"
                                    placeholder="Your Name (e.g. John Doe)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className='w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500'
                                />
                            </div>
                            <div className='relative'>
                                <FaEnvelope className='absolute left-4 top-3.5 text-slate-400 text-xs' />
                                <input
                                    type="email"
                                    placeholder="Your Email (e.g. user@example.com)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className='w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500'
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className='w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-semibold text-sm transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50'>
                                {loading ? "Signing in..." : "Quick Sign In"} <FaArrowRight size={14} />
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default Auth
