"use strict";

/* =====================================================
   BOB MINING V17
   Compatibile con index.html V14

   Supabase
   Login / Registrazione
   Sessione automatica
   Mining online
   Mining offline
   Autosave
   Anti doppio accredito
   Upgrade Miner tramite RPC Supabase
   Daily Bonus 24h
   Reward Miner
   Referral
   Claim Points
   Logout sicuro
   Gestione errori
   ===================================================== */

console.log("BOB Mining V17 app.js caricato.");


/* =====================================================
   SUPABASE
   ===================================================== */

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

    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

    window.supabaseClient =
        supabaseClient;

    console.log("Supabase collegato.");
}


/* =====================================================
   CONFIGURAZIONE
   ===================================================== */

const BASE_PRODUCTION_PER_MINUTE = 0.10;
const BASE_HASHRATE = 10;

const UPGRADE_BASE_COST = 100;

const DEFAULT_OFFLINE_HOURS = 2;
const MAX_OFFLINE_HOURS = 24;

const DAILY_BONUS_AMOUNT = 1;
const DAILY_BONUS_COOLDOWN =
    24 * 60 * 60 * 1000;

const REFERRAL_BONUS_AMOUNT = 5;

const MINING_TICK_INTERVAL = 1000;
const AUTOSAVE_INTERVAL = 30000;


/* =====================================================
   STATO
   ===================================================== */

let currentUser = null;

let balance = 0;
let minerLevel = 1;
let speedBonus = 0;
let offlineHours = DEFAULT_OFFLINE_HOURS;

let miningActive = false;

let hashrate = BASE_HASHRATE;
let miningSpeed = 0;

let dailyBonus = 0;
let dailyBonusClaimedAt = null;

let referralCode = "";
let referralCount = 0;

let lastMiningAt = null;
let lastTick = Date.now();

let domReady = false;

let loadingAccount = false;
let savingAccount = false;
let processingOffline = false;
let processingDailyBonus = false;
let processingUpgrade = false;
let processingClaim = false;
let loggingOut = false;

let miningInterval = null;
let autosaveInterval = null;


/* =====================================================
   ELEMENTI DOM
   ===================================================== */

let loginBox = null;
let miningBox = null;
let rewardsBox = null;
let referralBox = null;
let accountBox = null;

let emailInput = null;
let passwordInput = null;


/* =====================================================
   HELPER DOM
   ===================================================== */

function $(id) {
    return document.getElementById(id);
}


/* =====================================================
   NUMERI SICURI
   ===================================================== */

function safeNumber(value, fallback = 0) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return number;
}


function safeInteger(value, fallback = 0) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return Math.floor(number);
}


/* =====================================================
   MESSAGGI
   ===================================================== */

function showMessage(
    elementId,
    message,
    type = ""
) {

    const element = $(elementId);

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        "message";

    if (type) {
        element.classList.add(type);
    }
}


function showAuthMessage(
    message,
    type = ""
) {

    showMessage(
        "authMessage",
        message,
        type
    );
}


function showMiningMessage(
    message,
    type = ""
) {

    showMessage(
        "miningMessage",
        message,
        type
    );
}


function showReferralMessage(
    message,
    type = ""
) {

    showMessage(
        "referralMessage",
        message,
        type
    );
}


/* =====================================================
   UPGRADE COST
   ===================================================== */

function getUpgradeCost() {

    const level =
        Math.max(
            1,
            safeInteger(
                minerLevel,
                1
            )
        );

    return UPGRADE_BASE_COST * level;
}


/* =====================================================
   PRODUZIONE
   ===================================================== */

function getProductionPerMinute() {

    const level =
        Math.max(
            1,
            safeNumber(
                minerLevel,
                1
            )
        );

    const bonus =
        Math.max(
            0,
            safeNumber(
                speedBonus,
                0
            )
        );

    return (
        BASE_PRODUCTION_PER_MINUTE *
        level *
        (
            1 +
            bonus / 100
        )
    );
}


