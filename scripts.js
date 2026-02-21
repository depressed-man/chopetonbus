const API_KEY = "opendata-bordeaux-metropole-flux-gtfs-rt";
const API_BASE = "https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux/stop-monitoring.json";

// Configuration des arrêts avec plusieurs lignes
const STOP_CONFIGS = {
    "merignac-centre": {
        stopName: "Mérignac Centre (Médiathèque)",
        stopCode: "bordeaux:StopPoint:BP:2456:LOC",
        lines: [
            { lineRef: "bordeaux:Line:51:LOC", lineNumber: "51", color: "#4a4a46" },
            { lineRef: "bordeaux:Line:30:LOC", lineNumber: "30", color: "#76b72b", stopCode: "bordeaux:StopPoint:BP:2273:LOC" },
            { lineRef: "bordeaux:Line:01:LOC", lineNumber: "1", color: "#00b1ed" }
        ]
    },
    "avenue-truc": {
        stopName: "Avenue du Truc",
        stopCode: "bordeaux:StopPoint:BP:3111:LOC",
        lines: [
            { lineRef: "bordeaux:Line:30:LOC", lineNumber: "30", color: "#76b72b" }
        ]
    },
    "beaudesert": {
        stopName: "Beaudésert",
        stopCode: "bordeaux:StopPoint:BP:2239:LOC",
        lines: [
            { lineRef: "bordeaux:Line:51:LOC", lineNumber: "51", color: "#4a4a46" },
            { lineRef: "bordeaux:Line:01:LOC", lineNumber: "1", color: "#00b1ed" }
        ]
    },
    "dassault-39": {
        stopName: "Dassault",
        stopCode: "bordeaux:StopPoint:BP:8649:LOC",
        lines: [
            { lineRef: "bordeaux:Line:39:LOC", lineNumber: "39", color: "#00b1ed" },
            { lineRef: "bordeaux:Line:439:LOC", lineNumber: "39 EST", color: "#00b1ed" }
        ]
    },
    "5-chemins-39": {
        stopName: "5 Chemins (Le Haillan)",
        stopCode: "bordeaux:StopPoint:BP:9324:LOC",
        lines: [
            { lineRef: "bordeaux:Line:39:LOC", lineNumber: "39", color: "#00b1ed" },
            { lineRef: "bordeaux:Line:439:LOC", lineNumber: "39 EST", color: "#00b1ed" }
        ]
    },
    "dassault-51": {
        stopName: "Dassault",
        stopCode: "bordeaux:StopPoint:BP:8650:LOC",
        lines: [
            { lineRef: "bordeaux:Line:51:LOC", lineNumber: "51", color: "#4a4a46" }
        ]
    },
    "dassault-1": {
        stopName: "Dassault",
        stopCode: "bordeaux:StopPoint:BP:5758:LOC",
        lines: [
            { lineRef: "bordeaux:Line:01:LOC", lineNumber: "1", color: "#00b1ed" }
        ]
    },
    "5-chemin": {
        stopName: "5 Chemins",
        stopCode: "bordeaux:StopPoint:BP:1145:LOC",
        lines: [
            { lineRef: "bordeaux:Line:30:LOC", lineNumber: "30", color: "#76b72b" }
        ]
    },
    "toussaint-catros-1": {
        stopName: "Toussaint Catros",
        stopCode: "bordeaux:StopPoint:BP:5755:LOC",
        lines: [
            { lineRef: "bordeaux:Line:39:LOC", lineNumber: "39", color: "#00b1ed" },
            { lineRef: "bordeaux:Line:439:LOC", lineNumber: "39 EST", color: "#00b1ed" }
        ]
    },
    "toussaint-catros-2": {
        stopName: "Toussaint Catros",
        stopCode: "bordeaux:StopPoint:BP:5756:LOC",
        lines: [
            { lineRef: "bordeaux:Line:39:LOC", lineNumber: "39", color: "#00b1ed" },
            { lineRef: "bordeaux:Line:439:LOC", lineNumber: "39 EST", color: "#00b1ed" }
        ]
    }
};

let currentTab = "aller";

const ALL_STOPS = {
    aller: [
        { key: "merignac-centre" },
        { key: "avenue-truc" },
        { key: "beaudesert" },
        { key: "dassault-39" },
        { key: "5-chemins-39" }
    ],
    retour: [
        { key: "dassault-51" },
        { key: "dassault-1" },
        { key: "5-chemin" },
        { key: "toussaint-catros-1" },
        { key: "toussaint-catros-2" }
    ]
};

