// =====================================================
// BOB MINING - app.js V11
// Supabase + Autenticazione + Mining
// Online + Offline + Claim + Upgrade + Logout
// =====================================================

"use strict";

// -----------------------------------------------------
// SUPABASE
// -----------------------------------------------------

const SUPABASE_URL =
    "https://fxyqeeznykdtmaoywpmm.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_n6-IZsqob6jeQzL8igv-EA_lSNtURMn";

if (!window.supabase) {
    console.error("❌ Libreria Supabase non caricata.");
    throw new Error("Supabase non disponibile.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

window.supabaseClient = supabaseClient;

console.log("✅ Supabase collegato");
console.log("✅ BOB Mining V11 caricato");

// -----------------------------------------------------
// CONFIGURAZIONE
// -----------------------------------------------------

const BASE_PRODUCTION_PER_MINUTE = 0.10;
const UPGRADE_COST = 100;
const DEFAULT_OFFLINE_HOURS = 2;

const MINING_TICK_INTERVAL = 1000;
const AUTOSAVE_INTERVAL = 30000;

// -----------------------------------------------------
// STATO
// -----------------------------------------------------

let currentUser = null;

let balance = 0;
let minerLevel = 1;
let speedBonus = 0;
let offlineHours = DEFAULT_OFFLINE_HOURS;

let miningActive = false;

let lastMiningAt = null;

let lastTick = Date.now();

let isLoading = false;
let isSaving = false;
let isProcessingAction = false;
let offlineProcessing = false;

let domReady = false;

// -----------------------------------------------------
// ELEMENTI HTML
// -----------------------------------------------------

let loginBox = null;
let miningBox = null;

let emailInput = null;
let passwordInput = null;

// -----------------------------------------------------
// HELPER
// -----------------------------------------------------

function $(id) {
    return document.getElementById(id);
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function getNow() {
    return new Date();
}

// -----------------------------------------------------
// MESSAGGI
// -----------------------------------------------------

function showAuthMessage(message, type = "") {

    const element = $("authMessage");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = "message";

    if (type) {
        element.classList.add(type);
    }
}

function showMiningMessage(message, type = "") {

    const element = $("miningMessage");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = "message";

    if (type) {
        element.classList.add(type);
    }
}

// -----------------------------------------------------
// RESET
// -----------------------------------------------------

function resetMiningData() {

    balance = 0;
    minerLevel = 1;
    speedBonus = 0;

    offlineHours = DEFAULT_OFFLINE_HOURS;

    miningActive = false;

    lastMiningAt = null;

    lastTick = Date.now();

    offlineProcessing = false;

    window.balance = balance;

    updateMiningUI();
}

// -----------------------------------------------------
// UI LOGIN
// -----------------------------------------------------

function showLogin() {

    if (loginBox) {
        loginBox.classList.remove("hidden");
        loginBox.style.display = "";
    }

    if (miningBox) {
        miningBox.classList.add("hidden");
        miningBox.style.display = "";
    }
}

// -----------------------------------------------------
// UI MINING
// -----------------------------------------------------

function showMining() {

    if (loginBox) {
        loginBox.classList.add("hidden");
        loginBox.style.display = "";
    }

    if (miningBox) {
        miningBox.classList.remove("hidden");
        miningBox.style.display = "";
    }

    updateMiningUI();
}

// -----------------------------------------------------
// PRODUZIONE
// -----------------------------------------------------

function getProductionPerMinute() {

    const level = Math.max(
        1,
        Math.floor(
            safeNumber(minerLevel, 1)
        )
    );

    const bonus = Math.max(
        0,
        safeNumber(speedBonus, 0)
    );

    return (
        BASE_PRODUCTION_PER_MINUTE *
        level *
        (1 + bonus / 100)
    );
}

// -----------------------------------------------------
// AGGIUNGI PRODUZIONE
// -----------------------------------------------------

function addMiningProduction(minutes) {

    if (!miningActive) {
        return 0;
    }

    const validMinutes = safeNumber(
        minutes,
        0
    );

    if (
        validMinutes <= 0 ||
        validMinutes > 1440
    ) {
        return 0;
    }

    const production =
        getProductionPerMinute();

    const earned =
        production * validMinutes;

    if (
        !Number.isFinite(earned) ||
        earned <= 0
    ) {
        return 0;
    }

    balance += earned;

    if (!Number.isFinite(balance) || balance < 0) {
        balance = 0;
    }

    window.balance = balance;

    return earned;
}

// -----------------------------------------------------
// APPLICA ACCOUNT
// -----------------------------------------------------

function applyMiningAccount(data) {

    balance = safeNumber(
        data?.balance_points,
        0
    );

    if (balance < 0) {
        balance = 0;
    }

    minerLevel = Math.max(
        1,
        Math.floor(
            safeNumber(
                data?.miner_level,
                1
            )
        )
    );

    speedBonus = Math.max(
        0,
        safeNumber(
            data?.speed_bonus,
            0
        )
    );

    offlineHours = Math.max(
        0,
        safeNumber(
            data?.offline_hours,
            DEFAULT_OFFLINE_HOURS
        )
    );

    miningActive =
        data?.mining_active === true;

    if (data?.last_mining_at) {

        const parsedDate =
            new Date(data.last_mining_at);

        if (
            !Number.isNaN(
                parsedDate.getTime()
            )
        ) {
            lastMiningAt = parsedDate;
        } else {
            lastMiningAt = getNow();
        }

    } else {

        lastMiningAt = getNow();
    }

    window.balance = balance;

    lastTick = Date.now();

    updateMiningUI();
}

// -----------------------------------------------------
// CREA ACCOUNT
// -----------------------------------------------------

async function createMiningAccount() {

    if (!currentUser) {
        return false;
    }

    const now =
        getNow().toISOString();

    const account = {

        user_id: currentUser.id,

        balance_points: 0,

        miner_level: 1,

        speed_bonus: 0,

        offline_hours:
            DEFAULT_OFFLINE_HOURS,

        mining_active: true,

        last_mining_at: now
    };

    try {

        const { data, error } =
            await supabaseClient
                .from("mining_accounts")
                .insert(account)
                .select(
                    "balance_points, miner_level, speed_bonus, offline_hours, mining_active, last_mining_at"
                )
                .single();

        if (error) {

            console.error(
                "❌ Errore creazione account:",
                error
            );

            showMiningMessage(
                "Errore creazione account: " +
                error.message,
                "error"
            );

            return false;
        }

        applyMiningAccount(data);

        console.log(
            "✅ Account mining creato."
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Errore createMiningAccount:",
            error
        );

        showMiningMessage(
            "Errore creazione account.",
            "error"
        );

        return false;
    }
}

// -----------------------------------------------------
// CARICA ACCOUNT
// -----------------------------------------------------

async function loadMiningAccount() {

    if (!currentUser) {
        return false;
    }

    if (isLoading) {
        return false;
    }

    isLoading = true;

    try {

        const { data, error } =
            await supabaseClient
                .from("mining_accounts")
                .select(
                    "balance_points, miner_level, speed_bonus, offline_hours, mining_active, last_mining_at"
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

        if (error) {

            console.error(
                "❌ Errore caricamento account:",
                error
            );

            showAuthMessage(
                "Errore caricamento account: " +
                error.message,
                "error"
            );

            return false;
        }

        if (!data) {

            console.log(
                "ℹ️ Account mining non trovato."
            );

            return await createMiningAccount();
        }

        applyMiningAccount(data);

        console.log(
            "✅ Account mining caricato."
        );

        if (miningActive) {
            await calculateOfflineMining();
        }

        lastTick = Date.now();

        updateMiningUI();

        return true;

    } catch (error) {

        console.error(
            "❌ Errore loadMiningAccount:",
            error
        );

        showAuthMessage(
            "Errore caricamento account.",
            "error"
        );

        return false;

    } finally {

        isLoading = false;
    }
}

// -----------------------------------------------------
// SALVA ACCOUNT
// -----------------------------------------------------

async function saveMiningAccount(
    updateTimestamp = false
) {

    if (!currentUser) {
        return false;
    }

    if (isSaving) {
        return false;
    }

    isSaving = true;

    try {

        const updateData = {

            balance_points:
                Number(
                    Math.max(0, balance)
                ),

            miner_level:
                Number(
                    Math.max(
                        1,
                        Math.floor(minerLevel)
                    )
                ),

            speed_bonus:
                Number(
                    Math.max(0, speedBonus)
                ),

            offline_hours:
                Number(
                    Math.max(0, offlineHours)
                ),

            mining_active:
                Boolean(miningActive)
        };

        if (updateTimestamp) {

            updateData.last_mining_at =
                getNow().toISOString();
        }

        const { error } =
            await supabaseClient
                .from("mining_accounts")
                .update(updateData)
                .eq(
                    "user_id",
                    currentUser.id
                );

        if (error) {

            console.error(
                "❌ Errore salvataggio:",
                error
            );

            return false;
        }

        if (updateTimestamp) {

            lastMiningAt = getNow();

            lastTick = Date.now();
        }

        window.balance = balance;

        return true;

    } catch (error) {

        console.error(
            "❌ Errore saveMiningAccount:",
            error
        );

        return false;

    } finally {

        isSaving = false;
    }
}

// -----------------------------------------------------
// CALCOLO MINING OFFLINE
// -----------------------------------------------------

async function calculateOfflineMining() {

    if (!currentUser) {
        return 0;
    }

    if (!miningActive) {
        return 0;
    }

    if (offlineProcessing) {
        return 0;
    }

    if (!lastMiningAt) {

        lastMiningAt = getNow();

        return 0;
    }

    offlineProcessing = true;

    try {

        const now = getNow();

        const lastTime =
            lastMiningAt.getTime();

        if (Number.isNaN(lastTime)) {

            lastMiningAt = now;

            return 0;
        }

        const elapsedMinutes = Math.max(
            0,
            (
                now.getTime() -
                lastTime
            ) / 60000
        );

        if (elapsedMinutes <= 0) {
            return 0;
        }

        const maxMinutes = Math.max(
            0,
            offlineHours * 60
        );

        if (maxMinutes <= 0) {

            lastMiningAt = now;

            await saveMiningAccount(false);

            return 0;
        }

        const creditedMinutes =
            Math.min(
                elapsedMinutes,
                maxMinutes
            );

        const earned =
            addMiningProduction(
                creditedMinutes
            );

        /*
         * Il timestamp viene portato a "adesso".
         *
         * In questo modo il periodo già elaborato
         * non viene pagato nuovamente.
         */

        lastMiningAt = now;

        const saved =
            await saveMiningAccount(false);

        if (!saved) {

            console.error(
                "❌ Salvataggio mining offline fallito."
            );

            return 0;
        }

        lastTick = Date.now();

        updateMiningUI();

        if (earned > 0) {

            console.log(
                "⛏️ Mining offline:",
                creditedMinutes.toFixed(2),
                "minuti | +",
                earned.toFixed(4),
                "Points"
            );
        }

        return earned;

    } catch (error) {

        console.error(
            "❌ Errore calculateOfflineMining:",
            error
        );

        return 0;

    } finally {

        offlineProcessing = false;
    }
}

// -----------------------------------------------------
// UI
// -----------------------------------------------------

function updateMiningUI() {

    const balanceElement =
        $("balance");

    if (balanceElement) {

        balanceElement.textContent =
            Number(balance).toFixed(2);
    }

    const levelElement =
        $("levelBadge");

    if (levelElement) {

        levelElement.textContent =
            "LIVELLO " +
            minerLevel;
    }

    const hashrateElement =
        $("hashrate");

    if (hashrateElement) {

        hashrateElement.textContent =
            (
                10 *
                minerLevel
            ) +
            " GH/s";
    }

    const productionElement =
        $("production");

    if (productionElement) {

        productionElement.textContent =
            getProductionPerMinute()
                .toFixed(2) +
            "/min";
    }

    const statusElement =
        $("miningStatus");

    if (statusElement) {

        statusElement.textContent =
            miningActive
                ? "ONLINE"
                : "OFFLINE";

        statusElement.classList.remove(
            "status-online",
            "status-offline"
        );

        statusElement.classList.add(
            miningActive
                ? "status-online"
                : "status-offline"
        );
    }

    const toggleButton =
        $("toggleMiningBtn");

    if (toggleButton) {

        toggleButton.textContent =
            miningActive
                ? "Ferma Mining"
                : "Avvia Mining";
    }

    const upgradeButton =
        $("upgradeBtn");

    if (upgradeButton) {

        upgradeButton.textContent =
            "⬆️ Upgrade Miner — " +
            UPGRADE_COST +
            " BOB";
    }
}

// -----------------------------------------------------
// BLOCCA/SBLOCCA AZIONI
// -----------------------------------------------------

function setActionButtonsDisabled(disabled) {

    const ids = [
        "toggleMiningBtn",
        "claimBtn",
        "upgradeBtn",
        "logoutBtn"
    ];

    ids.forEach((id) => {

        const button = $(id);

        if (button) {
            button.disabled = disabled;
        }
    });
}

// -----------------------------------------------------
// TOGGLE MINING
// -----------------------------------------------------

async function toggleMining() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (isProcessingAction) {
        return;
    }

    isProcessingAction = true;

    setActionButtonsDisabled(true);

    try {

        if (miningActive) {

            const now = getNow();

            /*
             * Prima di fermare il mining
             * accreditiamo il tempo maturato.
             */

            if (lastMiningAt) {

                const elapsedMinutes =
                    Math.max(
                        0,
                        (
                            now.getTime() -
                            lastMiningAt.getTime()
                        ) / 60000
                    );

                if (elapsedMinutes > 0) {

                    const maxMinutes =
                        Math.max(
                            0,
                            offlineHours * 60
                        );

                    const creditedMinutes =
                        Math.min(
                            elapsedMinutes,
                            maxMinutes
                        );

                    addMiningProduction(
                        creditedMinutes
                    );
                }
            }

            miningActive = false;

            lastMiningAt = now;

            const saved =
                await saveMiningAccount(true);

            if (!saved) {

                miningActive = true;

                updateMiningUI();

                alert(
                    "❌ Impossibile salvare il mining."
                );

                return;
            }

            showMiningMessage(
                "Mining fermato.",
                "success"
            );

        } else {

            miningActive = true;

            lastMiningAt = getNow();

            lastTick = Date.now();

            const saved =
                await saveMiningAccount(true);

            if (!saved) {

                miningActive = false;

                updateMiningUI();

                alert(
                    "❌ Impossibile avviare il mining."
                );

                return;
            }

            showMiningMessage(
                "Mining avviato.",
                "success"
            );
        }

        updateMiningUI();

    } finally {

        isProcessingAction = false;

        setActionButtonsDisabled(false);
    }
}

// -----------------------------------------------------
// CLAIM POINTS
// -----------------------------------------------------

async function claimPoints() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (isProcessingAction) {
        return;
    }

    isProcessingAction = true;

    setActionButtonsDisabled(true);

    try {

        if (miningActive) {

            await calculateOfflineMining();
        }

        const saved =
            await saveMiningAccount(false);

        if (!saved) {

            alert(
                "❌ Impossibile salvare i Points."
            );

            return;
        }

        updateMiningUI();

        const amount =
            Number(balance).toFixed(2);

        showMiningMessage(
            "Points salvati: " +
            amount,
            "success"
        );

        alert(
            "🎁 BOB Points salvati:\n\n" +
            amount
        );

    } finally {

        isProcessingAction = false;

        setActionButtonsDisabled(false);
    }
}

// -----------------------------------------------------
// UPGRADE
// -----------------------------------------------------

async function upgradeMiner() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (isProcessingAction) {
        return;
    }

    isProcessingAction = true;

    setActionButtonsDisabled(true);

    try {

        if (miningActive) {

            await calculateOfflineMining();
        }

        if (balance < UPGRADE_COST) {

            alert(
                "❌ Servono " +
                UPGRADE_COST +
                " BOB Points."
            );

            return;
        }

        const oldBalance =
            balance;

        const oldLevel =
            minerLevel;

        balance -= UPGRADE_COST;

        minerLevel += 1;

        updateMiningUI();

        const saved =
            await saveMiningAccount(false);

        if (!saved) {

            balance =
                oldBalance;

            minerLevel =
                oldLevel;

            updateMiningUI();

            alert(
                "❌ Errore salvataggio upgrade."
            );

            return;
        }

        showMiningMessage(
            "Upgrade completato. Livello " +
            minerLevel,
            "success"
        );

        alert(
            "⬆️ Upgrade completato!\n\n" +
            "Nuovo livello: " +
            minerLevel
        );

    } finally {

        isProcessingAction = false;

        setActionButtonsDisabled(false);
    }
}

// -----------------------------------------------------
// LOGOUT
// -----------------------------------------------------

async function logout() {

    if (!currentUser) {
        return;
    }

    if (isProcessingAction) {
        return;
    }

    isProcessingAction = true;

    setActionButtonsDisabled(true);

    try {

        /*
         * Prima del logout contabilizziamo
         * il mining maturato.
         */

        if (miningActive) {

            await calculateOfflineMining();
        }

        const saved =
            await saveMiningAccount(false);

        if (!saved) {

            alert(
                "❌ Impossibile salvare i dati prima del logout."
            );

            return;
        }

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {

            console.error(
                "❌ Errore logout:",
                error
            );

            alert(
                "Errore logout:\n" +
                error.message
            );

            return;
        }

        currentUser = null;

        resetMiningData();

        showLogin();

        showAuthMessage(
            "Disconnesso.",
            "success"
        );

        console.log(
            "✅ Logout effettuato."
        );

    } finally {

        isProcessingAction = false;

        setActionButtonsDisabled(false);
    }
}

// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------

async function login() {

    const email =
        emailInput
            ? emailInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";

    if (!email || !password) {

        alert(
            "Inserisci email e password."
        );

        return;
    }

    showAuthMessage(
        "Accesso in corso..."
    );

    const loginButton =
        $("loginBtn");

    const signupButton =
        $("signupBtn");

    if (loginButton) {
        loginButton.disabled = true;
    }

    if (signupButton) {
        signupButton.disabled = true;
    }

    try {

        const { data, error } =
            await supabaseClient.auth
                .signInWithPassword({

                    email,
                    password
                });

        if (error) {

            console.error(
                "❌ Errore login:",
                error
            );

            showAuthMessage(
                "Errore: " +
                error.message,
                "error"
            );

            return;
        }

        currentUser =
            data.user;

        const loaded =
            await loadMiningAccount();

        if (!loaded) {

            currentUser = null;

            showLogin();

            return;
        }

        showMining();

        showAuthMessage(
            "Accesso effettuato.",
            "success"
        );

        console.log(
            "✅ Login riuscito:",
            currentUser.id
        );

    } finally {

        if (loginButton) {
            loginButton.disabled = false;
        }

        if (signupButton) {
            signupButton.disabled = false;
        }
    }
}

// -----------------------------------------------------
// REGISTRAZIONE
// -----------------------------------------------------

async function register() {

    const email =
        emailInput
            ? emailInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";

    if (!email || !password) {

        alert(
            "Inserisci email e password."
        );

        return;
    }

    if (password.length < 6) {

        alert(
            "La password deve avere almeno 6 caratteri."
        );

        return;
    }

    showAuthMessage(
        "Registrazione in corso..."
    );

    const loginButton =
        $("loginBtn");

    const signupButton =
        $("signupBtn");

    if (loginButton) {
        loginButton.disabled = true;
    }

    if (signupButton) {
        signupButton.disabled = true;
    }

    try {

        const { data, error } =
            await supabaseClient.auth
                .signUp({

                    email,
                    password,

                    options: {

                        emailRedirectTo:
                            "https://bobmoukhlis-hash.github.io/bob-mining/"
                    }
                });

        if (error) {

            console.error(
                "❌ Errore registrazione:",
                error
            );

            showAuthMessage(
                "Errore: " +
                error.message,
                "error"
            );

            return;
        }

        console.log(
            "✅ Registrazione completata:",
            data
        );

        if (
            data.session &&
            data.user
        ) {

            currentUser =
                data.user;

            const loaded =
                await loadMiningAccount();

            if (loaded) {

                showMining();

                showAuthMessage(
                    "Account creato.",
                    "success"
                );

                return;
            }
        }

        showAuthMessage(
            "Registrazione completata. Controlla la tua email.",
            "success"
        );

        alert(
            "✅ Registrazione completata!\n\n" +
            "Controlla la tua email e conferma l'account."
        );

    } finally {

        if (loginButton) {
            loginButton.disabled = false;
        }

        if (signupButton) {
            signupButton.disabled = false;
        }
    }
}

// -----------------------------------------------------
// CONTROLLO SESSIONE
// -----------------------------------------------------

async function checkSession() {

    if (!domReady) {
        return false;
    }

    try {

        const { data, error } =
            await supabaseClient.auth
                .getSession();

        if (error) {

            console.error(
                "❌ Errore sessione:",
                error
            );

            currentUser = null;

            resetMiningData();

            showLogin();

            return false;
        }

        currentUser =
            data.session?.user ||
            null;

        if (!currentUser) {

            resetMiningData();

            showLogin();

            console.log(
                "ℹ️ Nessuna sessione."
            );

            return false;
        }

        console.log(
            "✅ Sessione trovata:",
            currentUser.id
        );

        const loaded =
            await loadMiningAccount();

        if (!loaded) {

            showLogin();

            return false;
        }

        showMining();

        return true;

    } catch (error) {

        console.error(
            "❌ Errore checkSession:",
            error
        );

        currentUser = null;

        resetMiningData();

        showLogin();

        return false;
    }
}

// -----------------------------------------------------
// CAMBIO SESSIONE SUPABASE
// -----------------------------------------------------

supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "Auth event:",
            event
        );

        currentUser =
            session?.user ||
            null;

        if (!currentUser) {

            resetMiningData();

            if (domReady) {
                showLogin();
            }
        }
    }
);

