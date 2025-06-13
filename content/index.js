console.log("Seezo content script loaded!");

// Function to get DOM summary
function getDOMSummary() {
  const forms = Array.from(document.forms).map(form => ({
    id: form.id,
    action: form.action,
    method: form.method,
    inputs: Array.from(form.elements).map(input => ({
      type: input.type,
      name: input.name,
      id: input.id,
      required: input.required
    }))
  }));

  const scripts = Array.from(document.scripts).map(script => ({
    src: script.src,
    type: script.type,
    async: script.async,
    defer: script.defer
  }));

  return {
    forms,
    scripts,
    metaTags: Array.from(document.getElementsByTagName('meta')).map(meta => ({
      name: meta.name,
      content: meta.content,
      httpEquiv: meta.httpEquiv
    }))
  };
}

// Function to get storage data
function getStorageData() {
  return {
    localStorage: Object.entries(localStorage).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {}),
    sessionStorage: Object.entries(sessionStorage).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {})
  };
}

// Function to get network activity summary
function getNetworkSummary() {
  // This will be populated by the background script
  return window.performance.getEntriesByType('resource').map(entry => ({
    name: entry.name,
    type: entry.initiatorType,
    duration: entry.duration,
    size: entry.transferSize
  }));
}

// Function to get heuristic findings
function getHeuristicFindings() {
  const findings = [];
  
  // Check for mixed content
  const mixedContent = document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]');
  if (mixedContent.length > 0) {
    findings.push('Mixed content detected');
  }

  // Check for insecure forms
  const insecureForms = document.querySelectorAll('form:not([action^="https"])');
  if (insecureForms.length > 0) {
    findings.push('Insecure form submissions detected');
  }

  // Check for sensitive input fields
  const sensitiveInputs = document.querySelectorAll('input[type="password"], input[type="email"]');
  if (sensitiveInputs.length > 0) {
    findings.push('Sensitive input fields detected');
  }

  return findings;
}

// Main function to collect all data
function collectPageData() {
  return {
    url: window.location.href,
    title: document.title,
    domSummary: getDOMSummary(),
    storageData: getStorageData(),
    networkSummary: getNetworkSummary(),
    heuristicFindings: getHeuristicFindings()
  };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  if (request.action === 'collectData') {
    const pageData = collectPageData();
    sendResponse(pageData);
  }
  if (request.action === 'ping') {
    sendResponse({ pong: true });
  }
  return true;
}); 