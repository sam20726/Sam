const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");

// ✅ Ensure uploads directory exists
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ Set up storage with multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ✅ In-memory store for last uploaded resume
let latestResumeData = null;

// ✅ POST /api/resume
router.post("/", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const filePath = path.join(uploadDir, req.file.filename);
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    const resumeData = {
      name: extractName(text),
      email: extractEmail(text),
      phone: extractPhone(text),
      profession: extractProfession(text),
      skills: extractSkills(text),
      projects: extractProjects(text),
      services: extractServices(text),
      education: extractEducation(text),
      experience: extractExperience(text),
      address: extractAddress(text),
      bio: extractBio(text),
      socialLinks: extractSocialLinks(text),
      linkedin: extractSpecificSocial(text, 'linkedin'),
      github: extractSpecificSocial(text, 'github'),
      instagram: extractSpecificSocial(text, 'instagram'),
      twitter: extractSpecificSocial(text, 'twitter'),
      facebook: extractSpecificSocial(text, 'facebook'),
      rawText: text
    };

    latestResumeData = resumeData;

    res.json({
      message: "Resume uploaded and parsed successfully",
      file: {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
      },
      resumeData
    });
  } catch (err) {
    console.error("PDF parse error:", err);
    res.status(500).json({ error: "Failed to parse resume" });
  }
});

// ✅ GET /api/resume/latest
router.get("/latest", (req, res) => {
  if (latestResumeData) {
    res.json({ resumeData: latestResumeData });
  } else {
    res.status(404).json({ error: "No resume data found." });
  }
});

// ---- Extractor functions ----
function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  return match ? match[0] : "";
}

function extractPhone(text) {
  const match = text.match(/(\+\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
  return match ? match[0] : "";
}

function extractName(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l && !extractEmail(l) && !extractPhone(l) && !/^skills|projects|experience|education|bio|summary/i.test(l));
  return lines.length > 0 ? lines[0] : "";
}

function extractProfession(text) {
  const match = text.match(/Profession\s*[:\-]?\s*(.+)/i);
  if (match) return match[1].trim();
  const professions = ['Web Developer', 'Software Engineer', 'Designer', 'Data Scientist', 'Consultant', 'Developer', 'Engineer', 'Manager', 'Analyst'];
  for (let prof of professions) {
    if (text.toLowerCase().includes(prof.toLowerCase())) return prof;
  }
  return '';
}

function extractListSection(text, sectionName) {
  const regex = new RegExp(`${sectionName}s?\s*[:\-]?\s*([\s\S]+?)(?:\n\s*\n|\n[A-Z][a-z]+:|$)`, 'i');
  const match = text.match(regex);
  if (match) {
    let items = match[1].split(/\n|,|;/).map(s => s.trim()).filter(Boolean);
    return [...new Set(items)];
  }
  return [];
}

function extractSkills(text) {
  let skills = extractListSection(text, 'Skill');
  if (skills.length) return skills;
  const keywords = ["javascript", "node", "react", "sql", "mysql", "html", "css", "python", "java", "c++", "typescript", "express", "mongodb", "docker", "aws", "git", "linux", "angular", "vue", "php"];
  const lowerText = text.toLowerCase();
  return keywords.filter(skill => lowerText.includes(skill));
}

function extractProjects(text) {
  let projects = extractListSection(text, 'Project');
  if (projects.length) return projects;
  const lines = text.split("\n");
  projects = lines.filter(l => l.trim().match(/^[-•]\s*.+/)).map(l => l.replace(/^[-•]\s*/, ''));
  return [...new Set(projects)];
}

function extractServices(text) {
  return extractListSection(text, 'Service');
}

function extractEducation(text) {
  let educ = extractListSection(text, 'Education');
  if (educ.length) return educ.join(', ');
  const degrees = ['B.Tech', 'B.E.', 'M.Tech', 'MCA', 'B.Sc', 'M.Sc', 'PhD', 'Bachelor', 'Master', 'Diploma', 'Degree'];
  const lines = text.split('\n');
  for (let line of lines) {
    for (let deg of degrees) {
      if (line.toLowerCase().includes(deg.toLowerCase())) return line.trim();
    }
  }
  return '';
}

function extractExperience(text) {
  let exp = extractListSection(text, 'Experience');
  if (exp.length) return exp.join(', ');
  const match = text.match(/(\d+\+?\s*years?)/i);
  return match ? match[1].trim() : '';
}

function extractAddress(text) {
  const match = text.match(/(?:Address|Location)\s*[:\-]?\s*(.+)/i);
  if (match) return match[1].trim();
  const lines = text.split('\n');
  for (let line of lines) {
    if (line.match(/\d{6}|[A-Za-z]+,\s*[A-Za-z]+/)) return line.trim();
  }
  return '';
}

function extractSocialLinks(text) {
  const regex = /(https?:\/\/(www\.)?(linkedin|github|twitter|facebook|instagram|portfolio|behance|dribbble)\.[^\s,;]+)/gi;
  let matches = text.match(regex) || [];
  return [...new Set(matches)];
}

function extractSpecificSocial(text, platform) {
  const regex = new RegExp(`https?://(www\\.)?${platform}\\.com/[^\s,;]+`, 'i');
  const match = text.match(regex);
  return match ? match[0] : '';
}

function extractBio(text) {
  const lines = text.split("\n");
  let bioLines = [];
  for (let line of lines) {
    if (/^skills|projects|experience|education|bio|summary/i.test(line)) break;
    if (line.trim()) bioLines.push(line.trim());
  }
  return bioLines.join(' ');
}

module.exports = router;
