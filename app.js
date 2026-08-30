// =====================================================
// BOB MINING - app.js V12
// Supabase + Autenticazione + Mining
// Online + Offline + Claim + Upgrade + Rewards
// Referral + Daily Bonus + Autosave
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
    console.error("Libreria Supabase non caricata.");
    throw new Error("Supabase non disponibile.");
}

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

window.supabaseClient = supabaseClient;

console.log("Supabase collegato");
console.log("BOB Mining V12 caricato");

// -----------------------------------------------------
// CONFIGURAZIONE
// -----------------------------------------------------

const BASE_PRODUCTION_PER_MINUTE = 0.10;
const BASE_HASHRATE = 10;
const UPGRADE_BASE_COST = 100;
const MAX_OFFLINE_HOURS = 24;
const DEFAULT_OFFLINE_HOURS = 2;
const DAILY_BONUS_AMOUNT = 1;
const REFERRAL_BONUS_AMOUNT = 5;
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
let hashrate = BASE_HASHRATE;
let miningSpeed = 0;
let dailyBonus = 0;
let referralCode = "";
let referralCount = 0;
let lastMiningAt = null;
let lastTick = Date.now();
let isLoading = false;
let isSaving = false;
let offlineProcessing = false;
let domReady = false;

// -----------------------------------------------------
// ELEMENTI
// -----------------------------------------------------

let loginBox = null;
let miningBox = null;
let rewardsBox = null;
let referralBox = null;
let accountBox = null;
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

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return number;
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

