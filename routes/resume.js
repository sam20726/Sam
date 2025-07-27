const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");

// Set up storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// In-memory storage for the latest resume data
let latestResumeData = null;

// POST /api/resume
router.post("/", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = path.join(__dirname, "..", "uploads", req.file.filename);
  const pdfBuffer = fs.readFileSync(filePath);

  try {
    const data = await pdfParse(pdfBuffer);
    const extractedText = data.text;

    // Enhanced extraction
    const resumeData = {
      name: extractName(extractedText),
      email: extractEmail(extractedText),
      phone: extractPhone(extractedText),
      profession: extractProfession(extractedText),
      skills: extractSkills(extractedText),
      projects: extractProjects(extractedText),
      services: extractServices(extractedText),
      education: extractEducation(extractedText),
      experience: extractExperience(extractedText),
      address: extractAddress(extractedText),
      bio: extractBio(extractedText),
      socialLinks: extractSocialLinks(extractedText),
      linkedin: extractSpecificSocial(extractedText, 'linkedin'),
      github: extractSpecificSocial(extractedText, 'github'),
      instagram: extractSpecificSocial(extractedText, 'instagram'),
      twitter: extractSpecificSocial(extractedText, 'twitter'),
      facebook: extractSpecificSocial(extractedText, 'facebook'),
      rawText: extractedText, // optional: remove if not needed
    };

    // Store the latest resume data in memory
    latestResumeData = resumeData;

    res.json({
      message: "Resume uploaded and parsed",
      file: {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
      },
      resumeData,
    });
  } catch (err) {
    console.error("PDF parse error:", err);
    res.status(500).json({ error: "Failed to read resume" });
  }
});

// GET /api/resume/latest
router.get("/latest", (req, res) => {
  if (latestResumeData) {
    res.json({ resumeData: latestResumeData });
  } else {
    res.status(404).json({ error: "No resume data found." });
  }
});

// Enhanced extractors
function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  return match ? match[0] : "";
}

function extractPhone(text) {
  // Matches various phone number formats
  const match = text.match(/(\+\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
  return match ? match[0] : "";
}

function extractName(text) {
  // Heuristic: first non-empty line, not email/phone/section header
  const lines = text.split("\n").map(l => l.trim()).filter(l => l && !extractEmail(l) && !extractPhone(l) && !/^skills|projects|experience|education|bio|summary/i.test(l));
  return lines.length > 0 ? lines[0] : "";
}

// Advanced extractors for akhil.html fields
function extractProfession(text) {
  // Look for a line with 'Profession' or similar
  const match = text.match(/Profession\s*[:\-]?\s*(.+)/i);
  if (match) return match[1].trim();
  // Fallback: look for common professions
  const professions = ['Web Developer', 'Software Engineer', 'Designer', 'Data Scientist', 'Consultant', 'Developer', 'Engineer', 'Manager', 'Analyst'];
  for (let prof of professions) {
    if (text.toLowerCase().includes(prof.toLowerCase())) return prof;
  }
  return '';
}

function extractListSection(text, sectionName) {
  // Extracts a list from a section (comma, semicolon, or line separated)
  const regex = new RegExp(`${sectionName}s?\s*[:\-]?\s*([\s\S]+?)(?:\n\s*\n|\n[A-Z][a-z]+:|$)`, 'i');
  const match = text.match(regex);
  if (match) {
    let items = match[1]
      .split(/\n|,|;/)
      .map(s => s.trim())
      .filter(Boolean);
    // Remove duplicates
    items = [...new Set(items)];
    return items;
  }
  return [];
}

function extractSkills(text) {
  // Try section-based first
  let skills = extractListSection(text, 'Skill');
  if (skills.length) return skills;
  // Fallback: keyword search
  const keywords = [
    "javascript", "node", "react", "sql", "mysql", "html", "css", "python", "java", "c++",
    "typescript", "express", "mongodb", "docker", "aws", "git", "linux", "angular", "vue", "php"
  ];
  const lowerText = text.toLowerCase();
  return keywords.filter(skill => lowerText.includes(skill));
}

function extractProjects(text) {
  // Try section-based first
  let projects = extractListSection(text, 'Project');
  if (projects.length) return projects;
  // Fallback: look for lines starting with '-'
  const lines = text.split("\n");
  projects = lines.filter(l => l.trim().match(/^[-•]\s*.+/)).map(l => l.replace(/^[-•]\s*/, ''));
  return [...new Set(projects)];
}

function extractServices(text) {
  return extractListSection(text, 'Service');
}

function extractEducation(text) {
  // Try section-based first
  let educ = extractListSection(text, 'Education');
  if (educ.length) return educ.join(', ');
  // Fallback: look for degree keywords
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
  // Try section-based first
  let exp = extractListSection(text, 'Experience');
  if (exp.length) return exp.join(', ');
  // Fallback: look for years
  const match = text.match(/(\d+\+?\s*years?)/i);
  if (match) return match[1].trim();
  return '';
}

function extractAddress(text) {
  // Look for a line with 'Address' or 'Location'
  const match = text.match(/(?:Address|Location)\s*[:\-]?\s*(.+)/i);
  if (match) return match[1].trim();
  // Fallback: look for lines with city/state/country patterns
  const lines = text.split('\n');
  for (let line of lines) {
    if (line.match(/\d{6}|[A-Za-z]+,\s*[A-Za-z]+/)) return line.trim();
  }
  return '';
}

function extractSocialLinks(text) {
  // Find all common social links
  const regex = /(https?:\/\/(www\.)?(linkedin|github|twitter|facebook|instagram|portfolio|behance|dribbble)\.[^\s,;]+)/gi;
  let matches = text.match(regex) || [];
  // Deduplicate
  matches = [...new Set(matches)];
  return matches;
}

function extractSpecificSocial(text, platform) {
  // Find the first link for a given platform
  const regex = new RegExp(`https?://(www\\.)?${platform}\\.com/[^\s,;]+`, 'i');
  const match = text.match(regex);
  return match ? match[0] : '';
}

function extractBio(text) {
  // Heuristic: text before first section header (Skills, Experience, etc.)
  const lines = text.split("\n");
  let bioLines = [];
  for (let line of lines) {
    if (/^skills|projects|experience|education|bio|summary/i.test(line)) break;
    if (line.trim()) bioLines.push(line.trim());
  }
  return bioLines.join(' ');
}

module.exports = router;
