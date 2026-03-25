"use client";

import { useState } from "react";
import { languages } from "@/lib/languages";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

export default function TranslatorPanel() {
  const [sourceLanguage, setSourceLanguage] = useState("en-US");
  const [targetLanguage, setTargetLanguage] = useState("hi");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const speechSynthesisLangMap: Record<string, string> = {
    en: "en-US",
    hi: "hi-IN",
    ja: "ja-JP",
    mr: "mr-IN",
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechSynthesisLangMap[targetLanguage] || "en-US";

    synth.speak(utterance);
  };

  const startTranslation = async () => {
    try {
      setError("");
      setTranscript("");
      setTranslation("");

      const tokenResponse = await fetch("/api/speech-token");

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        setError(errorData.error || "Failed to fetch speech token.");
        return;
      }

      const { token, region } = await tokenResponse.json();

      const translationConfig =
        SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(
          token,
          region
        );

      translationConfig.speechRecognitionLanguage = sourceLanguage;
      translationConfig.addTargetLanguage(targetLanguage);

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      const recognizer = new SpeechSDK.TranslationRecognizer(
        translationConfig,
        audioConfig
      );

      recognizer.recognizing = (_sender, event) => {
        setIsProcessing(true);

        if (event.result?.text) {
          setTranscript(event.result.text);
        }
      };

      recognizer.recognized = (_sender, event) => {
        setIsProcessing(false);

        setTranscript(event.result.text || "");

        const translatedText =
          event.result.translations?.get(targetLanguage) || "";

        setTranslation(translatedText);

        if (translatedText) {
          speak(translatedText);
        }
      };

      recognizer.canceled = (_sender, event) => {
        setIsProcessing(false);
        setError(`Recognition canceled: ${event.reason}`);
        recognizer.stopContinuousRecognitionAsync();
        setIsListening(false);
      };

      recognizer.sessionStopped = () => {
        setIsProcessing(false);
        recognizer.stopContinuousRecognitionAsync();
        setIsListening(false);
      };

      recognizer.startContinuousRecognitionAsync();
      (window as Window & { __recognizer?: SpeechSDK.TranslationRecognizer }).__recognizer =
        recognizer;

      setIsListening(true);
    } catch (err) {
      console.error(err);
      setError("Failed to start translation.");
    }
  };

  const stopTranslation = () => {
    setIsProcessing(false);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const recognizer = (
      window as Window & { __recognizer?: SpeechSDK.TranslationRecognizer }
    ).__recognizer;

    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync(() => {
        setIsListening(false);
      });
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 700 }}>
      <div>
        <label>Source Language: </label>
        <select
          value={sourceLanguage}
          onChange={(e) => setSourceLanguage(e.target.value)}
          disabled={isListening}
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Target Language: </label>
        <select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          disabled={isListening}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="ja">Japanese</option>
          <option value="mr">Marathi</option>
        </select>
      </div>

      <button onClick={isListening ? stopTranslation : startTranslation}>
        {isListening ? "Stop" : "Start"}
      </button>

      {isProcessing && <p style={{ color: "green" }}>Listening...</p>}

      <div>
        <h3>Transcript</h3>
        <div>{transcript || "Speech will appear here..."}</div>
      </div>

      <div>
        <h3>Translation</h3>
        <div>{translation || "Translation will appear here..."}</div>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}