import React from 'react'
import { motion } from "motion/react"
import {
    FaUserTie,
    FaBriefcase,
    FaFileUpload,
    FaMicrophoneAlt,
    FaChartLine,
} from "react-icons/fa";
import { useState } from 'react';
import axios from "axios"
import { ServerUrl } from '../App';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';
function Step1SetUp({ onStart }) {
    const {userData}= useSelector((state)=>state.user)
    const dispatch = useDispatch()
    const [role, setRole] = useState("");
    const [experience, setExperience] = useState("");
    const [mode, setMode] = useState("Technical");
    const [resumeFile, setResumeFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [skills, setSkills] = useState([]);
    const [internships, setInternships] = useState([]);
    const [resumeText, setResumeText] = useState("");
    const [analysisDone, setAnalysisDone] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleUploadResume = async (fileToUpload = resumeFile) => {
        const file = fileToUpload || resumeFile;
        if (!file || analyzing) return null;
        setAnalyzing(true);
        setErrorMsg("");

        const formdata = new FormData();
        formdata.append("resume", file);

        try {
            const result = await axios.post(ServerUrl + "/api/interview/resume", formdata, { withCredentials: true });

            console.log(result.data);

            const fetchedRole = result.data.role || role || "Software Developer";
            const fetchedExp = result.data.experience || experience || "1-3 years";
            const fetchedProjects = Array.isArray(result.data.projects)
                ? result.data.projects.map(p => typeof p === 'object' && p !== null ? (p.name || p.title || p.project || JSON.stringify(p)) : String(p))
                : [];
            const fetchedSkills = Array.isArray(result.data.skills)
                ? result.data.skills.map(s => typeof s === 'object' && s !== null ? (s.name || s.skill || JSON.stringify(s)) : String(s))
                : [];
            const fetchedInternships = Array.isArray(result.data.internships)
                ? result.data.internships.map(i => typeof i === 'object' && i !== null ? (i.title || i.role || i.company || JSON.stringify(i)) : String(i))
                : [];
            const fetchedResumeText = result.data.resumeText || "";

            setRole(fetchedRole);
            setExperience(fetchedExp);
            setProjects(fetchedProjects);
            setSkills(fetchedSkills);
            setInternships(fetchedInternships);
            setResumeText(fetchedResumeText);
            setAnalysisDone(true);
            setAnalyzing(false);

            return {
                role: fetchedRole,
                experience: fetchedExp,
                projects: fetchedProjects,
                skills: fetchedSkills,
                internships: fetchedInternships,
                resumeText: fetchedResumeText
            };

        } catch (error) {
            console.error(error);
            setErrorMsg(error.response?.data?.message || "Failed to analyze resume. You can still enter details manually.");
            setAnalyzing(false);
            return null;
        }
    }

    const handleStart = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
           let currentRole = role.trim() || "Software Developer";
           let currentExp = experience.trim() || "1-3 years";
           let currentProjects = projects;
           let currentSkills = skills;
           let currentResumeText = resumeText;

           // Auto analyze resume if user selected file but hasn't analyzed yet
           if (resumeFile && !analysisDone) {
               const analyzedData = await handleUploadResume(resumeFile);
               if (analyzedData) {
                   currentRole = analyzedData.role;
                   currentExp = analyzedData.experience;
                   currentProjects = analyzedData.projects;
                   currentSkills = analyzedData.skills;
                   currentResumeText = analyzedData.resumeText;
               }
           }

           const targetMode = mode && mode.toLowerCase().includes("hr") ? "HR" : "Technical";

           const result = await axios.post(ServerUrl + "/api/interview/generate-questions" , {
               role: currentRole, 
               experience: currentExp, 
               mode: targetMode, 
               resumeText: currentResumeText, 
               projects: currentProjects, 
               skills: currentSkills 
           } , {withCredentials:true});
           
           console.log(result.data);
           if(userData && result.data.creditsLeft !== undefined){
            dispatch(setUserData({...userData , credits:result.data.creditsLeft}));
           }
           setLoading(false);
           onStart(result.data);

        } catch (error) {
            console.error(error);
            setErrorMsg(error.response?.data?.message || error.message || "Failed to start interview. Please check your credentials or network connection.");
            setLoading(false);
        }
    }
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950 px-4'>

            <div className='w-full max-w-6xl bg-slate-900 rounded-3xl shadow-2xl grid md:grid-cols-2 overflow-hidden'>

                <motion.div
                    initial={{ x: -80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className='relative bg-gradient-to-br from-slate-950 to-slate-900 p-12 flex flex-col justify-center'>

                    <h2 className="text-4xl font-bold text-slate-100 mb-6">
                        Start Your AI Interview
                    </h2>

                    <p className="text-slate-300 mb-10">
                        Practice real interview scenarios powered by AI.
                        Improve communication, technical skills, and confidence.
                    </p>

                    <div className='space-y-5'>

                        {
                            [
                                {
                                    icon: <FaUserTie className="text-pink-400 text-xl" />,
                                    text: "Choose Role & Experience",
                                },
                                {
                                    icon: <FaMicrophoneAlt className="text-pink-400 text-xl" />,
                                    text: "Smart Voice Interview",
                                },
                                {
                                    icon: <FaChartLine className="text-pink-400 text-xl" />,
                                    text: "Performance Analytics",
                                },
                            ].map((item, index) => (
                                <motion.div key={index}
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 + index * 0.15 }}
                                    whileHover={{ scale: 1.03 }}
                                    className='flex items-center space-x-4 bg-slate-900 p-4 rounded-xl shadow-sm cursor-pointer'>
                                    {item.icon}
                                    <span className='text-slate-200 font-medium'>{item.text}</span>

                                </motion.div>
                            ))
                        }
                    </div>



                </motion.div>



                <motion.div
                    initial={{ x: 80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className="p-12 bg-slate-900">

                    <h2 className='text-3xl font-bold text-slate-100 mb-8'>
                        Interview SetUp
                    </h2>


                    <div className='space-y-6'>

                        {errorMsg && (
                            <div className='p-4 bg-red-950/80 border border-red-700 rounded-xl text-red-200 text-sm'>
                                {errorMsg}
                            </div>
                        )}

                        <div className='relative'>
                            <FaUserTie className='absolute top-4 left-4 text-slate-400' />

                            <input type='text' placeholder='Enter role (e.g. Software Developer)'
                                className='w-full pl-12 pr-4 py-3 border border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition text-slate-100'
                                onChange={(e) => setRole(e.target.value)} value={role} />
                        </div>


                        <div className='relative'>
                            <FaBriefcase className='absolute top-4 left-4 text-slate-400' />

                            <input type='text' placeholder='Experience (e.g. 2 years)'
                                className='w-full pl-12 pr-4 py-3 border border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition text-slate-100'
                                onChange={(e) => setExperience(e.target.value)} value={experience} />

                        </div>

                        <select value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            className='w-full py-3 px-4 border border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition text-slate-100 bg-slate-900'>

                            <option value="Technical">Technical Interview</option>
                            <option value="HR">HR Interview</option>

                        </select>

                        {!analysisDone && (
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                onClick={() => document.getElementById("resumeUpload").click()}
                                className='border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-pink-500 hover:bg-pink-950 transition'>

                                <FaFileUpload className='text-4xl mx-auto text-pink-400 mb-3' />

                                <input type="file"
                                    accept="application/pdf"
                                    id="resumeUpload"
                                    className='hidden'
                                    onChange={(e) => setResumeFile(e.target.files[0])} />

                                <p className='text-slate-300 font-medium'>
                                    {resumeFile ? resumeFile.name : "Click to upload resume (Optional)"}
                                </p>

                                {resumeFile && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUploadResume()
                                        }}

                                        className='mt-4 bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-700 transition'>
                                        {analyzing ? "Analyzing..." : "Analyze Resume"}

                                    </motion.button>)}

                            </motion.div>


                        )}

                        {analysisDone && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className='bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4'>
                                <h3 className='text-lg font-semibold text-slate-100 border-b border-slate-700/60 pb-2'>
                                    Resume Analysis Result</h3>

                                {skills.length > 0 && (
                                     <div>
                                         <p className='font-medium text-slate-200 mb-2 text-sm'>
                                             Skills:</p>

                                         <div className='flex flex-wrap gap-2'>
                                             {skills.map((s, i) => (
                                                 <span key={i} className='bg-pink-950 text-pink-300 px-3 py-1 rounded-full text-xs font-medium border border-pink-700/50'>{typeof s === 'object' && s !== null ? (s.name || s.skill || JSON.stringify(s)) : String(s)}</span>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                {projects.length > 0 && (
                                     <div>
                                         <p className='font-medium text-slate-200 mb-1 text-sm'>
                                             Projects:</p>

                                         <ul className='list-disc list-inside text-slate-300 space-y-1 text-sm'>
                                             {projects.map((p, i) => (
                                                 <li key={i}>{typeof p === 'object' && p !== null ? (p.name || p.title || JSON.stringify(p)) : String(p)}</li>
                                             ))}
                                         </ul>
                                     </div>
                                 )}

                                {internships.length > 0 && (
                                     <div>
                                         <p className='font-medium text-slate-200 mb-1 text-sm'>
                                             Internships & Experience:</p>

                                         <ul className='list-disc list-inside text-slate-300 space-y-1 text-sm'>
                                             {internships.map((item, i) => (
                                                 <li key={i}>{typeof item === 'object' && item !== null ? (item.title || item.role || item.company || JSON.stringify(item)) : String(item)}</li>
                                             ))}
                                         </ul>
                                     </div>
                                 )}

                            </motion.div>
                        )}


                        <motion.button
                            onClick={handleStart}
                            disabled={loading}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                            className='w-full disabled:bg-slate-700 bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-full text-lg font-semibold transition duration-300 shadow-md'>
                            {loading ? "Starting..." : "Start Interview"}
                        </motion.button>
                    </div>

                </motion.div>
            </div>

        </motion.div>
    )
}

export default Step1SetUp
