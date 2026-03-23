const STORAGE_KEY = "room_analysis_app_v1";
const LOG_KEY = "room_analysis_logs_v1";
const TRACK_KEY = "room_analysis_track_v1";

const demoRooms = [
  { id: 1001, rate: 87.17, today: 56.44, last30: 97.58 },
  { id: 1002, rate: 81.13, today: 52.1, last30: 88.2 },
  { id: 1003, rate: 99.91, today: 61.3, last30: 102.4 },
  { id: 1004, rate: 123.03, today: 65.8, last30: 109.7 },
  { id: 1005, rate: 82.36, today: 48.6, last30: 90.3 },
  { id: 1006, rate: 74.89, today: 45.1, last30: 84.9 },
  { id: 1007, rate: 74.73, today: 46.2, last30: 83.8 },
  { id: 1008, rate: 122.03, today: 64.5, last30: 108.1 }
];

function $(id) {
  return document.getElementById(id);
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function loadRooms() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEY), demoRooms);
}

function saveRooms(rooms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function loadLogs() {
  return safeJsonParse(localStorage.getItem(LOG_KEY), []);
}

function saveLogs(logs) {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

function loadTracked() {
  return safeJsonParse(localStorage.getItem(TRACK_KEY), []);
}

function saveTracked(ids) {
  localStorage.setItem(TRACK_KEY, JSON.stringify(ids));
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getWeights() {
  const wr = toNumber($("weightRate").value, 40);
  const wt = toNumber($("weightToday").value, 30);
  const w30 = toNumber($("weight30").value, 30);
  const total = wr + wt + w30;

  return {
    wr,
    wt,
    w30,
    total: total > 0 ? total : 1
  };
}

function calcScore(room) {
  const { wr, wt, w30, total } = getWeights();

  const rateScore = (Math.min(toNumber(room.rate), 150) / 150) * 100;
  const todayScore = (Math.min(toNumber(room.today), 150) / 150) * 100;
  const last30Score = (Math.min(toNumber(room.last30), 150) / 150) * 100;

  return Math.round(
    (rateScore * wr + todayScore * wt + last30Score * w30) / total
  );
}

function getBadge(score) {
  if (score >= 90) return "高觀察值";
  if (score >= 75) return "中高觀察值";
  return "一般觀察值";
}

function getSortedRooms() {
  const rooms = loadRooms().map((room) => ({
    ...room,
    score: calcScore(room)
  }));

  const mode = $("sortMode").value || "score";

  rooms.sort((a, b) => {
    return toNumber(b[mode]) - toNumber(a[mode]);
  });

  return rooms;
}

function formatMoney(value) {
  const num = toNumber(value, 0);
  return num.toLocaleString("zh-TW");
}

function toggleTrack(id) {
  const tracked = loadTracked();
  const exists = tracked.includes(id);
  const next = exists ? tracked.filter((item) => item !== id) : [...tracked, id];
  saveTracked(next);
  renderAll();
}

function fillLogRoom(id) {
  $("logRoomId").value = id;
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth"
  });
}

function renderRooms() {
  const roomGrid = $("roomGrid");
  const tracked = loadTracked();
  const rooms = getSortedRooms();

  roomGrid.innerHTML = rooms
    .map((room) => {
      const trackedText = tracked.includes(room.id) ? "取消追蹤" : "加入追蹤";
      return `
        <div class="card room-card">
          <div class="room-title">
            <div>
              <div class="muted" style="font-size:12px;">房號</div>
              <div class="room-number">${room.id}</div>
            </div>
            <div class="badge">${getBadge(room.score)}</div>
          </div>

          <div class="row">
            <span class="muted">即時百分比</span>
            <span>${toNumber(room.rate).toFixed(2)}%</span>
          </div>
          <div class="row">
            <span class="muted">今日得分率</span>
            <span>${toNumber(room.today).toFixed(2)}%</span>
          </div>
          <div class="row">
            <span class="muted">近30天</span>
            <span>${toNumber(room.last30).toFixed(2)}%</span>
          </div>
          <div class="row">
            <span class="muted">觀察分數</span>
            <span>${room.score}/100</span>
          </div>

          <div class="progress">
            <div style="width:${room.score}%;"></div>
          </div>

          <div class="action-row">
            <button onclick="toggleTrack(${room.id})">${trackedText}</button>
            <button class="secondary-btn" onclick="fillLogRoom(${room.id})">記錄進場</button>
          </div>
        </div>
      `;
    })
    .join("");

  $("trackedCount").textContent = loadTracked().length;
  $("bestScore").textContent = rooms[0]?.score ?? 0;
}

function renderLogs() {
  const logs = loadLogs().slice().reverse();
  const tbody = $("logTableBody");

  let totalProfit = 0;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">尚無紀錄</td></tr>`;
    $("logCount").textContent = "0";
    $("totalProfit").textContent = "0";
    return;
  }

  tbody.innerHTML = logs
    .map((log) => {
      const betAmount = toNumber(log.betAmount);
      const returnAmount = toNumber(log.returnAmount);
      const profit = returnAmount - betAmount;
      totalProfit += profit;

      return `
        <tr>
          <td>${log.time || ""}</td>
          <td>${log.roomId || ""}</td>
          <td>${formatMoney(betAmount)}</td>
          <td>${formatMoney(returnAmount)}</td>
          <td class="${profit >= 0 ? "success" : "danger"}">
            ${profit >= 0 ? "+" : ""}${formatMoney(profit)}
          </td>
          <td>${log.note || ""}</td>
        </tr>
      `;
    })
    .join("");

  $("logCount").textContent = String(logs.length);
  $("totalProfit").textContent =
    totalProfit >= 0
      ? `+${formatMoney(totalProfit)}`
      : `${formatMoney(totalProfit)}`;
}

