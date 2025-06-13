// Directly set your Groq API key here
const GROQ_API_KEY = "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";

function truncateArray(arr, max = 10) {
  if (!Array.isArray(arr)) return arr;
  return arr.slice(0, max);
}

function truncateString(str, max = 1000) {
  if (typeof str !== 'string') return str;
  return str.length > max ? str.slice(0, max) + '... [truncated]' : str;
}

function summarizePageData(pageData) {
  return {
    url: pageData.url,
    title: truncateString(pageData.title, 200),
    domSummary: {
      forms: truncateArray(pageData.domSummary.forms, 5),
      scripts: truncateArray(pageData.domSummary.scripts, 5),
      metaTags: truncateArray(pageData.domSummary.metaTags, 5)
    },
    storageData: pageData.storageData, // usually small
    networkSummary: truncateArray(pageData.networkSummary, 5),
    heuristicFindings: truncateArray(pageData.heuristicFindings, 5)
  };
}

async function queryGroqLLM(messages) {
  const apiKey = GROQ_API_KEY;
  console.log("Sending request to Groq API...");
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages,
        temperature: 0.2
      })
    });
    const data = await res.json();
    console.log("Groq API response:", data);
    return data.choices?.[0]?.message?.content || (data.error ? data.error.message : "No response.");
  } catch (err) {
    console.error("Groq API fetch error:", err);
    return "Error contacting Groq API.";
  }
}

// Function to capture screenshot
async function captureScreenshot() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const screenshot = await chrome.tabs.captureVisibleTab();
    return screenshot;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
}

// Function to analyze page security
async function analyzePageSecurity(pageData, screenshot) {
  try {
    const summarized = summarizePageData(pageData);
    const messages = [
      {
        role: 'system',
        content: `
You are a cybersecurity expert performing a security design review using the STRIDE framework:
- S: Spoofing
- T: Tampering
- R: Repudiation
- I: Information Disclosure
- D: Denial of Service
- E: Elevation of Privilege

You are given DOM data, visible page content, and a screenshot. Your job is to:
1. Determine if the page appears secure or not.
2. If it's not secure, explain clearly which STRIDE categories are affected and why.
3. Keep the explanation easy to understand for someone with basic security knowledge.
4. Suggest simple fixes if possible.
        `
      },
      {
        role: 'user',
        content: `
Analyze this browser screen using STRIDE.

Here is the structured page data:
- URL: ${summarized.url}
- Page title: ${summarized.title}
- DOM summary: ${JSON.stringify(summarized.domSummary, null, 2)}
- Detected inputs and forms: ${JSON.stringify(summarized.domSummary.forms, null, 2)}
- LocalStorage/sessionStorage data: ${JSON.stringify(summarized.storageData, null, 2)}
- Network activity summary: ${JSON.stringify(summarized.networkSummary, null, 2)}
- Static heuristics flags: ${JSON.stringify(summarized.heuristicFindings, null, 2)}

Here is the screenshot (base64-encoded image, truncated):
[data:image/png;base64,${truncateString(screenshot, 500)}]
        `
      }
    ];
    return await queryGroqLLM(messages);
  } catch (error) {
    console.error('Error analyzing page security:', error);
    return 'Error analyzing page security. Please try again.';
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzePage') {
    (async () => {
      const screenshot = await captureScreenshot();
      const analysis = await analyzePageSecurity(request.pageData, screenshot);
      sendResponse({ analysis });
    })();
    return true;
  }
}); 