/* =====================================================
   HASHRATE
   ===================================================== */

function calculateHashrate() {

    const level =
        Math.max(
            1,
            safeInteger(
                minerLevel,
                1
            )
        );

    return BASE_HASHRATE * level;
}


/* =====================================================
   DAILY BONUS
   ===================================================== */

function getDailyBonusAvailable() {

    if (!dailyBonusClaimedAt) {
        return true;
    }

    const claimedTime =
        new Date(
            dailyBonusClaimedAt
        ).getTime();

    if (!Number.isFinite(claimedTime)) {
        return true;
    }

    return (
        Date.now() -
        claimedTime >=
        DAILY_BONUS_COOLDOWN
    );
}


function getDailyBonusRemainingMs() {

    if (!dailyBonusClaimedAt) {
        return 0;
    }

    const claimedTime =
        new Date(
            dailyBonusClaimedAt
        ).getTime();

    if (!Number.isFinite(claimedTime)) {
        return 0;
    }

    return Math.max(
        0,
        DAILY_BONUS_COOLDOWN -
        (
            Date.now() -
            claimedTime
        )
    );
}


function formatRemainingTime(ms) {

    const totalMinutes =
        Math.ceil(
            Math.max(
                0,
                ms
            ) / 60000
        );

    const hours =
        Math.floor(
            totalMinutes / 60
        );

    const minutes =
        totalMinutes % 60;

    if (hours > 0) {

        return (
            hours +
            "h " +
            minutes +
            "m"
        );
    }

    return minutes + "m";
}


/* =====================================================
   REFERRAL
   ===================================================== */

function generateReferralCode() {

    if (
        !currentUser ||
        !currentUser.id
    ) {
        return "";
    }

    const cleanId =
        String(
            currentUser.id
        )
        .replace(
            /-/g,
            ""
        )
        .substring(
            0,
            8
        )
        .toUpperCase();

    return "BOB" + cleanId;
}


/* =====================================================
   PRODUZIONE
   ===================================================== */

function addMiningProduction(minutes) {

    if (!miningActive) {
        return 0;
    }

    const safeMinutes =
        safeNumber(
            minutes,
            0
        );

    if (safeMinutes <= 0) {
        return 0;
    }

    const maxSafeMinutes =
        MAX_OFFLINE_HOURS * 60;

    const limitedMinutes =
        Math.min(
            safeMinutes,
            maxSafeMinutes
        );

    const production =
        getProductionPerMinute();

    const earned =
        production *
        limitedMinutes;

    if (
        !Number.isFinite(
            earned
        ) ||
        earned <= 0
    ) {
        return 0;
    }

    balance += earned;

    if (
        !Number.isFinite(
            balance
        ) ||
        balance < 0
    ) {
        balance = 0;
    }

    window.balance =
        balance;

    return earned;
}


/* =====================================================
   APPLICA ACCOUNT
   ===================================================== */

