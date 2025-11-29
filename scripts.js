const API_KEY = "opendata-bordeaux-metropole-flux-gtfs-rt";
const API_BASE = "https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux/stop-monitoring.json";

// Codes d'arrêt et lignes en dur
const STOP_CODES = {
    "51-merignac": { 
        stop: "bordeaux:StopPoint:BP:2456:LOC",
        line: "bordeaux:Line:51:LOC"
    },
    "30-truc": { 
        stop: "bordeaux:StopPoint:BP:3111:LOC",
        line: "bordeaux:Line:30:LOC"
    },
    "51-dassault": { 
        stop: "bordeaux:StopPoint:BP:8649:LOC",
        line: "bordeaux:Line:51:LOC"
    },
    "30-chemin": { 
        stop: "bordeaux:StopPoint:BP:5754:LOC",
        line: "bordeaux:Line:30:LOC"
    }
};

let currentTab = "aller";

const ALL_STOPS = {
    aller: [
        { key: "51-merignac" },
        { key: "30-truc" }
    ],
    retour: [
        { key: "51-dassault" },
        { key: "30-chemin" }
    ]
};

// Chargement initial
refreshAllStops();

/* ------------ TABS ----------- */
function switchTab(tab, el) {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    el.classList.add("active");

    document.getElementById("aller-content").classList.toggle("hidden", tab !== "aller");
    document.getElementById("retour-content").classList.toggle("hidden", tab !== "retour");
    
    // Rafraîchir les données du nouvel onglet
    refreshAllStops();
}

/* ------------ API TBM ----------- */
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

/* ----------- AFFICHAGE ----------- */
function displayBusData(elementId, visits) {
    const el = document.getElementById(elementId);

    if (visits.error) {
        el.innerHTML = `<div class="error">⚠️ ${visits.error}</div>`;
        return;
    }
    if (visits.empty) {
        el.innerHTML = `<div class="warning">Aucun bus dans l'heure</div>`;
        return;
    }

    let html = "";
    visits.slice(0, 5).forEach(v => {
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

        html += `
        <div class="bus-time">
            <div class="destination">→ ${dest}</div>
            <div class="time">${formatTime(time)}</div>
        </div>`;
    });

    el.innerHTML = html || `<div class="warning">Aucun horaire disponible</div>`;
    document.getElementById("last-update").innerText =
        "Mise à jour : " + new Date().toLocaleTimeString("fr-FR");
}

/* ----------- REFRESH ----------- */
async function refreshStop(key) {
    const config = STOP_CODES[key];
    const el = document.getElementById("bus-" + key);

    el.innerHTML = `<div class="loading">⏳ Chargement…</div>`;

    const data = await fetchBusData(config.stop, config.line);
    displayBusData("bus-" + key, data);
}

async function refreshAllStops() {
    for (const s of ALL_STOPS[currentTab]) {
        await refreshStop(s.key);
    }
}

// Rafraîchissement automatique toutes les 30 secondes
setInterval(refreshAllStops, 30000);