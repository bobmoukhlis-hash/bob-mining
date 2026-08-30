// =====================================================
// BOB MINING - app.js V7
// Supabase + Login + Mining Online + Mining Offline
// =====================================================


// -----------------------------------------------------
// SUPABASE
// -----------------------------------------------------

const SUPABASE_URL =
    "https://fxyqeeznykdtmaoywpmm.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_n6-IZsqob6jeQzL8igv-EA_lSNtURMn";


if (!window.supabase) {

    console.error(
        "❌ Supabase non è stato caricato."
    );

} else {

    console.log(
        "✅ Libreria Supabase caricata."
    );
}


if (!window.supabase) {

    throw new Error(
        "Libreria Supabase non disponibile."
    );
}


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


window.supabaseClient =
    supabaseClient;


// -----------------------------------------------------
// CONFIGURAZIONE
// -----------------------------------------------------

const BASE_PRODUCTION_PER_MINUTE =
    0.10;

const UPGRADE_COST =
    100;

const DEFAULT_OFFLINE_HOURS =
    2;

const AUTOSAVE_INTERVAL =
    30000;

const MINING_TICK_INTERVAL =
    1000;


// -----------------------------------------------------
// VARIABILI
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

let isSaving = false;

let isLoading = false;


// -----------------------------------------------------
// ELEMENTI HTML
// -----------------------------------------------------

let loginBox = null;

let miningBox = null;

let emailInput = null;

let passwordInput = null;


// -----------------------------------------------------
// FUNZIONE $
// -----------------------------------------------------

function $(id) {

    return document.getElementById(id);
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

    window.balance =
        balance;

    updateMiningUI();
}


// -----------------------------------------------------
// MOSTRA LOGIN
// -----------------------------------------------------

function showLogin() {

    if (loginBox) {

        loginBox.style.display =
            "block";
    }


    if (miningBox) {

        miningBox.style.display =
            "none";
    }
}


// -----------------------------------------------------
// MOSTRA MINING
// -----------------------------------------------------

function showMining() {

    if (loginBox) {

        loginBox.style.display =
            "none";
    }


    if (miningBox) {

        miningBox.style.display =
            "block";
    }
}


// -----------------------------------------------------
// MESSAGGIO AUTH
// -----------------------------------------------------

function showAuthMessage(message) {

    const element =
        $("authMessage");


    if (element) {

        element.textContent =
            message;
    }
}


// -----------------------------------------------------
// PRODUZIONE AL MINUTO
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
// AGGIUNGI PRODUZIONE
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


    const earned =
        getProductionPerMinute() *
        minutes;


    if (!Number.isFinite(earned)) {

        return 0;
    }


    balance +=
        earned;


    window.balance =
        balance;


    return earned;
}


// -----------------------------------------------------
// CREAZIONE ACCOUNT MINING
// -----------------------------------------------------

async function createMiningAccount() {

    if (!currentUser) {

        return false;
    }


    const timestamp =
        new Date();


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
            timestamp.toISOString()
    };


    const { data, error } =
        await supabaseClient
            .from("mining_accounts")
            .insert(account)
            .select()
            .single();


    if (error) {

        console.error(
            "❌ Errore creazione account:",
            error
        );


        return false;
    }


    balance =
        Number(data.balance_points ?? 0);

    minerLevel =
        Math.max(
            1,
            Number(data.miner_level ?? 1)
        );

    speedBonus =
        Number(data.speed_bonus ?? 0);

    offlineHours =
        Math.max(
            0,
            Number(
                data.offline_hours ??
                DEFAULT_OFFLINE_HOURS
            )
        );

    miningActive =
        Boolean(data.mining_active);

    lastMiningAt =
        new Date(
            data.last_mining_at
        );


    window.balance =
        balance;


    lastTick =
        Date.now();


    updateMiningUI();


    console.log(
        "✅ Account mining creato."
    );


    return true;
}


// -----------------------------------------------------
// CARICAMENTO ACCOUNT
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
                "❌ Errore caricamento:",
                error
            );


            alert(
                "Errore caricamento mining:\n" +
                error.message
            );


            return false;
        }


        if (!data) {

            return await createMiningAccount();
        }


        balance =
            Number(
                data.balance_points ?? 0
            );


        minerLevel =
            Math.max(
                1,
                Number(
                    data.miner_level ?? 1
                )
            );


        speedBonus =
            Number(
                data.speed_bonus ?? 0
            );


        offlineHours =
            Math.max(
                0,
                Number(
                    data.offline_hours ??
                    DEFAULT_OFFLINE_HOURS
                )
            );


        miningActive =
            Boolean(
                data.mining_active
            );


        lastMiningAt =
            data.last_mining_at
                ? new Date(
                    data.last_mining_at
                )
                : new Date();


        if (
            Number.isNaN(
                lastMiningAt.getTime()
            )
        ) {

            lastMiningAt =
                new Date();
        }


        window.balance =
            balance;


        lastTick =
            Date.now();


        console.log(
            "✅ Account caricato:",
            {
                balance,
                minerLevel,
                miningActive,
                lastMiningAt
            }
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
            "❌ Errore caricamento account:",
            error
        );


        return false;

    } finally {

        isLoading =
            false;
    }
}