function setDefaultTab() {
    const currentHour = new Date().getHours();

    if (currentHour >= 12) {
        const retourTab = document.querySelector('.tab:last-child');
        switchTab('retour', retourTab);
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker enregistré'))
        .catch((err) => console.log('Erreur Service Worker:', err));
}

setDefaultTab();
refreshAllStops();

function switchTab(tab, el) {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    el.classList.add("active");

    document.getElementById("aller-content").classList.toggle("hidden", tab !== "aller");
    document.getElementById("retour-content").classList.toggle("hidden", tab !== "retour");
    
    refreshAllStops();
}

async function fetchBusData(stopCode, lineRef) {
    if (!stopCode) return { error: "Code arrêt non configuré" };

    const url = `${API_BASE}?AccountKey=${API_KEY}&MonitoringRef=${stopCode}&LineRef=${lineRef}&PreviewInterval=PT2H`;

    try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
        const data = await res.json();

        const delivery = data?.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0];
        if (!delivery || !delivery.MonitoredStopVisit)
            return { empty: true };

        return delivery.MonitoredStopVisit;
    }
    catch (err) {
        return { error: err.message };
    }
}

function formatTime(timeStr) {
    const now = new Date();
    const t = new Date(timeStr);
    const diff = Math.round((t - now) / 60000);

    if (diff < 1) return "<span style='color:#e74c3c'>À l'arrêt</span>";
    if (diff === 1) return "1 min";
    if (diff < 60) return diff + " min";

    return t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function displayBusData(elementId, linesData) {
    const el = document.getElementById(elementId);

    let html = "";

    for (const lineData of linesData) {
        const { lineNumber, color, visits } = lineData;

        if (visits.error) {
            html += `<div class="line-section">
                <div class="line-badge" style="background: ${color};">${lineNumber}</div>
                <div class="error">⚠️ ${visits.error}</div>
            </div>`;
            continue;
        }

        if (visits.empty || !visits.length) {
            html += `<div class="line-section">
                <div class="line-badge" style="background: ${color};">${lineNumber}</div>
                <div class="warning">Aucun bus dans l'heure</div>
            </div>`;
            continue;
        }

        let lineHtml = `<div class="line-section">
            <div class="line-badge" style="background: ${color};"> ${lineNumber}</div>`;

        visits.slice(0, 3).forEach(v => {
            const j = v.MonitoredVehicleJourney;
            const call = j.MonitoredCall;

            const dest = j.DestinationName?.[0]?.value ||
                         j.DirectionName?.[0]?.value ||
                         "Destination inconnue";

            const time = call.ExpectedDepartureTime ||
                         call.ExpectedArrivalTime ||
                         call.AimedDepartureTime ||
                         call.AimedArrivalTime;

            if (!time) return;

            lineHtml += `
            <div class="bus-time">
                <div class="destination">→ ${dest}</div>
                <div class="time">${formatTime(time)}</div>
            </div>`;
        });

        lineHtml += `</div>`;
        html += lineHtml;
    }

    el.innerHTML = html || `<div class="warning">Aucun horaire disponible</div>`;
    document.getElementById("last-update").innerText =
        "Mise à jour : " + new Date().toLocaleTimeString("fr-FR");
}

async function refreshStop(key) {
    const config = STOP_CONFIGS[key];
    const el = document.getElementById("bus-" + key);

    el.innerHTML = `<div class="loading">⏳ Chargement…</div>`;

    const linesData = [];
    for (const line of config.lines) {
        const visits = await fetchBusData(line.stopCode || config.stopCode, line.lineRef);
        linesData.push({
            lineNumber: line.lineNumber,
            color: line.color,
            visits: visits
        });
    }

    displayBusData("bus-" + key, linesData);
}

async function refreshAllStops() {
    for (const s of ALL_STOPS[currentTab]) {
        await refreshStop(s.key);
    }
}

let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

const contentArea = document.querySelector('.content');

contentArea.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

contentArea.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const swipeThreshold = 50;
    const horizontalDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);

    if (Math.abs(horizontalDistance) > swipeThreshold && Math.abs(horizontalDistance) > verticalDistance) {
        if (horizontalDistance > 0) {
            if (currentTab === "retour") {
                const allerTab = document.querySelector('.tab:first-child');
                switchTab('aller', allerTab);
            }
        } else {
            if (currentTab === "aller") {
                const retourTab = document.querySelector('.tab:last-child');
                switchTab('retour', retourTab);
            }
        }
    }
}