// -----------------------------------------------------
// MINING ONLINE
// -----------------------------------------------------

setInterval(
    () => {

        const now =
            Date.now();

        if (!currentUser) {

            lastTick = now;

            return;
        }

        if (!miningActive) {

            lastTick = now;

            return;
        }

        /*
         * Quando la pagina non è visibile,
         * lasciamo che calculateOfflineMining()
         * gestisca il periodo trascorso.
         */

        if (
            document.visibilityState !==
            "visible"
        ) {

            lastTick = now;

            return;
        }

        const elapsedMinutes =
            Math.max(
                0,
                (
                    now -
                    lastTick
                ) / 60000
            );

        lastTick = now;

        if (
            elapsedMinutes <= 0
        ) {
            return;
        }

        /*
         * Siccome il timer è online,
         * accreditiamo solo il tempo reale
         * trascorso dall'ultimo tick.
         */

        const earned =
            addMiningProduction(
                elapsedMinutes
            );

        if (earned > 0) {
            updateMiningUI();
        }

    },
    MINING_TICK_INTERVAL
);

// -----------------------------------------------------
// AUTOSAVE
// -----------------------------------------------------

setInterval(
    async () => {

        if (!currentUser) {
            return;
        }

        if (isSaving) {
            return;
        }

        /*
         * Prima contabilizziamo il tempo online
         * dall'ultimo timestamp.
         */

        if (
            miningActive &&
            lastMiningAt
        ) {

            const now =
                getNow();

            const elapsedMinutes =
                Math.max(
                    0,
                    (
                        now.getTime() -
                        lastMiningAt.getTime()
                    ) / 60000
                );

            if (
                elapsedMinutes > 0
            ) {

                /*
                 * Durante il mining online non applichiamo
                 * il limite offline.
                 */

                addMiningProduction(
                    elapsedMinutes
                );

                lastMiningAt =
                    now;
            }
        }

        await saveMiningAccount(false);

        updateMiningUI();

    },
    AUTOSAVE_INTERVAL
);

