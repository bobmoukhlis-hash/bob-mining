```javascript
// =====================================================
// BOB MINING - app.js V2
// Supabase + Autenticazione + Mining
// =====================================================


// -----------------------------------------------------
// SUPABASE
// -----------------------------------------------------

const SUPABASE_URL =
    "https://fxyqeeznykdtmaoywpmm.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_n6-IZsqob6jeQzL8igv-EA_lSNtURMn";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

console.log("✅ Supabase collegato");
console.log("✅ BOB app.js caricato");


// -----------------------------------------------------
// ELEMENTI HTML
// -----------------------------------------------------

const $ = (id) =>
    document.getElementById(id);

const loginBox =
    $("authBox");

const miningBox =
    $("miningBox");

const emailInput =
    $("email");

const passwordInput =
    $("password");


// -----------------------------------------------------
// UTENTE
// -----------------------------------------------------

let currentUser = null;


// -----------------------------------------------------
// DATI MINING
// -----------------------------------------------------

let balance = 0;

let minerLevel = 1;

let miningActive = true;

let lastMiningAt = null;

let offlineHours = 2;

let speedBonus = 0;


// -----------------------------------------------------
// PRODUZIONE BASE
// -----------------------------------------------------

const BASE_PRODUCTION_PER_MINUTE = 0.10;


// -----------------------------------------------------
// MOSTRA MINING
// -----------------------------------------------------

function showMining() {

    if (loginBox) {
        loginBox.style.display = "none";
    }

    if (miningBox) {
        miningBox.style.display = "block";
    }
}


// -----------------------------------------------------
// MOSTRA LOGIN
// -----------------------------------------------------

function showLogin() {

    if (loginBox) {
        loginBox.style.display = "block";
    }

    if (miningBox) {
        miningBox.style.display = "none";
    }
}


// -----------------------------------------------------
// REGISTRAZIONE
// -----------------------------------------------------

async function register() {

    const email =
        emailInput?.value.trim();

    const password =
        passwordInput?.value;


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


    const { data, error } =
        await supabaseClient.auth.signUp({

            email: email,

            password: password,

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

        alert(
            "Errore registrazione: " +
            error.message
        );

        return;
    }


    console.log(
        "✅ Utente registrato:",
        data
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
        emailInput?.value.trim();

    const password =
        passwordInput?.value;


    if (!email || !password) {

        alert(
            "Inserisci email e password."
        );

        return;
    }


    const { data, error } =
        await supabaseClient.auth
            .signInWithPassword({

                email: email,

                password: password
            });


    if (error) {

        console.error(
            "❌ Errore accesso:",
            error
        );

        alert(
            "Errore accesso: " +
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
            "Errore logout: " +
            error.message
        );

        return;
    }


    currentUser = null;

    balance = 0;

    showLogin();


    console.log(
        "✅ Logout effettuato"
    );
}


// -----------------------------------------------------
// CONTROLLO SESSIONE
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

        showLogin();

        return;
    }


    currentUser =
        data.session?.user || null;


    if (currentUser) {

        console.log(
            "✅ Sessione trovata:",
            currentUser.id
        );


        await loadMiningAccount();


        showMining();

    } else {

        console.log(
            "ℹ️ Nessun utente autenticato"
        );


        showLogin();
    }
}


// -----------------------------------------------------
// CAMBIO SESSIONE
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
            "ℹ️ Nessun utente autenticato"
        );

        return;
    }


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

        return;
    }


    if (!data) {

        console.log(
            "ℹ️ Account mining non trovato"
        );

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
            ? new Date(data.last_mining_at)
            : new Date();


    window.balance =
        balance;


    console.log(
        "✅ Account mining caricato:",
        {
            balance,
            minerLevel,
            miningActive,
            lastMiningAt
        }
    );


    updateMiningUI();
}


// -----------------------------------------------------
// SALVA ACCOUNT MINING
// -----------------------------------------------------

async function saveMiningAccount() {

    if (!currentUser) {

        console.log(
            "ℹ️ Nessun utente autenticato"
        );

        return;
    }


    window.balance =
        Number(balance);


    const { error } =
        await supabaseClient
            .from("mining_accounts")
            .update({

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

                last_mining_at:
                    new Date().toISOString()
            })
            .eq(
                "user_id",
                currentUser.id
            );


    if (error) {

        console.error(
            "❌ Errore salvataggio mining:",
            error
        );

        return;
    }


    lastMiningAt =
        new Date();


    console.log(
        "✅ Mining salvato:",
        balance
    );
}


// -----------------------------------------------------
// CALCOLO PRODUZIONE
// -----------------------------------------------------

function getProductionPerMinute() {

    const bonus =
        1 + (speedBonus / 100);


    return (
        BASE_PRODUCTION_PER_MINUTE *
        minerLevel *
        bonus
    );
}


// -----------------------------------------------------
// AGGIUNGI PRODUZIONE
// -----------------------------------------------------

function addMiningProduction(minutes) {

    if (!miningActive) {
        return;
    }


    if (!Number.isFinite(minutes)) {
        return;
    }


    if (minutes <= 0) {
        return;
    }


    const production =
        getProductionPerMinute();


    const earned =
        production * minutes;


    balance += earned;


    window.balance =
        balance;
}


// -----------------------------------------------------
// PRODUZIONE OFFLINE
// -----------------------------------------------------

function calculateOfflineMining() {

    if (!miningActive) {
        return;
    }


    if (!lastMiningAt) {
        return;
    }


    const now =
        new Date();


    let elapsedMinutes =
        (now.getTime() -
            lastMiningAt.getTime()) /
        60000;


    if (elapsedMinutes <= 0) {
        return;
    }


    const maxOfflineMinutes =
        offlineHours * 60;


    elapsedMinutes =
        Math.min(
            elapsedMinutes,
            maxOfflineMinutes
        );


    addMiningProduction(
        elapsedMinutes
    );


    console.log(
        "⛏️ Produzione offline:",
        elapsedMinutes,
        "minuti"
    );
}


// -----------------------------------------------------
// AGGIORNA INTERFACCIA
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

        const hashrate =
            10 * minerLevel;

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


    miningActive =
        !miningActive;


    await saveMiningAccount();


    updateMiningUI();


    console.log(
        "Mining:",
        miningActive
            ? "ATTIVO"
            : "FERMO"
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


    await saveMiningAccount();


    alert(
        "🎁 BOB Points salvati: " +
        Number(balance).toFixed(2)
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


    window.balance =
        balance;


    await saveMiningAccount();


    updateMiningUI();


    alert(
        "⬆️ Upgrade completato!\n\n" +
        "Nuovo livello: " +
        minerLevel
    );
}


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


        addMiningProduction(
            1 / 60
        );


        updateMiningUI();


        await saveMiningAccount();

    },
    1000
);


// -----------------------------------------------------
// EVENTI PULSANTI
// -----------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const signupBtn =
            $("signupBtn");

        const loginBtn =
            $("loginBtn");


        if (signupBtn) {

            signupBtn.addEventListener(
                "click",
                register
            );

            console.log(
                "✅ Pulsante Registrati collegato"
            );
        }


        if (loginBtn) {

            loginBtn.addEventListener(
                "click",
                login
            );

            console.log(
                "✅ Pulsante Accedi collegato"
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

window.saveMiningAccount =
    saveMiningAccount;

window.loadMiningAccount =
    loadMiningAccount;

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

window.balance =
    balance;
```
