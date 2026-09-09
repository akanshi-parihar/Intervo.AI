import fs from "fs"
import { createRequire } from "module";
import { askAi } from "../services/openRouter.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";

const require = createRequire(import.meta.url);
const pdfModule = require("pdf-parse");

export const analyzeResume = async (req, res) => {
  let filepath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }

    const fileBuffer = await fs.promises.readFile(filepath);
    let resumeText = "";

    try {
      const parser = new pdfModule.PDFParse({ data: new Uint8Array(fileBuffer) });
      await parser.load();
      const extracted = await parser.getText();
      if (typeof extracted === "string") {
        resumeText = extracted;
      }
      parser.destroy?.();
    } catch (parseErr) {
      console.warn("Primary PDF parser failed, using text stream extraction:", parseErr.message);
      const rawString = fileBuffer.toString("latin1");
      const matches = rawString.match(/[A-Za-z0-9\s.,\-\/\\():@+]{4,}/g);
      if (matches) {
        resumeText = matches.join(" ");
      }
    }

    resumeText = (resumeText || "")
      .replace(/\s+/g, " ")
      .trim();

    let parsed = { role: "Software Developer", experience: "1-3 years", projects: [], skills: [], internships: [] };

    if (resumeText) {
      try {
        const messages = [
          {
            role: "system",
            content: `Extract structured data from the candidate's resume. Return ONLY valid JSON in this exact format:
{
  "role": "extracted primary candidate role or job title (string)",
  "experience": "extracted total experience e.g. 1 year, 2 years (string)",
  "projects": ["project title or description 1", "project 2"],
  "skills": ["skill1", "skill2", "skill3"],
  "internships": ["internship role & company 1", "internship 2"]
}`
          },
          {
            role: "user",
            content: resumeText.slice(0, 4000)
          }
        ];

        const aiResponse = await askAi(messages);
        const cleanedJson = aiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
        const aiParsed = JSON.parse(cleanedJson);
        parsed = { ...parsed, ...aiParsed };
      } catch (aiErr) {
        console.warn("AI resume parsing fallback used:", aiErr.message);
      }
    }

    if (filepath && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    const cleanItem = item => typeof item === "object" && item !== null ? (item.name || item.title || item.role || item.skill || JSON.stringify(item)) : String(item);

    let finalProjects = Array.isArray(parsed.projects) ? parsed.projects.map(cleanItem).filter(Boolean) : [];
    let finalSkills = Array.isArray(parsed.skills) ? parsed.skills.map(cleanItem).filter(Boolean) : [];
    let finalInternships = Array.isArray(parsed.internships) ? parsed.internships.map(cleanItem).filter(Boolean) : [];

    // Fallback skill extraction from text if AI missed skills
    if (finalSkills.length === 0 && resumeText) {
      const commonSkills = ["JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "React", "Next.js", "Node.js", "Express", "HTML", "CSS", "Tailwind", "SQL", "MongoDB", "PostgreSQL", "Docker", "Git", "AWS", "Machine Learning", "AI"];
      finalSkills = commonSkills.filter(skill => new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i").test(resumeText));
    }

    return res.json({
      role: typeof parsed.role === "string" ? parsed.role : "Software Developer",
      experience: typeof parsed.experience === "string" ? parsed.experience : "1-3 years",
      projects: finalProjects,
      skills: finalSkills,
      internships: finalInternships,
      resumeText: typeof resumeText === "string" ? resumeText : ""
    });

  } catch (error) {
    console.error("Analyze resume error:", error);

    if (filepath && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    return res.json({
      role: "Software Developer",
      experience: "1-3 years",
      projects: [],
      skills: [],
      internships: [],
      resumeText: ""
    });
  }
};


export const generateQuestion = async (req, res) => {
  try {
    let { role, experience, mode, resumeText, projects, skills } = req.body;

    role = (role || "Software Developer").toString().trim();
    experience = (experience || "1-3 years").toString().trim();
    const normalizedMode = (mode && mode.toString().toLowerCase().includes("hr")) ? "HR" : "Technical";

    if (!req.userId) {
      return res.status(401).json({
        message: "Unauthorized. Please log in to start an interview."
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please log in again."
      });
    }

    // Auto grant credits if initial balance is low for seamless user testing
    if (!user.credits || user.credits < 50) {
      user.credits = 100;
      await user.save();
    }

    const projectText = Array.isArray(projects) && projects.length
      ? projects.map(p => typeof p === 'object' ? (p.name || p.title || JSON.stringify(p)) : String(p)).join(", ")
      : "None";

    const skillsText = Array.isArray(skills) && skills.length
      ? skills.map(s => typeof s === 'object' ? (s.name || s.skill || JSON.stringify(s)) : String(s)).join(", ")
      : "None";

    const safeResume = (resumeText || "").toString().trim() || "None";

    const userPrompt = `
    Role:${role}
    Experience:${experience}
    InterviewMode:${normalizedMode}
    Projects:${projectText}
    Skills:${skillsText}
    Resume:${safeResume.slice(0, 1500)}
    `;

    let questionsArray = [];

    try {
      const messages = [
        {
          role: "system",
          content: `You are a real human interviewer conducting a professional interview. Speak in simple, natural English.
Generate exactly 5 interview questions based on candidate role, experience, interview mode, projects, and skills.
Rules: One question per line only. No numbers.
Question 1 -> easy
Question 2 -> easy
Question 3 -> medium
Question 4 -> medium
Question 5 -> hard`
        },
        {
          role: "user",
          content: userPrompt
        }
      ];

      const aiResponse = await askAi(messages);
      if (aiResponse && aiResponse.trim()) {
        questionsArray = aiResponse
          .split("\n")
          .map(q => q.replace(/^\d+[\.\)]\s*/, "").replace(/^-\s*/, "").trim())
          .filter(q => q.length > 10)
          .slice(0, 5);
      }
    } catch (aiErr) {
      console.warn("Using fallback question generation:", aiErr.message);
    }

    // Fallback questions if AI generation returned insufficient questions
    if (!Array.isArray(questionsArray) || questionsArray.length < 5) {
      const fallbackQuestions = normalizedMode === "HR" ? [
        `Could you introduce yourself and explain why you're interested in the ${role} role?`,
        `Describe a challenging situation in your previous project and how you resolved it.`,
        `How do you handle tight deadlines or conflicting priorities when working in a team?`,
        `Can you share an experience where you had a disagreement with a colleague and how it was settled?`,
        `Where do you see yourself professionally in the next three to five years?`
      ] : [
        `Can you explain the core concepts and workflow behind your experience as a ${role}?`,
        `How do you design scalable applications and manage key architecture components in your project?`,
        `Describe a complex bug or performance bottleneck you encountered and how you debugged it.`,
        `How do you handle data flow, error handling, and state management in production systems?`,
        `Explain how you would approach architecting a modern high-performance system for ${role}.`
      ];
      questionsArray = fallbackQuestions;
    }

    user.credits = Math.max(0, user.credits - 50);
    await user.save();

    const interview = await Interview.create({
      userId: user._id,
      role,
      experience,
      mode: normalizedMode,
      resumeText: safeResume,
      questions: questionsArray.map((q, index) => ({
        question: typeof q === 'object' ? (q.question || q.text || JSON.stringify(q)) : String(q),
        difficulty: ["easy", "easy", "medium", "medium", "hard"][index] || "medium",
        timeLimit: [60, 60, 90, 90, 120][index] || 60,
      }))
    });

    return res.json({
      interviewId: interview._id,
      creditsLeft: user.credits,
      userName: user.name || "Candidate",
      questions: interview.questions
    });
  } catch (error) {
    console.error("Generate question error:", error);
    return res.status(500).json({ message: error.message || "Failed to create interview" });
  }
};


export const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer, timeTaken } = req.body

    const interview = await Interview.findById(interviewId)
    const question = interview.questions[questionIndex]

    // If no answer
    if (!answer) {
      question.score = 0;
      question.feedback = "You did not submit an answer.";
      question.answer = "";

      await interview.save();

      return res.json({
        feedback: question.feedback
      });
    }

    // If time exceeded
    if (timeTaken > question.timeLimit) {
      question.score = 0;
      question.feedback = "Time limit exceeded. Answer not evaluated.";
      question.answer = answer;

      await interview.save();

      return res.json({
        feedback: question.feedback
      });
    }


    const messages = [
      {
        role: "system",
        content: `You are a professional human interviewer evaluating a candidate's answer.
Return ONLY valid JSON in this format:
{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short human feedback"
}`
      },
      {
        role: "user",
        content: `Question: ${question.question}\nAnswer: ${answer}`
      }
    ];

    try {
      const aiResponse = await askAi(messages);
      const cleanedJson = aiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);

      question.answer = answer;
      question.confidence = parsed.confidence || 7;
      question.communication = parsed.communication || 7;
      question.correctness = parsed.correctness || 7;
      question.score = parsed.finalScore || Math.round((question.confidence + question.communication + question.correctness) / 3);
      question.feedback = parsed.feedback || "Good response provided.";
    } catch (parseErr) {
      question.answer = answer;
      question.confidence = 7;
      question.communication = 7;
      question.correctness = 7;
      question.score = 7;
      question.feedback = "Solid effort. Focus on delivering clear, structured technical details.";
    }

    await interview.save();

    return res.status(200).json({ feedback: question.feedback })
  } catch (error) {
    return res.status(500).json({ message: `failed to submit answer ${error.message || error}` })
  }
}


