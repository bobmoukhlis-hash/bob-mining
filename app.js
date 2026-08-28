// =====================================================
// BOB MINING - app.js V1
// Supabase + Mining
// =====================================================

// -----------------------------------------------------
// SUPABASE
// -----------------------------------------------------

const SUPABASE_URL = "https://fxyqeeznykdtmaoywpmm.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_n6-IZsqob6jeQzL8igv-EA_lSNtURMn";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// -----------------------------------------------------
// STATO APP
// -----------------------------------------------------

let currentUser = null;
let miningAccount = null;
let miningTimer = null;


// -----------------------------------------------------
// ELEMENTI HTML
// -----------------------------------------------------

const $ = (id) => document.getElementById(id);

const loginBox = $("authBox");
const miningBox = $("miningBox");

const emailInput = $("email");
const passwordInput = $("password");


// -----------------------------------------------------
// REGISTRAZIONE
// -----------------------------------------------------

async function register() {

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        alert("Inserisci email e password.");
        return;
    }

    if (password.length < 6) {
        alert("La password deve avere almeno 6 caratteri.");
        return;
    }

    const { error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        alert("Errore registrazione: " + error.message);
        return;
    }

    alert(
        "Registrazione completata!\n\n" +
        "Controlla la tua email e conferma l'account."
    );
}


// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------

async function login() {

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        alert("Inserisci email e password.");
        return;
    }

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        alert("Errore login: " + error.message);
        return;
    }

    currentUser = data.user;

    await loadMiningAccount();

    showMiningApp();
}


// -----------------------------------------------------
// LOGOUT
// -----------------------------------------------------

async function logout() {

    stopMiningTimer();

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        alert("Errore logout: " + error.message);
        return;
    }

    currentUser = null;
    miningAccount = null;

    showLogin();
}


// -----------------------------------------------------
// SESSIONE
// -----------------------------------------------------

async function checkSession() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session?.user) {

        currentUser = session.user;

        await loadMiningAccount();

        showMiningApp();

    } else {

        showLogin();

    }
}


// -----------------------------------------------------
// CARICA ACCOUNT MINING
// -----------------------------------------------------

async function loadMiningAccount() {

    if (!currentUser) return;

    const { data, error } =
        await supabaseClient
            .from("mining_accounts")
            .select("*")
            .eq("user_id", currentUser.id)
            .single();

    if (error) {

        console.error(error);

        // Se il trigger non ha ancora creato
        // l'account, proviamo a crearlo.

        const { error: insertError } =
            await supabaseClient
                .from("mining_accounts")
                .insert({
                    user_id: currentUser.id
                });

        if (insertError) {

            console.error(insertError);

            alert(
                "Impossibile creare l'account mining."
            );

            return;
        }

        await loadMiningAccount();

        return;
    }

    miningAccount = data;

    updateUI();
}


// -----------------------------------------------------
// MOSTRA LOGIN
// -----------------------------------------------------

function showLogin() {

    if (loginBox)
        loginBox.style.display = "block";

    if (miningBox)
        miningBox.style.display = "none";
}


// -----------------------------------------------------
// MOSTRA APP
// -----------------------------------------------------

function showMiningApp() {

    if (loginBox)
        loginBox.style.display = "none";

    if (miningBox)
        miningBox.style.display = "block";

    updateUI();

    startMiningTimer();
}


// -----------------------------------------------------
// AGGIORNA INTERFACCIA
// -----------------------------------------------------

function updateUI() {

    if (!miningAccount) return;

    const balance =
        Number(miningAccount.balance_points || 0);

    const active =
        Boolean(miningAccount.mining_active);

    const level =
        Number(miningAccount.miner_level || 1);

    const balanceElement =
        $("balance");

    const statusElement =
        $("miningStatus");

    const levelElement =
        $("minerLevel");

    if (balanceElement)
        balanceElement.textContent =
            balance.toFixed(2);

    if (levelElement)
        levelElement.textContent =
            level;

    if (statusElement) {

        statusElement.textContent =
            active
                ? "⛏️ Mining attivo"
                : "⏸️ Mining pausato";
    }

    updateMiningButton();

    updateMinerInfo();
}


// -----------------------------------------------------
// INFO MINATORE
// -----------------------------------------------------

async function updateMinerInfo() {

    if (!miningAccount) return;

    const level =
        Number(miningAccount.miner_level || 1);

    const { data, error } =
        await supabaseClient
            .from("miners")
            .select("*")
            .eq("level", level)
            .single();

    if (error || !data) return;

    const hashElement =
        $("hashrate");

    const productionElement =
        $("production");

    const minerNameElement =
        $("minerName");

    if (hashElement)
        hashElement.textContent =
            data.hashrate;

    if (productionElement)
        productionElement.textContent =
            Number(
                data.production_per_minute
            ).toFixed(2);

    if (minerNameElement)
        minerNameElement.textContent =
            data.icon + " " + data.name;
}


