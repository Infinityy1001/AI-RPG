import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// ----- Global Variables -----
let engine = null;  
let storyHistory = ""; 
let roundCount = 0;    
const MAX_ROUNDS = 6;  

const MODEL_NAME = "Llama-3.1-8B-Instruct-q4f32_1-MLC";

const startBtn = document.getElementById('start');
const promptInput = document.getElementById('prompt');
const storyDiv = document.getElementById('story');
const choicesDiv = document.getElementById('choices');
const gameSection = document.querySelector('.game-section');
const initialSection = document.querySelector('.initial-section');
const loadingP = document.getElementById('loading');
const initialContextDiv = document.getElementById("initial-context");

// ----- Start Adventure -----

startBtn.addEventListener("click", async () => {
  const userContext = promptInput.value.trim();
  if (!userContext) {
    alert("Please enter an initial context!");
    return;
  }
  
  initialContextDiv.textContent = `Initial Context: ${userContext}`;
  initialContextDiv.style.marginBottom = "20px";
  initialContextDiv.style.fontStyle = "italic";

  initialSection.style.display = "none";
  gameSection.style.display = "block";

  storyHistory = `Initial context: ${userContext}`;
  roundCount = 0;

  if (!engine) {
    storyDiv.textContent = "Loading model ...";
    document.getElementById("loading-wheel").style.display = "block"; 
    engine = await CreateMLCEngine(MODEL_NAME, {});
    document.getElementById("loading-wheel").style.display = "none"; 
  }

  storyDiv.textContent = "";
  choicesDiv.innerHTML = "";

  await generateNextStep();
});


// ----- Generate a Step (Scene + 3 Choices) -----
async function generateNextStep() {
  roundCount++;
  if (roundCount > MAX_ROUNDS) {
    endAdventure("Round limit reached.");
    return;
  }

  // Show loading state
  loadingP.style.display = "inline";

  // Prompt preparation
  const userPrompt = `
${storyHistory}

Continue the story in no more than 5 lines, then provide EXACTLY 3 numbered choices (1., 2., 3.) related to the scene.
Do not repeat previous content or provide extra information.
  `;

  let finalText = "";
  storyDiv.textContent = "";

  const stream = await engine.chat.completions.create({
    messages: [
      { role: "system", content: "You are a game master. Describe the scene and propose 3 choices." },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 150,
    temperature: 0.8,
    repetition_penalty: 1.2,
    stream: true
  });

  for await (const chunk of stream) {
    if (chunk.choices && chunk.choices[0]?.delta.content) {
      const newToken = chunk.choices[0].delta.content;
      finalText += newToken; 
      await typewriterChunk(newToken, 10);
    }
  }

  loadingP.style.display = "none";
  storyHistory += "\n" + finalText;

  const [desc, choices] = extractStoryAndChoices(finalText);

  if (choices.length < 3) {
    endAdventure("The AI did not provide 3 choices. The adventure ends.");
    return;
  }
  displayChoices(choices);
}


async function typewriterChunk(str, delay = 5) { 
  for (let i = 0; i < str.length; i++) {
    storyDiv.textContent += str.charAt(i);
    await sleep(delay);  
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractStoryAndChoices(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const choiceLines = lines.filter(l => /^[1-3]\.\s/.test(l));

  let description = text;
  if (choiceLines.length > 0) {
    const firstIndex = lines.indexOf(choiceLines[0]);
    const descLines = lines.slice(0, firstIndex);
    description = descLines.join(' ');
  }
  return [description, choiceLines];
}

function displayChoices(choices) {
  choicesDiv.innerHTML = "";
  choices.forEach(choiceLine => {
    const btn = document.createElement('button');
    btn.textContent = choiceLine;
    btn.addEventListener('click', () => handleChoice(choiceLine));
    choicesDiv.appendChild(btn);
  });
}

function handleChoice(choiceText) {
  choicesDiv.innerHTML = "";
  storyDiv.textContent += `\n\n[You chose: ${choiceText}]\n\n`;
  storyHistory += `\nPlayer choice: ${choiceText}\n`;

  generateNextStep();
}

function endAdventure(msg) {
  choicesDiv.innerHTML = "";
  storyDiv.textContent += "\n\nAdventure over: " + msg;
}