// -----------------------------------------------------
// VISIBILITY
// -----------------------------------------------------

document.addEventListener(
    "visibilitychange",
    async () => {

        if (!currentUser) {
            return;
        }

        if (
            document.visibilityState ===
            "visible"
        ) {

            if (miningActive) {

                await calculateOfflineMining();
            }

            lastTick =
                Date.now();

            updateMiningUI();

            return;
        }

        /*
         * Quando la pagina viene nascosta,
         * contabilizziamo immediatamente
         * il tempo online maturato.
         */

        if (
            miningActive &&
            lastMiningAt
        ) {

            const now =
                getNow();

            const elapsedMinutes =
                Math.max(
                    0,
                    (
                        now.getTime() -
                        lastMiningAt.getTime()
                    ) / 60000
                );

            if (
                elapsedMinutes > 0
            ) {

                addMiningProduction(
                    elapsedMinutes
                );

                lastMiningAt =
                    now;
            }
        }

        await saveMiningAccount(false);

        lastTick =
            Date.now();
    }
);

// -----------------------------------------------------
// DOM READY
// -----------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        loginBox =
            $("authBox");

        miningBox =
            $("miningBox");

        emailInput =
            $("email");

        passwordInput =
            $("password");

        domReady = true;

        // ---------------------------------------------
        // MOSTRA/NASCONDI PASSWORD
        // ---------------------------------------------

        const togglePassword =
            $("togglePassword");

        if (
            togglePassword &&
            passwordInput
        ) {

            togglePassword.addEventListener(
                "click",
                () => {

                    const visible =
                        passwordInput.type ===
                        "text";

                    passwordInput.type =
                        visible
                            ? "password"
                            : "text";

                    togglePassword.textContent =
                        visible
                            ? "👁️"
                            : "🙈";

                    togglePassword.setAttribute(
                        "aria-label",
                        visible
                            ? "Mostra password"
                            : "Nascondi password"
                    );
                }
            );
        }

        // ---------------------------------------------
        // REGISTRAZIONE
        // ---------------------------------------------

        const signupBtn =
            $("signupBtn");

        if (signupBtn) {

            signupBtn.addEventListener(
                "click",
                register
            );

            console.log(
                "✅ Pulsante Registrati collegato"
            );
        }

        // ---------------------------------------------
        // LOGIN
        // ---------------------------------------------

        const loginBtn =
            $("loginBtn");

        if (loginBtn) {

            loginBtn.addEventListener(
                "click",
                login
            );

            console.log(
                "✅ Pulsante Accedi collegato"
            );
        }

        // ---------------------------------------------
        // LOGOUT
        // ---------------------------------------------

        const logoutBtn =
            $("logoutBtn");

        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                logout
            );

            console.log(
                "✅ Pulsante Logout collegato"
            );
        }

        // ---------------------------------------------
        // TOGGLE MINING
        // ---------------------------------------------

        const toggleMiningBtn =
            $("toggleMiningBtn");

        if (toggleMiningBtn) {

            toggleMiningBtn.addEventListener(
                "click",
                toggleMining
            );

            console.log(
                "✅ Pulsante Mining collegato"
            );
        }

        // ---------------------------------------------
        // CLAIM
        // ---------------------------------------------

        const claimBtn =
            $("claimBtn");

        if (claimBtn) {

            claimBtn.addEventListener(
                "click",
                claimPoints
            );

            console.log(
                "✅ Pulsante Claim collegato"
            );
        }

        // ---------------------------------------------
        // UPGRADE
        // ---------------------------------------------

        const upgradeBtn =
            $("upgradeBtn");

        if (upgradeBtn) {

            upgradeBtn.addEventListener(
                "click",
                upgradeMiner
            );

            console.log(
                "✅ Pulsante Upgrade collegato"
            );
        }

        // ---------------------------------------------
        // STATO INIZIALE
        // ---------------------------------------------

        showLogin();

        updateMiningUI();

        // ---------------------------------------------
        // SESSIONE
        // ---------------------------------------------

        await checkSession();

        console.log(
            "🚀 BOB Mining V11 pronto."
        );
    }
);

// -----------------------------------------------------
// FUNZIONI GLOBALI
// -----------------------------------------------------

window.register =
    register;

window.login =
    login;

window.logout =
    logout;

window.checkSession =
    checkSession;

window.loadMiningAccount =
    loadMiningAccount;

window.createMiningAccount =
    createMiningAccount;

window.saveMiningAccount =
    saveMiningAccount;

window.calculateOfflineMining =
    calculateOfflineMining;

window.toggleMining =
    toggleMining;

window.claimPoints =
    claimPoints;

window.upgradeMiner =
    upgradeMiner;

window.updateMiningUI =
    updateMiningUI;

window.getProductionPerMinute =
    getProductionPerMinute;

window.addMiningProduction =
    addMiningProduction;

window.showLogin =
    showLogin;

window.showMining =
    showMining;

window.balance =
    balance;

console.log(
    "✅ BOB Mining V11 inizializzazione completata."
);