// -----------------------------------------------------
// SALVATAGGIO ACCOUNT
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
                Boolean(miningActive)
        };


        if (updateTimestamp) {

            const timestamp =
                new Date();


            updateData.last_mining_at =
                timestamp.toISOString();
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
        }


        window.balance =
            balance;


        return true;

    } catch (error) {

        console.error(
            "❌ Errore salvataggio:",
            error
        );


        return false;

    } finally {

        isSaving =
            false;
    }
}


// -----------------------------------------------------
// PRODUZIONE OFFLINE
// -----------------------------------------------------

async function calculateOfflineMining() {

    if (!currentUser) {

        return 0;
    }


    if (!miningActive) {

        return 0;
    }


    if (!lastMiningAt) {

        lastMiningAt =
            new Date();


        return 0;
    }


    const now =
        new Date();


    const lastTimestamp =
        lastMiningAt.getTime();


    if (
        Number.isNaN(lastTimestamp)
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
                lastTimestamp
            ) / 60000
        );


    if (elapsedMinutes <= 0) {

        return 0;
    }


    const maxOfflineMinutes =
        Math.max(
            0,
            Number(offlineHours) * 60
        );


    if (maxOfflineMinutes <= 0) {

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
            maxOfflineMinutes
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


    updateMiningUI();


    console.log(
        "⛏️ Mining offline:",
        creditedMinutes.toFixed(2),
        "minuti | +",
        earned.toFixed(4),
        "Points"
    );


    return earned;
}


// -----------------------------------------------------
// AGGIORNA UI
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


        const elapsedMinutes =
            lastMiningAt
                ? (
                    now.getTime() -
                    lastMiningAt.getTime()
                ) / 60000
                : 0;


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


            alert(
                "❌ Impossibile salvare."
            );

            return;
        }

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


            alert(
                "❌ Impossibile avviare il mining."
            );

            return;
        }
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


    alert(
        "🎁 BOB Points salvati:\n" +
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

        await saveMiningAccount(
            true
        );
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


    currentUser =
        null;


    resetMiningData();

    showLogin();


    showAuthMessage(
        "Disconnesso."
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
            error.message
        );


        alert(
            "❌ Accesso non riuscito:\n\n" +
            error.message
        );

        return;
    }


    currentUser =
        data.user;


    const loaded =
        await loadMiningAccount();


    if (!loaded) {

        return;
    }


    showMining();


    showAuthMessage(
        "Accesso effettuato."
    );


    alert(
        "✅ Accesso effettuato!"
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


    if (password.length < 6) {

        alert(
            "La password deve avere almeno 6 caratteri."
        );

        return;
    }


    showAuthMessage(
        "Registrazione in corso..."
    );


    const { data, error } =
        await supabaseClient.auth.signUp({

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
            error.message
        );


        alert(
            "❌ Errore registrazione:\n" +
            error.message
        );

        return;
    }


    console.log(
        "✅ Registrazione:",
        data
    );


    showAuthMessage(
        "Registrazione completata."
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

    const { data, error } =
        await supabaseClient.auth
            .getSession();


    if (error) {

        console.error(
            "❌ Errore sessione:",
            error
        );


        resetMiningData();

        showLogin();

        return false;
    }


    currentUser =
        data.session?.user || null;


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
// EVENTO AUTH
// -----------------------------------------------------

supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        currentUser =
            session?.user || null;


        console.log(
            "Auth event:",
            event
        );


        if (!currentUser) {

            resetMiningData();

            showLogin();
        }
    }
);


// -----------------------------------------------------
// MINING REALTIME
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


        const elapsedMinutes =
            (
                now -
                lastTick
            ) / 60000;


        lastTick =
            now;


        addMiningProduction(
            elapsedMinutes
        );


        updateMiningUI();

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
    () => {

        if (
            document.visibilityState ===
            "hidden"
        ) {

            lastTick =
                Date.now();
        }
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


        await checkSession();
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

window.balance =
    balance;

console.log(
    "✅ BOB Mining V7 pronto."
);