function addOrUpdateRoom() {
  const id = toNumber($("roomId").value, 0);
  const rate = toNumber($("rate").value, 0);
  const today = toNumber($("today").value, 0);
  const last30 = toNumber($("last30").value, 0);

  if (!id) {
    alert("請先輸入房號");
    return;
  }

  const rooms = loadRooms();
  const found = rooms.find((room) => room.id === id);

  if (found) {
    found.rate = rate;
    found.today = today;
    found.last30 = last30;
  } else {
    rooms.push({ id, rate, today, last30 });
  }

  saveRooms(rooms);

  $("roomId").value = "";
  $("rate").value = "";
  $("today").value = "";
  $("last30").value = "";

  renderAll();
}

function addLog() {
  const roomId = toNumber($("logRoomId").value, 0);
  const betAmount = toNumber($("betAmount").value, 0);
  const returnAmount = toNumber($("returnAmount").value, 0);
  const note = $("note").value.trim();

  if (!roomId) {
    alert("請輸入房號");
    return;
  }

  const logs = loadLogs();

  logs.push({
    roomId,
    betAmount,
    returnAmount,
    note,
    time: new Date().toLocaleString("zh-TW")
  });

  saveLogs(logs);

  $("logRoomId").value = "";
  $("betAmount").value = "";
  $("returnAmount").value = "";
  $("note").value = "";

  renderLogs();
}

function resetDemoData() {
  saveRooms(demoRooms);
  saveLogs([]);
  saveTracked([]);
  renderAll();
}

function bindEvents() {
  $("roomSubmitBtn").addEventListener("click", addOrUpdateRoom);
  $("logSubmitBtn").addEventListener("click", addLog);
  $("resetBtn").addEventListener("click", resetDemoData);

  $("sortMode").addEventListener("change", renderAll);
  $("weightRate").addEventListener("input", renderAll);
  $("weightToday").addEventListener("input", renderAll);
  $("weight30").addEventListener("input", renderAll);
}

function renderAll() {
  renderRooms();
  renderLogs();
}

window.toggleTrack = toggleTrack;
window.fillLogRoom = fillLogRoom;

bindEvents();
renderAll();