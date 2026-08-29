// =====================================================
// BOB MINING - app.js V6
// Supabase + Login + Password + Mining Offline
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
        "❌ BOB Mining: libreria Supabase non caricata."
    );

} else {

    console.log(
        "✅ BOB Mining: libreria Supabase caricata."
    );
}


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// Permette di controllare Supabase dalla Console
window.supabaseClient =
    supabaseClient;


console.log(
    "✅ BOB Mining: app.js caricato."
);


// -----------------------------------------------------
// VARIABILI
// -----------------------------------------------------

let currentUser = null;

let balance = 0;

let minerLevel = 1;

let speedBonus = 0;

let offlineHours = 2;

let miningActive = true;

let lastMiningAt = null;


// -----------------------------------------------------
// PRODUZIONE BASE
// -----------------------------------------------------

const BASE_PRODUCTION_PER_MINUTE =
    0.10;


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
// MESSAGGIO AUTENTICAZIONE
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


    console.log(
        "⏳ Registrazione:",
        email
    );


    const { data, error } =
        await supabaseClient.auth.signUp({

            email:
                email,

            password:
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
            "Errore registrazione:\n" +
            error.message
        );

        return;
    }


    console.log(
        "✅ Registrazione completata:",
        data
    );


    showAuthMessage(
        "Registrazione completata. Controlla la tua email."
    );


    alert(
        "✅ Registrazione completata!\n\n" +
        "Controlla la tua email e conferma l'account."
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


    console.log(
        "⏳ Tentativo accesso:",
        email
    );


    const { data, error } =
        await supabaseClient.auth
            .signInWithPassword({

                email:
                    email,

                password:
                    password
            });


    if (error) {

        console.error(
            "❌ Errore login:",
            error
        );


        showAuthMessage(
            "Errore accesso: " +
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


    console.log(
        "✅ Login riuscito:",
        currentUser.id
    );


    await loadMiningAccount();


    showMining();


    showAuthMessage(
        "Accesso effettuato."
    );


    alert(
        "✅ Accesso effettuato!"
    );
}


// -----------------------------------------------------
// LOGOUT
// -----------------------------------------------------

async function logout() {

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


    balance =
        0;


    miningActive =
        false;


    updateMiningUI();


    showLogin();


    console.log(
        "✅ Logout effettuato."
    );
}


// -----------------------------------------------------
// CONTROLLO SESSIONE
// -----------------------------------------------------

async function checkSession() {

    console.log(
        "🔎 Controllo sessione..."
    );


    const { data, error } =
        await supabaseClient.auth
            .getSession();


    if (error) {

        console.error(
            "❌ Errore sessione:",
            error
        );


        showLogin();

        return;
    }


    currentUser =
        data.session?.user || null;


    if (!currentUser) {

        console.log(
            "ℹ️ Nessuna sessione."
        );


        showLogin();

        return;
    }


    console.log(
        "✅ Sessione trovata:",
        currentUser.id
    );


    await loadMiningAccount();


    showMining();
}


// -----------------------------------------------------
// CAMBIO SESSIONE
// -----------------------------------------------------

supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "Auth event:",
            event
        );


        currentUser =
            session?.user || null;


        if (!currentUser) {

            showLogin();
        }
    }
);


// -----------------------------------------------------
// CARICA ACCOUNT MINING
// -----------------------------------------------------

async function loadMiningAccount() {

    if (!currentUser) {

        console.log(
            "ℹ️ Nessun utente autenticato."
        );

        return;
    }


    console.log(
        "⛏️ Caricamento account mining..."
    );


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
            "❌ Errore caricamento mining:",
            error
        );


        alert(
            "Errore caricamento mining:\n" +
            error.message
        );

        return;
    }


    if (!data) {

        console.log(
            "ℹ️ Account mining non trovato."
        );


        balance =
            0;

        minerLevel =
            1;

        speedBonus =
            0;

        offlineHours =
            2;

        miningActive =
            true;

        lastMiningAt =
            new Date();


        updateMiningUI();

        return;
    }


    balance =
        Number(
            data.balance_points || 0
        );


    minerLevel =
        Number(
            data.miner_level || 1
        );


    speedBonus =
        Number(
            data.speed_bonus || 0
        );


    offlineHours =
        Number(
            data.offline_hours || 2
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


    window.balance =
        balance;


    console.log(
        "✅ Account mining caricato:",
        {
            balance,
            minerLevel,
            speedBonus,
            offlineHours,
            miningActive,
            lastMiningAt
        }
    );


    if (miningActive) {

        await calculateOfflineMining();
    }


    updateMiningUI();
}


// -----------------------------------------------------
// SALVA ACCOUNT MINING
// -----------------------------------------------------

async function saveMiningAccount(
    updateTimestamp = false
) {

    if (!currentUser) {

        return false;
    }


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


    if (updateTimestamp) {

        lastMiningAt =
            new Date();
    }


    window.balance =
        balance;


    console.log(
        "💾 Mining salvato:",
        balance.toFixed(4)
    );


    return true;
}