function applyMiningAccount(data) {

    const account =
        data || {};

    balance =
        Math.max(
            0,
            safeNumber(
                account.balance_points,
                0
            )
        );

    minerLevel =
        Math.max(
            1,
            safeInteger(
                account.miner_level,
                1
            )
        );

    speedBonus =
        Math.max(
            0,
            safeNumber(
                account.speed_bonus,
                0
            )
        );

    offlineHours =
        Math.max(
            0,
            Math.min(
                MAX_OFFLINE_HOURS,
                safeInteger(
                    account.offline_hours,
                    DEFAULT_OFFLINE_HOURS
                )
            )
        );

    miningActive =
        account.mining_active === true;

    hashrate =
        calculateHashrate();

    miningSpeed =
        Math.max(
            0,
            safeNumber(
                account.mining_speed,
                0
            )
        );

    dailyBonus =
        Math.max(
            0,
            safeNumber(
                account.daily_bonus,
                0
            )
        );

    dailyBonusClaimedAt =
        account.daily_bonus_claimed_at ||
        null;

    referralCode =
        account.referral_code
            ? String(
                account.referral_code
            )
            : generateReferralCode();

    referralCount =
        Math.max(
            0,
            safeInteger(
                account.referral_count,
                0
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

    lastTick =
        Date.now();

    window.balance =
        balance;

    updateMiningUI();
}


/* =====================================================
   CREA ACCOUNT
   ===================================================== */

async function createMiningAccount() {

    if (
        !currentUser ||
        !supabaseClient
    ) {
        return false;
    }

    const now =
        new Date().toISOString();

    const code =
        generateReferralCode();

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
            now,

        hashrate:
            BASE_HASHRATE,

        mining_speed:
            0,

        daily_bonus:
            0,

        daily_bonus_claimed_at:
            null,

        referral_code:
            code,

        referral_count:
            0
    };

    try {

        const result =
            await supabaseClient
                .from(
                    "mining_accounts"
                )
                .insert(
                    account
                )
                .select(
                    `
                    balance_points,
                    miner_level,
                    speed_bonus,
                    offline_hours,
                    mining_active,
                    last_mining_at,
                    hashrate,
                    mining_speed,
                    daily_bonus,
                    daily_bonus_claimed_at,
                    referral_code,
                    referral_count
                    `
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
            "createMiningAccount:",
            error
        );

        showAuthMessage(
            "Errore durante la creazione dell'account.",
            "error"
        );

        return false;
    }
}


/* =====================================================
   CARICA ACCOUNT
   ===================================================== */

async function loadMiningAccount() {

    if (
        !currentUser ||
        !supabaseClient
    ) {
        return false;
    }

    if (loadingAccount) {
        return false;
    }

    loadingAccount = true;

    try {

        const result =
            await supabaseClient
                .from(
                    "mining_accounts"
                )
                .select(
                    `
                    balance_points,
                    miner_level,
                    speed_bonus,
                    offline_hours,
                    mining_active,
                    last_mining_at,
                    hashrate,
                    mining_speed,
                    daily_bonus,
                    daily_bonus_claimed_at,
                    referral_code,
                    referral_count
                    `
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

        /*
         * Recupera il mining trascorso
         * dall'ultima attività.
         */

        if (miningActive) {

            await calculateOfflineMining();
        }

        updateMiningUI();

        return true;

    } catch (error) {

        console.error(
            "loadMiningAccount:",
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


/* =====================================================
   SALVA ACCOUNT
   ===================================================== */

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
                    safeInteger(
                        minerLevel,
                        1
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
                        safeInteger(
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

            daily_bonus_claimed_at:
                dailyBonusClaimedAt,

            referral_code:
                referralCode,

            referral_count:
                Math.max(
                    0,
                    safeInteger(
                        referralCount,
                        0
                    )
                )
        };

        if (updateTimestamp) {

            updateData.last_mining_at =
                new Date().toISOString();

        } else if (
            lastMiningAt instanceof Date &&
            !Number.isNaN(
                lastMiningAt.getTime()
            )
        ) {

            updateData.last_mining_at =
                lastMiningAt.toISOString();
        }

        const result =
            await supabaseClient
                .from(
                    "mining_accounts"
                )
                .update(
                    updateData
                )
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
            "saveMiningAccount:",
            error
        );

        return false;

    } finally {

        savingAccount = false;
    }
}


/* =====================================================
   ACCREDITA TEMPO TRASCORSO
   ===================================================== */

function creditElapsedMining() {

    if (
        !miningActive ||
        !lastMiningAt
    ) {
        return 0;
    }

    const now =
        new Date();

    const lastTime =
        lastMiningAt.getTime();

    if (
        !Number.isFinite(
            lastTime
        )
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
            offlineHours * 60
        );

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
     * Timestamp aggiornato subito.
     * Evita il doppio accredito.
     */

    lastMiningAt =
        now;

    lastTick =
        Date.now();

    return earned;
}


/* =====================================================
   OFFLINE MINING
   ===================================================== */

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

        const earned =
            creditElapsedMining();

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
                "Offline Mining +",
                earned.toFixed(4),
                "BOB Points"
            );
        }

        return earned;

    } catch (error) {

        console.error(
            "calculateOfflineMining:",
            error
        );

        return 0;

    } finally {

        processingOffline = false;
    }
}


