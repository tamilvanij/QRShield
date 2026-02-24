document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("url-input");
  const analyzeBtn = document.getElementById("analyze-btn");
  const startScanBtn = document.getElementById("start-scan");
  const stopScanBtn = document.getElementById("stop-scan");
  const resultCard = document.getElementById("result");
  const loader = document.getElementById("loader");

  const statusBadge = document.getElementById("status-badge");
  const riskScore = document.getElementById("risk-score");
  const explanation = document.getElementById("explanation");

  let html5QrCode;
  let scanning = false;

  //  CHANGE THIS
  const API_URL = "http://127.0.0.1:9000/analyze";

  // -------------------
  // Start Camera
  // -------------------
  startScanBtn.addEventListener("click", async () => {
    if (scanning) return;

    html5QrCode = new Html5Qrcode("reader");

    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length) {
        scanning = true;

        await html5QrCode.start(
          cameras[0].id,
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            urlInput.value = decodedText;
          }
        );
      }
    } catch (err) {
      alert("Camera access denied or not available.");
      console.error(err);
    }
  });

  // -------------------
  // Stop Camera
  // -------------------
  stopScanBtn.addEventListener("click", async () => {
    if (!scanning) return;

    await html5QrCode.stop();
    scanning = false;
  });

  // -------------------
  // Analyze URL
  // -------------------
  analyzeBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      alert("Please enter or scan a URL.");
      return;
    }

    resultCard.classList.add("hidden");
    loader.classList.remove("hidden");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      loader.classList.add("hidden");
      resultCard.classList.remove("hidden");

      riskScore.textContent = data.risk_score;
      explanation.textContent = data.reason;
      statusBadge.textContent = data.status;

      // Color logic
      if (data.status === "Safe") {
        resultCard.style.background = "#14532d";
      } else if (data.status === "Suspicious") {
        resultCard.style.background = "#78350f";
      } else {
        resultCard.style.background = "#7f1d1d";
      }

    } catch (error) {
      loader.classList.add("hidden");
      alert("Error connecting to backend.");
      console.error(error);
    }
  });
});
