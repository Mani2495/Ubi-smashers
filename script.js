let players = [];
let sessions = [];
let currentEditId = null;

function makeId() {
  return "s_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
}

function loadData() {
  const p = localStorage.getItem("ubiPlayers");
  const s = localStorage.getItem("ubiSessions");
  players = p ? JSON.parse(p) : [];
  sessions = s ? JSON.parse(s) : [];

  if (players.length === 0) {
    players = ["Player 1", "Player 2"];
  }

  sessions.forEach(sess => {
    if (!sess.id) sess.id = makeId();
  });
}

function saveData() {
  localStorage.setItem("ubiPlayers", JSON.stringify(players));
  localStorage.setItem("ubiSessions", JSON.stringify(sessions));
}

function renderPlayers() {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  players.forEach((name, idx) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span>${name}</span><span class="remove" onclick="removePlayer(${idx})">❌</span>`;
    list.appendChild(chip);
  });

  const checklist = document.getElementById("playerChecklist");
  checklist.innerHTML = "";
  players.forEach((name, idx) => {
    const row = document.createElement("div");
    row.innerHTML = `
      <input type="checkbox" id="pc_${idx}" value="${name}">
      <label for="pc_${idx}" style="font-weight:400;">${name}</label>
    `;
    checklist.appendChild(row);
  });
}

function renderHistory() {
  const body = document.getElementById("historyBody");
  body.innerHTML = "";
  sessions.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.date}</td>
      <td>S$${s.courtCost.toFixed(2)}</td>
      <td>${s.shuttlesUsed} × S$${s.shuttleCost.toFixed(2)}</td>
      <td>S$${s.total.toFixed(2)}</td>
      <td>${s.players.join(", ")}</td>
      <td>S$${s.perPlayer.toFixed(2)}</td>
      <td>
        <button class="btn-small" onclick="openEditModal('${s.id}')">Edit</button>
        <button class="btn-small danger" onclick="deleteSession('${s.id}')">Delete</button>
      </td>
    `;
    body.appendChild(tr);
  });
}

function renderMonthOptions() {
  const select = document.getElementById("monthSelect");
  const monthsSet = new Set();
  sessions.forEach(s => monthsSet.add(s.monthKey));
  const months = Array.from(monthsSet).filter(Boolean).sort();

  select.innerHTML = "";
  if (months.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No sessions yet";
    select.appendChild(opt);
  } else {
    months.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    });
  }
}

function updateMonthlyTable() {
  const body = document.getElementById("monthlyBody");
  body.innerHTML = "";
  const select = document.getElementById("monthSelect");
  const monthKey = select.value;
  if (!monthKey) return;

  const totals = {};
  sessions
    .filter(s => s.monthKey === monthKey)
    .forEach(s => {
      s.players.forEach(p => {
        totals[p] = (totals[p] || 0) + s.perPlayer;
      });
    });

  const names = Object.keys(totals).sort();
  if (names.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="2">No data for this month.</td>`;
    body.appendChild(tr);
    return;
  }

  names.forEach(name => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td><td>S$${totals[name].toFixed(2)}</td>`;
    body.appendChild(tr);
  });
}

function addPlayer() {
  const input = document.getElementById("newPlayer");
  const name = input.value.trim();
  const err = document.getElementById("playerError");
  err.style.display = "none";
  if (!name || players.map(p => p.toLowerCase()).includes(name.toLowerCase())) {
    err.style.display = "block";
    return;
  }
  players.push(name);
  input.value = "";
  saveData();
  renderPlayers();
}

function removePlayer(idx) {
  if (!confirm("Remove this player from new sessions?")) return;
  players.splice(idx, 1);
  saveData();
  renderPlayers();
}

