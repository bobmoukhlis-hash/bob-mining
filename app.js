// =====================================================
// BOB MINING - app.js V10
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

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

window.supabaseClient = supabaseClient;

console.log("✅ Supabase collegato");
console.log("✅ BOB Mining V10 caricato");


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

let offlineHours =
    DEFAULT_OFFLINE_HOURS;

let miningActive = false;

let lastMiningAt = null;

let lastTick =
    Date.now();

let isLoading = false;

let isSaving = false;

let domReady = false;

let offlineProcessing = false;


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


// -----------------------------------------------------
// MESSAGGI
// -----------------------------------------------------

function showAuthMessage(
    message,
    type = ""
) {
    const element =
        $("authMessage");

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        "message";

    if (type) {
        element.classList.add(type);
    }
}


function showMiningMessage(
    message,
    type = ""
) {
    const element =
        $("miningMessage");

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        "message";

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

    offlineHours =
        DEFAULT_OFFLINE_HOURS;

    miningActive = false;

    lastMiningAt = null;

    lastTick =
        Date.now();

    offlineProcessing = false;

    window.balance =
        balance;

    updateMiningUI();
}


// -----------------------------------------------------
// MOSTRA LOGIN
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
// MOSTRA MINING
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

    const level =
        Math.max(
            1,
            Number(minerLevel) || 1
        );

    const bonus =
        Number(speedBonus) || 0;

    return (
        BASE_PRODUCTION_PER_MINUTE *
        level *
        (1 + bonus / 100)
    );
}


// -----------------------------------------------------
// PRODUZIONE MINING
// -----------------------------------------------------

function addMiningProduction(
    minutes
) {

    if (!miningActive) {
        return 0;
    }

    if (
        !Number.isFinite(minutes) ||
        minutes <= 0
    ) {
        return 0;
    }

    const production =
        getProductionPerMinute();

    const earned =
        production * minutes;

    if (
        !Number.isFinite(earned) ||
        earned <= 0
    ) {
        return 0;
    }

    balance += earned;

    window.balance =
        balance;

    return earned;
}


// -----------------------------------------------------
// APPLICA ACCOUNT
// -----------------------------------------------------

function applyMiningAccount(data) {

    balance =
        Number(
            data?.balance_points ?? 0
        );

    if (
        !Number.isFinite(balance) ||
        balance < 0
    ) {
        balance = 0;
    }

    minerLevel =
        Math.max(
            1,
            Number(
                data?.miner_level ?? 1
            )
        );

    speedBonus =
        Number(
            data?.speed_bonus ?? 0
        );

    if (
        !Number.isFinite(speedBonus)
    ) {
        speedBonus = 0;
    }

    offlineHours =
        Math.max(
            0,
            Number(
                data?.offline_hours ??
                DEFAULT_OFFLINE_HOURS
            )
        );

    if (
        !Number.isFinite(offlineHours)
    ) {
        offlineHours =
            DEFAULT_OFFLINE_HOURS;
    }

    miningActive =
        data?.mining_active === true;

    if (data?.last_mining_at) {

        const date =
            new Date(
                data.last_mining_at
            );

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {
            lastMiningAt =
                date;
        } else {
            lastMiningAt =
                new Date();
        }

    } else {

        lastMiningAt =
            new Date();
    }

    window.balance =
        balance;

    lastTick =
        Date.now();

    updateMiningUI();
}


// -----------------------------------------------------
// CREA ACCOUNT MINING
// -----------------------------------------------------

async function createMiningAccount() {

    if (!currentUser) {
        return false;
    }

    const now =
        new Date().toISOString();

    const account = {

        user_id:
            currentUser.id,

        balance_points:
            0,

        miner_level:
            1,

        speed_bonus:
            0,

        offline_hours:
            DEFAULT_OFFLINE_HOURS,

        mining_active:
            true,

        last_mining_at:
            now
    };

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
}