/* =====================================================
   DAILY BONUS
   ===================================================== */

async function claimDailyBonus() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (processingDailyBonus) {
        return;
    }

    if (!getDailyBonusAvailable()) {

        const remaining =
            formatRemainingTime(
                getDailyBonusRemainingMs()
            );

        alert(
            "Daily Bonus già ricevuto.\n\n" +
            "Nuovo bonus disponibile tra " +
            remaining +
            "."
        );

        updateMiningUI();

        return;
    }

    processingDailyBonus = true;

    const oldBalance =
        balance;

    const oldBonus =
        dailyBonus;

    const oldClaimedAt =
        dailyBonusClaimedAt;

    try {

        balance +=
            DAILY_BONUS_AMOUNT;

        dailyBonus =
            DAILY_BONUS_AMOUNT;

        dailyBonusClaimedAt =
            new Date().toISOString();

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

            dailyBonusClaimedAt =
                oldClaimedAt;

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

    } catch (error) {

        console.error(
            "claimDailyBonus:",
            error
        );

        balance =
            oldBalance;

        dailyBonus =
            oldBonus;

        dailyBonusClaimedAt =
            oldClaimedAt;

        updateMiningUI();

        alert(
            "Errore durante il Daily Bonus."
        );

    } finally {

        processingDailyBonus = false;
    }
}


/* =====================================================
   REWARD MINER
   ===================================================== */

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

    if (processingClaim) {
        return;
    }

    processingClaim = true;

    const reward =
        minerLevel;

    const oldBalance =
        balance;

    try {

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

    } catch (error) {

        console.error(
            "claimMinerReward:",
            error
        );

        balance =
            oldBalance;

        updateMiningUI();

        alert(
            "Errore durante il Reward."
        );

    } finally {

        processingClaim = false;
    }
}


/* =====================================================
   UPGRADE MINER
   ===================================================== */

async function upgradeMiner() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (!supabaseClient) {

        alert(
            "Supabase non disponibile."
        );

        return;
    }

    if (processingUpgrade) {
        return;
    }

    processingUpgrade = true;

    try {

        /*
         * Accredita il mining fino
         * al momento dell'upgrade.
         */

        if (miningActive) {

            creditElapsedMining();

            await saveMiningAccount(
                false
            );
        }

        /*
         * Upgrade eseguito dal database.
         */

        const result =
            await supabaseClient
                .rpc(
                    "upgrade_miner"
                );

        if (result.error) {

            console.error(
                "Errore RPC upgrade_miner:",
                result.error
            );

            alert(
                "Upgrade non riuscito:\n\n" +
                result.error.message
            );

            return;
        }

        /*
         * Ricarica i dati reali
         * dopo l'upgrade.
         */

        const loaded =
            await loadMiningAccount();

        if (!loaded) {

            alert(
                "Upgrade completato, ma impossibile ricaricare i dati."
            );

            return;
        }

        showMiningMessage(
            "⬆️ Upgrade Miner completato! Livello " +
            minerLevel,
            "success"
        );

        updateMiningUI();

        console.log(
            "Upgrade Miner completato.",
            "Nuovo livello:",
            minerLevel
        );

    } catch (error) {

        console.error(
            "upgradeMiner:",
            error
        );

        alert(
            "Errore durante l'upgrade."
        );

    } finally {

        processingUpgrade = false;
    }
}


/* =====================================================
   TOGGLE MINING
   ===================================================== */