// -----------------------------------------------------
// MINING ON / OFF
// -----------------------------------------------------

async function toggleMining() {

    if (!currentUser || !miningAccount)
        return;

    const newStatus =
        !Boolean(miningAccount.mining_active);

    const { data, error } =
        await supabaseClient
            .from("mining_accounts")
            .update({
                mining_active: newStatus,
                last_mining_at: new Date().toISOString()
            })
            .eq("user_id", currentUser.id)
            .select()
            .single();

    if (error) {

        alert(
            "Errore mining: " +
            error.message
        );

        return;
    }

    miningAccount = data;

    updateUI();

    if (newStatus)
        startMiningTimer();
    else
        stopMiningTimer();
}


// -----------------------------------------------------
// PULSANTE MINING
// -----------------------------------------------------

function updateMiningButton() {

    const button =
        $("miningToggle");

    if (!button || !miningAccount)
        return;

    if (miningAccount.mining_active) {

        button.textContent =
            "⏸️ DISATTIVA MINING";

    } else {

        button.textContent =
            "⛏️ ATTIVA MINING";
    }
}


// -----------------------------------------------------
// TIMER VISIVO
// -----------------------------------------------------

function startMiningTimer() {

    stopMiningTimer();

    if (!miningAccount?.mining_active)
        return;

    miningTimer =
        setInterval(
            updateMiningFromServer,
            10000
        );
}


function stopMiningTimer() {

    if (miningTimer) {

        clearInterval(miningTimer);

        miningTimer = null;
    }
}


// -----------------------------------------------------
// AGGIORNAMENTO MINING
// -----------------------------------------------------
//
// IMPORTANTE:
// Questa versione NON genera punti semplicemente
// aumentando il saldo nel browser.
//
// La produzione reale dovrà essere calcolata
// dal backend / Edge Function.
// -----------------------------------------------------

async function updateMiningFromServer() {

    if (!currentUser)
        return;

    await loadMiningAccount();
}


// -----------------------------------------------------
// CLAIM
// -----------------------------------------------------

async function claimPoints() {

    alert(
        "🎁 Claim disponibile.\n\n" +
        "Il calcolo sicuro del claim verrà " +
        "gestito dal backend."
    );
}


// -----------------------------------------------------
// UPGRADE MINATORE
// -----------------------------------------------------

async function upgradeMiner() {

    if (!currentUser || !miningAccount)
        return;

    const currentLevel =
        Number(miningAccount.miner_level);

    const nextLevel =
        currentLevel + 1;

    if (nextLevel > 10) {

        alert("🏆 Hai raggiunto il livello massimo!");

        return;
    }

    const { data, error } =
        await supabaseClient
            .from("miners")
            .select("*")
            .eq("level", nextLevel)
            .single();

    if (error || !data) {

        alert(
            "Impossibile recuperare il prossimo livello."
        );

        return;
    }

    const balance =
        Number(miningAccount.balance_points);

    const cost =
        Number(data.upgrade_cost);

    if (balance < cost) {

        alert(
            `Servono ${cost.toLocaleString()} BOB Points.`
        );

        return;
    }

    alert(
        "⚠️ L'upgrade reale verrà autorizzato " +
        "dal backend per evitare modifiche " +
        "fraudolente al saldo."
    );
}


// -----------------------------------------------------
// WALLET
// -----------------------------------------------------

async function saveWallet() {

    if (!currentUser)
        return;

    const addressElement =
        $("walletAddress");

    if (!addressElement)
        return;

    const address =
        addressElement.value.trim();

    if (!address) {

        alert("Inserisci un indirizzo wallet.");

        return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {

        alert(
            "Inserisci un indirizzo Ethereum/Base valido."
        );

        return;
    }

    const { error } =
        await supabaseClient
            .from("wallets")
            .upsert({
                user_id: currentUser.id,
                network: "Base",
                address: address,
                verified: false
            });

    if (error) {

        alert(
            "Errore salvataggio wallet: " +
            error.message
        );

        return;
    }

    alert(
        "✅ Wallet salvato.\n\n" +
        "La verifica verrà aggiunta nel backend."
    );
}


// -----------------------------------------------------
// EVENTI
// -----------------------------------------------------

window.register = register;
window.login = login;
window.logout = logout;
window.toggleMining = toggleMining;
window.claimPoints = claimPoints;
window.upgradeMiner = upgradeMiner;
window.saveWallet = saveWallet;


// -----------------------------------------------------
// AVVIO
// -----------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await checkSession();

    }
);