// -----------------------------------------------------
// CARICA ACCOUNT MINING
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

        lastTick =
            Date.now();

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
                Number(balance),

            miner_level:
                Number(minerLevel),

            speed_bonus:
                Number(speedBonus),

            offline_hours:
                Number(offlineHours),

            mining_active:
                Boolean(miningActive)
        };

        if (updateTimestamp) {

            updateData.last_mining_at =
                new Date().toISOString();
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

            lastMiningAt =
                new Date();

            lastTick =
                Date.now();
        }

        window.balance =
            balance;

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
// MINING OFFLINE
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

        lastMiningAt =
            new Date();

        return 0;
    }

    offlineProcessing = true;

    try {

        const now =
            new Date();

        const lastTime =
            lastMiningAt.getTime();

        if (
            Number.isNaN(lastTime)
        ) {

            lastMiningAt =
                now;

            return 0;
        }

        const elapsedMinutes =
            Math.max(
                0,
                (
                    now.getTime() -
                    lastTime
                ) / 60000
            );

        if (
            elapsedMinutes <= 0
        ) {
            return 0;
        }

        const maxMinutes =
            Math.max(
                0,
                Number(offlineHours) * 60
            );

        if (
            maxMinutes <= 0
        ) {

            lastMiningAt =
                now;

            await saveMiningAccount(
                true
            );

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
         * IMPORTANTE:
         *
         * Dopo aver contabilizzato il tempo,
         * aggiorniamo il riferimento.
         *
         * In questo modo gli stessi minuti
         * non vengono pagati una seconda volta.
         */

        lastMiningAt =
            now;

        const saved =
            await saveMiningAccount(
                false
            );

        if (!saved) {
            return 0;
        }

        lastTick =
            Date.now();

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
// TOGGLE MINING
// -----------------------------------------------------

async function toggleMining() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (miningActive) {

        const now =
            new Date();

        /*
         * Prima di fermare il mining,
         * accreditiamo il tempo trascorso.
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

            if (
                elapsedMinutes > 0
            ) {

                addMiningProduction(
                    elapsedMinutes
                );
            }
        }

        miningActive =
            false;

        lastMiningAt =
            now;

        const saved =
            await saveMiningAccount(
                true
            );

        if (!saved) {

            miningActive =
                true;

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

        miningActive =
            true;

        lastMiningAt =
            new Date();

        lastTick =
            Date.now();

        const saved =
            await saveMiningAccount(
                true
            );

        if (!saved) {

            miningActive =
                false;

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
}


// -----------------------------------------------------
// CLAIM
// -----------------------------------------------------

async function claimPoints() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (miningActive) {

        await calculateOfflineMining();
    }

    const saved =
        await saveMiningAccount(
            false
        );

    if (!saved) {

        alert(
            "❌ Impossibile salvare i Points."
        );

        return;
    }

    updateMiningUI();

    showMiningMessage(
        "Points salvati: " +
        Number(balance).toFixed(2),
        "success"
    );

    alert(
        "🎁 BOB Points salvati:\n\n" +
        Number(balance).toFixed(2)
    );
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

    if (miningActive) {

        await calculateOfflineMining();
    }

    if (
        balance <
        UPGRADE_COST
    ) {

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

    balance -=
        UPGRADE_COST;

    minerLevel +=
        1;

    updateMiningUI();

    const saved =
        await saveMiningAccount(
            false
        );

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
}


// -----------------------------------------------------
// LOGOUT
// -----------------------------------------------------

async function logout() {

    if (currentUser) {

        /*
         * Salviamo il momento esatto
         * dell'uscita.
         */

        await saveMiningAccount(
            true
        );
    }

    const { error } =
        await supabaseClient.auth
            .signOut();

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

    currentUser =
        null;

    resetMiningData();

    showLogin();

    showAuthMessage(
        "Disconnesso.",
        "success"
    );

    console.log(
        "✅ Logout effettuato."
    );
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

    if (
        password.length < 6
    ) {

        alert(
            "La password deve avere almeno 6 caratteri."
        );

        return;
    }

    showAuthMessage(
        "Registrazione in corso..."
    );

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

    /*
     * Se Supabase restituisce una sessione
     * significa che la conferma email
     * non è richiesta.
     */

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
}


// -----------------------------------------------------
// CONTROLLO SESSIONE
// -----------------------------------------------------

async function checkSession() {

    if (!domReady) {
        return false;
    }

    const { data, error } =
        await supabaseClient.auth
            .getSession();

    if (error) {

        console.error(
            "❌ Errore sessione:",
            error
        );

        currentUser =
            null;

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

            lastTick =
                now;

            return;
        }

        if (!miningActive) {

            lastTick =
                now;

            return;
        }

        /*
         * Se la pagina è nascosta,
         * non accreditiamo qui.
         *
         * Al ritorno verrà calcolato
         * dal mining offline.
         */

        if (
            document.visibilityState !==
            "visible"
        ) {

            lastTick =
                now;

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

        lastTick =
            now;

        if (
            elapsedMinutes > 0
        ) {

            addMiningProduction(
                elapsedMinutes
            );

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

        if (!miningActive) {

            await saveMiningAccount(
                true
            );

            return;
        }

        /*
         * Salviamo il saldo e soprattutto
         * il timestamp reale del mining.
         */

        if (lastMiningAt) {

            const now =
                new Date();

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

        await saveMiningAccount(
            false
        );

    },
    AUTOSAVE_INTERVAL
);


// -----------------------------------------------------
// VISIBILITY
// -----------------------------------------------------

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            if (currentUser) {

                await calculateOfflineMining();

                lastTick =
                    Date.now();

                updateMiningUI();
            }

            return;
        }

        /*
         * Quando la pagina viene nascosta,
         * salviamo immediatamente lo stato.
         */

        if (currentUser) {

            if (miningActive) {

                const now =
                    new Date();

                if (lastMiningAt) {

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
            }

            await saveMiningAccount(
                false
            );
        }

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

        domReady =
            true;


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
            "🚀 BOB Mining V10 pronto."
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
    "✅ BOB Mining V10 inizializzazione completata."
);