// -----------------------------------------------------
// PRODUZIONE AL MINUTO
// -----------------------------------------------------

function getProductionPerMinute() {

    const bonus =
        1 +
        (
            speedBonus /
            100
        );


    return (
        BASE_PRODUCTION_PER_MINUTE *
        minerLevel *
        bonus
    );
}


// -----------------------------------------------------
// AGGIUNGI PRODUZIONE
// -----------------------------------------------------

function addMiningProduction(
    minutes
) {

    if (!miningActive) {

        return 0;
    }


    if (!Number.isFinite(minutes)) {

        return 0;
    }


    if (minutes <= 0) {

        return 0;
    }


    const earned =
        getProductionPerMinute() *
        minutes;


    balance +=
        earned;


    window.balance =
        balance;


    return earned;
}


// -----------------------------------------------------
// MINING OFFLINE
// -----------------------------------------------------

async function calculateOfflineMining() {

    if (!miningActive) {

        return 0;
    }


    if (!lastMiningAt) {

        return 0;
    }


    const now =
        new Date();


    const elapsedMinutes =
        (
            now.getTime() -
            lastMiningAt.getTime()
        ) / 60000;


    if (elapsedMinutes <= 0) {

        return 0;
    }


    const maxOfflineMinutes =
        Math.max(
            0,
            offlineHours * 60
        );


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


    await saveMiningAccount(
        false
    );


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
// AGGIORNA INTERFACCIA
// -----------------------------------------------------

function updateMiningUI() {

    const balanceElement =
        $("balance");


    if (balanceElement) {

        balanceElement.textContent =
            Number(balance)
                .toFixed(2);
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
// AVVIA / FERMA MINING
// -----------------------------------------------------

async function toggleMining() {

    if (!currentUser) {

        alert(
            "Devi prima effettuare l'accesso."
        );

        return;
    }


    if (miningActive) {

        await calculateOfflineMining();
    }


    miningActive =
        !miningActive;


    await saveMiningAccount(
        true
    );


    updateMiningUI();


    console.log(
        "⛏️ Mining:",
        miningActive
            ? "ATTIVO"
            : "FERMO"
    );
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
            "❌ Impossibile salvare i BOB Points."
        );

        return;
    }


    alert(
        "🎁 BOB Points salvati:\n" +
        Number(balance)
            .toFixed(2)
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


    const upgradeCost =
        100;


    if (balance < upgradeCost) {

        alert(
            "❌ Servono " +
            upgradeCost +
            " BOB Points."
        );

        return;
    }


    balance -=
        upgradeCost;


    minerLevel +=
        1;


    const saved =
        await saveMiningAccount(
            false
        );


    if (!saved) {

        balance +=
            upgradeCost;

        minerLevel -=
            1;


        alert(
            "❌ Errore durante il salvataggio dell'upgrade."
        );

        return;
    }


    updateMiningUI();


    alert(
        "⬆️ Upgrade completato!\n\n" +
        "Nuovo livello: " +
        minerLevel
    );
}


// -----------------------------------------------------
// MINING IN TEMPO REALE
// -----------------------------------------------------

let lastTick =
    Date.now();


setInterval(
    () => {

        if (!currentUser) {

            lastTick =
                Date.now();

            return;
        }


        if (!miningActive) {

            lastTick =
                Date.now();

            return;
        }


        const now =
            Date.now();


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
    1000
);


// -----------------------------------------------------
// SALVATAGGIO AUTOMATICO
// -----------------------------------------------------

setInterval(
    async () => {

        if (!currentUser) {

            return;
        }


        if (!miningActive) {

            return;
        }


        await saveMiningAccount(
            false
        );

    },
    30000
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


        // ---------------------------------------------
        // MOSTRA / NASCONDI PASSWORD
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

                    if (
                        passwordInput.type ===
                        "password"
                    ) {

                        passwordInput.type =
                            "text";


                        togglePassword.textContent =
                            "🙈";


                        togglePassword.setAttribute(
                            "aria-label",
                            "Nascondi password"
                        );

                    } else {

                        passwordInput.type =
                            "password";


                        togglePassword.textContent =
                            "👁️";


                        togglePassword.setAttribute(
                            "aria-label",
                            "Mostra password"
                        );
                    }
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

        } else {

            console.error(
                "❌ signupBtn non trovato."
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

        } else {

            console.error(
                "❌ loginBtn non trovato."
            );
        }


        // ---------------------------------------------
        // SESSIONE
        // ---------------------------------------------

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

window.saveMiningAccount =
    saveMiningAccount;

window.toggleMining =
    toggleMining;

window.claimPoints =
    claimPoints;

window.upgradeMiner =
    upgradeMiner;

window.calculateOfflineMining =
    calculateOfflineMining;

window.updateMiningUI =
    updateMiningUI;

window.getProductionPerMinute =
    getProductionPerMinute;