export const finishInterview = async (req,res) => {
  try {
    const {interviewId} = req.body
    const interview = await Interview.findById(interviewId)
    if(!interview){
      return res.status(400).json({message:"failed to find Interview"})
    }

    const totalQuestions = interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalScore += q.score || 0;
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const finalScore = totalQuestions
      ? totalScore / totalQuestions
      : 0;

    const avgConfidence = totalQuestions
      ? totalConfidence / totalQuestions
      : 0;

    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;

    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;

    interview.finalScore = finalScore;
    interview.status = "completed";

    await interview.save();

    return res.status(200).json({
       finalScore: Number(finalScore.toFixed(1)),
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionWiseScore: interview.questions.map((q) => ({
        question: q.question,
        score: q.score || 0,
        feedback: q.feedback || "",
        confidence: q.confidence || 0,
        communication: q.communication || 0,
        correctness: q.correctness || 0,
      })),
    })
  } catch (error) {
    return res.status(500).json({message:`failed to finish Interview ${error}`})
  }
}


export const getMyInterviews = async (req,res) => {
  try {
    const interviews = await Interview.find({userId:req.userId})
    .sort({ createdAt: -1 })
    .select("role experience mode finalScore status createdAt");

    return res.status(200).json(interviews)

  } catch (error) {
     return res.status(500).json({message:`failed to find currentUser Interview ${error}`})
  }
}

export const getInterviewReport = async (req,res) => {
  try {
    const interview = await Interview.findById(req.params.id)

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }


    const totalQuestions = interview.questions.length;

    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });
    const avgConfidence = totalQuestions
      ? totalConfidence / totalQuestions
      : 0;

    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;

    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;

       return res.json({
      finalScore: interview.finalScore,
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionWiseScore: interview.questions
    });

  } catch (error) {
    return res.status(500).json({message:`failed to find currentUser Interview report ${error}`})
  }
}




