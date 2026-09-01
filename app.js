"use strict";

/* =====================================================
   BOB MINING V19 DEFINITIVE
   SERVER-SIDE MINING
   Compatibile con index.html V14

   SUPABASE
   LOGIN / REGISTRAZIONE
   SESSIONE AUTOMATICA

   MINING SERVER-SIDE
   OFFLINE MINING
   ANTI DOUBLE CREDIT
   AUTOSAVE UI

   RPC:
   - claim_mining()
   - upgrade_miner()
   - claim_daily_bonus()
   - claim_miner_reward()

   REFERRAL
   CLAIM POINTS
   LOGOUT
===================================================== */

console.log("⛏️ BOB Mining V19 Definitive - avvio");


/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
    "https://fxyqeeznykdtmaoywpmm.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_n6-IZsqob6jeQzL8igv-EA_lSNtURMn";

let supabaseClient = null;

if (
    window.supabase &&
    typeof window.supabase.createClient === "function"
) {
    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

    window.supabaseClient =
        supabaseClient;

    console.log("✅ Supabase collegato.");
} else {
    console.error(
        "❌ Supabase non è stato caricato."
    );
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

const MINING_CLAIM_INTERVAL = 30000;
const AUTOSAVE_INTERVAL = 30000;
const BONUS_TIMER_INTERVAL = 30000;


/* =====================================================
   STATO
===================================================== */

let currentUser = null;

let balance = 0;
let minerLevel = 1;
let speedBonus = 0;

let offlineHours =
    DEFAULT_OFFLINE_HOURS;

let miningActive = false;

let hashrate =
    BASE_HASHRATE;

let miningSpeed = 0;

let dailyBonus = 0;
let dailyBonusClaimedAt = null;

let referralCode = "";
let referralCount = 0;

let lastMiningAt = null;

let domReady = false;


/* =====================================================
   LOCK
===================================================== */

let loadingAccount = false;
let savingAccount = false;

let processingMiningClaim = false;
let processingDailyBonus = false;
let processingUpgrade = false;
let processingMinerReward = false;
let processingClaimPoints = false;

let loggingOut = false;


/* =====================================================
   TIMER
===================================================== */

let miningInterval = null;
let autosaveInterval = null;
let bonusTimerInterval = null;


/* =====================================================
   DOM
===================================================== */

let loginBox = null;
let miningBox = null;
let rewardsBox = null;
let referralBox = null;
let accountBox = null;

let emailInput = null;
let passwordInput = null;


/* =====================================================
   HELPER
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

    return (
        UPGRADE_BASE_COST *
        level
    );
}


/* =====================================================
   PRODUZIONE VISUALIZZATA
   IMPORTANTE:
   NON modifica il saldo.
   Serve solamente per mostrare
   la velocità prevista.
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

    return (
        BASE_HASHRATE *
        level
    );
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

    return (
        minutes +
        "m"
    );
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

    return (
        "BOB" +
        cleanId
    );
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
        Math.max(
            BASE_HASHRATE,
            safeNumber(
                account.hashrate,
                calculateHashrate()
            )
        );

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

    try {
        const result =
            await supabaseClient
                .from("mining_accounts")
                .insert({
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
                        0,

                    miner_reward_claimed_at:
                        null,

                    last_reward_level:
                        1
                })
                .select(`
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
                    referral_count,
                    miner_reward_claimed_at,
                    last_reward_level,
                    updated_at
                `)
                .single();

        if (result.error) {
            console.error(
                "❌ Creazione account:",
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
            "❌ createMiningAccount:",
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
   SELECT ACCOUNT
===================================================== */

async function fetchMiningAccount() {
    if (
        !currentUser ||
        !supabaseClient
    ) {
        return null;
    }

    const result =
        await supabaseClient
            .from("mining_accounts")
            .select(`
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
                referral_count,
                miner_reward_claimed_at,
                last_reward_level,
                updated_at
            `)
            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();

    if (result.error) {
        console.error(
            "❌ fetchMiningAccount:",
            result.error
        );

        return null;
    }

    return result.data;
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
        let data =
            await fetchMiningAccount();

        if (!data) {
            const created =
                await createMiningAccount();

            return created;
        }

        /*
         * Applichiamo prima i dati.
         */

        applyMiningAccount(
            data
        );

        /*
         * V19:
         * se il mining era attivo,
         * il primo claim viene eseguito
         * dal SERVER.
         */

        if (miningActive) {
            await claimMiningFromServer(
                false
            );
        }

        /*
         * Ricarica saldo reale.
         */

        data =
            await fetchMiningAccount();

        if (data) {
            applyMiningAccount(
                data
            );
        }

        return true;

    } catch (error) {
        console.error(
            "❌ loadMiningAccount:",
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
   SALVA SOLO STATO NON FINANZIARIO
   V19
===================================================== */

async function saveMiningState(
    miningState,
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
        const updateData = {
            mining_active:
                Boolean(
                    miningState
                ),

            updated_at:
                new Date().toISOString()
        };

        /*
         * last_mining_at viene modificato
         * solo quando AVVIAMO il mining.
         *
         * Il timestamp dei claim viene invece
         * gestito dalla RPC server-side.
         */

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
                "❌ SALVATAGGIO STATO:",
                result.error
            );

            return false;
        }

        return true;

    } catch (error) {
        console.error(
            "❌ saveMiningState:",
            error
        );

        return false;

    } finally {
        savingAccount = false;
    }
}