function saveSession() {
  const dateEl = document.getElementById("sessionDate");
  const courtCostEl = document.getElementById("courtCost");
  const shuttleCostEl = document.getElementById("shuttleCost");
  const shuttlesUsedEl = document.getElementById("shuttlesUsed");
  const err = document.getElementById("sessionError");
  err.style.display = "none";

  const date = dateEl.value;
  const courtCost = parseFloat(courtCostEl.value);
  const shuttleCost = parseFloat(shuttleCostEl.value);
  const shuttlesUsed = parseFloat(shuttlesUsedEl.value);

  const selectedPlayers = [];
  players.forEach((name, idx) => {
    const cb = document.getElementById("pc_" + idx);
    if (cb && cb.checked) selectedPlayers.push(name);
  });

  if (!date || isNaN(courtCost) || isNaN(shuttleCost) || isNaN(shuttlesUsed) || selectedPlayers.length === 0) {
    err.style.display = "block";
    return;
  }

  const total = courtCost + shuttleCost * shuttlesUsed;
  const perPlayer = total / selectedPlayers.length;
  const monthKey = date.slice(0, 7);

  const session = {
    id: makeId(),
    date,
    monthKey,
    courtCost,
    shuttleCost,
    shuttlesUsed,
    total,
    perPlayer,
    players: selectedPlayers
  };
  sessions.push(session);
  saveData();

  document.getElementById("summaryTotal").textContent = "S$" + total.toFixed(2);
  document.getElementById("summaryPerPlayer").textContent = "S$" + perPlayer.toFixed(2);
  document.getElementById("summaryPlayers").textContent = selectedPlayers.length + " player(s)";

  renderHistory();
  renderMonthOptions();
  updateMonthlyTable();
}

function clearSessionForm() {
  ["sessionDate", "courtCost", "shuttleCost", "shuttlesUsed"].forEach(id => {
    document.getElementById(id).value = "";
  });
  players.forEach((_, idx) => {
    const cb = document.getElementById("pc_" + idx);
    if (cb) cb.checked = false;
  });
  document.getElementById("sessionError").style.display = "none";
  document.getElementById("summaryTotal").textContent = "S$0.00";
  document.getElementById("summaryPerPlayer").textContent = "S$0.00";
  document.getElementById("summaryPlayers").textContent = "–";
}

function openEditModal(id) {
  currentEditId = id;
  const session = sessions.find(s => s.id === id);
  if (!session) return;

  document.getElementById("editDate").value = session.date;
  document.getElementById("editCourtCost").value = session.courtCost;
  document.getElementById("editShuttleCost").value = session.shuttleCost;
  document.getElementById("editShuttlesUsed").value = session.shuttlesUsed;

  const container = document.getElementById("editPlayerChecklist");
  container.innerHTML = "";
  const unionPlayers = Array.from(new Set([...players, ...session.players]));
  unionPlayers.forEach((name, idx) => {
    const row = document.createElement("div");
    const checked = session.players.includes(name);
    row.innerHTML = `
      <input type="checkbox" id="epc_${idx}" value="${name}" ${checked ? "checked" : ""}>
      <label for="epc_${idx}" style="font-weight:400;">${name}</label>
    `;
    container.appendChild(row);
  });

  document.getElementById("editError").style.display = "none";
  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
  currentEditId = null;
  document.getElementById("editModal").style.display = "none";
}

function saveEditChanges() {
  if (!currentEditId) return;
  const session = sessions.find(s => s.id === currentEditId);
  if (!session) return;

  const err = document.getElementById("editError");
  err.style.display = "none";

  const date = document.getElementById("editDate").value;
  const courtCost = parseFloat(document.getElementById("editCourtCost").value);
  const shuttleCost = parseFloat(document.getElementById("editShuttleCost").value);
  const shuttlesUsed = parseFloat(document.getElementById("editShuttlesUsed").value);

  const checkboxes = document.querySelectorAll("#editPlayerChecklist input[type='checkbox']");
  const selectedPlayers = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selectedPlayers.push(cb.value);
  });

  if (!date || isNaN(courtCost) || isNaN(shuttleCost) || isNaN(shuttlesUsed) || selectedPlayers.length === 0) {
    err.style.display = "block";
    return;
  }

  const total = courtCost + shuttleCost * shuttlesUsed;
  const perPlayer = total / selectedPlayers.length;
  const monthKey = date.slice(0, 7);

  session.date = date;
  session.courtCost = courtCost;
  session.shuttleCost = shuttleCost;
  session.shuttlesUsed = shuttlesUsed;
  session.total = total;
  session.perPlayer = perPlayer;
  session.players = selectedPlayers;
  session.monthKey = monthKey;

  saveData();
  renderHistory();
  renderMonthOptions();
  updateMonthlyTable();
  closeEditModal();
}

function deleteSession(id) {
  if (!confirm("Delete this session?")) return;
  sessions = sessions.filter(s => s.id !== id);
  saveData();
  renderHistory();
  renderMonthOptions();
  updateMonthlyTable();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadData();
  renderPlayers();
  renderHistory();
  renderMonthOptions();
  updateMonthlyTable();
});