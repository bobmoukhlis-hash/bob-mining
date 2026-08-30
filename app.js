```javascript
// =====================================================
// BOB MINING - app.js V12
// Supabase + Autenticazione + Mining
// Online + Offline + Claim + Upgrade + Rewards
// Referral + Autosave
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

window.supabaseClient =
    supabaseClient;

console.log("✅ Supabase collegato");
console.log("🚀 BOB Mining V12 caricato");


// -----------------------------------------------------
// CONFIGURAZIONE
// -----------------------------------------------------

const BASE_PRODUCTION_PER_MINUTE =
    0.10;

const BASE_HASHRATE =
    10;

const BASE_OFFLINE_HOURS =
    2;

const BASE_MINING_SPEED =
    0;

const MINER_UPGRADE_BASE_COST =
    100;

const HASHRATE_UPGRADE_BASE_COST =
    100;

const SPEED_UPGRADE_BASE_COST =
    150;

const OFFLINE_UPGRADE_BASE_COST =
    200;

const DAILY_BONUS_AMOUNT =
    1;

const REFERRAL_BONUS_AMOUNT =
    5;

const MINING_TICK_INTERVAL =
    1000;

const AUTOSAVE_INTERVAL =
    30000;


// -----------------------------------------------------
// STATO
// -----------------------------------------------------

let currentUser =
    null;

let balance =
    0;

let minerLevel =
    1;

let speedBonus =
    0;

let offlineHours =
    BASE_OFFLINE_HOURS;

let hashrate =
    BASE_HASHRATE;

let miningSpeed =
    BASE_MINING_SPEED;

let dailyBonus =
    0;

let referralCode =
    "";

let referralCount =
    0;

let miningActive =
    false;

let lastMiningAt =
    null;

let lastTick =
    Date.now();

let isLoading =
    false;

let isSaving =
    false;

let domReady =
    false;

let offlineProcessing =
    false;

let dailyBonusClaimed =
    false;


// -----------------------------------------------------
// ELEMENTI HTML
// -----------------------------------------------------

let loginBox =
    null;

let miningBox =
    null;

let emailInput =
    null;

let passwordInput =
    null;


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

    balance =
        0;

    minerLevel =
        1;

    speedBonus =
        0;

    offlineHours =
        BASE_OFFLINE_HOURS;

    hashrate =
        BASE_HASHRATE;

    miningSpeed =
        BASE_MINING_SPEED;

    dailyBonus =
        0;

    referralCode =
        "";

    referralCount =
        0;

    miningActive =
        false;

    lastMiningAt =
        null;

    dailyBonusClaimed =
        false;

    lastTick =
        Date.now();

    offlineProcessing =
        false;

    window.balance =
        balance;

    updateMiningUI();
}


// -----------------------------------------------------
// MOSTRA LOGIN
// -----------------------------------------------------

function showLogin() {

    if (loginBox) {

        loginBox.classList.remove(
            "hidden"
        );

        loginBox.style.display =
            "";
    }

    if (miningBox) {

        miningBox.classList.add(
            "hidden"
        );

        miningBox.style.display =
            "";
    }
}


// -----------------------------------------------------
// MOSTRA MINING
// -----------------------------------------------------

function showMining() {

    if (loginBox) {

        loginBox.classList.add(
            "hidden"
        );

        loginBox.style.display =
            "";
    }

    if (miningBox) {

        miningBox.classList.remove(
            "hidden"
        );

        miningBox.style.display =
            "";
    }

    updateMiningUI();
}


// -----------------------------------------------------
// COSTI UPGRADE
// -----------------------------------------------------

function getMinerUpgradeCost() {

    return Math.round(
        MINER_UPGRADE_BASE_COST *
        Math.pow(
            1.5,
            Math.max(
                0,
                minerLevel - 1
            )
        )
    );
}


function getHashrateUpgradeCost() {

    const upgradeLevel =
        Math.max(
            0,
            Math.round(
                (hashrate - BASE_HASHRATE) /
                BASE_HASHRATE
            )
        );

    return Math.round(
        HASHRATE_UPGRADE_BASE_COST *
        Math.pow(
            1.5,
            upgradeLevel
        )
    );
}


function getSpeedUpgradeCost() {

    const upgradeLevel =
        Math.max(
            0,
            Math.round(
                miningSpeed / 10
            )
        );

    return Math.round(
        SPEED_UPGRADE_BASE_COST *
        Math.pow(
            1.5,
            upgradeLevel
        )
    );
}


function getOfflineUpgradeCost() {

    const upgradeLevel =
        Math.max(
            0,
            Math.round(
                (offlineHours - BASE_OFFLINE_HOURS) /
                BASE_OFFLINE_HOURS
            )
        );

    return Math.round(
        OFFLINE_UPGRADE_BASE_COST *
        Math.pow(
            1.5,
            upgradeLevel
        )
    );
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

    const speed =
        Number(miningSpeed) || 0;

    return (
        BASE_PRODUCTION_PER_MINUTE *
        level *
        (1 + bonus / 100) *
        (1 + speed / 100)
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
        production *
        minutes;

    if (
        !Number.isFinite(earned) ||
        earned <= 0
    ) {
        return 0;
    }

    balance +=
        earned;

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
                BASE_OFFLINE_HOURS
            )
        );

    if (
        !Number.isFinite(offlineHours)
    ) {
        offlineHours =
            BASE_OFFLINE_HOURS;
    }


    hashrate =
        Math.max(
            BASE_HASHRATE,
            Number(
                data?.hashrate ??
                BASE_HASHRATE
            )
        );

    if (
        !Number.isFinite(hashrate)
    ) {
        hashrate =
            BASE_HASHRATE;
    }


    miningSpeed =
        Math.max(
            0,
            Number(
                data?.mining_speed ??
                BASE_MINING_SPEED
            )
        );

    if (
        !Number.isFinite(miningSpeed)
    ) {
        miningSpeed =
            BASE_MINING_SPEED;
    }


    dailyBonus =
        Number(
            data?.daily_bonus ?? 0
        );

    if (
        !Number.isFinite(dailyBonus)
    ) {
        dailyBonus = 0;
    }


    referralCode =
        String(
            data?.referral_code ?? ""
        );


    referralCount =
        Math.max(
            0,
            Number(
                data?.referral_count ?? 0
            )
        );

    if (
        !Number.isFinite(referralCount)
    ) {
        referralCount = 0;
    }


    miningActive =
        data?.mining_active === true;


    if (
        data?.last_mining_at
    ) {

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
// CREA CODICE REFERRAL
// -----------------------------------------------------

function generateReferralCode() {

    if (!currentUser) {
        return "";
    }

    const id =
        String(
            currentUser.id
        ).replace(
            /-/g,
            ""
        );

    return (
        "BOB-" +
        id.substring(
            0,
            8
        ).toUpperCase()
    );
}


// -----------------------------------------------------
// CREA ACCOUNT
// -----------------------------------------------------

async function createMiningAccount() {

    if (!currentUser) {
        return false;
    }

    const now =
        new Date().toISOString();

    const newReferralCode =
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
            BASE_OFFLINE_HOURS,

        mining_active:
            true,

        last_mining_at:
            now,

        hashrate:
            BASE_HASHRATE,

        mining_speed:
            BASE_MINING_SPEED,

        daily_bonus:
            0,

        referral_code:
            newReferralCode,

        referral_count:
            0
    };


    const { data, error } =
        await supabaseClient
            .from(
                "mining_accounts"
            )
            .insert(
                account
            )
            .select(
                "balance_points, miner_level, speed_bonus, offline_hours, mining_active, last_mining_at, hashrate, mining_speed, daily_bonus, referral_code, referral_count"
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


    applyMiningAccount(
        data
    );

    console.log(
        "✅ Account mining creato."
    );

    return true;
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

    isLoading =
        true;

    try {

        const { data, error } =
            await supabaseClient
                .from(
                    "mining_accounts"
                )
                .select(
                    "balance_points, miner_level, speed_bonus, offline_hours, mining_active, last_mining_at, hashrate, mining_speed, daily_bonus, referral_code, referral_count"
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


        applyMiningAccount(
            data
        );


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

        isLoading =
            false;
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

    isSaving =
        true;

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
                Boolean(miningActive),

            hashrate:
                Number(hashrate),

            mining_speed:
                Number(miningSpeed),

            daily_bonus:
                Number(dailyBonus),

            referral_code:
                referralCode || generateReferralCode(),

            referral_count:
                Number(referralCount)
        };


        if (
            updateTimestamp
        ) {

            updateData.last_mining_at =
                new Date().toISOString();
        }


        const { error } =
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


        if (error) {

            console.error(
                "❌ Errore salvataggio:",
                error
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
            "❌ Errore saveMiningAccount:",
            error
        );

        return false;


    } finally {

        isSaving =
            false;
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


    offlineProcessing =
        true;

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
                Number(offlineHours) *
                60
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


        if (
            earned > 0
        ) {

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

        offlineProcessing =
            false;
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


    const today =
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );


    const storageKey =
        "bob_daily_bonus_" +
        currentUser.id;


    const lastClaim =
        localStorage.getItem(
            storageKey
        );


    if (
        lastClaim === today
    ) {

        alert(
            "🎁 Bonus giornaliero già ricevuto oggi."
        );

        return;
    }


    balance +=
        DAILY_BONUS_AMOUNT;

    dailyBonus +=
        DAILY_BONUS_AMOUNT;


    const saved =
        await saveMiningAccount(
            false
        );


    if (!saved) {

        balance -=
            DAILY_BONUS_AMOUNT;

        dailyBonus -=
            DAILY_BONUS_AMOUNT;

        alert(
            "❌ Impossibile salvare il bonus."
        );

        return;
    }


    localStorage.setItem(
        storageKey,
        today
    );


    dailyBonusClaimed =
        true;


    updateMiningUI();


    showMiningMessage(
        "🎁 Bonus giornaliero +"
        + DAILY_BONUS_AMOUNT
        + " BOB Points",
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
        getMinerUpgradeCost();


    if (
        balance <
        cost
    ) {

        alert(
            "❌ Servono " +
            cost +
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
        "⬆️ Miner aggiornato a livello " +
        minerLevel,
        "success"
    );


    alert(
        "⬆️ Upgrade completato!\n\n" +
        "Livello: " +
        minerLevel
    );
}


// -----------------------------------------------------
// UPGRADE HASHRATE
// -----------------------------------------------------

async function upgradeHashrate() {

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
        getHashrateUpgradeCost();


    if (
        balance <
        cost
    ) {

        alert(
            "❌ Servono " +
            cost +
            " BOB Points."
        );

        return;
    }


    const oldBalance =
        balance;

    const oldHashrate =
        hashrate;


    balance -=
        cost;

    hashrate +=
        BASE_HASHRATE;


    updateMiningUI();


    const saved =
        await saveMiningAccount(
            false
        );


    if (!saved) {

        balance =
            oldBalance;

        hashrate =
            oldHashrate;

        updateMiningUI();

        alert(
            "❌ Errore salvataggio Hashrate."
        );

        return;
    }


    showMiningMessage(
        "⚡ Hashrate aumentato a " +
        hashrate +
        " GH/s",
        "success"
    );
}


// -----------------------------------------------------
// UPGRADE SPEED
// -----------------------------------------------------

async function upgradeMiningSpeed() {

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
        getSpeedUpgradeCost();


    if (
        balance <
        cost
    ) {

        alert(
            "❌ Servono " +
            cost +
            " BOB Points."
        );

        return;
    }


    const oldBalance =
        balance;

    const oldSpeed =
        miningSpeed;


    balance -=
        cost;

    miningSpeed +=
        10;


    updateMiningUI();


    const saved =
        await saveMiningAccount(
            false
        );


    if (!saved) {

        balance =
            oldBalance;

        miningSpeed =
            oldSpeed;

        updateMiningUI();

        alert(
            "❌ Errore salvataggio Speed."
        );

        return;
    }


    showMiningMessage(
        "🚀 Mining Speed +" +
        miningSpeed +
        "%",
        "success"
    );
}


// -----------------------------------------------------
// UPGRADE OFFLINE
// -----------------------------------------------------

async function upgradeOfflineMining() {

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
        getOfflineUpgradeCost();


    if (
        balance <
        cost
    ) {

        alert(
            "❌ Servono " +
            cost +
            " BOB Points."
        );

        return;
    }


    const oldBalance =
        balance;

    const oldHours =
        offlineHours;


    balance -=
        cost;

    offlineHours +=
        BASE_OFFLINE_HOURS;


    updateMiningUI();


    const saved =
        await saveMiningAccount(
            false
        );


    if (!saved) {

        balance =
            oldBalance;

        offlineHours =
            oldHours;

        updateMiningUI();

        alert(
            "❌ Errore salvataggio Offline Mining."
        );

        return;
    }


    showMiningMessage(
        "💾 Mining offline: " +
        offlineHours +
        " ore",
        "success"
    );
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
                    Math.min(
                        elapsedMinutes,
                        offlineHours * 60
                    )
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
// LOGOUT
// -----------------------------------------------------

async function logout() {

    if (currentUser) {

        await saveMiningAccount(
            true
        );
    }


    const { error } =
        await supabaseClient
            .auth
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


    if (
        !email ||
        !password
    ) {

        alert(
            "Inserisci email e password."
        );

        return;
    }


    showAuthMessage(
        "Accesso in corso..."
    );


    const { data, error } =
        await supabaseClient
            .auth
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


    if (
        !email ||
        !password
    ) {

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
        await supabaseClient
            .auth
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
}


// -----------------------------------------------------
// SESSIONE
// -----------------------------------------------------

async function checkSession() {

    if (!domReady) {
        return false;
    }


    const { data, error } =
        await supabaseClient
            .auth
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
// CAMBIO SESSIONE
// -----------------------------------------------------

supabaseClient.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

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
                            Math.min(
                                elapsedMinutes,
                                offlineHours * 60
                            )
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
            Number(hashrate).toFixed(0) +
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
            getMinerUpgradeCost() +
            " BOB";
    }


    const hashUpgradeButton =
        $("upgradeHashrateBtn");

    if (hashUpgradeButton) {

        hashUpgradeButton.textContent =
            "⚡ Upgrade Hashrate — " +
            getHashrateUpgradeCost() +
            " Points";
    }


    const speedUpgradeButton =
        $("upgradeSpeedBtn");

    if (speedUpgradeButton) {

        speedUpgradeButton.textContent =
            "🚀 Upgrade Speed — " +
            getSpeedUpgradeCost() +
            " Points";
    }


    const offlineUpgradeButton =
        $("upgradeOfflineBtn");

    if (offlineUpgradeButton) {

        offlineUpgradeButton.textContent =
            "💾 Upgrade Offline — " +
            getOfflineUpgradeCost() +
            " Points";
    }


    const miningSpeedElement =
        $("miningSpeed");

    if (miningSpeedElement) {

        miningSpeedElement.textContent =
            "+" +
            Number(miningSpeed).toFixed(0) +
            "%";
    }


    const offlineHoursElement =
        $("offlineHours");

    if (offlineHoursElement) {

        offlineHoursElement.textContent =
            Number(offlineHours).toFixed(0) +
            " h";
    }


    const referralCodeElement =
        $("referralCode");

    if (referralCodeElement) {

        referralCodeElement.textContent =
            referralCode ||
            generateReferralCode();
    }


    const referralCountElement =
        $("referralCount");

    if (referralCountElement) {

        referralCountElement.textContent =
            Number(referralCount);
    }


    const dailyBonusElement =
        $("dailyBonus");

    if (dailyBonusElement) {

        dailyBonusElement.textContent =
            Number(dailyBonus).toFixed(2);
    }
}


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


        const signupBtn =
            $("signupBtn");


        if (signupBtn) {

            signupBtn.addEventListener(
                "click",
                register
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


        const upgradeHashrateBtn =
            $("upgradeHashrateBtn");


        if (upgradeHashrateBtn) {

            upgradeHashrateBtn.addEventListener(
                "click",
                upgradeHashrate
            );
        }


        const upgradeSpeedBtn =
            $("upgradeSpeedBtn");


        if (upgradeSpeedBtn) {

            upgradeSpeedBtn.addEventListener(
                "click",
                upgradeMiningSpeed
            );
        }


        const upgradeOfflineBtn =
            $("upgradeOfflineBtn");


        if (upgradeOfflineBtn) {

            upgradeOfflineBtn.addEventListener(
                "click",
                upgradeOfflineMining
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


        showLogin();

        updateMiningUI();

        await checkSession();


        console.log(
            "🚀 BOB Mining V12 pronto."
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

window.claimDailyBonus =
    claimDailyBonus;

window.upgradeMiner =
    upgradeMiner;

window.upgradeHashrate =
    upgradeHashrate;

window.upgradeMiningSpeed =
    upgradeMiningSpeed;

window.upgradeOfflineMining =
    upgradeOfflineMining;

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
    "✅ BOB Mining V12 inizializzazione completata."
);
```
