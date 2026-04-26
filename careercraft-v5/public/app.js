// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const interviewBtn = document.getElementById('interviewBtn');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const atsBtn = document.getElementById('atsBtn');
const proBtn = document.getElementById('proBtn');

const countrySelect = document.getElementById('country');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const experienceInput = document.getElementById('userExperience');
const jobDescInput = document.getElementById('jobDescription');
const jobTitleInput = document.getElementById('jobTitle');
const userAnswerInput = document.getElementById('userAnswer');

const cvOutput = document.getElementById('cvOutput');
const atsOutput = document.getElementById('atsOutput');
const questionsList = document.getElementById('questionsList');
const currentQuestionDisplay = document.getElementById('currentQuestionDisplay');
const feedbackArea = document.getElementById('feedbackArea');
const historyList = document.getElementById('historyList');

let currentCVText = '';
let currentQuestions = [];
let currentQuestionIndex = 0;
let interviewHistory = [];

const saved = localStorage.getItem('careercraft_history');
if (saved) {
    try { interviewHistory = JSON.parse(saved); updateHistoryDisplay(); } catch(e) {}
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

function getSelectedTier() {
    const selected = document.querySelector('input[name="tier"]:checked');
    return selected ? selected.value : 'free';
}

// Generate CV
async function generateCV() {
    const exp = experienceInput.value.trim();
    if (exp.length < 20) {
        cvOutput.innerHTML = '<div class="error-message">⚠️ Please provide at least 20 characters of experience.</div>';
        return;
    }
    
    cvOutput.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Generating...</p></div>';
    generateBtn.disabled = true;
    
    try {
        const res = await fetch('/api/generate-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userData: exp,
                country: countrySelect.value,
                jobDescription: jobDescInput.value,
                fullName: fullNameInput.value,
                email: emailInput.value,
                phone: phoneInput.value
            })
        });
        
        const data = await res.json();
        if (data.success) {
            currentCVText = data.cv;
            cvOutput.innerHTML = data.cv.replace(/\n/g, '<br>');
        } else {
            cvOutput.innerHTML = `<div class="error-message">❌ ${data.error || 'Error'}</div>`;
        }
    } catch (error) {
        cvOutput.innerHTML = '<div class="error-message">❌ Network error</div>';
    }
    generateBtn.disabled = false;
}

function copyCV() {
    if (currentCVText) {
        navigator.clipboard.writeText(currentCVText);
        alert('✓ Copied!');
    } else { alert('Generate CV first'); }
}

function downloadCV() {
    if (currentCVText) {
        const blob = new Blob([currentCVText], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `careercraft_cv_${Date.now()}.txt`;
        a.click();
    } else { alert('Generate CV first'); }
}

// Interview Questions
async function generateInterviewQuestions() {
    const title = jobTitleInput.value.trim();
    if (!title) {
        questionsList.innerHTML = '<div class="error-message">⚠️ Enter job title</div>';
        return;
    }
    
    questionsList.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Generating...</p></div>';
    interviewBtn.disabled = true;
    
    try {
        const res = await fetch('/api/interview-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                country: countrySelect.value,
                jobTitle: title,
                isPro: getSelectedTier() === 'pro'
            })
        });
        
        const data = await res.json();
        if (data.success && data.questions) {
            currentQuestions = data.questions;
            let html = '<strong>📋 Click a question to practice:</strong><br><br>';
            data.questions.forEach((q, i) => {
                html += `<div class="question-item" onclick="window.selectQuestion(${i})">${i+1}. ${q}</div>`;
            });
            questionsList.innerHTML = html;
            selectQuestion(0);
        } else {
            questionsList.innerHTML = '<div class="error-message">Failed</div>';
        }
    } catch (error) {
        questionsList.innerHTML = '<div class="error-message">Network error</div>';
    }
    interviewBtn.disabled = false;
}

function selectQuestion(index) {
    currentQuestionIndex = index;
    currentQuestionDisplay.innerHTML = `<strong>Current Question:</strong><br>${currentQuestions[index]}`;
    userAnswerInput.value = '';
    feedbackArea.innerHTML = '';
}
window.selectQuestion = selectQuestion;

// Submit Answer
async function submitAnswer() {
    const answer = userAnswerInput.value.trim();
    if (!answer) { alert('Type your answer'); return; }
    if (!currentQuestions.length) { alert('Generate questions first'); return; }
    
    feedbackArea.innerHTML = '<div class="feedback-card" style="text-align:center;">⏳ Analyzing...</div>';
    submitAnswerBtn.disabled = true;
    
    try {
        const res = await fetch('/api/submit-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                answer: answer,
                country: countrySelect.value,
                question: currentQuestions[currentQuestionIndex],
                jobTitle: jobTitleInput.value
            })
        });
        
        const data = await res.json();
        const scoreColor = data.score >= 80 ? '#2ecc71' : (data.score >= 60 ? '#f39c12' : '#e74c3c');
        
        feedbackArea.innerHTML = `
            <div class="feedback-card">
                <div class="score-circle" style="color: ${scoreColor};">${data.score}%</div>
                <div class="feedback-section"><h4>💪 Strengths</h4><ul>${(data.strengths || []).map(s => `<li>${s}</li>`).join('')}</ul></div>
                <div class="feedback-section"><h4>⚠️ Areas to Improve</h4><ul>${(data.weaknesses || []).map(w => `<li>${w}</li>`).join('')}</ul></div>
                <div class="feedback-section"><h4>📝 Feedback</h4><p>${data.feedback}</p></div>
                <div class="feedback-section"><h4>✨ STAR Rewrite</h4><div class="star-box">${(data.starRewritten || '').replace(/\n/g, '<br>')}</div></div>
            </div>
        `;
        
        interviewHistory.unshift({
            timestamp: new Date().toISOString(),
            question: currentQuestions[currentQuestionIndex].substring(0, 150),
            answer: answer.substring(0, 200),
            score: data.score,
            feedback: data.feedback.substring(0, 200)
        });
        if (interviewHistory.length > 50) interviewHistory = interviewHistory.slice(0, 50);
        localStorage.setItem('careercraft_history', JSON.stringify(interviewHistory));
        updateHistoryDisplay();
    } catch (error) {
        feedbackArea.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }