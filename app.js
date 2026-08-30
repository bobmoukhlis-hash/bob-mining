"use strict";

/* =====================================================
   BOB MINING V12
   Supabase + Login + Registrazione + Mining
   Offline Mining + Upgrade + Rewards + Referral
   ===================================================== */

/* =========================
   SUPABASE
   ========================= */

const SUPABASE_URL =
    "https://fxyqeeznykdtmaoywpmm.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_n6-IZsqob6jeQzL8igv-EA_lSNtURMn";

let supabaseClient = null;

if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
) {
    console.error("Supabase non è stato caricato.");
} else {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    window.supabaseClient = supabaseClient;

    console.log("Supabase collegato.");
}

/* =========================
   CONFIGURAZIONE
   ========================= */

const BASE_PRODUCTION_PER_MINUTE = 0.10;
const BASE_HASHRATE = 10;
const UPGRADE_BASE_COST = 100;

const DEFAULT_OFFLINE_HOURS = 2;
const MAX_OFFLINE_HOURS = 24;

const DAILY_BONUS_AMOUNT = 1;
const REFERRAL_BONUS_AMOUNT = 5;

const MINING_TICK_INTERVAL = 1000;
const AUTOSAVE_INTERVAL = 30000;

/* =========================
   STATO
   ========================= */

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

let domReady = false;
let loadingAccount = false;
let savingAccount = false;
let processingOffline = false;

/* =========================
   ELEMENTI HTML
   ========================= */

let loginBox = null;
let miningBox = null;
let rewardsBox = null;
let referralBox = null;
let accountBox = null;

let emailInput = null;
let passwordInput = null;

/* =========================
   HELPER
   ========================= */

function $(id) {
    return document.getElementById(id);
}

function safeNumber(value, fallback) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return number;
}

function showMessage(elementId, message, type) {
    const element = $(elementId);

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = "message";

    if (type) {
        element.classList.add(type);
    }
}

function showAuthMessage(message, type) {
    showMessage("authMessage", message, type);
}

function showMiningMessage(message, type) {
    showMessage("miningMessage", message, type);
}

function showReferralMessage(message, type) {
    showMessage("referralMessage", message, type);
}

/* =========================
   UPGRADE
   ========================= */

function getUpgradeCost() {
    const level = Math.max(
        1,
        Math.floor(
            safeNumber(minerLevel, 1)
        )
    );

    return UPGRADE_BASE_COST * level;
}

/* =========================
   PRODUZIONE
   ========================= */

function getProductionPerMinute() {
    const level = Math.max(
        1,
        safeNumber(minerLevel, 1)
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

/* =========================
   HASHRATE
   ========================= */

function calculateHashrate() {
    const level = Math.max(
        1,
        Math.floor(
            safeNumber(minerLevel, 1)
        )
    );

    return BASE_HASHRATE * level;
}

/* =========================
   AGGIUNGI MINING
   ========================= */

function addMiningProduction(minutes) {
    if (!miningActive) {
        return 0;
    }

    const safeMinutes = safeNumber(
        minutes,
        0
    );

    if (safeMinutes <= 0) {
        return 0;
    }

    const production =
        getProductionPerMinute();

    const earned =
        production * safeMinutes;

    if (
        !Number.isFinite(earned) ||
        earned <= 0
    ) {
        return 0;
    }

    balance += earned;

    if (!Number.isFinite(balance)) {
        balance = 0;
    }

    window.balance = balance;

    return earned;
}

/* =========================
   REFERRAL CODE
   ========================= */

function generateReferralCode() {
    if (!currentUser || !currentUser.id) {
        return "";
    }

    const id = String(
        currentUser.id
    )
        .replace(/-/g, "")
        .substring(0, 8)
        .toUpperCase();

    return "BOB" + id;
}

/* =========================
   APPLICA ACCOUNT
   ========================= */

function applyMiningAccount(data) {
    const account = data || {};

    balance = Math.max(
        0,
        safeNumber(
            account.balance_points,
            0
        )
    );

    minerLevel = Math.max(
        1,
        Math.floor(
            safeNumber(
                account.miner_level,
                1
            )
        )
    );

    speedBonus = Math.max(
        0,
        safeNumber(
            account.speed_bonus,
            0
        )
    );

    offlineHours = Math.max(
        0,
        Math.min(
            MAX_OFFLINE_HOURS,
            safeNumber(
                account.offline_hours,
                DEFAULT_OFFLINE_HOURS
            )
        )
    );

    miningActive =
        account.mining_active === true;

    hashrate = Math.max(
        BASE_HASHRATE,
        safeNumber(
            account.hashrate,
            calculateHashrate()
        )
    );

    miningSpeed = Math.max(
        0,
        safeNumber(
            account.mining_speed,
            0
        )
    );

    dailyBonus = Math.max(
        0,
        safeNumber(
            account.daily_bonus,
            0
        )
    );

    referralCode =
        account.referral_code
            ? String(account.referral_code)
            : generateReferralCode();

    referralCount = Math.max(
        0,
        Math.floor(
            safeNumber(
                account.referral_count,
                0
            )
        )
    );

    if (account.last_mining_at) {
        const date =
            new Date(
                account.last_mining_at
            );

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {
            lastMiningAt = date;
        } else {
            lastMiningAt = new Date();
        }
    } else {
        lastMiningAt = new Date();
    }

    window.balance = balance;

    hashrate =
        calculateHashrate();

    lastTick = Date.now();

    updateMiningUI();
}

/* =========================
   CREA ACCOUNT
   ========================= */

async function createMiningAccount() {
    if (!currentUser || !supabaseClient) {
        return false;
    }

    const now =
        new Date().toISOString();

    const newReferralCode =
        generateReferralCode();

    const account = {
        user_id: currentUser.id,

        balance_points: 0,

        miner_level: 1,

        speed_bonus: 0,

        offline_hours:
            DEFAULT_OFFLINE_HOURS,

        mining_active: true,

        last_mining_at: now,

        hashrate:
            BASE_HASHRATE,

        mining_speed: 0,

        daily_bonus: 0,

        referral_code:
            newReferralCode,

        referral_count: 0
    };

    try {
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

            showAuthMessage(
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

    } catch (error) {
        console.error(
            "Errore createMiningAccount:",
            error
        );

        showAuthMessage(
            "Errore durante la creazione dell'account.",
            "error"
        );

        return false;
    }
}

/* =========================
   CARICA ACCOUNT
   ========================= */

async function loadMiningAccount() {
    if (!currentUser || !supabaseClient) {
        return false;
    }

    if (loadingAccount) {
        return false;
    }

    loadingAccount = true;

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
        loadingAccount = false;
    }
}

/* =========================
   SALVA ACCOUNT
   ========================= */

async function saveMiningAccount(
    updateTimestamp = false
) {
    if (
        !currentUser ||
        !supabaseClient
    ) {
        return false;
    }

    if (savingAccount) {
        return false;
    }

    savingAccount = true;

    try {
        hashrate =
            calculateHashrate();

        if (!referralCode) {
            referralCode =
                generateReferralCode();
        }

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
                referralCode,

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
            "Errore saveMiningAccount:",
            error
        );

        return false;

    } finally {
        savingAccount = false;
    }
}

/* =========================
   OFFLINE MINING
   ========================= */

async function calculateOfflineMining() {
    if (
        !currentUser ||
        !supabaseClient
    ) {
        return 0;
    }

    if (!miningActive) {
        return 0;
    }

    if (processingOffline) {
        return 0;
    }

    if (!lastMiningAt) {
        lastMiningAt =
            new Date();

        return 0;
    }

    processingOffline = true;

    try {
        const now =
            new Date();

        const lastTime =
            lastMiningAt.getTime();

        if (
            !Number.isFinite(lastTime)
        ) {
            lastMiningAt = now;
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
                offlineHours * 60
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
                "Mining offline +",
                earned.toFixed(4),
                "Points"
            );
        }

        return earned;

    } catch (error) {
        console.error(
            "Errore offline mining:",
            error
        );

        return 0;

    } finally {
        processingOffline = false;
    }
}

/* =========================
   DAILY BONUS
   ========================= */

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

    const oldBalance =
        balance;

    const oldBonus =
        dailyBonus;

    balance +=
        DAILY_BONUS_AMOUNT;

    dailyBonus =
        DAILY_BONUS_AMOUNT;

    updateMiningUI();

    const saved =
        await saveMiningAccount(
            false
        );

    if (!saved) {
        balance =
            oldBalance;

        dailyBonus =
            oldBonus;

        updateMiningUI();

        alert(
            "Errore salvataggio Daily Bonus."
        );

        return;
    }

    showMiningMessage(
        "Daily Bonus: +" +
        DAILY_BONUS_AMOUNT.toFixed(2) +
        " BOB Points",
        "success"
    );

    updateMiningUI();
}

/* =========================
   MINER REWARD
   ========================= */

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

    const reward =
        minerLevel;

    const oldBalance =
        balance;

    balance +=
        reward;

    updateMiningUI();

    const saved =
        await saveMiningAccount(
            false
        );

    if (!saved) {
        balance =
            oldBalance;

        updateMiningUI();

        alert(
            "Errore salvataggio Reward."
        );

        return;
    }

    showMiningMessage(
        "Reward: +" +
        reward.toFixed(2) +
        " BOB Points",
        "success"
    );

    updateMiningUI();
}

/* =========================
   UPGRADE MINER
   ========================= */

async function upgradeMiner() {
    if (!currentUser) {
        alert(
            "Devi prima effettuare l'accesso."
        );
        return;
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

    const oldBalance =
        balance;

    const oldLevel =
        minerLevel;

    balance -=
        cost;

    minerLevel +=
        1;

    hashrate =
        calculateHashrate();

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

        hashrate =
            calculateHashrate();

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

    updateMiningUI();
}

/* =========================
   TOGGLE MINING
   ========================= */

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
                "Impossibile salvare il mining."
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

/* =========================
   CLAIM POINTS
   ========================= */

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
            "Impossibile salvare i Points."
        );
        return;
    }

    updateMiningUI();

    showMiningMessage(
        "Points salvati: " +
        balance.toFixed(2),
        "success"
    );
}

/* =========================
   COPIA REFERRAL
   ========================= */

async function copyReferralCode() {
    if (!currentUser) {
        return;
    }

    if (!referralCode) {
        referralCode =
            generateReferralCode();

        await saveMiningAccount(
            false
        );
    }

    if (!referralCode) {
        alert(
            "Codice referral non disponibile."
        );
        return;
    }

    try {
        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText ===
            "function"
        ) {
            await navigator.clipboard.writeText(
                referralCode
            );

            showReferralMessage(
                "Codice copiato!",
                "success"
            );

            return;
        }

        throw new Error(
            "Clipboard non disponibile"
        );

    } catch (error) {
        showReferralMessage(
            "Codice: " +
            referralCode,
            "success"
        );
    }
}

/* =========================
   AGGIORNA UI
   ========================= */

function updateMiningUI() {
    const balanceElement =
        $("balance");

    if (balanceElement) {
        balanceElement.textContent =
            safeNumber(
                balance,
                0
            ).toFixed(2);
    }

    const levelElement =
        $("levelBadge");

    if (levelElement) {
        levelElement.textContent =
            "LIVELLO " +
            Math.max(
                1,
                Math.floor(
                    safeNumber(
                        minerLevel,
                        1
                    )
                )
            );
    }

    hashrate =
        calculateHashrate();

    const hashrateElement =
        $("hashrate");

    if (hashrateElement) {
        hashrateElement.textContent =
            hashrate +
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

    const speedBonusElement =
        $("speedBonus");

    if (speedBonusElement) {
        speedBonusElement.textContent =
            safeNumber(
                speedBonus,
                0
            ).toFixed(0) +
            "%";
    }

    const offlineLimitElement =
        $("offlineLimit");

    if (offlineLimitElement) {
        offlineLimitElement.textContent =
            safeNumber(
                offlineHours,
                DEFAULT_OFFLINE_HOURS
            ).toFixed(0) +
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
            dailyBonus >=
            DAILY_BONUS_AMOUNT
                ? "Bonus già ricevuto"
                : "+" +
                  DAILY_BONUS_AMOUNT.toFixed(2) +
                  " BOB Points disponibili";
    }

    const dailyBonusButton =
        $("dailyBonusBtn");

    if (dailyBonusButton) {
        dailyBonusButton.disabled =
            dailyBonus >=
            DAILY_BONUS_AMOUNT;
    }

    const minerRewardInfo =
        $("minerRewardInfo");

    if (minerRewardInfo) {
        minerRewardInfo.textContent =
            minerLevel >= 2
                ? "Reward disponibile"
                : "Disponibile dal Livello 2";
    }

    const minerRewardButton =
        $("minerRewardBtn");

    if (minerRewardButton) {
        minerRewardButton.disabled =
            minerLevel < 2;
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
            String(
                Math.max(
                    0,
                    referralCount
                )
            );
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

    window.balance =
        balance;
}

/* =========================
   MOSTRA LOGIN
   ========================= */

function showLogin() {
    if (loginBox) {
        loginBox.classList.remove(
            "hidden"
        );
    }

    if (miningBox) {
        miningBox.classList.add(
            "hidden"
        );
    }

    if (rewardsBox) {
        rewardsBox.classList.add(
            "hidden"
        );
    }

    if (referralBox) {
        referralBox.classList.add(
            "hidden"
        );
    }

    if (accountBox) {
        accountBox.classList.add(
            "hidden"
        );
    }
}

/* =========================
   MOSTRA MINING
   ========================= */

function showMining() {
    if (loginBox) {
        loginBox.classList.add(
            "hidden"
        );
    }

    if (miningBox) {
        miningBox.classList.remove(
            "hidden"
        );
    }

    if (rewardsBox) {
        rewardsBox.classList.remove(
            "hidden"
        );
    }

    if (referralBox) {
        referralBox.classList.remove(
            "hidden"
        );
    }

    if (accountBox) {
        accountBox.classList.remove(
            "hidden"
        );
    }

    updateMiningUI();
}

/* =========================
   RESET DATI
   ========================= */

function resetMiningData() {
    balance = 0;

    minerLevel = 1;

    speedBonus = 0;

    offlineHours =
        DEFAULT_OFFLINE_HOURS;

    miningActive = false;

    hashrate =
        BASE_HASHRATE;

    miningSpeed = 0;

    dailyBonus = 0;

    referralCode = "";

    referralCount = 0;

    lastMiningAt = null;

    lastTick =
        Date.now();

    processingOffline = false;

    window.balance =
        balance;

    updateMiningUI();
}

/* =========================
   LOGOUT
   ========================= */

async function logout() {
    if (!supabaseClient) {
        return;
    }

    if (currentUser) {
        await saveMiningAccount(
            true
        );
    }

    try {
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

        currentUser =
            null;

        resetMiningData();

        showLogin();

        showAuthMessage(
            "Disconnesso.",
            "success"
        );

    } catch (error) {
        console.error(
            "Errore logout:",
            error
        );

        alert(
            "Errore durante il logout."
        );
    }
}

/* =========================
   LOGIN
   ========================= */

async function login() {
    if (!supabaseClient) {
        showAuthMessage(
            "Supabase non disponibile. Ricarica la pagina.",
            "error"
        );
        return;
    }

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

    try {
        const result =
            await supabaseClient
                .auth
                .signInWithPassword({
                    email:
                        email,
                    password:
                        password
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

    } catch (error) {
        console.error(
            "Errore login:",
            error
        );

        showAuthMessage(
            "Errore durante l'accesso.",
            "error"
        );
    }
}

/* =========================
   REGISTRAZIONE
   ========================= */

async function register() {
    if (!supabaseClient) {
        showAuthMessage(
            "Supabase non disponibile. Ricarica la pagina.",
            "error"
        );
        return;
    }

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

    try {
        const result =
            await supabaseClient
                .auth
                .signUp({
                    email:
                        email,
                    password:
                        password
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
            result.data.user &&
            result.data.session
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
            "Registrazione completata. Controlla la tua email per confermare l'account.",
            "success"
        );

    } catch (error) {
        console.error(
            "Errore registrazione:",
            error
        );

        showAuthMessage(
            "Errore durante la registrazione.",
            "error"
        );
    }
}

/* =========================
   CONTROLLO SESSIONE
   ========================= */

async function checkSession() {
    if (
        !domReady ||
        !supabaseClient
    ) {
        return false;
    }

    try {
        const result =
            await supabaseClient
                .auth
                .getSession();

        if (result.error) {
            console.error(
                "Errore sessione:",
                result.error
            );

            currentUser =
                null;

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

    } catch (error) {
        console.error(
            "Errore checkSession:",
            error
        );

        currentUser =
            null;

        resetMiningData();

        showLogin();

        return false;
    }
}

/* =========================
   AUTH STATE
   ========================= */

function setupAuthListener() {
    if (!supabaseClient) {
        return;
    }

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
}

/* =========================
   MINING ONLINE
   ========================= */

setInterval(
    function() {
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

/* =========================
   AUTOSAVE
   ========================= */

setInterval(
    async function() {
        if (
            !currentUser ||
            !supabaseClient
        ) {
            return;
        }

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
    },
    AUTOSAVE_INTERVAL
);

/* =========================
   VISIBILITY
   ========================= */

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
            await saveMiningAccount(
                false
            );
        }

        lastTick =
            Date.now();
    }
);

/* =========================
   DOM READY
   ========================= */

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

        domReady =
            true;

        /* PASSWORD */

        const togglePassword =
            $("togglePassword");

        if (
            togglePassword &&
            passwordInput
        ) {
            togglePassword.addEventListener(
                "click",
                function() {
                    const isVisible =
                        passwordInput.type ===
                        "text";

                    passwordInput.type =
                        isVisible
                            ? "password"
                            : "text";

                    togglePassword.textContent =
                        isVisible
                            ? "👁️"
                            : "🙈";

                    togglePassword.setAttribute(
                        "aria-label",
                        isVisible
                            ? "Mostra password"
                            : "Nascondi password"
                    );
                }
            );
        }

        /* LOGIN */

        const loginBtn =
            $("loginBtn");

        if (loginBtn) {
            loginBtn.addEventListener(
                "click",
                login
            );
        }

        /* REGISTRAZIONE */

        const signupBtn =
            $("signupBtn");

        if (signupBtn) {
            signupBtn.addEventListener(
                "click",
                register
            );
        }

        /* LOGOUT */

        const logoutBtn =
            $("logoutBtn");

        if (logoutBtn) {
            logoutBtn.addEventListener(
                "click",
                logout
            );
        }

        /* MINING */

        const toggleMiningBtn =
            $("toggleMiningBtn");

        if (toggleMiningBtn) {
            toggleMiningBtn.addEventListener(
                "click",
                toggleMining
            );
        }

        /* CLAIM */

        const claimBtn =
            $("claimBtn");

        if (claimBtn) {
            claimBtn.addEventListener(
                "click",
                claimPoints
            );
        }

        /* UPGRADE */

        const upgradeBtn =
            $("upgradeBtn");

        if (upgradeBtn) {
            upgradeBtn.addEventListener(
                "click",
                upgradeMiner
            );
        }

        /* DAILY BONUS */

        const dailyBonusBtn =
            $("dailyBonusBtn");

        if (dailyBonusBtn) {
            dailyBonusBtn.addEventListener(
                "click",
                claimDailyBonus
            );
        }

        /* MINER REWARD */

        const minerRewardBtn =
            $("minerRewardBtn");

        if (minerRewardBtn) {
            minerRewardBtn.addEventListener(
                "click",
                claimMinerReward
            );
        }

        /* REFERRAL */

        const copyReferralBtn =
            $("copyReferralBtn");

        if (copyReferralBtn) {
            copyReferralBtn.addEventListener(
                "click",
                copyReferralCode
            );
        }

        /* ENTER LOGIN */

        if (emailInput) {
            emailInput.addEventListener(
                "keydown",
                function(event) {
                    if (
                        event.key ===
                        "Enter"
                    ) {
                        login();
                    }
                }
            );
        }

        if (passwordInput) {
            passwordInput.addEventListener(
                "keydown",
                function(event) {
                    if (
                        event.key ===
                        "Enter"
                    ) {
                        login();
                    }
                }
            );
        }

        /* STATO INIZIALE */

        showLogin();

        updateMiningUI();

        /* AUTH LISTENER */

        setupAuthListener();

        /* SESSIONE */

        await checkSession();

        console.log(
            "BOB Mining V12 inizializzazione completata."
        );
    }
);

/* =========================
   FUNZIONI GLOBALI
   ========================= */

window.login =
    login;

window.register =
    register;

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

window.claimDailyBonus =
    claimDailyBonus;

window.claimMinerReward =
    claimMinerReward;

window.copyReferralCode =
    copyReferralCode;

window.updateMiningUI =
    updateMiningUI;

window.getProductionPerMinute =
    getProductionPerMinute;

window.getUpgradeCost =
    getUpgradeCost;

window.addMiningProduction =
    addMiningProduction;

window.showLogin =
    showLogin;

window.showMining =
    showMining;

window.balance =
    balance;

console.log(
    "BOB Mining V12 app.js caricato."
);
