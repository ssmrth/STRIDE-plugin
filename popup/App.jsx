import React, { useState } from 'react';
import './index.css';

function App() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [securityStatus, setSecurityStatus] = useState(null);

  // Helper function to format the analysis output (simple Markdown-like parsing)
  const formatAnalysisOutput = (text) => {
    if (!text) return null;

    // 1. Replace **text** with <strong>text</strong> globally
    let htmlContent = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const lines = htmlContent.split('\n');
    let finalHtml = '';
    let inList = false;
    let listType = ''; // 'ul' or 'ol'
    let strideCounter = 0; // Counter for STRIDE sections
    let simpleFixesCounter = 0; // Counter for Simple Fixes sections
    let recommendationsCounter = 0; // New counter for Additional Recommendations
    let currentSection = 'none'; // 'stride', 'simpleFixes', 'recommendations', 'other'

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      const lowerCaseTrimmedLine = trimmedLine.toLowerCase();

      // Check for section headings first (case-insensitive)
      if (lowerCaseTrimmedLine.includes('stride analysis:')) {
        currentSection = 'stride';
        strideCounter = 0; // Reset STRIDE counter for a new section
        finalHtml += `<p><strong>${trimmedLine}</strong></p>`;
        // Close any open list
        if (inList) { finalHtml += `</${listType}>`; inList = false; listType = ''; }
        return;
      } else if (lowerCaseTrimmedLine.includes('simple fixes:')) {
        currentSection = 'simpleFixes';
        simpleFixesCounter = 0; // Reset Simple Fixes counter for a new section
        finalHtml += `<p><strong>${trimmedLine}</strong></p>`;
        // Close any open list
        if (inList) { finalHtml += `</${listType}>`; inList = false; listType = ''; }
        return;
      } else if (lowerCaseTrimmedLine.includes('recommendations:')) { // Changed from 'additional recommendations' to 'recommendations' to match new image
        currentSection = 'recommendations'; 
        recommendationsCounter = 0; // Reset recommendations counter
        finalHtml += `<p><strong>${trimmedLine}</strong></p>`;
        // Close any open list
        if (inList) { finalHtml += `</${listType}>`; inList = false; listType = ''; }
        return;
      }

      // Temporarily remove strong tags for simpler numbered item matching, 
      // then re-add strong tags for rendering if needed. 
      let parsingLine = trimmedLine.replace(/<\/?strong>/g, ''); 

      // Now handle content based on current section and line type
      const numberedMatch = parsingLine.match(/^(\d+)\.\s*(.+)$/);
      const bulletMatch = trimmedLine.match(/^(\*|-)\s/);

      if (numberedMatch) {
        // Close any open list before a new numbered item
        if (inList) { finalHtml += `</${listType}>`; inList = false; listType = ''; }

        const contentText = numberedMatch[2].trim(); // Get the content after the number

        let newNumber;
        if (currentSection === 'simpleFixes') {
          simpleFixesCounter++;
          newNumber = simpleFixesCounter;
        } else if (currentSection === 'stride') {
          strideCounter++;
          newNumber = strideCounter;
        } else if (currentSection === 'recommendations') { // Handle recommendations section
          recommendationsCounter++;
          newNumber = recommendationsCounter;
        } else {
          // Fallback if no specific section, use existing number from LLM
          newNumber = numberedMatch[1]; 
        }
        finalHtml += `<p><strong>${newNumber}. ${contentText}</strong></p>`;
      } else if (bulletMatch) {
        const listItemContent = trimmedLine.substring(bulletMatch[0].length).trim();
        if (!inList || listType !== 'ul') {
          if (inList) { finalHtml += `</${listType}>`; } // Close old list if type changes
          finalHtml += '<ul>';
          inList = true;
          listType = 'ul';
        }
        finalHtml += `<li>${listItemContent}</li>`;
      } else {
        // If not a list item or numbered heading, and was in a list, close it
        if (inList) { finalHtml += `</${listType}>`; inList = false; listType = ''; }
        if (trimmedLine !== '') {
          finalHtml += `<p>${trimmedLine}</p>`;
        }
      }
    });

    // Close any open list at the end
    if (inList) { finalHtml += `</${listType}>`; }

    return <div dangerouslySetInnerHTML={{ __html: finalHtml }} />;
  };

  const analyzeCurrentPage = async () => {
    setLoading(true);
    setError(null);
    setSecurityStatus(null);
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const pageData = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'collectData' }, (response) => {
          resolve(response);
        });
      });

      if (!pageData) {
        setError('Could not collect page data. Make sure you are on a valid page.');
        setLoading(false);
        return;
      }

      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'analyzePage', pageData },
          (response) => {
            resolve(response);
          }
        );
      });

      setAnalysis(result.analysis);
      // Determine security status from LLM analysis
      if (result.analysis) {
        const lowerCaseAnalysis = result.analysis.toLowerCase();
        if (lowerCaseAnalysis.includes('insecure')) { // Prioritize 'insecure'
          setSecurityStatus('insecure');
        } else if (lowerCaseAnalysis.includes('secure')) {
          setSecurityStatus('secure');
        } else {
          setSecurityStatus('unknown'); // Default or fallback status
        }
      }

    } catch (err) {
      setError('Error analyzing page. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="popup-container">
      <h1>STRIDE Design Review</h1>
      
      {!analysis && !loading && (
        <button 
          className="analyze-button"
          onClick={analyzeCurrentPage}
        >
          Analyze Current Page
        </button>
      )}

      {loading && (
        <div className="loading">
          Analyzing page security...
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {analysis && (
        <div className="analysis-result">
          {securityStatus && (
            <div className={`security-status-box status-${securityStatus}`}>
              {securityStatus.toUpperCase()}
            </div>
          )}
          <h2>Security Analysis</h2>
          <div className="analysis-content">
            {formatAnalysisOutput(analysis)}
          </div>
          <button 
            className="analyze-again-button"
            onClick={analyzeCurrentPage}
          >
            Analyze Again
          </button>
        </div>
      )}
    </div>
  );
}

export default App; 