function showReferralMessage(message, type = "") {
    const element = $("referralMessage");

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
// UPGRADE COST
// -----------------------------------------------------

function getUpgradeCost() {
    const level = Math.max(
        1,
        Math.floor(
            safeNumber(minerLevel, 1)
        )
    );

    return UPGRADE_BASE_COST * level;
}

// -----------------------------------------------------
// PRODUZIONE
// -----------------------------------------------------

function getProductionPerMinute() {
    const level = Math.max(
        1,
        safeNumber(minerLevel, 1)
    );

    const bonus = safeNumber(
        speedBonus,
        0
    );

    return (
        BASE_PRODUCTION_PER_MINUTE *
        level *
        (1 + bonus / 100)
    );
}

// -----------------------------------------------------
// HASHRATE
// -----------------------------------------------------

function calculateHashrate() {
    const level = Math.max(
        1,
        safeNumber(minerLevel, 1)
    );

    return BASE_HASHRATE * level;
}

// -----------------------------------------------------
// PRODUZIONE
// -----------------------------------------------------

function addMiningProduction(minutes) {
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

    window.balance = balance;

    return earned;
}

// -----------------------------------------------------
// REFERRAL CODE
// -----------------------------------------------------

function generateReferralCode() {
    if (
        currentUser &&
        currentUser.id
    ) {
        const cleanId =
            currentUser.id
                .replace(/-/g, "")
                .substring(0, 8)
                .toUpperCase();

        return "BOB" + cleanId;
    }

    return "";
}

// -----------------------------------------------------
// APPLICA ACCOUNT
// -----------------------------------------------------

function applyMiningAccount(data) {
    balance = Math.max(
        0,
        safeNumber(
            data?.balance_points,
            0
        )
    );

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
        Math.min(
            MAX_OFFLINE_HOURS,
            safeNumber(
                data?.offline_hours,
                DEFAULT_OFFLINE_HOURS
            )
        )
    );

    miningActive =
        data?.mining_active === true;

    hashrate = Math.max(
        BASE_HASHRATE,
        safeNumber(
            data?.hashrate,
            calculateHashrate()
        )
    );

    miningSpeed = Math.max(
        0,
        safeNumber(
            data?.mining_speed,
            0
        )
    );

    dailyBonus = Math.max(
        0,
        safeNumber(
            data?.daily_bonus,
            0
        )
    );

    referralCode =
        data?.referral_code
            ? String(data.referral_code)
            : generateReferralCode();

    referralCount = Math.max(
        0,
        Math.floor(
            safeNumber(
                data?.referral_count,
                0
            )
        )
    );

    if (data?.last_mining_at) {
        const date =
            new Date(
                data.last_mining_at
            );

        lastMiningAt =
            Number.isNaN(date.getTime())
                ? new Date()
                : date;
    } else {
        lastMiningAt = new Date();
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

    const account = {
        user_id: currentUser.id,
        balance_points: 0,
        miner_level: 1,
        speed_bonus: 0,
        offline_hours: DEFAULT_OFFLINE_HOURS,
        mining_active: true,
        last_mining_at: new Date().toISOString(),
        hashrate: BASE_HASHRATE,
        mining_speed: 0,
        daily_bonus: 0,
        referral_code: generateReferralCode(),
        referral_count: 0
    };

    const result =
        await supabaseClient
            .from("mining_accounts")
            .insert(account)
            .select(
                "balance_points, miner_level, speed_bonus, offline_hours, mining_active, last_mining_at, hashrate, mining_speed, daily_bonus, referral_code, referral_count"
            )
            .single();

    if (result.error) {
        console.error(
            "Errore creazione account:",
            result.error
        );

        showMiningMessage(
            "Errore creazione account: " +
            result.error.message,
            "error"
        );

        return false;
    }

    applyMiningAccount(
        result.data
    );

    return true;
}

// -----------------------------------------------------
// CARICA ACCOUNT
// -----------------------------------------------------

async function loadMiningAccount() {
    if (!currentUser || isLoading) {
        return false;
    }

    isLoading = true;

    try {
        const result =
            await supabaseClient
                .from("mining_accounts")
                .select(
                    "balance_points, miner_level, speed_bonus, offline_hours, mining_active, last_mining_at, hashrate, mining_speed, daily_bonus, referral_code, referral_count"
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

        if (result.error) {
            console.error(
                "Errore caricamento account:",
                result.error
            );

            showAuthMessage(
                "Errore caricamento account: " +
                result.error.message,
                "error"
            );

            return false;
        }

        if (!result.data) {
            return await createMiningAccount();
        }

        applyMiningAccount(
            result.data
        );

        if (miningActive) {
            await calculateOfflineMining();
        }

        lastTick = Date.now();

        updateMiningUI();

        return true;

    } catch (error) {
        console.error(
            "Errore loadMiningAccount:",
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
    if (!currentUser || isSaving) {
        return false;
    }

    isSaving = true;

    try {
        hashrate =
            calculateHashrate();

        const updateData = {
            balance_points:
                Math.max(
                    0,
                    safeNumber(
                        balance,
                        0
                    )
                ),

            miner_level:
                Math.max(
                    1,
                    Math.floor(
                        safeNumber(
                            minerLevel,
                            1
                        )
                    )
                ),

            speed_bonus:
                Math.max(
                    0,
                    safeNumber(
                        speedBonus,
                        0
                    )
                ),

            offline_hours:
                Math.max(
                    0,
                    Math.min(
                        MAX_OFFLINE_HOURS,
                        safeNumber(
                            offlineHours,
                            DEFAULT_OFFLINE_HOURS
                        )
                    )
                ),

            mining_active:
                Boolean(
                    miningActive
                ),

            hashrate:
                Math.max(
                    BASE_HASHRATE,
                    safeNumber(
                        hashrate,
                        BASE_HASHRATE
                    )
                ),

            mining_speed:
                Math.max(
                    0,
                    safeNumber(
                        miningSpeed,
                        0
                    )
                ),

            daily_bonus:
                Math.max(
                    0,
                    safeNumber(
                        dailyBonus,
                        0
                    )
                ),

            referral_code:
                referralCode ||
                generateReferralCode(),

            referral_count:
                Math.max(
                    0,
                    Math.floor(
                        safeNumber(
                            referralCount,
                            0
                        )
                    )
                )
        };

        if (updateTimestamp) {
            updateData.last_mining_at =
                new Date().toISOString();
        }

        const result =
            await supabaseClient
                .from("mining_accounts")
                .update(updateData)
                .eq(
                    "user_id",
                    currentUser.id
                );

        if (result.error) {
            console.error(
                "Errore salvataggio:",
                result.error
            );

            return false;
        }

        if (updateTimestamp) {
            lastMiningAt = new Date();
            lastTick = Date.now();
        }

        window.balance = balance;

        return true;

    } catch (error) {
        console.error(
            "Errore saveMiningAccount:",
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
    if (
        !currentUser ||
        !miningActive ||
        offlineProcessing
    ) {
        return 0;
    }

    if (!lastMiningAt) {
        lastMiningAt = new Date();
        return 0;
    }

    offlineProcessing = true;

    try {
        const now = new Date();

        const elapsedMinutes =
            Math.max(
                0,
                (
                    now.getTime() -
                    lastMiningAt.getTime()
                ) / 60000
            );

        if (elapsedMinutes <= 0) {
            return 0;
        }

        const maxMinutes =
            offlineHours * 60;

        if (maxMinutes <= 0) {
            lastMiningAt = now;
            await saveMiningAccount(true);
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

        lastMiningAt = now;

        await saveMiningAccount(false);

        lastTick = Date.now();

        updateMiningUI();

        if (earned > 0) {
            console.log(
                "Mining offline:",
                creditedMinutes.toFixed(2),
                "minuti +",
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
// DAILY BONUS
// -----------------------------------------------------

async function claimDailyBonus() {
    if (!currentUser) {
        alert(
            "Devi prima effettuare l'accesso."
        );
        return;
    }

    if (
        dailyBonus >=
        DAILY_BONUS_AMOUNT
    ) {
        alert(
            "Daily Bonus già ricevuto."
        );
        return;
    }

    balance += DAILY_BONUS_AMOUNT;
    dailyBonus = DAILY_BONUS_AMOUNT;

    const saved =
        await saveMiningAccount(false);

    if (!saved) {
        balance -= DAILY_BONUS_AMOUNT;
        dailyBonus = 0;
        updateMiningUI();

        alert(
            "Errore salvataggio Daily Bonus."
        );

        return;
    }

    updateMiningUI();

    showMiningMessage(
        "Daily Bonus: +" +
        DAILY_BONUS_AMOUNT.toFixed(2) +
        " BOB Points",
        "success"
    );
}

// -----------------------------------------------------
// MINER REWARD
// -----------------------------------------------------

async function claimMinerReward() {
    if (!currentUser) {
        alert(
            "Devi prima effettuare l'accesso."
        );
        return;
    }

    if (minerLevel < 2) {
        alert(
            "Reward disponibile dal Livello 2."
        );
        return;
    }

    const reward = minerLevel;

    balance += reward;

    const saved =
        await saveMiningAccount(false);

    if (!saved) {
        balance -= reward;
        updateMiningUI();

        alert(
            "Errore salvataggio Reward."
        );

        return;
    }

    updateMiningUI();

    showMiningMessage(
        "Reward: +" +
        reward.toFixed(2) +
        " BOB Points",
        "success"
    );
}

// -----------------------------------------------------
// UPGRADE MINER
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

    const cost =
        getUpgradeCost();

    if (balance < cost) {
        alert(
            "Servono " +
            cost.toFixed(2) +
            " BOB Points."
        );
        return;
    }

    const oldBalance = balance;
    const oldLevel = minerLevel;
    const oldHashrate = hashrate;

    balance -= cost;
    minerLevel += 1;
    hashrate = calculateHashrate();

    updateMiningUI();

    const saved =
        await saveMiningAccount(false);

    if (!saved) {
        balance = oldBalance;
        minerLevel = oldLevel;
        hashrate = oldHashrate;

        updateMiningUI();

        alert(
            "Errore salvataggio upgrade."
        );

        return;
    }

    showMiningMessage(
        "Upgrade completato! Livello " +
        minerLevel,
        "success"
    );
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
        const now = new Date();

        if (lastMiningAt) {
            const elapsedMinutes =
                Math.max(
                    0,
                    (
                        now.getTime() -
                        lastMiningAt.getTime()
                    ) / 60000
                );

            addMiningProduction(
                elapsedMinutes
            );
        }

        miningActive = false;
        lastMiningAt = now;

        const saved =
            await saveMiningAccount(true);

        if (!saved) {
            miningActive = true;
            updateMiningUI();

            alert(
                "Impossibile salvare il mining."
            );

            return;
        }

        showMiningMessage(
            "Mining fermato.",
            "success"
        );

    } else {
        miningActive = true;
        lastMiningAt = new Date();
        lastTick = Date.now();

        const saved =
            await saveMiningAccount(true);

        if (!saved) {
            miningActive = false;
            updateMiningUI();

            alert(
                "Impossibile avviare il mining."
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
// CLAIM POINTS
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
        await saveMiningAccount(false);

    if (!saved) {
        alert(
            "Impossibile salvare i Points."
        );
        return;
    }

    showMiningMessage(
        "Points salvati: " +
        balance.toFixed(2),
        "success"
    );
}

// -----------------------------------------------------
// REFERRAL
// -----------------------------------------------------

async function copyReferralCode() {
    if (!referralCode) {
        referralCode =
            generateReferralCode();

        await saveMiningAccount(false);
    }

    if (!referralCode) {
        alert(
            "Codice referral non disponibile."
        );
        return;
    }

    try {
        await navigator.clipboard.writeText(
            referralCode
        );

        showReferralMessage(
            "Codice copiato!",
            "success"
        );

    } catch (error) {
        showReferralMessage(
            "Codice: " +
            referralCode,
            "success"
        );
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
            balance.toFixed(2);
    }

    const levelElement =
        $("levelBadge");

    if (levelElement) {
        levelElement.textContent =
            "LIVELLO " +
            minerLevel;
    }

    hashrate =
        calculateHashrate();

    const hashrateElement =
        $("hashrate");

    if (hashrateElement) {
        hashrateElement.textContent =
            hashrate + " GH/s";
    }

    const productionElement =
        $("production");

    if (productionElement) {
        productionElement.textContent =
            getProductionPerMinute()
                .toFixed(2) +
            "/min";
    }

    const speedBonusElement =
        $("speedBonus");

    if (speedBonusElement) {
        speedBonusElement.textContent =
            speedBonus.toFixed(0) + "%";
    }

    const offlineLimitElement =
        $("offlineLimit");

    if (offlineLimitElement) {
        offlineLimitElement.textContent =
            offlineHours.toFixed(0) +
            " ore";
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
            getUpgradeCost().toFixed(0) +
            " BOB";
    }

    const dailyBonusInfo =
        $("dailyBonusInfo");

    if (dailyBonusInfo) {
        dailyBonusInfo.textContent =
            dailyBonus >= DAILY_BONUS_AMOUNT
                ? "Bonus già ricevuto"
                : "+" +
                  DAILY_BONUS_AMOUNT.toFixed(2) +
                  " BOB Points disponibili";
    }

    const minerRewardInfo =
        $("minerRewardInfo");

    if (minerRewardInfo) {
        minerRewardInfo.textContent =
            minerLevel >= 2
                ? "Reward disponibile"
                : "Disponibile dal Livello 2";
    }

    const referralCodeElement =
        $("referralCode");

    if (referralCodeElement) {
        referralCodeElement.textContent =
            referralCode || "—";
    }

    const referralCountElement =
        $("referralCount");

    if (referralCountElement) {
        referralCountElement.textContent =
            referralCount;
    }

    const referralBonusElement =
        $("referralBonus");

    if (referralBonusElement) {
        referralBonusElement.textContent =
            (
                referralCount *
                REFERRAL_BONUS_AMOUNT
            ).toFixed(2) +
            " BOB";
    }

    const userEmailElement =
        $("userEmail");

    if (
        userEmailElement &&
        currentUser
    ) {
        userEmailElement.textContent =
            currentUser.email ||
            "Account";
    }

    window.balance = balance;
}

// -----------------------------------------------------
// LOGIN VIEW
// -----------------------------------------------------

function showLogin() {
    if (loginBox) {
        loginBox.classList.remove("hidden");
    }

    if (miningBox) {
        miningBox.classList.add("hidden");
    }

    if (rewardsBox) {
        rewardsBox.classList.add("hidden");
    }

    if (referralBox) {
        referralBox.classList.add("hidden");
    }

    if (accountBox) {
        accountBox.classList.add("hidden");
    }
}

// -----------------------------------------------------
// MINING VIEW
// -----------------------------------------------------

function showMining() {
    if (loginBox) {
        loginBox.classList.add("hidden");
    }

    if (miningBox) {
        miningBox.classList.remove("hidden");
    }

    if (rewardsBox) {
        rewardsBox.classList.remove("hidden");
    }

    if (referralBox) {
        referralBox.classList.remove("hidden");
    }

    if (accountBox) {
        accountBox.classList.remove("hidden");
    }

    updateMiningUI();
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
    hashrate = BASE_HASHRATE;
    miningSpeed = 0;
    dailyBonus = 0;
    referralCode = "";
    referralCount = 0;
    lastMiningAt = null;
    lastTick = Date.now();
    offlineProcessing = false;

    window.balance = balance;

    updateMiningUI();
}

// -----------------------------------------------------
// LOGOUT
// -----------------------------------------------------

async function logout() {
    if (currentUser) {
        await saveMiningAccount(true);
    }

    const result =
        await supabaseClient
            .auth
            .signOut();

    if (result.error) {
        console.error(
            "Errore logout:",
            result.error
        );

        alert(
            "Errore logout: " +
            result.error.message
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
        showAuthMessage(
            "Inserisci email e password.",
            "error"
        );
        return;
    }

    showAuthMessage(
        "Accesso in corso..."
    );

    const result =
        await supabaseClient
            .auth
            .signInWithPassword({
                email: email,
                password: password
            });

    if (result.error) {
        console.error(
            "Errore login:",
            result.error
        );

        showAuthMessage(
            "Errore: " +
            result.error.message,
            "error"
        );

        return;
    }

    currentUser =
        result.data.user;

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
        "Login riuscito:",
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
        showAuthMessage(
            "Inserisci email e password.",
            "error"
        );
        return;
    }

    if (password.length < 6) {
        showAuthMessage(
            "La password deve avere almeno 6 caratteri.",
            "error"
        );
        return;
    }

    showAuthMessage(
        "Registrazione in corso..."
    );

    const result =
        await supabaseClient
            .auth
            .signUp({
                email: email,
                password: password
            });

    if (result.error) {
        console.error(
            "Errore registrazione:",
            result.error
        );

        showAuthMessage(
            "Errore: " +
            result.error.message,
            "error"
        );

        return;
    }

    if (
        result.data.session &&
        result.data.user
    ) {
        currentUser =
            result.data.user;

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
}

// -----------------------------------------------------
// SESSIONE
// -----------------------------------------------------

async function checkSession() {
    if (!domReady) {
        return false;
    }

    const result =
        await supabaseClient
            .auth
            .getSession();

    if (result.error) {
        console.error(
            "Errore sessione:",
            result.error
        );

        currentUser = null;

        resetMiningData();
        showLogin();

        return false;
    }

    currentUser =
        result.data.session
            ? result.data.session.user
            : null;

    if (!currentUser) {
        resetMiningData();
        showLogin();

        return false;
    }

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
// AUTH STATE
// -----------------------------------------------------

supabaseClient.auth.onAuthStateChange(
    function(event, session) {
        console.log(
            "Auth event:",
            event
        );

        currentUser =
            session
                ? session.user
                : null;

        if (!currentUser) {
            resetMiningData();

            if (domReady) {
                showLogin();
            }
        }
    }
);

// -----------------------------------------------------
// MINING TICK
// -----------------------------------------------------

setInterval(
    function() {
        const now =
            Date.now();

        if (
            !currentUser ||
            !miningActive ||
            document.visibilityState !== "visible"
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

        if (elapsedMinutes > 0) {
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
    async function() {
        if (!currentUser) {
            return;
        }

        if (
            miningActive &&
            lastMiningAt
        ) {
            const now = new Date();

            const elapsedMinutes =
                Math.max(
                    0,
                    (
                        now.getTime() -
                        lastMiningAt.getTime()
                    ) / 60000
                );

            if (elapsedMinutes > 0) {
                addMiningProduction(
                    elapsedMinutes
                );

                lastMiningAt = now;
            }
        }

        await saveMiningAccount(false);
    },
    AUTOSAVE_INTERVAL
);

// -----------------------------------------------------
// VISIBILITY
// -----------------------------------------------------

document.addEventListener(
    "visibilitychange",
    async function() {
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

        if (currentUser) {
            await saveMiningAccount(false);
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
    async function() {

        loginBox =
            $("authBox");

        miningBox =
            $("miningBox");

        rewardsBox =
            $("rewardsBox");

        referralBox =
            $("referralBox");

        accountBox =
            $("accountBox");

        emailInput =
            $("email");

        passwordInput =
            $("password");

        domReady = true;

        const togglePassword =
            $("togglePassword");

        if (
            togglePassword &&
            passwordInput
        ) {
            togglePassword.addEventListener(
                "click",
                function() {
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

        const loginBtn =
            $("loginBtn");

        if (loginBtn) {
            loginBtn.addEventListener(
                "click",
                login
            );
        }

        const signupBtn =
            $("signupBtn");

        if (signupBtn) {
            signupBtn.addEventListener(
                "click",
                register
            );
        }

        const logoutBtn =
            $("logoutBtn");

        if (logoutBtn) {
            logoutBtn.addEventListener(
                "click",
                logout
            );
        }

        const toggleMiningBtn =
            $("toggleMiningBtn");

        if (toggleMiningBtn) {
            toggleMiningBtn.addEventListener(
                "click",
                toggleMining
            );
        }

        const claimBtn =
            $("claimBtn");

        if (claimBtn) {
            claimBtn.addEventListener(
                "click",
                claimPoints
            );
        }

        const upgradeBtn =
            $("upgradeBtn");

        if (upgradeBtn) {
            upgradeBtn.addEventListener(
                "click",
                upgradeMiner
            );
        }

        const dailyBonusBtn =
            $("dailyBonusBtn");

        if (dailyBonusBtn) {
            dailyBonusBtn.addEventListener(
                "click",
                claimDailyBonus
            );
        }

        const minerRewardBtn =
            $("minerRewardBtn");

        if (minerRewardBtn) {
            minerRewardBtn.addEventListener(
                "click",
                claimMinerReward
            );
        }

        const copyReferralBtn =
            $("copyReferralBtn");

        if (copyReferralBtn) {
            copyReferralBtn.addEventListener(
                "click",
                copyReferralCode
            );
        }

        showLogin();

        updateMiningUI();

        await checkSession();

        console.log(
            "BOB Mining V12 pronto."
        );
    }
);

// -----------------------------------------------------
// FUNZIONI GLOBALI
// -----------------------------------------------------

window.login = login;
window.register = register;
window.logout = logout;
window.checkSession = checkSession;
window.loadMiningAccount = loadMiningAccount;
window.createMiningAccount = createMiningAccount;
window.saveMiningAccount = saveMiningAccount;
window.calculateOfflineMining = calculateOfflineMining;
window.toggleMining = toggleMining;
window.claimPoints = claimPoints;
window.upgradeMiner = upgradeMiner;
window.claimDailyBonus = claimDailyBonus;
window.claimMinerReward = claimMinerReward;
window.copyReferralCode = copyReferralCode;
window.updateMiningUI = updateMiningUI;
window.getProductionPerMinute = getProductionPerMinute;
window.getUpgradeCost = getUpgradeCost;
window.addMiningProduction = addMiningProduction;
window.showLogin = showLogin;
window.showMining = showMining;

console.log(
    "BOB Mining V12 inizializzazione completata."
);
```
