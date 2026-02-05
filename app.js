const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const themeToggle = document.getElementById('theme-toggle');
const resetBtn = document.getElementById('reset-btn');

// API Configuration
const API_KEY = 'AIzaSyBzsWq-X5viM0BpM0g57n3Lu9GKwSkpljY';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// State
let history = [];

// System Instruction
const SYSTEM_INSTRUCTION = {
    role: "user",
    parts: [{
        text: `
### ROLE DEFINITION
You are "Teman Belajar" (Learning Buddy), a cheerful, patient, and supportive AI tutor designed specifically for children (ages 7-15) and students. Your goal is to help them understand concepts, not just provide answers.

### TONE & STYLE
1.  **Language:** Respond strictly in **Indonesian**.
2.  **Voice:** Use formal but relaxed, warm, and accessible Indonesian (Standard yet casual).
3.  **Simplicity:** Avoid complex technical jargon. If a technical term is necessary, immediately explain it using a simple, relatable analogy.
4.  **Encouragement:** Be enthusiastic. Use relevant emojis to keep the mood light, but do not overuse them 🌟.

### STRICT OPERATIONAL RULES
1.  **SAFETY PROTOCOLS (CRITICAL):**
    * If the user asks about adult topics, violence, self-harm, illegal acts, or hate speech, politely refuse.
    * Gently steer the conversation back to a positive, educational topic.
2.  **HOMEWORK ASSISTANCE (SOCRATIC METHOD):**
    * **NEVER** provide the direct final answer to math problems or homework questions.
    * Instead, guide the user step-by-step. Ask guiding questions to help them solve it themselves.
3.  **VERIFICATION:**
    * At the end of an explanation, check for understanding.
` }]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadHistory();
});

// Event Listeners
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    // Add User Message
    addMessageToUI(message, 'user');
    saveHistory(message, 'user');
    userInput.value = '';

    // Show Loading
    const loadingId = addLoadingIndicator();

    try {
        const responseText = await sendMessageToGemini(message);
        removeLoadingIndicator(loadingId);
        addMessageToUI(responseText, 'ai');
        saveHistory(responseText, 'ai');
    } catch (error) {
        removeLoadingIndicator(loadingId);
        addMessageToUI("Maaf, Teman Belajar sedang pusing sedikit. Coba tanya lagi ya! 🤕", 'ai');
        console.error("Error:", error);
    }
});

themeToggle.addEventListener('click', toggleTheme);
resetBtn.addEventListener('click', confirmReset);

// Theme Functions
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Update Icon
    const icon = themeToggle.querySelector('i');
    icon.className = isDark ? 'ph-bold ph-sun' : 'ph-bold ph-moon';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').className = 'ph-bold ph-sun';
    }
}

// History Functions
function saveHistory(text, role) {
    const historyItem = { role, text };
    history.push(historyItem);
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

function loadHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
        history = JSON.parse(saved);
        if (history.length > 0) {
            chatContainer.innerHTML = '';
            history.forEach(item => {
                addMessageToUI(item.text, item.role);
            });
        }
    } else {
        history = [
            { role: 'ai', text: "Halo! Aku Teman Belajar kamu. Hari ini kita mau belajar apa? Matematika, Sains, atau cerita seru? Yuk, tanya saja! 🌟" }
        ];
    }
}

function confirmReset() {
    if (confirm('Apakah kamu yakin ingin menghapus semua percakapan?')) {
        localStorage.removeItem('chatHistory');
        location.reload();
    }
}

// UI Functions
function addMessageToUI(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    // Avatar Icons
    if (sender === 'user') {
        avatar.innerHTML = '<i class="ph-fill ph-user-circle"></i>';
    } else {
        avatar.innerHTML = '<i class="ph-fill ph-robot"></i>';
    }

    const bubble = document.createElement('div');
    bubble.classList.add('bubble');

    // Parse Markdown for AI messages
    if (sender === 'ai') {
        bubble.innerHTML = marked.parse(text);
    } else {
        bubble.textContent = text;
    }

    // Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '<i class="ph-bold ph-copy"></i>';
    copyBtn.title = "Salin Teks";
    copyBtn.onclick = () => copyText(text, copyBtn);
    bubble.appendChild(copyBtn);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble); // Avatar order is handled by CSS flex-direction
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function copyText(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalIcon = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="ph-bold ph-check"></i>';
        setTimeout(() => {
            btnElement.innerHTML = originalIcon;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy code', err);
    });
}

function addLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'ai-message');
    messageDiv.id = id;

    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.innerHTML = '<i class="ph-fill ph-robot"></i>';

    const bubble = document.createElement('div');
    bubble.classList.add('bubble', 'typing-indicator');
    bubble.innerHTML = '<span></span><span></span><span></span>';

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    return id;
}

function removeLoadingIndicator(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// API Function
async function sendMessageToGemini(userText) {
    // Construct payload from history (convert to Gemini format)
    // We filter out the initial greeting if it wasn't part of the strict API exchange contexts, 
    // but usually it's fine.
    // Map our simple history object to Gemini content structure
    const contents = history.map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }]
    }));

    // Prepend system instruction is NOT needed in contents if we use system_instruction field

    const requestBody = {
        contents: contents,
        systemInstruction: {
            parts: SYSTEM_INSTRUCTION.parts
        },
        generationConfig: {
            temperature: 0.7,
        }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'API Request Failed');
    }

    return data.candidates[0].content.parts[0].text;
}