async function toggleMining() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (savingAccount) {
        return;
    }

    if (miningActive) {

        /*
         * Accredita il tempo fino allo stop.
         */

        creditElapsedMining();

        miningActive = false;

        const saved =
            await saveMiningAccount(
                true
            );

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

        lastMiningAt =
            new Date();

        lastTick =
            Date.now();

        const saved =
            await saveMiningAccount(
                true
            );

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


/* =====================================================
   CLAIM POINTS
   ===================================================== */

async function claimPoints() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }

    if (processingClaim) {
        return;
    }

    processingClaim = true;

    try {

        if (miningActive) {

            creditElapsedMining();
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

    } catch (error) {

        console.error(
            "claimPoints:",
            error
        );

        alert(
            "Errore durante il salvataggio dei Points."
        );

    } finally {

        processingClaim = false;
    }
}


/* =====================================================
   COPIA REFERRAL
   ===================================================== */

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


/* =====================================================
   UI
   ===================================================== */

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
                safeInteger(
                    minerLevel,
                    1
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
                ? "⏹️ Ferma Mining"
                : "▶️ Avvia Mining";
    }

    const upgradeButton =
        $("upgradeBtn");

    if (upgradeButton) {

        upgradeButton.textContent =
            "⬆️ Upgrade Miner — " +
            getUpgradeCost().toFixed(0) +
            " BOB";
    }


    /* =================================================
       DAILY BONUS
       ================================================= */

    const dailyBonusInfo =
        $("dailyBonusInfo");

    const dailyBonusButton =
        $("dailyBonusBtn");

    const dailyAvailable =
        getDailyBonusAvailable();

    if (dailyBonusInfo) {

        if (dailyAvailable) {

            dailyBonusInfo.textContent =
                "+" +
                DAILY_BONUS_AMOUNT.toFixed(2) +
                " BOB Points disponibili";

        } else {

            dailyBonusInfo.textContent =
                "Bonus già ricevuto — nuovo bonus tra " +
                formatRemainingTime(
                    getDailyBonusRemainingMs()
                );
        }
    }

    if (dailyBonusButton) {

        dailyBonusButton.disabled =
            !dailyAvailable;

        dailyBonusButton.textContent =
            dailyAvailable
                ? "Claim"
                : "Già ricevuto";
    }


    /* =================================================
       MINER REWARD
       ================================================= */

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


    /* =================================================
       REFERRAL
       ================================================= */

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


    /* =================================================
       ACCOUNT
       ================================================= */

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


/* =====================================================
   MOSTRA LOGIN
   ===================================================== */

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

    stopMiningLoop();
    stopAutosave();
}


/* =====================================================
   MOSTRA MINING
   ===================================================== */

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

    startMiningLoop();
    startAutosave();
}


/* =====================================================
   LOOP MINING
   ===================================================== */

function startMiningLoop() {

    stopMiningLoop();

    miningInterval =
        setInterval(
            function () {

                if (
                    !currentUser ||
                    !miningActive
                ) {
                    return;
                }

                const now =
                    Date.now();

                let elapsed =
                    (
                        now -
                        lastTick
                    ) / 60000;

                if (
                    !Number.isFinite(
                        elapsed
                    ) ||
                    elapsed <= 0
                ) {
                    return;
                }

                /*
                 * Protezione contro salti
                 * anomali del timer.
                 */

                elapsed =
                    Math.min(
                        elapsed,
                        1
                    );

                const earned =
                    addMiningProduction(
                        elapsed
                    );

                lastTick =
                    now;

                lastMiningAt =
                    new Date(now);

                updateMiningUI();

                if (earned > 0) {

                    /*
                     * Il salvataggio completo
                     * avviene tramite autosave.
                     */

                    window.balance =
                        balance;
                }

            },
            MINING_TICK_INTERVAL
        );
}


function stopMiningLoop() {

    if (miningInterval) {

        clearInterval(
            miningInterval
        );

        miningInterval =
            null;
    }
}


/* =====================================================
   AUTOSAVE
   ===================================================== */

function startAutosave() {

    stopAutosave();

    autosaveInterval =
        setInterval(
            async function () {

                if (
                    !currentUser ||
                    savingAccount
                ) {
                    return;
                }

                if (miningActive) {

                    creditElapsedMining();
                }

                await saveMiningAccount(
                    false
                );

                updateMiningUI();

            },
            AUTOSAVE_INTERVAL
        );
}


