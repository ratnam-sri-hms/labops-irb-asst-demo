import React, { useState } from 'react';
import './App.css';


function App() {
  const [irbForm, setIrbForm] = useState(null);
  const [irbPolicy, setIrbPolicy] = useState(null);
  const [loading, setLoading] = useState(false);

  const extractTextFromPDF = async (file) => {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((s) => s.str).join(' ') + '\n';
    }
    return text;
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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

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
      alert("Response logged in console!");
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong.");
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
      </div>
    </div>
  );
}

export default App;
