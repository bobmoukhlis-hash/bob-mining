"use strict";

/* =====================================================
   BOB MINING V15
   Compatibile con index.html V14

   Supabase + Login + Registrazione
   Mining online
   Mining offline
   Upgrade Miner
   Daily Bonus 24h
   Reward Miner
   Referral
   Logout sicuro
   Autosave
   Protezione doppio accredito
   ===================================================== */

console.log("BOB Mining V15 app.js caricato.");


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
   HELPER
   ===================================================== */

function $(id) {

    return document.getElementById(id);
}


function safeNumber(value, fallback = 0) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return number;
}


function safeInteger(
    value,
    fallback = 0
) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return Math.floor(number);
}


function showMessage(
    elementId,
    message,
    type = ""
) {

    const element =
        $(elementId);

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
   UPGRADE
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
   PRODUZIONE MINING
   ===================================================== */

function addMiningProduction(
    minutes
) {

    if (!miningActive) {
        return 0;
    }

    const safeMinutes =
        safeNumber(
            minutes,
            0
        );

    if (
        safeMinutes <= 0
    ) {
        return 0;
    }

    /*
     * Limite di sicurezza.
     * Evita accrediti enormi causati da
     * timestamp corrotti o manipolati.
     */

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

    balance +=
        earned;

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

function applyMiningAccount(
    data
) {

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


    if (
        account.last_mining_at
    ) {

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


    loadingAccount =
        true;


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
         * Se il mining era attivo,
         * calcoliamo il periodo trascorso.
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

        loadingAccount =
            false;
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


    savingAccount =
        true;


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


        if (
            updateTimestamp
        ) {

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


        if (
            updateTimestamp
        ) {

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

        savingAccount =
            false;
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


    /*
     * Il mining offline è limitato
     * al numero di ore configurato.
     */

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
     * IMPORTANTISSIMO:
     * aggiorniamo SEMPRE il timestamp.
     * In questo modo lo stesso intervallo
     * non viene conteggiato nuovamente.
     */

    lastMiningAt =
        now;


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


    processingOffline =
        true;


    try {

        const earned =
            creditElapsedMining();


        /*
         * Salviamo subito saldo + timestamp.
         */

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

        processingOffline =
            false;
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


    if (
        processingDailyBonus
    ) {
        return;
    }


    if (
        !getDailyBonusAvailable()
    ) {

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


    processingDailyBonus =
        true;


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

        processingDailyBonus =
            false;
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


    if (
        minerLevel < 2
    ) {

        alert(
            "Reward disponibile dal Livello 2."
        );

        return;
    }


    if (
        processingClaim
    ) {
        return;
    }


    processingClaim =
        true;


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

        processingClaim =
            false;
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


    if (
        processingUpgrade
    ) {
        return;
    }


    const cost =
        getUpgradeCost();


    if (
        balance < cost
    ) {

        alert(
            "Servono " +
            cost.toFixed(2) +
            " BOB Points."
        );

        return;
    }


    processingUpgrade =
        true;


    const oldBalance =
        balance;

    const oldLevel =
        minerLevel;


    try {

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

    } catch (error) {

        console.error(
            "upgradeMiner:",
            error
        );

        balance =
            oldBalance;

        minerLevel =
            oldLevel;

        hashrate =
            calculateHashrate();

        updateMiningUI();

        alert(
            "Errore durante l'upgrade."
        );

    } finally {

        processingUpgrade =
            false;
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
         * Accredita il tempo fino al momento
         * in cui l'utente ferma il mining.
         */

        creditElapsedMining();


        miningActive =
            false;


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

        /*
         * Avvia un nuovo intervallo.
         */

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


    if (
        processingClaim
    ) {
        return;
    }


    processingClaim =
        true;


    try {

        /*
         * Prima del salvataggio accreditiamo
         * il tempo trascorso.
         */

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

        processingClaim =
            false;
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
}


/* =====================================================
   RESET
   ===================================================== */

function resetMiningData() {

    balance =
        0;

    minerLevel =
        1;

    speedBonus =
        0;

    offlineHours =
        DEFAULT_OFFLINE_HOURS;

    miningActive =
        false;

    hashrate =
        BASE_HASHRATE;

    miningSpeed =
        0;

    dailyBonus =
        0;

    dailyBonusClaimedAt =
        null;

    referralCode =
        "";

    referralCount =
        0;

    lastMiningAt =
        null;

    lastTick =
        Date.now();

    processingOffline =
        false;

    processingDailyBonus =
        false;

    processingUpgrade =
        false;

    processingClaim =
        false;

    window.balance =
        0;

    updateMiningUI();
}


/* =====================================================
   LOGOUT
   ===================================================== */

async function logout() {

    if (
        loggingOut
    ) {
        return;
    }


    if (!supabaseClient) {

        showLogin();

        return;
    }


    loggingOut =
        true;


    try {

        /*
         * Salviamo prima l'ultimo periodo
         * di mining.
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
        function(
            event,
            session
        ) {

            console.log(
                "Auth event:",
                event
            );


            if (loggingOut) {
                return;
            }


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


/* =====================================================
   MINING ONLINE
   ===================================================== */

setInterval(
    function() {

        const now =
            Date.now();


        if (
            !currentUser ||
            !miningActive ||
            loggingOut
        ) {

            lastTick =
                now;

            return;
        }


        /*
         * Quando la pagina è nascosta,
         * non facciamo mining dal timer.
         * Il tempo sarà calcolato al ritorno.
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
            elapsedMinutes <= 0
        ) {
            return;
        }


        const earned =
            addMiningProduction(
                elapsedMinutes
            );


        if (earned > 0) {

            lastMiningAt =
                new Date();
        }


        updateMiningUI();

    },
    MINING_TICK_INTERVAL
);


/* =====================================================
   AUTOSAVE
   ===================================================== */

setInterval(
    async function() {

        if (
            !currentUser ||
            !supabaseClient ||
            loggingOut
        ) {
            return;
        }


        if (
            miningActive &&
            document.visibilityState ===
            "visible"
        ) {

            const now =
                Date.now();


            const elapsedMinutes =
                Math.max(
                    0,
                    (
                        now -
                        lastTick
                    ) / 60000
                );


            if (
                elapsedMinutes > 0
            ) {

                const earned =
                    addMiningProduction(
                        elapsedMinutes
                    );

                if (earned > 0) {

                    lastMiningAt =
                        new Date();
                }


                lastTick =
                    now;
            }
        }


        await saveMiningAccount(
            false
        );

    },
    AUTOSAVE_INTERVAL
);


/* =====================================================
   VISIBILITY
   ===================================================== */

document.addEventListener(
    "visibilitychange",
    async function() {

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

            return;
        }


        /*
         * Prima di andare in background
         * accreditiamo il tempo già trascorso.
         */

        if (
            currentUser &&
            miningActive
        ) {

            creditElapsedMining();

            await saveMiningAccount(
                false
            );
        }


        lastTick =
            Date.now();
    }
);


/* =====================================================
   DOM READY
   ===================================================== */

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


        /* =================================================
           PASSWORD
           ================================================= */

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


                    togglePassword.setAttribute(
                        "aria-label",
                        visible
                            ? "Mostra password"
                            : "Nascondi password"
                    );
                }
            );
        }


        /* =================================================
           LOGIN
           ================================================= */

        const loginBtn =
            $("loginBtn");


        if (loginBtn) {

            loginBtn.addEventListener(
                "click",
                login
            );
        }


        /* =================================================
           REGISTRAZIONE
           ================================================= */

        const signupBtn =
            $("signupBtn");


        if (signupBtn) {

            signupBtn.addEventListener(
                "click",
                register
            );
        }


        /* =================================================
           LOGOUT
           ================================================= */

        const logoutBtn =
            $("logoutBtn");


        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                logout
            );
        }


        /* =================================================
           MINING
           ================================================= */

        const toggleMiningBtn =
            $("toggleMiningBtn");


        if (toggleMiningBtn) {

            toggleMiningBtn.addEventListener(
                "click",
                toggleMining
            );
        }


        /* =================================================
           CLAIM POINTS
           ================================================= */

        const claimBtn =
            $("claimBtn");


        if (claimBtn) {

            claimBtn.addEventListener(
                "click",
                claimPoints
            );
        }


        /* =================================================
           UPGRADE
           ================================================= */

        const upgradeBtn =
            $("upgradeBtn");


        if (upgradeBtn) {

            upgradeBtn.addEventListener(
                "click",
                upgradeMiner
            );
        }


        /* =================================================
           DAILY BONUS
           ================================================= */

        const dailyBonusBtn =
            $("dailyBonusBtn");


        if (dailyBonusBtn) {

            dailyBonusBtn.addEventListener(
                "click",
                claimDailyBonus
            );
        }


        /* =================================================
           MINER REWARD
           ================================================= */

        const minerRewardBtn =
            $("minerRewardBtn");


        if (minerRewardBtn) {

            minerRewardBtn.addEventListener(
                "click",
                claimMinerReward
            );
        }


        /* =================================================
           REFERRAL
           ================================================= */

        const copyReferralBtn =
            $("copyReferralBtn");


        if (copyReferralBtn) {

            copyReferralBtn.addEventListener(
                "click",
                copyReferralCode
            );
        }


        /* =================================================
           ENTER LOGIN
           ================================================= */

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


        /* =================================================
           STATO INIZIALE
           ================================================= */

        showLogin();

        updateMiningUI();


        /* =================================================
           AUTH LISTENER
           ================================================= */

        setupAuthListener();


        /* =================================================
           SESSIONE
           ================================================= */

        await checkSession();


        console.log(
            "BOB Mining V15 inizializzazione completata."
        );
    }
);


/* =====================================================
   FUNZIONI GLOBALI
   ===================================================== */

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
    "BOB Mining V15 app.js caricato correttamente."
);
