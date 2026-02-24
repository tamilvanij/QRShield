// QRShield frontend logic
const analyzeBtn = document.getElementById('analyze-btn')
const urlInput = document.getElementById('url-input')
const loader = document.getElementById('loader')
const result = document.getElementById('result')
const riskScoreEl = document.getElementById('risk-score')
const statusBadge = document.getElementById('status-badge')
const explanationEl = document.getElementById('explanation')
const startScan = document.getElementById('start-scan')
const stopScan = document.getElementById('stop-scan')

const BACKEND_URL = 'http://localhost:9000/analyze'

function showLoader(show){
  loader.classList.toggle('hidden', !show)
}

function showResult(obj){
  result.classList.remove('hidden')
  riskScoreEl.textContent = obj.risk_score
  explanationEl.textContent = obj.reason
  statusBadge.textContent = obj.status
  statusBadge.className = 'badge' // reset
  if(obj.status === 'Safe') statusBadge.classList.add('safe')
  else if(obj.status === 'Suspicious') statusBadge.classList.add('suspicious')
  else statusBadge.classList.add('dangerous')
}

async function analyze(url){
  showLoader(true)
  result.classList.add('hidden')
  try{
    const resp = await fetch(BACKEND_URL, {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({url})
    })
    if(!resp.ok){
      const text = await resp.text()
      throw new Error(text || 'Server error')
    }
    const data = await resp.json()
    showResult(data)
  }catch(err){
    explanationEl.textContent = 'Error: ' + (err.message || err)
    result.classList.remove('hidden')
    statusBadge.className = 'badge dangerous'
    riskScoreEl.textContent = '—'
  }finally{
    showLoader(false)
  }
}

analyzeBtn.addEventListener('click', ()=>{
  const url = urlInput.value.trim()
  if(!url) return alert('Please enter or scan a URL first.')
  analyze(url)
})

// Camera QR scanning using html5-qrcode
let html5QrcodeScanner = null
const readerId = 'reader'

startScan.addEventListener('click', async ()=>{
  const Html5Qrcode = window.Html5Qrcode
  if(!Html5Qrcode) return alert('Scanner library not loaded')
  if(html5QrcodeScanner) return
  html5QrcodeScanner = new Html5Qrcode(readerId)
  try{
    await html5QrcodeScanner.start({facingMode:'environment'}, {fps:10, qrbox:250}, (decoded)=>{
      urlInput.value = decoded
      // Auto-analyze quickly after decode
      analyze(decoded)
    })
  }catch(err){
    alert('Camera start failed: ' + err)
  }
})

stopScan.addEventListener('click', async ()=>{
  if(!html5QrcodeScanner) return
  try{
    await html5QrcodeScanner.stop()
  }catch(e){}
  html5QrcodeScanner.clear()
  html5QrcodeScanner = null
})

// Nice small UX touch: allow Enter to analyze
urlInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') analyzeBtn.click()
})