function stopAutosave() {

    if (autosaveInterval) {

        clearInterval(
            autosaveInterval
        );

        autosaveInterval =
            null;
    }
}


/* =====================================================
   RESET
   ===================================================== */

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

    dailyBonusClaimedAt =
        null;

    referralCode = "";

    referralCount = 0;

    lastMiningAt = null;

    lastTick =
        Date.now();

    processingOffline = false;
    processingDailyBonus = false;
    processingUpgrade = false;
    processingClaim = false;

    window.balance =
        0;

    updateMiningUI();
}


/* =====================================================
   LOGOUT
   ===================================================== */

async function logout() {

    if (loggingOut) {
        return;
    }

    if (!supabaseClient) {

        currentUser =
            null;

        resetMiningData();
        showLogin();

        return;
    }

    loggingOut = true;

    try {

        /*
         * Salva l'ultimo periodo
         * prima del logout.
         */

        if (
            currentUser &&
            miningActive
        ) {

            creditElapsedMining();

            miningActive =
                false;
        }

        if (currentUser) {

            const saved =
                await saveMiningAccount(
                    true
                );

            if (!saved) {

                miningActive =
                    true;

                alert(
                    "Logout annullato: impossibile salvare i dati del mining."
                );

                return;
            }
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
            "logout:",
            error
        );

        alert(
            "Errore durante il logout."
        );

    } finally {

        loggingOut = false;
    }
}


/* =====================================================
   LOGIN
   ===================================================== */

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

    if (
        !email ||
        !password
    ) {

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
            "login:",
            error
        );

        showAuthMessage(
            "Errore durante l'accesso.",
            "error"
        );
    }
}


/* =====================================================
   REGISTRAZIONE
   ===================================================== */

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

    if (
        !email ||
        !password
    ) {

        showAuthMessage(
            "Inserisci email e password.",
            "error"
        );

        return;
    }

    if (
        password.length < 6
    ) {

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
            "register:",
            error
        );

        showAuthMessage(
            "Errore durante la registrazione.",
            "error"
        );
    }
}


/* =====================================================
   SESSIONE
   ===================================================== */

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
            "checkSession:",
            error
        );

        currentUser =
            null;

        resetMiningData();
        showLogin();

        return false;
    }
}


/* =====================================================
   AUTH LISTENER
   ===================================================== */

function setupAuthListener() {

    if (!supabaseClient) {
        return;
    }

    supabaseClient.auth.onAuthStateChange(
        async function (
            event,
            session
        ) {

            console.log(
                "Auth event:",
                event
            );

            /*
             * Evita di fare operazioni
             * inutili durante INITIAL_SESSION
             * se checkSession ha già caricato.
             */

            if (event === "SIGNED_OUT") {

                currentUser =
                    null;

                resetMiningData();

                showLogin();

                return;
            }

            if (
                event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "USER_UPDATED"
            ) {

                if (
                    session &&
                    session.user
                ) {

                    currentUser =
                        session.user;

                    const loaded =
                        await loadMiningAccount();

                    if (loaded) {

                        showMining();
                    }
                }
            }
        }
    );
}


/* =====================================================
   PASSWORD TOGGLE
   ===================================================== */

function setupPasswordToggle() {

    const button =
        $("togglePassword");

    if (
        !button ||
        !passwordInput
    ) {
        return;
    }

    button.addEventListener(
        "click",
        function () {

            const isPassword =
                passwordInput.type ===
                "password";

            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";

            button.textContent =
                isPassword
                    ? "🙈"
                    : "👁️";

            button.setAttribute(
                "aria-label",
                isPassword
                    ? "Nascondi password"
                    : "Mostra password"
            );
        }
    );
}


/* =====================================================
   EVENTI
   ===================================================== */