/* =====================================================
   CLAIM MINING SERVER-SIDE
===================================================== */

async function claimMiningFromServer(
    showResult = true
) {
    if (
        !currentUser ||
        !supabaseClient
    ) {
        return 0;
    }

    if (processingMiningClaim) {
        return 0;
    }

    processingMiningClaim = true;

    try {
        const result =
            await supabaseClient
                .rpc(
                    "claim_mining"
                );

        if (result.error) {
            console.error(
                "❌ claim_mining:",
                result.error
            );

            if (showResult) {
                showMiningMessage(
                    "Errore Mining: " +
                    result.error.message,
                    "error"
                );
            }

            return 0;
        }

        const reward =
            Math.max(
                0,
                safeNumber(
                    result.data,
                    0
                )
            );

        /*
         * Ricarichiamo il saldo REALE
         * dal database.
         */

        const account =
            await fetchMiningAccount();

        if (account) {
            applyMiningAccount(
                account
            );
        }

        if (
            showResult &&
            reward > 0
        ) {
            showMiningMessage(
                "⛏️ Mining +"
                +
                reward.toFixed(4)
                +
                " BOB",
                "success"
            );
        }

        console.log(
            "⛏️ Server Mining:",
            reward.toFixed(8),
            "BOB"
        );

        return reward;

    } catch (error) {
        console.error(
            "❌ claimMiningFromServer:",
            error
        );

        if (showResult) {
            showMiningMessage(
                "Errore durante il Mining.",
                "error"
            );
        }

        return 0;

    } finally {
        processingMiningClaim = false;
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

    if (!supabaseClient) {
        alert(
            "Supabase non disponibile."
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

        return;
    }

    processingDailyBonus = true;

    try {
        /*
         * Prima del bonus facciamo il claim
         * del mining maturato.
         */

        if (miningActive) {
            await claimMiningFromServer(
                false
            );
        }

        const result =
            await supabaseClient
                .rpc(
                    "claim_daily_bonus"
                );

        if (result.error) {
            console.error(
                "❌ claim_daily_bonus:",
                result.error
            );

            alert(
                "Daily Bonus non disponibile:\n\n" +
                result.error.message
            );

            return;
        }

        const loaded =
            await reloadAccountAfterRPC();

        if (!loaded) {
            alert(
                "Bonus eseguito, ma impossibile aggiornare il saldo."
            );

            return;
        }

        showMiningMessage(
            "🎁 Daily Bonus +1 BOB!",
            "success"
        );

        updateMiningUI();

        console.log(
            "🎁 Daily Bonus:",
            result.data
        );

    } catch (error) {
        console.error(
            "❌ claimDailyBonus:",
            error
        );

        alert(
            "Errore durante il Daily Bonus."
        );

    } finally {
        processingDailyBonus = false;
    }
}


/* =====================================================
   RELOAD ACCOUNT
===================================================== */

async function reloadAccountAfterRPC() {
    if (
        !currentUser ||
        !supabaseClient
    ) {
        return false;
    }

    try {
        const data =
            await fetchMiningAccount();

        if (!data) {
            return false;
        }

        applyMiningAccount(
            data
        );

        return true;

    } catch (error) {
        console.error(
            "❌ reloadAccountAfterRPC:",
            error
        );

        return false;
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

    if (!supabaseClient) {
        alert(
            "Supabase non disponibile."
        );

        return;
    }

    if (minerLevel < 2) {
        alert(
            "Reward disponibile dal Livello 2."
        );

        return;
    }

    if (processingMinerReward) {
        return;
    }

    processingMinerReward = true;

    try {
        /*
         * Prima accredita eventuale mining maturato.
         */

        if (miningActive) {
            await claimMiningFromServer(
                false
            );
        }

        const result =
            await supabaseClient
                .rpc(
                    "claim_miner_reward"
                );

        if (result.error) {
            console.error(
                "❌ claim_miner_reward:",
                result.error
            );

            alert(
                "Reward non disponibile:\n\n" +
                result.error.message
            );

            return;
        }

        const loaded =
            await reloadAccountAfterRPC();

        if (!loaded) {
            alert(
                "Reward eseguito, ma impossibile aggiornare i dati."
            );

            return;
        }

        showMiningMessage(
            "🏆 Reward Miner ricevuto!",
            "success"
        );

        updateMiningUI();

        console.log(
            "🏆 Miner Reward:",
            result.data
        );

    } catch (error) {
        console.error(
            "❌ claimMinerReward:",
            error
        );

        alert(
            "Errore durante il Reward."
        );

    } finally {
        processingMinerReward = false;
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
         * Prima accredita tutto il mining maturato.
         */

        if (miningActive) {
            await claimMiningFromServer(
                false
            );
        }

        /*
         * Upgrade esclusivamente server-side.
         */

        const result =
            await supabaseClient
                .rpc(
                    "upgrade_miner"
                );

        if (result.error) {
            console.error(
                "❌ upgrade_miner:",
                result.error
            );

            alert(
                "Upgrade non riuscito:\n\n" +
                result.error.message
            );

            return;
        }

        const loaded =
            await reloadAccountAfterRPC();

        if (!loaded) {
            alert(
                "Upgrade eseguito, ma impossibile aggiornare i dati."
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
            "⬆️ Upgrade:",
            result.data
        );

    } catch (error) {
        console.error(
            "❌ upgradeMiner:",
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

    /*
     * ================================================
     * FERMA MINING
     * ================================================
     */

    if (miningActive) {

        /*
         * Prima del blocco:
         * claim del periodo maturato
         * gestito dal SERVER.
         */

        await claimMiningFromServer(
            false
        );

        miningActive =
            false;

        const saved =
            await saveMiningState(
                false,
                false
            );

        if (!saved) {
            miningActive =
                true;

            updateMiningUI();

            alert(
                "Impossibile fermare il mining."
            );

            return;
        }

        await reloadAccountAfterRPC();

        showMiningMessage(
            "⏹️ Mining fermato.",
            "success"
        );

        updateMiningUI();

        return;
    }


    /*
     * ================================================
     * AVVIA MINING
     * ================================================
     */

    miningActive =
        true;

    /*
     * Quando il mining viene avviato,
     * il nuovo periodo parte da NOW.
     */

    lastMiningAt =
        new Date();

    const saved =
        await saveMiningState(
            true,
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

    await reloadAccountAfterRPC();

    showMiningMessage(
        "⛏️ Mining avviato.",
        "success"
    );

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

    if (processingClaimPoints) {
        return;
    }

    processingClaimPoints = true;

    try {
        /*
         * V19:
         * Claim Points = claim del mining
         * server-side.
         */

        const reward =
            await claimMiningFromServer(
                false
            );

        updateMiningUI();

        if (reward > 0) {
            showMiningMessage(
                "💰 Points accreditati: +" +
                reward.toFixed(4) +
                " BOB",
                "success"
            );
        } else {
            showMiningMessage(
                "💰 Nessun nuovo Point da accreditare.",
                "success"
            );
        }

    } catch (error) {
        console.error(
            "❌ claimPoints:",
            error
        );

        alert(
            "Errore durante il Claim Points."
        );

    } finally {
        processingClaimPoints = false;
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

        /*
         * Salviamo solamente il codice referral.
         */

        try {
            const result =
                await supabaseClient
                    .from("mining_accounts")
                    .update({
                        referral_code:
                            referralCode
                    })
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            if (result.error) {
                console.error(
                    "❌ Referral:",
                    result.error
                );
            }

        } catch (error) {
            console.error(
                "❌ Referral save:",
                error
            );
        }
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
                "📋 Codice copiato!",
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

    /* BALANCE */

    const balanceElement =
        $("balance");

    if (balanceElement) {
        balanceElement.textContent =
            safeNumber(
                balance,
                0
            ).toFixed(2);
    }


    /* LEVEL */

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


    /* HASHRATE */

    hashrate =
        calculateHashrate();

    const hashrateElement =
        $("hashrate");

    if (hashrateElement) {
        hashrateElement.textContent =
            hashrate +
            " GH/s";
    }


    /* PRODUCTION */

    const productionElement =
        $("production");

    if (productionElement) {
        productionElement.textContent =
            getProductionPerMinute()
                .toFixed(2) +
            "/min";
    }


    /* SPEED BONUS */

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


    /* OFFLINE */

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


    /* STATUS */

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


    /* TOGGLE BUTTON */

    const toggleButton =
        $("toggleMiningBtn");

    if (toggleButton) {
        toggleButton.textContent =
            miningActive
                ? "⏹️ Ferma Mining"
                : "▶️ Avvia Mining";
    }


    /* UPGRADE */

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
            referralCode ||
            "—";
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
   MINING LOOP V19
===================================================== */

function startMiningLoop() {

    stopMiningLoop();

    /*
     * NON calcola più BOB localmente.
     *
     * Chiama claim_mining()
     * sul server.
     */

    miningInterval =
        setInterval(
            async function () {

                if (
                    !currentUser ||
                    !miningActive
                ) {
                    return;
                }

                await claimMiningFromServer(
                    false
                );

                updateMiningUI();

            },
            MINING_CLAIM_INTERVAL
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
   AUTOSAVE V19
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

                /*
                 * NON modifichiamo balance.
                 *
                 * Il saldo viene gestito
                 * esclusivamente dal server.
                 */

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
   DAILY BONUS TIMER
===================================================== */

function startBonusTimer() {

    stopBonusTimer();

    bonusTimerInterval =
        setInterval(
            function () {

                if (currentUser) {
                    updateMiningUI();
                }

            },
            BONUS_TIMER_INTERVAL
        );
}


function stopBonusTimer() {

    if (bonusTimerInterval) {

        clearInterval(
            bonusTimerInterval
        );

        bonusTimerInterval =
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

    lastMiningAt =
        null;

    processingMiningClaim =
        false;

    processingDailyBonus =
        false;

    processingUpgrade =
        false;

    processingMinerReward =
        false;

    processingClaimPoints =
        false;

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

    loggingOut = true;

    try {

        /*
         * Prima del logout:
         * accredita il mining maturato.
         */

        if (
            currentUser &&
            miningActive
        ) {

            await claimMiningFromServer(
                false
            );

            miningActive =
                false;

            await saveMiningState(
                false,
                false
            );
        }


        if (supabaseClient) {

            const result =
                await supabaseClient
                    .auth
                    .signOut();

            if (result.error) {

                console.error(
                    "❌ Logout:",
                    result.error
                );

                /*
                 * Se il logout fallisce,
                 * non cambiamo stato locale.
                 */

                alert(
                    "Errore logout:\n\n" +
                    result.error.message
                );

                return;
            }
        }


        currentUser =
            null;

        stopMiningLoop();
        stopAutosave();
        stopBonusTimer();

        resetMiningData();

        showLogin();

        showAuthMessage(
            "Disconnesso.",
            "success"
        );

    } catch (error) {

        console.error(
            "❌ logout:",
            error
        );

        alert(
            "Errore durante il logout."
        );

    } finally {

        loggingOut =
            false;
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
                    email,
                    password
                });

        if (result.error) {

            console.error(
                "❌ Login:",
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
            "❌ login:",
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
                    email,
                    password
                });

        if (result.error) {

            console.error(
                "❌ Registrazione:",
                result.error
            );

            showAuthMessage(
                "Errore: " +
                result.error.message,
                "error"
            );

            return;
        }


        /*
         * Sessione immediata.
         */

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
            "❌ register:",
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
                "❌ Sessione:",
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
            "❌ checkSession:",
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
                "🔐 Auth:",
                event
            );


            if (
                event ===
                "SIGNED_OUT"
            ) {

                currentUser =
                    null;

                resetMiningData();

                showLogin();

                return;
            }


            if (
                event ===
                "SIGNED_IN"
            ) {

                /*
                 * Evita doppio caricamento.
                 */

                if (
                    session &&
                    session.user &&
                    !currentUser
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


    /* ENTER LOGIN */

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
   VISIBILITÀ PAGINA
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

                    /*
                     * Al ritorno nell'app:
                     * server calcola il tempo trascorso.
                     */

                    await claimMiningFromServer(
                        false
                    );

                    updateMiningUI();
                }
            }
        }
    );
}


/* =====================================================
   PAGE HIDDEN
===================================================== */

window.addEventListener(
    "pagehide",
    function () {

        /*
         * NON modifichiamo il saldo.
         *
         * NON modifichiamo last_mining_at.
         *
         * Il server calcolerà il periodo
         * trascorso al prossimo claim.
         */

        stopMiningLoop();
    }
);


/* =====================================================
   INIT APP
===================================================== */

async function initApp() {

    console.log(
        "🚀 BOB Mining V19 Definitive..."
    );


    /* DOM */

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


    /* RESET */

    resetMiningData();

    showLogin();


    /* EVENTI */

    setupEvents();

    setupPageVisibility();

    setupAuthListener();


    /* SUPABASE */

    if (!supabaseClient) {

        showAuthMessage(
            "Supabase non disponibile.",
            "error"
        );

        return;
    }


    /* SESSIONE */

    await checkSession();


    /* BONUS TIMER */

    startBonusTimer();


    console.log(
        "✅ BOB Mining V19 Definitive pronto."
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

    updateMiningUI,

    getProductionPerMinute,

    getUpgradeCost,

    claimMiningFromServer
};


console.log(
    "⛏️ BOB Mining V19 Definitive caricato."
);
