# STRIDE Design Review

## 🎯 Plugin Goal
"Tell if the current browser page is secure or not using STRIDE. If not, explain clearly why — based on visible structure, network activity, and page layout."

## 🧠 How it Works

STRIDE Design Review is a Chrome extension designed to provide automated security analysis of web pages based on the STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) threat modeling framework.

### Data Collection (Content Script)
When you click "Analyze Current Page," the extension's **content script** (`content/index.js`) is injected into the active browser tab. It collects the following critical information:
-   **URL and Page Title:** Basic page identification.
-   **DOM Summary:** A structured overview of the page's Document Object Model, including forms (with their actions, methods, and input fields), scripts (with their sources and attributes), and meta tags.
-   **Detected Inputs and Forms:** Detailed information about interactive elements that could be potential attack vectors.
-   **LocalStorage/SessionStorage Data:** Data stored client-side in browser storage.
-   **Network Activity Summary:** A summary of resources loaded by the page, including URLs, types, durations, and sizes.
-   **Static Heuristics Flags:** Basic security checks performed locally, such as detection of mixed content (HTTP resources on an HTTPS page) or insecure form submissions.
-   **Screenshot:** A base64-encoded image of the visible tab area, crucial for visual analysis by the LLM.

### Analysis & Communication (Background Script)
Once the data is collected by the content script, it's sent to the **background script** (`background/index.js`). The background script is responsible for:
-   **Automatic Analysis Trigger:** The background script automatically triggers page data collection and security analysis whenever a new page is loaded or reloaded in an active tab.
-   **Screenshot Capture:** Utilizing Chrome APIs to capture a screenshot of the current tab.
-   **Groq API Communication:** Constructing a detailed prompt using the collected page data and the screenshot, and then sending it to the Groq LLM (specifically `llama3-70b-8192`). To manage token limits, large data fields (like arrays of forms, scripts, or network entries, and the screenshot itself) are truncated before being sent to the LLM.
-   **Security Analysis:** The Groq LLM, acting as a cybersecurity expert, analyzes the provided data based on the STRIDE framework. It determines if the page appears secure, identifies affected STRIDE categories if not, explains the vulnerabilities, and suggests simple fixes.
-   **Result Delivery:** The LLM's analysis is then stored, and the popup script is automatically displayed if the analysis was triggered by a page load/reload.

### User Interface (Popup UI)
-   The **popup UI** (`popup/App.jsx`, `popup/index.html`, `popup/index.css`) provides the user interface for the extension.
-   When an analysis is automatically triggered by a page load or reload, the popup will automatically appear displaying the analysis results.
-   Users can also initiate a manual analysis by clicking the "Analyze Current Page" button. This button is styled as a prominent, interactive circle.
-   Upon completion of any analysis, the security analysis results from the Groq LLM are displayed in a scrollable area within the popup. The output is formatted for readability, with bolded sections and properly rendered lists.
-   An "Analyze Again" button, styled as a standard rectangular button, appears after analysis to re-run the assessment on the current page.
-   When the extension popup is dismissed (e.g., by clicking outside it), its state will reset, allowing the "Analyze Current Page" button to be visible again upon the next manual opening.

## ▶️ Tech Stack
-   **Browser Extension:** Manifest V3
-   **Frontend:** React + JavaScript + CSS
-   **Bundler:** Vite (with `vite-plugin-web-extension` for robust Chrome extension builds)
-   **LLM:** Groq API (`llama3-70b-8192`) for intelligent security analysis

## 🛠️ Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/seezo-plugin.git
    cd seezo-plugin
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your Groq API Key:**
    *   Create a file named `.env` in the project root.
    *   Add your Groq API key to this file: `GROQ_API_KEY="your_groq_api_key_here"` (replace with your actual key).
    *   **Important:** Do NOT commit your `.env` file to version control. It is already included in `.gitignore`.
    *   Alternatively, for development/testing, you can directly embed your key in `background/index.js` (not recommended for production).

4.  **Build the extension:**
    ```bash
    npm run build
    ```

5.  **Load the extension in Chrome:**
    *   Open Chrome and go to `chrome://extensions/`.
    *   Enable "Developer mode" (usually a toggle in the top right).
    *   Click "Load unpacked" (top left).
    *   Select the `dist` directory from your project folder (`C:\Users\Skanda\seezo-plugin\dist`).

## 🚀 Usage

1.  **Automatic Analysis:** The extension will automatically run a security analysis and display the results in a popup whenever you visit a new page or reload an existing one.
2.  **Manual Analysis:**
    a.  Navigate to the web page you wish to analyze.
    b.  If the popup is not already open from an automatic analysis, click the STRIDE Design Review extension icon in your browser toolbar.
    c.  Click the large, circular "Analyze Current Page" button to initiate the security analysis.
    d.  Wait for the analysis to complete (a loading message will be displayed).
    e.  Review the STRIDE-based security findings and recommendations presented in the popup.
    f.  Click "Analyze Again" to re-run the analysis on the current page.

## 🔒 Security Considerations

-   The extension requires various permissions (e.g., `scripting`, `tabs`, `host_permissions`) to access page content, capture screenshots, and communicate with the Groq API.
-   All data collection and analysis initiation are performed locally within your browser.
-   Page data and screenshots are sent to the **Groq API** for LLM analysis. This data is handled by Groq in accordance with their privacy policy.
-   No user-specific data or browsing history is stored locally by the extension or transmitted to any third parties beyond the Groq API for analysis purposes.
-   The extension adheres to Chrome's Manifest V3 security best practices.