function setupEvents() {

    const loginBtn =
        $("loginBtn");

    const signupBtn =
        $("signupBtn");

    const toggleMiningBtn =
        $("toggleMiningBtn");

    const claimBtn =
        $("claimBtn");

    const upgradeBtn =
        $("upgradeBtn");

    const dailyBonusBtn =
        $("dailyBonusBtn");

    const minerRewardBtn =
        $("minerRewardBtn");

    const copyReferralBtn =
        $("copyReferralBtn");

    const logoutBtn =
        $("logoutBtn");


    if (loginBtn) {

        loginBtn.addEventListener(
            "click",
            login
        );
    }


    if (signupBtn) {

        signupBtn.addEventListener(
            "click",
            register
        );
    }


    if (toggleMiningBtn) {

        toggleMiningBtn.addEventListener(
            "click",
            toggleMining
        );
    }


    if (claimBtn) {

        claimBtn.addEventListener(
            "click",
            claimPoints
        );
    }


    if (upgradeBtn) {

        upgradeBtn.addEventListener(
            "click",
            upgradeMiner
        );
    }


    if (dailyBonusBtn) {

        dailyBonusBtn.addEventListener(
            "click",
            claimDailyBonus
        );
    }


    if (minerRewardBtn) {

        minerRewardBtn.addEventListener(
            "click",
            claimMinerReward
        );
    }


    if (copyReferralBtn) {

        copyReferralBtn.addEventListener(
            "click",
            copyReferralCode
        );
    }


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );
    }


    setupPasswordToggle();


    /*
     * Invio con ENTER.
     */

    if (emailInput) {

        emailInput.addEventListener(
            "keydown",
            function (event) {

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
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    login();
                }
            }
        );
    }
}


/* =====================================================
   VISIBILITÀ / PAGINA
   ===================================================== */

function setupPageVisibility() {

    document.addEventListener(
        "visibilitychange",
        async function () {

            if (
                document.visibilityState ===
                "visible"
            ) {

                if (
                    currentUser &&
                    miningActive
                ) {

                    await calculateOfflineMining();

                    lastTick =
                        Date.now();

                    updateMiningUI();
                }
            }
        }
    );
}


/* =====================================================
   SALVATAGGIO PRIMA DI USCIRE
   ===================================================== */

window.addEventListener(
    "beforeunload",
    function () {

        /*
         * Non possiamo aspettare una Promise
         * in modo affidabile durante beforeunload.
         *
         * Aggiorniamo comunque lo stato locale.
         */

        if (
            currentUser &&
            miningActive
        ) {

            creditElapsedMining();
        }
    }
);


/* =====================================================
   AVVIO APP
   ===================================================== */

async function initApp() {

    console.log(
        "Avvio BOB Mining V17..."
    );

    /*
     * Elementi DOM.
     */

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


    /*
     * Stato iniziale.
     */

    resetMiningData();

    showLogin();


    /*
     * Eventi.
     */

    setupEvents();

    setupPageVisibility();

    setupAuthListener();


    /*
     * Sessione Supabase.
     */

    if (!supabaseClient) {

        showAuthMessage(
            "Supabase non disponibile.",
            "error"
        );

        return;
    }

    await checkSession();

    /*
     * Aggiorna periodicamente
     * il countdown del Daily Bonus.
     */

    setInterval(
        function () {

            if (currentUser) {

                updateMiningUI();
            }

        },
        30000
    );

    console.log(
        "BOB Mining V17 pronto."
    );
}


/* =====================================================
   DOM READY
   ===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initApp
    );

} else {

    initApp();
}


/* =====================================================
   ESPORTAZIONE GLOBALE
   ===================================================== */

window.BOBMining = {

    login,
    register,
    logout,

    toggleMining,
    claimPoints,

    upgradeMiner,

    claimDailyBonus,
    claimMinerReward,

    copyReferralCode,

    loadMiningAccount,
    saveMiningAccount,

    updateMiningUI,

    getProductionPerMinute,
    getUpgradeCost,

    calculateOfflineMining
};
