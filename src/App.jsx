import React, { useState } from 'react';
import './App.css';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js`;


function App() {
  const [irbForm, setIrbForm] = useState(null);
  const [irbPolicy, setIrbPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');


  const extractTextFromPDF = async (file) => {
    const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
    const pdf = await loadingTask.promise;
  
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
  
    return fullText.trim();
  };  
  

  const callGroqAPI = async (formText, policyText) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    const prompt = `
You are an expert in IRB policies. Given an IRB form and an institution's IRB policy, identify key alignment areas and flag inconsistencies.

IRB Form:
${formText}

Policy:
${policyText}

Return a summary of matched sections and any potential concerns or mismatches.
`;

    console.log("Sending to Groq with formText:", formText);
    console.log("Sending to Groq with policyText:", policyText);


    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    console.log("Groq response status:", response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq API Error:", errorText);
        throw new Error("Groq API request failed.");
      }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response from Groq.";
  };

  const handleAnalyze = async () => {
    if (!irbForm || !irbPolicy) return alert("Upload both files.");
    setLoading(true);

    try {
      const [formText, policyText] = await Promise.all([
        extractTextFromPDF(irbForm),
        extractTextFromPDF(irbPolicy),
      ]);

      const result = await callGroqAPI(formText, policyText);
      console.log("Groq result:", result);
      setResponse(result);

    } catch (err) {
        console.error("Full Error:", err?.stack || err);
        setResponse("Something went wrong. Please try again.");
      }
      

    setLoading(false);
  };

  return (
    <div className="app">
      <div className="card">
        <h1 className="title">IRB Assistant Demo</h1>

        <label className="label">Upload IRB Form (PDF)</label>
        <input className="file-input" type="file" accept="application/pdf" onChange={e => setIrbForm(e.target.files[0])} />

        <label className="label">Upload IRB Policy (PDF)</label>
        <input className="file-input" type="file" accept="application/pdf" onChange={e => setIrbPolicy(e.target.files[0])} />

        <button className="analyze-btn" onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze IRB"}
        </button>

        <p className="sample-link">
          or <button className="link-btn">Use Sample Files</button>
        </p>

        {response && (
        <div className="response-box">
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: '#7fdbff' }}>AI Response</h2>

            <pre>{response}</pre>
        </div>
        )}

      </div>
    </div>
  );
}

export default App;
